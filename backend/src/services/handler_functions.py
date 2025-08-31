import uuid
from typing import Any, Dict, Optional
from datetime import datetime

from pipecat_flows import FlowArgs, FlowManager

from src.services.interview_flow import end_interview_pipeline, send_message_to_client
from src.utils.logger import logger


async def collect_candidate_info(
    args: FlowArgs, flow_manager: FlowManager, result: Optional[Any] = None
) -> Dict[str, Any]:
    """
    Collect and process the candidate's name and background information.

    Args:
        args: Flow arguments object (supports dict-like access for parameters).
        flow_manager: The FlowManager instance for context access.
        result: Optional result from a preceding handler (if any).

    Returns:
        Dict with processed information.
    """
    name = args["name"]
    background = args.get("background", "")

    logger.info(f"Collected candidate info - Name: {name}, Background: {background}")

    return {"name": name, "background": background}


async def process_background_info(
    args: FlowArgs, flow_manager: FlowManager, result: Optional[Any] = None
) -> Dict[str, Any]:
    """
    Process the candidate's technical background information.
    """
    technical_background = args["technical_background"]
    key_skills = args["key_skills"]

    logger.info("Processed candidate technical background")

    return {"technical_background": technical_background, "key_skills": key_skills}


async def present_assessment(
    args: FlowArgs, flow_manager: FlowManager, result: Optional[Any] = None
) -> Dict[str, Any]:
    """
    Present an assessment (coding problem or jupyter notebook) to the candidate.
    """
    id = str(uuid.uuid4())
    assessment_type = args["assessment_type"]  # "code-editor" or "notebook"
    title = args["title"]
    description = args["description"]
    
    # Common payload
    payload = {
        "id": id,
        "title": title,
        "description": description,
        "open_assessment": True,
    }
    
    # Add type-specific fields
    if assessment_type == "code-editor":
        payload.update({
            "languages": args.get("languages", ["python", "javascript", "java"]),
            "starter_code": args.get("starter_code", {}),
        })
    elif assessment_type == "notebook":
        payload.update({
            "language": args.get("language", "python"),
            "initial_cells": args.get("initial_cells", []),
        })

    try:
        message = {
            "type": assessment_type,
            "payload": payload,
        }
        await send_message_to_client(message)

    except Exception as e:
        logger.error(f"Failed to send assessment to client: {e}")

    return {
        "assessment_type": assessment_type,
        "title": title,
        "description": description,
    }


# Backward compatibility function
async def present_coding_problem(
    args: FlowArgs, flow_manager: FlowManager, result: Optional[Any] = None
) -> Dict[str, Any]:
    """
    Present a coding problem to the candidate. (Backward compatibility wrapper)
    """
    # Convert old format to new assessment format
    assessment_args = FlowArgs({
        "assessment_type": "code-editor",
        "title": "Coding Challenge",
        "description": args["problem_description"],
        "languages": args.get("languages", ["python", "javascript", "java"]),
        "starter_code": args.get("starter_code", {}),
    })
    
    return await present_assessment(assessment_args, flow_manager, result)


async def present_jupyter_notebook(
    args: FlowArgs, flow_manager: FlowManager, result: Optional[Any] = None
) -> Dict[str, Any]:
    """
    Present a jupyter notebook assessment to the candidate.
    Note: JupyterLite only supports Python via Pyodide.
    """
    # Convert to new assessment format
    assessment_args = FlowArgs({
        "assessment_type": "notebook",
        "title": args.get("title", "Python Jupyter Assessment"),
        "description": args["description"],
        "language": "python",  # Only Python supported in JupyterLite
        "initial_cells": args.get("initial_cells", []),
    })
        
    return await present_assessment(assessment_args, flow_manager, result)

async def evaluate_problem_solving(
    args: FlowArgs, flow_manager: FlowManager, result: Optional[Any] = None
) -> Dict[str, Any]:
    """
    Evaluate the candidate's problem-solving approach.
    """
    approach = args["approach"]
    solution_quality = args["solution_quality"]

    logger.info("Evaluated candidate's problem-solving approach")

    return {"approach": approach, "solution_quality": solution_quality}


