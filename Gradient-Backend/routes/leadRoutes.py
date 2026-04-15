from fastapi import APIRouter, Query, HTTPException, Depends, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import Optional

from service.leadService import get_current_user_role, assign_lead_to_user, get_user_leads, get_available_leads, get_all_leads_for_admin, get_assigned_leads_only, delete_lead_by_gmail_id
from db import conn

router = APIRouter(prefix="/leads", tags=["Lead Management"])
security = HTTPBearer()

def get_user_from_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    """Extract user info from Authorization header"""
    token = credentials.credentials
    return get_current_user_role(token)

class LeadAssignmentRequest(BaseModel):
    gmail_id: str = Field(..., description="Gmail ID of the lead to assign")

@router.get("/my-leads")
def get_my_leads(
    limit: int = Query(default=120, ge=1, le=500),
    user_info: dict = Depends(get_user_from_token)
):
    """Get leads based on user role - managers see their leads, admin sees all"""
    leads = get_user_leads(user_info, limit)
    return {
        "leads": leads,
        "user_role": user_info["role"],
        "total_count": len(leads)
    }

@router.get("/available")
def get_unassigned_leads(
    limit: int = Query(default=50, ge=1, le=200),
    user_info: dict = Depends(get_user_from_token)
):
    """Get available leads that managers can pick (unassigned leads)"""
    leads = get_available_leads(user_info, limit)
    return {
        "leads": leads,
        "total_count": len(leads)
    }

@router.post("/assign")
def assign_lead(
    request: LeadAssignmentRequest,
    user_info: dict = Depends(get_user_from_token)
):
    """Assign a lead to the current user (managers only)"""
    if user_info["role"] != "manager":
        raise HTTPException(
            status_code=403,
            detail="Only managers can assign leads to themselves"
        )
    
    result = assign_lead_to_user(request.gmail_id, user_info)
    return result

@router.get("/user-info")
def get_current_user_info(user_info: dict = Depends(get_user_from_token)):
    """Get current user information with role"""
    return {
        "user_id": user_info["id"],
        "username": user_info["username"],
        "role": user_info["role"]
    }

@router.get("/admin/all-leads")
def get_all_leads_admin(
    limit: int = Query(default=120, ge=1, le=500),
    user_info: dict = Depends(get_user_from_token)
):
    """Admin only endpoint to see all leads with assignment info"""
    if user_info["role"] != "admin":
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )
    
    leads = get_all_leads_for_admin(limit)
    return {
        "leads": leads,
        "user_role": user_info["role"],
        "total_count": len(leads),
        "message": "Admin view: All leads with assignment information"
    }

@router.get("/assigned-only")
def get_assigned_leads(
    limit: int = Query(default=120, ge=1, le=500),
    user_info: dict = Depends(get_user_from_token)
):
    """Get only assigned leads (exclude unassigned)"""
    if user_info["role"] != "admin":
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )
    
    leads = get_assigned_leads_only(limit)
    return {
        "leads": leads,
        "user_role": user_info["role"],
        "total_count": len(leads),
        "message": "Admin view: Assigned leads only"
    }

@router.delete("/delete")
def delete_lead(
    gmail_id: str = Query(..., description="Gmail ID of the lead to delete"),
    user_info: dict = Depends(get_user_from_token)
):
    """Delete a lead (admin only)"""
    if user_info["role"] != "admin":
        raise HTTPException(
            status_code=403,
            detail="Only admin can delete leads"
        )
    
    result = delete_lead_by_gmail_id(gmail_id, user_info)
    return result


@router.get("/{email}")
def get_lead_profile(email: str):
    """
    Return aggregated lead profile by sender email.
    Used by frontend route: `/lead/:email`.
    """
    email_norm = (email or "").strip().lower()
    if not email_norm:
        raise HTTPException(status_code=400, detail="Email is required")

    messages = conn.execute(
        """
        SELECT
            gmail_id,
            status,
            first_name,
            last_name,
            full_name,
            email,
            subject,
            received_at,
            company,
            body,
            phone,
            person_role,
            is_priority,
            pending_review,
            company_name
        FROM gmail_messages
        WHERE lower(email) = ?
        ORDER BY received_at DESC NULLS LAST, created_at DESC NULLS LAST
        """,
        [email_norm],
    ).fetchall()

    if not messages:
        raise HTTPException(status_code=404, detail="Lead profile not found")

    # Latest message becomes the "current" view for status/pending flags.
    latest = messages[0]

    (
        latest_gmail_id,
        latest_status,
        latest_first_name,
        latest_last_name,
        latest_full_name,
        latest_email,
        latest_subject,
        latest_received_at,
        latest_company,
        latest_body,
        latest_phone,
        latest_person_role,
        latest_is_priority,
        latest_pending_review,
        latest_company_name,
    ) = latest

    name = (
        (latest_full_name or "").strip()
        or " ".join(filter(bool, [latest_first_name, latest_last_name]))
        or latest_email
        or "Unknown"
    )

    # Collect all gmail_ids for status history.
    gmail_ids = [m[0] for m in messages]

    history_rows = conn.execute(
        """
        SELECT
            id,
            changed_at,
            lead_name,
            status,
            assignee,
            rejection_reason
        FROM lead_status_history
        WHERE gmail_id IN ({placeholders})
        ORDER BY changed_at DESC NULLS LAST
        """.format(placeholders=",".join(["?"] * len(gmail_ids))),
        gmail_ids,
    ).fetchall()

    history = []
    for row in history_rows:
        changed_at = row[1]
        if changed_at is not None and hasattr(changed_at, "isoformat"):
            changed_at_val = changed_at.isoformat()
        else:
            changed_at_val = str(changed_at) if changed_at is not None else None
        history.append(
            {
                "id": row[0],
                "date": changed_at_val,
                "leadName": row[2],
                "status": row[3],
                "assignee": row[4],
                "rejection_reason": row[5],
            }
        )

    emails = []
    for m in messages:
        (
            gmail_id,
            status,
            first_name,
            last_name,
            full_name,
            msg_email,
            subject,
            received_at,
            company,
            body,
            phone,
            person_role,
            is_priority,
            pending_review,
            company_name,
        ) = m

        emails.append(
            {
                "gmail_id": gmail_id,
                "status": status,
                "subject": subject,
                "received_at": (
                    received_at.isoformat()
                    if received_at is not None and hasattr(received_at, "isoformat")
                    else (str(received_at) if received_at is not None else None)
                ),
                "body": body,
            }
        )

    return {
        "id": latest_gmail_id,
        "name": name,
        "email": latest_email,
        "phone": latest_phone,
        "company": (latest_company or latest_company_name or ""),
        "role": latest_person_role,
        "status": latest_status or "waiting",
        "pending_review": bool(latest_pending_review),
        "is_priority": bool(latest_is_priority),
        "emails": emails,
        "history": history,
    }
