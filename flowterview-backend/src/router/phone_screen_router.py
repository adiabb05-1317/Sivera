from datetime import datetime, timedelta, timezone
import os
import re
from typing import List, Optional

import aiohttp
from fastapi import APIRouter, BackgroundTasks, HTTPException, Request
from pydantic import BaseModel

from src.utils.auth_middleware import require_organization
from src.utils.logger import logger
from storage.db_manager import DatabaseManager

router = APIRouter(prefix="/api/v1/phone-screens", tags=["Phone Screens"])
db = DatabaseManager()


class PhoneScreenScheduleRequest(BaseModel):
    candidate_id: str
    phone_number: str
    scheduled_at: Optional[str] = None


class BulkPhoneScreenScheduleRequest(BaseModel):
    candidate_ids: List[str]
    scheduled_at: str
    time_slots: Optional[List[str]] = None  # For staggered scheduling


class CandidateSelectionRequest(BaseModel):
    job_id: str
    filters: Optional[dict] = None
    sort_by: Optional[str] = "created_at"
    sort_order: Optional[str] = "desc"
    limit: Optional[int] = 50


class PhoneScreenResponse(BaseModel):
    id: str
    candidate_id: str
    job_id: str
    phone_number: str
    status: str
    scheduled_at: Optional[str]
    attempted_at: Optional[str]
    retry_count: int
    max_retries: int


class PhoneScreenStatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None


def validate_phone_number(phone_number: str) -> str:
    """Validate and format phone number to international format"""
    if not phone_number:
        raise ValueError("Phone number is required")

    # Remove all non-digit characters except + at the beginning
    cleaned = re.sub(r"[^\d+]", "", phone_number)

    # If it doesn't start with +, assume it's a US number and add +1
    if not cleaned.startswith("+"):
        if len(cleaned) == 10:  # US number without country code
            cleaned = "+1" + cleaned
        elif len(cleaned) == 11 and cleaned.startswith("1"):  # US number with 1 prefix
            cleaned = "+" + cleaned
        else:
            # Try to detect common patterns
            if len(cleaned) == 10:  # Could be US number
                cleaned = "+1" + cleaned
            else:
                raise ValueError("Phone number must include country code (e.g., +1, +91)")

    # Validate length (minimum 10 digits + country code)
    if len(cleaned) < 10:
        raise ValueError("Phone number is too short")

    if len(cleaned) > 16:  # ITU-T recommendation max length
        raise ValueError("Phone number is too long")

    # Validate format
    phone_pattern = r"^\+\d{1,4}\d{6,14}$"
    if not re.match(phone_pattern, cleaned):
        raise ValueError("Invalid phone number format. Use international format like +1234567890")

    return cleaned


