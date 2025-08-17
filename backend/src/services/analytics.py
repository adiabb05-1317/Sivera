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
            "summary": string ("Brief summary here"),
            "good_at": string ("What would he be good at? (2-3 sentences)"),
            "good_at_skills": array[string] ("skill1", "skill2", ...),
            "not_good_at": string ("What would he not be good at? (2-3 sentences)"),
            "not_good_at_skills": array[string] ("skill1", "skill2", ...),
            "technical_topics": array[string] ("topic1", "topic2", ...),
            "strengths": array[string] ("strength1", "strength2", ...),
            "weaknesses": array[string] ("weakness1", "weakness2", ...),
            "areas_for_improvement": array[string] ("area1", "area2", ...),
            "communication_score": number (1-10 scale),
            "technical_score": number (1-10 scale),
            "overall_assessment": string ("Brief overall assessment"),
            "overall_score": number (1-10 scale)
        }}

        For each and every single analysis, like "good_at", "not_good_at" & all the other fields,
        make sure you give a perfect explanation in writing, in a very granular level, and in a very detailed way.
        This will be seen by the recruiter for his business, so he needs extreme transparency and clarity on why that decision was made.
        So you also need to give them in JSON format combined with the main JSON.

        {{
            "good_at_explanation": string
            "good_at_skills_explanation": array[string] ("skill1", "skill2", ...),
            "not_good_at_explanation": string ("What would he not be good at? (2-3 sentences)"),
            "not_good_at_skills_explanation": array[string] ("skill1", "skill2", ...),
            "strengths_explanation": array[string] ("strength1", "strength2", ...),
            "weaknesses_explanation": array[string] ("weakness1", "weakness2", ...),
            "areas_for_improvement_explanation": array[string] ("area1", "area2", ...),
            "communication_score_explanation": string ("Communication score explanation"),
            "technical_score_explanation": string ("Technical score explanation"),
            "overall_assessment_explanation": string ("Overall assessment explanation"),
            "overall_score_explanation": string ("Overall score explanation"),
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
            try:
                role = "Interviewer" if message.get("role") == "assistant" else "Candidate"
                # Handle different message structures that might come from flow_manager
                content = ""
                if isinstance(message, dict):
                    content = message.get('content', message.get('text', str(message)))
                else:
                    content = str(message)
                
                # Skip empty messages
                if not content or content.strip() == "":
                    continue
                    
                context += f"{role}: {content}\n\n"
            except Exception as msg_error:
                logger.warning(f"Error processing message: {msg_error}, message: {message}")
                continue

        return context

    async def analyze_interview(self, job_title: str, job_description: str, resume: str, additional_links_info: str, chat_history: List[Dict[str, str]]) -> Dict[str, Any]:
        """
        Analyze the interview chat history and return structured analytics.

        Args:
            job_title: The job title being interviewed for
            job_description: The job description
            resume: The candidate's resume content
            additional_links_info: Additional information from links
            chat_history: List of message dictionaries with "role" and "content"

        Returns:
            Dictionary containing structured interview analysis
        """
        try:
            # Validate inputs
            if not chat_history:
                logger.warning("Empty chat history provided for analytics")
                return {"error": "No chat history available for analysis"}
            
            if not job_title:
                logger.warning("No job title provided for analytics")
                return {"error": "No job title available for analysis"}
            
            # Log input validation
            logger.info(f"Starting analytics with {len(chat_history)} messages")
            logger.info(f"Job title: {job_title}")
            logger.info(f"Chat history sample: {chat_history[0] if chat_history else 'None'}")
            
            # Prepare prompt
            prompt = self._prepare_prompt(job_title, job_description, resume, additional_links_info, chat_history)
            logger.info(f"Prompt prepared, length: {len(prompt)} characters")
            
            # Call LLM
            logger.info("Calling LLM for analytics...")
            response = await generic_llm.call_llm(prompt)
            logger.info(f"LLM response received, length: {len(response)} characters")
            
            # Parse response
            try:
                analytics = json.loads(response)
                logger.info(f"Analytics parsed successfully with {len(analytics)} keys")
                return analytics
            except json.JSONDecodeError as json_error:
                logger.error(f"Failed to parse LLM response as JSON: {json_error}")
                logger.error(f"Raw response: {response[:500]}...")
                return {
                    "error": "Failed to parse structured analytics",
                    "raw_analysis": response,
                    "json_error": str(json_error)
                }

        except Exception as e:
            logger.error(f"Error analyzing interview: {str(e)}")
            logger.error(f"Error type: {type(e).__name__}")
            return {"error": f"Failed to analyze interview: {str(e)}"}
