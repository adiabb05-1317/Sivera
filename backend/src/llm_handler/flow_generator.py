import json
from typing import Dict, Any, List
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
        if (
            not isinstance(func, dict)
            or "type" not in func
            or func["type"] != "function"
        ):
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
            raise ValueError(
                f"Node {node_name} has invalid handler: {function_obj['handler']}"
            )

    # Validate end node specific requirements
    if node_name == "end":
        if "post_actions" not in node:
            raise ValueError("End node missing post_actions")
        if not isinstance(node["post_actions"], list):
            raise ValueError("End node post_actions must be a list")
        if not any(
            action.get("type") == "end_conversation" for action in node["post_actions"]
        ):
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


async def generate_interview_flow_from_jd(job_description: str) -> Dict[str, Any]:
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
        "{job_description}", job_description.strip()
    )

    max_retries = 3
    for attempt in range(max_retries):
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
                raise ValueError(
                    f"Invalid JSON format: {str(e)}\nResponse: {llm_response[:100]}..."
                )

            validate_flow_json(flow_json)
            return flow_json

        except json.JSONDecodeError as e:
            if attempt == max_retries - 1:
                raise ValueError(
                    f"Failed to generate valid JSON after {max_retries} attempts. Error: {str(e)}\nLast response: {llm_response[:100]}..."
                )
        except ValueError as e:
            if attempt == max_retries - 1:
                raise ValueError(
                    f"Generated flow validation failed after {max_retries} attempts. Error: {str(e)}"
                )
        except Exception as e:
            if attempt == max_retries - 1:
                raise Exception(
                    f"Flow generation failed after {max_retries} attempts. Error: {str(e)}"
                )

    raise Exception("Unexpected error in flow generation")


