"""
Gemma 4 client wrapper — handles both Google AI API and Ollama backends.
"""

import os
import json
import base64
from typing import AsyncGenerator, Optional

import google.generativeai as genai
import httpx
from dotenv import load_dotenv

load_dotenv()

# Configure Google AI
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
USE_OLLAMA = os.getenv("USE_OLLAMA", "false").lower() == "true"
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gemma4:4b")
GEMMA_MODEL = os.getenv("GEMMA_MODEL", "gemma-4-26b-a4b-it")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)


# ---- Tool Definitions for Function Calling ----

TOOL_DEFINITIONS = [
    genai.protos.Tool(
        function_declarations=[
            genai.protos.FunctionDeclaration(
                name="generate_quiz",
                description="Generate practice quiz questions on a given topic at a specified difficulty level.",
                parameters=genai.protos.Schema(
                    type=genai.protos.Type.OBJECT,
                    properties={
                        "topic": genai.protos.Schema(type=genai.protos.Type.STRING, description="The topic for quiz questions"),
                        "difficulty": genai.protos.Schema(type=genai.protos.Type.STRING, description="Difficulty level: easy, medium, or hard"),
                        "num_questions": genai.protos.Schema(type=genai.protos.Type.INTEGER, description="Number of questions to generate"),
                    },
                    required=["topic", "difficulty"],
                ),
            ),
            genai.protos.FunctionDeclaration(
                name="search_curriculum",
                description="Search the educational knowledge base for relevant learning content on a topic.",
                parameters=genai.protos.Schema(
                    type=genai.protos.Type.OBJECT,
                    properties={
                        "query": genai.protos.Schema(type=genai.protos.Type.STRING, description="Search query for educational content"),
                        "subject": genai.protos.Schema(type=genai.protos.Type.STRING, description="Subject area: Mathematics, Science, English, History"),
                        "grade_level": genai.protos.Schema(type=genai.protos.Type.INTEGER, description="Student grade level 1-12"),
                    },
                    required=["query"],
                ),
            ),
            genai.protos.FunctionDeclaration(
                name="evaluate_understanding",
                description="Evaluate how well the student understands the current topic based on their responses.",
                parameters=genai.protos.Schema(
                    type=genai.protos.Type.OBJECT,
                    properties={
                        "topic": genai.protos.Schema(type=genai.protos.Type.STRING, description="Topic being evaluated"),
                        "understanding_level": genai.protos.Schema(type=genai.protos.Type.STRING, description="Level: beginner, intermediate, advanced"),
                        "proceed": genai.protos.Schema(type=genai.protos.Type.BOOLEAN, description="Whether student should move to next topic"),
                    },
                    required=["topic", "understanding_level"],
                ),
            ),
            genai.protos.FunctionDeclaration(
                name="adjust_difficulty",
                description="Adjust the lesson difficulty based on student performance.",
                parameters=genai.protos.Schema(
                    type=genai.protos.Type.OBJECT,
                    properties={
                        "current_difficulty": genai.protos.Schema(type=genai.protos.Type.NUMBER, description="Current difficulty 0-1"),
                        "adjustment": genai.protos.Schema(type=genai.protos.Type.STRING, description="Direction: increase, decrease, or maintain"),
                        "reason": genai.protos.Schema(type=genai.protos.Type.STRING, description="Why the adjustment is needed"),
                    },
                    required=["current_difficulty", "adjustment"],
                ),
            ),
        ]
    )
]


