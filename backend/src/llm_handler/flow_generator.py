import json
from typing import Any, Dict, List

from src.constants.prompts import (
    INTERVIEW_FLOW_GENERATION_PROMPT_TEMPLATE,
    REACT_FLOW_GENERATION_PROMPT_TEMPLATE,
)
from src.llm_handler.generic_llm import call_llm

REQUIRED_NODES = [
    "introduction",
    "background_discussion",
    "coding_problem_introduction",
    "coding_problem_discussion",
    "system_design_question",
    "behavioral_questions",
    "candidate_questions",
    "interview_conclusion",
    "end",
]

VALID_HANDLERS = {
    "__function__:collect_candidate_info",
    "__function__:process_background_info",
    "__function__:present_coding_problem",
    "__function__:evaluate_problem_solving",
    "__function__:present_system_design",
    "__function__:evaluate_behavioral_response",
    "__function__:handle_candidate_questions",
    "__function__:conclude_interview",
    "__function__:end_interview",
}


def validate_node_structure(node: Dict[str, Any], node_name: str) -> None:
    """Validate the structure of a single node."""
    # Validate task_messages
    if "task_messages" not in node:
        raise ValueError(f"Node {node_name} missing task_messages")
    if not isinstance(node["task_messages"], list):
        raise ValueError(f"Node {node_name} task_messages must be a list")
    for msg in node["task_messages"]:
        if not isinstance(msg, dict) or "role" not in msg or "content" not in msg:
            raise ValueError(f"Node {node_name} has invalid task message format")
        if msg["role"] != "system":
            raise ValueError(f"Node {node_name} task message must have role 'system'")

    if "functions" not in node:
        raise ValueError(f"Node {node_name} missing functions")
    if not isinstance(node["functions"], list):
        raise ValueError(f"Node {node_name} functions must be a list")
    for func in node["functions"]:
        if not isinstance(func, dict) or "type" not in func or func["type"] != "function":
            raise ValueError(f"Node {node_name} has invalid function format")
        if "function" not in func:
            raise ValueError(f"Node {node_name} function missing function object")

        function_obj = func["function"]
        required_fields = [
            "name",
            "description",
            "parameters",
            "handler",
            "transition_to",
        ]
        for field in required_fields:
            if field not in function_obj:
                raise ValueError(f"Node {node_name} function missing {field}")

        if function_obj["handler"] not in VALID_HANDLERS:
            raise ValueError(f"Node {node_name} has invalid handler: {function_obj['handler']}")

    # Validate end node specific requirements
    if node_name == "end":
        if "post_actions" not in node:
            raise ValueError("End node missing post_actions")
        if not isinstance(node["post_actions"], list):
            raise ValueError("End node post_actions must be a list")
        if not any(action.get("type") == "end_conversation" for action in node["post_actions"]):
            raise ValueError("End node must have end_conversation post action")


def validate_flow_json(flow_json: Dict[str, Any]) -> None:
    """
    Validate the generated flow JSON structure.
    Raises ValueError if validation fails.
    """
    # Validate top-level structure
    if not isinstance(flow_json, dict):
        raise ValueError("Flow JSON must be a dictionary")

    if "initial_node" not in flow_json:
        raise ValueError("Flow JSON missing initial_node")
    if flow_json["initial_node"] != "introduction":
        raise ValueError("initial_node must be 'introduction'")

    if "nodes" not in flow_json:
        raise ValueError("Flow JSON missing nodes")
    if not isinstance(flow_json["nodes"], dict):
        raise ValueError("nodes must be a dictionary")

    # for node_name in REQUIRED_NODES:
    #     if node_name not in flow_json["nodes"]:
    #         raise ValueError(f"Missing required node: {node_name}")

    # Validate each node's structure
    for node_name, node in flow_json["nodes"].items():
        validate_node_structure(node, node_name)

    # for node_name, node in flow_json["nodes"].items():
    #     if node_name == "end":
    #         continue
    #     transition_to = node["functions"][0]["function"]["transition_to"]
    #     if transition_to not in REQUIRED_NODES:
    #         raise ValueError(
    #             f"Invalid transition_to in node {node_name}: {transition_to}"
    #         )
    #     if REQUIRED_NODES.index(transition_to) <= REQUIRED_NODES.index(node_name):
    #         raise ValueError(f"Invalid transition order in node {node_name}")


async def generate_interview_flow_from_jd(job_role: str, job_description: str, skills: List[str], duration: int) -> Dict[str, Any]:
    """
    Generate an interview flow JSON dict from a job description using Gemini LLM.

    Args:
        job_description (str): The job description to base the interview flow on

    Returns:
        Dict[str, Any]: The generated interview flow JSON

    Raises:
        ValueError: If the generated JSON is invalid or doesn't meet requirements
        Exception: If the LLM call fails
    """

    prompt = INTERVIEW_FLOW_GENERATION_PROMPT_TEMPLATE.replace(
        "{job_role}", job_role
    ).replace("{job_description}", job_description.strip()).replace("{skills}", str(skills)).replace("{duration}", str(duration))

    try:
        llm_response = await call_llm(
            prompt=prompt,
            temperature=0.3,
        )

        llm_response = llm_response.strip()
        if not llm_response:
            raise ValueError("Empty response from LLM")

        try:
            flow_json = json.loads(llm_response)
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON format: {str(e)}\nResponse: {llm_response[:100]}...")

        validate_flow_json(flow_json)
        return flow_json

    except json.JSONDecodeError as e:
        raise ValueError(
            f"Failed to generate valid JSON after 3 attempts. Error: {str(e)}\nLast response: {llm_response[:100]}..."
        )
