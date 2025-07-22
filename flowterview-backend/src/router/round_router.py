from datetime import datetime
from typing import Any, Dict, List
import urllib.parse

from fastapi import APIRouter, HTTPException
from loguru import logger
from pydantic import BaseModel

from storage.db_manager import DatabaseError, DatabaseManager

router = APIRouter(prefix="/api/v1/rounds", tags=["rounds"])

db = DatabaseManager()


class VerifyRoundTokenRequest(BaseModel):
    token: str


class JoinRoundRequest(BaseModel):
    token: str
    email: str


@router.post("/verify-token")
async def verify_round_token(request: VerifyRoundTokenRequest) -> Dict[str, Any]:
    """
    Verify a round token and return participant information
    """
    token = request.token
    if not token:
        return {"success": False, "message": "Token is required"}

    try:
        # Try both URL-decoded and original token
        decoded_token = urllib.parse.unquote_plus(token)
        possible_tokens = [decoded_token, token]

        token_entries = None
        for t in possible_tokens:
            token_entries = db.fetch_all("round_verification", {"token": t})
            if token_entries:
                logger.info(f"Round token found with {len(token_entries)} participants")
                break

        if not token_entries:
            logger.error(f"Invalid round token provided: {token}")
            return {"success": False, "message": "Invalid round token"}

        # Organize participants by role
        participants = {"candidates": [], "recruiters": []}
        
        for entry in token_entries:
            participant_info = {
                "email": entry["email"],
                "role": entry["role"],
                "has_joined": entry["has_joined"],
                "joined_at": entry.get("joined_at")
            }
            
            if entry["role"] == "candidate":
                participants["candidates"].append(participant_info)
            elif entry["role"] == "recruiter":
                participants["recruiters"].append(participant_info)

        # Count joined participants
        total_participants = len(token_entries)
        joined_participants = len([p for p in token_entries if p["has_joined"]])

        interview = db.fetch_one("interviews", {"id": token_entries[0]["interview_id"]})

        return {
            "success": True,
            "message": "Round token verified",
            "token": token,
            "participants": participants,
            "candidate_id": token_entries[0]["candidate_id"],
            "job_id": interview["job_id"],
            "round": token_entries[0]["round"],
            "stats": {
                "total_participants": total_participants,
                "joined_participants": joined_participants,
                "waiting_for": total_participants - joined_participants
            }
        }

    except Exception as e:
        logger.error(f"Error verifying round token: {str(e)}")
        return {"success": False, "message": "Failed to verify token"}


@router.post("/join")
async def join_round(request: JoinRoundRequest) -> Dict[str, Any]:
    """
    Mark a participant as joined and check if all participants have joined
    """
    token = request.token
    email = request.email
    
    if not token or not email:
        return {"success": False, "message": "Token and email are required"}

    try:
        # Try both URL-decoded and original token
        decoded_token = urllib.parse.unquote_plus(token)
        possible_tokens = [decoded_token, token]

        token_entry = None
        for t in possible_tokens:
            token_entry = db.fetch_one("round_verification", {"token": t, "email": email})
            if token_entry:
                logger.info(f"Round token entry found for {email}")
                break

        if not token_entry:
            return {"success": False, "message": "Invalid token or email"}

        # Check if already joined
        if token_entry["has_joined"]:
            return {"success": True, "message": "Already joined", "already_joined": True}

        # Mark as joined
        db.update(
            "round_verification",
            {
                "has_joined": True,
                "joined_at": datetime.utcnow().isoformat()
            },
            {"token": token_entry["token"], "email": email}
        )

        if token_entry["role"] == "candidate":
            db.execute_query("candidate_interview_round", {
                "interview_id": token_entry["interview_id"],
                "candidate_id": token_entry["candidate_id"],
                "round": token_entry["round"],
                "status": "Started",
            })

        # Check if all participants have joined
        all_entries = db.fetch_all("round_verification", {"token": token_entry["token"]})
        all_joined = all([entry["has_joined"] for entry in all_entries])

        if all_joined:
            # Delete all entries when everyone has joined
            db.delete("round_verification", {"token": token_entry["token"]})
            logger.info(f"All participants joined, deleted token entries for token: {token_entry['token'][:10]}...")
            
            return {
                "success": True,
                "message": "Round ready to start",
                "all_joined": True,
                "total_participants": len(all_entries)
            }
        else:
            waiting_count = len([entry for entry in all_entries if not entry["has_joined"]])
            return {
                "success": True,
                "message": "Waiting for other participants",
                "all_joined": False,
                "waiting_for": waiting_count
            }

    except Exception as e:
        logger.error(f"Error joining round: {str(e)}")
        return {"success": False, "message": "Failed to join round"}


@router.get("/status/{token}")
async def get_round_status(token: str) -> Dict[str, Any]:
    """
    Get the current status of a round (for polling)
    """
    try:
        # Try both URL-decoded and original token
        decoded_token = urllib.parse.unquote_plus(token)
        possible_tokens = [decoded_token, token]

        token_entries = None
        for t in possible_tokens:
            token_entries = db.fetch_all("round_verification", {"token": t})
            if token_entries:
                break

        if not token_entries:
            # If no entries found, assume round has already started (all participants joined and entries deleted)
            return {
                "success": True,
                "round_started": True,
                "message": "Round has started"
            }

        # Count joined participants
        total_participants = len(token_entries)
        joined_participants = len([p for p in token_entries if p["has_joined"]])
        all_joined = joined_participants == total_participants

        return {
            "success": True,
            "round_started": all_joined,
            "stats": {
                "total_participants": total_participants,
                "joined_participants": joined_participants,
                "waiting_for": total_participants - joined_participants
            }
        }

    except Exception as e:
        logger.error(f"Error getting round status: {str(e)}")
        return {"success": False, "message": "Failed to get round status"}