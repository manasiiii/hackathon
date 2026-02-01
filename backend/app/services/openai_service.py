"""Service for interacting with OpenAI API."""

import logging
import os
from typing import Optional

from openai import OpenAI

from app.services.llm_base import LLMServiceError

logger = logging.getLogger(__name__)


class OpenAIServiceError(LLMServiceError):
    """Custom exception for OpenAI service errors."""

    pass


class OpenAIService:
    """Service for making requests to OpenAI API.

    Implements the LLMServiceProtocol for use by orchestrator and agents.
    """

    def __init__(self, api_key: Optional[str] = None, model: str = "gpt-4o-mini"):
        """Initialize OpenAI service with API key.

        Args:
            api_key: OpenAI API key (or from OPENAI_API_KEY env)
            model: Model name (default gpt-4o-mini for cost efficiency)
        """
        key = api_key or os.getenv("OPENAI_API_KEY", "")
        if not key:
            raise OpenAIServiceError("OpenAI API key is required (set OPENAI_API_KEY)")

        self._client = OpenAI(api_key=key)
        self._model = model

    def generate_response(
        self,
        system_prompt: str,
        user_message: str,
        max_tokens: Optional[int] = None,
    ) -> str:
        """Generate a response from OpenAI."""
        try:
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ]
            kwargs = {"model": self._model, "messages": messages}
            if max_tokens is not None:
                kwargs["max_tokens"] = max_tokens

            response = self._client.chat.completions.create(**kwargs)
            choice = response.choices[0]
            if choice.message and choice.message.content:
                return choice.message.content
            logger.warning("OpenAI response was empty")
            raise OpenAIServiceError("Response was empty")
        except OpenAIServiceError:
            raise
        except Exception as e:
            logger.error("OpenAI API error: %s", e, exc_info=True)
            raise OpenAIServiceError(f"OpenAI API error: {e}")

    def generate_with_context(
        self,
        system_prompt: str,
        messages: list[dict],
        max_tokens: Optional[int] = None,
    ) -> str:
        """Generate response with conversation context."""
        try:
            openai_messages = [{"role": "system", "content": system_prompt}]
            for msg in messages:
                role = msg["role"] if msg["role"] in ("user", "assistant") else "user"
                openai_messages.append({"role": role, "content": msg["content"]})

            kwargs = {"model": self._model, "messages": openai_messages}
            if max_tokens is not None:
                kwargs["max_tokens"] = max_tokens

            response = self._client.chat.completions.create(**kwargs)
            choice = response.choices[0]
            if choice.message and choice.message.content:
                return choice.message.content
            logger.warning("OpenAI response was empty")
            raise OpenAIServiceError("Response was empty")
        except OpenAIServiceError:
            raise
        except Exception as e:
            logger.error("OpenAI API error: %s", e, exc_info=True)
            raise OpenAIServiceError(f"OpenAI API error: {e}")
