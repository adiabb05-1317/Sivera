"""
Phone Screen Scheduler Service

This service runs in the background to process scheduled phone screens.
In production, this would be triggered by a cron job or task scheduler.
"""

import asyncio
from datetime import datetime, timezone

from src.router.phone_screen_router import process_scheduled_phone_screens
from storage.db_manager import DatabaseManager
from src.utils.logger import logger


class PhoneScreenScheduler:
    def __init__(self, check_interval_minutes: int = 60):  # Default to 1 hour
        self.check_interval_minutes = check_interval_minutes
        self.db = DatabaseManager()
        self.running = False

    async def start(self):
        """Start the phone screen scheduler"""
        self.running = True
        logger.info(f"Phone screen scheduler started (checking every {self.check_interval_minutes} minutes)")

        while self.running:
            try:
                await self.process_scheduled_calls()
                # Wait for the specified interval
                await asyncio.sleep(self.check_interval_minutes * 60)
            except Exception as e:
                logger.error(f"Error in phone screen scheduler: {e}")
                # Wait a bit before retrying
                await asyncio.sleep(30)

    async def stop(self):
        """Stop the phone screen scheduler"""
        self.running = False
        logger.info("Phone screen scheduler stopped")

    async def process_scheduled_calls(self):
        """Process all scheduled phone screen calls that are due"""
        try:
            # Call the processing function from the router
            await process_scheduled_phone_screens()
        except Exception as e:
            logger.error(f"Error processing scheduled phone screens: {e}")

    async def get_stats(self) -> dict:
        """Get statistics about phone screen scheduling"""
        try:
            # Get counts by status
            stats = {"scheduled": 0, "in_progress": 0, "completed": 0, "failed": 0, "total": 0}

            all_attempts = self.db.fetch_all("phone_screen_attempts", {})

            for attempt in all_attempts:
                status = attempt.get("status", "unknown")
                if status in stats:
                    stats[status] += 1
                stats["total"] += 1

            # Get overdue calls (scheduled but not yet attempted and past due)
            current_time = datetime.now(timezone.utc)
            overdue_attempts = []

            scheduled_attempts = self.db.fetch_all("phone_screen_attempts", {"status": "scheduled"})

            for attempt in scheduled_attempts:
                scheduled_at = datetime.fromisoformat(attempt["scheduled_at"])
                # Ensure timezone awareness - if no timezone info, assume UTC
                if scheduled_at.tzinfo is None:
                    scheduled_at = scheduled_at.replace(tzinfo=timezone.utc)
                if current_time > scheduled_at:
                    overdue_attempts.append(attempt)

            stats["overdue"] = len(overdue_attempts)

            return stats

        except Exception as e:
            logger.error(f"Error getting phone screen stats: {e}")
            return {}


# Global scheduler instance
_scheduler_instance = None


async def start_phone_screen_scheduler(check_interval_minutes: int = 60):  # Default to 1 hour
    """Start the global phone screen scheduler"""
    global _scheduler_instance

    if _scheduler_instance and _scheduler_instance.running:
        logger.warning("Phone screen scheduler is already running")
        return

    _scheduler_instance = PhoneScreenScheduler(check_interval_minutes)
    await _scheduler_instance.start()


async def stop_phone_screen_scheduler():
    """Stop the global phone screen scheduler"""
    global _scheduler_instance

    if _scheduler_instance:
        await _scheduler_instance.stop()
        _scheduler_instance = None


async def get_scheduler_stats() -> dict:
    """Get statistics from the global scheduler"""
    global _scheduler_instance

    if _scheduler_instance:
        return await _scheduler_instance.get_stats()
    else:
        return {"error": "Scheduler not running"}


def is_scheduler_running() -> bool:
    """Check if the scheduler is currently running"""
    global _scheduler_instance
    return _scheduler_instance is not None and _scheduler_instance.running


# CLI interface for testing
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Phone Screen Scheduler")
    parser.add_argument("--interval", type=int, default=60, help="Check interval in minutes (default: 60)")
    parser.add_argument("--once", action="store_true", help="Run once and exit (don't start continuous scheduler)")
    parser.add_argument("--stats", action="store_true", help="Show statistics and exit")

    args = parser.parse_args()

    async def main():
        if args.stats:
            scheduler = PhoneScreenScheduler()
            stats = await scheduler.get_stats()
            print("Phone Screen Statistics:")
            for key, value in stats.items():
                print(f"  {key}: {value}")
            return

        if args.once:
            logger.info("Running phone screen processing once")
            await process_scheduled_phone_screens()
            logger.info("Phone screen processing completed")
        else:
            logger.info(f"Starting phone screen scheduler with {args.interval} minute interval")
            await start_phone_screen_scheduler(args.interval)

    asyncio.run(main())
