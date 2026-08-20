/**
 * UstozoLessonsScreen — Dars tanlash ekrani
 * Tanlangan fan ichidagi darslar ro'yxati.
 */
import { useEffect, useState } from "react";
import { getLessons, type UstozoLesson, type UstozoSubject } from "../api/ustoz";

type Props = {
  subject: UstozoSubject;
  onSelectLesson: (lesson: UstozoLesson) => void;
  onBack: () => void;
};

export default function UstozoLessonsScreen({ subject, onSelectLesson, onBack }: Props) {
  const [lessons, setLessons] = useState<UstozoLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    getLessons(subject.id)
      .then((data) => setLessons(data.items))
      .catch(() => setError("Darslarni yuklab bo'lmadi."))
      .finally(() => setLoading(false));
  }, [subject.id]);

  return (
    <div
      className="animate-fadeInUp"
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg)",
        padding: "20px 16px 100px",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            width: "36px", height: "36px", borderRadius: "12px",
            background: "var(--card)", border: "1px solid var(--border)",
            color: "var(--muted)", cursor: "pointer", fontSize: "18px",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}
        >
          ‹
        </button>
        <div>
          <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--text)" }}>
            {subject.iconEmoji} {subject.name}
          </div>
          <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>
            Dars tanlang
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "16px" }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                height: "72px", borderRadius: "14px",
                background: "var(--card)", border: "1px solid var(--border)",
                opacity: 0.6,
              }}
            />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
          borderRadius: "14px", padding: "16px", marginTop: "16px",
          color: "var(--error)", fontSize: "14px", fontWeight: 600, textAlign: "center",
        }}>
          {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && lessons.length === 0 && (
        <div style={{ textAlign: "center", color: "var(--muted)", padding: "40px 0", marginTop: "16px" }}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>📖</div>
          <div style={{ fontSize: "14px", fontWeight: 600 }}>Bu fanda hali darslar yo'q</div>
        </div>
      )}

      {/* Darslar ro'yxati */}
      {!loading && lessons.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "16px" }}>
          {lessons.map((lesson, index) => (
            <button
              key={lesson.id}
              type="button"
              onClick={() => onSelectLesson(lesson)}
              style={{
                width: "100%",
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "14px",
                padding: "14px 16px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                textAlign: "left",
                transition: "border-color 0.2s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
              }}
            >
              {/* Raqam */}
              <div style={{
                width: "36px", height: "36px", borderRadius: "10px",
                background: "linear-gradient(135deg, #4DA6FF, #7C3AED)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "14px", fontWeight: 900, color: "white", flexShrink: 0,
              }}>
                {index + 1}
              </div>

              {/* Dars nomi */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: "14px", fontWeight: 700, color: "var(--text)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {lesson.name}
                </div>
                {lesson.description && (
                  <div style={{
                    fontSize: "12px", color: "var(--muted)", marginTop: "2px",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {lesson.description}
                  </div>
                )}
                <div style={{
                  fontSize: "11px", color: lesson.questionCount > 0 ? "var(--success)" : "var(--muted)",
                  marginTop: "4px", fontWeight: 700,
                }}>
                  {lesson.questionCount > 0 ? `✓ ${lesson.questionCount} ta savol` : "Hali savol yo'q"}
                </div>
              </div>

              {lesson.questionCount > 0 && (
                <span style={{ fontSize: "18px", color: "var(--muted)", flexShrink: 0 }}>›</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
