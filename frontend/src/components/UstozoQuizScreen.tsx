/**
 * UstozoQuizScreen — A/B/C/D test ekrani
 * Foydalanuvchi savolga 4 variantdan birini tanlaydi,
 * server to'g'ri/noto'g'riligini tekshiradi.
 */
import { useEffect, useState, useCallback } from "react";
import {
  getUstozQuestions,
  checkUstozAnswer,
  type UstozoQuestion,
  type UstozoLesson,
  type UstozoSubject,
  type UstozoCheckResult,
} from "../api/ustoz";

type Props = {
  lesson: UstozoLesson;
  subject: UstozoSubject;
  onBack: () => void;
  onFinish: (result: { correct: number; total: number }) => void;
};

const OPTION_KEYS = ["a", "b", "c", "d"] as const;
type OptionKey = (typeof OPTION_KEYS)[number];
const OPTION_LABELS: Record<OptionKey, string> = { a: "A", b: "B", c: "C", d: "D" };
const OPTION_COLORS = {
  default: { bg: "var(--card)", border: "var(--border)", text: "var(--text)" },
  selected: { bg: "rgba(77,166,255,0.15)", border: "var(--accent)", text: "var(--text)" },
  correct: { bg: "rgba(34,197,94,0.15)", border: "var(--success)", text: "var(--success)" },
  wrong: { bg: "rgba(239,68,68,0.12)", border: "var(--error)", text: "var(--error)" },
};

function getOptionText(q: UstozoQuestion, key: OptionKey): string {
  const map: Record<OptionKey, string> = {
    a: q.optionA, b: q.optionB, c: q.optionC, d: q.optionD,
  };
  return map[key];
}

