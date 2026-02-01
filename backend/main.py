import os
from dotenv import load_dotenv
from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session
from typing import Optional, List
import time
import math

# Load environment variables from .env file
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

from database import engine, get_db, Base
import models
import schemas
from app.core.logging_config import setup_logging, get_logger
from app.core.error_handlers import register_exception_handlers
from app.core.middleware import RequestLoggingMiddleware

logger = get_logger(__name__)

# Agent orchestrator (OpenAI) - optional, used when OPENAI_API_KEY is set
_orchestrator = None

def get_orchestrator(db: Session = Depends(get_db)):
    """Get agent orchestrator if OPENAI_API_KEY is configured."""
    global _orchestrator
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        return None
    try:
        from app.services.openai_service import OpenAIService
        from app.agents.orchestrator import AgentOrchestrator
        llm = OpenAIService(api_key=api_key)
        return AgentOrchestrator(db, llm, models)
    except Exception as e:
        logger.warning("Agents unavailable: %s", e)
        return None

# Create tables
Base.metadata.create_all(bind=engine)

# Migration: add conversation_mode if missing (for existing DBs)
try:
    with engine.connect() as conn:
        conn.execute(
            text("ALTER TABLE scheduled_conversations ADD COLUMN conversation_mode VARCHAR DEFAULT 'voice'")
        )
        conn.commit()
except Exception:
    pass  # Column already exists

app = FastAPI(title="InnerCircle API", version="1.0.0")


@app.on_event("startup")
def on_startup() -> None:
    """Initialize logging and core services on startup."""
    setup_logging(os.getenv("LOG_LEVEL", "INFO"))
    logger.info("InnerCircle API starting")


@app.on_event("shutdown")
def on_shutdown() -> None:
    """Cleanup on shutdown."""
    logger.info("InnerCircle API shutting down")


# Exception handlers (consistent error responses)
register_exception_handlers(app)

# Middleware order: last added = first to run on request
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============ Helper Functions ============

def calculate_correlation(x: List[float], y: List[float]) -> float:
    n = len(x)
    if n == 0:
        return 0.0
    sum_x = sum(x)
    sum_y = sum(y)
    sum_xy = sum(xi * yi for xi, yi in zip(x, y))
    sum_x2 = sum(xi ** 2 for xi in x)
    sum_y2 = sum(yi ** 2 for yi in y)

    numerator = n * sum_xy - sum_x * sum_y
    denominator = math.sqrt((n * sum_x2 - sum_x ** 2) * (n * sum_y2 - sum_y ** 2))

    return 0.0 if denominator == 0 else numerator / denominator


# ============ User Endpoints ============

@app.get("/api/users/{user_id}", response_model=schemas.UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db)):
    """Get user by ID. Streak and longest_streak computed from journals."""
    from app.utils import compute_streak_from_journals, compute_longest_streak

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.journaling_streak = compute_streak_from_journals(db, user_id)
    longest = compute_longest_streak(db, user_id)
    resp = schemas.UserResponse.model_validate(user)
    # Best streak is at least current streak
    best = max(longest, resp.journaling_streak)
    return resp.model_copy(update={"longest_streak": best})


# ============ Journal Endpoints ============

@app.get("/api/journals/question")
def get_journal_question(
    user_id: int = Query(..., ge=1),
    days: int = Query(3, ge=1, le=30),
    include_health: bool = Query(True),
    db: Session = Depends(get_db),
):
    """Get personalized starting question from orchestrator (based on last N days)."""
    orchestrator = get_orchestrator(db)
    if not orchestrator:
        import random
        fallbacks = [
            "How are you feeling right now?",
            "What's been on your mind today?",
            "How would you describe your energy level?",
            "What's one thing you're grateful for today?",
        ]
        return {"question": random.choice(fallbacks), "context_used": ["fallback"]}
    return orchestrator.get_starting_question(user_id=user_id, include_health=include_health, days=days)


