#!/usr/bin/env python3
"""
Seed database with 20 days of rich synthetic data for demo/video.
- Past 5 days: NEGATIVE journals + bad health (high HR, low sleep, high stress)
- Days 6–20: Mix of positive/neutral with good health
- Rich content for question generation (work, relationships, health, goals, etc.)
"""

import os
import sys
import random
import time
import logging
from datetime import date, timedelta, datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy import text
from database import engine, SessionLocal, Base
import models

logger = logging.getLogger(__name__)

USER_ID = 1
DAYS = 20
PAST_NEGATIVE_DAYS = 5  # Last 5 days are negative + bad health
DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
TIME_OF_DAY = ["morning", "afternoon", "evening", "night"]
ENTRY_TYPES = ["quick_checkin", "reflection", "gratitude", "voice_note", "guided"]

# ========== NEGATIVE (Past 5 days) – stress, anxiety, poor sleep ==========
JOURNAL_NEGATIVE = [
    {
        "content": "Tossed and turned all night. Only got 4 hours of sleep. Heart was racing even at 2am. Couldn't shut off my brain about the project deadline.",
        "title": "Exhausted",
        "themes": ["work", "health", "stress"],
        "emotions": [{"name": "anxiety", "intensity": 0.9}, {"name": "stress", "intensity": 0.85}],
        "sentiment": {"score": -0.6, "label": "negative", "confidence": 0.9},
    },
    {
        "content": "Stressed about the presentation tomorrow. Slept maybe 5 hours. HRV was in the low 20s this morning – body is clearly struggling.",
        "title": "Under pressure",
        "themes": ["work", "health", "stress"],
        "emotions": [{"name": "stress", "intensity": 0.95}, {"name": "anxiety", "intensity": 0.8}],
        "sentiment": {"score": -0.55, "label": "negative", "confidence": 0.88},
    },
    {
        "content": "Another night of poor sleep. Woke up at 3am with my heart pounding. Been feeling off all week – restless, irritable, hard to focus.",
        "title": "Running on empty",
        "themes": ["health", "stress"],
        "emotions": [{"name": "anxiety", "intensity": 0.85}, {"name": "frustration", "intensity": 0.7}],
        "sentiment": {"score": -0.65, "label": "negative", "confidence": 0.9},
    },
    {
        "content": "Had a tense conversation with my manager. Couldn't fall asleep until past midnight. Resting heart rate was 88 this morning – way higher than normal.",
        "title": "Work tension",
        "themes": ["work", "relationships", "stress"],
        "emotions": [{"name": "stress", "intensity": 0.9}, {"name": "worry", "intensity": 0.75}],
        "sentiment": {"score": -0.5, "label": "negative", "confidence": 0.85},
    },
    {
        "content": "Slept badly again. Mind keeps going to finances and whether I'm on the right path. Feeling stuck and anxious.",
        "title": "Self-doubt",
        "themes": ["self-doubt", "stress", "growth"],
        "emotions": [{"name": "anxiety", "intensity": 0.8}, {"name": "sadness", "intensity": 0.6}],
        "sentiment": {"score": -0.55, "label": "negative", "confidence": 0.85},
    },
    {
        "content": "Only 5 hours of sleep. Had a difficult conversation with a close friend – feeling guilty and overwhelmed.",
        "title": "Relationship strain",
        "themes": ["relationships", "stress", "health"],
        "emotions": [{"name": "guilt", "intensity": 0.75}, {"name": "sadness", "intensity": 0.7}],
        "sentiment": {"score": -0.5, "label": "negative", "confidence": 0.82},
    },
    {
        "content": "Woke up with a racing heart. Sleep has been terrible for days. Body feels like it's running on fumes.",
        "title": "Burnout creeping in",
        "themes": ["health", "stress", "work"],
        "emotions": [{"name": "exhaustion", "intensity": 0.9}, {"name": "anxiety", "intensity": 0.75}],
        "sentiment": {"score": -0.6, "label": "negative", "confidence": 0.88},
    },
]

