from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import List, Optional, Literal

router = APIRouter(prefix="/api/v1/users", tags=["users"])

class UserIn(BaseModel):
    email: str
    organization_id: str
    role: Literal["admin", "interviewer", "candidate"] = "interviewer"

class UserOut(BaseModel):
    id: str
    email: str
    organization_id: str
    role: Literal["admin", "interviewer", "candidate"]
    created_at: str
    updated_at: str

@router.get("/", response_model=List[UserOut])
async def list_users(request: Request):
    supabase = request.app.state.supabase
    resp = supabase.table("users").select("*").execute()
    if resp.error:
        raise HTTPException(status_code=500, detail=resp.error.message)
    return resp.data

@router.get("/{user_id}", response_model=UserOut)
async def get_user(user_id: str, request: Request):
    supabase = request.app.state.supabase
    resp = supabase.table("users").select("*").eq("id", user_id).single().execute()
    if resp.error:
        raise HTTPException(status_code=404, detail=resp.error.message)
    return resp.data

@router.post("/", response_model=UserOut)
async def create_user(user: UserIn, request: Request):
    supabase = request.app.state.supabase
    resp = supabase.table("users").insert(user.dict()).execute()
    if resp.error:
        raise HTTPException(status_code=400, detail=resp.error.message)
    return resp.data[0] 