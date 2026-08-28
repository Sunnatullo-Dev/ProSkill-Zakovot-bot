/**
 * UstozoQuizScreen — A/B/C/D test ekrani
 * 15 soniya timer, ball tizimi, natija ekrani
 */
import { useEffect, useState, useCallback, useRef } from "react";
import {
  getUstozQuestions,
  checkUstozAnswer,
  type UstozoQuestion,
  type UstozoLesson,
  type UstozoSubject,
  type UstozoCheckResult,
} from "../api/ustoz";
import { useGameSounds } from "../hooks/useGameSounds";

const QUESTION_TIME = 15;
const BASE_POINTS = 10;
const BONUS_FAST = 5;

type Props = {
  lesson: UstozoLesson;
  subject: UstozoSubject;
  onBack: () => void;
  onFinish: (result: { correct: number; total: number; score: number }) => void;
};

const OPTION_KEYS = ["a", "b", "c", "d"] as const;
type OptionKey = (typeof OPTION_KEYS)[number];
const OPTION_LABELS: Record<OptionKey, string> = { a: "A", b: "B", c: "C", d: "D" };
const ACCENT: Record<OptionKey, string> = { a: "#4DA6FF", b: "#a78bfa", c: "#34d399", d: "#fb923c" };

function getOptionText(q: UstozoQuestion, key: OptionKey): string {
  return ({ a: q.optionA, b: q.optionB, c: q.optionC, d: q.optionD })[key];
}

function CircleTimer({ timeLeft, total }: { timeLeft: number; total: number }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const dash = circ * (timeLeft / total);
  const color = timeLeft > 8 ? "#4DA6FF" : timeLeft > 4 ? "#F5C842" : "#ef4444";
  return (
    <div style={{ position: "relative", width: 56, height: 56, flexShrink: 0 }}>
      <svg width={56} height={56} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={28} cy={28} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={4} />
        <circle cx={28} cy={28} r={r} fill="none" stroke={color} strokeWidth={4}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.9s linear, stroke 0.3s" }} />
      </svg>
      <div style={{
        position: "absolute", inset: 0, display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: "15px", fontWeight: 900, color, transition: "color 0.3s",
      }}>{timeLeft}</div>
    </div>
  );
}

