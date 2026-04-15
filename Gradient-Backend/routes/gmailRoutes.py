from fastapi import APIRouter, Query, HTTPException, Depends, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from db import conn

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


# NEW STATUS SYSTEM - using gmail_id instead of row_number
VALID_STATUSES = {'NEW', 'ASSIGNED', 'EMAIL_SENT', 'WAITING_REPLY', 'REPLY_READY', 'CLOSED', 'LOST', 'SNOOZED', 'CONFIRMED', 'REJECTED'}

class LeadStatusUpdateRequest(BaseModel):
    gmail_id: str
    status: str


def add_status_history(gmail_id: str, status: str, assignee: str | None = None):
    """Add entry to lead status history"""
    import uuid
    history_id = str(uuid.uuid4())
    
    # Get lead info for the name
    lead = conn.execute(
        "SELECT full_name, email FROM gmail_messages WHERE gmail_id = ?",
        [gmail_id]
    ).fetchone()
    lead_name = lead[0] if lead else None
    
    conn.execute(
        """
        INSERT INTO lead_status_history (id, gmail_id, status, assignee, lead_name)
        VALUES (?, ?, ?, ?, ?)
        """,
        [history_id, gmail_id, status, assignee, lead_name]
    )
    conn.commit()


@router.post("/lead-status")
def set_lead_status(payload: LeadStatusUpdateRequest, user_info: dict = Depends(get_user_from_token)):
    """Update lead status and track in history"""
    status = payload.status.upper()
    if status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Valid statuses: {', '.join(VALID_STATUSES)}")
    
    # Check if lead exists
    lead = conn.execute(
        "SELECT gmail_id, assigned_to FROM gmail_messages WHERE gmail_id = ?",
        [payload.gmail_id]
    ).fetchone()
    
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Update status in database
    conn.execute(
        "UPDATE gmail_messages SET status = ? WHERE gmail_id = ?",
        [status, payload.gmail_id]
    )
    
    # Add to history
    assignee = user_info.get("username") if user_info else None
    add_status_history(payload.gmail_id, status, assignee)
    
    conn.commit()
    
    return {"gmail_id": payload.gmail_id, "status": status, "updated_by": assignee}


@router.get("/lead-profile")
def get_lead_profile(email: str = Query(...)):
    """Get lead profile by email with all emails from this contact"""
    # Get all emails from this contact
    emails = conn.execute(
        """
        SELECT 
            gmail_id, status, first_name, last_name, full_name, email, subject, 
            received_at, company, body, phone, website, company_name, company_info,
            person_role, person_links, person_location, person_experience, person_summary,
            person_insights, company_insights, assigned_to, assigned_at, created_at
        FROM gmail_messages 
        WHERE email = ?
        ORDER BY created_at DESC
        """,
        [email]
    ).fetchall()
    
    if not emails:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Format emails
    formatted_emails = []
    for mail in emails:
        formatted_emails.append({
            "gmail_id": mail[0],
            "status": mail[1] or "NEW",
            "first_name": mail[2] or "",
            "last_name": mail[3] or "",
            "full_name": mail[4] or "",
            "email": mail[5] or "",
            "subject": mail[6] or "",
            "received_at": mail[7] or "",
            "company": mail[8] or "",
            "body": mail[9] or "",
            "phone": mail[10] or "",
            "website": mail[11] or "",
            "company_name": mail[12] or "",
            "company_info": mail[13] or "",
            "person_role": mail[14] or "",
            "person_links": mail[15] or "",
            "person_location": mail[16] or "",
            "person_experience": mail[17] or "",
            "person_summary": mail[18] or "",
            "person_insights": mail[19] or [],
            "company_insights": mail[20] or [],
            "assigned_to": mail[21],
            "assigned_at": mail[22],
            "created_at": mail[23]
        })
    
    # Get latest email for profile info
    latest = emails[0]
    
    return {
        "id": latest[0],
        "name": latest[4] or latest[5],
        "email": latest[5],
        "phone": latest[10] or "",
        "company": latest[8] or latest[12] or "",
        "role": latest[14] or "",
        "status": latest[1] or "NEW",
        "pending_review": False,  # Can be updated based on your logic
        "is_priority": False,     # Can be updated based on your logic
        "emails": formatted_emails
    }


@router.get("/status-history")
def get_status_history(gmail_id: str = Query(...)):
    """Get status history for a lead"""
    history = conn.execute(
        """
        SELECT 
            id, gmail_id, changed_at, lead_name, status, assignee
        FROM lead_status_history
        WHERE gmail_id = ?
        ORDER BY changed_at DESC
        """,
        [gmail_id]
    ).fetchall()
    
    formatted_history = []
    for entry in history:
        formatted_history.append({
            "id": entry[0],
            "gmail_id": entry[1],
            "changed_at": entry[2],
            "lead_name": entry[3],
            "status": entry[4],
            "assignee": entry[5]
        })
    
    return {"history": formatted_history}
