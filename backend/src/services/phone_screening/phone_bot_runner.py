import argparse
import asyncio
import json
import os
import sys

# Add the project root to the path
sys.path.append(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
)

from storage.db_manager import DatabaseManager
from .daily.phone_screen import PhoneScreen


async def main():
    parser = argparse.ArgumentParser(
        description="Phone Screening Bot - AI-driven phone interview system"
    )
    parser.add_argument("-u", "--url", type=str, help="Room URL", required=True)
    parser.add_argument("-t", "--token", type=str, help="Room token", required=True)
    parser.add_argument(
        "-s", "--session_id", type=str, help="Session ID", required=True
    )
    parser.add_argument("-i", "--call_id", type=str, help="Call ID", required=True)
    parser.add_argument(
        "-d", "--call_domain", type=str, help="Call Domain", required=True
    )

    parser.add_argument(
        "-c", "--caller_id", type=str, help="Caller ID for dialout", required=False
    )
    parser.add_argument(
        "-n", "--candidate_name", type=str, help="Candidate name", required=True
    )
    parser.add_argument(
        "-j", "--job_position", type=str, help="Job position", required=True
    )
    parser.add_argument(
        "--company_name", type=str, help="Company name", required=True
    )
    parser.add_argument(
        "--phone_screen_questions",
        type=list,
        help="Phone screen questions",
        required=True,
    )
    parser.add_argument(
        "--sip_uri", type=str, help="SIP URI for dialout", required=False
    )
    parser.add_argument(
        "-p",
        "--phone_number",
        type=str,
        help="Phone number for dialout",
        required=True,
    )

    parser.add_argument("--provider", type=str, help="Provider", required=False)

    args = parser.parse_args()
    provider = args.provider
    db_manager = DatabaseManager()

    # Prepare dialout settings if phone number or sip_uri is provided
    dialout_settings = None
    if args.phone_number:
        dialout_settings = {
            "phone_number": args.phone_number,
            "caller_id": args.caller_id,
        }

    # Create phone bot with all parameters
    phone_bot = PhoneScreen(
        url=args.url,
        bot_token=args.token,
        session_id=args.session_id,
        db_manager=db_manager,
        call_id=args.call_id,
        call_domain=args.call_domain,
        candidate_name=args.candidate_name,
        company_name=args.company_name,
        position_title=args.job_position,
        phone_screen_questions=args.phone_screen_questions,
        dialout_settings=dialout_settings,
    )

    await phone_bot.create_transport()
    await phone_bot.create_pipeline()
    await phone_bot.start()


if __name__ == "__main__":
    asyncio.run(main())
