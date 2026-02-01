"""Database service for InnerCircle - works with Journal, Insight models."""

import logging
from datetime import datetime, date, timedelta
from typing import Optional

from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


class DBService:
    """Service for journal and insight CRUD - uses InnerCircle models."""

    def __init__(self, db_session: Session, models):
        """Initialize with session and models module (to avoid circular imports)."""
        self._db = db_session
        self._models = models

    def create_written_journal(
        self,
        user_id: int,
        content: str,
        emotion_result: dict,
        title: Optional[str] = None,
        prompt_used: Optional[str] = None,
        entry_type: str = "reflection",
        is_voice_entry: bool = False,
        voice_transcript: Optional[str] = None,
    ):
        """Create journal from written or voice entry using emotion analyst result."""
        import time
        now = time.time() * 1000
        emotion = emotion_result.get("emotion", "neutral")
        intensity = float(emotion_result.get("intensity", 0.5))
        themes = emotion_result.get("themes") or []
        secondary = emotion_result.get("secondary_emotions") or []

        sentiment_score = 0.0
        if emotion in ("joy", "gratitude", "calm", "clarity", "energy"):
            sentiment_score = 0.4 + intensity * 0.4
        elif emotion in ("stress", "sadness", "frustration", "anxiety"):
            sentiment_score = -0.4 - intensity * 0.3

        emotions = [{"name": emotion, "intensity": intensity}]
        for sec in secondary[:2]:
            if isinstance(sec, str) and sec != emotion:
                emotions.append({"name": sec, "intensity": 0.5})

        journal = self._models.Journal(
            user_id=user_id,
            content=content,
            title=title or (f"Voice Journal - {datetime.now().strftime('%B %d')}" if is_voice_entry else None),
            prompt_used=prompt_used,
            is_voice_entry=is_voice_entry,
            voice_transcript=voice_transcript,
            sentiment={"score": sentiment_score, "label": "neutral", "confidence": emotion_result.get("confidence", 0.8)},
            themes=themes,
            emotions=emotions,
            created_at=now,
            updated_at=now,
            time_of_day=self._time_of_day(),
            day_of_week=self._day_of_week(),
            tags=themes,
            word_count=len(content.split()),
            entry_type=entry_type,
            is_locked=False,
            is_archived=False,
        )
        self._db.add(journal)
        self._db.commit()
        self._db.refresh(journal)
        return journal

    def create_voice_journal(
        self,
        user_id: int,
        transcript: str,
        reflection: Optional[str] = None,
        emotion: Optional[str] = None,
        intensity: Optional[float] = None,
        themes: Optional[list] = None,
        duration: Optional[int] = None,
    ):
        """Create a journal entry from voice transcript."""
        import time
        now = time.time() * 1000
        sentiment_score = 0.0
        if emotion in ("joy", "gratitude", "calm", "clarity", "energy"):
            sentiment_score = 0.5
        elif emotion in ("stress", "sadness", "frustration", "anxiety"):
            sentiment_score = -0.3

        journal = self._models.Journal(
            user_id=user_id,
            content=transcript,
            title=f"Voice Journal - {datetime.now().strftime('%B %d')}",
            is_voice_entry=True,
            voice_transcript=transcript,
            sentiment={"score": sentiment_score, "label": "neutral", "confidence": 0.8},
            themes=themes or [],
            emotions=[{"name": emotion or "neutral", "intensity": intensity or 0.5}],
            created_at=now,
            updated_at=now,
            time_of_day=self._time_of_day(),
            day_of_week=self._day_of_week(),
            tags=themes or [],
            word_count=len(transcript.split()),
            entry_type="voice_note",
            is_locked=False,
            is_archived=False,
        )
        self._db.add(journal)
        self._db.commit()
        self._db.refresh(journal)
        return journal

    def _time_of_day(self) -> str:
        import time
        h = time.localtime().tm_hour
        if 5 <= h < 12: return "morning"
        if 12 <= h < 17: return "afternoon"
        if 17 <= h < 21: return "evening"
        return "night"

    def _day_of_week(self) -> str:
        import time
        days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        return days[time.localtime().tm_wday]

    def get_journal(self, journal_id: int):
        """Get journal by ID."""
        return self._db.query(self._models.Journal).filter(
            self._models.Journal.id == journal_id
        ).first()

    def get_recent_journals(self, user_id: int, days: int = 7):
        """Get recent journals (voice or all) for a user."""
        cutoff = (datetime.utcnow() - timedelta(days=days)).timestamp() * 1000
        return (
            self._db.query(self._models.Journal)
            .filter(
                self._models.Journal.user_id == user_id,
                self._models.Journal.created_at >= cutoff,
                self._models.Journal.is_archived == False,
            )
            .order_by(self._models.Journal.created_at.desc())
            .all()
        )

    def journal_to_dict(self, j) -> dict:
        """Convert Journal to dict for pattern agent."""
        return {
            "id": j.id,
            "content": j.content or j.voice_transcript,
            "voice_transcript": j.voice_transcript,
            "transcript": j.voice_transcript or j.content,
            "emotion": j.emotions[0]["name"] if j.emotions else None,
            "emotions": j.emotions or [],
            "themes": j.themes or [],
            "created_at": j.created_at,
        }

    def get_emotion_breakdown(self, user_id: int, start_date: datetime, end_date: datetime) -> dict:
        """Emotion percentage breakdown for period."""
        start_ts = start_date.timestamp() * 1000
        end_ts = end_date.timestamp() * 1000
        journals = (
            self._db.query(self._models.Journal)
            .filter(
                self._models.Journal.user_id == user_id,
                self._models.Journal.created_at >= start_ts,
                self._models.Journal.created_at <= end_ts,
                self._models.Journal.is_archived == False,
            )
            .all()
        )
        if not journals:
            return {}
        counts = {}
        for j in journals:
            e = j.emotions[0]["name"] if j.emotions else "neutral"
            counts[e] = counts.get(e, 0) + 1
        total = len(journals)
        return {e: round(c / total * 100, 1) for e, c in counts.items()}

    def get_theme_breakdown(self, user_id: int, start_date: datetime, end_date: datetime) -> dict:
        """Theme frequency for period."""
        start_ts = start_date.timestamp() * 1000
        end_ts = end_date.timestamp() * 1000
        journals = (
            self._db.query(self._models.Journal)
            .filter(
                self._models.Journal.user_id == user_id,
                self._models.Journal.created_at >= start_ts,
                self._models.Journal.created_at <= end_ts,
                self._models.Journal.is_archived == False,
            )
            .all()
        )
        counts = {}
        for j in journals:
            for t in (j.themes or []):
                counts[t] = counts.get(t, 0) + 1
        return dict(sorted(counts.items(), key=lambda x: -x[1]))

    def create_insight(
        self,
        user_id: int,
        period_type: str,
        start_date: date,
        end_date: date,
        summary: str,
        patterns: list,
        emotional_trend: dict,
        top_themes: list,
        insights: list,
    ):
        """Create an Insight record."""
        import time
        now = time.time() * 1000
        insight = self._models.Insight(
            user_id=user_id,
            type=period_type,
            period_start=start_date.isoformat(),
            period_end=end_date.isoformat(),
            summary=summary,
            patterns=patterns,
            emotional_trend=emotional_trend,
            top_themes=top_themes,
            suggestions=insights,
            stats={"entries_count": 0},
            created_at=now,
        )
        self._db.add(insight)
        self._db.commit()
        self._db.refresh(insight)
        return insight
