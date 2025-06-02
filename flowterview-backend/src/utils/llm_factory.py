"""
Unified LLM Provider for Anthropic, OpenAI, and Google Gemini
"""

import os
from typing import Optional, Union, Dict, Any
from enum import Enum

import openai
import anthropic
import google.generativeai as genai
from loguru import logger


class LLMProvider(Enum):
    """Supported LLM providers"""
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GOOGLE = "google"


class LLMClient:
    """Unified LLM client supporting multiple providers"""
    
    def __init__(
        self,
        provider: str = "google",
        model: str = "gemini-2.5-pro-preview-03-25",
        temperature: float = 0.3
    ):
        """
        Initialize the LLM client
        
        Args:
            provider: LLM provider ("openai", "anthropic", "google")
            model: Model name (default: "gemini-2.5-pro-preview-03-25")
            temperature: Temperature for generation (default: 0.3)
        """
        self.provider = LLMProvider(provider.lower())
        self.model = model
        self.temperature = temperature
        self._client = None
        
        # Initialize the appropriate client
        self._init_client()
    
    def _init_client(self):
        """Initialize the client based on the provider"""
        try:
            if self.provider == LLMProvider.OPENAI:
                self._client = openai.OpenAI(
                    api_key=os.environ.get("OPENAI_API_KEY")
                )
                logger.info("Initialized OpenAI client")
            elif self.provider == LLMProvider.ANTHROPIC:
                self._client = anthropic.Anthropic(
                    api_key=os.environ.get("ANTHROPIC_API_KEY")
                )
                logger.info("Initialized Anthropic client")
            elif self.provider == LLMProvider.GOOGLE:
                api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
                if not api_key:
                    raise ValueError("GEMINI_API_KEY or GOOGLE_API_KEY environment variable is required")
                genai.configure(api_key=api_key)
                self._client = genai.GenerativeModel(self.model)
                logger.info("Initialized Google Gemini client")
                
        except Exception as e:
            logger.error(f"Failed to initialize {self.provider.value} client: {e}")
            raise
    
    def generate(
        self,
        prompt: str,
        temperature: Optional[float] = None,
        **kwargs
    ) -> str:
        """
        Generate text using the configured LLM provider
        
        Args:
            prompt: Input prompt
            temperature: Override default temperature
            max_tokens: Maximum tokens to generate
            **kwargs: Additional provider-specific parameters
            
        Returns:
            Generated text response
        """
        temp = temperature if temperature is not None else self.temperature
        
        try:
            if self.provider == LLMProvider.OPENAI:
                return self._generate_openai(prompt, temp, **kwargs)
            elif self.provider == LLMProvider.ANTHROPIC:
                return self._generate_anthropic(prompt, temp, **kwargs)
            elif self.provider == LLMProvider.GOOGLE:
                return self._generate_google(prompt, temp, **kwargs)
        except Exception as e:
            logger.error(f"Error generating with {self.provider.value}: {e}")
            raise
    
    def _generate_openai(
        self,
        prompt: str,
        temperature: float,
        **kwargs
    ) -> str:
        """Generate using OpenAI"""
        params = {
            "model": self.model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": temperature,
            **kwargs
        }
        
        response = self._client.chat.completions.create(**params)
        return response.choices[0].message.content
    
    def _generate_anthropic(
        self,
        prompt: str,
        temperature: float,
        **kwargs
    ) -> str:
        """Generate using Anthropic"""
        params = {
            "model": self.model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": temperature,
            **kwargs
        }
        
        message = self._client.messages.create(**params)
        return message.content[0].text
    
    def _generate_google(
        self,
        prompt: str,
        temperature: float,
        **kwargs
    ) -> str:
        """Generate using Google Gemini"""
        generation_config = {
            "temperature": temperature,
            **kwargs
        }
        
        response = self._client.generate_content(
            prompt,
            generation_config=generation_config,
            config=genai.types.GenerateContentConfig(
                thinking_config=genai.types.ThinkingConfig(thinking_budget=1024)
            ),
        )

        print(response)

        return response.text
    
    async def generate_async(
        self,
        prompt: str,
        temperature: Optional[float] = None,
        **kwargs
    ) -> str:
        """
        Async version of generate method
        
        Args:
            prompt: Input prompt
            temperature: Override default temperature
            max_tokens: Maximum tokens to generate
            **kwargs: Additional provider-specific parameters
            
        Returns:
            Generated text response
        """
        # For now, we'll use the sync version
        # In production, you might want to implement proper async clients
        return self.generate(prompt, temperature, **kwargs)


# Convenience function for quick usage
def generate_text(
    prompt: str,
    provider: str = "google",
    model: str = "gemini-2.5-pro-preview-03-25",
    temperature: float = 0.3,
    **kwargs
) -> str:
    """
    Quick function to generate text with default settings
    
    Args:
        prompt: Input prompt
        provider: LLM provider ("openai", "anthropic", "google")
        model: Model name
        temperature: Temperature for generation
        max_tokens: Maximum tokens to generate
        **kwargs: Additional provider-specific parameters
        
    Returns:
        Generated text response
    """
    client = LLMClient(provider=provider, model=model, temperature=temperature)
    return client.generate(prompt, **kwargs)


# Example usage and model mappings
DEFAULT_MODELS = {
    LLMProvider.OPENAI: "gpt-4o",
    LLMProvider.ANTHROPIC: "claude-3-5-sonnet-20241022",
    LLMProvider.GOOGLE: "gemini-2.5-pro-preview-03-25"
}


def get_default_model(provider: str) -> str:
    """Get the default model for a provider"""
    provider_enum = LLMProvider(provider.lower())
    return DEFAULT_MODELS[provider_enum]
