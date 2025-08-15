import json
from typing import Any, Dict, List

from src.constants.prompts import INTERVIEW_FLOW_GENERATION_PROMPT_TEMPLATE

from src.llm_handler.generic_llm import call_llm

REQUIRED_NODES = [
    "introduction",
    "interview_conclusion",
]

VALID_HANDLERS = {
    "__function__:evaluate_and_proceed",
}


def validate_node_structure(node: Dict[str, Any], node_name: str) -> None:
    """Validate the structure of a single node."""
    # All nodes must have role_messages and task_messages
    if "role_messages" not in node:
        raise ValueError(f"Node {node_name} missing role_messages")
    if "task_messages" not in node:
        raise ValueError(f"Node {node_name} missing task_messages")
    
    if not isinstance(node["task_messages"], list):
        raise ValueError(f"Node {node_name} task_messages must be a list")
    for msg in node["task_messages"]:
        if not isinstance(msg, dict) or "role" not in msg or "content" not in msg:
            raise ValueError(f"Node {node_name} has invalid task message format")
        if msg["role"] != "system":
            raise ValueError(f"Node {node_name} task message must have role 'system'")

    # Validate conclusion node specific requirements
    if node_name == "interview_conclusion":
        if "post_actions" not in node:
            raise ValueError("Conclusion node missing post_actions")
        if not isinstance(node["post_actions"], list):
            raise ValueError("Conclusion node post_actions must be a list")
        if not any(action.get("type") == "end_conversation" for action in node["post_actions"]):
            raise ValueError("Conclusion node must have end_conversation post action")
        return  # Conclusion node doesn't need functions
    
    # All other nodes must have functions
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
        ]
        for field in required_fields:
            if field not in function_obj:
                raise ValueError(f"Node {node_name} function missing {field}")

        if function_obj["handler"] not in VALID_HANDLERS:
            raise ValueError(f"Node {node_name} has invalid handler: {function_obj['handler']}")



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

    skills_list = ", ".join(skills)
    skills_count = len(skills)
    
    # Calculate time allocation
    introduction_time = 3  # minutes
    conclusion_time = 3    # minutes
    available_time = duration - introduction_time - conclusion_time
    time_per_skill = max(2, available_time // skills_count) if skills_count > 0 else 5
    
    prompt = INTERVIEW_FLOW_GENERATION_PROMPT_TEMPLATE.format(
        job_role=job_role,
        job_description=job_description.strip(),
        skills_required=skills_list,
        skills_list=skills_list,
        interview_duration=duration,
        skills_count=skills_count,
        time_per_skill=time_per_skill
    )

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

        return flow_json

    except json.JSONDecodeError as e:
        raise ValueError(
            f"Failed to generate valid JSON after 3 attempts. Error: {str(e)}\nLast response: {llm_response[:100]}..."
        )
