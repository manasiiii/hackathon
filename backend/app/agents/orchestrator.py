"""Agent Orchestrator - Chooses which agent to run for each step."""

import logging
import time
from datetime import date, datetime, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from app.services.llm_base import LLMServiceProtocol
from app.services.db_service import DBService
from app.services.health_service import HealthService
from app.agents.question_generator import QuestionGeneratorAgent
from app.agents.emotion_analyst import EmotionAnalystAgent
from app.agents.reflection_agent import ReflectionAgent
from app.agents.pattern_discovery import PatternDiscoveryAgent

logger = logging.getLogger(__name__)


class OrchestratorError(Exception):
    """Custom exception for orchestrator errors."""
    pass


class AgentOrchestrator:
    """Orchestrator that delegates to specialized agents.

    Agents:
    1. Question generator - starting or follow-up questions
    2. Emotion analyst - analyzes transcript for emotion/themes
    3. Reflection agent - generates empathetic response
    4. Pattern discovery - weekly/monthly insights
    """

    def __init__(self, db_session: Session, llm_service: LLMServiceProtocol, models):
        self._db = db_session
        self._llm = llm_service
        self._models = models
        self._db_service = DBService(db_session, models)
        self._health_service = HealthService(db_session, models)
        self._question_agent = QuestionGeneratorAgent(llm_service)
        self._emotion_agent = EmotionAnalystAgent(llm_service)
        self._reflection_agent = ReflectionAgent(llm_service)
        self._pattern_agent = PatternDiscoveryAgent(llm_service)

    def process_transcript(
        self,
        user_id: int,
        transcript: str,
        duration: Optional[int] = None,
    ) -> dict:
        """Analyze transcript, generate reflection, save to DB."""
        try:
            emotion_result = self._emotion_agent.analyze_emotion(transcript)
            emotion = emotion_result["emotion"]
            intensity = emotion_result["intensity"]
            themes = emotion_result["themes"]
            confidence = emotion_result.get("confidence", 0.5)
            logger.debug("Emotion: %s (intensity %.2f)", emotion, intensity)

            reflection = self._reflection_agent.generate_reflection(
                transcript=transcript,
                emotion=emotion,
                intensity=intensity,
                themes=themes,
            )

            journal = self._db_service.create_voice_journal(
                user_id=user_id,
                transcript=transcript,
                reflection=reflection,
                emotion=emotion,
                intensity=intensity,
                themes=themes,
                duration=duration,
            )

            user = self._db.query(self._models.User).filter(
                self._models.User.id == user_id
            ).first()
            if user:
                from app.utils import update_user_on_journal
                update_user_on_journal(user, time.time() * 1000)
                self._db.commit()

            return {
                "id": journal.id,
                "timestamp": journal.created_at,
                "transcript": transcript,
                "emotion": emotion,
                "intensity": intensity,
                "themes": themes,
                "confidence": confidence,
                "reflection": reflection,
                "duration": duration,
            }
        except Exception as e:
            logger.error("Failed to process transcript: %s", e, exc_info=True)
            raise OrchestratorError(f"Failed to process transcript: {e}")

    def get_starting_question(self, user_id: int, include_health: bool = True, days: int = 3) -> dict:
        """Generate personalized check-in question based on last N days of data."""
        try:
            recent = self._db_service.get_recent_journals(user_id, days=days)
            recent_emotions = []
            for j in recent:
                if j.emotions:
                    recent_emotions.append({
                        "emotion": j.emotions[0].get("name", "neutral"),
                        "intensity": j.emotions[0].get("intensity", 0.5),
                    })
            unique_themes = list(set(t for j in recent for t in (j.themes or [])))[:5]
            health_context = None
            context_used = []
            if include_health:
                health_context = self._health_service.get_latest_health_data(user_id)
                if health_context:
                    context_used.append("health_data")
            if recent_emotions:
                context_used.append("recent_emotions")
            if unique_themes:
                context_used.append("recent_themes")

            question = self._question_agent.generate_question(
                recent_emotions=recent_emotions or None,
                recent_themes=unique_themes or None,
                health_context=health_context,
            )
            return {"question": question, "context_used": context_used or ["general"]}
        except Exception as e:
            logger.error("Failed to generate question: %s", e)
            return {
                "question": self._question_agent.generate_fallback_question(),
                "context_used": ["fallback"],
            }

    def get_follow_up_question(self, user_id: int, journal_id: int) -> dict:
        """Generate follow-up question based on a journal entry."""
        try:
            journal = self._db_service.get_journal(journal_id)
            if not journal:
                raise OrchestratorError(f"Journal {journal_id} not found")
            transcript = journal.voice_transcript or journal.content or ""
            reflection = journal.content
            question = self._question_agent.generate_follow_up_question(
                transcript=transcript[:500],
                reflection=transcript[:300],
            )
            return {"question": question, "context_used": ["current_entry"]}
        except Exception as e:
            logger.error("Failed to generate follow-up question: %s", e)
            return {
                "question": self._question_agent.generate_fallback_question(),
                "context_used": ["fallback"],
            }

    def process_written_journal(
        self,
        user_id: int,
        content: str,
        title: Optional[str] = None,
        prompt_used: Optional[str] = None,
        entry_type: str = "reflection",
        is_voice_entry: bool = False,
        voice_transcript: Optional[str] = None,
    ):
        """Analyze content with emotion agent, save journal, update user stats."""
        try:
            emotion_result = self._emotion_agent.analyze_emotion(content)
            resolved_title = title or emotion_result.get("suggested_title")
            journal = self._db_service.create_written_journal(
                user_id=user_id,
                content=content,
                emotion_result=emotion_result,
                title=resolved_title,
                prompt_used=prompt_used,
                entry_type=entry_type,
                is_voice_entry=is_voice_entry,
                voice_transcript=(voice_transcript or content) if is_voice_entry else None,
            )
            user = self._db.query(self._models.User).filter(
                self._models.User.id == user_id
            ).first()
            if user:
                from app.utils import update_user_on_journal
                update_user_on_journal(user, time.time() * 1000)
                self._db.commit()
            return journal
        except Exception as e:
            logger.error("Failed to process written journal: %s", e, exc_info=True)
            raise OrchestratorError(f"Failed to process written journal: {e}")

    def get_voice_reflection(self, content: str) -> str:
        """Generate reflection for voice session - emotion-aware, at most ONE gentle question."""
        try:
            emotion_result = self._emotion_agent.analyze_emotion(content)
            return self._reflection_agent.generate_reflection(
                transcript=content,
                emotion=emotion_result.get("emotion"),
                intensity=emotion_result.get("intensity"),
                themes=emotion_result.get("themes"),
            )
        except Exception as e:
            logger.error("Failed to get voice reflection: %s", e, exc_info=True)
            return "Thank you for sharing. I'm here to listen."

    def get_reflection_and_follow_up(self, content: str) -> dict:
        """Analyze content, generate reflection, and ONE follow-up question. Used in journal flow."""
        try:
            emotion_result = self._emotion_agent.analyze_emotion(content)
            emotion = emotion_result["emotion"]
            intensity = emotion_result["intensity"]
            themes = emotion_result["themes"]

            reflection = self._reflection_agent.generate_reflection(
                transcript=content,
                emotion=emotion,
                intensity=intensity,
                themes=themes,
            )

            follow_up_question = self._question_agent.generate_follow_up_question(
                transcript=content[:500],
                reflection=reflection[:300],
            )
            return {
                "reflection": reflection,
                "follow_up_question": follow_up_question,
                "emotion": emotion,
                "themes": themes,
                "intensity": intensity,
            }
        except Exception as e:
            logger.error("Failed to get reflection and follow-up: %s", e, exc_info=True)
            return {
                "reflection": "Thank you for sharing. I'm here to listen.",
                "follow_up_question": self._question_agent.generate_fallback_question(),
                "emotion": "neutral",
                "themes": [],
                "intensity": 0.5,
            }

    def get_weekly_insights(self, user_id: int) -> dict:
        """Generate weekly summary with patterns."""
        try:
            end_date = date.today()
            start_date = end_date - timedelta(days=7)
            journals = self._db_service.get_recent_journals(user_id, days=7)
            conv_dicts = [self._db_service.journal_to_dict(j) for j in journals]
            health_data = self._health_service.get_health_data(user_id, start_date, end_date)
            health_dicts = [self._health_service.health_to_dict(h) for h in health_data]

            patterns = self._pattern_agent.generate_weekly_summary(
                conversations=conv_dicts,
                health_data=health_dicts or None,
            )
            start_dt = datetime.combine(start_date, datetime.min.time())
            end_dt = datetime.combine(end_date, datetime.max.time())
            emotion_breakdown = self._db_service.get_emotion_breakdown(user_id, start_dt, end_dt)
            theme_breakdown = self._db_service.get_theme_breakdown(user_id, start_dt, end_dt)
            top_themes = list(theme_breakdown.keys())[:5]

            summary = self._db_service.create_insight(
                user_id=user_id,
                period_type="weekly",
                start_date=start_date,
                end_date=end_date,
                summary=patterns.get("primary_pattern", ""),
                patterns=[{"type": "pattern", "title": "Weekly", "description": patterns.get("primary_pattern", "")}],
                emotional_trend={"emotion_trend": patterns.get("emotion_trend", "mixed"), "dominant_emotions": list(emotion_breakdown.keys())[:3]},
                top_themes=[{"theme": t, "frequency": theme_breakdown.get(t, 0)} for t in top_themes],
                insights=patterns.get("insights", []),
            )

            return {
                "id": summary.id,
                "period_type": "weekly",
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "entry_count": len(journals),
                "emotion_breakdown": emotion_breakdown,
                "top_themes": top_themes,
                "insights": patterns.get("insights", []),
                "primary_pattern": patterns.get("primary_pattern"),
                "emotion_trend": patterns.get("emotion_trend"),
                "carry_forward_question": patterns.get("carry_forward_question"),
            }
        except Exception as e:
            logger.error("Failed to generate weekly insights: %s", e, exc_info=True)
            raise OrchestratorError(f"Failed to generate weekly insights: {e}")

    def get_monthly_insights(self, user_id: int) -> dict:
        """Generate monthly summary with patterns."""
        try:
            end_date = date.today()
            start_date = end_date - timedelta(days=30)
            journals = self._db_service.get_recent_journals(user_id, days=30)
            conv_dicts = [self._db_service.journal_to_dict(j) for j in journals]
            health_data = self._health_service.get_health_data(user_id, start_date, end_date)
            health_dicts = [self._health_service.health_to_dict(h) for h in health_data]

            patterns = self._pattern_agent.generate_monthly_summary(
                conversations=conv_dicts,
                health_data=health_dicts or None,
            )
            start_dt = datetime.combine(start_date, datetime.min.time())
            end_dt = datetime.combine(end_date, datetime.max.time())
            emotion_breakdown = self._db_service.get_emotion_breakdown(user_id, start_dt, end_dt)
            theme_breakdown = self._db_service.get_theme_breakdown(user_id, start_dt, end_dt)
            top_themes = list(theme_breakdown.keys())[:5]

            summary = self._db_service.create_insight(
                user_id=user_id,
                period_type="monthly",
                start_date=start_date,
                end_date=end_date,
                summary=patterns.get("primary_pattern", ""),
                patterns=[{"type": "pattern", "title": "Monthly", "description": patterns.get("primary_pattern", "")}],
                emotional_trend={"emotion_trend": patterns.get("emotion_trend", "mixed")},
                top_themes=[{"theme": t, "frequency": theme_breakdown.get(t, 0)} for t in top_themes],
                insights=patterns.get("insights", []),
            )

            return {
                "id": summary.id,
                "period_type": "monthly",
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "entry_count": len(journals),
                "emotion_breakdown": emotion_breakdown,
                "top_themes": top_themes,
                "insights": patterns.get("insights", []),
                "primary_pattern": patterns.get("primary_pattern"),
                "emotion_trend": patterns.get("emotion_trend"),
                "carry_forward_question": patterns.get("carry_forward_question"),
            }
        except Exception as e:
            logger.error("Failed to generate monthly insights: %s", e, exc_info=True)
            raise OrchestratorError(f"Failed to generate monthly insights: {e}")
