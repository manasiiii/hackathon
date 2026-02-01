from sqlalchemy import Column, Integer, String, Float, Boolean, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    anonymous_id = Column(String, unique=True, index=True)
    email = Column(String, unique=True, nullable=True, index=True)
    name = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    created_at = Column(Float)
    preferences = Column(JSON, default={
        "reminder_time": None,
        "weekly_insights": True,
        "voice_enabled": True,
        "theme": "ethereal",
        "haptic_feedback": True
    })
    journaling_streak = Column(Integer, default=0)
    total_entries = Column(Integer, default=0)
    last_active_at = Column(Float)

    journals = relationship("Journal", back_populates="user")
    mood_checkins = relationship("MoodCheckin", back_populates="user")
    health_data = relationship("HealthData", back_populates="user")
    prompts = relationship("Prompt", back_populates="user")
    insights = relationship("Insight", back_populates="user")
    voice_conversations = relationship("VoiceConversation", back_populates="user")
    goals = relationship("Goal", back_populates="user")
    achievements = relationship("Achievement", back_populates="user")
    scheduled_conversations = relationship("ScheduledConversation", back_populates="user")


class Journal(Base):
    __tablename__ = "journals"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    content = Column(Text)
    title = Column(String, nullable=True)
    prompt_used = Column(String, nullable=True)
    is_voice_entry = Column(Boolean, default=False)
    voice_transcript = Column(Text, nullable=True)
    audio_url = Column(String, nullable=True)
    sentiment = Column(JSON)  # {score, label, confidence}
    themes = Column(JSON, default=[])
    emotions = Column(JSON, default=[])  # [{name, intensity}]
    created_at = Column(Float, index=True)
    updated_at = Column(Float)
    time_of_day = Column(String)  # morning, afternoon, evening, night
    day_of_week = Column(String)
    location = Column(String, nullable=True)
    tags = Column(JSON, default=[])
    word_count = Column(Integer)
    entry_type = Column(String)  # quick_checkin, reflection, gratitude, voice_note, guided
    is_locked = Column(Boolean, default=False)
    is_archived = Column(Boolean, default=False)

    user = relationship("User", back_populates="journals")


class MoodCheckin(Base):
    __tablename__ = "mood_checkins"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    mood = Column(Integer)  # 1-5 scale
    mood_emoji = Column(String)
    energy = Column(Integer)  # 1-5 scale
    stress = Column(Integer)  # 1-5 scale
    sleep = Column(Integer, nullable=True)  # 1-5 scale
    note = Column(Text, nullable=True)
    created_at = Column(Float, index=True)
    time_of_day = Column(String)

    user = relationship("User", back_populates="mood_checkins")


class HealthData(Base):
    __tablename__ = "health_data"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    date = Column(String, index=True)  # "2024-01-15"
    source = Column(String)  # apple_health, whoop, synthetic, manual
    sleep = Column(JSON, nullable=True)  # {duration_minutes, quality, deep_sleep_minutes, ...}
    activity = Column(JSON, nullable=True)  # {steps, active_minutes, calories_burned, workouts, ...}
    heart = Column(JSON, nullable=True)  # {resting_hr, average_hr, max_hr, hrv}
    recovery = Column(JSON, nullable=True)  # {score, strain, readiness}
    mindfulness = Column(JSON, nullable=True)  # {meditation_minutes, breathing_minutes}
    created_at = Column(Float)

    user = relationship("User", back_populates="health_data")


class Prompt(Base):
    __tablename__ = "prompts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    text = Column(Text)
    category = Column(String)  # reflection, gratitude, growth, emotions, etc.
    based_on = Column(JSON, nullable=True)  # {recent_theme, recent_emotion, health_context}
    is_used = Column(Boolean, default=False, index=True)
    created_at = Column(Float)
    used_at = Column(Float, nullable=True)

    user = relationship("User", back_populates="prompts")


class Insight(Base):
    __tablename__ = "insights"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    type = Column(String)  # weekly, monthly
    period_start = Column(String, index=True)
    period_end = Column(String)
    summary = Column(Text)
    patterns = Column(JSON, default=[])  # [{type, title, description, confidence}]
    emotional_trend = Column(JSON)  # {average_sentiment, sentiment_change, dominant_emotions, emotional_variability}
    top_themes = Column(JSON, default=[])  # [{theme, frequency, sentiment_when_mentioned}]
    health_correlations = Column(JSON, nullable=True)  # [{factor, correlation, insight}]
    suggestions = Column(JSON, default=[])
    stats = Column(JSON)  # {entries_count, total_words, average_words_per_entry, streak_days, most_active_time}
    is_read = Column(Boolean, default=False)
    created_at = Column(Float)

    user = relationship("User", back_populates="insights")


class VoiceConversation(Base):
    __tablename__ = "voice_conversations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    session_id = Column(String, unique=True, index=True)
    messages = Column(JSON, default=[])  # [{role, content, timestamp}]
    journal_created = Column(Integer, nullable=True)  # Journal ID
    duration = Column(Integer)  # seconds
    created_at = Column(Float)

    user = relationship("User", back_populates="voice_conversations")


class Goal(Base):
    __tablename__ = "goals"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    title = Column(String)
    description = Column(Text, nullable=True)
    category = Column(String)
    target_date = Column(String, nullable=True)
    status = Column(String, default="active", index=True)  # active, completed, paused, archived
    progress = Column(Integer, default=0)  # 0-100
    related_entries = Column(JSON, default=[])  # Journal IDs
    created_at = Column(Float)
    updated_at = Column(Float)

    user = relationship("User", back_populates="goals")


class Achievement(Base):
    __tablename__ = "achievements"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    type = Column(String)  # streak_7, first_voice, deep_reflection, etc.
    title = Column(String)
    description = Column(Text)
    icon_name = Column(String)
    unlocked_at = Column(Float)
    is_new = Column(Boolean, default=True)

    user = relationship("User", back_populates="achievements")


class ScheduledConversation(Base):
    __tablename__ = "scheduled_conversations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    time = Column(String)  # "09:00", "21:30" (24-hour format)
    days_of_week = Column(JSON, default=["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"])
    is_enabled = Column(Boolean, default=True)
    timezone = Column(String, default="UTC")
    conversation_mode = Column(String, default="voice")  # "voice" or "text"
    last_triggered_at = Column(Float, nullable=True)
    created_at = Column(Float)
    updated_at = Column(Float)

    user = relationship("User", back_populates="scheduled_conversations")
