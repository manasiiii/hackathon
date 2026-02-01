"""Pattern Discovery Agent - Discovers emotional patterns over time."""

import json
import logging
from typing import Optional

from app.services.llm_base import LLMServiceError, LLMServiceProtocol

logger = logging.getLogger(__name__)


class PatternDiscoveryAgent:
    """Agent that discovers emotional patterns across conversations."""

    SYSTEM_PROMPT = """You are Inner Circle's Pattern Discovery Agent, analyzing emotional journal data.

Your role:
- Identify emotional trends over time
- Find correlations between themes and emotions
- Generate plain-English insights that are helpful but not prescriptive
- Notice patterns the user might miss
- Connect health data to emotional states when available

Guidelines:
- Keep insights brief and actionable
- Use "I noticed" language, not "You should"
- Focus on patterns, not diagnoses
- Maximum 3 insights per analysis

Output JSON format:
{
    "primary_pattern": "Brief description of the main pattern observed",
    "emotion_trend": "increasing/decreasing/stable/mixed",
    "insights": [
        "First insight in plain English",
        "Second insight...",
    ],
    "health_connections": ["Any patterns connecting health data to emotions"],
    "suggested_focus": "One gentle suggestion for the coming week",
    "carry_forward_question": "A question to revisit next week"
}

Be observational, not prescriptive."""

    def __init__(self, llm_service: LLMServiceProtocol):
        self._llm = llm_service

    def generate_weekly_summary(
        self,
        conversations: list[dict],
        health_data: Optional[list[dict]] = None,
    ) -> dict:
        """Generate weekly summary with patterns."""
        return self._analyze_patterns(conversations, health_data, "weekly")

    def generate_monthly_summary(
        self,
        conversations: list[dict],
        health_data: Optional[list[dict]] = None,
    ) -> dict:
        """Generate monthly summary with patterns."""
        return self._analyze_patterns(conversations, health_data, "monthly")

    def _analyze_patterns(
        self,
        conversations: list[dict],
        health_data: Optional[list[dict]],
        period_type: str,
    ) -> dict:
        if not conversations:
            return self._empty_result(period_type)

        prompt_parts = [
            f"Analyze this {period_type} journal data for patterns:",
            "",
            f"Total entries: {len(conversations)}",
            "",
            "Emotion breakdown:",
            self._summarize_emotions(conversations),
            "",
            "Theme frequency:",
            self._summarize_themes(conversations),
            "",
            "Sample entries (abbreviated):",
        ]
        for i, conv in enumerate(conversations[:5]):
            content = (conv.get("content") or conv.get("transcript") or conv.get("voice_transcript") or "")[:200]
            emotion = conv.get("emotion") or (conv.get("emotions", [{}])[0].get("name", "unknown") if conv.get("emotions") else "unknown")
            prompt_parts.append(f'- [{emotion}] "{content}..."')

        if health_data:
            prompt_parts.extend(["", "Health data summary:", self._summarize_health(health_data)])
        prompt_parts.extend(["", "Provide pattern analysis in JSON format."])

        try:
            response = self._llm.generate_response(
                system_prompt=self.SYSTEM_PROMPT,
                user_message="\n".join(prompt_parts),
                max_tokens=500,
            )
            return self._parse_response(response, conversations, period_type)
        except LLMServiceError as e:
            logger.error("Failed to analyze patterns: %s", e, exc_info=True)
            return self._fallback_analysis(conversations, period_type)

    def _summarize_emotions(self, conversations: list) -> str:
        emotion_counts = {}
        for conv in conversations:
            emotion = conv.get("emotion")
            if not emotion and conv.get("emotions"):
                emotion = conv["emotions"][0].get("name", "unknown") if isinstance(conv["emotions"][0], dict) else "unknown"
            emotion = emotion or "unknown"
            emotion_counts[emotion] = emotion_counts.get(emotion, 0) + 1
        lines = [f"  - {e}: {c} ({c/len(conversations)*100:.0f}%)" for e, c in sorted(emotion_counts.items(), key=lambda x: -x[1])]
        return "\n".join(lines)

    def _summarize_themes(self, conversations: list) -> str:
        theme_counts = {}
        for conv in conversations:
            themes = conv.get("themes", [])
            for t in themes:
                theme_counts[t] = theme_counts.get(t, 0) + 1
        if not theme_counts:
            return "  No themes detected"
        return "\n".join(f"  - {t}: {c} mentions" for t, c in sorted(theme_counts.items(), key=lambda x: -x[1]))

    def _summarize_health(self, health_data: list) -> str:
        if not health_data:
            return "  No health data"
        sleep_vals = []
        hrv_vals = []
        for h in health_data:
            if isinstance(h.get("sleep"), dict):
                dur = h["sleep"].get("duration_minutes", 0)
                if dur:
                    sleep_vals.append(dur / 60)
            elif h.get("sleep_hours"):
                sleep_vals.append(h["sleep_hours"])
            heart = h.get("heart") or {}
            if isinstance(heart, dict) and heart.get("hrv"):
                hrv_vals.append(heart["hrv"])
        lines = []
        if sleep_vals:
            lines.append(f"  - Average sleep: {sum(sleep_vals)/len(sleep_vals):.1f} hours")
        if hrv_vals:
            lines.append(f"  - Average HRV: {sum(hrv_vals)/len(hrv_vals):.0f}ms")
        return "\n".join(lines) if lines else "  Limited health data"

    def _parse_response(self, response: str, conversations: list, period_type: str) -> dict:
        try:
            start = response.find("{")
            end = response.rfind("}") + 1
            if start >= 0 and end > start:
                data = json.loads(response[start:end])
                return {
                    "period_type": period_type,
                    "primary_pattern": data.get("primary_pattern", "No clear pattern detected"),
                    "emotion_trend": data.get("emotion_trend", "mixed"),
                    "insights": data.get("insights", []),
                    "health_connections": data.get("health_connections", []),
                    "suggested_focus": data.get("suggested_focus"),
                    "carry_forward_question": data.get("carry_forward_question"),
                }
        except (json.JSONDecodeError, ValueError) as e:
            logger.warning("Failed to parse pattern response: %s", e)
        return self._fallback_analysis(conversations, period_type)

    def _fallback_analysis(self, conversations: list, period_type: str) -> dict:
        emotion_counts = {}
        for conv in conversations:
            e = conv.get("emotion") or (conv.get("emotions", [{}])[0].get("name", "mixed") if conv.get("emotions") else "mixed")
            emotion_counts[e] = emotion_counts.get(e, 0) + 1
        dominant = max(emotion_counts, key=emotion_counts.get) if emotion_counts else "mixed"
        return {
            "period_type": period_type,
            "primary_pattern": f"Dominant emotion: {dominant}",
            "emotion_trend": "mixed",
            "insights": [f"You had {len(conversations)} journal entries this period."],
            "health_connections": [],
            "suggested_focus": None,
            "carry_forward_question": "How has your week been?",
        }

    def _empty_result(self, period_type: str) -> dict:
        return {
            "period_type": period_type,
            "primary_pattern": "No data available for analysis",
            "emotion_trend": "unknown",
            "insights": ["Start journaling to see patterns emerge over time."],
            "health_connections": [],
            "suggested_focus": "Try recording a journal entry today.",
            "carry_forward_question": "How are you feeling right now?",
        }
