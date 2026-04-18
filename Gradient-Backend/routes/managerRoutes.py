from fastapi import APIRouter, Depends, HTTPException, Query, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr, Field

from db import conn, db_lock
from hashPswd import hash_password
from service.leadService import get_current_user_role

router = APIRouter(prefix="/admin/managers", tags=["Manager Management"])
security = HTTPBearer()


def get_user_from_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    token = credentials.credentials
    return get_current_user_role(token)


def require_admin(user_info: dict = Depends(get_user_from_token)) -> dict:
    if not user_info or user_info.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user_info


class ManagerCreatePayload(BaseModel):
    username: str = Field(min_length=1)
    email: EmailStr
    password: str = Field(min_length=6)


class ManagerStatusPayload(BaseModel):
    is_active: bool


class ManagerResetPasswordPayload(BaseModel):
    new_password: str = Field(min_length=6)


@router.get("")
def list_managers(_: dict = Depends(require_admin)):
    with db_lock:
        rows = conn.execute(
            """
            SELECT id, username, email, role, is_active
            FROM users
            WHERE role = 'manager'
            ORDER BY id ASC
            """
        ).fetchall()

    return {
        "managers": [
            {
                "id": row[0],
                "username": row[1],
                "email": row[2],
                "role": row[3],
                "is_active": bool(row[4]),
            }
            for row in rows
        ]
    }


@router.post("")
def create_manager(payload: ManagerCreatePayload, _: dict = Depends(require_admin)):
    with db_lock:
        exists = conn.execute(
            "SELECT 1 FROM users WHERE username = ? OR email = ?",
            [payload.username, str(payload.email)],
        ).fetchone()

    if exists:
        raise HTTPException(status_code=400, detail="Username or email already exists")

    with db_lock:
        next_id = conn.execute("SELECT COALESCE(MAX(id), 0) + 1 FROM users").fetchone()[0]
        hashed_pwd = hash_password(payload.password)

        conn.execute(
            """
            INSERT INTO users (id, username, email, password, role, is_active)
            VALUES (?, ?, ?, ?, 'manager', TRUE)
            """,
            [next_id, payload.username, str(payload.email), hashed_pwd],
        )
        conn.commit()

    return {
        "id": next_id,
        "username": payload.username,
        "email": str(payload.email),
        "role": "manager",
        "is_active": True,
    }


@router.patch("/{manager_id}/status")
def set_manager_status(manager_id: int, payload: ManagerStatusPayload, _: dict = Depends(require_admin)):
    with db_lock:
        row = conn.execute(
            "SELECT id, role FROM users WHERE id = ?",
            [manager_id],
        ).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Manager not found")

    if row[1] != "manager":
        raise HTTPException(status_code=400, detail="Only manager accounts can be updated")

    with db_lock:
        conn.execute(
            "UPDATE users SET is_active = ? WHERE id = ?",
            [bool(payload.is_active), manager_id],
        )
        conn.commit()

    return {"id": manager_id, "is_active": bool(payload.is_active)}


@router.post("/{manager_id}/reset-password")
def reset_manager_password(
    manager_id: int,
    payload: ManagerResetPasswordPayload,
    _: dict = Depends(require_admin),
):
    with db_lock:
        row = conn.execute(
            "SELECT id, role FROM users WHERE id = ?",
            [manager_id],
        ).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Manager not found")

    if row[1] != "manager":
        raise HTTPException(status_code=400, detail="Only manager accounts can be updated")

    hashed_pwd = hash_password(payload.new_password)
    with db_lock:
        conn.execute(
            "UPDATE users SET password = ? WHERE id = ?",
            [hashed_pwd, manager_id],
        )
        conn.commit()

    return {"id": manager_id, "new_password": payload.new_password}


@router.delete("/{manager_id}")
def delete_manager(
    manager_id: int,
    confirm_username: str = Query(default="", description="Username confirmation (GitHub-style)"),
    _: dict = Depends(require_admin),
):
    with db_lock:
        row = conn.execute(
            "SELECT id, username, role FROM users WHERE id = ?",
            [manager_id],
        ).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Manager not found")

    if row[2] != "manager":
        raise HTTPException(status_code=400, detail="Only manager accounts can be deleted")

    expected_username = row[1] or ""
    if (confirm_username or "").strip() != expected_username:
        raise HTTPException(status_code=400, detail="Username confirmation mismatch")

    with db_lock:
        try:
            # 1. Unassign from gmail_messages
            conn.execute("UPDATE gmail_messages SET assigned_to = NULL WHERE assigned_to = ?", [int(manager_id)])
            
            # 2. Soft-delete the user instead of physical deletion to avoid DuckDB's Vector::Reference internal bug
            # We change the role and deactivate the account. 
            # Note: The 'role' check in other routes will now naturally exclude this user.
            conn.execute(
                "UPDATE users SET role = 'manager_deleted', is_active = FALSE WHERE id = ?", 
                [int(manager_id)]
            )
            
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=500, detail=f"Database error during deletion: {str(e)}")

    return {"deleted": True, "id": manager_id, "mode": "soft_delete"}