@app.post("/api/voice/reflection", response_model=schemas.VoiceReflectionResponse)
def get_voice_reflection(
    body: schemas.VoiceReflectionRequest,
    db: Session = Depends(get_db),
):
    """Get AI reflection for voice session - uses emotion + reflection agents."""
    orchestrator = get_orchestrator(db)
    if not orchestrator:
        return schemas.VoiceReflectionResponse(response="Thank you for sharing. I'm here to listen.")
    response = orchestrator.get_voice_reflection(body.content)
    return schemas.VoiceReflectionResponse(response=response)


@app.get("/api/journals", response_model=List[schemas.JournalResponse])
def get_journals(
    user_id: int,
    limit: int = Query(default=50, le=100),
    db: Session = Depends(get_db)
):
    """Get user's journal entries"""
    journals = db.query(models.Journal).filter(
        models.Journal.user_id == user_id,
        models.Journal.is_archived == False
    ).order_by(models.Journal.created_at.desc()).limit(limit).all()
    return journals


@app.get("/api/journals/analytics", response_model=schemas.JournalAnalytics)
def get_journal_analytics(
    user_id: int,
    days: int = Query(default=30),
    db: Session = Depends(get_db)
):
    """Get journal analytics"""
    start_date = (time.time() - days * 86400) * 1000

    journals = db.query(models.Journal).filter(
        models.Journal.user_id == user_id,
        models.Journal.created_at >= start_date,
        models.Journal.is_archived == False
    ).all()

    total_entries = len(journals)
    total_words = sum(j.word_count for j in journals)

    # Theme frequency
    theme_count = {}
    for j in journals:
        for theme in (j.themes or []):
            theme_count[theme] = theme_count.get(theme, 0) + 1

    # Emotion frequency
    emotion_count = {}
    for j in journals:
        for emotion in (j.emotions or []):
            name = emotion.get("name")
            if name:
                if name not in emotion_count:
                    emotion_count[name] = {"total": 0, "intensity": 0}
                emotion_count[name]["total"] += 1
                emotion_count[name]["intensity"] += emotion.get("intensity", 0)

    # Time distribution
    time_dist = {"morning": 0, "afternoon": 0, "evening": 0, "night": 0}
    for j in journals:
        if j.time_of_day in time_dist:
            time_dist[j.time_of_day] += 1

    return {
        "total_entries": total_entries,
        "total_words": total_words,
        "avg_words_per_entry": total_words // total_entries if total_entries else 0,
        "top_themes": sorted(
            [{"theme": k, "count": v} for k, v in theme_count.items()],
            key=lambda x: x["count"], reverse=True
        )[:5],
        "top_emotions": sorted(
            [{"name": k, "count": v["total"], "avg_intensity": v["intensity"] / v["total"]}
             for k, v in emotion_count.items()],
            key=lambda x: x["count"], reverse=True
        )[:5],
        "time_distribution": time_dist,
    }


@app.get("/api/journals/{journal_id}", response_model=schemas.JournalResponse)
def get_journal(journal_id: int, db: Session = Depends(get_db)):
    """Get single journal entry"""
    journal = db.query(models.Journal).filter(models.Journal.id == journal_id).first()
    if not journal:
        raise HTTPException(status_code=404, detail="Journal not found")
    return journal


def _update_user_on_journal(db: Session, user_id: int, now: float) -> None:
    from app.utils import update_user_on_journal
    user = db.query(models.User).filter(models.User.id == user_id).first()
    update_user_on_journal(user, now)


def ensure_user_exists(db: Session, user_id: int) -> None:
    """Create user if not exists (for demo/onboarding)."""
    if db.query(models.User).filter(models.User.id == user_id).first():
        return
    now = time.time() * 1000
    user = models.User(
        id=user_id,
        anonymous_id=f"user_{user_id}",
        created_at=now,
        preferences={},
        journaling_streak=0,
        total_entries=0,
        last_active_at=now,
    )
    db.add(user)
    db.commit()


