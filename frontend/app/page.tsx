"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

const FEATURES = [
  {
    icon: "01",
    title: "Visual Learning",
    desc: "Upload a photo of your homework, textbook, or diagram — Beacon AI interprets and explains it step by step.",
  },
  {
    icon: "02",
    title: "Adaptive Difficulty",
    desc: "Lessons automatically adjust to your skill level. Struggling? We simplify. Excelling? We challenge you further.",
  },
  {
    icon: "03",
    title: "Multilingual Support",
    desc: "Learn in English, Hindi, Spanish, French, Arabic, and more. Education without language barriers.",
  },
  {
    icon: "04",
    title: "Offline First",
    desc: "Operates without internet via local AI. Designed for schools with limited or no connectivity.",
  },
  {
    icon: "05",
    title: "Multi-Agent System",
    desc: "Specialized AI agents for tutoring, quizzes, visual analysis, and curriculum retrieval — orchestrated in real time.",
  },
  {
    icon: "06",
    title: "Teacher Dashboard",
    desc: "Educators gain real-time analytics on student performance, knowledge gaps, and class-wide progress.",
  },
];

const STATS = [
  { value: "250M+", label: "Students Underserved Globally" },
  { value: "60:1", label: "Student-Teacher Ratio Crisis" },
  { value: "4", label: "Gemma 4 Model Sizes Supported" },
  { value: "10+", label: "Languages Available" },
];

const SUBJECTS = [
  { icon: "f(x)", name: "Mathematics", color: "#6366F1" },
  { icon: "H\u2082O", name: "Science", color: "#10B981" },
  { icon: "Abc", name: "English", color: "#F59E0B" },
  { icon: "1789", name: "History", color: "#EF4444" },
];

