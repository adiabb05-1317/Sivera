from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import List
from storage.db_manager import DatabaseManager, DatabaseError

router = APIRouter(prefix="/api/v1/candidates", tags=["candidates"])

db = DatabaseManager()

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
    try:
        candidates = db.fetch_all("candidates")
        return candidates
    except DatabaseError as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{candidate_id}", response_model=CandidateOut)
async def get_candidate(candidate_id: str, request: Request):
    try:
        candidate = db.fetch_one("candidates", {"id": candidate_id})
        if not candidate:
            raise HTTPException(status_code=404, detail="Candidate not found")
        return candidate
    except DatabaseError as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=CandidateOut)
async def create_candidate(candidate: CandidateIn, request: Request):
    try:
        created_candidate = db.execute_query("candidates", candidate.dict())
        return created_candidate
    except DatabaseError as e:
        raise HTTPException(status_code=400, detail=str(e)) 