@app.post("/api/journals", response_model=schemas.JournalResponse)
def create_journal(
    journal: schemas.JournalCreate,
    db: Session = Depends(get_db),
):
    """Create journal entry. Always uses Emotion Analyst (requires OPENAI_API_KEY)."""
    ensure_user_exists(db, journal.user_id)

    orchestrator = get_orchestrator(db)
    if not orchestrator:
        raise HTTPException(
            status_code=503,
            detail="Agents not configured. Set OPENAI_API_KEY for journal creation.",
        )

    return orchestrator.process_written_journal(
        user_id=journal.user_id,
        content=journal.content,
        title=journal.title,
        prompt_used=journal.prompt_used,
        entry_type=journal.entry_type,
        is_voice_entry=journal.is_voice_entry,
        voice_transcript=journal.voice_transcript,
    )


# ============ Insight Endpoints ============

@app.get("/api/insights/weekly", response_model=Optional[schemas.InsightResponse])
def get_weekly_insight(user_id: int, db: Session = Depends(get_db)):
    """Get latest weekly insight (from DB, created by analytics agent)."""
    insight = db.query(models.Insight).filter(
        models.Insight.user_id == user_id,
        models.Insight.type == "weekly"
    ).order_by(models.Insight.created_at.desc()).first()
    return insight


@app.post("/api/insights/weekly/generate")
def generate_weekly_insight(
    user_id: int = Query(..., ge=1),
    db: Session = Depends(get_db),
):
    """Generate weekly insight via analytics agent (correlations, patterns, summaries)."""
    orchestrator = get_orchestrator(db)
    if not orchestrator:
        raise HTTPException(
            status_code=503,
            detail="OpenAI agents not configured. Set OPENAI_API_KEY for analytics.",
        )
    try:
        result = orchestrator.get_weekly_insights(user_id=user_id)
        return result
    except Exception as e:
        logger.error("Weekly insight generation failed: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to generate weekly insight")