export default function UstozoQuizScreen({ lesson, subject, onBack, onFinish }: Props) {
  const [questions, setQuestions] = useState<UstozoQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<OptionKey | null>(null);
  const [result, setResult] = useState<UstozoCheckResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeLeftRef = useRef(QUESTION_TIME);
  const answeredRef = useRef(false);
  const { soundCorrect, soundWrong } = useGameSounds();

  useEffect(() => {
    setLoading(true);
    getUstozQuestions(lesson.id)
      .then((data) => setQuestions(data.items))
      .catch(() => setError("Savollarni yuklab bo'lmadi."))
      .finally(() => setLoading(false));
  }, [lesson.id]);

  const currentQuestion = questions[currentIndex];
  const total = questions.length;

  const handleSelect = useCallback(async (key: OptionKey, timedOut = false) => {
    if (answeredRef.current || checking || !currentQuestion) return;
    answeredRef.current = true;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    const elapsed = QUESTION_TIME - timeLeftRef.current;
    setSelected(key);
    setChecking(true);
    try {
      const res = await checkUstozAnswer(currentQuestion.id, key);
      setResult(res);
      if (res.correct && !timedOut) {
        soundCorrect();
        setCorrectCount((c) => c + 1);
        setTotalScore((s) => s + BASE_POINTS + (elapsed <= 5 ? BONUS_FAST : 0));
      } else {
        soundWrong();
      }
    } catch {
      soundWrong();
      setResult({ correct: false, correctOption: key, explanation: "" });
    } finally {
      setChecking(false);
    }
  }, [checking, currentQuestion, soundCorrect, soundWrong]);

  useEffect(() => {
    if (loading || !currentQuestion || finished) return;
    answeredRef.current = false;
    setTimeLeft(QUESTION_TIME);
    timeLeftRef.current = QUESTION_TIME;
    timerRef.current = setInterval(() => {
      timeLeftRef.current -= 1;
      setTimeLeft(timeLeftRef.current);
      if (timeLeftRef.current <= 0) {
        clearInterval(timerRef.current!);
        timerRef.current = null;
        if (!answeredRef.current) void handleSelect("a", true);
      }
    }, 1000);
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, loading, finished]);

  const handleNext = useCallback(() => {
    if (currentIndex + 1 >= total) {
      setFinished(true);
      onFinish({ correct: correctCount, total, score: totalScore });
    } else {
      setCurrentIndex((i) => i + 1);
      setSelected(null);
      setResult(null);
    }
  }, [currentIndex, total, correctCount, totalScore, onFinish]);

  // ── Natija ekrani ─────────────────────────────────────────────────────────
  if (finished || (total > 0 && currentIndex >= total)) {
    const pct = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    const emoji = pct >= 80 ? "🏆" : pct >= 50 ? "👍" : "💪";
    const grade = pct >= 80 ? "A'lo!" : pct >= 60 ? "Yaxshi!" : pct >= 40 ? "Qoniqarli" : "Harakat qiling!";
    const gColor = pct >= 80 ? "var(--success)" : pct >= 60 ? "var(--gold)" : pct >= 40 ? "#fb923c" : "var(--error)";
    return (
      <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", background: "var(--bg)", padding: "24px 20px 40px" }}>
        <button type="button" onClick={onBack} style={{ alignSelf: "flex-start", padding: "8px 14px", background: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", color: "var(--muted)", cursor: "pointer", fontSize: "14px", fontWeight: 700, marginBottom: "28px" }}>
          ← Darslarga qaytish
        </button>
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div style={{ fontSize: "72px", marginBottom: "10px" }}>{emoji}</div>
          <div style={{ fontSize: "24px", fontWeight: 900, color: "var(--text)" }}>Test yakunlandi!</div>
          <div style={{ fontSize: "13px", color: "var(--muted)", marginTop: "4px" }}>{subject.iconEmoji} {subject.name} — {lesson.name}</div>
        </div>
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: "24px", padding: "28px 20px", marginBottom: "16px" }}>
          <div style={{ textAlign: "center", marginBottom: "24px" }}>
            <div style={{ fontSize: "64px", fontWeight: 900, color: gColor, lineHeight: 1 }}>{pct}%</div>
            <div style={{ fontSize: "18px", fontWeight: 800, color: gColor, marginTop: "4px" }}>{grade}</div>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            {[
              { val: correctCount, label: "TO'G'RI", sub: `/ ${total}`, bg: "rgba(34,197,94,0.1)", border: "rgba(34,197,94,0.25)", color: "var(--success)" },
              { val: total - correctCount, label: "XATO", sub: `/ ${total}`, bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.2)", color: "var(--error)" },
              { val: totalScore, label: "BALL", sub: `/ ${total * (BASE_POINTS + BONUS_FAST)}`, bg: "rgba(245,200,66,0.1)", border: "rgba(245,200,66,0.25)", color: "var(--gold)" },
            ].map((s) => (
              <div key={s.label} style={{ flex: 1, textAlign: "center", background: s.bg, border: `1px solid ${s.border}`, borderRadius: "16px", padding: "14px 4px" }}>
                <div style={{ fontSize: "28px", fontWeight: 900, color: s.color }}>{s.val}</div>
                <div style={{ fontSize: "9px", color: s.color, fontWeight: 700, marginTop: "2px" }}>{s.label}</div>
                <div style={{ fontSize: "9px", color: "var(--muted)", marginTop: "1px" }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <button type="button"
            onClick={() => { setCurrentIndex(0); setSelected(null); setResult(null); setCorrectCount(0); setTotalScore(0); setFinished(false); setTimeLeft(QUESTION_TIME); timeLeftRef.current = QUESTION_TIME; answeredRef.current = false; }}
            style={{ width: "100%", padding: "15px", background: "linear-gradient(135deg,#4DA6FF,#7C3AED)", border: "none", borderRadius: "14px", fontSize: "15px", fontWeight: 700, color: "white", cursor: "pointer" }}>
            🔄 Qayta ishlash
          </button>
          <button type="button" onClick={onBack}
            style={{ width: "100%", padding: "15px", background: "var(--card)", border: "1px solid var(--border)", borderRadius: "14px", fontSize: "15px", fontWeight: 700, color: "var(--text)", cursor: "pointer" }}>
            ← Darslarga qaytish
          </button>
        </div>
      </div>
    );
  }

  // ── Savol ekrani ──────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", background: "var(--bg)", padding: "16px 16px 100px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
        <button type="button" onClick={onBack} style={{ width: 36, height: 36, borderRadius: "12px", background: "var(--card)", border: "1px solid var(--border)", color: "var(--muted)", cursor: "pointer", fontSize: "18px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          ‹
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "13px", fontWeight: 800, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {subject.iconEmoji} {lesson.name}
          </div>
          <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "1px" }}>
            {currentIndex + 1}/{total} savol · ✅ {correctCount} · ⭐ {totalScore}
          </div>
        </div>
        {!selected && currentQuestion
          ? <CircleTimer timeLeft={timeLeft} total={QUESTION_TIME} />
          : <div style={{ width: 56, height: 56, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px" }}>{result?.correct ? "✅" : "❌"}</div>
        }
      </div>

      {/* Progress bar */}
      <div style={{ height: 4, background: "var(--border)", borderRadius: 2, marginBottom: 18, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${total > 0 ? (currentIndex / total) * 100 : 0}%`, background: "linear-gradient(90deg,#4DA6FF,#7C3AED)", borderRadius: 2, transition: "width 0.4s ease" }} />
      </div>

      {loading && <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted)" }}><div style={{ fontSize: 24 }}>⏳</div><div style={{ fontSize: 14, fontWeight: 600 }}>Yuklanmoqda...</div></div>}
      {error && <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 14, padding: 16, color: "var(--error)", fontSize: 14, textAlign: "center" }}>{error}</div>}

      {!loading && !error && currentQuestion && (
        <>
          {/* Ball ko'rsatkichi */}
          <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 10, fontSize: 12 }}>
            <span style={{ color: "var(--muted)" }}>⭐ {BASE_POINTS} ball</span>
            <span style={{ color: timeLeft > 5 ? "var(--gold)" : "rgba(245,200,66,0.3)", fontWeight: 700, transition: "color 0.5s" }}>⚡ +{BONUS_FAST} tez bonus</span>
          </div>

          {/* Savol kartasi */}
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 20, padding: "20px 18px", marginBottom: 14, minHeight: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", textAlign: "center", lineHeight: 1.6, userSelect: "none" }}>
              {currentQuestion.text}
            </div>
          </div>

          {/* Variantlar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 14 }}>
            {OPTION_KEYS.map((key) => {
              let bg = "var(--card)";
              let border = `rgba(${key === "a" ? "77,166,255" : key === "b" ? "167,139,250" : key === "c" ? "52,211,153" : "251,146,60"},0.35)`;
              let textColor = "var(--text)";
              let circleBg = "transparent";
              let circleColor = ACCENT[key];
              let opacity = 1;
              if (result) {
                if (key === result.correctOption) { bg = "rgba(34,197,94,0.12)"; border = "rgba(34,197,94,0.5)"; textColor = "var(--success)"; circleBg = "var(--success)"; circleColor = "white"; }
                else if (key === selected && !result.correct) { bg = "rgba(239,68,68,0.1)"; border = "rgba(239,68,68,0.4)"; textColor = "var(--error)"; circleBg = "var(--error)"; circleColor = "white"; }
                else opacity = 0.4;
              } else if (key === selected) {
                bg = "rgba(77,166,255,0.12)"; border = "var(--accent)"; textColor = "var(--accent)"; circleBg = "var(--accent)"; circleColor = "white";
              }
              return (
                <button key={key} type="button" disabled={!!selected || checking} onClick={() => void handleSelect(key)}
                  style={{ width: "100%", padding: "13px 14px", background: bg, border: `1.5px solid ${border}`, borderRadius: 14, cursor: selected ? "default" : "pointer", display: "flex", alignItems: "center", gap: 12, transition: "all 0.2s", userSelect: "none", opacity }}>
                  <span style={{ width: 32, height: 32, borderRadius: "50%", background: circleBg, border: `2px solid ${circleColor}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, flexShrink: 0, color: circleBg !== "transparent" ? "white" : circleColor, transition: "all 0.2s" }}>
                    {OPTION_LABELS[key]}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: textColor, flex: 1, textAlign: "left", lineHeight: 1.4, transition: "color 0.2s" }}>
                    {getOptionText(currentQuestion, key)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Izoh */}
          {result && (
            <div style={{ background: result.correct ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)", border: `1px solid ${result.correct ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.25)"}`, borderRadius: 16, padding: "14px 16px", marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: result.correct ? "var(--success)" : "var(--error)", marginBottom: result.explanation ? 6 : 0, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>{result.correct ? "✅ To'g'ri!" : "❌ Noto'g'ri"}</span>
                {result.correct && <span style={{ color: "var(--gold)", fontWeight: 800, fontSize: 13 }}>+{QUESTION_TIME - timeLeft <= 5 ? BASE_POINTS + BONUS_FAST : BASE_POINTS} ⭐</span>}
              </div>
              {result.explanation && <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>{result.explanation}</div>}
            </div>
          )}

          {result && (
            <button type="button" onClick={handleNext}
              style={{ width: "100%", padding: 15, background: "linear-gradient(135deg,#4DA6FF,#7C3AED)", border: "none", borderRadius: 14, fontSize: 15, fontWeight: 700, color: "white", cursor: "pointer" }}>
              {currentIndex + 1 >= total ? "🏁 Natijani ko'rish" : "Keyingisi →"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
