from datetime import datetime
from typing import List
import uuid

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from src.utils.auth_middleware import require_organization
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
    phone: str = None


class BulkCandidateIn(BaseModel):
    candidates: List[CandidateIn]


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


class BulkCandidateResponse(BaseModel):
    success: bool
    created_count: int
    candidates: List[CandidateOut]
    failed_candidates: List[dict] = []


@router.get("/", response_model=List[CandidateOut])
async def list_candidates(request: Request):
    try:
        organization_id = require_organization(request).organization_id
        candidates = db.fetch_all("candidates", {"organization_id": organization_id})
        return candidates
    except DatabaseError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/by-job")
async def fetch_candidates_sorted_by_job(request: Request):
    try:
        organization_id = require_organization(request).organization_id
        candidates = db.fetch_all("candidates", {"organization_id": organization_id})
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


@router.get("/by-job/{job_id}", response_model=List[CandidateOut])
async def get_candidates_by_job(job_id: str, request: Request):
    """Get all candidates for a specific job"""
    try:
        organization_id = require_organization(request).organization_id
        candidates = db.fetch_all("candidates", {"job_id": job_id, "organization_id": organization_id})
        return candidates
    except DatabaseError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/bulk", response_model=BulkCandidateResponse)
async def create_bulk_candidates(bulk_request: BulkCandidateIn, request: Request):
    """Create multiple candidates at once for better performance"""
    try:
        organization_id = require_organization(request).organization_id

        created_candidates = []
        failed_candidates = []

        for candidate_data in bulk_request.candidates:
            try:
                # Validate that the organization_id matches
                if candidate_data.organization_id != organization_id:
                    failed_candidates.append({"candidate": candidate_data.dict(), "error": "Organization mismatch"})
                    continue

                # Create candidate
                candidate_id = str(uuid.uuid4())
                candidate_dict = candidate_data.dict()
                candidate_dict["id"] = candidate_id
                candidate_dict["created_at"] = datetime.now().isoformat()
                candidate_dict["updated_at"] = datetime.now().isoformat()

                created_candidate = db.execute_query("candidates", candidate_dict)
                created_candidates.append(created_candidate)

            except Exception as e:
                failed_candidates.append({"candidate": candidate_data.dict(), "error": str(e)})

        return BulkCandidateResponse(
            success=len(failed_candidates) == 0,
            created_count=len(created_candidates),
            candidates=created_candidates,
            failed_candidates=failed_candidates,
        )

    except DatabaseError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
