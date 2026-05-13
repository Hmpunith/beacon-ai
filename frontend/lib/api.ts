const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = {
  baseUrl: API_BASE,

  async createSession(data: {
    student_name: string;
    language: string;
    subject: string;
    grade_level: number;
  }) {
    const res = await fetch(`${API_BASE}/api/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create session");
    return res.json();
  },

  async chatStream(
    sessionId: string,
    message: string,
    imageData?: string,
    onChunk?: (chunk: string) => void
  ) {
    const res = await fetch(`${API_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sessionId,
        message,
        image_data: imageData,
      }),
    });

    if (!res.ok) throw new Error("Chat request failed");
    if (!res.body) throw new Error("No response body");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value, { stream: true });
      const lines = text.split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.chunk) {
              fullText += data.chunk;
              onChunk?.(fullText);
            }
          } catch {
            // skip invalid JSON
          }
        }
      }
    }

    return fullText;
  },

  async chatWithImage(
    sessionId: string,
    message: string,
    imageFile: File,
    onChunk?: (chunk: string) => void
  ) {
    const formData = new FormData();
    formData.append("session_id", sessionId);
    formData.append("message", message);
    formData.append("image", imageFile);

    const res = await fetch(`${API_BASE}/api/chat/image`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) throw new Error("Image chat failed");
    if (!res.body) throw new Error("No response body");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value, { stream: true });
      const lines = text.split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.chunk) {
              fullText += data.chunk;
              onChunk?.(fullText);
            }
          } catch {
            // skip
          }
        }
      }
    }

    return fullText;
  },

  async generateQuiz(sessionId: string, topic?: string, numQuestions?: number) {
    const res = await fetch(`${API_BASE}/api/quiz/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sessionId,
        topic,
        num_questions: numQuestions || 3,
      }),
    });
    if (!res.ok) throw new Error("Quiz generation failed");
    return res.json();
  },

  async evaluateAnswer(sessionId: string, questionId: string, answer: string) {
    const formData = new FormData();
    formData.append("session_id", sessionId);
    formData.append("question_id", questionId);
    formData.append("answer", answer);

    const res = await fetch(`${API_BASE}/api/quiz/evaluate`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error("Evaluation failed");
    return res.json();
  },

  async getDashboard() {
    const res = await fetch(`${API_BASE}/api/dashboard`);
    if (!res.ok) throw new Error("Dashboard fetch failed");
    return res.json();
  },

  async healthCheck() {
    try {
      const res = await fetch(`${API_BASE}/api/health`);
      return res.ok;
    } catch {
      return false;
    }
  },
};
