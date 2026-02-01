"""Health service for InnerCircle - works with HealthData (JSON fields)."""

import logging
from datetime import date, timedelta
from typing import Optional

from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


class HealthService:
    """Service for health data - InnerCircle uses JSON sleep, heart, recovery."""

    def __init__(self, db_session: Session, models):
        self._db = db_session
        self._models = models

    def get_health_data(self, user_id: int, start_date: date, end_date: date) -> list:
        """Get health data for date range."""
        return (
            self._db.query(self._models.HealthData)
            .filter(
                self._models.HealthData.user_id == user_id,
                self._models.HealthData.date >= start_date.isoformat(),
                self._models.HealthData.date <= end_date.isoformat(),
            )
            .order_by(self._models.HealthData.date.desc())
            .all()
        )

    def get_latest_health_data(self, user_id: int) -> Optional[dict]:
        """Get most recent health data as flat dict for question context."""
        h = (
            self._db.query(self._models.HealthData)
            .filter(self._models.HealthData.user_id == user_id)
            .order_by(self._models.HealthData.date.desc())
            .first()
        )
        if not h:
            return None
        return self._health_to_flat(h)

    def _health_to_flat(self, h) -> dict:
        """Extract sleep_hours, hrv, recovery_score from JSON fields."""
        out = {}
        if h.sleep:
            if isinstance(h.sleep, dict):
                dur = h.sleep.get("duration_minutes")
                if dur is not None:
                    out["sleep_hours"] = dur / 60
        if h.heart and isinstance(h.heart, dict):
            if h.heart.get("hrv") is not None:
                out["hrv"] = h.heart["hrv"]
        if h.recovery and isinstance(h.recovery, dict):
            if h.recovery.get("score") is not None:
                out["recovery_score"] = h.recovery["score"]
        return out

    def health_to_dict(self, h) -> dict:
        """Convert HealthData to dict for pattern agent."""
        flat = self._health_to_flat(h)
        return {
            "date": h.date,
            "sleep_hours": flat.get("sleep_hours"),
            "hrv": flat.get("hrv"),
            "recovery_score": flat.get("recovery_score"),
            "sleep": h.sleep,
            "heart": h.heart,
            "activity": h.activity,
        }