# ========== POSITIVE (Days 6–20) – varied, rich content ==========
JOURNAL_POSITIVE = [
    {
        "content": "Finished the big project I've been working on for weeks. Team loved the presentation. Feeling accomplished and relieved.",
        "title": "Project complete",
        "themes": ["work", "growth", "gratitude"],
        "emotions": [{"name": "pride", "intensity": 0.85}, {"name": "relief", "intensity": 0.8}],
        "sentiment": {"score": 0.75, "label": "positive", "confidence": 0.9},
    },
    {
        "content": "Wonderful dinner with family. We talked about plans for the summer – everyone's excited. Grateful for the love and support.",
        "title": "Family time",
        "themes": ["family", "relationships", "gratitude"],
        "emotions": [{"name": "joy", "intensity": 0.9}, {"name": "love", "intensity": 0.85}],
        "sentiment": {"score": 0.85, "label": "very_positive", "confidence": 0.92},
    },
    {
        "content": "Morning meditation and a good 8 hours of sleep. Feeling centered and ready for the day. Energy levels are high.",
        "title": "Restorative morning",
        "themes": ["mindfulness", "health", "growth"],
        "emotions": [{"name": "peace", "intensity": 0.85}, {"name": "energy", "intensity": 0.8}],
        "sentiment": {"score": 0.7, "label": "positive", "confidence": 0.88},
    },
    {
        "content": "Tried a new HIIT class. Intense but felt amazing afterwards. Prioritizing physical health again.",
        "title": "Fitness breakthrough",
        "themes": ["health", "growth"],
        "emotions": [{"name": "excitement", "intensity": 0.8}, {"name": "pride", "intensity": 0.75}],
        "sentiment": {"score": 0.65, "label": "positive", "confidence": 0.85},
    },
    {
        "content": "Long walk in the park. The sun and fresh air lifted my spirits. Feeling grounded and hopeful about the future.",
        "title": "Nature therapy",
        "themes": ["nature", "health", "mindfulness"],
        "emotions": [{"name": "peace", "intensity": 0.9}, {"name": "hope", "intensity": 0.75}],
        "sentiment": {"score": 0.7, "label": "positive", "confidence": 0.88},
    },
    {
        "content": "Had a great one-on-one with my mentor. She sees potential in my ideas. Feeling motivated to push forward.",
        "title": "Validation",
        "themes": ["work", "growth", "relationships"],
        "emotions": [{"name": "hope", "intensity": 0.85}, {"name": "gratitude", "intensity": 0.8}],
        "sentiment": {"score": 0.75, "label": "positive", "confidence": 0.88},
    },
    {
        "content": "Finally wrote that blog post I've been putting off. Creative block lifted. Clarity feels good.",
        "title": "Creative flow",
        "themes": ["creativity", "growth"],
        "emotions": [{"name": "clarity", "intensity": 0.85}, {"name": "satisfaction", "intensity": 0.8}],
        "sentiment": {"score": 0.65, "label": "positive", "confidence": 0.85},
    },
    {
        "content": "Reconnected with an old friend over coffee. We picked up right where we left off. Relationships matter.",
        "title": "Reconnection",
        "themes": ["relationships", "gratitude"],
        "emotions": [{"name": "joy", "intensity": 0.8}, {"name": "gratitude", "intensity": 0.85}],
        "sentiment": {"score": 0.7, "label": "positive", "confidence": 0.85},
    },
    {
        "content": "Set a new personal best on my morning run. Sleep has been solid. Feeling strong and capable.",
        "title": "New PR",
        "themes": ["health", "growth"],
        "emotions": [{"name": "pride", "intensity": 0.9}, {"name": "energy", "intensity": 0.85}],
        "sentiment": {"score": 0.8, "label": "positive", "confidence": 0.9},
    },
    {
        "content": "Took time to journal about my goals for the next quarter. Feels good to have clarity on what I want.",
        "title": "Goal clarity",
        "themes": ["growth", "mindfulness"],
        "emotions": [{"name": "hope", "intensity": 0.8}, {"name": "clarity", "intensity": 0.75}],
        "sentiment": {"score": 0.6, "label": "positive", "confidence": 0.82},
    },
]

# ========== NEUTRAL / MIXED ==========
JOURNAL_NEUTRAL = [
    {
        "content": "Routine day. Kept to my schedule. Nothing notable but steady.",
        "title": "Steady",
        "themes": ["work"],
        "emotions": [{"name": "contentment", "intensity": 0.5}],
        "sentiment": {"score": 0.05, "label": "neutral", "confidence": 0.6},
    },
    {
        "content": "Moderate sleep, moderate mood. Work is fine. Nothing to report.",
        "title": "Middle ground",
        "themes": ["health", "work"],
        "emotions": [{"name": "contentment", "intensity": 0.4}],
        "sentiment": {"score": 0.0, "label": "neutral", "confidence": 0.55},
    },
]


def rand_int(a: int, b: int) -> int:
    return random.randint(a, b)


def rand_float(a: float, b: float) -> float:
    return round(random.uniform(a, b), 2)


def clear_db(db):
    """Clear all data, respecting foreign keys."""
    tables = [
        "insights", "achievements", "goals", "voice_conversations", "scheduled_conversations",
        "prompts", "health_data", "mood_checkins", "journals", "users"
    ]
    for t in tables:
        try:
            db.execute(text(f"DELETE FROM {t}"))
        except Exception:
            pass
    db.commit()