async def trigger_phone_screen_call(phone_screen_attempt: dict, core_backend_url: str):
    """Trigger the actual phone screen call via the core backend"""
    try:
        logger.info(f"🔔 Triggering phone screen call for candidate {phone_screen_attempt.get('candidate_id')}")
        logger.info(f"📞 Phone number: {phone_screen_attempt.get('phone_number')}")
        logger.info(f"🌐 Core backend URL: {core_backend_url}")
        
        # Get candidate and job data from local database
        candidate_id = phone_screen_attempt["candidate_id"]
        job_id = phone_screen_attempt["job_id"]
        
        logger.info(f"Looking for candidate {candidate_id} in database")
        candidate = db.fetch_one("candidates", {"id": candidate_id})
        if not candidate:
            logger.error(f"Candidate {candidate_id} not found in local database")
            # Let's also check what candidates are in the database
            all_candidates = db.fetch_all("candidates", {})
            logger.info(f"Available candidates in database: {[c.get('id') for c in all_candidates]}")
            return False
            
        job = db.fetch_one("jobs", {"id": job_id})
        if not job:
            logger.error(f"Job {job_id} not found in local database")
            return False
            
        organization = db.fetch_one("organizations", {"id": job["organization_id"]})
        company_name = organization.get("name", "Unknown Company") if organization else "Unknown Company"
        
        # Get phone screen questions
        phone_screen_id = job.get("phone_screen_id")
        phone_screen_questions = []
        if phone_screen_id:
            phone_screen_record = db.fetch_one("phone_screen", {"id": phone_screen_id})
            if phone_screen_record:
                phone_screen_questions = phone_screen_record.get("questions", [])
        
        payload = {
            "dialout_settings": {
                "job_id": job_id,
                "candidate_id": candidate_id,
                "phone_number": phone_screen_attempt["phone_number"],
                "sip_uri": f"sip:{phone_screen_attempt['phone_number'].replace('+', '')}@pstn.daily.co"
            },
            "candidate_data": {
                "id": candidate_id,
                "name": candidate.get("name", "Unknown"),
                "email": candidate.get("email", ""),
                "phone": phone_screen_attempt["phone_number"]
            },
            "job_data": {
                "id": job_id,
                "title": job.get("title", "Unknown Position"),
                "organization_id": job["organization_id"],
                "phone_screen_id": phone_screen_id
            },
            "organization_data": {
                "id": job["organization_id"],
                "name": company_name
            },
            "phone_screen_questions": phone_screen_questions
        }

        logger.info(f"📤 Sending payload to core backend: {payload}")
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{core_backend_url}/api/v1/phone_screening/connect",
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=aiohttp.ClientTimeout(total=30)  # 30 second timeout
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    logger.info(f"✅ Core backend response: {result}")

                    # Update phone screen attempt with call details
                    db.update(
                        "phone_screen_attempts",
                        {
                            "status": "in_progress",
                            "attempted_at": datetime.now(timezone.utc).isoformat(),
                            "call_id": result.get("call_id"),
                            "session_id": result.get("session_id"),
                            "updated_at": datetime.now(timezone.utc).isoformat(),
                        },
                        {"id": phone_screen_attempt["id"]},
                    )

                    logger.info(f"🎉 Phone screen call initiated successfully for candidate {phone_screen_attempt['candidate_id']}")
                    return True
                else:
                    error_text = await response.text()
                    logger.error(f"❌ Failed to initiate phone screen call: {response.status} - {error_text}")
                    return False

    except Exception as e:
        logger.error(f"Error triggering phone screen call: {e}")
        return False


async def schedule_phone_screens_for_interview(interview_id: str):
    """Schedule phone screens for all candidates when interview becomes active"""
    try:
        # Get interview and job details
        interview = db.fetch_one("interviews", {"id": interview_id})
        if not interview:
            logger.error(f"Interview {interview_id} not found")
            return

        job = db.fetch_one("jobs", {"id": interview["job_id"]})
        if not job:
            logger.error(f"Job {interview['job_id']} not found")
            return

        # Check if phone screening is enabled
        process_stages = job.get("process_stages", {})
        if not process_stages.get("phoneInterview", False):
            logger.info(f"Phone screening not enabled for job {job['id']}")
            return

        if not job.get("phone_screen_id"):
            logger.warning(f"No phone screen questions configured for job {job['id']}")
            return

        # Get all candidates for this job who have phone numbers
        candidates = db.fetch_all("candidates", {"job_id": job["id"]})

        scheduled_count = 0
        for candidate in candidates:
            phone_number = candidate.get("phone")
            if not phone_number:
                logger.warning(f"No phone number for candidate {candidate['id']}")
                continue

            try:
                # Validate and format phone number
                formatted_phone = validate_phone_number(phone_number)

                # Check if phone screen attempt already exists
                existing_attempt = db.fetch_one(
                    "phone_screen_attempts", {"candidate_id": candidate["id"], "job_id": job["id"]}
                )

                if existing_attempt:
                    logger.info(f"Phone screen already scheduled for candidate {candidate['id']}")
                    continue

                # Create phone screen attempt
                scheduled_at = datetime.now(timezone.utc) + timedelta(minutes=5)  # Schedule 5 minutes from now

                phone_screen_data = {
                    "candidate_id": candidate["id"],
                    "job_id": job["id"],
                    "phone_number": formatted_phone,
                    "status": "scheduled",
                    "scheduled_at": scheduled_at.isoformat(),
                    "retry_count": 0,
                    "max_retries": 3,
                }

                result = db.execute_query("phone_screen_attempts", phone_screen_data)
                scheduled_count += 1

                logger.info(f"Scheduled phone screen for candidate {candidate['id']} at {scheduled_at}")

            except ValueError as e:
                logger.error(f"Invalid phone number for candidate {candidate['id']}: {e}")
                continue

        logger.info(f"Scheduled {scheduled_count} phone screens for interview {interview_id}")

    except Exception as e:
        logger.error(f"Error scheduling phone screens for interview {interview_id}: {e}")


