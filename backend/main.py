"""
Beacon AI — Backend API Server
Adaptive Multimodal Learning Companion powered by Gemma 4
"""

import os
import json
import uuid
import base64
from typing import Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv

from models.schemas import (
    ChatRequest, QuizRequest, QuizResponse,
    SessionCreate, SessionResponse, DashboardResponse,
    StudentProfile, HealthResponse
)

# Lazy imports — these pull in chromadb/onnxruntime which are slow
# from agents.orchestrator import OrchestratorAgent
# from rag.knowledge_base import KnowledgeBase

load_dotenv()

# --- In-memory storage ---
sessions: dict[str, dict] = {}
knowledge_base = None
orchestrator = None
_init_done = False

async def _init_services():
    """Initialize services in background so server starts fast."""
    global knowledge_base, orchestrator, _init_done
    try:
        print("[Beacon AI] Initializing services...")
        # Try to load RAG (requires chromadb) — optional
        try:
            from rag.knowledge_base import KnowledgeBase
            knowledge_base = KnowledgeBase()
            await knowledge_base.initialize()
            print("[Beacon AI] RAG knowledge base loaded.")
        except ImportError:
            print("[Beacon AI] ChromaDB not available, skipping RAG.")
            knowledge_base = None

        from agents.orchestrator import OrchestratorAgent
        orchestrator = OrchestratorAgent(knowledge_base)
        _init_done = True
        print("[Beacon AI] Ready.")
    except Exception as e:
        print(f"[Beacon AI] Init error: {e}")
        import traceback
        traceback.print_exc()
        _init_done = True


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start services in background, don't block server startup."""
    import asyncio
    print("[Beacon AI] Starting up...")
    asyncio.create_task(_init_services())
    yield
    print("[Beacon AI] Shutting down...")