export default function LandingPage() {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);
  const [activeSubject, setActiveSubject] = useState(0);

  useEffect(() => {
    setIsVisible(true);
    const interval = setInterval(() => {
      setActiveSubject((prev) => (prev + 1) % SUBJECTS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={styles.page}>
      {/* Background effects */}
      <div className={styles.bgEffects}>
        <div className={`orb orb-1`} />
        <div className={`orb orb-2`} />
        <div className={`orb orb-3`} />
        <div className={styles.gridPattern} />
      </div>

      {/* Navbar */}
      <nav className={styles.nav}>
        <div className={`container ${styles.navInner}`}>
          <div className={styles.logo}>
            <span className={styles.logoMark}>B</span>
            <span className={`font-display ${styles.logoText}`}>Beacon AI</span>
          </div>
          <div className={styles.navLinks}>
            <a href="#features" className={styles.navLink}>Features</a>
            <a href="#architecture" className={styles.navLink}>Architecture</a>
            <a href="/dashboard" className={styles.navLink}>Dashboard</a>
            <button
              className="btn btn-primary"
              onClick={() => router.push("/learn")}
            >
              Start Learning
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={`container ${styles.heroInner}`}>
          <div
            className={`${styles.heroContent} ${isVisible ? "animate-fade-in-up" : ""}`}
          >
            <div className={styles.heroBadge}>
              <span className={styles.heroBadgeDot} />
              Powered by Gemma 4 — Open &amp; On-Device AI
            </div>

            <h1 className={`font-display ${styles.heroTitle}`}>
              Every Student Deserves a{" "}
              <span className="text-gradient">Personal Tutor</span>
            </h1>

            <p className={styles.heroSubtitle}>
              Beacon AI is an adaptive learning companion that understands your
              photos, speaks your language, and works offline — making quality
              education accessible to{" "}
              <strong>every student, everywhere.</strong>
            </p>

            <div className={styles.heroCTAs}>
              <button
                className="btn btn-primary btn-lg pulse-glow"
                onClick={() => router.push("/learn")}
              >
                Start Learning Free
              </button>
              <button
                className="btn btn-secondary btn-lg"
                onClick={() => router.push("/dashboard")}
              >
                Teacher Dashboard
              </button>
            </div>

            {/* Subject showcase */}
            <div className={styles.subjectShowcase}>
              {SUBJECTS.map((s, i) => (
                <div
                  key={s.name}
                  className={`${styles.subjectChip} ${i === activeSubject ? styles.subjectActive : ""}`}
                  style={
                    i === activeSubject
                      ? { borderColor: s.color, boxShadow: `0 0 20px ${s.color}33` }
                      : {}
                  }
                >
                  <span className={styles.subjectSymbol}>{s.icon}</span> {s.name}
                </div>
              ))}
            </div>
          </div>

          {/* Hero visual */}
          <div
            className={`${styles.heroVisual} ${isVisible ? "animate-fade-in-up delay-3" : ""}`}
          >
            <div className={styles.chatPreview}>
              <div className={styles.chatHeader}>
                <div className={styles.chatHeaderDot} />
                <span>Beacon AI — Mathematics Session</span>
              </div>
              <div className={styles.chatMessages}>
                <div className={styles.chatMsgUser}>
                  <p>How do I solve 3x + 7 = 22?</p>
                </div>
                <div className={styles.chatMsgAI}>
                  <p>
                    Great question. Let&apos;s solve it step by step:
                  </p>
                  <p>
                    <strong>Step 1:</strong> Subtract 7 from both sides
                    <br />
                    3x + 7 - 7 = 22 - 7
                    <br />
                    3x = 15
                  </p>
                  <p>
                    <strong>Step 2:</strong> Divide both sides by 3
                    <br />
                    x = 15 / 3 = <strong>5</strong>
                  </p>
                  <p className={styles.chatVerify}>
                    Verification: 3(5) + 7 = 22 — Correct.
                  </p>
                </div>
                <div className={styles.chatMsgUser}>
                  <p>That makes sense. Can I try a practice problem?</p>
                </div>
                <div className={styles.chatMsgAI}>
                  <p>
                    Absolutely. Try this one:
                    <br />
                    <strong>Solve: 4x - 3 = 13</strong>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className={styles.stats}>
        <div className={`container ${styles.statsGrid}`}>
          {STATS.map((stat, i) => (
            <div key={stat.label} className={`${styles.statCard} animate-fade-in-up delay-${i + 1}`}>
              <span className={`font-display ${styles.statValue}`}>{stat.value}</span>
              <span className={styles.statLabel}>{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className={`section ${styles.features}`}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <span className="badge">Features</span>
            <h2 className={`font-display ${styles.sectionTitle}`}>
              AI That Adapts to <span className="text-gradient">You</span>
            </h2>
            <p className={styles.sectionSubtitle}>
              Powered by Gemma 4&apos;s multimodal understanding, native function calling,
              and on-device inference capabilities.
            </p>
          </div>

          <div className={styles.featureGrid}>
            {FEATURES.map((f, i) => (
              <div key={f.title} className={`glass-card ${styles.featureCard} animate-fade-in-up delay-${i + 1}`}>
                <div className={styles.featureNumber}>{f.icon}</div>
                <h3 className={`font-display ${styles.featureTitle}`}>{f.title}</h3>
                <p className={styles.featureDesc}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Architecture */}
      <section id="architecture" className={`section ${styles.howItWorks}`}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <span className="badge">Architecture</span>
            <h2 className={`font-display ${styles.sectionTitle}`}>
              Multi-Agent <span className="text-gradient">Intelligence</span>
            </h2>
            <p className={styles.sectionSubtitle}>
              Five specialized Gemma 4 agents work in concert to deliver a
              personalized learning experience.
            </p>
          </div>

          <div className={styles.agentFlow}>
            {[
              { name: "Orchestrator", desc: "Routes requests to the appropriate specialist agent" },
              { name: "Vision Agent", desc: "Analyzes uploaded photos of homework and diagrams" },
              { name: "Tutor Agent", desc: "Explains concepts at the student's current level" },
              { name: "Quiz Agent", desc: "Generates practice problems and evaluates responses" },
              { name: "Curriculum Agent", desc: "Retrieves relevant content via RAG pipeline" },
            ].map((agent, i) => (
              <div key={agent.name} className={`glass-card ${styles.agentCard} animate-fade-in-up delay-${i + 1}`}>
                <div className={styles.agentIndex}>{String(i + 1).padStart(2, "0")}</div>
                <h3 className={styles.agentName}>{agent.name}</h3>
                <p className={styles.agentDesc}>{agent.desc}</p>
                {i < 4 && <div className={styles.agentArrow}>&rarr;</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.ctaSection}>
        <div className="container">
          <div className={`glass-card ${styles.ctaCard}`}>
            <h2 className={`font-display ${styles.ctaTitle}`}>
              Ready to Transform Learning?
            </h2>
            <p className={styles.ctaSubtitle}>
              Join students worldwide who learn more effectively with AI. No signup required.
            </p>
            <button
              className="btn btn-accent btn-lg"
              onClick={() => router.push("/learn")}
            >
              Start Your First Lesson
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={`container ${styles.footerInner}`}>
          <div className={styles.footerBrand}>
            <span className={styles.logoMark}>B</span>
            <span className={`font-display ${styles.logoText}`}>Beacon AI</span>
          </div>
          <p className={styles.footerText}>
            Built with Gemma 4 for the Gemma 4 Good Hackathon
          </p>
          <div className={styles.footerLinks}>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer">GitHub</a>
            <a href="https://kaggle.com" target="_blank" rel="noopener noreferrer">Kaggle</a>
            <a href="https://ai.google.dev/gemma" target="_blank" rel="noopener noreferrer">Gemma 4</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
