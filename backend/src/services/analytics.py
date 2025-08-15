import json
from typing import Any, Dict, List
from src.llm_handler import generic_llm
from src.utils.logger import logger


class InterviewAnalytics:
    def __init__(self):
        pass

    def _prepare_prompt(self, job_title: str, job_description: str, resume: str, additional_links_info: str, chat_history: List[Dict[str, str]]) -> str:
        """Prepare the prompt for the LLM to analyze the interview."""
        context = f"""
        You are an expert interview analyzer. Review the following interview conversation and provide detailed analytics.

        Analyze the following aspects:
        1. Overall summary of the interview (2-3 sentences)
        2. Key technical topics discussed
        3. Candidate's strengths demonstrated in the conversation
        4. Areas of improvement for the candidate
        5. Communication style assessment
        6. Technical proficiency assessment
        7. What would he be good at? (2-3 sentences)
        8. What would he not be good at? (2-3 sentences)

        Format your response as a JSON with the following structure:
        {{
            "summary": "Brief summary here",
            "good_at": "What would he be good at? (2-3 sentences)",
            "good_at_skills": ["skill1", "skill2", ...],
            "not_good_at": "What would he not be good at? (2-3 sentences)",
            "not_good_at_skills": ["skill1", "skill2", ...],
            "technical_topics": ["topic1", "topic2", ...],
            "strengths": ["strength1", "strength2", ...],
            "weaknesses": ["weakness1", "weakness2", ...],
            "areas_for_improvement": ["area1", "area2", ...],
            "communication_score": X (1-10 scale),
            "technical_score": X (1-10 scale),
            "overall_assessment": "Brief overall assessment",
            "overall_score": X (1-10 scale)
        }}

        Job Information:
        Job Title: {job_title}
        Job Description: {job_description}

        Candidate Information:
        Resume: {resume}
        Additional Links Info: {additional_links_info}

        Interview Conversation:
        """

        for message in chat_history:
            role = "Interviewer" if message.get("role") == "assistant" else "Candidate"
            # Handle different message structures that might come from flow_manager
            content = ""
            if isinstance(message, dict):
                content = message.get('content', message.get('text', str(message)))
            else:
                content = str(message)
            context += f"{role}: {content}\n\n"

        return context

    async def analyze_interview(self, job_title: str, job_description: str, resume: str, additional_links_info: str, chat_history: List[Dict[str, str]]) -> Dict[str, Any]:
        """
        Analyze the interview chat history and return structured analytics.

        Args:
            chat_history: List of message dictionaries with "role" and "content"

        Returns:
            Dictionary containing structured interview analysis
        """
        try:
            prompt = self._prepare_prompt(job_title, job_description, resume, additional_links_info, chat_history)
            response = await generic_llm.call_llm(prompt)

            try:
                analytics = json.loads(response)
                return analytics
            except json.JSONDecodeError:
                logger.error("Failed to parse LLM response as JSON")
                return {
                    "error": "Failed to parse structured analytics",
                    "raw_analysis": response,
                }

        except Exception as e:
            logger.error(f"Error analyzing interview: {str(e)}")
            return {"error": f"Failed to analyze interview: {str(e)}"}
