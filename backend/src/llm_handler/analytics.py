import json
from typing import Any, Dict, List

# from src.llm_handler.generic_llm import GenericLLM
from src.utils.logger import logger


class InterviewAnalytics:
    def __init__(self):
        # self.llm = GenericLLM(
        #     model_name="gemini-2.0-flash", api_key=Config.GEMINI_API_KEY
        # )
        pass

    def _prepare_prompt(self, chat_history: List[Dict[str, str]]) -> str:
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
            "areas_for_improvement": ["area1", "area2", ...],
            "communication_score": X (1-10 scale),
            "technical_score": X (1-10 scale),
            "overall_assessment": "Brief overall assessment"
        }

        Here is the interview conversation:

        """

        for message in chat_history:
            role = "Interviewer" if message["role"] == "assistant" else "Candidate"
            context += f"{role}: {message['content']}\n\n"

        return context

    async def analyze_interview(self, chat_history: List[Dict[str, str]]) -> Dict[str, Any]:
        """
        Analyze the interview chat history and return structured analytics.

        Args:
            chat_history: List of message dictionaries with "role" and "content"

        Returns:
            Dictionary containing structured interview analysis
        """
        try:
            prompt = self._prepare_prompt(chat_history)
            response = self.llm.handle_llm_request(prompt)

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
