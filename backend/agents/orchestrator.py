"""
Orchestrator Agent — Routes student requests to specialist agents.
"""

import json
import uuid
from typing import AsyncGenerator, Optional

from agents.gemma_client import gemma_client
from rag.knowledge_base import KnowledgeBase
from models.schemas import QuizQuestion, QuizResponse


class OrchestratorAgent:
    def __init__(self, knowledge_base: KnowledgeBase):
        self.kb = knowledge_base
        self.client = gemma_client

    async def process_message(self, message: str, session: dict, image_data: Optional[str] = None) -> AsyncGenerator[str, None]:
        # Build a system override that includes student context
        system_prompt = self._build_system_prompt(session, message)

        # Accumulate full response, then strip chain-of-thought planning
        full_response = ""
        async for chunk in self.client.generate_stream(
            message=message,
            history=session.get("messages", []),
            image_data=image_data,
            system_override=system_prompt,
        ):
            full_response += chunk

        # Strip Gemma 4's chain-of-thought planning from the response
        cleaned = self._strip_thinking(full_response)

        # Yield the cleaned response in chunks for streaming feel
        chunk_size = 12
        for i in range(0, len(cleaned), chunk_size):
            yield cleaned[i:i + chunk_size]

    @staticmethod
    def _strip_thinking(text: str) -> str:
        """Remove Gemma 4's chain-of-thought from responses.
        
        Gemma 4 outputs its internal reasoning before the actual answer.
        The thinking uses varied formats: bullets, indented text, drafts,
        self-checks, and meta-commentary. The actual response is always
        the LAST coherent block.
        
        Strategy: find the LAST line that matches any thinking pattern,
        return everything after it.
        """
        import re
        lines = text.strip().split("\n")
        
        # Comprehensive list of thinking indicators
        THINKING_KEYWORDS = [
            "Draft ", "Drafting", "Self-Correction", "self-correction",
            "Constraint", "preamble", "direct response",
            "Warm/Professional", "No emojis", "internal notes",
            "Numbered steps", "appropriate",
            "Check-for-understanding:", "check-for-understanding",
            "final plan:", "Final plan:",
            "double check", "Double check",
            "Is it possible", "Could it be",
            "If I assume", "I will treat", "I will note",
            "Let me ", "Actually,", "Okay,",
            "I must follow", "I should",
            "Does it contain", "Is it a direct",
            "ambiguous", "Looking at the string",
            "divisible by",
        ]
        
        def is_thinking_line(line: str) -> bool:
            s = line.strip()
            if not s:
                return False
            
            # Bullet-point planning (* at start)
            if s.startswith("*"):
                return True
            
            # Indented lines (4+ spaces) — model's internal reasoning
            if line.startswith("    ") and not line.startswith("    -"):
                return True
            
            # Quoted draft text
            if s.startswith('"') and s.endswith('"') and len(s) > 10:
                return True
            
            # Short self-evaluation lines like "Yes." or "No."
            if s in ("Yes.", "No.", "Yes", "No", "Correct.", "Incorrect."):
                return True
            
            # Keyword matches
            for kw in THINKING_KEYWORDS:
                if kw in s:
                    return True
            
            # Lines that are just a label followed by colon (outline headers)
            if re.match(r'^[A-Z][a-z]+ ?[A-Z]?[a-z]*:', s) and len(s) < 60:
                # e.g., "Step-by-step:", "Key insight:", "Rule:"
                if any(w in s for w in ["Step", "Rule", "Key", "Plan", "Outline", "Summary"]):
                    return True
            
            return False
        
        # Find the LAST thinking line
        last_thinking_idx = -1
        for i, line in enumerate(lines):
            if is_thinking_line(line):
                last_thinking_idx = i
        
        if last_thinking_idx == -1:
            return text.strip()
        
        # Take everything after the last thinking line
        result = "\n".join(lines[last_thinking_idx + 1:]).strip()
        return result if result else text.strip()

    def _build_system_prompt(self, session: dict, message: str) -> str:
        d = session.get("difficulty", 0.5)
        diff_label = "advanced" if d > 0.7 else "intermediate" if d > 0.4 else "beginner"
        grade = session.get("grade_level", 8)
        subject = session.get("subject", "General")
        language = session.get("language", "English")
        name = session.get("student_name", "Student")

        # Fetch RAG context
        rag_text = ""
        if self.kb:
            results = self.kb.search(message, subject, n_results=3)
            if results:
                rag_text = "\n\nRelevant reference material:\n" + "\n".join(f"- {r}" for r in results)

        return f"""You are Beacon AI, an adaptive learning companion. You help students learn by explaining concepts clearly, step by step.

Current student: {name}, Grade {grade}, studying {subject}, in {language}, at {diff_label} level.

Rules:
- Respond directly to the student. Do NOT output any planning, drafting, self-evaluation, checklists, or internal notes.
- Be warm, encouraging, and professional. Never use emojis.
- Adjust complexity to Grade {grade} / {diff_label} level.
- Use numbered steps and clear structure for explanations.
- For math, use clear notation (e.g., a^2 + b^2 = c^2).
- End with a brief check-for-understanding question when appropriate.
- If the student shares an image, analyze it and explain what you see.
- Respond in {language}.
- Keep responses focused. Output ONLY the response the student will read.{rag_text}"""

    async def generate_quiz(self, session: dict, topic: Optional[str] = None, num_questions: int = 3) -> QuizResponse:
        d = session.get("difficulty", 0.5)
        diff_label = "hard" if d > 0.7 else "easy" if d < 0.3 else "medium"
        subject = session.get("subject", "Mathematics")
        grade = session.get("grade_level", 8)
        lang = session.get("language", "English")
        topic = topic or subject

        prompt = f"""Generate exactly {num_questions} multiple-choice quiz questions about {topic} for grade {grade}. Difficulty: {diff_label}. Language: {lang}.
Return ONLY a JSON array: [{{"question":"...","options":["A","B","C","D"],"correct_answer":"B","topic":"...","explanation":"..."}}]"""

        response = await self.client.generate(prompt, system_override="Return ONLY valid JSON array, no other text.")
        try:
            text = response.strip()
            if text.startswith("```"):
                text = text.split("\n", 1)[1].rsplit("```", 1)[0]
            questions_data = json.loads(text)
            questions = []
            for q in questions_data[:num_questions]:
                qid = str(uuid.uuid4())
                questions.append(QuizQuestion(id=qid, question=q["question"], options=q["options"], difficulty=diff_label, topic=q.get("topic", topic)))
                session.setdefault("quiz_answers", {})[qid] = {"correct": q.get("correct_answer", ""), "explanation": q.get("explanation", "")}
            return QuizResponse(questions=questions, session_difficulty=d)
        except (json.JSONDecodeError, KeyError):
            return QuizResponse(questions=[QuizQuestion(id=str(uuid.uuid4()), question=f"What is a key concept in {topic}?", options=["A", "B", "C", "D"], difficulty=diff_label, topic=topic)], session_difficulty=d)

    async def evaluate_answer(self, session: dict, question_id: str, student_answer: str) -> dict:
        stored = session.get("quiz_answers", {}).get(question_id, {})
        correct_answer = stored.get("correct", "")
        is_correct = student_answer.strip().lower() == correct_answer.strip().lower()
        encouragement = "Excellent work!" if is_correct else "Keep going, you are learning!"
        topic = stored.get("topic", "General")
        if topic and topic not in session.get("topics_covered", []):
            session.setdefault("topics_covered", []).append(topic)
        return {"correct": is_correct, "correct_answer": correct_answer, "explanation": stored.get("explanation", ""), "encouragement": encouragement}
