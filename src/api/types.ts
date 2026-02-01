// ============ User Types ============

export interface UserPreferences {
  reminder_time?: string;
  weekly_insights?: boolean;
  voice_enabled?: boolean;
  theme?: "ethereal" | "aurora" | "sunset" | "ocean";
  haptic_feedback?: boolean;
}

export interface User {
  id: number;
  anonymous_id: string;
  email?: string;
  name?: string;
  avatar_url?: string;
  created_at: number;
  preferences: UserPreferences;
  journaling_streak: number;
  total_entries: number;
  last_active_at: number;
  longest_streak?: number;
}

// ============ Sentiment Types ============

export interface Sentiment {
  score: number; // -1 to 1
  label: "very_negative" | "negative" | "neutral" | "positive" | "very_positive";
  confidence: number;
}

export interface Emotion {
  name: string;
  intensity: number; // 0-1
}

// ============ Journal Types ============

export type EntryType = "quick_checkin" | "reflection" | "gratitude" | "voice_note" | "guided";
export type TimeOfDay = "morning" | "afternoon" | "evening" | "night";

export interface Journal {
  id: number;
  user_id: number;
  content: string;
  title?: string;
  prompt_used?: string;
  is_voice_entry: boolean;
  voice_transcript?: string;
  audio_url?: string;
  sentiment: Sentiment;
  themes: string[];
  emotions: Emotion[];
  created_at: number;
  updated_at: number;
  time_of_day: TimeOfDay;
  day_of_week: string;
  location?: string;
  tags: string[];
  word_count: number;
  entry_type: EntryType;
  is_locked: boolean;
  is_archived: boolean;
}

export interface JournalCreate {
  user_id: number;
  content: string;
  title?: string;
  prompt_used?: string;
  is_voice_entry?: boolean;
  voice_transcript?: string;
  tags?: string[];
  entry_type: EntryType;
  location?: string;
}

export interface JournalAnalytics {
  total_entries: number;
  total_words: number;
  avg_words_per_entry: number;
  top_themes: Array<{ theme: string; count: number }>;
  top_emotions: Array<{ name: string; count: number; avg_intensity: number }>;
  time_distribution: { morning: number; afternoon: number; evening: number; night: number };
}

// ============ Insight Types ============

export interface Pattern {
  type: string;
  title: string;
  description: string;
  confidence: number;
}

export interface EmotionalTrend {
  average_sentiment: number;
  sentiment_change: number;
  dominant_emotions: string[];
  emotional_variability: number;
}

export interface TopTheme {
  theme: string;
  frequency: number;
  sentiment_when_mentioned: number;
}

export interface HealthCorrelation {
  factor: string;
  correlation: "positive" | "negative" | "neutral";
  insight: string;
}

export interface InsightStats {
  entries_count: number;
  total_words: number;
  average_words_per_entry: number;
  streak_days: number;
  most_active_time: string;
}

export interface Insight {
  id: number;
  user_id: number;
  type: "weekly" | "monthly";
  period_start: string;
  period_end: string;
  summary: string;
  patterns: Pattern[];
  emotional_trend: EmotionalTrend;
  top_themes: TopTheme[];
  health_correlations?: HealthCorrelation[];
  suggestions: string[];
  stats: InsightStats;
  is_read: boolean;
  created_at: number;
}

export interface SleepVsEmotionsGroup {
  label: string;
  emotions: Record<string, number>;
  sleepHours?: number;
}

export interface SleepVsEmotionsResponse {
  groups: SleepVsEmotionsGroup[];
  emotionOrder: string[];
}

// ============ Health Types ============

export interface SleepData {
  duration_minutes: number;
  quality: number;
  deep_sleep_minutes?: number;
  rem_sleep_minutes?: number;
  light_sleep_minutes?: number;
  awake_minutes?: number;
  sleep_latency?: number;
  bedtime?: string;
  wake_time?: string;
}

export interface Workout {
  type: string;
  duration_minutes: number;
  intensity?: string;
}

export interface ActivityData {
  steps: number;
  active_minutes: number;
  calories_burned: number;
  workouts: Workout[];
  stand_hours?: number;
}

export interface HeartData {
  resting_hr: number;
  average_hr: number;
  max_hr?: number;
  hrv?: number;
}

export interface RecoveryData {
  score: number;
  strain: number;
  readiness: "optimal" | "adequate" | "low";
}

export interface MindfulnessData {
  meditation_minutes: number;
  breathing_minutes: number;
}

export interface HealthData {
  id: number;
  user_id: number;
  date: string;
  source: "apple_health" | "whoop" | "synthetic" | "manual";
  sleep?: SleepData;
  activity?: ActivityData;
  heart?: HeartData;
  recovery?: RecoveryData;
  mindfulness?: MindfulnessData;
  created_at: number;
}

export interface HealthDataCreate {
  user_id: number;
  date: string;
  source: "apple_health" | "whoop" | "synthetic" | "manual";
  sleep?: SleepData;
  activity?: ActivityData;
  heart?: HeartData;
  recovery?: RecoveryData;
  mindfulness?: MindfulnessData;
}

export interface HealthMoodCorrelations {
  correlations: Array<{
    factor: string;
    correlation: "positive" | "negative" | "neutral";
    strength: number;
    insight: string;
  }>;
  data_points: number;
  mood_data_points: number;
}
