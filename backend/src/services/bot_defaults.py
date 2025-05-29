import argparse
import asyncio
import os
import sys

from storage.db_manager import DatabaseManager

from .interview_flow import InterviewFlow

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))


async def main():
    parser = argparse.ArgumentParser(description="Path AI - AI Demo Agent from Layerpath")
    parser.add_argument("-u", "--url", type=str, help="Room URL", required=True)
    parser.add_argument("-t", "--token", type=str, help="Room token", required=True)
    parser.add_argument("-s", "--session_id", type=str, help="Session ID", required=True)

    args = parser.parse_args()
    db_manager = DatabaseManager()

    bot = InterviewFlow(
        args.url,
        args.token,
        session_id=args.session_id,
        db_manager=db_manager,
    )
    await bot.create_transport()
    await bot.create_pipeline()
    await bot.start()


if __name__ == "__main__":
    asyncio.run(main())
