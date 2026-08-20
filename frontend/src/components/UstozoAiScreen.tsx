/**
 * UstozoAiScreen — Fan tanlash ekrani
 * Foydalanuvchi bu yerda qaysi fanni o'rganmoqchi ekanini tanlaydi.
 */
import { useEffect, useState } from "react";
import { getSubjects, type UstozoSubject } from "../api/ustoz";

type Props = {
  onSelectSubject: (subject: UstozoSubject) => void;
  onBack: () => void;
};

export default function UstozoAiScreen({ onSelectSubject, onBack }: Props) {
  const [subjects, setSubjects] = useState<UstozoSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    getSubjects()
      .then(setSubjects)
      .catch(() => setError("Fanlarni yuklab bo'lmadi. Qayta urinib ko'ring."))
      .finally(() => setLoading(false));
  }, []);

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
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
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
            🎓 Ustoz AI
          </div>
          <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>
            Fan tanlang
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                height: "80px", borderRadius: "16px",
                background: "var(--card)", border: "1px solid var(--border)",
                opacity: 0.6,
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
          borderRadius: "14px", padding: "16px", color: "var(--error)",
          fontSize: "14px", fontWeight: 600, textAlign: "center",
        }}>
          {error}
        </div>
      )}

      {/* Fan ro'yxati */}
      {!loading && !error && subjects.length === 0 && (
        <div style={{ textAlign: "center", color: "var(--muted)", padding: "40px 0" }}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>📚</div>
          <div style={{ fontSize: "14px", fontWeight: 600 }}>Hali fanlar qo'shilmagan</div>
          <div style={{ fontSize: "12px", marginTop: "4px" }}>Admin panelidan fan qo'shing</div>
        </div>
      )}

      {!loading && subjects.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {subjects.map((subject) => (
            <button
              key={subject.id}
              type="button"
              onClick={() => onSelectSubject(subject)}
              style={{
                width: "100%",
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "16px",
                padding: "16px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "14px",
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
              {/* Icon */}
              <div style={{
                width: "52px", height: "52px", borderRadius: "16px",
                background: "linear-gradient(135deg, rgba(77,166,255,0.15), rgba(124,58,237,0.15))",
                border: "1px solid rgba(77,166,255,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "26px", flexShrink: 0,
              }}>
                {subject.iconEmoji || "📚"}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: "15px", fontWeight: 800, color: "var(--text)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {subject.name}
                </div>
                {subject.description && (
                  <div style={{
                    fontSize: "12px", color: "var(--muted)", marginTop: "3px",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {subject.description}
                  </div>
                )}
                <div style={{
                  fontSize: "11px", color: "var(--accent)", marginTop: "5px",
                  fontWeight: 700, letterSpacing: "0.5px",
                }}>
                  {subject.lessonCount} ta dars
                </div>
              </div>

              <span style={{ fontSize: "18px", color: "var(--muted)", flexShrink: 0 }}>›</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
