from datetime import datetime
from typing import List, Literal, Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from storage.db_manager import DatabaseError, DatabaseManager

router = APIRouter(prefix="/api/v1/users", tags=["users"])

db = DatabaseManager()


class UserIn(BaseModel):
    user_id: str
    name: str
    email: str
    organization_name: str


class UserOut(BaseModel):
    id: str
    name: str = None
    email: str
    organization_id: str
    role: Literal["admin", "recruiter", "candidate"]
    logo_url: Optional[str] = None
    created_at: datetime


@router.get("/", response_model=List[UserOut])
async def list_users(request: Request):
    email = request.query_params.get("email")
    try:
        if email:
            users = db.fetch_all("users", {"email": email})
            if not users:
                raise HTTPException(status_code=404, detail="User not found")
            return users
        users = db.fetch_all("users")
        if not users:
            raise HTTPException(status_code=500, detail="No users found")
        return users
    except DatabaseError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/", response_model=UserOut)
async def create_user(user: UserIn, request: Request):
    try:
        # List of common/public email domains
        public_domains = {
            "gmail",
            "outlook",
            "yahoo",
            "hotmail",
            "icloud",
            "aol",
            "protonmail",
            "zoho",
            "mail",
            "gmx",
            "yandex",
            "pm",
            "msn",
            "live",
            "comcast",
            "me",
        }

        org_name = user.organization_name.lower()
        if org_name in public_domains:
            org_name = "personal"

        # Check if user already exists (idempotency)
        existing_user = db.fetch_one("users", {"id": user.user_id})
        if existing_user:
            raise HTTPException(status_code=400, detail="User with this email already exists.")
        # Check if organization exists by name

        org = db.fetch_one("organizations", {"domain": org_name})
        role = None
        if org:
            organization_id = org["id"]
            role = "recruiter"  # Set role for existing organization
        else:
            # Create organization (idempotent: if org with name exists, fetch it)
            try:
                org = db.execute_query("organizations", {"domain": org_name})
                organization_id = org["id"]
                role = "admin"
            except DatabaseError as org_err:
                # If org already exists, fetch it
                org = db.fetch_one("organizations", {"domain": org_name})
                role = "recruiter"
                if not org:
                    raise HTTPException(
                        status_code=400, detail=f"Failed to create or fetch organization: {org_err}"
                    )
                organization_id = org["id"]
        
        # Ensure role is never None
        if role is None:
            role = "recruiter"
            
        # Create user with organization_id
        user_data = {
            "id": user.user_id,
            "name": user.name,
            "email": user.email,
            "organization_id": organization_id,
            "role": role,
        }
        created_user = db.execute_query("users", user_data)
        return created_user
    except DatabaseError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{user_id}", response_model=UserOut)
async def get_user(user_id: str, request: Request):
    try:
        user = db.fetch_one("users", {"id": user_id})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user
    except DatabaseError as e:
        raise HTTPException(status_code=500, detail=str(e))


class UserUpdateIn(BaseModel):
    name: str
    logo_url: Optional[str] = None


@router.put("/{user_id}", response_model=UserOut)
async def update_user(user_id: str, user_update: UserUpdateIn, request: Request):
    try:
        user = db.fetch_one("users", {"id": user_id})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Update user data
        update_data = {"name": user_update.name}
        if user_update.logo_url:
            update_data["logo_url"] = user_update.logo_url
            
        updated_users = db.update("users", update_data, {"id": user_id})
        if not updated_users:
            raise HTTPException(status_code=500, detail="Failed to update user")
        return updated_users[0]
    except DatabaseError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{user_id}/role", response_model=UserOut)
async def update_user_role(
    user_id: str,
    role: Literal["admin", "recruiter", "candidate"],
    request: Request,
):
    try:
        user = db.fetch_one("users", {"id": user_id})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        updated_users = db.update("users", {"role": role}, {"id": user_id})
        if not updated_users:
            raise HTTPException(status_code=500, detail="Failed to update user role")
        user = updated_users[0]
        return user
    except DatabaseError as e:
        raise HTTPException(status_code=500, detail=str(e))