async def present_system_design(
    args: FlowArgs, flow_manager: FlowManager, result: Optional[Any] = None
) -> Dict[str, Any]:
    """
    Present a system design question to the candidate.
    """
    design_question = args["design_question"]
    expected_components = args["expected_components"]

    logger.info("Presented system design question")

    return {
        "design_question": design_question,
        "expected_components": expected_components,
    }


async def evaluate_behavioral_response(
    args: FlowArgs, flow_manager: FlowManager, result: Optional[Any] = None
) -> Dict[str, Any]:
    """
    Evaluate the candidate's behavioral responses.
    """
    response_quality = args["response_quality"]
    communication_skills = args["communication_skills"]

    logger.info("Evaluated candidate's behavioral responses")

    return {
        "response_quality": response_quality,
        "communication_skills": communication_skills,
    }


async def handle_candidate_questions(
    args: FlowArgs, flow_manager: FlowManager, result: Optional[Any] = None
) -> Dict[str, Any]:
    """
    Handle and respond to candidate questions.
    """
    questions = args["questions"]
    response = args["response"]

    logger.info("Handled candidate questions")

    return {"questions": questions, "response": response}


async def conclude_interview(
    args: FlowArgs, flow_manager: FlowManager, result: Optional[Any] = None
) -> Dict[str, Any]:
    """
    Conclude the interview with final remarks and next steps.
    """
    final_remarks = args["final_remarks"]
    next_steps = args["next_steps"]

    logger.info("Concluded interview")

    return {"final_remarks": final_remarks, "next_steps": next_steps}


# DevOps Interview Handler Functions
async def process_devops_experience(
    args: FlowArgs, flow_manager: FlowManager, result: Optional[Any] = None
) -> Dict[str, Any]:
    """
    Process candidate's DevOps and cloud infrastructure experience.
    """
    cloud_experience = args["cloud_experience"]
    infrastructure_as_code = args["infrastructure_as_code"]
    key_skills = args["key_skills"]

    logger.info("Processing DevOps experience information")

    return {
        "cloud_experience": cloud_experience,
        "infrastructure_as_code": infrastructure_as_code,
        "key_skills": key_skills,
    }


async def present_aws_scenario(
    args: FlowArgs, flow_manager: FlowManager, result: Optional[Any] = None
) -> Dict[str, Any]:
    """
    Present an AWS technical scenario to assess candidate's knowledge.
    """
    scenario_description = args["scenario_description"]
    required_services = args["required_services"]

    logger.info("Presenting AWS scenario to candidate")

    return {
        "scenario_description": scenario_description,
        "required_services": required_services,
    }


async def evaluate_aws_knowledge(
    args: FlowArgs, flow_manager: FlowManager, result: Optional[Any] = None
) -> Dict[str, Any]:
    """
    Evaluate candidate's AWS solution and knowledge.
    """
    solution_architecture = args["solution_architecture"]
    best_practices_adherence = args["best_practices_adherence"]
    service_knowledge = args["service_knowledge"]

    logger.info("Evaluating candidate's AWS knowledge")

    return {
        "solution_architecture": solution_architecture,
        "best_practices_adherence": best_practices_adherence,
        "service_knowledge": service_knowledge,
    }


async def present_kubernetes_challenge(
    args: FlowArgs, flow_manager: FlowManager, result: Optional[Any] = None
) -> Dict[str, Any]:
    """
    Present a Kubernetes implementation challenge.
    """
    challenge_description = args["challenge_description"]
    requirements = args["requirements"]

    logger.info("Presenting Kubernetes challenge to candidate")

    return {
        "challenge_description": challenge_description,
        "requirements": requirements,
    }


