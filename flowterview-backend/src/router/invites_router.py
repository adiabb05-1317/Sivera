import asyncio
import uuid
from datetime import datetime
from typing import Dict, List, Any
from concurrent.futures import ThreadPoolExecutor

from fastapi import APIRouter, HTTPException, Request, BackgroundTasks
from pydantic import BaseModel, EmailStr, Field
from loguru import logger

from storage.db_manager import DatabaseManager
from src.router.interview_router import send_interview_email

router = APIRouter(
    prefix="/api/v1/invites",
    tags=["Invites"],
    responses={404: {"description": "Not found"}},
)

db = DatabaseManager()


class BulkInviteRequest(BaseModel):
    interview_id: str = Field(..., description="Interview ID to send invites for")
    candidate_ids: List[str] = Field(..., description="List of candidate IDs to invite")
    emails: List[EmailStr] = Field(..., description="List of candidate emails")
    names: List[str] = Field(..., description="List of candidate names")
    job_title: str = Field(..., description="Job title for the interview")


class BulkInviteResponse(BaseModel):
    success: bool
    message: str
    total_invites: int
    processed_count: int
    failed_count: int = 0
    errors: List[str] = []


async def create_single_room_and_token(
    manager, candidate_id: str, interview_id: str
) -> Dict[str, Any]:
    """Create a single room and token for a candidate"""
    try:
        # First check if candidate_interview already exists
        existing_candidate_interview = db.fetch_one(
            "candidate_interviews",
            {"interview_id": interview_id, "candidate_id": candidate_id},
        )

        if existing_candidate_interview:
            logger.info(
                f"Candidate interview already exists for candidate {candidate_id} in interview {interview_id}"
            )
            return {
                "success": True,
                "candidate_id": candidate_id,
                "room_url": existing_candidate_interview.get("room_url"),
                "bot_token": existing_candidate_interview.get("bot_token"),
                "candidate_interview_id": existing_candidate_interview["id"],
                "already_existed": True,
            }

        # Create new room and token
        room_url, bot_token = await manager.create_room_and_token()

        # Store in candidate_interviews table
        candidate_interview_data = {
            "id": str(uuid.uuid4()),
            "interview_id": interview_id,
            "candidate_id": candidate_id,
            "status": "scheduled",
            "room_url": room_url,
            "bot_token": bot_token,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
        }

        # Insert into database
        result = db.execute_query("candidate_interviews", candidate_interview_data)

        logger.info(f"Created room and token for candidate {candidate_id}: {room_url}")

        return {
            "success": True,
            "candidate_id": candidate_id,
            "room_url": room_url,
            "bot_token": bot_token,
            "candidate_interview_id": candidate_interview_data["id"],
            "already_existed": False,
        }

    except Exception as e:
        logger.error(
            f"Failed to create room and token for candidate {candidate_id}: {e}"
        )
        return {"success": False, "candidate_id": candidate_id, "error": str(e)}


async def send_single_email(
    email: str, name: str, job_title: str, room_url: str
) -> Dict[str, Any]:
    """Send a single email to a candidate"""
    try:
        # Create interview URL with room URL
        interview_url = f"{room_url}?name={name}"

        await send_interview_email(email, name, job_title, interview_url)

        logger.info(f"Email sent successfully to {email}")

        return {"success": True, "email": email, "name": name}

    except Exception as e:
        logger.error(f"Failed to send email to {email}: {e}")
        return {"success": False, "email": email, "name": name, "error": str(e)}