app = FastAPI(
    title="Beacon AI",
    description="Adaptive Multimodal Learning Companion powered by Gemma 4",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---- Health ----
@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(
        status="ok",
        model="gemma-4-31b-it",
        version="1.0.0"
    )


# ---- Sessions ----
@app.post("/api/sessions", response_model=SessionResponse)
async def create_session(req: SessionCreate):
    """Create a new learning session for a student."""
    session_id = str(uuid.uuid4())
    sessions[session_id] = {
        "id": session_id,
        "student_name": req.student_name,
        "language": req.language,
        "subject": req.subject,
        "grade_level": req.grade_level,
        "difficulty": 0.5,  # 0-1 scale, starts at medium
        "messages": [],
        "quiz_history": [],
        "topics_covered": [],
        "correct_answers": 0,
        "total_answers": 0,
    }
    return SessionResponse(
        session_id=session_id,
        message=f"Welcome, {req.student_name}. Let's begin your {req.subject} session."
    )


# ---- Chat ----
@app.post("/api/chat")
async def chat(req: ChatRequest):
    """Process a chat message and stream AI response."""
    session = sessions.get(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Add user message to history
    session["messages"].append({
        "role": "user",
        "content": req.message,
    })

    async def generate():
        full_response = ""
        async for chunk in orchestrator.process_message(
            message=req.message,
            session=session,
            image_data=req.image_data,
        ):
            full_response += chunk
            yield f"data: {json.dumps({'chunk': chunk, 'done': False})}\n\n"

        # Save assistant message
        session["messages"].append({
            "role": "assistant",
            "content": full_response,
        })
        
        yield f"data: {json.dumps({'chunk': '', 'done': True, 'difficulty': session['difficulty']})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


# ---- Chat with Image ----
@app.post("/api/chat/image")
async def chat_with_image(
    session_id: str = Form(...),
    message: str = Form(""),
    image: UploadFile = File(...),
):
    """Process an image upload (homework photo, textbook page, etc.)."""
    session = sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Read image bytes
    image_bytes = await image.read()
    image_b64 = base64.b64encode(image_bytes).decode("utf-8")
    
    if not message:
        message = "Please analyze this image and help me understand it."

    session["messages"].append({
        "role": "user",
        "content": f"[Image uploaded] {message}",
    })

    async def generate():
        full_response = ""
        async for chunk in orchestrator.process_message(
            message=message,
            session=session,
            image_data=image_b64,
        ):
            full_response += chunk
            yield f"data: {json.dumps({'chunk': chunk, 'done': False})}\n\n"

        session["messages"].append({
            "role": "assistant",
            "content": full_response,
        })
        
        yield f"data: {json.dumps({'chunk': '', 'done': True})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
    )


# ---- Quiz ----
@app.post("/api/quiz/generate", response_model=QuizResponse)
async def generate_quiz(req: QuizRequest):
    """Generate a quiz based on current session progress."""
    session = sessions.get(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    quiz = await orchestrator.generate_quiz(session, req.topic, req.num_questions)
    return quiz


@app.post("/api/quiz/evaluate")
async def evaluate_answer(
    session_id: str = Form(...),
    question_id: str = Form(...),
    answer: str = Form(...),
):
    """Evaluate a student's quiz answer."""
    session = sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    result = await orchestrator.evaluate_answer(session, question_id, answer)
    
    # Update stats
    session["total_answers"] += 1
    if result.get("correct"):
        session["correct_answers"] += 1
        # Increase difficulty slightly
        session["difficulty"] = min(1.0, session["difficulty"] + 0.05)
    else:
        # Decrease difficulty slightly
        session["difficulty"] = max(0.0, session["difficulty"] - 0.03)

    return result


# ---- Dashboard ----
@app.get("/api/dashboard", response_model=DashboardResponse)
async def get_dashboard():
    """Get teacher dashboard data with aggregated analytics."""
    all_students = []
    subject_stats = {}
    total_correct = 0
    total_answers = 0

    for sid, session in sessions.items():
        accuracy = (
            session["correct_answers"] / session["total_answers"] * 100
            if session["total_answers"] > 0 else 0
        )
        student = StudentProfile(
            session_id=sid,
            name=session["student_name"],
            subject=session["subject"],
            language=session["language"],
            difficulty=round(session["difficulty"], 2),
            messages_count=len(session["messages"]),
            accuracy=round(accuracy, 1),
            topics_covered=session["topics_covered"],
        )
        all_students.append(student)

        # Aggregate by subject
        subj = session["subject"]
        if subj not in subject_stats:
            subject_stats[subj] = {"students": 0, "total_accuracy": 0}
        subject_stats[subj]["students"] += 1
        subject_stats[subj]["total_accuracy"] += accuracy

        total_correct += session["correct_answers"]
        total_answers += session["total_answers"]

    return DashboardResponse(
        total_students=len(sessions),
        total_messages=sum(len(s["messages"]) for s in sessions.values()),
        overall_accuracy=round(total_correct / total_answers * 100, 1) if total_answers > 0 else 0,
        students=all_students,
        subject_stats={
            k: round(v["total_accuracy"] / v["students"], 1) if v["students"] > 0 else 0
            for k, v in subject_stats.items()
        },
    )

# --- Serve frontend static files (Cloud Run single-container mode) ---
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
if os.path.isdir(STATIC_DIR):
    from fastapi.staticfiles import StaticFiles
    from fastapi.responses import FileResponse

    @app.get("/")
    async def serve_index():
        return FileResponse(os.path.join(STATIC_DIR, "index.html"))

    @app.get("/learn")
    async def serve_learn():
        f = os.path.join(STATIC_DIR, "learn.html")
        if os.path.exists(f):
            return FileResponse(f)
        return FileResponse(os.path.join(STATIC_DIR, "learn", "index.html"))

    @app.get("/dashboard")
    async def serve_dashboard():
        f = os.path.join(STATIC_DIR, "dashboard.html")
        if os.path.exists(f):
            return FileResponse(f)
        return FileResponse(os.path.join(STATIC_DIR, "dashboard", "index.html"))

    # Mount static assets (JS, CSS, images) AFTER API routes
    app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
