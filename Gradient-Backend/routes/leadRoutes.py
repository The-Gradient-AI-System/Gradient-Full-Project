from fastapi import APIRouter, Query, HTTPException, Depends, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import Optional

from service.leadService import get_current_user_role, assign_lead_to_user, get_user_leads, get_available_leads, get_all_leads_for_admin, get_assigned_leads_only, delete_lead_by_gmail_id

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