async def evaluate_kubernetes_knowledge(
    args: FlowArgs, flow_manager: FlowManager, result: Optional[Any] = None
) -> Dict[str, Any]:
    """
    Evaluate candidate's Kubernetes knowledge and implementation approach.
    """
    architecture_quality = args["architecture_quality"]
    operational_considerations = args["operational_considerations"]
    security_measures = args["security_measures"]

    logger.info("Evaluating candidate's Kubernetes knowledge")

    return {
        "architecture_quality": architecture_quality,
        "operational_considerations": operational_considerations,
        "security_measures": security_measures,
    }


async def present_python_challenge(
    args: FlowArgs, flow_manager: FlowManager, result: Optional[Any] = None
) -> Dict[str, Any]:
    """
    Present a Python automation challenge for DevOps.
    """
    challenge_description = args["challenge_description"]
    requirements = args["requirements"]

    logger.info("Presenting Python automation challenge to candidate")

    return {
        "challenge_description": challenge_description,
        "requirements": requirements,
    }


async def evaluate_python_skills(
    args: FlowArgs, flow_manager: FlowManager, result: Optional[Any] = None
) -> Dict[str, Any]:
    """
    Evaluate candidate's Python skills for DevOps automation.
    """
    code_quality = args["code_quality"]
    automation_effectiveness = args["automation_effectiveness"]
    best_practices = args["best_practices"]

    logger.info("Evaluating candidate's Python skills")

    return {
        "code_quality": code_quality,
        "automation_effectiveness": automation_effectiveness,
        "best_practices": best_practices,
    }


async def present_incident_scenario(
    args: FlowArgs, flow_manager: FlowManager, result: Optional[Any] = None
) -> Dict[str, Any]:
    """
    Present an incident response scenario.
    """
    incident_description = args["incident_description"]
    system_context = args["system_context"]

    logger.info("Presenting incident response scenario to candidate")

    return {
        "incident_description": incident_description,
        "system_context": system_context,
    }


async def evaluate_troubleshooting_skills(
    args: FlowArgs, flow_manager: FlowManager, result: Optional[Any] = None
) -> Dict[str, Any]:
    """
    Evaluate candidate's incident response and troubleshooting skills.
    """
    methodology = args["methodology"]
    root_cause_analysis = args["root_cause_analysis"]
    communication = args["communication"]

    logger.info("Evaluating candidate's troubleshooting skills")

    return {
        "methodology": methodology,
        "root_cause_analysis": root_cause_analysis,
        "communication": communication,
    }


async def end_interview(
    args: FlowArgs, flow_manager: FlowManager, result: Optional[Any] = None
) -> Dict[str, Any]:
    """
    End the interview session.
    """
    logger.info("end_interview handler called - initiating interview termination")
    
    # Call the pipeline stop function
    await end_interview_pipeline()
    
    # Return a proper response to indicate completion
    return {
        "status": "completed",
        "message": "Interview session ended successfully",
        "action": "terminate"
    }


