"""Base types for LLM provider abstraction (OpenAI, etc.)."""

from typing import Optional, Protocol


class LLMServiceError(Exception):
    """Base exception for any LLM service errors."""

    pass


class LLMServiceProtocol(Protocol):
    """Protocol for LLM services so agents work with any provider."""

    def generate_response(
        self,
        system_prompt: str,
        user_message: str,
        max_tokens: Optional[int] = None,
    ) -> str:
        """Generate a response from the LLM."""
        ...

    def generate_with_context(
        self,
        system_prompt: str,
        messages: list[dict],
        max_tokens: Optional[int] = None,
    ) -> str:
        """Generate response with conversation context."""
        ...
