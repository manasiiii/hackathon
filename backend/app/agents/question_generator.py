"""Question Generator Agent - Creates personalized daily check-in questions."""

import logging
import random
from typing import Optional

from app.services.llm_base import LLMServiceError, LLMServiceProtocol

logger = logging.getLogger(__name__)


class QuestionGeneratorAgent:
    """Agent that generates personalized daily check-in questions."""

    SYSTEM_PROMPT = """You generate simple check-in questions. Keep it casual like texting a friend.

Rules:
- ONE short question only
- Use simple everyday words
- No therapy talk
- No mentioning data or patterns directly

Good examples:
- "Hey, how are you doing today?"
- "What's on your mind?"
- "How's your day going?"
- "How are you feeling?"
- "What's been going on?"

Output ONLY the question."""

    FALLBACK_QUESTIONS = [
        "How are you feeling right now?",
        "What's been on your mind today?",
        "How would you describe your energy level?",
        "What's one thing you're grateful for today?",
        "How has your week been going?",
    ]

    def __init__(self, llm_service: LLMServiceProtocol):
        self._llm = llm_service

    def generate_question(
        self,
        recent_emotions: Optional[list] = None,
        recent_themes: Optional[list] = None,
        health_context: Optional[dict] = None,
    ) -> str:
        """Generate a personalized check-in question."""
        context_parts = []
        if recent_emotions:
            emotion_summary = self._summarize_emotions(recent_emotions)
            if emotion_summary:
                context_parts.append(f"Recent emotional patterns: {emotion_summary}")
        if recent_themes:
            context_parts.append(f"Recent themes in conversations: {', '.join(recent_themes[:5])}")
        if health_context:
            health_summary = self._summarize_health(health_context)
            if health_summary:
                context_parts.append(f"Health context: {health_summary}")

        if context_parts:
            user_message = "Generate a personalized check-in question based on this context:\n\n" + "\n".join(context_parts)
        else:
            user_message = "Generate a gentle, general check-in question for someone starting their daily journaling session."

        try:
            question = self._llm.generate_response(
                system_prompt=self.SYSTEM_PROMPT,
                user_message=user_message,
                max_tokens=150,
            )
            return question.strip().strip('"')
        except LLMServiceError as e:
            logger.error("Failed to generate question: %s", e)
            return self.generate_fallback_question()

    def _summarize_emotions(self, emotions: list) -> str:
        if not emotions:
            return ""
        emotion_counts = {}
        for e in emotions:
            emotion = e.get("emotion", e.get("name", "unknown"))
            emotion_counts[emotion] = emotion_counts.get(emotion, 0) + 1
        top_emotions = sorted(emotion_counts.keys(), key=lambda x: emotion_counts[x], reverse=True)[:3]
        intensities = [e.get("intensity", 0.5) for e in emotions if "intensity" in e]
        avg_intensity = sum(intensities) / len(intensities) if intensities else 0.5
        intensity_desc = "high" if avg_intensity > 0.7 else "moderate" if avg_intensity > 0.4 else "low"
        return f"mostly {', '.join(top_emotions)} with {intensity_desc} intensity"

    def _summarize_health(self, health: dict) -> str:
        parts = []
        if health.get("sleep_hours") is not None:
            sleep = health["sleep_hours"]
            parts.append("low sleep" if sleep < 6 else "good sleep" if sleep > 8 else "")
        if health.get("hrv") is not None:
            hrv = health["hrv"]
            parts.append("low HRV (possible stress)" if hrv < 30 else "healthy HRV" if hrv > 50 else "")
        if health.get("recovery_score") is not None:
            r = health["recovery_score"]
            parts.append("low recovery" if r < 50 else "good recovery" if r > 75 else "")
        return ", ".join(p for p in parts if p)

    def generate_follow_up_question(self, transcript: str, reflection: str) -> str:
        """Generate one follow-up question for the current conversation."""
        user_message = f'''Current conversation turn:

User said: "{transcript[:500]}"
You reflected: "{reflection[:300]}"

Generate ONE short follow-up question to gently deepen the conversation. Warm, non-judgmental. One sentence only. Output ONLY the question.'''

        try:
            question = self._llm.generate_response(
                system_prompt=self.SYSTEM_PROMPT,
                user_message=user_message,
                max_tokens=80,
            )
            return question.strip().strip('"')
        except LLMServiceError as e:
            logger.error("Failed to generate follow-up question: %s", e)
            return self.generate_fallback_question()

    def generate_fallback_question(self) -> str:
        """Fallback when API is unavailable."""
        return random.choice(self.FALLBACK_QUESTIONS)