async def evaluate_and_proceed(
    args: FlowArgs, flow_manager: FlowManager, result: Optional[Any] = None
) -> Dict[str, Any]:
    """
    Generic handler for skill evaluation and intelligent transitions.
    Works for all skill assessment nodes in the interview flow with time intelligence.
    """
    
    # Extract assessment parameters (all optional - AI provides what's relevant)
    skill_assessed = args.get("skill_assessed", "unknown")
    proficiency_level = args.get("proficiency_level", "intermediate")
    confidence_score = args.get("confidence_score", 5)
    key_insights = args.get("key_insights", "")
    areas_explored = args.get("areas_explored", "")
    ready_for_next = args.get("ready_for_next", True)
    needs_deeper_assessment = args.get("needs_deeper_assessment", False)
    
    # NEW: Time intelligence parameters
    time_remaining_minutes = args.get("time_remaining_minutes", 10)
    should_conclude_early = args.get("should_conclude_early", False)
    pacing_adjustment = args.get("pacing_adjustment", "normal")
    
    # Handle introduction node
    if "candidate_name" in args:
        candidate_name = args.get("candidate_name", "Candidate")
        flow_manager.state["candidate_name"] = candidate_name
        flow_manager.state["interview_start"] = datetime.now().isoformat()
        
        # Move to first skill assessment
        first_skill_node = get_next_skill_node(flow_manager, None)
        if first_skill_node:
            await flow_manager.set_next_node(first_skill_node)
            return {"message": f"Nice to meet you, {candidate_name}! Let's begin with our technical discussion."}
        else:
            await flow_manager.set_next_node("interview_conclusion")
            return {"message": f"Nice to meet you, {candidate_name}! Let's conclude our interview."}
    
    # Store skill assessment
    if "assessments" not in flow_manager.state:
        flow_manager.state["assessments"] = []
    
    if skill_assessed != "unknown":
        assessment = {
            "skill": skill_assessed,
            "proficiency_level": proficiency_level,
            "confidence_score": confidence_score,
            "key_insights": key_insights,
            "areas_explored": areas_explored,
            "timestamp": datetime.now().isoformat(),
            "duration_minutes": calculate_skill_duration(flow_manager, skill_assessed)
        }
        flow_manager.state["assessments"].append(assessment)
        logger.info(f"Recorded assessment for {skill_assessed}: {proficiency_level} level, confidence {confidence_score}")
    
    # Log pacing adjustment for monitoring
    if pacing_adjustment != "normal":
        logger.info(f"Interview pacing adjusted to {pacing_adjustment} for {skill_assessed}")
    
    # TIME INTELLIGENCE: Check if we should conclude early due to time constraints
    if should_conclude_early or time_remaining_minutes <= 5:
        logger.info(f"Triggering early conclusion due to time constraints (remaining: {time_remaining_minutes} min)")
        await flow_manager.set_next_node("interview_conclusion")
        return {"message": "Given our time constraints, let me wrap up our technical discussion."}
    
    # Determine next action based on assessment and time
    if needs_deeper_assessment and not ready_for_next and time_remaining_minutes > 8:
        # Continue with current skill - need more depth (only if sufficient time)
        return {"message": f"Let's explore {skill_assessed} a bit more deeply."}
    
    elif ready_for_next or time_remaining_minutes <= 8:
        # Move to next skill or conclude (time pressure forces transition)
        next_node = get_next_skill_node(flow_manager, skill_assessed)
        if next_node and time_remaining_minutes > 5:
            next_skill = extract_skill_name_from_node(next_node)
            await flow_manager.set_next_node(next_node)
            return {"message": f"Great insights on {skill_assessed}. Let's move to {next_skill}."}
        else:
            # No more skills or insufficient time - conclude interview
            await flow_manager.set_next_node("interview_conclusion")
            return {"message": "Excellent technical discussion! Let me wrap up our interview."}
    
    else:
        # Default: continue current assessment
        return {"message": f"Let's continue our {skill_assessed} discussion."}


def get_next_skill_node(flow_manager: FlowManager, current_skill: str) -> str:
    """
    Determine the next skill node to transition to.
    Returns None if all skills have been assessed.
    """
    # Get all assessed skills
    assessed_skills = set()
    if "assessments" in flow_manager.state:
        assessed_skills = {a["skill"] for a in flow_manager.state["assessments"]}
    
    # Get available skill nodes from flow config
    available_nodes = flow_manager.flow_config.get("nodes", {}).keys()
    skill_nodes = [node for node in available_nodes 
                  if node.endswith("_assessment") and node != "introduction"]
    
    # Find next unassessed skill
    for node_name in skill_nodes:
        skill_name = node_name.replace("_assessment", "").replace("_", " ")
        if skill_name not in assessed_skills:
            return node_name
    
    return None  # All skills assessed


def extract_skill_name_from_node(node_name: str) -> str:
    """Extract readable skill name from node name."""
    return node_name.replace("_assessment", "").replace("_", " ").title()


def calculate_skill_duration(flow_manager: FlowManager, skill_name: str) -> int:
    """Calculate how long was spent on this skill assessment."""
    # For now, return a default value. This can be enhanced with actual timing logic
    return 5
