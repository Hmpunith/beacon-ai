"""Pydantic models for API request/response schemas."""

from typing import Optional
from pydantic import BaseModel, Field


# ---- Requests ----

class SessionCreate(BaseModel):
    student_name: str = Field(..., min_length=1, max_length=100)
    language: str = Field(default="English")
    subject: str = Field(default="Mathematics")
    grade_level: int = Field(default=8, ge=1, le=12)


class ChatRequest(BaseModel):
    session_id: str
    message: str
    image_data: Optional[str] = None  # Base64 encoded image


class QuizRequest(BaseModel):
    session_id: str
    topic: Optional[str] = None
    num_questions: int = Field(default=3, ge=1, le=10)


# ---- Responses ----

class HealthResponse(BaseModel):
    status: str
    model: str
    version: str


class SessionResponse(BaseModel):
    session_id: str
    message: str


class QuizQuestion(BaseModel):
    id: str
    question: str
    options: list[str]
    difficulty: str  # "easy", "medium", "hard"
    topic: str


class QuizResponse(BaseModel):
    questions: list[QuizQuestion]
    session_difficulty: float


class EvalResult(BaseModel):
    correct: bool
    correct_answer: str
    explanation: str
    encouragement: str


class StudentProfile(BaseModel):
    session_id: str
    name: str
    subject: str
    language: str
    difficulty: float
    messages_count: int
    accuracy: float
    topics_covered: list[str]


class DashboardResponse(BaseModel):
    total_students: int
    total_messages: int
    overall_accuracy: float
    students: list[StudentProfile]
    subject_stats: dict[str, float]
