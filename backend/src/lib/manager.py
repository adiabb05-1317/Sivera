import asyncio
from datetime import datetime, timedelta
import time

import aiohttp
from dotenv import load_dotenv
from fastapi import HTTPException
from pipecat.transports.services.helpers.daily_rest import (
    DailyRESTHelper,
    DailyRoomParams,
    DailyRoomProperties,
)

from src.core.config import Config
from src.utils.daily_helper import delete_rooms_batch, get_rooms, is_room_expired
from src.utils.logger import logger

load_dotenv(override=True)


class ConnectionManager:
    def __init__(self):
        """Initialize ConnectionManager."""
        self.processes = dict()

    async def cleanup_daily_rooms(self):
        """
        Clean up existing Daily.co rooms to avoid hitting the room limit.
        This should be called on startup and shutdown.
        """
        async with aiohttp.ClientSession() as session:
            logger.info("Cleaning up existing Daily.co rooms")
            room_list = await get_rooms(session, Config.DAILY_API_KEY)

            room_count = len(room_list) if room_list else 0
            logger.info(f"Found {room_count} existing Daily.co rooms")

            if Config.DAILY_CLEANUP_ON_STARTUP:
                expired_rooms = []
                path_ai_rooms = []

                for room in room_list:
                    room_name = room.get("name", "")
                    room_url = room.get("url", "")

                    if await is_room_expired(room):
                        expired_rooms.append(room_name)

                    elif (
                        "path-ai" in room_name.lower() or "path-ai" in room_url.lower()
                    ):
                        path_ai_rooms.append(room_name)

                rooms_to_delete = expired_rooms + path_ai_rooms

                if rooms_to_delete:
                    logger.info(
                        f"Cleaning up {len(rooms_to_delete)} rooms ({len(expired_rooms)} expired, {len(path_ai_rooms)} path-ai)"
                    )

                    # Delete in batches of 25 to avoid API limits
                    batch_size = 25
                    for i in range(0, len(rooms_to_delete), batch_size):
                        batch = rooms_to_delete[i : i + batch_size]
                        await delete_rooms_batch(session, Config.DAILY_API_KEY, batch)

                    logger.info(f"Cleaned up {len(rooms_to_delete)} Daily.co rooms")
                else:
                    logger.info("No Daily.co rooms needed cleanup")
            else:
                logger.info("Skipping cleanup on startup (disabled in config)")

    def terminate_processes(self):
        for process in self.processes.values():
            process.terminate()
            process.wait()

    async def cleanup(self):
        """Clean up resources before shutdown."""
        self.terminate_processes()
        await self.cleanup_daily_rooms()
        logger.info("All room resources cleaned up")

    def add_process(self, pid, proc):
        self.processes[pid] = proc

    async def create_room_and_token(self) -> tuple[str, str]:
        """
        Create a new room for connecting to the bot.
        """
        logger.info("Creating a new room")

        # Retry logic for direct room creation
        max_retries = 3
        retry_delay = 1.0  # seconds

        for attempt in range(max_retries):
            try:
                # Always create a fresh session for direct room creation
                async with aiohttp.ClientSession() as session:
                    helper = DailyRESTHelper(
                        daily_api_key=Config.DAILY_API_KEY,
                        daily_api_url="https://api.daily.co/v1",
                        aiohttp_session=session,
                    )

                    # Create a room with expiration
                    expires_at = datetime.now() + timedelta(
                        minutes=Config.DAILY_ROOM_EXPIRY_MINUTES
                    )

                    # Create a unique name for easier tracking
                    unique_name = f"path-ai-direct-{time.strftime('%Y%m%d%H%M%S')}"

                    room = await helper.create_room(
                        params=DailyRoomParams(
                            name=unique_name,
                            privacy=Config.DAILY_ROOM_SETTINGS["privacy"],
                            properties=DailyRoomProperties(
                                enable_chat=Config.DAILY_ROOM_SETTINGS["properties"][
                                    "enable_chat"
                                ],
                                exp=int(
                                    time.time() + Config.DAILY_ROOM_EXPIRY_MINUTES * 60
                                ),
                                start_video_off=Config.DAILY_ROOM_SETTINGS[
                                    "properties"
                                ]["start_video_off"],
                                start_audio_off=Config.DAILY_ROOM_SETTINGS[
                                    "properties"
                                ]["start_audio_off"],
                            ),
                        )
                    )

                    if not room or not room.url:
                        raise HTTPException(
                            status_code=503, detail="Failed to create room directly"
                        )

                    bot_token = await helper.get_token(room_url=room.url, owner=True)

                    if not bot_token:
                        raise HTTPException(
                            status_code=503, detail="Failed to get bot token"
                        )

                    logger.info(f"Successfully created new room: {room.url}")
                    return room.url, bot_token

            except Exception as e:
                logger.error(
                    f"Error creating room (attempt {attempt + 1}/{max_retries}): {e}"
                )

                if attempt < max_retries - 1:
                    # Check if we need to clean up rooms before retrying
                    if "limit of 50 rooms reached" in str(e):
                        try:
                            logger.warning(
                                "Daily rooms limit reached, cleaning up before retry"
                            )
                            await self.cleanup_daily_rooms()
                        except Exception as cleanup_error:
                            logger.error(
                                f"Error during emergency cleanup: {cleanup_error}"
                            )

                    # Exponential backoff
                    await asyncio.sleep(retry_delay * (2**attempt))
                else:
                    # Last attempt failed
                    if isinstance(e, HTTPException):
                        raise e
                    else:
                        raise HTTPException(
                            status_code=503,
                            detail=f"Failed to create room after {max_retries} attempts: {str(e)}",
                        )

    async def get_active_room(self, token: str) -> str:
        """Since we no longer store rooms in the database, this is simplified.
        In a real application, you'd want to implement some storage mechanism."""
        try:
            # Return None since we don't track tokens anymore
            return None
        except Exception as e:
            logger.error(f"Error retrieving active room: {e}")
            return None