async def process_scheduled_phone_screens():
    """Background task to process scheduled phone screens"""
    try:
        # Get all scheduled phone screens that are due
        current_time = datetime.now(timezone.utc)

        scheduled_attempts = db.fetch_all("phone_screen_attempts", {"status": "scheduled"})
        logger.info(f"Found {len(scheduled_attempts)} scheduled phone screen attempts")

        core_backend_url = os.getenv("CORE_BACKEND_URL", "https://core.sivera.io")  # Fallback URL
        
        if not core_backend_url:
            logger.error("CORE_BACKEND_URL environment variable not set")
            return  

        for attempt in scheduled_attempts:
            scheduled_at = datetime.fromisoformat(attempt["scheduled_at"])
            # Ensure timezone awareness - if no timezone info, assume UTC
            if scheduled_at.tzinfo is None:
                scheduled_at = scheduled_at.replace(tzinfo=timezone.utc)

            # Check if it's time to make the call
            if current_time >= scheduled_at:
                logger.info(f"⏰ Time to call! Processing phone screen for candidate {attempt['candidate_id']}")
                logger.info(f"📅 Scheduled: {scheduled_at} | Current: {current_time}")

                success = await trigger_phone_screen_call(attempt, core_backend_url)

                if not success:
                    # Handle retry logic
                    retry_count = attempt["retry_count"] + 1
                    max_retries = attempt["max_retries"]

                    if retry_count < max_retries:
                        # Schedule retry in 30 minutes
                        next_attempt = current_time + timedelta(minutes=30)
                        db.update(
                            "phone_screen_attempts",
                            {
                                "retry_count": retry_count,
                                "scheduled_at": next_attempt.isoformat(),
                                "updated_at": current_time.isoformat(),
                            },
                            {"id": attempt["id"]},
                        )
                        logger.info(
                            f"Scheduled retry {retry_count}/{max_retries} for candidate {attempt['candidate_id']}"
                        )
                    else:
                        # Max retries reached, mark as failed
                        db.update(
                            "phone_screen_attempts",
                            {
                                "status": "failed",
                                "failed_at": current_time.isoformat(),
                                "updated_at": current_time.isoformat(),
                            },
                            {"id": attempt["id"]},
                        )
                        logger.error(
                            f"❌ Phone screen failed after {max_retries} attempts for candidate {attempt['candidate_id']}"
                        )
            else:
                # Log upcoming calls (not yet due)
                time_diff = (scheduled_at - current_time).total_seconds() / 60  # minutes
                logger.info(f"📋 Upcoming call for candidate {attempt['candidate_id']} in {time_diff:.1f} minutes")

    except Exception as e:
        logger.error(f"Error processing scheduled phone screens: {e}")


