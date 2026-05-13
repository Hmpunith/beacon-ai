"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import styles from "./learn.module.css";

function renderMarkdown(text: string): string {
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Headers: ### heading
  html = html.replace(/^### (.+)$/gm, '<strong style="font-size:1.05em;display:block;margin-top:0.8em">$1</strong>');

  // Bold: **text** (must run before italic)
  html = html.replace(/\*\*([^*]+?)\*\*/g, "<strong>$1</strong>");

  // Italic: *text*
  html = html.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, "<em>$1</em>");

  // Inline code: `code`
  html = html.replace(/`([^`]+)`/g, '<code style="background:rgba(99,102,241,0.18);padding:0.15em 0.45em;border-radius:4px;font-size:0.9em;font-family:monospace">$1</code>');

  // Numbered lists: 1. item
  html = html.replace(/^(\d+)\.\s+(.+)$/gm, '<div style="padding-left:1.2em;margin:0.15em 0">$1. $2</div>');

  // Bullet lists: - item or * item (only at line start, not bold)
  html = html.replace(/^[-] (.+)$/gm, '<div style="padding-left:1.2em;margin:0.15em 0">&bull; $1</div>');

  // Line breaks
  html = html.replace(/\n/g, "<br/>");

  return html;
}

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  image?: string;
}

const SUBJECTS = [
  { label: "f(x)", name: "Mathematics" },
  { label: "H\u2082O", name: "Science" },
  { label: "Abc", name: "English" },
  { label: "1789", name: "History" },
];

const LANGUAGES = [
  { code: "English", label: "EN" },
  { code: "Hindi", label: "HI" },
  { code: "Spanish", label: "ES" },
  { code: "French", label: "FR" },
  { code: "Arabic", label: "AR" },
  { code: "Chinese", label: "ZH" },
];

const GRADES = Array.from({ length: 12 }, (_, i) => i + 1);

export default function LearnPage() {
  const router = useRouter();
  const [step, setStep] = useState<"setup" | "chat">("setup");

  const [name, setName] = useState("");
  const [subject, setSubject] = useState("Mathematics");
  const [language, setLanguage] = useState("English");
  const [grade, setGrade] = useState(8);

  const [sessionId, setSessionId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [difficulty, setDifficulty] = useState(0.5);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isNearBottomRef = useRef(true);

  const scrollToBottom = useCallback(() => {
    if (isNearBottomRef.current) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  const handleScroll = useCallback(() => {
    const el = chatContainerRef.current;
    if (!el) return;
    const threshold = 150;
    isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleStartSession = async () => {
    if (!name.trim()) return;
    try {
      setIsLoading(true);
      const res = await api.createSession({
        student_name: name,
        language,
        subject,
        grade_level: grade,
      });
      setSessionId(res.session_id);
      setMessages([
        {
          role: "assistant",
          content: res.message || `Welcome, ${name}. I'm Beacon AI, your personal tutor. Let's start learning ${subject}. Ask me anything or upload a photo of your homework.`,
        },
      ]);
      setStep("chat");
    } catch {
      setSessionId("demo");
      setMessages([
        {
          role: "assistant",
          content: `Welcome, ${name}. I'm Beacon AI, your personal ${subject} tutor.\n\nI'm currently running in demo mode — the backend is not yet connected. Once you configure the Gemma 4 API, I'll operate at full capacity.\n\nCapabilities:\n- Analyze photos of your homework\n- Generate practice quizzes\n- Adapt to your skill level\n- Teach in ${language}\n\nAsk me anything to get started.`,
        },
      ]);
      setStep("chat");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !imageFile) || isLoading) return;

    const userMessage = input.trim();
    const userImg = imagePreview;
    setInput("");
    setImagePreview(null);

    setMessages((prev) => [
      ...prev,
      { role: "user", content: userMessage || "[Image uploaded]", image: userImg || undefined },
    ]);
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
    setIsLoading(true);

    try {
      if (sessionId === "demo") {
        const demoResponse = getDemoResponse(userMessage, subject);
        let displayed = "";
        for (const char of demoResponse) {
          displayed += char;
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: "assistant", content: displayed };
            return updated;
          });
          await new Promise((r) => setTimeout(r, 15));
        }
      } else if (imageFile) {
        await api.chatWithImage(sessionId, userMessage, imageFile, (text) => {
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: "assistant", content: text };
            return updated;
          });
        });
      } else {
        await api.chatStream(sessionId, userMessage, undefined, (text) => {
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: "assistant", content: text };
            return updated;
          });
        });
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "Connection issue. Please verify that the backend is running and try again.",
        };
        return updated;
      });
    } finally {
      setIsLoading(false);
      setImageFile(null);
      inputRef.current?.focus();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getDiffLabel = () => {
    if (difficulty > 0.7) return { text: "Advanced", color: "#A855F7" };
    if (difficulty > 0.4) return { text: "Intermediate", color: "#F59E0B" };
    return { text: "Beginner", color: "#10B981" };
  };

  // ---- Setup Screen ----
  if (step === "setup") {
    return (
      <div className={styles.page}>
        <div className={styles.bgEffects}>
          <div className="orb orb-1" />
          <div className="orb orb-2" />
        </div>

        <div className={styles.setupContainer}>
          <button className={styles.backBtn} onClick={() => router.push("/")}>
            &larr; Back
          </button>

          <div className={`${styles.setupCard} glass-card animate-fade-in-up`}>
            <div className={styles.setupMark}>B</div>
            <h1 className={`font-display ${styles.setupTitle}`}>
              Let&apos;s Get Started
            </h1>
            <p className={styles.setupSubtitle}>
              Tell us about yourself so we can personalize your learning experience.
            </p>

            <div className={styles.formGroup}>
              <label className={styles.label}>Your Name</label>
              <input
                className="input"
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Subject</label>
              <div className={styles.subjectGrid}>
                {SUBJECTS.map((s) => (
                  <button
                    key={s.name}
                    className={`${styles.subjectBtn} ${subject === s.name ? styles.subjectSelected : ""}`}
                    onClick={() => setSubject(s.name)}
                  >
                    <span className={styles.subjectLabel}>{s.label}</span>
                    {s.name}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Language</label>
                <div className={styles.langGrid}>
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      className={`${styles.langBtn} ${language === l.code ? styles.langSelected : ""}`}
                      onClick={() => setLanguage(l.code)}
                    >
                      <span className={styles.langCode}>{l.label}</span> {l.code}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Grade Level</label>
                <select
                  className={`input ${styles.gradeSelect}`}
                  value={grade}
                  onChange={(e) => setGrade(Number(e.target.value))}
                >
                  {GRADES.map((g) => (
                    <option key={g} value={g}>
                      Grade {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              className={`btn btn-primary btn-lg ${styles.startBtn}`}
              onClick={handleStartSession}
              disabled={!name.trim() || isLoading}
            >
              {isLoading ? (
                <span className="typing-dots"><span /><span /><span /></span>
              ) : (
                <>Start Learning</>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---- Chat Screen ----
  const diffInfo = getDiffLabel();

  return (
    <div className={styles.chatPage}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <span className={styles.sidebarMark}>B</span>
          <span className={`font-display ${styles.sidebarTitle}`}>Beacon AI</span>
        </div>

        <div className={styles.sessionInfo}>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Student</span>
            <span className={styles.infoValue}>{name}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Subject</span>
            <span className={styles.infoValue}>{subject}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Language</span>
            <span className={styles.infoValue}>{language}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Grade</span>
            <span className={styles.infoValue}>Grade {grade}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Difficulty</span>
            <span className={styles.infoValue} style={{ color: diffInfo.color }}>
              {diffInfo.text}
            </span>
          </div>
        </div>

        <div className={styles.difficultyBar}>
          <div
            className={styles.difficultyFill}
            style={{
              width: `${difficulty * 100}%`,
              background: diffInfo.color,
            }}
          />
        </div>

        <div className={styles.sidebarActions}>
          <button className="btn btn-secondary btn-sm" onClick={() => router.push("/")}>
            &larr; Home
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => router.push("/dashboard")}>
            Dashboard
          </button>
        </div>
      </aside>

      {/* Chat Area */}
      <main className={styles.chatMain}>
        <div className={styles.chatMessages} ref={chatContainerRef} onScroll={handleScroll}>
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`${styles.message} ${msg.role === "user" ? styles.messageUser : styles.messageAI}`}
            >
              {msg.role === "assistant" && (
                <div className={styles.msgAvatar}>B</div>
              )}
              <div className={styles.msgBubble}>
                {msg.image && (
                  <img src={msg.image} alt="Uploaded" className={styles.msgImage} />
                )}
                <div className={styles.msgContent}>
                  {msg.content ? (
                    <span dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                  ) : (
                    <span className="typing-dots"><span /><span /><span /></span>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        <div className={styles.inputArea}>
          {imagePreview && (
            <div className={styles.imagePreview}>
              <img src={imagePreview} alt="Upload preview" />
              <button
                className={styles.removeImage}
                onClick={() => {
                  setImagePreview(null);
                  setImageFile(null);
                }}
              >
                &times;
              </button>
            </div>
          )}
          <div className={styles.inputRow}>
            <button
              className={`btn btn-icon ${styles.uploadBtn}`}
              onClick={() => fileInputRef.current?.click()}
              title="Upload image"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              hidden
            />
            <textarea
              ref={inputRef}
              className={styles.chatInput}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question or upload a photo of your homework..."
              rows={1}
              disabled={isLoading}
            />
            <button
              className={`btn btn-primary btn-icon ${styles.sendBtn}`}
              onClick={handleSend}
              disabled={isLoading && !input.trim() && !imageFile}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          </div>
          <p className={styles.inputHint}>
            Press Enter to send &middot; Shift+Enter for new line
          </p>
        </div>
      </main>
    </div>
  );
}

function getDemoResponse(message: string, subject: string): string {
  const msg = message.toLowerCase();

  if (msg.includes("hello") || msg.includes("hi") || msg.includes("hey")) {
    return `Hello! Welcome to your ${subject} session.\n\nI'm your personal tutor. Here's what I can do:\n\n- Explain any concept step by step\n- Analyze photos of your homework or textbook pages\n- Generate practice quizzes tailored to your level\n- Track your progress and adapt difficulty\n\nWhat would you like to learn today?`;
  }

  if (msg.includes("quiz") || msg.includes("test") || msg.includes("practice")) {
    return `Let's assess your understanding.\n\n**Quick Quiz — ${subject}**\n\n**Question 1:** What is the fundamental principle that connects all topics in ${subject}?\n\nA) Theory of Everything\nB) First Principles Thinking\nC) The Scientific Method\nD) Critical Analysis\n\nTake your time to consider each option.`;
  }

  if (subject === "Mathematics") {
    return `Good question. Let me walk you through this.\n\n**Key Concept:**\nMathematics is built on patterns and logical reasoning. Every problem can be decomposed into smaller, manageable steps.\n\n**Example:**\nConsider the equation \`2x + 5 = 13\`:\n\n1. Subtract 5 from both sides: \`2x = 8\`\n2. Divide by 2: \`x = 4\`\n\n**Verification:** 2(4) + 5 = 8 + 5 = 13 — Correct.\n\nWould you like me to generate practice problems on this topic, or is there another area you'd like to explore?`;
  }

  return `That's an interesting question. Let me break this down for you.\n\n**${subject} — Key Points:**\n\n- This topic builds on fundamental principles you've already encountered\n- Understanding the reasoning behind concepts is as important as memorizing facts\n- Real-world applications reinforce understanding\n\n**Next Steps:**\nI recommend we start with the foundational concepts and build progressively.\n\nWould you like me to:\n1. Explain the core concepts in detail\n2. Generate a practice quiz\n3. Analyze a specific problem (upload a photo)\n4. Explore a particular subtopic\n\nLet me know how you'd like to proceed.`;
}
