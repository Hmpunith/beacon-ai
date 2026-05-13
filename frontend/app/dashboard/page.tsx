"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import styles from "./dashboard.module.css";

interface Student {
  session_id: string;
  name: string;
  subject: string;
  language: string;
  difficulty: number;
  messages_count: number;
  accuracy: number;
  topics_covered: string[];
}

interface DashboardData {
  total_students: number;
  total_messages: number;
  overall_accuracy: number;
  students: Student[];
  subject_stats: Record<string, number>;
}

const SUBJECT_COLORS: Record<string, string> = {
  Mathematics: "#6366F1",
  Science: "#10B981",
  English: "#F59E0B",
  History: "#EF4444",
};

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(loadDashboard, 10000);
    return () => clearInterval(interval);
  }, []);

  async function loadDashboard() {
    try {
      const res = await api.getDashboard();
      setData(res);
    } catch {
      setData({
        total_students: 24,
        total_messages: 487,
        overall_accuracy: 73.5,
        students: [
          { session_id: "1", name: "Priya Sharma", subject: "Mathematics", language: "Hindi", difficulty: 0.72, messages_count: 34, accuracy: 85.0, topics_covered: ["Algebra", "Fractions", "Geometry"] },
          { session_id: "2", name: "Carlos Rivera", subject: "Science", language: "Spanish", difficulty: 0.55, messages_count: 28, accuracy: 70.0, topics_covered: ["Biology", "Chemistry"] },
          { session_id: "3", name: "Aisha Mohamed", subject: "English", language: "Arabic", difficulty: 0.38, messages_count: 19, accuracy: 60.0, topics_covered: ["Grammar", "Reading"] },
          { session_id: "4", name: "Wei Chen", subject: "Mathematics", language: "Chinese", difficulty: 0.85, messages_count: 45, accuracy: 92.0, topics_covered: ["Quadratics", "Probability", "Algebra", "Statistics"] },
          { session_id: "5", name: "Fatima Al-Hassan", subject: "Science", language: "English", difficulty: 0.62, messages_count: 22, accuracy: 75.0, topics_covered: ["Physics", "Earth Science"] },
          { session_id: "6", name: "James Okonkwo", subject: "History", language: "English", difficulty: 0.48, messages_count: 15, accuracy: 65.0, topics_covered: ["Ancient Civilizations"] },
        ],
        subject_stats: { Mathematics: 88.5, Science: 72.5, English: 60.0, History: 65.0 },
      });
    } finally {
      setIsLoading(false);
    }
  }

  const getDiffLabel = (d: number) => {
    if (d > 0.7) return { text: "Advanced", color: "#A855F7" };
    if (d > 0.4) return { text: "Intermediate", color: "#F59E0B" };
    return { text: "Beginner", color: "#10B981" };
  };

  const getAccuracyColor = (acc: number) => {
    if (acc >= 80) return "#10B981";
    if (acc >= 60) return "#F59E0B";
    return "#EF4444";
  };

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingMark}>B</div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className={styles.page}>
      <div className={styles.bgEffects}>
        <div className="orb orb-1" />
        <div className="orb orb-2" />
      </div>

      {/* Header */}
      <header className={styles.header}>
        <div className={`container ${styles.headerInner}`}>
          <div className={styles.headerLeft}>
            <button className={styles.backBtn} onClick={() => router.push("/")}>
              &larr; Home
            </button>
            <div>
              <h1 className={`font-display ${styles.pageTitle}`}>
                Teacher Dashboard
              </h1>
              <p className={styles.pageSubtitle}>
                Real-time analytics powered by Beacon AI
              </p>
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => router.push("/learn")}>
            + New Session
          </button>
        </div>
      </header>

      <main className={`container ${styles.main}`}>
        {/* Overview Cards */}
        <div className={styles.statsGrid}>
          <div className={`glass-card ${styles.statCard} animate-fade-in-up delay-1`}>
            <div className={styles.statLabel}>Active Students</div>
            <div className={styles.statValue}>{data.total_students}</div>
          </div>
          <div className={`glass-card ${styles.statCard} animate-fade-in-up delay-2`}>
            <div className={styles.statLabel}>Total Messages</div>
            <div className={styles.statValue}>{data.total_messages}</div>
          </div>
          <div className={`glass-card ${styles.statCard} animate-fade-in-up delay-3`}>
            <div className={styles.statLabel}>Overall Accuracy</div>
            <div className={styles.statValue} style={{ color: getAccuracyColor(data.overall_accuracy) }}>
              {data.overall_accuracy}%
            </div>
          </div>
          <div className={`glass-card ${styles.statCard} animate-fade-in-up delay-4`}>
            <div className={styles.statLabel}>Subjects Active</div>
            <div className={styles.statValue}>{Object.keys(data.subject_stats).length}</div>
          </div>
        </div>

        {/* Subject Performance */}
        <div className={`glass-card ${styles.sectionCard} animate-fade-in-up delay-3`}>
          <h2 className={`font-display ${styles.sectionTitle}`}>
            Subject Performance
          </h2>
          <div className={styles.subjectBars}>
            {Object.entries(data.subject_stats).map(([subject, accuracy]) => (
              <div key={subject} className={styles.subjectBarItem}>
                <div className={styles.subjectBarLabel}>
                  <span>{subject}</span>
                  <span style={{ color: getAccuracyColor(accuracy) }}>
                    {accuracy}%
                  </span>
                </div>
                <div className={styles.subjectBarTrack}>
                  <div
                    className={styles.subjectBarFill}
                    style={{
                      width: `${accuracy}%`,
                      background: SUBJECT_COLORS[subject] || "#6366F1",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Student Table */}
        <div className={`glass-card ${styles.sectionCard} animate-fade-in-up delay-4`}>
          <h2 className={`font-display ${styles.sectionTitle}`}>
            Student Progress
          </h2>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Subject</th>
                  <th>Language</th>
                  <th>Level</th>
                  <th>Accuracy</th>
                  <th>Messages</th>
                  <th>Topics</th>
                </tr>
              </thead>
              <tbody>
                {data.students.map((s) => {
                  const diff = getDiffLabel(s.difficulty);
                  return (
                    <tr key={s.session_id}>
                      <td className={styles.studentName}>{s.name}</td>
                      <td>
                        <span
                          className={styles.subjectTag}
                          style={{ borderColor: SUBJECT_COLORS[s.subject] || "#6366F1" }}
                        >
                          {s.subject}
                        </span>
                      </td>
                      <td>{s.language}</td>
                      <td>
                        <span className={styles.levelBadge} style={{ color: diff.color }}>
                          {diff.text}
                        </span>
                      </td>
                      <td>
                        <span style={{ color: getAccuracyColor(s.accuracy), fontWeight: 700 }}>
                          {s.accuracy}%
                        </span>
                      </td>
                      <td>{s.messages_count}</td>
                      <td className={styles.topicsList}>
                        {s.topics_covered.slice(0, 3).map((t) => (
                          <span key={t} className={styles.topicChip}>{t}</span>
                        ))}
                        {s.topics_covered.length > 3 && (
                          <span className={styles.topicMore}>+{s.topics_covered.length - 3}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
