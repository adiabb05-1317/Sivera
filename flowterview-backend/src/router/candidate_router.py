from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import List

router = APIRouter(prefix="/api/v1/candidates", tags=["candidates"])

class CandidateIn(BaseModel):
    email: str
    name: str
    organization_id: str

class CandidateOut(BaseModel):
    id: str
    email: str
    name: str
    organization_id: str
    created_at: str
    updated_at: str

@router.get("/", response_model=List[CandidateOut])
async def list_candidates(request: Request):
    supabase = request.app.state.supabase
    resp = supabase.table("candidates").select("*").execute()
    if resp.error:
        raise HTTPException(status_code=500, detail=resp.error.message)
    return resp.data

@router.get("/{candidate_id}", response_model=CandidateOut)
async def get_candidate(candidate_id: str, request: Request):
    supabase = request.app.state.supabase
    resp = supabase.table("candidates").select("*").eq("id", candidate_id).single().execute()
    if resp.error:
        raise HTTPException(status_code=404, detail=resp.error.message)
    return resp.data

@router.post("/", response_model=CandidateOut)
async def create_candidate(candidate: CandidateIn, request: Request):
    supabase = request.app.state.supabase
    resp = supabase.table("candidates").insert(candidate.dict()).execute()
    if resp.error:
        raise HTTPException(status_code=400, detail=resp.error.message)
    return resp.data[0] 