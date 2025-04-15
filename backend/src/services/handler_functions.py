import json
import os
from typing import Dict, Any

from pipecat_flows import FlowArgs
from src.utils.logger import logger


async def collect_candidate_info(
    args: FlowArgs, name: str, background: str = ""
) -> Dict[str, Any]:
    """
    Collect and process the candidate's name and background information.

    Args:
        args: Flow arguments
        name: Candidate's name
        background: Candidate's background (optional)

    Returns:
        Dict with processed information
    """
    logger.info(f"Collected candidate info - Name: {name}")

    # Add to flow context
    flow_manager = args.get_data("flow_manager")
    flow_manager.add_to_context(
        {"candidate_name": name, "candidate_background": background}
    )

    return {"name": name, "background": background}


async def process_background_info(
    args: FlowArgs, technical_background: str, key_skills: str
) -> Dict[str, Any]:
    """
    Process the candidate's technical background information.

    Args:
        args: Flow arguments
        technical_background: Information about the candidate's technical experience
        key_skills: The candidate's key technical skills

    Returns:
        Dict with processed information
    """
    logger.info(f"Processed candidate technical background")

    # Add to flow context
    flow_manager = args.get_data("flow_manager")
    flow_manager.add_to_context(
        {"technical_background": technical_background, "key_skills": key_skills}
    )

    return {"technical_background": technical_background, "key_skills": key_skills}


async def present_coding_problem(
    args: FlowArgs, problem_description: str, problem_constraints: str
) -> Dict[str, Any]:
    """
    Present a coding problem to the candidate.

    Args:
        args: Flow arguments
        problem_description: Description of the coding problem
        problem_constraints: Constraints for the coding problem

    Returns:
        Dict with problem information
    """
    logger.info(f"Presented coding problem")

    # Add to flow context
    flow_manager = args.get_data("flow_manager")
    flow_manager.add_to_context(
        {
            "problem_description": problem_description,
            "problem_constraints": problem_constraints,
        }
    )

    return {
        "problem_description": problem_description,
        "problem_constraints": problem_constraints,
    }


async def evaluate_problem_solving(
    args: FlowArgs, approach: str, solution_quality: str
) -> Dict[str, Any]:
    """
    Evaluate the candidate's problem-solving approach.

    Args:
        args: Flow arguments
        approach: The candidate's approach to solving the problem
        solution_quality: Assessment of the candidate's solution

    Returns:
        Dict with evaluation information
    """
    logger.info(f"Evaluated candidate's problem-solving approach")

    # Add to flow context
    flow_manager = args.get_data("flow_manager")
    flow_manager.add_to_context(
        {"problem_solving_approach": approach, "solution_quality": solution_quality}
    )

    return {"approach": approach, "solution_quality": solution_quality}


async def present_system_design(
    args: FlowArgs, design_question: str, expected_components: str
) -> Dict[str, Any]:
    """
    Present a system design question to the candidate.

    Args:
        args: Flow arguments
        design_question: The system design question
        expected_components: Expected components in the design

    Returns:
        Dict with system design information
    """
    logger.info(f"Presented system design question")

    # Add to flow context
    flow_manager = args.get_data("flow_manager")
    flow_manager.add_to_context(
        {"design_question": design_question, "expected_components": expected_components}
    )

    return {
        "design_question": design_question,
        "expected_components": expected_components,
    }


async def evaluate_behavioral_response(
    args: FlowArgs, response_quality: str, communication_skills: str
) -> Dict[str, Any]:
    """
    Evaluate the candidate's behavioral responses.

    Args:
        args: Flow arguments
        response_quality: Quality of the candidate's responses
        communication_skills: Assessment of the candidate's communication skills

    Returns:
        Dict with evaluation information
    """
    logger.info(f"Evaluated candidate's behavioral responses")

    # Add to flow context
    flow_manager = args.get_data("flow_manager")
    flow_manager.add_to_context(
        {
            "behavioral_response_quality": response_quality,
            "communication_skills": communication_skills,
        }
    )

    return {
        "response_quality": response_quality,
        "communication_skills": communication_skills,
    }


async def handle_candidate_questions(
    args: FlowArgs, questions: str, response: str
) -> Dict[str, Any]:
    """
    Handle and respond to candidate questions.

    Args:
        args: Flow arguments
        questions: The candidate's questions
        response: Responses to the candidate's questions

    Returns:
        Dict with question and response information
    """
    logger.info(f"Handled candidate questions")

    # Add to flow context
    flow_manager = args.get_data("flow_manager")
    flow_manager.add_to_context(
        {"candidate_questions": questions, "question_responses": response}
    )

    return {"questions": questions, "response": response}


async def conclude_interview(
    args: FlowArgs, final_remarks: str, next_steps: str
) -> Dict[str, Any]:
    """
    Conclude the interview with final remarks and next steps.

    Args:
        args: Flow arguments
        final_remarks: Final remarks to the candidate
        next_steps: Next steps in the interview process

    Returns:
        Dict with conclusion information
    """
    logger.info(f"Concluded interview")

    # Add to flow context
    flow_manager = args.get_data("flow_manager")
    flow_manager.add_to_context(
        {"final_remarks": final_remarks, "next_steps": next_steps}
    )

    return {"final_remarks": final_remarks, "next_steps": next_steps}
