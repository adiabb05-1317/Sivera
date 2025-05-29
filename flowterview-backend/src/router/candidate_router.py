from datetime import datetime
from typing import List
import uuid

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from storage.db_manager import DatabaseError, DatabaseManager

router = APIRouter(prefix="/api/v1/candidates", tags=["candidates"])

db = DatabaseManager()


class CandidateIn(BaseModel):
    email: str
    name: str
    organization_id: str
    job_id: str
    resume_url: str = None
    status: str = "Applied"


class CandidateOut(BaseModel):
    id: str
    email: str
    name: str
    organization_id: str
    job_id: str
    resume_url: str = None
    status: str = "Applied"
    created_at: str
    updated_at: str


@router.get("/", response_model=List[CandidateOut])
async def list_candidates(request: Request):
    try:
        candidates = db.fetch_all("candidates")
        return candidates
    except DatabaseError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/by-job")
async def fetch_candidates_sorted_by_job(request: Request):
    try:
        candidates = db.fetch_all("candidates")
        jobs = {job["id"]: job["title"] for job in db.fetch_all("jobs")}
        # Attach job object to each candidate if job_id exists
        for c in candidates:
            c["jobs"] = {"title": jobs.get(c.get("job_id"), "-")}

        def parse_created_at(dt_str):
            try:
                return datetime.strptime(dt_str, "%Y-%m-%d %H:%M:%S.%f%z").timestamp()
            except Exception:
                try:
                    return datetime.strptime(dt_str, "%Y-%m-%d %H:%M:%S.%f").timestamp()
                except Exception:
                    try:
                        return datetime.strptime(dt_str, "%Y-%m-%d %H:%M:%S").timestamp()
                    except Exception:
                        return float("-inf")

        candidates.sort(key=lambda x: (x.get("job_id"), -parse_created_at(x["created_at"])))
        return candidates
    except DatabaseError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/", response_model=CandidateOut)
async def create_candidate(candidate: CandidateIn, request: Request):
    try:
        # Insert candidate
        candidate_id = str(uuid.uuid4())
        candidate_data = candidate.dict()
        candidate_data["id"] = candidate_id
        created_candidate = db.execute_query("candidates", candidate_data)

        # Check if user exists for this email
        user = db.fetch_one("users", {"email": candidate.email})
        if not user:
            user_id = str(uuid.uuid4())
            user_data = {
                "id": user_id,
                "email": candidate.email,
                "name": candidate.name,
                "role": "candidate",
                "organization_id": candidate.organization_id,
            }
            db.supabase.table("users").insert(user_data).execute()

        return created_candidate
    except DatabaseError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{candidate_id}", response_model=CandidateOut)
async def get_candidate(candidate_id: str, request: Request):
    try:
        candidate = db.fetch_one("candidates", {"id": candidate_id})
        if not candidate:
            raise HTTPException(status_code=404, detail="Candidate not found")
        return candidate
    except DatabaseError as e:
        raise HTTPException(status_code=500, detail=str(e))