@app.get("/api/insights/sleep-vs-emotions", response_model=schemas.SleepVsEmotionsResponse)
def get_sleep_vs_emotions(
    user_id: int,
    db: Session = Depends(get_db)
):
    """Sleep vs emotions: More sleep vs Less sleep, emotion counts. No days."""
    now = time.time()
    today_start = int(now // 86400) * 86400
    start_date = time.strftime("%Y-%m-%d", time.gmtime(today_start - 14 * 86400))
    end_date = time.strftime("%Y-%m-%d", time.gmtime())

    health_data = db.query(models.HealthData).filter(
        models.HealthData.user_id == user_id,
        models.HealthData.date >= start_date,
        models.HealthData.date <= end_date
    ).all()

    journal_start = (today_start - 14 * 86400) * 1000
    journal_end = (today_start + 86400) * 1000
    journals = db.query(models.Journal).filter(
        models.Journal.user_id == user_id,
        models.Journal.created_at >= journal_start,
        models.Journal.created_at < journal_end,
        models.Journal.is_archived == False
    ).all()

    # Build health_by_date (sleep duration in min)
    health_by_date = {}
    for h in health_data:
        dur = None
        if h.sleep:
            dur = h.sleep.get("duration_minutes")
        if dur is not None:
            health_by_date[h.date] = dur

    # Bucket days by sleep: >= 7h (420 min) = more, < 7h = less
    MORE_SLEEP_MIN = 420
    more_sleep_dates = {d for d, m in health_by_date.items() if m >= MORE_SLEEP_MIN}
    less_sleep_dates = {d for d, m in health_by_date.items() if 0 < m < MORE_SLEEP_MIN}

    # Aggregate emotions by group (from journals on those dates)
    more_emotions = {}
    less_emotions = {}
    all_emotions = set()

    for j in journals:
        date_key = time.strftime("%Y-%m-%d", time.gmtime(j.created_at / 1000))
        for e in (j.emotions or []):
            if isinstance(e, dict) and e.get("name"):
                name = str(e.get("name")).strip().lower()
                all_emotions.add(name)
                count = 1
                if date_key in more_sleep_dates:
                    more_emotions[name] = more_emotions.get(name, 0) + count
                elif date_key in less_sleep_dates:
                    less_emotions[name] = less_emotions.get(name, 0) + count

    more_avg = (
        sum(health_by_date[d] for d in more_sleep_dates) / len(more_sleep_dates) / 60
        if more_sleep_dates else None
    )
    less_avg = (
        sum(health_by_date[d] for d in less_sleep_dates) / len(less_sleep_dates) / 60
        if less_sleep_dates else None
    )

    groups = []
    if more_sleep_dates:
        groups.append(schemas.SleepVsEmotionsGroup(
            label="More sleep",
            emotions=more_emotions,
            sleepHours=round(more_avg, 1) if more_avg else None
        ))
    if less_sleep_dates:
        groups.append(schemas.SleepVsEmotionsGroup(
            label="Less sleep",
            emotions=less_emotions,
            sleepHours=round(less_avg, 1) if less_avg else None
        ))

    emotion_order = sorted(
        e for e in all_emotions
        if any(g.emotions.get(e, 0) > 0 for g in groups)
    ) if groups else []

    return {
        "groups": groups,
        "emotionOrder": emotion_order,
    }


# ============ Health Endpoints ============

@app.get("/api/health/correlations", response_model=schemas.HealthMoodCorrelations)
def get_health_mood_correlations(
    user_id: int,
    days: int = Query(default=30),
    db: Session = Depends(get_db)
):
    """Get health-journal sentiment correlations"""
    start_date = time.strftime("%Y-%m-%d", time.gmtime(time.time() - days * 86400))
    end_date = time.strftime("%Y-%m-%d", time.gmtime())

    health_data = db.query(models.HealthData).filter(
        models.HealthData.user_id == user_id,
        models.HealthData.date >= start_date,
        models.HealthData.date <= end_date
    ).all()

    journal_start = (time.time() - days * 86400) * 1000
    journals = db.query(models.Journal).filter(
        models.Journal.user_id == user_id,
        models.Journal.created_at >= journal_start,
        models.Journal.is_archived == False
    ).all()

    sentiment_by_date = {}
    for j in journals:
        date_key = time.strftime("%Y-%m-%d", time.gmtime(j.created_at / 1000))
        if date_key not in sentiment_by_date:
            sentiment_by_date[date_key] = []
        sentiment_by_date[date_key].append(j.sentiment.get("score", 0) if j.sentiment else 0)
    sentiment_by_date = {k: sum(v) / len(v) for k, v in sentiment_by_date.items() if v}

    correlations = []

    # Sleep vs Sentiment
    sleep_pairs = []
    for h in health_data:
        if h.sleep and h.date in sentiment_by_date:
            sleep_pairs.append((h.sleep.get("quality", 0), sentiment_by_date[h.date]))

    if len(sleep_pairs) >= 3:
        sleep_corr = calculate_correlation([p[0] for p in sleep_pairs], [p[1] for p in sleep_pairs])
        correlations.append({
            "factor": "Sleep Quality",
            "correlation": "positive" if sleep_corr > 0.2 else "negative" if sleep_corr < -0.2 else "neutral",
            "strength": abs(sleep_corr),
            "insight": "Better sleep appears to boost your mood" if sleep_corr > 0.3 else "Sleep quality has a moderate relationship with your mood"
        })

    # Activity vs Sentiment
    activity_pairs = []
    for h in health_data:
        if h.activity and h.date in sentiment_by_date:
            activity_pairs.append((h.activity.get("active_minutes", 0), sentiment_by_date[h.date]))

    if len(activity_pairs) >= 3:
        activity_corr = calculate_correlation([p[0] for p in activity_pairs], [p[1] for p in activity_pairs])
        correlations.append({
            "factor": "Physical Activity",
            "correlation": "positive" if activity_corr > 0.2 else "negative" if activity_corr < -0.2 else "neutral",
            "strength": abs(activity_corr),
            "insight": "Movement seems to lift your spirits" if activity_corr > 0.3 else "Physical activity has some effect on your mood"
        })

    # HRV vs Sentiment
    hrv_pairs = []
    for h in health_data:
        if h.heart and h.heart.get("hrv") and h.date in sentiment_by_date:
            hrv_pairs.append((h.heart.get("hrv"), sentiment_by_date[h.date]))

    if len(hrv_pairs) >= 3:
        hrv_corr = calculate_correlation([p[0] for p in hrv_pairs], [p[1] for p in hrv_pairs])
        correlations.append({
            "factor": "Heart Rate Variability",
            "correlation": "positive" if hrv_corr > 0.2 else "negative" if hrv_corr < -0.2 else "neutral",
            "strength": abs(hrv_corr),
            "insight": "Higher HRV days correlate with better moods" if hrv_corr > 0.3 else "Your HRV shows interesting patterns with your emotional state"
        })

    return {
        "correlations": correlations,
        "data_points": len(health_data),
        "mood_data_points": len(journals)
    }



# ============ Scheduled Conversation Endpoints ============

@app.post("/api/schedule", response_model=schemas.ScheduledConversationResponse)
def create_schedule(schedule: schemas.ScheduledConversationCreate, db: Session = Depends(get_db)):
    """Create a new scheduled conversation time"""

    # Check if user already has a schedule
    existing = db.query(models.ScheduledConversation).filter(
        models.ScheduledConversation.user_id == schedule.user_id
    ).first()

    if existing:
        # Update existing schedule instead of creating new
        existing.time = schedule.time
        existing.days_of_week = schedule.days_of_week
        existing.timezone = schedule.timezone
        existing.conversation_mode = schedule.conversation_mode
        existing.is_enabled = True
        existing.updated_at = time.time() * 1000
        db.commit()
        db.refresh(existing)
        return existing

    now = time.time() * 1000
    db_schedule = models.ScheduledConversation(
        user_id=schedule.user_id,
        time=schedule.time,
        days_of_week=schedule.days_of_week,
        timezone=schedule.timezone,
        conversation_mode=schedule.conversation_mode,
        is_enabled=True,
        created_at=now,
        updated_at=now
    )
    db.add(db_schedule)
    db.commit()
    db.refresh(db_schedule)
    return db_schedule


@app.get("/api/schedule", response_model=List[schemas.ScheduledConversationResponse])
def get_schedules(user_id: int, db: Session = Depends(get_db)):
    """Get user's scheduled conversation times"""
    schedules = db.query(models.ScheduledConversation).filter(
        models.ScheduledConversation.user_id == user_id
    ).all()
    return schedules


@app.patch("/api/schedule/{schedule_id}", response_model=schemas.ScheduledConversationResponse)
def update_schedule(schedule_id: int, update: schemas.ScheduledConversationUpdate, db: Session = Depends(get_db)):
    """Update a scheduled conversation"""
    schedule = db.query(models.ScheduledConversation).filter(
        models.ScheduledConversation.id == schedule_id
    ).first()

    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    update_data = update.model_dump(exclude_none=True)
    for key, value in update_data.items():
        setattr(schedule, key, value)

    schedule.updated_at = time.time() * 1000
    db.commit()
    db.refresh(schedule)
    return schedule


# ============ Root Endpoint ============

@app.get("/")
def root():
    return {"message": "InnerCircle API", "version": "1.0.0"}


@app.post("/api/seed")
def seed_database():
    """Clear DB and seed 20 days of synthetic data (past 5 negative + bad health)."""
    import subprocess
    import sys
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    result = subprocess.run(
        [sys.executable, os.path.join(backend_dir, "seed.py")],
        capture_output=True,
        text=True,
        cwd=backend_dir,
    )
    if result.returncode != 0:
        logger.error("Seed failed: %s", result.stderr)
        raise HTTPException(status_code=500, detail="Seed failed")
    return {"status": "ok", "message": "Database seeded with 20 days of data (past 5 negative + bad health)"}


@app.get("/api/health-check")
def health_check():
    return {"status": "healthy"}