async def process_bulk_invites_background(
    manager,
    interview_id: str,
    candidate_ids: List[str],
    emails: List[EmailStr],
    names: List[str],
    job_title: str,
):
    """Background task to process bulk invites"""
    logger.info(f"Starting bulk invite processing for {len(candidate_ids)} candidates")

    # Phase 1: Create rooms and tokens concurrently
    logger.info("Phase 1: Creating rooms and tokens...")
    room_creation_tasks = [
        create_single_room_and_token(manager, candidate_id, interview_id)
        for candidate_id in candidate_ids
    ]

    # Use asyncio.gather with return_exceptions=True to handle failures gracefully
    room_results = await asyncio.gather(*room_creation_tasks, return_exceptions=True)

    # Process results and prepare for email sending
    successful_rooms = []
    failed_rooms = []

    for i, result in enumerate(room_results):
        if isinstance(result, Exception):
            logger.error(
                f"Room creation failed for candidate {candidate_ids[i]}: {result}"
            )
            failed_rooms.append(
                {
                    "candidate_id": candidate_ids[i],
                    "email": emails[i],
                    "name": names[i],
                    "error": str(result),
                }
            )
        elif result.get("success"):
            successful_rooms.append(
                {
                    "candidate_id": result["candidate_id"],
                    "email": emails[i],
                    "name": names[i],
                    "room_url": result["room_url"],
                    "already_existed": result.get("already_existed", False),
                }
            )
        else:
            failed_rooms.append(
                {
                    "candidate_id": candidate_ids[i],
                    "email": emails[i],
                    "name": names[i],
                    "error": result.get("error", "Unknown error"),
                }
            )

    # Count new vs existing
    new_rooms = [r for r in successful_rooms if not r.get("already_existed")]
    existing_rooms = [r for r in successful_rooms if r.get("already_existed")]

    logger.info(
        f"Phase 1 complete: {len(new_rooms)} new rooms, {len(existing_rooms)} existing rooms, {len(failed_rooms)} failed"
    )

    # Phase 2: Send emails concurrently for successful room creations
    if new_rooms:
        logger.info("Phase 2: Sending emails...")
        email_tasks = [
            send_single_email(
                room_data["email"], room_data["name"], job_title, room_data["room_url"]
            )
            for room_data in new_rooms
        ]

        email_results = await asyncio.gather(*email_tasks, return_exceptions=True)

        # Process email results
        successful_emails = 0
        failed_emails = 0

        for i, result in enumerate(email_results):
            if isinstance(result, Exception):
                logger.error(
                    f"Email sending failed for {new_rooms[i]['email']}: {result}"
                )
                failed_emails += 1
            elif result.get("success"):
                successful_emails += 1
            else:
                logger.error(
                    f"Email sending failed for {new_rooms[i]['email']}: {result.get('error', 'Unknown error')}"
                )
                failed_emails += 1

        logger.info(
            f"Phase 2 complete: {successful_emails} emails sent, {failed_emails} failed"
        )

    total_processed = len(successful_rooms)
    total_failed = len(failed_rooms)

    logger.info(
        f"Bulk invite processing complete: {total_processed} successful, {total_failed} failed"
    )

    # Update interview status or log completion
    try:
        # Update the interview record to include the successfully invited candidates
        if new_rooms:
            # Get current interview data
            current_interview = db.fetch_one("interviews", {"id": interview_id})
            if current_interview:
                current_invited = current_interview.get("candidates_invited", [])
                new_candidate_ids = [room["candidate_id"] for room in new_rooms]

                # Merge with existing invited candidates (avoid duplicates)
                updated_invited = list(set(current_invited + new_candidate_ids))

                # Update the interview record using the new array method
                db.update_array_field(
                    "interviews",
                    "candidates_invited",
                    updated_invited,
                    {"id": interview_id},
                )

                logger.info(
                    f"Updated interview {interview_id} with {len(new_candidate_ids)} new invited candidates"
                )
    except Exception as e:
        logger.error(f"Failed to update interview record: {e}")


@router.post("/bulk-invite", response_model=BulkInviteResponse)
async def bulk_invite_candidates(
    request: BulkInviteRequest, background_tasks: BackgroundTasks, app_request: Request
) -> BulkInviteResponse:
    """
    Send bulk invites to candidates with room URLs and bot tokens created in background.
    This endpoint returns immediately while processing happens in the background.
    """
    try:
        # Validate input lengths match
        if not (
            len(request.candidate_ids) == len(request.emails) == len(request.names)
        ):
            raise HTTPException(
                status_code=400,
                detail="candidate_ids, emails, and names lists must have the same length",
            )

        if len(request.candidate_ids) == 0:
            raise HTTPException(
                status_code=400, detail="At least one candidate must be provided"
            )

        # Validate interview exists
        interview = db.fetch_one("interviews", {"id": request.interview_id})
        if not interview:
            raise HTTPException(status_code=404, detail="Interview not found")

        # Get the manager from app state
        manager = app_request.app.state.manager
        if not manager:
            raise HTTPException(
                status_code=500, detail="Connection manager not initialized"
            )

        total_invites = len(request.candidate_ids)

        logger.info(
            f"Starting bulk invite for {total_invites} candidates for interview {request.interview_id}"
        )

        # Start background processing
        background_tasks.add_task(
            process_bulk_invites_background,
            manager,
            request.interview_id,
            request.candidate_ids,
            request.emails,
            request.names,
            request.job_title,
        )

        return BulkInviteResponse(
            success=True,
            message=f"invites sent for {total_invites} candidates",
            total_invites=total_invites,
            processed_count=0,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in bulk invite endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/bulk-invite-status/{interview_id}")
async def get_bulk_invite_status(interview_id: str, request: Request):
    """Get the status of bulk invites for an interview"""
    try:
        # Get all candidate interviews for this interview
        candidate_interviews = db.fetch_all(
            "candidate_interviews", {"interview_id": interview_id}
        )

        total_candidates = len(candidate_interviews)
        scheduled_count = len(
            [ci for ci in candidate_interviews if ci.get("status") == "scheduled"]
        )

        return {
            "interview_id": interview_id,
            "total_candidates": total_candidates,
            "scheduled_count": scheduled_count,
            "candidate_interviews": candidate_interviews,
        }

    except Exception as e:
        logger.error(f"Error getting bulk invite status: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get status: {str(e)}")
