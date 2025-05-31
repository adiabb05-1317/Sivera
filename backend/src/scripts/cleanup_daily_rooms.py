#!/usr/bin/env python3
"""
Daily.co Room Cleanup Script

This script connects to the Daily.co API and deletes rooms to avoid hitting the 50-room limit.
It can be run manually or as a scheduled task.

Usage:
    cd backend && uv run -m src.scripts.cleanup_daily_rooms [options]

    Run this command to see all rooms without deleting them:
    `cd backend && uv run -m src.scripts.cleanup_daily_rooms --dry-run`

    To clean everything and keep only the 5 most recent rooms:
    `cd backend && uv run -m src.scripts.cleanup_daily_rooms --force`

    You can run the script before starting the server to ensure you have room capacity:
    `cd backend && uv run -m src.scripts.cleanup_daily_rooms && python main.py`

Options:
    --force          Force cleanup of all rooms regardless of pattern matching
    --dry-run        Show what would be deleted without actually deleting
    --all            Delete all rooms (use with caution)
    --count N        Number of rooms to leave (default: 5)
    --pattern STR    Only delete rooms with names matching pattern (default: flowterview)
"""

import argparse
import asyncio
import os
import sys

import aiohttp
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from src.core.config import Config
from src.utils.daily_helper import delete_rooms_batch, get_rooms, is_room_expired

load_dotenv()

# ANSI color codes for pretty output
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
BLUE = "\033[94m"
ENDC = "\033[0m"
BOLD = "\033[1m"


async def cleanup_rooms(
    api_key: str,
    pattern: str = "flowterview",
    force: bool = False,
    dry_run: bool = False,
    delete_all: bool = False,
    keep_count: int = 5,
) -> None:
    """Clean up Daily.co rooms based on specified criteria."""
    async with aiohttp.ClientSession() as session:
        rooms = await get_rooms(session, api_key)
        if not rooms:
            print(f"{YELLOW}No rooms found.{ENDC}")
            return

        if all("created_at" in room for room in rooms):
            rooms.sort(key=lambda x: x.get("created_at", ""))

        total_rooms = len(rooms)
        print(f"{BLUE}{BOLD}Found {total_rooms} rooms in total{ENDC}")

        rooms_to_delete = []

        if delete_all:
            print(f"{RED}{BOLD}DELETING ALL ROOMS! This will delete all {total_rooms} rooms.{ENDC}")
            rooms_to_delete = rooms
        elif force:
            # Keep only the most recent N rooms
            rooms_to_keep = rooms[-keep_count:] if keep_count < total_rooms else []
            rooms_to_delete = [r for r in rooms if r not in rooms_to_keep]
            print(
                f"{YELLOW}Force mode: Deleting {len(rooms_to_delete)} rooms, keeping {len(rooms_to_keep)} most recent rooms{ENDC}"
            )
        else:
            # Normal mode - delete rooms matching pattern
            rooms_to_delete = [r for r in rooms if pattern.lower() in r.get("name", "").lower()]
            print(
                f"{BLUE}Pattern mode: Found {len(rooms_to_delete)} rooms matching pattern '{pattern}'{ENDC}"
            )

            # Check if any rooms are expired using our helper function
            expired_rooms = []
            for room in rooms:
                if room in rooms_to_delete:
                    continue  # Skip if already marked for deletion

                if await is_room_expired(room):
                    expired_rooms.append(room)

            if expired_rooms:
                print(f"{YELLOW}Found {len(expired_rooms)} expired rooms to delete{ENDC}")
                rooms_to_delete.extend(expired_rooms)

        if not rooms_to_delete:
            print(f"{GREEN}No rooms to delete.{ENDC}")
            return

        print(f"{BOLD}Deleting {len(rooms_to_delete)} out of {total_rooms} rooms{ENDC}")

        if dry_run:
            print(f"{YELLOW}{BOLD}DRY RUN MODE - No rooms will actually be deleted{ENDC}")

        room_names_to_delete = [room.get("name") for room in rooms_to_delete if room.get("name")]

        if len(room_names_to_delete) > 10:
            batch_size = 25
            for i in range(0, len(room_names_to_delete), batch_size):
                batch = room_names_to_delete[i : i + batch_size]
                await delete_rooms_batch(session, api_key, batch, dry_run)
        else:
            await delete_rooms_batch(session, api_key, room_names_to_delete, dry_run)

        print(
            f"{GREEN}{BOLD}Cleanup completed. {len(room_names_to_delete)} rooms {'would be ' if dry_run else ''}deleted.{ENDC}"
        )

        if not dry_run:
            # Verify the cleanup
            remaining_rooms = await get_rooms(session, api_key)
            print(f"{BLUE}Verification: {len(remaining_rooms)} rooms remain after cleanup.{ENDC}")


def parse_args():
    parser = argparse.ArgumentParser(description="Clean up Daily.co rooms")
    parser.add_argument(
        "--force",
        action="store_true",
        help="Force cleanup of all rooms regardless of pattern",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be deleted without actually deleting",
    )
    parser.add_argument("--all", action="store_true", help="Delete all rooms (use with caution)")
    parser.add_argument(
        "--count", type=int, default=5, help="Number of rooms to leave (default: 5)"
    )
    parser.add_argument(
        "--pattern",
        type=str,
        default="flowterview",
        help="Only delete rooms matching pattern",
    )
    return parser.parse_args()


async def main():
    args = parse_args()

    api_key = Config.DAILY_API_KEY
    if not api_key:
        print(f"{RED}ERROR: No Daily API key found in environment or config.{ENDC}")
        return

    print(f"{BOLD}Daily.co Room Cleanup{ENDC}")
    print(f"{'=' * 50}")

    await cleanup_rooms(
        api_key=api_key,
        pattern=args.pattern,
        force=args.force,
        dry_run=args.dry_run,
        delete_all=args.all,
        keep_count=args.count,
    )


if __name__ == "__main__":
    asyncio.run(main())
