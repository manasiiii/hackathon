# InnerCircle

Voice-first journaling app. Speak your thoughts, get AI-powered insights.

## Demo

[![InnerCircle Demo](https://img.youtube.com/vi/3rBuEXFAdSc/0.jpg)](https://youtu.be/3rBuEXFAdSc?si=bgLL5K-ooFexrYvO)

## Quick Start

### 1. Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Frontend
```bash
npm install
npx expo start
```

### 3. Environment
Create `.env` in root:
```
EXPO_PUBLIC_API_URL=http://localhost:8000
OPENAI_API_KEY=your-key-here
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Mobile | React Native + Expo |
| Backend | FastAPI + SQLite |
| AI | OpenAI GPT-4 |

## Features

- **Voice Journaling**: Speak naturally, AI asks follow-up questions
- **Context-Aware Prompts**: Questions based on your recent entries
- **Emotion Analysis**: Automatic sentiment and emotion detection
- **Weekly Insights**: Pattern discovery across your journals
- **Scheduled Reminders**: Set daily check-in times

## Project Structure

```
InnerCircle/
├── app/                 # Expo Router screens
├── src/                 # Components, hooks, contexts
├── backend/             # FastAPI server
│   ├── main.py          # API endpoints
│   ├── app/agents/      # AI agents (question, emotion, reflection, pattern)
│   └── models.py        # Database models
└── docs/                # Documentation
```

## Journaling Tool

InnerCircle is a journaling tool. The AI listens and asks questions to help you reflect. It does not give advice, diagnose, or try to fix anything.
