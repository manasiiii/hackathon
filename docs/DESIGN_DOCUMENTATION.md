# InnerCircle - Design Documentation

## Voice-First AI Journaling Companion

---

## 1. Executive Summary

**InnerCircle** is a voice-first mental wellness journaling app that removes the friction of traditional journaling. Users simply speak their thoughts, and our AI agents analyze emotions, discover patterns, and generate personalized insights—all without requiring users to type a single word.

### Key Differentiators
- **Voice-First**: Speak naturally, no keyboard required
- **Context-Aware Questions**: AI generates questions based on your history
- **Agentic Architecture**: Multiple specialized AI agents work together
- **Privacy-Focused**: Local-first data storage, anonymous by default

---

## 2. Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| React Native + Expo | Cross-platform mobile app |
| TypeScript | Type-safe development |
| Expo Router | File-based navigation |
| React Native Reanimated | Smooth animations |
| Expo Speech/Audio | Voice recording & TTS |

### Backend
| Technology | Purpose |
|------------|---------|
| FastAPI | High-performance Python API |
| SQLAlchemy + SQLite | Local-first database |
| Pydantic | Request/response validation |
| OpenAI GPT-4 | AI agent intelligence |

### Infrastructure
| Technology | Purpose |
|------------|---------|
| Expo Notifications | Local scheduled reminders |

---

## 3. System Architecture

### High-Level Overview

**Mobile App Layer:**
- Home Screen → Voice Session
- Journal List → Entry Details
- Insights Screen → Visualizations
- Settings → Schedule Configuration

**Voice Session Flow:**
1. Speech-to-Text (STT) captures user voice
2. Backend processes and generates response
3. Text-to-Speech (TTS) speaks AI response

**Backend Layer:**
- FastAPI REST API
- Agent Orchestrator coordinates AI agents
- SQLite stores all user data locally

**Data Layer:**
- Users, Journals, Insights, Health Data, Schedules

---

## 4. Agentic Architecture

Our multi-agent system uses specialized AI agents that each handle specific tasks:

### Agent Overview

| Agent | When Called | What It Does |
|-------|-------------|--------------|
| **Question Generator** | On app open | Analyzes past 3-7 days of journals to generate a personalized starting question |
| **Emotion Analyst** | On journal save | Detects emotions, measures intensity, calculates sentiment score |
| **Pattern Discovery** | On insight generation | Finds trends over 7-30 days, correlates with health data |
| **Reflection Agent** | During conversation | Generates empathetic follow-up responses to continue the dialogue |

### How Agents Work Together

**Starting a Session:**
1. User opens voice session
2. **Question Generator** reads recent journals
3. Returns personalized question like *"You mentioned work stress yesterday. How are you feeling about it today?"*

**During Conversation:**
1. User speaks their thoughts
2. **Reflection Agent** processes what they said
3. Generates supportive follow-up question to deepen reflection
4. Conversation continues naturally

**On Save:**
1. Full transcript sent to **Emotion Analyst**
2. Detects emotions: `[{name: "anxious", intensity: 0.7}, {name: "hopeful", intensity: 0.5}]`
3. Extracts themes: `["work", "relationships"]`
4. Calculates sentiment: `0.3 (slightly positive)`

**Weekly Insights:**
1. **Pattern Discovery** analyzes all journals from past week
2. Finds correlations (e.g., "better mood on days with more sleep")
3. Generates actionable suggestions

---

## 5. Data Flow

### Voice Journal Session

| Step | Action | API Call |
|------|--------|----------|
| 1 | User opens app | `GET /journals/question` |
| 2 | AI speaks personalized question | Text-to-Speech |
| 3 | User responds verbally | Speech-to-Text |
| 4 | AI generates follow-up | `POST /voice/reflection` |
| 5 | Conversation continues | Steps 3-4 repeat |
| 6 | User ends session | `POST /journals` (saves transcript) |
| 7 | Emotion analysis runs | Backend processes automatically |

### Key API Endpoints Used

- **Question Generation**: `GET /journals/question?user_id=1&days=3`
- **Voice Reflection**: `POST /voice/reflection` with `{content: "user's message"}`
- **Save Journal**: `POST /journals` with full transcript
- **Get Insights**: `GET /insights/weekly?user_id=1`

---

## 6. Database Schema

### Tables

**users**
- `id`, `anonymous_id`, `preferences`, `journaling_streak`, `total_entries`, `created_at`

**journals**
- `id`, `user_id`, `content`, `title`, `sentiment` (JSON), `emotions` (JSON), `themes` (JSON), `is_voice_entry`, `time_of_day`, `created_at`

**insights**
- `id`, `user_id`, `type`, `summary`, `patterns` (JSON), `suggestions` (JSON), `created_at`

**health_data**
- `id`, `user_id`, `date`, `sleep` (JSON), `activity` (JSON), `heart` (JSON)

**scheduled_conversations**
- `id`, `user_id`, `time`, `days_of_week` (JSON), `conversation_mode`, `is_enabled`

---

## 7. Future Enhancements

### Phase 1: Push Notifications
- Time-based triggers (scheduled conversation times)
- Location-based triggers (arrive home → prompt to journal)
- Smart timing based on user patterns

### Phase 2: Affirmations
- Daily personalized affirmations based on recent journals
- Generated by Pattern Discovery + Reflection agents
- Morning motivation, evening reflection

### Phase 3: Interactiveness Control
- Voice tone selection: Warmer / Neutral / Clear
- Follow-up depth: Minimal / Moderate / Deep dive
- AI personality: Listener only / Supportive coach / Direct analyst

### Phase 4: Multi-User Support
- Cloud database (PostgreSQL/Supabase)
- Secure authentication (OAuth/JWT)
- End-to-end encryption
- Cross-device sync

### Phase 5: Custom Variable Graphs
- User selects X and Y variables
- Options: Sleep, Exercise, Screen time, Mood, Energy, Stress
- Scatter plots show personal correlations
- "I want to see how sleep affects my mood"

### Phase 6: Agent Triggers
- Health data sync → Agent adjusts tone ("User slept 4hrs, be gentle")
- Calendar integration → Context-aware prompts ("Big meeting today")
- Location changes → Activity-based check-ins
- Streak milestones → Celebration messages

---

## 8. Conclusion

InnerCircle reimagines journaling for the modern user by making reflection voice first and effortless. Instead of typing into a blank page, you simply speak, turning journaling into something that feels as natural as having a conversation.

InnerCircle is not a therapy app. The AI companion does not give advice, diagnose, reframe, or try to fix anything. It listens, reflects what it hears in simple human language, and occasionally asks a gentle question to help you go a little deeper.

At its core, InnerCircle is a space to think out loud without pressure, guidance, or judgment so understanding can emerge on its own.

---

*Document Version: 1.0*
*Last Updated: February 2025*
