from fastapi import APIRouter, Request
from pydantic import BaseModel, Field
from typing import Any, Dict, List
import json
from loguru import logger

from src.utils.llm_factory import generate_text
from storage.db_manager import DatabaseManager

router = APIRouter(prefix="/api/v1/analytics", tags=["Analytics"])

db = DatabaseManager()

class ChatMessage(BaseModel):
    role: str = Field(..., description="Role of the message sender (assistant or user)")
    content: str = Field(..., description="Message content")

class AnalyzeInterviewRequest(BaseModel):
    chat_history: List[ChatMessage]

@router.get("/")
async def get_analytics(request: Request):
    return {"message": "Hello, World!"}


def _prepare_prompt(chat_history: List[Dict[str, str]]) -> str:
    """Prepare the prompt for the LLM to analyze the interview."""
    context = """
    You are an expert interview analyzer. Review the following interview conversation and provide detailed analytics.

    Analyze the following aspects:
    1. Overall summary of the interview (2-3 sentences)
    2. Key technical topics discussed
    3. Candidate's strengths demonstrated in the conversation
    4. Areas of improvement for the candidate
    5. Communication style assessment
    6. Technical proficiency assessment

    Format your response as a JSON with the following structure:
    {
        "summary": "Brief summary here",
        "technical_topics": ["topic1", "topic2", ...],
        "strengths": ["strength1", "strength2", ...],
        "weaknesses": ["weakness1", "weakness2", ...],
        "areas_for_improvement": ["area1", "area2", ...],
        "communication_score": X (1-10 scale),
        "technical_score": X (1-10 scale),
        "overall_assessment": "Brief overall assessment",
        "overall_score": X (1-10 scale)
    }

    Here is the interview conversation:

    """
    for message in chat_history:
        role = "Interviewer" if message["role"] == "assistant" else "Candidate"
        context += f"{role}: {message['content']}\n\n"
    return context

@router.get("/interview/{interview_id}")
async def get_interview_analytics(interview_id: str) -> Dict[str, Any]:
    """
    Get the analytics for a specific interview.
    """
    analytics = db.fetch_all("interview_analytics", {"interview_id": interview_id})
    return {"analytics": analytics}

@router.get("/interview/{interview_id}/candidate/{candidate_id}")
async def get_interview_candidate_analytics(interview_id: str, candidate_id: str) -> Dict[str, Any]:
    """
    Get the analytics for a specific interview and candidate.
    """
    analytics = db.fetch_one("interview_analytics", {"interview_id": interview_id, "candidate_id": candidate_id})
    return {"analytics": analytics}

@router.get("/average-score")
async def get_average_score(request: Request) -> Dict[str, Any]:
    """
    Get the average score for all interviews.
    """
    organization_id = request.headers.get("X-Organization-Id")
    analytics = db.fetch_all("interview_analytics", {"organization_id": organization_id})
    total_score = 0
    count = 0
    for a in analytics:
        total_score += a.get("data").get("overall_score")
        count += 1
    return {"average_score": total_score / count}

@router.get("/average-score/{interview_id}")
async def get_interview_average_score(interview_id: str) -> Dict[str, Any]:
    """
    Get the average score for a specific interview.
    """
    analytics = db.fetch_all("interview_analytics", {"interview_id": interview_id})

    total_score = 0
    count = 0 
    for a in analytics:
        total_score += a.get("data").get("overall_score")
        count += 1
    return {"average_score": total_score / count}

@router.post("/analyze-interview")
async def analyze_interview(request: AnalyzeInterviewRequest) -> Dict[str, Any]:
    """
    Analyze the interview chat history and return structured analytics.
    """
    try:
        prompt = _prepare_prompt([msg.dict() for msg in request.chat_history])
        response = generate_text(
            prompt=prompt,
            provider="anthropic",  # or "openai" if preferred
            model="claude-sonnet-4-20250514",
            temperature=0.3,
        )
        try:
            analytics = json.loads(response)
            return {"analytics": analytics}
        except json.JSONDecodeError:
            logger.error("Failed to parse LLM response as JSON")
            return {
                "error": "Failed to parse structured analytics",
                "raw_analysis": response,
            }
    except Exception as e:
        logger.error(f"Error analyzing interview: {str(e)}")
        return {"error": f"Failed to analyze interview: {str(e)}"}
