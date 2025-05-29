import asyncio
import time
from typing import Dict, List, Optional, Tuple

import aiohttp
from pipecat.transports.services.helpers.daily_rest import DailyRESTHelper

from src.core.config import Config
from src.utils.logger import logger


async def ensure_valid_session(
    session: Optional[aiohttp.ClientSession] = None,
    helper: Optional[DailyRESTHelper] = None,
) -> Tuple[aiohttp.ClientSession, DailyRESTHelper]:
    """
    Ensures we have a valid aiohttp session and DailyRESTHelper.
    Creates new ones if needed or if existing ones are closed.

    This is useful for long-running applications where sessions might close.

    Returns:
        Tuple of (session, helper)
    """
    needs_new_session = False

    # Check if session is None or closed
    if session is None or (hasattr(session, "closed") and session.closed):
        needs_new_session = True

    # If session is valid but helper is None
    if not needs_new_session and helper is None:
        needs_new_session = True

    # If helper exists but has a closed session
    if not needs_new_session and helper and hasattr(helper, "aiohttp_session"):
        try:
            if helper.aiohttp_session.closed:
                needs_new_session = True
        except Exception as e:
            needs_new_session = True
            logger.error(f"Error checking if helper session is closed: {e}")

    if needs_new_session:
        # Close existing session if it exists and isn't closed
        if session and hasattr(session, "closed") and not session.closed:
            await session.close()

        session = aiohttp.ClientSession()
        helper = DailyRESTHelper(
            daily_api_key=Config.DAILY_API_KEY,
            daily_api_url="https://api.daily.co/v1",
            aiohttp_session=session,
        )

        logger.info("Created fresh Daily.co session and helper")

    return session, helper


async def get_rooms(session: aiohttp.ClientSession, api_key: str, limit: int = 50) -> List[Dict]:
    """
    Get a list of all rooms directly from Daily.co API using aiohttp.
    """
    try:
        url = f"https://api.daily.co/v1/rooms?limit={limit}"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        }

        timeout = aiohttp.ClientTimeout(
            total=30, connect=10
        )  # 30s total timeout, 10s connect timeout
        async with session.get(url, headers=headers, timeout=timeout) as response:
            if response.status != 200:
                error_text = await response.text()
                logger.error(f"Error listing rooms: HTTP {response.status} - {error_text}")
                return []

            data = await response.json()
            return data.get("data", [])
    except asyncio.TimeoutError as e:
        logger.error(f"Timeout while listing rooms: {e}")
        return []
    except Exception as e:
        logger.error(f"Error listing rooms: {e}")
        return []


async def delete_rooms_batch(
    session: aiohttp.ClientSession,
    api_key: str,
    room_names: List[str],
    dry_run: bool = False,
) -> bool:
    """
    Delete a batch of rooms from Daily.co using the batch API.
    More efficient than deleting rooms one by one.
    """
    if not room_names:
        return True

    if dry_run:
        for room_name in room_names:
            logger.info(f"[DRY RUN] Would delete room: {room_name}")
        return True

    try:
        url = "https://api.daily.co/v1/batch/rooms"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        }
        payload = {"room_names": room_names}

        logger.info(f"Sending batch delete for {len(room_names)} rooms")

        async with session.delete(url, headers=headers, json=payload) as response:
            if response.status != 200:
                error_text = await response.text()
                logger.error(f"Error in batch delete: HTTP {response.status} - {error_text}")
                return False

            await response.json()
            logger.info(f"Successfully deleted batch of {len(room_names)} rooms")
            return True
    except Exception as e:
        logger.error(f"Error in batch delete: {e}")
        return False


async def is_room_expired(room: Dict) -> bool:
    """Check if a room is expired based on its properties."""
    if "config" in room and "exp" in room.get("config", {}):
        exp_timestamp = room["config"]["exp"]
        if exp_timestamp and int(exp_timestamp) < int(time.time()):
            return True

    if "properties" in room and "exp" in room["properties"]:
        exp_timestamp = room["properties"]["exp"]
        if exp_timestamp and int(exp_timestamp) < int(time.time()):
            return True

    return False
