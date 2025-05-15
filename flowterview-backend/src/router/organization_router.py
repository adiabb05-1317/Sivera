from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import List, Optional
from storage.db_manager import DatabaseManager, DatabaseError

router = APIRouter(prefix="/api/v1/organizations", tags=["organizations"])

db = DatabaseManager()

class OrganizationIn(BaseModel):
    name: str

class OrganizationOut(BaseModel):
    id: str
    name: str
    created_at: str
    updated_at: str

@router.get("/", response_model=List[OrganizationOut])
async def list_organizations(request: Request):
    try:
        orgs = db.fetch_all("organizations")
        return orgs
    except DatabaseError as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{org_id}", response_model=OrganizationOut)
async def get_organization(org_id: str, request: Request):
    try:
        org = db.fetch_one("organizations", {"id": org_id})
        if not org:
            raise HTTPException(status_code=404, detail="Organization not found")
        return org
    except DatabaseError as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=OrganizationOut)
async def create_organization(org: OrganizationIn, request: Request):
    try:
        created_org = db.execute_query("organizations", {"name": org.name})
        return created_org
    except DatabaseError as e:
        raise HTTPException(status_code=400, detail=str(e)) 