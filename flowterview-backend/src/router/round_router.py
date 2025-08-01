from datetime import datetime
from typing import Any, Dict, List
import urllib.parse

from fastapi import APIRouter, HTTPException
from loguru import logger
from pydantic import BaseModel

from src.lib.manager import ConnectionManager
from storage.db_manager import DatabaseError, DatabaseManager

router = APIRouter(prefix="/api/v1/rounds", tags=["rounds"])

db = DatabaseManager()


class VerifyRoundTokenRequest(BaseModel):
    token: str


class JoinRoundRequest(BaseModel):
    token: str
    email: str


class DeleteTokenRequest(BaseModel):
    token: str
    email: str


@router.post("/verify-token")
async def verify_round_token(request: VerifyRoundTokenRequest) -> Dict[str, Any]:
    """
    Verify a round token and return participant information.
    Creates room_url if it doesn't exist for this token.
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

        # Check if room_url exists for this token
        room_url = token_entries[0].get("room_url")
        if not room_url:
            # Create room_url for this token and update all participants
            try:
                manager = ConnectionManager()
                room_url, bot_token = await manager.create_room_and_token()
                
                # Update all entries for this token with the same room_url
                for entry in token_entries:
                    db.update(
                        "round_verification",
                        {"room_url": room_url},
                        {"id": entry["id"]}
                    )
                
                logger.info(f"Created room_url for token {token[:10]}...: {room_url}")
            except Exception as e:
                logger.error(f"Failed to create room for token {token[:10]}...: {str(e)}")
                return {"success": False, "message": "Failed to create interview room"}

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
            "room_url": room_url,
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
    Mark a participant as joined and check if all participants have joined.
    Automatically identifies the participant from the token.
    """
    token = request.token
    email = request.email
    
    if not token or not email:
        return {"success": False, "message": "Token and email are required"}

    try:
        # Try both URL-decoded and original token
        decoded_token = urllib.parse.unquote_plus(token)
        possible_tokens = [decoded_token, token]

        # Get all entries for this token to find the participant
        token_entries = None
        for t in possible_tokens:
            token_entries = db.fetch_one("round_verification", {"token": t, "email": email})
            if token_entries:
                logger.info(f"Found {len(token_entries)} participants for token {t[:10]}...")
                break

        if not token_entries:
            return {"success": False, "message": "Invalid token"}
        # Check if already joined
        if token_entries["has_joined"]:
            return {"success": True, "message": "Already joined", "already_joined": True}

        # Mark as joined
        db.update(
            "round_verification",
            {
                "has_joined": True,
                "joined_at": datetime.utcnow().isoformat()
            },
            {"token": token_entries["token"], "email": email}
        )

        if token_entries["role"] == "candidate":
            db.execute_query("candidate_interview_round", {
                "interview_id": token_entries["interview_id"],
                "candidate_id": token_entries["candidate_id"],
                "round": token_entries["round"],
                "status": "Started",
            })

        # Check if all participants have joined
        all_entries = db.fetch_all("round_verification", {"token": token_entries["token"]})
        all_joined = all([entry["has_joined"] for entry in all_entries])

        if all_joined:
            room_url = token_entries.get("room_url")

            logger.info(f"All participants joined, deleted token entries for token: {token_entries['token'][:10]}...")
            
            return {
                "success": True,
                "message": "Round ready to start",
                "all_joined": True,
                "total_participants": len(all_entries),
                "room_url": room_url
            }
        else:
            waiting_count = len([entry for entry in all_entries if not entry["has_joined"]])
            return {
                "success": True,
                "message": "Waiting for other participants",
                "all_joined": False,
                "waiting_for": waiting_count,
                "joined_participant": {
                    "email": token_entries["email"],
                    "role": token_entries["role"]
                }
            }

    except Exception as e:
        logger.error(f"Error joining round: {str(e)}")
        return {"success": False, "message": "Failed to join round"}


@router.post("/delete-token")
async def delete_token(request: DeleteTokenRequest) -> Dict[str, Any]:
    """
    Delete a token entry for a participant
    """
    token = request.token
    email = request.email

    if not token or not email:
        return {"success": False, "message": "Token and email are required"}
    
    try:
        db.delete("round_verification", {"token": token, "email": email})
        return {"success": True, "message": "Token deleted"}
    except Exception as e:
        logger.error(f"Error deleting token: {str(e)}")
        return {"success": False, "message": "Failed to delete token"}

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