@router.post("/schedule")
async def schedule_phone_screen(
    request: PhoneScreenScheduleRequest, background_tasks: BackgroundTasks, http_request: Request
):
    """Manually schedule a phone screen for a candidate"""
    try:
        user_context = require_organization(http_request)

        # Validate phone number
        formatted_phone = validate_phone_number(request.phone_number)

        # Get candidate details
        candidate = db.fetch_one("candidates", {"id": request.candidate_id})
        if not candidate:
            raise HTTPException(status_code=404, detail="Candidate not found")

        # Verify candidate belongs to user's organization
        job = db.fetch_one("jobs", {"id": candidate["job_id"]})
        if job["organization_id"] != user_context.organization_id:
            raise HTTPException(status_code=403, detail="Access denied")

        # Check if already scheduled
        existing = db.fetch_one(
            "phone_screen_attempts", {"candidate_id": request.candidate_id, "job_id": candidate["job_id"]}
        )

        if existing and existing["status"] not in ["failed", "completed"]:
            raise HTTPException(status_code=400, detail="Phone screen already scheduled")

        # Schedule the phone screen
        scheduled_at = request.scheduled_at or (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat()

        phone_screen_data = {
            "candidate_id": request.candidate_id,
            "job_id": candidate["job_id"],
            "phone_number": formatted_phone,
            "status": "scheduled",
            "scheduled_at": scheduled_at,
            "retry_count": 0,
            "max_retries": 3,
        }

        result = db.execute_query("phone_screen_attempts", phone_screen_data)

        return {
            "success": True,
            "phone_screen_id": result["id"],
            "scheduled_at": scheduled_at,
            "phone_number": formatted_phone,
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error scheduling phone screen: {e}")
        raise HTTPException(status_code=500, detail="Failed to schedule phone screen")


@router.get("/job/{job_id}")
async def get_phone_screens_for_job(job_id: str, http_request: Request):
    """Get all phone screen attempts for a job"""
    try:
        user_context = require_organization(http_request)

        # Verify job belongs to user's organization
        job = db.fetch_one("jobs", {"id": job_id})
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

        if job["organization_id"] != user_context.organization_id:
            raise HTTPException(status_code=403, detail="Access denied")

        # Get phone screen attempts with candidate details
        attempts = db.fetch_all(
            table="phone_screen_attempts",
            select="id,candidate_id,job_id,phone_number,status,scheduled_at,attempted_at,completed_at,failed_at,retry_count,max_retries,notes,candidates!inner(name,email)",
            eq_filters={"job_id": job_id},
            order_by=("created_at", True),
        )

        return {"job_id": job_id, "phone_screens": attempts}

    except Exception as e:
        logger.error(f"Error fetching phone screens for job {job_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch phone screens")


@router.patch("/{phone_screen_id}/status")
async def update_phone_screen_status(
    phone_screen_id: str, 
    status_update: PhoneScreenStatusUpdate, 
    http_request: Request
):
    """Update phone screen status (completed, failed, etc.)"""
    try:
        user_context = require_organization(http_request)

        # Get phone screen attempt
        attempt = db.fetch_one("phone_screen_attempts", {"id": phone_screen_id})
        if not attempt:
            raise HTTPException(status_code=404, detail="Phone screen not found")

        # Verify access
        job = db.fetch_one("jobs", {"id": attempt["job_id"]})
        if not job:
            raise HTTPException(status_code=404, detail="Associated job not found")
            
        if job["organization_id"] != user_context.organization_id:
            raise HTTPException(status_code=403, detail="Access denied")

        # Validate status value
        valid_statuses = ["scheduled", "in_progress", "completed", "failed", "cancelled"]
        if status_update.status not in valid_statuses:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
            )

        # Update status
        update_data = {
            "status": status_update.status, 
            "updated_at": datetime.now(timezone.utc).isoformat()
        }

        if status_update.notes:
            update_data["notes"] = status_update.notes

        if status_update.status == "completed":
            update_data["completed_at"] = datetime.now(timezone.utc).isoformat()
        elif status_update.status == "failed":
            update_data["failed_at"] = datetime.now(timezone.utc).isoformat()

        db.update("phone_screen_attempts", update_data, {"id": phone_screen_id})

        logger.info(f"Updated phone screen {phone_screen_id} status to {status_update.status}")
        return {"success": True, "status": status_update.status, "phone_screen_id": phone_screen_id}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating phone screen status: {e}")
        raise HTTPException(status_code=500, detail="Failed to update status")


@router.post("/process-scheduled")
async def trigger_scheduled_processing(http_request: Request):
    """Manually trigger processing of scheduled phone screens"""
    try:
        user_context = require_organization(http_request)
        await process_scheduled_phone_screens()
        return {"success": True, "message": "Processing triggered"}
    except Exception as e:
        logger.error(f"Error triggering phone screen processing: {e}")
        raise HTTPException(status_code=500, detail="Failed to trigger processing")


@router.get("/debug-scheduled")
async def debug_scheduled_phone_screens(http_request: Request):
    """Debug endpoint to check scheduled phone screens and candidate data"""
    try:
        user_context = require_organization(http_request)
        
        # Get all scheduled attempts
        scheduled_attempts = db.fetch_all("phone_screen_attempts", {"status": "scheduled"})
        
        # Get all candidates
        all_candidates = db.fetch_all("candidates", {})
        
        # Get all jobs
        all_jobs = db.fetch_all("jobs", {})
        
        debug_info = {
            "scheduled_attempts_count": len(scheduled_attempts),
            "total_candidates": len(all_candidates),
            "total_jobs": len(all_jobs),
            "scheduled_attempts": [
                {
                    "id": attempt.get("id"),
                    "candidate_id": attempt.get("candidate_id"),
                    "job_id": attempt.get("job_id"),
                    "phone_number": attempt.get("phone_number"),
                    "scheduled_at": attempt.get("scheduled_at"),
                    "status": attempt.get("status")
                }
                for attempt in scheduled_attempts[:5]  # Limit to first 5 for debugging
            ],
            "candidate_ids": [c.get("id") for c in all_candidates[:10]],  # First 10 candidate IDs
            "job_ids": [j.get("id") for j in all_jobs[:10]]  # First 10 job IDs
        }
        
        return debug_info
        
    except Exception as e:
        logger.error(f"Error in debug endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/bulk-schedule")
async def bulk_schedule_phone_screens(request: BulkPhoneScreenScheduleRequest, http_request: Request):
    """Schedule phone screens for multiple candidates at once"""
    try:
        user_context = require_organization(http_request)

        if not request.candidate_ids:
            raise HTTPException(status_code=400, detail="No candidates provided")

        if len(request.candidate_ids) > 50:
            raise HTTPException(status_code=400, detail="Cannot schedule more than 50 phone screens at once")

        scheduled_screens = []
        failed_candidates = []

        # Parse base scheduled time
        try:
            base_time = datetime.fromisoformat(request.scheduled_at.replace("Z", "+00:00"))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid scheduled_at format")

        for i, candidate_id in enumerate(request.candidate_ids):
            try:
                # Get candidate details
                candidate = db.fetch_one("candidates", {"id": candidate_id})
                if not candidate:
                    failed_candidates.append({"candidate_id": candidate_id, "reason": "Candidate not found"})
                    continue

                # Verify candidate belongs to user's organization
                job = db.fetch_one("jobs", {"id": candidate["job_id"]})
                if not job or job["organization_id"] != user_context.organization_id:
                    failed_candidates.append({"candidate_id": candidate_id, "reason": "Access denied"})
                    continue

                # Check if phone number exists
                phone_number = candidate.get("phone")
                if not phone_number:
                    failed_candidates.append({"candidate_id": candidate_id, "reason": "No phone number"})
                    continue

                # Validate and format phone number
                try:
                    formatted_phone = validate_phone_number(phone_number)
                except ValueError as e:
                    failed_candidates.append({"candidate_id": candidate_id, "reason": f"Invalid phone: {str(e)}"})
                    continue

                # Check if already scheduled
                existing = db.fetch_one(
                    "phone_screen_attempts", {"candidate_id": candidate_id, "job_id": candidate["job_id"]}
                )

                if existing and existing["status"] not in ["failed", "completed"]:
                    failed_candidates.append({"candidate_id": candidate_id, "reason": "Already scheduled"})
                    continue

                # Calculate scheduled time (stagger by 15 minutes if multiple)
                if request.time_slots and i < len(request.time_slots):
                    # Use specific time slot
                    try:
                        scheduled_time = datetime.fromisoformat(request.time_slots[i].replace("Z", "+00:00"))
                    except ValueError:
                        scheduled_time = base_time + timedelta(minutes=i * 15)
                else:
                    # Default staggering - 15 minutes apart
                    scheduled_time = base_time + timedelta(minutes=i * 15)

                # Create phone screen attempt
                phone_screen_data = {
                    "candidate_id": candidate_id,
                    "job_id": candidate["job_id"],
                    "phone_number": formatted_phone,
                    "status": "scheduled",
                    "scheduled_at": scheduled_time.isoformat(),
                    "retry_count": 0,
                    "max_retries": 3,
                }

                result = db.execute_query("phone_screen_attempts", phone_screen_data)
                scheduled_screens.append(
                    {
                        "phone_screen_id": result["id"],
                        "candidate_id": candidate_id,
                        "candidate_name": candidate.get("name", "Unknown"),
                        "phone_number": formatted_phone,
                        "scheduled_at": scheduled_time.isoformat(),
                    }
                )

                logger.info(f"Scheduled bulk phone screen for candidate {candidate_id} at {scheduled_time}")

            except Exception as e:
                logger.error(f"Error scheduling phone screen for candidate {candidate_id}: {e}")
                failed_candidates.append({"candidate_id": candidate_id, "reason": str(e)})
                continue

        return {
            "success": True,
            "scheduled_count": len(scheduled_screens),
            "failed_count": len(failed_candidates),
            "scheduled_screens": scheduled_screens,
            "failed_candidates": failed_candidates,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in bulk phone screen scheduling: {e}")
        raise HTTPException(status_code=500, detail="Failed to schedule phone screens")


@router.post("/candidates/select")
async def select_candidates_for_phone_screen(request: CandidateSelectionRequest, http_request: Request):
    """High-level API for recruiters to select candidates for phone screening"""
    try:
        organization_id = http_request.headers.get("X-Organization-ID")

        # Verify job belongs to user's organization
        job = db.fetch_one("jobs", {"id": request.job_id})
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

        if job["organization_id"] != organization_id:
            raise HTTPException(status_code=403, detail="Access denied")

        # Build query filters
        base_filters = {"job_id": request.job_id}

        # Apply additional filters if provided
        if request.filters:
            # Phone number filter
            if request.filters.get("has_phone"):
                # This would need custom SQL query since we're checking for non-null phone
                pass

            # Status filter
            if request.filters.get("status"):
                base_filters["status"] = request.filters["status"]

            # Date range filter
            if request.filters.get("created_after"):
                # Would need custom SQL for date filtering
                pass

        # Get candidates with additional filtering for phone screening eligibility
        candidates = db.fetch_all("candidates", base_filters)

        # Filter candidates suitable for phone screening
        eligible_candidates = []
        already_scheduled = []

        for candidate in candidates:
            # Check if has phone number
            if not candidate.get("phone"):
                continue

            # Check if already scheduled for phone screen
            existing_attempt = db.fetch_one(
                "phone_screen_attempts", {"candidate_id": candidate["id"], "job_id": request.job_id}
            )

            if existing_attempt and existing_attempt["status"] not in ["failed", "completed"]:
                already_scheduled.append(
                    {
                        "id": candidate["id"],
                        "name": candidate.get("name", "Unknown"),
                        "email": candidate.get("email", ""),
                        "phone": candidate.get("phone", ""),
                        "status": candidate.get("status", ""),
                        "phone_screen_status": existing_attempt["status"],
                        "scheduled_at": existing_attempt.get("scheduled_at"),
                    }
                )
                continue

            # Validate phone number format
            try:
                formatted_phone = validate_phone_number(candidate.get("phone", ""))
                eligible_candidates.append(
                    {
                        "id": candidate["id"],
                        "name": candidate.get("name", "Unknown"),
                        "email": candidate.get("email", ""),
                        "phone": formatted_phone,
                        "original_phone": candidate.get("phone", ""),
                        "status": candidate.get("status", ""),
                        "created_at": candidate.get("created_at", ""),
                        "resume_url": candidate.get("resume_url"),
                    }
                )
            except ValueError:
                # Invalid phone number, skip
                continue

        # Sort candidates
        if request.sort_by == "name":
            eligible_candidates.sort(key=lambda x: x["name"], reverse=(request.sort_order == "desc"))
        elif request.sort_by == "created_at":
            eligible_candidates.sort(key=lambda x: x.get("created_at", ""), reverse=(request.sort_order == "desc"))

        # Apply limit
        if request.limit:
            eligible_candidates = eligible_candidates[: request.limit]

        return {
            "job_id": request.job_id,
            "job_title": job.get("title", "Unknown"),
            "total_candidates": len(candidates),
            "eligible_count": len(eligible_candidates),
            "already_scheduled_count": len(already_scheduled),
            "eligible_candidates": eligible_candidates,
            "already_scheduled": already_scheduled,
            "filters_applied": request.filters or {},
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error selecting candidates for phone screen: {e}")
        raise HTTPException(status_code=500, detail="Failed to select candidates")
