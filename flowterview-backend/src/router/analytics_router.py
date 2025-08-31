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

class CandidateAnalyticsRequest(BaseModel):
    candidate_ids: List[str]

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
    try:
        analytics = db.fetch_all("interview_analytics", {"interview_id": interview_id})
        return {"analytics": analytics or []}
    except Exception as e:
        logger.error(f"Error fetching interview analytics: {e}")
        return {"analytics": []}

@router.get("/interview/{interview_id}/candidate/{candidate_id}")
async def get_interview_candidate_analytics(interview_id: str, candidate_id: str) -> Dict[str, Any]:
    """
    Get the analytics for a specific interview and candidate.
    """
    try:
        analytics = db.fetch_one("interview_analytics", {"interview_id": interview_id, "candidate_id": candidate_id})
        return {"analytics": analytics}
    except Exception as e:
        logger.error(f"Error fetching candidate analytics: {e}")
        return {"analytics": None}

@router.post("/interview/{interview_id}/candidates")
async def get_interview_candidates_analytics(interview_id: str, request: CandidateAnalyticsRequest) -> List[Dict[str, Any]]:
    """
    Get the analytics for multiple candidates in a specific interview.
    """
    if not request.candidate_ids:
        return []
    
    try:
        # Fetch all analytics for this interview first
        all_analytics = db.fetch_all("interview_analytics", {"interview_id": interview_id})
        
        if not all_analytics:
            return []
        
        # Filter to only include the requested candidates
        filtered_analytics = [
            analytics for analytics in all_analytics 
            if analytics and analytics.get("candidate_id") in request.candidate_ids
        ]
        
        return filtered_analytics
    except Exception as e:
        logger.error(f"Error fetching analytics for candidates: {e}")
        return []

@router.get("/average-score")
async def get_average_score(request: Request) -> Dict[str, Any]:
    """
    Get the average score for all interviews.
    """
    try:
        organization_id = request.headers.get("X-Organization-Id")
        if not organization_id:
            logger.warning("No organization ID provided in headers")
            return {"average_score": 0}
            
        analytics = db.fetch_all("interview_analytics", {"organization_id": organization_id})
        
        if not analytics:
            return {"average_score": 0}
            
        total_score = 0
        count = 0
        for a in analytics:
            if not a:
                continue
                
            try:
                data = a.get("data")
                # Handle both direct JSON and string formats for backward compatibility
                if isinstance(data, str):
                    data = json.loads(data)
                
                if isinstance(data, dict) and "overall_score" in data:
                    score = data.get("overall_score", 0)
                    if isinstance(score, (int, float)) and score > 0:
                        total_score += score
                        count += 1
            except (json.JSONDecodeError, TypeError, AttributeError) as e:
                logger.warning(f"Failed to parse analytics data: {e}")
                continue

        if count == 0:
            return {"average_score": 0}
        
        return {"average_score": round(total_score / count, 2)}
    except Exception as e:
        logger.error(f"Error calculating average score: {e}")
        return {"average_score": 0}

@router.get("/average-score/{interview_id}")
async def get_interview_average_score(interview_id: str) -> Dict[str, Any]:
    """
    Get the average score for a specific interview.
    """
    try:
        analytics = db.fetch_all("interview_analytics", {"interview_id": interview_id})

        if not analytics:
            return {"average_score": 0}

        total_score = 0
        count = 0 
        for a in analytics:
            if not a:
                continue
                
            try:
                data = a.get("data")
                # Handle both direct JSON and string formats for backward compatibility
                if isinstance(data, str):
                    data = json.loads(data)
                
                if isinstance(data, dict) and "overall_score" in data:
                    score = data.get("overall_score", 0)
                    if isinstance(score, (int, float)) and score > 0:
                        total_score += score
                        count += 1
            except (json.JSONDecodeError, TypeError, AttributeError) as e:
                logger.warning(f"Failed to parse analytics data: {e}")
                continue
        
        if count == 0:
            return {"average_score": 0}
        
        return {"average_score": round(total_score / count, 2)}
    except Exception as e:
        logger.error(f"Error calculating interview average score: {e}")
        return {"average_score": 0}

@router.post("/analyze-interview")
async def analyze_interview(request: AnalyzeInterviewRequest) -> Dict[str, Any]:
    """
    Analyze the interview chat history and return structured analytics.
    """
    try:
        if not request.chat_history:
            return {"error": "No chat history provided"}
            
        prompt = _prepare_prompt([msg.dict() for msg in request.chat_history])
        response = generate_text(
            prompt=prompt,
            provider="anthropic",  # or "openai" if preferred
            model="claude-sonnet-4-20250514",
            temperature=0.3,
        )
        
        if not response:
            return {"error": "No response from LLM"}
            
        try:
            # Clean the response in case it has markdown formatting
            cleaned_response = response.strip()
            if cleaned_response.startswith("```json"):
                cleaned_response = cleaned_response[7:]
            if cleaned_response.endswith("```"):
                cleaned_response = cleaned_response[:-3]
            cleaned_response = cleaned_response.strip()
            
            analytics = json.loads(cleaned_response)
            
            # Validate the analytics structure
            required_fields = ["summary", "technical_topics", "strengths", "weaknesses", 
                             "areas_for_improvement", "communication_score", "technical_score", 
                             "overall_assessment", "overall_score"]
            
            for field in required_fields:
                if field not in analytics:
                    logger.warning(f"Missing field in analytics: {field}")
            
            return {"analytics": analytics}
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM response as JSON: {e}")
            return {
                "error": "Failed to parse structured analytics",
                "raw_analysis": response,
            }
    except Exception as e:
        logger.error(f"Error analyzing interview: {str(e)}")
        return {"error": f"Failed to analyze interview: {str(e)}"}
