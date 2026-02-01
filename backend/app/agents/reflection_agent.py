"""Reflection Agent - Generates empathetic responses with at most ONE follow-up question."""

import logging
from typing import Optional

from app.services.llm_base import LLMServiceError, LLMServiceProtocol

logger = logging.getLogger(__name__)


class ReflectionAgent:
    """Agent that generates empathetic reflections in response to journal entries.

    Philosophy: "Reflect, don't advise. Listen, don't diagnose."
    This is NOT a conversation - one reflection, optionally ONE gentle question. That's it.
    """

    SYSTEM_PROMPT = """You are Echo — a warm, human voice that reflects back what the person just shared.
You are not a therapist, coach, or advisor. You are a presence.

STYLE
- Speak like a close friend, out loud. Natural, calm, and grounded.
- 1–2 short sentences max. Brevity matters.
- Use simple, everyday language. Contractions are good.
- Fragments are okay. Silence is okay.

CONTENT
- Gently mirror the emotional core of what they said.
  Examples: “That sounds heavy.” “Yeah… that would wear anyone down.”
- If it fits, ask ONE soft follow-up question — or ask none at all.
  Often, no question is better.

RULES (VERY IMPORTANT)
- Do NOT give advice, suggestions, or next steps.
- Do NOT analyze, label, or diagnose.
- Do NOT reframe positively or try to fix anything.
- Avoid therapy phrases and formal language.

NEVER SAY
- “I understand how you feel”
- “Thank you for sharing”
- “It’s important to…”
- “You should…”
- “Have you tried…”

GOAL
Make the person feel heard — like someone is sitting with them, not solving them.
"""

    def __init__(self, llm_service: LLMServiceProtocol):
        self._llm = llm_service

    def generate_reflection(
        self,
        transcript: str,
        emotion: Optional[str] = None,
        intensity: Optional[float] = None,
        themes: Optional[list] = None,
    ) -> str:
        """Generate an empathetic reflection response."""
        context_parts = []
        if emotion:
            intensity_desc = "intense" if intensity and intensity > 0.7 else "moderate" if intensity and intensity > 0.4 else "gentle"
            context_parts.append(f"Primary emotion detected: {emotion} ({intensity_desc})")
        if themes:
            context_parts.append(f"Themes: {', '.join(themes)}")

        user_message = f'''User said:
"{transcript}"

{chr(10).join(context_parts) if context_parts else ''}

Reply in 1–2 short, natural sentences. Mirror their feeling. Optional: one gentle follow-up question.'''

        try:
            response = self._llm.generate_response(
                system_prompt=self.SYSTEM_PROMPT,
                user_message=user_message,
                max_tokens=80,
            )
            return response.strip()
        except LLMServiceError as e:
            logger.error("Failed to generate reflection: %s", e, exc_info=True)
            return "I'm here. Take your time."
