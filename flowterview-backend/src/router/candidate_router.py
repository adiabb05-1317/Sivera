from datetime import datetime
from typing import List, Optional
import uuid
import time
import re

from fastapi import APIRouter, HTTPException, Request, File, UploadFile, Form
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
    resume_url: Optional[str] = None
    status: str = "Applied"
    phone: Optional[str] = None
    notes: Optional[str] = None


class BulkCandidateIn(BaseModel):
    candidates: List[CandidateIn]


class CandidateOut(BaseModel):
    id: str
    email: str
    name: str
    organization_id: str
    job_id: str
    resume_url: Optional[str] = None
    status: str = "Applied"
    created_at: str
    updated_at: str
    notes: Optional[str] = None


class BulkCandidateResponse(BaseModel):
    success: bool
    created_count: int
    candidates: List[CandidateOut]
    failed_candidates: List[dict] = []


class CandidateUpdate(BaseModel):
    status: Optional[str] = None
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    resume_url: Optional[str] = None
    notes: Optional[str] = None


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
            c["jobs"] = {"title": jobs.get(c.get("job_id"), "-"), "id": c.get("job_id"), "status": c.get("status")}

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

        candidates.sort(key=lambda x: (x.get("jobs", {}).get("id"), -parse_created_at(x["created_at"])))
        return candidates
    except DatabaseError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/", response_model=CandidateOut)
async def create_candidate(candidate: CandidateIn, request: Request):
    try:
        organization_id = require_organization(request).organization_id
        
        # Validate that the organization_id matches
        if candidate.organization_id != organization_id:
            raise HTTPException(status_code=403, detail="Organization mismatch")

        # Normalize email for comparison
        normalized_email = candidate.email.lower().strip()

        # Check if email already exists in database for this job
        existing_candidate = db.fetch_one("candidates", {
            "email": normalized_email,
            "job_id": candidate.job_id,
            "organization_id": organization_id
        })

        if existing_candidate:
            raise HTTPException(status_code=400, detail="Email already exists for this job")

        # Insert candidate
        candidate_id = str(uuid.uuid4())
        candidate_data = candidate.dict()
        candidate_data["id"] = candidate_id
        candidate_data["email"] = normalized_email  # Store normalized email
        candidate_data["created_at"] = datetime.now().isoformat()
        candidate_data["updated_at"] = datetime.now().isoformat()
        
        created_candidate = db.execute_query("candidates", candidate_data)

        return created_candidate
    except DatabaseError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/check-email")
async def check_email_exists(email: str, job_id: Optional[str] = None, request: Request = None):
    """Check if an email already exists for candidates in the organization or specific job"""
    try:
        organization_id = require_organization(request).organization_id
        
        # Build query conditions
        conditions = {
            "email": email.lower().strip(),
            "organization_id": organization_id
        }
        
        # If job_id is provided, check only within that job
        if job_id:
            conditions["job_id"] = job_id
        
        # Check if any candidate exists with this email
        existing_candidate = db.fetch_one("candidates", conditions)
        
        return {
            "exists": existing_candidate is not None,
            "candidate_id": existing_candidate.get("id") if existing_candidate else None,
            "job_id": existing_candidate.get("job_id") if existing_candidate else None
        }
        
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


@router.get("/{candidate_id}", response_model=CandidateOut)
async def get_candidate(candidate_id: str, request: Request):
    try:
        candidate = db.fetch_one("candidates", {"id": candidate_id})
        if not candidate:
            raise HTTPException(status_code=404, detail="Candidate not found")
        return candidate
    except DatabaseError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{candidate_id}", response_model=CandidateOut)
async def update_candidate(candidate_id: str, updates: CandidateUpdate, request: Request):
    try:
        # Verify organization access
        organization_id = require_organization(request).organization_id

        # Fetch the current candidate record
        current = db.fetch_one("candidates", {"id": candidate_id})
        if not current:
            raise HTTPException(status_code=404, detail="Candidate not found")

        # Verify the candidate belongs to the requesting organization
        if current.get("organization_id") != organization_id:
            raise HTTPException(status_code=403, detail="Access denied")

        # Build update dictionary with only non-None values
        update_dict = {k: v for k, v in updates.dict().items() if v is not None}

        if not update_dict:
            raise HTTPException(status_code=400, detail="No valid updates provided")

        # Add updated timestamp
        update_dict["updated_at"] = datetime.now().isoformat()

        # Update the candidate
        db.update("candidates", update_dict, {"id": candidate_id})

        # Fetch and return the updated record
        updated = db.fetch_one("candidates", {"id": candidate_id})
        return updated
    except DatabaseError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/bulk", response_model=BulkCandidateResponse)
