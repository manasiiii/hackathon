"""Emotion Analyst Agent - Analyzes emotional content from transcript (LLM)."""

import json
import logging

from app.services.llm_base import LLMServiceError, LLMServiceProtocol

logger = logging.getLogger(__name__)

_NEUTRAL_RESULT = {
    "emotion": "neutral",
    "confidence": 0.0,
    "secondary_emotions": [],
    "themes": [],
    "intensity": 0.5,
    "notes": None,
  "suggested_title": None,
    "source": "fallback",
}


class EmotionAnalystAgent:
    """Agent that analyzes emotion, intensity, and themes from a transcript."""

    SYSTEM_PROMPT = """You are Inner Circle's Emotion Analyst, analyzing emotional content in journal entries.

Your role:
- Analyze the transcript for emotional content
- Identify primary emotion, intensity (0-1), and themes
- Keep analysis brief and focused

Available emotions: stress, calm, sadness, energy, frustration, clarity, neutral, joy, gratitude, anxiety
Available themes: work, relationships, health, self-doubt, rest, creativity, family, growth

Respond in JSON format only:
{
    "validated_emotion": "the most accurate primary emotion",
    "confidence": 0.0-1.0,
    "secondary_emotions": ["list", "of", "other", "emotions"],
    "themes": ["detected", "themes"],
    "intensity": 0.0-1.0,
    "notes": "brief observation (optional)",
    "suggested_title": "2-3 word title capturing the entry"
}

Be concise. Focus on accuracy over explanation. The suggested_title should be a short, evocative phrase (e.g. "A Busy Day at Work", "Grateful for Friends")."""

    def __init__(self, llm_service: LLMServiceProtocol):
        self._llm = llm_service

    def analyze_emotion(self, transcript: str) -> dict:
        """Analyze emotion, intensity, and themes from transcript."""
        user_message = f'''Analyze the emotional content of this journal entry:

"{transcript}"

Provide your analysis in JSON format.'''

        try:
            response = self._llm.generate_response(
                system_prompt=self.SYSTEM_PROMPT,
                user_message=user_message,
                max_tokens=300,
            )
            start = response.find("{")
            end = response.rfind("}") + 1
            if start >= 0 and end > start:
                data = json.loads(response[start:end])
                return {
                    "emotion": data.get("validated_emotion", "neutral"),
                    "confidence": float(data.get("confidence", 0.5)),
                    "secondary_emotions": data.get("secondary_emotions", []),
                    "themes": data.get("themes", []),
                    "intensity": float(data.get("intensity", 0.5)),
                    "notes": data.get("notes"),
                    "suggested_title": (data.get("suggested_title") or "").strip() or None,
                    "source": "ai",
                }
        except (LLMServiceError, json.JSONDecodeError, ValueError, KeyError) as e:
            logger.warning("Emotion analysis failed, using neutral fallback: %s", e)

        return dict(_NEUTRAL_RESULT)