def ensure_user(db):
    """Create user if not exists."""
    existing = db.query(models.User).filter(models.User.id == USER_ID).first()
    if existing:
        return
    now = time.time() * 1000
    user = models.User(
        id=USER_ID,
        anonymous_id=f"seed_user_{USER_ID}",
        created_at=now,
        preferences={
            "reminder_time": None,
            "weekly_insights": True,
            "voice_enabled": True,
            "theme": "warm",
            "haptic_feedback": True,
        },
        journaling_streak=0,
        total_entries=0,
        last_active_at=now,
    )
    db.add(user)
    db.commit()


def seed_health(
    db,
    d: date,
    sleep_quality: int,
    sleep_duration_min: int,
    resting_hr: int,
    hrv: int,
    active_mins: int = None,
) -> dict:
    """Create health data. Past 5 days use high HR, low sleep, high stress."""
    date_str = d.strftime("%Y-%m-%d")
    steps = (active_mins or 30) * 80
    recovery_score = min(100, int(hrv / 1.2) + rand_int(15, 45))
    readiness = "optimal" if recovery_score > 70 else "adequate" if recovery_score > 45 else "low"
    meditation = rand_int(0, 15) if random.random() > 0.5 else 0

    health = models.HealthData(
        user_id=USER_ID,
        date=date_str,
        source="synthetic",
        sleep={
            "duration_minutes": sleep_duration_min,
            "quality": sleep_quality,
            "deep_sleep_minutes": sleep_duration_min // 5,
            "rem_sleep_minutes": sleep_duration_min // 4,
        },
        activity={
            "steps": steps,
            "active_minutes": active_mins or 30,
            "calories_burned": steps // 25,
            "workouts": [],
            "stand_hours": rand_int(6, 14),
        },
        heart={
            "resting_hr": resting_hr,
            "average_hr": resting_hr + rand_int(8, 25),
            "max_hr": resting_hr + rand_int(50, 95),
            "hrv": hrv,
        },
        recovery={
            "score": recovery_score,
            "strain": rand_float(5, 16),
            "readiness": readiness,
        },
        mindfulness={
            "meditation_minutes": meditation,
            "breathing_minutes": rand_int(0, 5),
        },
        created_at=time.time() * 1000,
    )
    db.add(health)
    return {"sleep_quality": sleep_quality, "active_mins": active_mins or 30, "hrv": hrv}


def date_to_utc_noon_ms(d: date) -> float:
    dt = datetime(d.year, d.month, d.day, 12, 0, 0, tzinfo=timezone.utc)
    return dt.timestamp() * 1000


def seed_journal(db, d: date, sample: dict, is_voice: bool):
    """Create one journal entry from sample."""
    tod = random.choice(TIME_OF_DAY)
    hour = {"morning": rand_int(7, 10), "afternoon": rand_int(12, 15),
            "evening": rand_int(17, 20), "night": rand_int(21, 23)}[tod]
    base_ts = date_to_utc_noon_ms(d)
    ts = base_ts + (hour - 12) * 3600000
    dow = DAY_NAMES[d.weekday()]

    journal = models.Journal(
        user_id=USER_ID,
        content=sample["content"],
        title=sample.get("title"),
        prompt_used=None,
        is_voice_entry=is_voice,
        voice_transcript=sample["content"] if is_voice else None,
        sentiment=sample["sentiment"],
        themes=sample["themes"],
        emotions=sample["emotions"],
        created_at=ts,
        updated_at=ts,
        time_of_day=tod,
        day_of_week=dow,
        tags=sample["themes"],
        word_count=len(sample["content"].split()),
        entry_type=random.choice(ENTRY_TYPES),
        is_locked=False,
        is_archived=False,
    )
    db.add(journal)


def seed_prompts(db):
    """Seed prompts for question generation context – based on journal themes."""
    now = time.time() * 1000
    prompts = [
        ("How has your sleep been lately?", "health", {"recent_theme": "health", "health_context": "low_sleep"}),
        ("What's been on your mind about work?", "reflection", {"recent_theme": "work"}),
        ("How are you feeling about your relationships right now?", "relationships", {"recent_theme": "relationships"}),
        ("What would help you feel more grounded today?", "growth", {"recent_emotion": "anxiety"}),
        ("Is there something you've been putting off that you could start?", "growth", {"recent_theme": "creativity"}),
    ]
    for text, category, based_on in prompts:
        p = models.Prompt(
            user_id=USER_ID,
            text=text,
            category=category,
            based_on=based_on,
            is_used=random.random() > 0.3,
            created_at=now - rand_int(0, 7) * 86400 * 1000,
            used_at=now - rand_int(0, 3) * 86400 * 1000 if random.random() > 0.5 else None,
        )
        db.add(p)
    db.commit()