class GemmaClient:
    """Unified client for Gemma 4 — supports Google AI API and Ollama."""

    def __init__(self):
        self.use_ollama = USE_OLLAMA
        if not self.use_ollama and GEMINI_API_KEY:
            try:
                self.model = genai.GenerativeModel(
                    model_name=GEMMA_MODEL,
                    system_instruction=self._get_system_prompt(),
                )
                print(f"[Gemma] Initialized model: {GEMMA_MODEL}")
            except Exception as e:
                print(f"[Gemma] Model init error: {e}")
                self.model = None
        else:
            self.model = None

    def _get_system_prompt(self) -> str:
        return """You are Beacon AI, an adaptive learning companion for students. You help students learn by explaining concepts clearly, step by step.

RULES:
- Be warm, encouraging, and professional. Never use emojis.
- Adjust complexity to the student's grade level.
- When explaining, use numbered steps and clear structure.
- For math, use clear notation (e.g., a^2 + b^2 = c^2).
- End explanations with a check-for-understanding question when appropriate.
- When students share images, analyze them and explain what you see.
- If asked, respond in the student's preferred language.
- Keep responses focused and concise. Do NOT include internal notes, checklists, or self-evaluation. Only output the actual response to the student.
- Do NOT output any meta-commentary about your own behavior or adherence to guidelines."""

    async def generate_stream(
        self,
        message: str,
        history: list[dict] = None,
        image_data: Optional[str] = None,
        system_override: Optional[str] = None,
    ) -> AsyncGenerator[str, None]:
        """Generate a streaming response from Gemma 4."""
        
        if self.use_ollama:
            async for chunk in self._ollama_stream(message, history, image_data, system_override):
                yield chunk
        else:
            async for chunk in self._gemini_stream(message, history, image_data, system_override):
                yield chunk

    async def _gemini_stream(
        self,
        message: str,
        history: list[dict] = None,
        image_data: Optional[str] = None,
        system_override: Optional[str] = None,
    ) -> AsyncGenerator[str, None]:
        """Stream from Google AI (Gemini API serving Gemma 4)."""
        try:
            model = self.model
            if system_override:
                model = genai.GenerativeModel(
                    model_name=GEMMA_MODEL,
                    system_instruction=system_override,
                )

            # Build chat history
            chat_history = []
            if history:
                for msg in history[-10:]:
                    role = "user" if msg["role"] == "user" else "model"
                    chat_history.append({"role": role, "parts": [msg["content"]]})

            chat = model.start_chat(history=chat_history)

            # Build content parts
            parts = []
            if image_data:
                image_bytes = base64.b64decode(image_data)
                parts.append(genai.protos.Part(inline_data=genai.protos.Blob(
                    mime_type="image/jpeg",
                    data=image_bytes,
                )))
            parts.append(message)

            # Disable thinking to prevent chain-of-thought leakage
            gen_config = {"thinking_config": {"thinking_budget": 0}}
            try:
                response = chat.send_message(parts, stream=True, generation_config=gen_config)
            except Exception:
                # Fallback if thinking_config not supported
                response = chat.send_message(parts, stream=True)

            for chunk in response:
                # Skip thinking/thought parts — only yield actual response text
                if hasattr(chunk, 'candidates') and chunk.candidates:
                    for candidate in chunk.candidates:
                        if hasattr(candidate, 'content') and candidate.content:
                            for part in candidate.content.parts:
                                # Skip parts flagged as thoughts
                                if hasattr(part, 'thought') and part.thought:
                                    continue
                                if hasattr(part, 'text') and part.text:
                                    yield part.text
                elif hasattr(chunk, 'text') and chunk.text:
                    yield chunk.text

        except Exception as e:
            yield f"\n\nI encountered an issue: {str(e)}. Let me try a different approach.\n\n"
            try:
                response = model.generate_content(message)
                if response.text:
                    yield response.text
            except Exception as e2:
                yield f"I'm having trouble connecting right now. Please try again. (Error: {str(e2)})"

    async def _ollama_stream(
        self,
        message: str,
        history: list[dict] = None,
        image_data: Optional[str] = None,
        system_override: Optional[str] = None,
    ) -> AsyncGenerator[str, None]:
        """Stream from local Ollama instance."""
        try:
            messages = []
            
            # System prompt
            system_prompt = system_override or self._get_system_prompt()
            messages.append({"role": "system", "content": system_prompt})

            # History
            if history:
                for msg in history[-10:]:
                    messages.append({
                        "role": msg["role"],
                        "content": msg["content"],
                    })

            # Current message
            current_msg = {"role": "user", "content": message}
            if image_data:
                current_msg["images"] = [image_data]
            messages.append(current_msg)

            async with httpx.AsyncClient(timeout=120.0) as client:
                async with client.stream(
                    "POST",
                    f"{OLLAMA_BASE_URL}/api/chat",
                    json={
                        "model": OLLAMA_MODEL,
                        "messages": messages,
                        "stream": True,
                    },
                ) as response:
                    async for line in response.aiter_lines():
                        if line:
                            data = json.loads(line)
                            if "message" in data and "content" in data["message"]:
                                yield data["message"]["content"]

        except Exception as e:
            yield f"Could not connect to Ollama at {OLLAMA_BASE_URL}. Error: {str(e)}"

    async def generate(
        self,
        message: str,
        system_override: Optional[str] = None,
        json_mode: bool = False,
    ) -> str:
        """Generate a complete (non-streaming) response."""
        try:
            if self.use_ollama:
                result = ""
                async for chunk in self._ollama_stream(message, system_override=system_override):
                    result += chunk
                return result
            else:
                model = self.model
                if system_override:
                    model = genai.GenerativeModel(
                        model_name=GEMMA_MODEL,
                        system_instruction=system_override,
                    )
                
                config = {}
                if json_mode:
                    config["response_mime_type"] = "application/json"
                
                response = model.generate_content(
                    message,
                    generation_config=config if config else None,
                )
                return response.text

        except Exception as e:
            return f"Error generating response: {str(e)}"

    async def _handle_function_call(self, name: str, args: dict) -> str:
        """Handle Gemma 4 function calls."""
        if name == "generate_quiz":
            return f"Generating {args.get('num_questions', 3)} quiz questions on **{args.get('topic', 'the topic')}** (Difficulty: {args.get('difficulty', 'medium')})"
        elif name == "search_curriculum":
            return f"Searching knowledge base for: **{args.get('query', '')}**"
        elif name == "evaluate_understanding":
            level = args.get("understanding_level", "unknown")
            return f"Understanding level: **{level}** on {args.get('topic', 'the topic')}"
        elif name == "adjust_difficulty":
            adj = args.get("adjustment", "maintain")
            return f"Difficulty adjustment: **{adj}** — {args.get('reason', '')}"
        return f"Tool {name} called with {args}"


# Singleton
gemma_client = GemmaClient()
