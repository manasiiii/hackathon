from pydantic import BaseModel
from typing import Optional, List, Literal


# ============ User Schemas ============

class UserResponse(BaseModel):
    id: int
    anonymous_id: str
    email: Optional[str] = None
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: float
    preferences: dict
    journaling_streak: int
    total_entries: int
    last_active_at: float
    longest_streak: int = 0

    class Config:
        from_attributes = True


# ============ Sentiment Schema ============

class Sentiment(BaseModel):
    score: float  # -1 to 1
    label: Literal["very_negative", "negative", "neutral", "positive", "very_positive"]
    confidence: float


class Emotion(BaseModel):
    name: str
    intensity: float  # 0-1


# ============ Journal Schemas ============

class JournalCreate(BaseModel):
    user_id: int
    content: str
    title: Optional[str] = None
    prompt_used: Optional[str] = None
    is_voice_entry: bool = False
    voice_transcript: Optional[str] = None
    tags: Optional[List[str]] = None
    entry_type: Literal["quick_checkin", "reflection", "gratitude", "voice_note", "guided"]
    location: Optional[str] = None


class VoiceReflectionRequest(BaseModel):
    content: str


class VoiceReflectionResponse(BaseModel):
    response: str


class JournalResponse(BaseModel):
    id: int
    user_id: int
    content: str
    title: Optional[str] = None
    prompt_used: Optional[str] = None
    is_voice_entry: bool
    voice_transcript: Optional[str] = None
    audio_url: Optional[str] = None
    sentiment: dict
    themes: List[str]
    emotions: List[dict]
    created_at: float
    updated_at: float
    time_of_day: str
    day_of_week: str
    location: Optional[str] = None
    tags: List[str]
    word_count: int
    entry_type: str
    is_locked: bool
    is_archived: bool

    class Config:
        from_attributes = True


class JournalAnalytics(BaseModel):
    total_entries: int
    total_words: int
    avg_words_per_entry: int
    top_themes: List[dict]
    top_emotions: List[dict]
    time_distribution: dict


# ============ Insight Schemas ============

class Pattern(BaseModel):
    type: str
    title: str
    description: str
    confidence: float


class EmotionalTrend(BaseModel):
    average_sentiment: float
    sentiment_change: float
    dominant_emotions: List[str]
    emotional_variability: float


class TopTheme(BaseModel):
    theme: str
    frequency: int
    sentiment_when_mentioned: float


class HealthCorrelation(BaseModel):
    factor: str
    correlation: Literal["positive", "negative", "neutral"]
    insight: str


class InsightStats(BaseModel):
    entries_count: int
    total_words: int
    average_words_per_entry: int
    streak_days: int
    most_active_time: str


class InsightCreate(BaseModel):
    user_id: int
    type: Literal["weekly", "monthly"]
    period_start: str
    period_end: str
    summary: str
    patterns: List[Pattern]
    emotional_trend: EmotionalTrend
    top_themes: List[TopTheme]
    health_correlations: Optional[List[HealthCorrelation]] = None
    suggestions: List[str]
    stats: InsightStats


class InsightResponse(BaseModel):
    id: int
    user_id: int
    type: str
    period_start: str
    period_end: str
    summary: str
    patterns: List[dict]
    emotional_trend: dict
    top_themes: List[dict]
    health_correlations: Optional[List[dict]] = None
    suggestions: List[str]
    stats: dict
    is_read: bool
    created_at: float

    class Config:
        from_attributes = True


class SleepVsEmotionsGroup(BaseModel):
    label: str
    emotions: dict  # { emotion_name: count }
    sleepHours: Optional[float] = None


class SleepVsEmotionsResponse(BaseModel):
    groups: List[SleepVsEmotionsGroup]
    emotionOrder: List[str]


# ============ Health Schemas ============

class SleepData(BaseModel):
    duration_minutes: int
    quality: int  # 0-100
    deep_sleep_minutes: Optional[int] = None
    rem_sleep_minutes: Optional[int] = None
    light_sleep_minutes: Optional[int] = None
    awake_minutes: Optional[int] = None
    sleep_latency: Optional[int] = None
    bedtime: Optional[str] = None
    wake_time: Optional[str] = None


class Workout(BaseModel):
    type: str
    duration_minutes: int
    intensity: Optional[str] = None


class ActivityData(BaseModel):
    steps: int
    active_minutes: int
    calories_burned: int
    workouts: List[Workout] = []
    stand_hours: Optional[int] = None


class HeartData(BaseModel):
    resting_hr: int
    average_hr: int
    max_hr: Optional[int] = None
    hrv: Optional[int] = None


class RecoveryData(BaseModel):
    score: int  # 0-100
    strain: float  # 0-21
    readiness: Literal["optimal", "adequate", "low"]


class MindfulnessData(BaseModel):
    meditation_minutes: int
    breathing_minutes: int


class HealthDataCreate(BaseModel):
    user_id: int
    date: str  # "2024-01-15"
    source: Literal["apple_health", "whoop", "synthetic", "manual"]
    sleep: Optional[SleepData] = None
    activity: Optional[ActivityData] = None
    heart: Optional[HeartData] = None
    recovery: Optional[RecoveryData] = None
    mindfulness: Optional[MindfulnessData] = None


class HealthDataResponse(BaseModel):
    id: int
    user_id: int
    date: str
    source: str
    sleep: Optional[dict] = None
    activity: Optional[dict] = None
    heart: Optional[dict] = None
    recovery: Optional[dict] = None
    mindfulness: Optional[dict] = None
    created_at: float

    class Config:
        from_attributes = True


class HealthCorrelationResult(BaseModel):
    factor: str
    correlation: Literal["positive", "negative", "neutral"]
    strength: float
    insight: str


class HealthMoodCorrelations(BaseModel):
    correlations: List[HealthCorrelationResult]
    data_points: int
    mood_data_points: int


# ============ Scheduled Conversation Schemas ============

DayOfWeek = Literal["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]


ConversationMode = Literal["voice", "text"]


class ScheduledConversationCreate(BaseModel):
    user_id: int
    time: str  # "09:00" or "21:30" (24-hour format)
    days_of_week: List[DayOfWeek] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
    timezone: str = "UTC"
    conversation_mode: ConversationMode = "voice"


class ScheduledConversationUpdate(BaseModel):
    time: Optional[str] = None
    days_of_week: Optional[List[DayOfWeek]] = None
    is_enabled: Optional[bool] = None
    timezone: Optional[str] = None
    conversation_mode: Optional[ConversationMode] = None


class ScheduledConversationResponse(BaseModel):
    id: int
    user_id: int
    time: str
    days_of_week: List[str]
    is_enabled: bool
    timezone: str
    conversation_mode: str
    last_triggered_at: Optional[float] = None
    created_at: float
    updated_at: float

    class Config:
        from_attributes = True
