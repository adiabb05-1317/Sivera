import argparse
import asyncio
import os
import sys

from storage.db_manager import DatabaseManager

from .handler_functions import (
    collect_candidate_info,
    conclude_interview,
    end_interview,
    evaluate_aws_knowledge,
    evaluate_behavioral_response,
    evaluate_kubernetes_knowledge,
    evaluate_problem_solving,
    evaluate_python_skills,
    evaluate_troubleshooting_skills,
    handle_candidate_questions,
    present_aws_scenario,
    present_coding_problem,
    present_incident_scenario,
    present_kubernetes_challenge,
    present_python_challenge,
    present_system_design,
    process_background_info,
    process_devops_experience,
)
from .interview_flow import InterviewFlow

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))


async def main():
    parser = argparse.ArgumentParser(
        description="Sivera · Shaping the future of hiring through AI-driven pre-screening and interviews."
    )
    parser.add_argument("-u", "--url", type=str, help="Room URL", required=True)
    parser.add_argument("-t", "--token", type=str, help="Room token", required=True)
    parser.add_argument("-s", "--session_id", type=str, help="Session ID", required=True)
    parser.add_argument("-j", "--job_id", type=str, help="Job ID", required=False)
    parser.add_argument("-c", "--candidate_id", type=str, help="Candidate ID", required=False)

    args = parser.parse_args()
    db_manager = DatabaseManager()

    bot = InterviewFlow(
        args.url,
        args.token,
        session_id=args.session_id,
        db_manager=db_manager,
        job_id=args.job_id,
        candidate_id=args.candidate_id,
    )
    await bot.create_transport()
    await bot.create_pipeline()
    await bot.start()


if __name__ == "__main__":
    asyncio.run(main())
