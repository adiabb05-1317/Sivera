from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter(prefix="/api/v1/organizations", tags=["organizations"])

class OrganizationIn(BaseModel):
    name: str

class OrganizationOut(BaseModel):
    id: str
    name: str
    created_at: str
    updated_at: str

@router.get("/", response_model=List[OrganizationOut])
async def list_organizations(request: Request):
    supabase = request.app.state.supabase
    resp = supabase.table("organizations").select("*").execute()
    if resp.error:
        raise HTTPException(status_code=500, detail=resp.error.message)
    return resp.data

@router.get("/{org_id}", response_model=OrganizationOut)
async def get_organization(org_id: str, request: Request):
    supabase = request.app.state.supabase
    resp = supabase.table("organizations").select("*").eq("id", org_id).single().execute()
    if resp.error:
        raise HTTPException(status_code=404, detail=resp.error.message)
    return resp.data

@router.post("/", response_model=OrganizationOut)
async def create_organization(org: OrganizationIn, request: Request):
    supabase = request.app.state.supabase
    resp = supabase.table("organizations").insert({"name": org.name}).execute()
    if resp.error:
        raise HTTPException(status_code=400, detail=resp.error.message)
    return resp.data[0] 