export default function UstozoQuizScreen({ lesson, subject, onBack, onFinish }: Props) {
  const [questions, setQuestions] = useState<UstozoQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // O'yin holati
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<OptionKey | null>(null);
  const [result, setResult] = useState<UstozoCheckResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    setLoading(true);
    getUstozQuestions(lesson.id)
      .then((data) => setQuestions(data.items))
      .catch(() => setError("Savollarni yuklab bo'lmadi."))
      .finally(() => setLoading(false));
  }, [lesson.id]);

  const currentQuestion = questions[currentIndex];
  const total = questions.length;

  const handleSelect = useCallback(
    async (key: OptionKey) => {
      if (selected || checking || !currentQuestion) return;
      setSelected(key);
      setChecking(true);
      try {
        const res = await checkUstozAnswer(currentQuestion.id, key);
        setResult(res);
        if (res.correct) setCorrectCount((c) => c + 1);
      } catch {
        setResult({ correct: false, correctOption: key, explanation: "" });
      } finally {
        setChecking(false);
      }
    },
    [selected, checking, currentQuestion]
  );

  const handleNext = useCallback(() => {
    if (currentIndex + 1 >= total) {
      setFinished(true);
      onFinish({ correct: correctCount + (result?.correct ? 0 : 0), total });
    } else {
      setCurrentIndex((i) => i + 1);
      setSelected(null);
      setResult(null);
    }
  }, [currentIndex, total, correctCount, result, onFinish]);

  // Tugagan ekran
  if (finished || (total > 0 && currentIndex >= total)) {
    const pct = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    const emoji = pct >= 80 ? "🏆" : pct >= 50 ? "👍" : "💪";
    return (
      <div
        className="animate-fadeInUp"
        style={{
          minHeight: "100dvh", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          background: "var(--bg)", padding: "24px 20px",
        }}
      >
        <div style={{ fontSize: "64px", marginBottom: "16px" }}>{emoji}</div>
        <div style={{ fontSize: "22px", fontWeight: 900, color: "var(--text)", marginBottom: "8px" }}>
          Test yakunlandi!
        </div>
        <div style={{ fontSize: "14px", color: "var(--muted)", marginBottom: "28px" }}>
          {subject.name} — {lesson.name}
        </div>
        <div style={{
          background: "var(--card)", border: "1px solid var(--border)",
          borderRadius: "20px", padding: "24px 32px", marginBottom: "28px",
          textAlign: "center", minWidth: "200px",
        }}>
          <div style={{ fontSize: "13px", color: "var(--muted)", letterSpacing: "2px", fontWeight: 700 }}>
            NATIJA
          </div>
          <div style={{
            fontSize: "48px", fontWeight: 900, marginTop: "6px",
            color: pct >= 80 ? "var(--success)" : pct >= 50 ? "var(--gold)" : "var(--error)",
          }}>
            {pct}%
          </div>
          <div style={{ fontSize: "15px", color: "var(--muted)", marginTop: "4px" }}>
            {correctCount}/{total} ta to'g'ri
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%", maxWidth: "340px" }}>
          <button
            type="button"
            onClick={() => {
              setCurrentIndex(0); setSelected(null); setResult(null);
              setCorrectCount(0); setFinished(false);
            }}
            style={{
              width: "100%", padding: "14px",
              background: "linear-gradient(135deg, #4DA6FF, #7C3AED)",
              border: "none", borderRadius: "14px",
              fontSize: "15px", fontWeight: 700, color: "white", cursor: "pointer",
            }}
          >
            🔄 Qayta ishlash
          </button>
          <button
            type="button"
            onClick={onBack}
            style={{
              width: "100%", padding: "14px",
              background: "var(--card)", border: "1px solid var(--border)",
              borderRadius: "14px", fontSize: "15px", fontWeight: 700,
              color: "var(--text)", cursor: "pointer",
            }}
          >
            ← Darslarga qaytish
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="animate-fadeInUp"
      style={{
        minHeight: "100dvh", display: "flex", flexDirection: "column",
        background: "var(--bg)", padding: "16px 16px 100px",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            width: "36px", height: "36px", borderRadius: "12px",
            background: "var(--card)", border: "1px solid var(--border)",
            color: "var(--muted)", cursor: "pointer", fontSize: "18px",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}
        >
          ‹
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: "14px", fontWeight: 800, color: "var(--text)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {subject.iconEmoji} {lesson.name}
          </div>
          <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "1px" }}>
            {currentIndex + 1}/{total} savol
          </div>
        </div>
        {/* Progress */}
        <div style={{
          fontSize: "13px", fontWeight: 800,
          color: "var(--success)", flexShrink: 0,
        }}>
          ✓ {correctCount}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{
        height: "4px", background: "var(--border)", borderRadius: "2px",
        marginBottom: "20px", overflow: "hidden",
      }}>
        <div style={{
          height: "100%",
          width: `${total > 0 ? ((currentIndex) / total) * 100 : 0}%`,
          background: "linear-gradient(90deg, #4DA6FF, #7C3AED)",
          borderRadius: "2px", transition: "width 0.4s ease",
        }} />
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted)" }}>
          <div style={{ fontSize: "24px", marginBottom: "8px" }}>⏳</div>
          <div style={{ fontSize: "14px", fontWeight: 600 }}>Yuklanmoqda...</div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
          borderRadius: "14px", padding: "16px",
          color: "var(--error)", fontSize: "14px", textAlign: "center",
        }}>
          {error}
        </div>
      )}

      {/* Savol */}
      {!loading && !error && currentQuestion && (
        <>
          {/* Savol kartasi */}
          <div style={{
            background: "var(--card)", border: "1px solid var(--border)",
            borderRadius: "20px", padding: "20px 18px",
            marginBottom: "16px", minHeight: "120px",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <div style={{
              fontSize: "16px", fontWeight: 700, color: "var(--text)",
              textAlign: "center", lineHeight: 1.6,
              userSelect: "none", WebkitUserSelect: "none",
            }}>
              {currentQuestion.text}
            </div>
          </div>

          {/* Variantlar A/B/C/D */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
            {OPTION_KEYS.map((key) => {
              let colorSet = OPTION_COLORS.default;
              if (result) {
                if (key === result.correctOption) colorSet = OPTION_COLORS.correct;
                else if (key === selected && !result.correct) colorSet = OPTION_COLORS.wrong;
              } else if (key === selected) {
                colorSet = OPTION_COLORS.selected;
              }

              return (
                <button
                  key={key}
                  type="button"
                  disabled={!!selected || checking}
                  onClick={() => void handleSelect(key)}
                  style={{
                    width: "100%", padding: "13px 14px",
                    background: colorSet.bg,
                    border: `1.5px solid ${colorSet.border}`,
                    borderRadius: "14px",
                    cursor: selected ? "default" : "pointer",
                    display: "flex", alignItems: "center", gap: "12px",
                    transition: "all 0.2s",
                    userSelect: "none",
                  }}
                >
                  <span style={{
                    width: "32px", height: "32px", borderRadius: "50%",
                    color: key === result?.correctOption || key === selected ? "white" : colorSet.border,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "13px", fontWeight: 900, flexShrink: 0,
                    border: `2px solid ${colorSet.border}`,
                    background: key === result?.correctOption
                      ? "var(--success)"
                      : (key === selected && result && !result.correct)
                        ? "var(--error)"
                        : key === selected
                          ? "var(--accent)"
                          : "transparent",
                  }}>
                    <span style={{ color: key === selected || key === result?.correctOption ? "white" : colorSet.border }}>
                      {OPTION_LABELS[key]}
                    </span>
                  </span>
                  <span style={{
                    fontSize: "14px", fontWeight: 600,
                    color: colorSet.text, flex: 1, textAlign: "left", lineHeight: 1.4,
                  }}>
                    {getOptionText(currentQuestion, key)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Izoh (to'g'ri javobdan keyin) */}
          {result && (
            <div style={{
              background: result.correct ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.08)",
              border: `1px solid ${result.correct ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.25)"}`,
              borderRadius: "16px", padding: "16px", marginBottom: "16px",
            }}>
              <div style={{
                fontSize: "14px", fontWeight: 800,
                color: result.correct ? "var(--success)" : "var(--error)",
                marginBottom: "6px",
              }}>
                {result.correct ? "✅ To'g'ri!" : "❌ Noto'g'ri"}
              </div>
              {result.explanation && (
                <div style={{ fontSize: "13px", color: "var(--text)", lineHeight: 1.6 }}>
                  {result.explanation}
                </div>
              )}
            </div>
          )}

          {/* Keyingi savol tugmasi */}
          {result && (
            <button
              type="button"
              onClick={handleNext}
              style={{
                width: "100%", padding: "15px",
                background: "linear-gradient(135deg, #4DA6FF, #7C3AED)",
                border: "none", borderRadius: "14px",
                fontSize: "15px", fontWeight: 700, color: "white", cursor: "pointer",
              }}
            >
              {currentIndex + 1 >= total ? "🏁 Yakunlash" : "Keyingisi →"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
