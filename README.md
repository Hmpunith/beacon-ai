# Beacon AI — Adaptive Learning Companion

An AI-powered adaptive learning companion built with **Gemma 4** for the Gemma 4 Good Hackathon. Beacon AI brings personalized, multilingual tutoring to every student — regardless of their background, language, or resources.

## Features

- **Adaptive Tutoring** — Adjusts explanations to each student's grade level and difficulty
- **Multilingual** — Supports English, Hindi, Spanish, French, Arabic, and Chinese
- **Multimodal** — Upload photos of homework for step-by-step analysis
- **RAG-Powered** — Grounded in verified K-12 educational content via ChromaDB
- **Real-Time Streaming** — Token-by-token response streaming for interactive experience
- **Teacher Dashboard** — Real-time analytics on student progress and engagement

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Model | Gemma 4 (gemma-4-26b-a4b-it) via Google AI API |
| Frontend | Next.js 14, React, CSS Modules |
| Backend | Python, FastAPI, Uvicorn |
| RAG | ChromaDB, curated K-12 educational corpus |
| Deployment | Vercel (Frontend), Render/Fly.io (Backend) |

## Architecture

```
Frontend (Next.js 14)         Backend (FastAPI)
---------------------         -----------------
Landing Page                  Orchestrator Agent
Learning Interface    <--->   Gemma Client (Cloud/Local)
Teacher Dashboard             RAG Knowledge Base (ChromaDB)
                              Session Manager
```

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- Google AI API Key (for Gemma 4)

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt

# Create .env file
echo GEMINI_API_KEY=your_api_key_here > .env
echo GEMMA_MODEL=gemma-4-26b-a4b-it >> .env

# Start server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000 to start learning.

## How It Works

1. **Student Setup** — Enter name, select subject, grade level, and language
2. **Adaptive Chat** — Ask questions or upload homework photos
3. **Gemma 4 Processing** — The orchestrator enriches queries with RAG context and student profile
4. **Clean Response** — Chain-of-thought filtering delivers polished, student-facing answers
5. **Progress Tracking** — Teacher dashboard monitors engagement and performance

## License

MIT