def run_seed():
    db = SessionLocal()
    try:
        logger.info("Clearing database...")
        clear_db(db)

        logger.info("Creating user...")
        ensure_user(db)

        logger.info("Seeding %d days (past %d negative + bad health)...", DAYS, PAST_NEGATIVE_DAYS)
        today = date.today()
        random.seed(42)

        for i in range(DAYS - 1, -1, -1):
            d = today - timedelta(days=i)
            is_negative_period = i < PAST_NEGATIVE_DAYS

            # Health: Past 5 days = high HR, low sleep, low HRV, high stress
            if is_negative_period:
                sleep_quality = rand_int(25, 45)
                sleep_duration = rand_int(240, 360)  # 4–6 hours
                resting_hr = rand_int(78, 95)
                hrv = rand_int(25, 42)
                active_mins = rand_int(10, 35)
            else:
                sleep_quality = rand_int(65, 95)
                sleep_duration = rand_int(390, 510)  # 6.5–8.5 hours
                resting_hr = rand_int(55, 72)
                hrv = rand_int(50, 90)
                active_mins = rand_int(30, 100)

            seed_health(db, d, sleep_quality, sleep_duration, resting_hr, hrv, active_mins)

            # Journals: Past 5 days = negative only; else = positive/neutral mix
            num_entries = rand_int(1, 2)
            pool = JOURNAL_NEGATIVE if is_negative_period else JOURNAL_POSITIVE + JOURNAL_NEUTRAL
            samples = random.sample(pool, min(num_entries, len(pool)))
            for j, sample in enumerate(samples):
                # ~50% voice, ~50% text
                is_voice = (i + j) % 2 == 0
                seed_journal(db, d, sample, is_voice=is_voice)

            db.commit()

        # Prompts for question generation
        seed_prompts(db)

        # Update user stats
        journals_count = db.query(models.Journal).filter(models.Journal.user_id == USER_ID).count()
        health_count = db.query(models.HealthData).filter(models.HealthData.user_id == USER_ID).count()
        user = db.query(models.User).filter(models.User.id == USER_ID).first()
        if user:
            user.total_entries = journals_count
            user.journaling_streak = DAYS
            user.last_active_at = time.time() * 1000
            db.commit()

        # Weekly insight
        period_end = today.strftime("%Y-%m-%d")
        period_start = (today - timedelta(days=6)).strftime("%Y-%m-%d")
        journals = db.query(models.Journal).filter(models.Journal.user_id == USER_ID).all()
        emotion_counts = {}
        theme_counts = {}
        for j in journals:
            for e in (j.emotions or []):
                n = e.get("name", "neutral")
                emotion_counts[n] = emotion_counts.get(n, 0) + 1
            for t in (j.themes or []):
                theme_counts[t] = theme_counts.get(t, 0) + 1
        top_emotions = sorted(emotion_counts.items(), key=lambda x: -x[1])[:5]
        top_themes = sorted(theme_counts.items(), key=lambda x: -x[1])[:5]
        insight = models.Insight(
            user_id=USER_ID,
            type="weekly",
            period_start=period_start,
            period_end=period_end,
            summary="Your recent entries show stress and sleep struggles in the past 5 days, while earlier weeks were more positive. Sleep quality and HRV tend to align with mood.",
            patterns=[
                {"type": "correlation", "title": "Sleep & Mood", "description": "On days with 7+ hours sleep, your entries were more positive.", "confidence": 0.88},
                {"type": "trend", "title": "Recent Stress", "description": "The last 5 days show higher stress and anxiety. Consider prioritizing rest.", "confidence": 0.9},
            ],
            emotional_trend={
                "average_sentiment": -0.1,
                "sentiment_change": -0.25,
                "dominant_emotions": [e[0] for e in top_emotions[:3]],
                "emotional_variability": 0.5,
            },
            top_themes=[{"theme": t[0], "frequency": t[1], "sentiment_when_mentioned": 0.2} for t in top_themes],
            health_correlations=[
                {"factor": "sleep_quality", "correlation": "positive", "insight": "Better sleep appears to boost your mood"},
                {"factor": "hrv", "correlation": "positive", "insight": "Higher HRV days correlate with more positive reflections"},
            ],
            suggestions=["Prioritize sleep this week", "Consider a wind-down routine"],
            stats={
                "entries_count": journals_count,
                "total_words": sum(j.word_count or 0 for j in journals),
                "average_words_per_entry": sum(j.word_count or 0 for j in journals) // journals_count if journals_count else 0,
                "streak_days": DAYS,
                "most_active_time": "evening",
            },
            is_read=False,
            created_at=time.time() * 1000,
        )
        db.add(insight)
        db.commit()

        logger.info("Done. Created %d journals, %d health records, prompts, 1 weekly insight.", journals_count, health_count)
    finally:
        db.close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
    run_seed()
