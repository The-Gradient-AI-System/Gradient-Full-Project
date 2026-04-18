from db import conn, db_lock
from datetime import datetime
from fastapi import HTTPException, status
from jose import jwt, JWTError
import os

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")

def get_current_user_role(token: str) -> dict:
    """Extract user info from JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if username is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials"
            )
        
        # Get user info from database
        with db_lock:
            user = conn.execute(
                "SELECT id, username, role, is_active FROM users WHERE username = ?",
                [username]
            ).fetchone()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        
        if user[3] is not None and not bool(user[3]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User is inactive"
            )

        return {"id": user[0], "username": user[1], "role": user[2]}
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )

def assign_lead_to_user(gmail_id: str, user_info: dict):
    """Assign a lead to a user"""
    # Check if lead exists
    with db_lock:
        lead = conn.execute(
            "SELECT gmail_id FROM gmail_messages WHERE gmail_id = ?",
            [gmail_id]
        ).fetchone()
    
    if not lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead not found"
        )
    
    # Check if lead is already assigned
    with db_lock:
        existing = conn.execute(
            "SELECT assigned_to FROM gmail_messages WHERE gmail_id = ? AND assigned_to IS NOT NULL",
            [gmail_id]
        ).fetchone()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lead is already assigned"
        )
    
    # Assign lead to user and update status to ASSIGNED
    with db_lock:
        conn.execute(
            "UPDATE gmail_messages SET assigned_to = ?, assigned_at = ?, status = 'ASSIGNED' WHERE gmail_id = ?",
            [user_info["id"], datetime.now(), gmail_id]
        )
    
    # Add status history entry
    import uuid
    history_id = str(uuid.uuid4())
    with db_lock:
        lead_data = conn.execute(
            "SELECT full_name FROM gmail_messages WHERE gmail_id = ?",
            [gmail_id]
        ).fetchone()
    lead_name = lead_data[0] if lead_data else None
    
    with db_lock:
        conn.execute(
            """
            INSERT INTO lead_status_history (id, gmail_id, status, assignee, lead_name)
            VALUES (?, ?, 'ASSIGNED', ?, ?)
            """,
            [history_id, gmail_id, user_info["username"], lead_name]
        )
        
        conn.commit()
    return {"message": "Lead assigned successfully", "gmail_id": gmail_id, "assigned_to": user_info["username"], "status": "ASSIGNED"}

def get_user_leads(user_info: dict, limit: int = 120):
    """Get leads based on user role - admin sees all, manager sees assigned or available"""
    if not user_info:
        return []
        
    user_role = user_info.get("role")
    user_id = user_info.get("id")
    
    if user_role == "admin":
        # Admin sees all leads with assignment info
        query = """
            SELECT 
                gm.gmail_id, gm.status, gm.first_name, gm.last_name, gm.full_name, gm.email, gm.subject, 
                gm.received_at, gm.company, gm.body, gm.phone, gm.website, gm.company_name, gm.company_info,
                gm.person_role, gm.person_links, gm.person_location, gm.person_experience, gm.person_summary,
                gm.person_insights, gm.company_insights, gm.assigned_to, gm.assigned_at, gm.synced_at, gm.created_at,
                u.username as assigned_username, u.role as assigned_role
            FROM gmail_messages gm
            LEFT JOIN users u ON gm.assigned_to = u.id
            ORDER BY gm.created_at DESC
            LIMIT ?
        """
        with db_lock:
            leads = conn.execute(query, [limit]).fetchall()
        
    elif user_role == "manager":
        # Manager sees all leads with assignment info (same as admin)
        query = """
            SELECT 
                gm.gmail_id, gm.status, gm.first_name, gm.last_name, gm.full_name, gm.email, gm.subject, 
                gm.received_at, gm.company, gm.body, gm.phone, gm.website, gm.company_name, gm.company_info,
                gm.person_role, gm.person_links, gm.person_location, gm.person_experience, gm.person_summary,
                gm.person_insights, gm.company_insights, gm.assigned_to, gm.assigned_at, gm.synced_at, gm.created_at,
                u.username as assigned_username, u.role as assigned_role
            FROM gmail_messages gm
            LEFT JOIN users u ON gm.assigned_to = u.id
            ORDER BY gm.created_at DESC
            LIMIT ?
        """
        leads = conn.execute(query, [limit]).fetchall()
    else:
        return []
    
    # Format results
    formatted_leads = []
    for lead in leads:
        formatted_lead = {
            "gmail_id": lead[0],
            "status": lead[1],
            "first_name": lead[2],
            "last_name": lead[3],
            "full_name": lead[4],
            "email": lead[5],
            "subject": lead[6],
            "received_at": lead[7],
            "company": lead[8],
            "body": lead[9],
            "phone": lead[10],
            "website": lead[11],
            "company_name": lead[12],
            "company_info": lead[13],
            "person_role": lead[14],
            "person_links": lead[15],
            "person_location": lead[16],
            "person_experience": lead[17],
            "person_summary": lead[18],
            "person_insights": lead[19],
            "company_insights": lead[20],
            "assigned_to": lead[21],
            "assigned_at": lead[22],
            "synced_at": lead[23],
            "created_at": lead[24],
            "assigned_username": lead[25],
            "assigned_role": lead[26],
        }
        formatted_leads.append(formatted_lead)
    
    return formatted_leads

def delete_lead_by_gmail_id(gmail_id: str, user_info: dict):
    """Delete a lead by gmail_id (admin only)"""
    # Check if lead exists
    lead_data = conn.execute(
        "SELECT gmail_id, full_name FROM gmail_messages WHERE gmail_id = ?",
        [gmail_id]
    ).fetchone()
    
    if not lead_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lead with gmail_id {gmail_id} not found"
        )
    
    lead_name = lead_data[1] if lead_data else None
    
    # Delete the lead
    conn.execute(
        "DELETE FROM gmail_messages WHERE gmail_id = ?",
        [gmail_id]
    )
    
    # Log the deletion in history
    history_id = str(uuid.uuid4())
    conn.execute(
        """
        INSERT INTO lead_status_history (id, gmail_id, status, assignee, lead_name)
        VALUES (?, ?, 'DELETED', ?, ?)
        """,
        [history_id, gmail_id, user_info["username"], lead_name]
    )
    
    conn.commit()
    return {"message": "Lead deleted successfully", "gmail_id": gmail_id, "deleted_by": user_info["username"]}

def get_available_leads(user_info: dict, limit: int = 50):
    """Get unassigned leads that managers can pick"""
    if user_info["role"] != "manager":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only managers can pick leads"
        )
    
    query = """
        SELECT 
            gmail_id, status, first_name, last_name, full_name, email, subject, 
            received_at, company, body, phone, website, company_name, company_info,
            person_role, person_links, person_location, person_experience, person_summary,
            person_insights, company_insights, created_at
        FROM gmail_messages 
        WHERE assigned_to IS NULL
        ORDER BY created_at DESC
        LIMIT ?
    """
    
    leads = conn.execute(query, [limit]).fetchall()
    
    # Format results
    formatted_leads = []
    for lead in leads:
        formatted_lead = {
            "gmail_id": lead[0],
            "status": lead[1],
            "first_name": lead[2],
            "last_name": lead[3],
            "full_name": lead[4],
            "email": lead[5],
            "subject": lead[6],
            "received_at": lead[7],
            "company": lead[8],
            "body": lead[9],
            "phone": lead[10],
            "website": lead[11],
            "company_name": lead[12],
            "company_info": lead[13],
            "person_role": lead[14],
            "person_links": lead[15],
            "person_location": lead[16],
            "person_experience": lead[17],
            "person_summary": lead[18],
            "person_insights": lead[19],
            "company_insights": lead[20],
            "created_at": lead[21]
        }
        formatted_leads.append(formatted_lead)
    
    return formatted_leads

def get_all_leads_for_admin(limit: int = 120):
    """Get all leads with assignment info - admin only"""
    query = """
        SELECT 
            gm.gmail_id, gm.status, gm.first_name, gm.last_name, gm.full_name, gm.email, gm.subject, 
            gm.received_at, gm.company, gm.body, gm.phone, gm.website, gm.company_name, gm.company_info,
            gm.person_role, gm.person_links, gm.person_location, gm.person_experience, gm.person_summary,
            gm.person_insights, gm.company_insights, gm.assigned_to, gm.assigned_at, gm.synced_at, gm.created_at,
            u.username as assigned_username, u.role as assigned_role
        FROM gmail_messages gm
        LEFT JOIN users u ON gm.assigned_to = u.id
        ORDER BY gm.created_at DESC
        LIMIT ?
    """
    leads_data = conn.execute(query, [limit]).fetchall()
    
    formatted_leads = []
    for lead in leads_data:
        formatted_lead = {
            "gmail_id": lead[0],
            "status": lead[1] or "waiting",
            "first_name": lead[2] or "",
            "last_name": lead[3] or "",
            "full_name": lead[4] or "",
            "email": lead[5] or "",
            "subject": lead[6] or "",
            "received_at": lead[7] or "",
            "company": lead[8] or "",
            "company_name": lead[12] or "",
            "assigned_to": lead[21],
            "assigned_at": lead[22],
            "assigned_username": lead[25],
            "assigned_role": lead[26],
            #"assigned_display": f"[{lead[26].upper()}] {lead[25]}" if lead[25] else "Unassigned"
        }
        formatted_leads.append(formatted_lead)
    
    return formatted_leads

def get_assigned_leads_only(limit: int = 120):
    """Get only assigned leads (exclude unassigned)"""
    query = """
        SELECT 
            gm.gmail_id, gm.status, gm.first_name, gm.last_name, gm.full_name, gm.email, gm.subject, 
            gm.received_at, gm.company, gm.body, gm.phone, gm.website, gm.company_name, gm.company_info,
            gm.person_role, gm.person_links, gm.person_location, gm.person_experience, gm.person_summary,
            gm.person_insights, gm.company_insights, gm.assigned_to, gm.assigned_at, gm.synced_at, gm.created_at,
            u.username as assigned_username, u.role as assigned_role
        FROM gmail_messages gm
        LEFT JOIN users u ON gm.assigned_to = u.id
        WHERE gm.assigned_to IS NOT NULL
        ORDER BY gm.assigned_at DESC
        LIMIT ?
    """
    leads_data = conn.execute(query, [limit]).fetchall()
    
    formatted_leads = []
    for lead in leads_data:
        formatted_lead = {
            "gmail_id": lead[0],
            "status": lead[1] or "waiting",
            "first_name": lead[2] or "",
            "last_name": lead[3] or "",
            "full_name": lead[4] or "",
            "email": lead[5] or "",
            "subject": lead[6] or "",
            "received_at": lead[7] or "",
            "company": lead[8] or "",
            "company_name": lead[12] or "",
            "assigned_to": lead[21],
            "assigned_at": lead[22],
            "assigned_username": lead[25],
            "assigned_role": lead[26],
            #"assigned_display": f"[{lead[26].upper()}] {lead[25]}" if lead[25] else "Unassigned"
        }
        formatted_leads.append(formatted_lead)
    
    return formatted_leads
