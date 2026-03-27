from fastapi import APIRouter, Query, HTTPException, Depends, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field

from service.syncService import sync_gmail_to_sheets
from service.sheetService import build_leads_payload, build_leads_payload_from_db
from service.aiService import analyze_email, generate_email_replies
from service.settingsService import get_reply_prompts
from service.leadService import get_current_user_role

router = APIRouter(prefix="/gmail", tags=["Gmail"])
security = HTTPBearer()

def get_user_from_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    """Extract user info from Authorization header"""
    try:
        token = credentials.credentials
        return get_current_user_role(token)
    except:
        return None

@router.post("/sync")
def manual_sync():
    count = sync_gmail_to_sheets()
    return {"saved": count}


@router.get("/leads")
def get_leads(
    limit: int | None = Query(default=120, ge=1, le=500),
    user_info: dict | None = Depends(get_user_from_token)
):
    print(f"[DEBUG] get_leads called, user_info: {user_info}")
    try:
        if user_info:
            # Use role-based filtering from database
            payload = build_leads_payload_from_db(limit, user_info)
        else:
            # Fallback to original sheet-based approach
            payload = build_leads_payload(limit)
        print(f"[DEBUG] Returning payload with {len(payload.get('leads', []))} leads, stats: {payload.get('stats')}")
        return payload
    except Exception as e:
        import traceback
        print(f"[ERROR] get_leads failed: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


class LeadInsightRequest(BaseModel):
    sender: EmailStr
    subject: str | None = ""
    body: str | None = ""


@router.post("/lead-insights")
def generate_lead_insights(payload: LeadInsightRequest):
    if not payload.body and not payload.subject:
        raise HTTPException(status_code=400, detail="Потрібно передати тему або текст листа")

    result = analyze_email(
        subject=payload.subject or "",
        body=payload.body or "",
        sender=payload.sender,
    )

    return result


class ReplyGenerationRequest(BaseModel):
    sender: EmailStr
    subject: str | None = ""
    body: str | None = ""
    lead: dict | None = None
    placeholders: dict | None = None
    prompt_overrides: dict | None = None


@router.post("/generate-replies")
def generate_replies(payload: ReplyGenerationRequest):
    lead_data = payload.lead or {}
    email_context = {
        "sender": payload.sender,
        "subject": payload.subject or "",
        "body": payload.body or "",
    }

    replies = generate_email_replies(
        lead=lead_data,
        email=email_context,
        placeholders=payload.placeholders,
        prompt_overrides=payload.prompt_overrides,
    )

    return {
        "prompts": get_reply_prompts(),
        "replies": replies,
    }


class LeadStatusUpdateRequest(BaseModel):
    row_number: int = Field(gt=0)
    status: str


@router.post("/lead-status")
def set_lead_status(payload: LeadStatusUpdateRequest):
    try:
        update_lead_status(payload.row_number, payload.status)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {"row_number": payload.row_number, "status": payload.status}