async def generate_react_flow_json(flow_json: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Generate a React Flow compatible JSON for visualizing the interview flow.

    Args:
        job_description (str): The job description to base the interview flow on
        flow_json (Dict[str, Any], optional): The logical interview flow JSON to convert

    Returns:
        Dict[str, Any]: React Flow compatible JSON with nodes and edges

    Raises:
        ValueError: If the generated JSON is invalid
        Exception: If the LLM call fails
    """
    # If flow_json is provided, use it
    if flow_json:
        flow_json_str = json.dumps(flow_json)
        prompt = REACT_FLOW_GENERATION_PROMPT_TEMPLATE.replace(
            "{flow_json}", flow_json_str
        )
    else:
        # Fallback to using job description (old method)
        prompt = REACT_FLOW_GENERATION_PROMPT_TEMPLATE.replace("{flow_json}", "{}")

    max_retries = 3
    for attempt in range(max_retries):
        try:
            llm_response = await call_llm(
                prompt=prompt,
                temperature=0.3,
            )

            # Clean and validate the response
            llm_response = llm_response.strip()
            if not llm_response:
                raise ValueError("Empty response from LLM")

            try:
                react_flow_json = json.loads(llm_response)
            except json.JSONDecodeError as e:
                raise ValueError(
                    f"Invalid React Flow JSON format: {str(e)}\nResponse: {llm_response[:100]}..."
                )

            # Basic validation
            if "nodes" not in react_flow_json or "edges" not in react_flow_json:
                raise ValueError(
                    "React Flow JSON must contain 'nodes' and 'edges' arrays"
                )

            return react_flow_json

        except json.JSONDecodeError as e:
            if attempt == max_retries - 1:
                raise ValueError(
                    f"Failed to generate valid React Flow JSON after {max_retries} attempts. Error: {str(e)}\nLast response: {llm_response[:100]}..."
                )
        except ValueError as e:
            if attempt == max_retries - 1:
                raise ValueError(
                    f"Generated React Flow validation failed after {max_retries} attempts. Error: {str(e)}"
                )
        except Exception as e:
            if attempt == max_retries - 1:
                raise Exception(
                    f"React Flow generation failed after {max_retries} attempts. Error: {str(e)}"
                )

    raise Exception("Unexpected error in React Flow generation")


def convert_flow_to_react_flow(flow_json: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convert standard interview flow JSON to React Flow compatible format.
    This is a fallback method if the LLM generation fails.

    Args:
        flow_json (Dict[str, Any]): Standard interview flow JSON

    Returns:
        Dict[str, Any]: React Flow compatible JSON
    """
    import random

    nodes = []
    edges = []

    # Random beautiful color palettes (professional colors)
    base_colors = [
        {"bg": "#E3F2FD", "border": "#2196F3", "text": "#0D47A1"},  # Blue
        {"bg": "#E8F5E9", "border": "#4CAF50", "text": "#1B5E20"},  # Green
        {"bg": "#FFF3E0", "border": "#FF9800", "text": "#E65100"},  # Orange
        {"bg": "#FFEBEE", "border": "#F44336", "text": "#B71C1C"},  # Red
        {"bg": "#E1F5FE", "border": "#03A9F4", "text": "#01579B"},  # Light Blue
        {"bg": "#F3E5F5", "border": "#9C27B0", "text": "#4A148C"},  # Purple
        {"bg": "#E0F7FA", "border": "#00BCD4", "text": "#006064"},  # Cyan
        {"bg": "#F1F8E9", "border": "#8BC34A", "text": "#33691E"},  # Light Green
        {"bg": "#FAFAFA", "border": "#9E9E9E", "text": "#212121"},  # Gray
        {"bg": "#F3E5F5", "border": "#673AB7", "text": "#311B92"},  # Deep Purple
        {"bg": "#E8EAF6", "border": "#3F51B5", "text": "#1A237E"},  # Indigo
        {"bg": "#FCE4EC", "border": "#E91E63", "text": "#880E4F"},  # Pink
        {"bg": "#EFEBE9", "border": "#795548", "text": "#3E2723"},  # Brown
        {"bg": "#FAFAFA", "border": "#607D8B", "text": "#263238"},  # Blue Gray
    ]

    # Shuffle the colors to randomize them
    random.shuffle(base_colors)

    # Default node style (with slight variations)
    def get_node_style():
        return {
            "border": "1px solid",
            "borderRadius": random.choice([8, 10, 12]),
            "boxShadow": random.choice(
                [
                    "0 2px 4px rgba(0,0,0,0.1)",
                    "0 4px 8px rgba(0,0,0,0.1)",
                    "0 2px 6px rgba(0,0,0,0.15)",
                    "0 3px 5px rgba(0,0,0,0.12)",
                ]
            ),
        }

    # Create nodes with improved layout
    node_count = len(flow_json["nodes"])
    nodes_list = list(flow_json["nodes"].items())

    # Determine layout approach based on node count
    if node_count <= 5:
        # Vertical straight line for few nodes
        for i, (node_id, node_data) in enumerate(nodes_list):
            colors = base_colors[i % len(base_colors)]

            # Create a better label from the node ID
            label = " ".join(word.capitalize() for word in node_id.split("_"))

            # Get the task message
            task_message = (
                node_data["task_messages"][0]["content"]
                if node_data.get("task_messages")
                else ""
            )

            # Get the handler
            handler = ""
            if node_data.get("functions") and len(node_data["functions"]) > 0:
                handler = node_data["functions"][0]["function"].get("handler", "")

            # Width with small variation
            width = random.randint(300, 350)

            nodes.append(
                {
                    "id": node_id,
                    "type": "interview",
                    "position": {"x": 400, "y": i * 230},
                    "data": {
                        "label": label,
                        "type": node_id,
                        "handler": handler,
                        "taskMessage": task_message,
                        "style": {
                            "backgroundColor": colors["bg"],
                            "borderColor": colors["border"],
                            "color": colors["text"],
                            "width": width,
                        },
                    },
                    "style": get_node_style(),
                }
            )
    else:
        # Zigzag or curved layout for more nodes
        y_position = 0
        x_offset = 0
        for i, (node_id, node_data) in enumerate(nodes_list):
            colors = base_colors[i % len(base_colors)]

            # Create a better label from the node ID
            label = " ".join(word.capitalize() for word in node_id.split("_"))

            # Get the task message
            task_message = (
                node_data["task_messages"][0]["content"]
                if node_data.get("task_messages")
                else ""
            )

            # Get the handler
            handler = ""
            if node_data.get("functions") and len(node_data["functions"]) > 0:
                handler = node_data["functions"][0]["function"].get("handler", "")

            # Width with small variation
            width = random.randint(300, 350)

            # Create node with zigzag layout (alternating left and right)
            x_position = 400 + (x_offset * 200)
            nodes.append(
                {
                    "id": node_id,
                    "type": "interview",
                    "position": {"x": x_position, "y": y_position},
                    "data": {
                        "label": label,
                        "type": node_id,
                        "handler": handler,
                        "taskMessage": task_message,
                        "style": {
                            "backgroundColor": colors["bg"],
                            "borderColor": colors["border"],
                            "color": colors["text"],
                            "width": width,
                        },
                    },
                    "style": get_node_style(),
                }
            )

            # Update positions for next node
            y_position += 230
            # Create a zigzag pattern with smaller zigzags at the start & end
            if i < 2 or i > len(nodes_list) - 3:
                x_offset = -x_offset if x_offset == 0 else -x_offset // 2
            else:
                x_offset = -x_offset if x_offset == 0 else -x_offset

    # Create edges based on the transition_to field
    edge_types = ["default"]
    for node_id, node_data in flow_json["nodes"].items():
        if node_id != "end" and node_data.get("functions"):
            transition_to = node_data["functions"][0]["function"].get(
                "transition_to", ""
            )
            if transition_to:
                # Get color from source node for consistency
                node_index = next(
                    (i for i, node in enumerate(nodes) if node["id"] == node_id), 0
                )
                color = nodes[node_index]["data"]["style"]["borderColor"]

                # Create edge with improved styling
                edges.append(
                    {
                        "id": f"{node_id}-{transition_to}",
                        "source": node_id,
                        "target": transition_to,
                        "type": "default",
                        "animated": True,
                        "style": {
                            "stroke": color,
                            "strokeWidth": random.choice([1, 1.5, 2]),
                        },
                        "markerEnd": {"type": "arrowclosed", "color": color},
                        "label": "",  # Usually empty, but could add labels
                        "labelStyle": {"fill": color, "fontWeight": 500},
                    }
                )

    return {"nodes": nodes, "edges": edges}
