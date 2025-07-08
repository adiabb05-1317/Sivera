from pipecat.services.anthropic.llm import AnthropicLLMService
from pipecat.services.google.llm import GoogleLLMService
from pipecat.services.groq.llm import GroqLLMService
from pipecat.services.openai.llm import OpenAILLMService

from src.core.config import Config


class LLMFactory:
    """
    Factory for creating LLM services based on the configuration or specified provider.

    Args:
        provider (str, optional): The LLM provider to use. If not provided,
                                  it will be read from the configuration.

    Returns:
        An instance of the LLM service.
    """

    @staticmethod
    def create_llm_service(provider=None):
        if provider is None:
            provider = Config.LLM_PROVIDER

        if provider == "openai":
            return OpenAILLMService(
                api_key=Config.OPENAI_API_KEY,
                model=Config.LLM_MODEL,
            )
        elif provider == "google":
            return GoogleLLMService(
                api_key=Config.GEMINI_API_KEY,
                model=Config.LLM_MODEL,
                params=GoogleLLMService.InputParams(
                    extra={"thinking_config": {"thinking_budget": 0}}
                ),
            )
        elif provider == "anthropic":
            return AnthropicLLMService(api_key=Config.ANTHROPIC_API_KEY, model=Config.LLM_MODEL)
        elif provider == "groq":
            return GroqLLMService(api_key=Config.GROQ_API_KEY, model=Config.LLM_MODEL)
        else:
            raise ValueError(f"Unsupported LLM provider: {provider}")
