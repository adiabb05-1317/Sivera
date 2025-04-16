import argparse
import asyncio
import logging
import os
import sys


from ..core.config import Config
from .interview_flow import InterviewFlow
from .handler_functions import (
    collect_candidate_info,
    process_background_info,
    present_coding_problem,
    evaluate_problem_solving,
    present_system_design,
    evaluate_behavioral_response,
    handle_candidate_questions,
    conclude_interview,
    process_devops_experience,
    present_aws_scenario,
    evaluate_aws_knowledge,
    present_kubernetes_challenge,
    evaluate_kubernetes_knowledge,
    present_python_challenge,
    evaluate_python_skills,
    present_incident_scenario,
    evaluate_troubleshooting_skills,
    handle_candidate_questions,
    conclude_interview,
)

sys.path.append(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
)


async def main():
    parser = argparse.ArgumentParser(
        description="Path AI - AI Demo Agent from Layerpath"
    )
    parser.add_argument("-u", "--url", type=str, help="Room URL", required=True)
    parser.add_argument("-t", "--token", type=str, help="Room token", required=True)
    parser.add_argument(
        "-s", "--session_id", type=str, help="Session ID", required=True
    )

    args = parser.parse_args()

    bot = InterviewFlow(
        args.url,
        args.token,
        session_id=args.session_id,
    )
    await bot.create_transport()
    await bot.create_pipeline()
    await bot.start()


if __name__ == "__main__":
    asyncio.run(main())
