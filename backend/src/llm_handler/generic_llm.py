import os
from typing import Optional

from google import genai

# Configure Gemini API
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY environment variable is not set")

# Initialize the client
client = genai.Client(api_key=GEMINI_API_KEY)


async def call_llm(
    prompt: str,
    model: str = "gemini-2.5-pro",
    temperature: float = 0.6,
    max_tokens: Optional[int] = None,
) -> str:
    """
    Make an async call to Google's Gemini LLM using the new client-based API.

    Args:
        prompt (str): The prompt to send to the LLM
        model (str): The model to use (defaults to gemini-2.0-flash)
        temperature (float): Controls randomness (0.0 = deterministic, 1.0 = creative)
        max_tokens (Optional[int]): Maximum number of tokens to generate

    Returns:
        str: The LLM's response

    Raises:
        Exception: If the API call fails
    """
    try:
        # Add JSON formatting instruction to the prompt
        formatted_prompt = f"{prompt}\n\nIMPORTANT: Return ONLY valid JSON without any additional text, markdown formatting, or explanations."

        # Generate response using the new client API
        response = client.models.generate_content(
            model=model,
            contents=formatted_prompt,
            config={"temperature": temperature},
        )

        # Check if we got a valid response
        if not response or not hasattr(response, "text"):
            raise ValueError("No valid response received from the model")

        # Check if response.text is None
        if response.text is None:
            raise ValueError("Response text is None - model may have failed to generate content")

        # Clean the response text to ensure it's valid JSON
        response_text = response.text.strip()

        # Remove any potential markdown code block formatting
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]

        return response_text.strip()

    except Exception as e:
        raise Exception(f"LLM API call failed: {str(e)}")