async def create_bulk_candidates(bulk_request: BulkCandidateIn, request: Request):
    """Create multiple candidates at once for better performance"""
    try:
        organization_id = require_organization(request).organization_id

        created_candidates = []
        failed_candidates = []

        # Track emails within this batch to prevent duplicates
        batch_emails = set()

        for candidate_data in bulk_request.candidates:
            try:
                # Validate that the organization_id matches
                if candidate_data.organization_id != organization_id:
                    failed_candidates.append({"candidate": candidate_data.dict(), "error": "Organization mismatch"})
                    continue

                # Normalize email for comparison
                normalized_email = candidate_data.email.lower().strip()

                # Check for duplicates within the batch
                if normalized_email in batch_emails:
                    failed_candidates.append({"candidate": candidate_data.dict(), "error": "Duplicate email in batch"})
                    continue
                
                batch_emails.add(normalized_email)

                # Check if email already exists in database for this job
                existing_candidate = db.fetch_one("candidates", {
                    "email": normalized_email,
                    "job_id": candidate_data.job_id,
                    "organization_id": organization_id
                })

                if existing_candidate:
                    failed_candidates.append({"candidate": candidate_data.dict(), "error": "Email already exists for this job"})
                    continue

                # Create candidate
                candidate_id = str(uuid.uuid4())
                candidate_dict = candidate_data.dict()
                candidate_dict["id"] = candidate_id
                candidate_dict["email"] = normalized_email  # Store normalized email
                candidate_dict["created_at"] = datetime.now().isoformat()
                candidate_dict["updated_at"] = datetime.now().isoformat()

                print(f"[DEBUG] Creating candidate: {candidate_dict['name']}")
                created_candidate = db.execute_query("candidates", candidate_dict)
                print(f"[DEBUG] Created candidate: {created_candidate}")
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


@router.delete("/{candidate_id}")
async def delete_candidate(candidate_id: str, request: Request):
    try:
        organization_id = require_organization(request).organization_id
        candidate = db.fetch_one("candidates", {"id": candidate_id})
        print(f"[DEBUG] candidate: {candidate}")
        if not candidate:
            raise HTTPException(status_code=404, detail="Candidate not found")
        
        if candidate["organization_id"] != organization_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # TODO: More parameters to check.
        candidate_interviews = db.fetch_all("candidate_interviews", {"candidate_id": candidate_id})
        candidate_interview_rounds = db.fetch_all("candidate_interview_round", {"candidate_id": candidate_id})
        if len(candidate_interview_rounds) > 0 or len(candidate_interviews) > 0 or candidate["status"] == "Accepted":
            raise HTTPException(status_code=500, detail="Candidate is already in an interview or already accepted")

        # Get current interviews for this job
        interviews = db.fetch_all("interviews", {"job_id": candidate["job_id"]})
        for interview in interviews:
            current_invited = interview.get("candidates_invited", [])
            if candidate_id in current_invited:
                # Remove the candidate from the array
                updated_invited = [cid for cid in current_invited if cid != candidate_id]
                db.update("interviews", {"candidates_invited": updated_invited}, {"id": interview["id"]})
        db.delete("candidates", {"id": candidate_id})
        return {"success": True, "message": "Candidate deleted"}
    except DatabaseError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/upload-resume")
async def upload_resume(
    request: Request,
    file: UploadFile = File(...),
    candidate_name: str = Form(...)
):
    try:
        require_organization(request)
        supabase = request.app.state.supabase

        # Sanitize filename
        safe_name = re.sub(r"[^a-zA-Z0-9_-]", "_", candidate_name.strip().lower())
        ext = file.filename.split(".")[-1] if file.filename and "." in file.filename else "pdf"
        file_path = f"{safe_name}_{int(time.time() * 1000)}.{ext}"

        # Read bytes and validate
        file_bytes = await file.read()
        print(f"[DEBUG] file_bytes type: {type(file_bytes)}, size: {len(file_bytes) if isinstance(file_bytes, bytes) else 'N/A'}")
        
        if not isinstance(file_bytes, bytes) or len(file_bytes) == 0:
            raise HTTPException(status_code=400, detail="Invalid file content")

        # Upload PDF file with correct content-type
        upload_response = supabase.storage.from_("resumes").upload(
            file_path,
            file_bytes,
            {"content-type": "application/pdf"}
        )
        
        print(f"[DEBUG] upload_response type: {type(upload_response)}")
        print(f"[DEBUG] upload_response: {upload_response}")

        # Check for upload errors - handle different response types
        if hasattr(upload_response, 'error') and upload_response.error:
            print(f"[UPLOAD ERROR] {upload_response.error}")
            raise HTTPException(status_code=400, detail=f"Upload failed: {upload_response.error}")

        # Create signed URL
        signed_response = supabase.storage.from_("resumes").create_signed_url(
            file_path,
            60 * 60 * 24 * 365
        )
        
        print(f"[DEBUG] signed_response type: {type(signed_response)}")
        print(f"[DEBUG] signed_response: {signed_response}")

        # Check for signed URL errors - handle different response types  
        if hasattr(signed_response, 'error') and signed_response.error:
            print(f"[SIGNED URL ERROR] {signed_response.error}")
            raise HTTPException(status_code=400, detail=f"Signed URL creation failed: {signed_response.error}")

        # Extract signed URL - handle multiple possible response structures
        signed_url = None
        if hasattr(signed_response, 'data') and signed_response.data:
            # Try both possible property names
            signed_url = signed_response.data.get("signedUrl") or signed_response.data.get("signedURL")
        elif isinstance(signed_response, dict):
            # Direct dict response
            signed_url = signed_response.get("signedUrl") or signed_response.get("signedURL")
        elif isinstance(signed_response, str):
            # Direct string response
            signed_url = signed_response
            
        if not signed_url:
            print(f"[ERROR] Could not extract signed URL from response: {signed_response}")
            raise HTTPException(status_code=400, detail="Failed to generate signed URL")

        return {
            "signed_url": signed_url,
            "file_path": file_path,
            "filename": file.filename,
            "content_type": file.content_type
        }

    except Exception as e:
        print(f"[EXCEPTION] {repr(e)}")  # This should stop showing bool.encode
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")