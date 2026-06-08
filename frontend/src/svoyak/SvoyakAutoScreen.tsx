/**
 * Svoyak Auto rejimi — ikki fazali taymer:
 *
 *  1. O'qish fazasi  (10s) — savol ko'rinadi, input BLOKLANGAN
 *  2. Javob fazasi   (sozlanuvchi) — input ochiladi, timer boshlanadi
 *
 * Javob bergach yoki vaqt tugagach keyingi savolga o'tiladi.
 */
import { useEffect, useRef, useState } from "react";
import { autoAnswer, endGame } from "./api";
import { useSvoyakRoom } from "./useSvoyakRoom";
import type { SvoyakRoomState } from "./types";
import { hapticResult, hapticTap } from "../utils/haptics";
import { useAppSettings } from "../hooks/useAppSettings";

const READING_SECS = 10; // O'qish fazasi — backend bilan mos (READING_TIME_MS = 10_000)

type Props = {
  code: string;
  onGameEnded: (state: SvoyakRoomState) => void;
  onExit: () => void;
};

const PAGE = {
  minHeight: "100dvh",
  background:
    "radial-gradient(140% 80% at 50% -10%, rgba(245,200,66,0.10), transparent 55%)," +
    "radial-gradient(140% 100% at 50% 110%, rgba(124,58,237,0.16), transparent 60%)," +
    "var(--svoyak-bg, #0a1428)",
  color: "var(--text)",
  fontFamily: "var(--svoyak-font-body, 'Inter', sans-serif)",
  padding: "16px 16px 100px",
  maxWidth: "430px",
  margin: "0 auto",
} as const;

export default function SvoyakAutoScreen({ code, onGameEnded, onExit }: Props) {
  const { data, error } = useSvoyakRoom(code);
  const appSettings = useAppSettings();
  const timePerQuestion = appSettings.svoyakTimePerQuestion ?? 70;

  // ── Holat ─────────────────────────────────────────────────────────────────
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Mahalliy fazalar va taymerlari
  const [localPhase, setLocalPhase] = useState<"reading" | "answering">("reading");
  const [readingSec, setReadingSec] = useState(READING_SECS);
  const [localSec, setLocalSec] = useState(timePerQuestion);

  const lastQuestionIdx = useRef<number>(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── O'yin tugadi ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (data?.status === "finished") onGameEnded(data);
  }, [data?.status, onGameEnded, data]);

  // ── Yangi savol: taymerni reset ───────────────────────────────────────────
  useEffect(() => {
    if (!data?.autoState) return;
    const idx = data.autoState.questionIndex;
    if (idx === lastQuestionIdx.current) return;
    lastQuestionIdx.current = idx;

    setAnswer("");
    setSubmitting(false);

    // Server'dan kelgan faza va qolgan vaqtni olish
    const serverPhase = data.autoState.phase ?? "reading";
    setLocalPhase(serverPhase);

    if (serverPhase === "reading") {
      setReadingSec(Math.ceil((data.autoState.readingTimeRemainingMs ?? READING_SECS * 1000) / 1000));
      setLocalSec(Math.ceil(data.autoState.timeRemainingMs / 1000) || timePerQuestion);
    } else {
      setReadingSec(0);
      setLocalSec(Math.ceil(data.autoState.timeRemainingMs / 1000) || timePerQuestion);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [data?.autoState?.questionIndex, timePerQuestion]);

  // ── O'qish fazasi taymer ──────────────────────────────────────────────────
  useEffect(() => {
    if (!data?.autoState?.isPlaying || localPhase !== "reading") return;
    if (readingSec <= 0) {
      setLocalPhase("answering");
      setTimeout(() => inputRef.current?.focus(), 80);
      return;
    }
    const id = window.setInterval(() => {
      setReadingSec((s) => {
        const next = Math.max(0, s - 1);
        if (next === 0) {
          setLocalPhase("answering");
          setTimeout(() => inputRef.current?.focus(), 80);
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [localPhase, data?.autoState?.isPlaying, data?.autoState?.questionIndex]);

  // ── Javob fazasi taymer ───────────────────────────────────────────────────
  useEffect(() => {
    if (!data?.autoState?.isPlaying || localPhase !== "answering") return;
    const id = window.setInterval(() => {
      setLocalSec((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [localPhase, data?.autoState?.isPlaying, data?.autoState?.questionIndex]);

  // ── Xato holat ───────────────────────────────────────────────────────────
  if (error || !data) {
    return (
      <div style={{ ...PAGE, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", color: "var(--muted)" }}>
          <div style={{ fontSize: "32px", marginBottom: "12px" }}>⚠️</div>
          <div>Ulanishda xato</div>
          <button
            type="button"
            style={{ marginTop: "16px", padding: "10px 20px", borderRadius: "10px", border: "none", background: "var(--accent)", color: "white", cursor: "pointer" }}
            onClick={onExit}
          >
            Chiqish
          </button>
        </div>
      </div>
    );
  }

  const auto = data.autoState;
  const players = [...data.players].sort((a, b) => b.score - a.score);
  const myId = data.viewerTelegramId;
  const isHost = data.viewerIsHost;

  // Javob berish
  async function handleSubmit() {
    if (!answer.trim() || submitting || auto?.myAttempt || localPhase !== "answering") return;
    setSubmitting(true);
    try {
      const result = await autoAnswer({ code, answer: answer.trim() });
      const myAttempt = result.autoState?.myAttempt;
      if (myAttempt) {
        hapticResult(myAttempt.isCorrect ? "correct" : "incorrect");
      }
    } catch {
      /* silent */
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEnd() {
    hapticTap();
    await endGame(code).catch(() => {});
    onExit();
  }

  // Taymer ring rang — javob fazasiga nisbatan
  const answerTimerColor =
    localSec > timePerQuestion * 0.6
      ? "var(--svoyak-gold, #f5c842)"
      : localSec > timePerQuestion * 0.25
      ? "var(--warning, #f59e0b)"
      : "var(--error, #ef4444)";

  const totalQ = auto?.totalQuestions ?? 0;
  const qIdx = (auto?.questionIndex ?? 0) + 1;
  const myAttempt = auto?.myAttempt ?? null;
  const attempts = auto?.attempts ?? [];
  const isPlaying = !!auto?.isPlaying;

  return (
    <div style={PAGE}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
        <div style={{ fontSize: "14px", fontWeight: 800, color: "var(--text)" }}>🎯 Svoyak</div>
        {isPlaying && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "13px", color: "var(--muted)" }}>
              Savol {qIdx}/{totalQ}
            </span>
            {/* Faza belgisi */}
            <span style={{
              fontSize: "12px", fontWeight: 700, padding: "3px 8px",
              borderRadius: "8px",
              background: localPhase === "reading" ? "rgba(77,166,255,0.15)" : "rgba(245,200,66,0.15)",
              color: localPhase === "reading" ? "#4DA6FF" : "var(--svoyak-gold, #f5c842)",
              border: `1px solid ${localPhase === "reading" ? "rgba(77,166,255,0.3)" : "rgba(245,200,66,0.3)"}`,
            }}>
              {localPhase === "reading" ? `📖 ${readingSec}s` : `⏱ ${localSec}s`}
            </span>
          </div>
        )}
        {isHost && (
          <button
            type="button"
            style={{ padding: "6px 12px", borderRadius: "8px", border: "1px solid rgba(239,68,68,0.4)", background: "rgba(239,68,68,0.1)", color: "var(--error, #ef4444)", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
            onClick={handleEnd}
          >
            Tugatish
          </button>
        )}
      </div>

      {/* ── Scoreboard ─────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "14px", overflowX: "auto" }}>
        {players.map((p, i) => (
          <div
            key={p.telegramId}
            style={{
              flex: "0 0 auto", padding: "8px 12px", borderRadius: "12px",
              background: p.telegramId === myId ? "rgba(245,200,66,0.18)" : "var(--svoyak-surface, #0f1f3a)",
              border: `1px solid ${p.telegramId === myId ? "rgba(245,200,66,0.5)" : "var(--svoyak-border, #1f3a6e)"}`,
              textAlign: "center", minWidth: "70px",
            }}
          >
            <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "2px" }}>
              {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`} {p.displayName.split(" ")[0]}
            </div>
            <div style={{ fontSize: "20px", fontWeight: 900, color: "var(--svoyak-gold, #f5c842)" }}>
              {p.score}
            </div>
          </div>
        ))}
      </div>

      {/* ── Savol va Taymer ────────────────────────────────────────────────── */}
      {isPlaying && auto?.questionText ? (
        <>
          {/* Savol matni */}
          <div style={{
            background: "var(--svoyak-surface, #0f1f3a)",
            border: `1.5px solid ${localPhase === "reading" ? "rgba(77,166,255,0.35)" : "var(--svoyak-border, #1f3a6e)"}`,
            borderRadius: "20px",
            padding: "24px 20px",
            fontSize: "18px",
            fontWeight: 700,
            color: "var(--text)",
            lineHeight: 1.5,
            textAlign: "center",
            marginBottom: "20px",
            userSelect: "none",
            transition: "border-color 0.4s",
          }}>
            {auto.questionText}
          </div>

          {/* ─── O'qish fazasi UI ─────────────────────────────────────────── */}
          {localPhase === "reading" ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
              {/* Ring taymer — moviy */}
              {(() => {
                const r = 34;
                const circ = 2 * Math.PI * r;
                const progress = readingSec / READING_SECS;
                return (
                  <svg width="82" height="82" viewBox="0 0 82 82">
                    <circle cx="41" cy="41" r={r} fill="none" stroke="var(--svoyak-border,#1f3a6e)" strokeWidth="5" />
                    <circle
                      cx="41" cy="41" r={r} fill="none"
                      stroke="#4DA6FF"
                      strokeWidth="5"
                      strokeDasharray={circ}
                      strokeDashoffset={circ * (1 - progress)}
                      strokeLinecap="round"
                      transform="rotate(-90 41 41)"
                      style={{ transition: "stroke-dashoffset 1s linear" }}
                    />
                    <text x="41" y="41" textAnchor="middle" dominantBaseline="central"
                      fill="#4DA6FF" fontSize="20" fontWeight="900">
                      {readingSec}
                    </text>
                  </svg>
                );
              })()}

              {/* Matn */}
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "15px", fontWeight: 800, color: "#4DA6FF", marginBottom: "4px" }}>
                  📖 Savolni o'qing
                </div>
                <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                  Javob yozish {readingSec}s dan keyin ochiladi
                </div>
              </div>

              {/* Bloklangan input */}
              <div style={{
                width: "100%",
                padding: "16px 18px",
                background: "rgba(255,255,255,0.03)",
                border: "1.5px dashed rgba(77,166,255,0.2)",
                borderRadius: "14px",
                fontSize: "15px",
                color: "rgba(136,146,164,0.5)",
                textAlign: "center",
                userSelect: "none",
                letterSpacing: "0.5px",
              }}>
                🔒 Javob yozish bloklangan
              </div>
            </div>
          ) : (
            /* ─── Javob berish fazasi UI ──────────────────────────────────── */
            <>
              {/* Ring taymer — sariq/qizil */}
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "18px" }}>
                {(() => {
                  const r = 28;
                  const circ = 2 * Math.PI * r;
                  const progress = localSec / timePerQuestion;
                  return (
                    <svg width="70" height="70" viewBox="0 0 70 70">
                      <circle cx="35" cy="35" r={r} fill="none" stroke="var(--svoyak-border,#1f3a6e)" strokeWidth="5" />
                      <circle
                        cx="35" cy="35" r={r} fill="none"
                        stroke={answerTimerColor}
                        strokeWidth="5"
                        strokeDasharray={circ}
                        strokeDashoffset={circ * (1 - progress)}
                        strokeLinecap="round"
                        transform="rotate(-90 35 35)"
                        style={{ transition: "stroke-dashoffset 1s linear, stroke 0.5s" }}
                      />
                      <text x="35" y="35" textAnchor="middle" dominantBaseline="central"
                        fill={answerTimerColor} fontSize="18" fontWeight="900">
                        {localSec}
                      </text>
                    </svg>
                  );
                })()}
              </div>

              {myAttempt ? (
                /* Allaqachon javob berildi */
                <div style={{
                  padding: "18px", borderRadius: "14px",
                  background: myAttempt.isCorrect ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.12)",
                  border: `1px solid ${myAttempt.isCorrect ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.3)"}`,
                  textAlign: "center", marginBottom: "14px",
                }}>
                  <div style={{ fontSize: "24px", marginBottom: "6px" }}>
                    {myAttempt.isCorrect ? "✅" : "❌"}
                  </div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: myAttempt.isCorrect ? "var(--success, #22c55e)" : "var(--error, #ef4444)" }}>
                    {myAttempt.isCorrect ? "To'g'ri javob!" : "Noto'g'ri"}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "4px" }}>
                    Boshqalarni kuting...
                  </div>
                </div>
              ) : (
                /* Input */
                <>
                  <input
                    ref={inputRef}
                    placeholder="Javobingizni yozing..."
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && answer.trim()) void handleSubmit(); }}
                    disabled={submitting || localSec === 0}
                    style={{
                      width: "100%",
                      padding: "16px 18px",
                      background: "var(--svoyak-surface, #0f1f3a)",
                      border: "1.5px solid var(--svoyak-border, #1f3a6e)",
                      borderRadius: "14px",
                      fontSize: "16px",
                      color: "var(--text)",
                      outline: "none",
                      marginBottom: "10px",
                      boxSizing: "border-box",
                    }}
                  />
                  <button
                    type="button"
                    disabled={!answer.trim() || submitting || localSec === 0}
                    onClick={() => void handleSubmit()}
                    style={{
                      width: "100%",
                      padding: "15px",
                      borderRadius: "14px",
                      border: "none",
                      background: answer.trim() && !submitting && localSec > 0
                        ? "linear-gradient(135deg, var(--svoyak-gold,#f5c842), #FF8A4C)"
                        : "var(--border)",
                      color: answer.trim() && !submitting && localSec > 0 ? "#0B0B14" : "var(--muted)",
                      fontSize: "16px",
                      fontWeight: 800,
                      cursor: answer.trim() && !submitting && localSec > 0 ? "pointer" : "not-allowed",
                      opacity: answer.trim() && !submitting && localSec > 0 ? 1 : 0.5,
                      fontFamily: "var(--svoyak-font-heading, 'Montserrat', sans-serif)",
                    }}
                  >
                    {submitting ? "Yuborilmoqda..." : "Javob berish ✓"}
                  </button>
                </>
              )}

              {/* Boshqa o'yinchilarning holati */}
              {attempts.length > 0 && (
                <div style={{ marginTop: "14px" }}>
                  <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "6px", letterSpacing: "1px" }}>
                    JAVOBLAR
                  </div>
                  {attempts.map((a) => (
                    <div
                      key={a.telegramId}
                      style={{
                        display: "flex", alignItems: "center", gap: "8px",
                        padding: "7px 10px", borderRadius: "10px",
                        background: "var(--svoyak-surface, #0f1f3a)",
                        border: "1px solid var(--svoyak-border, #1f3a6e)",
                        marginBottom: "5px", fontSize: "13px",
                      }}
                    >
                      <span style={{ color: a.isCorrect ? "var(--success, #22c55e)" : "var(--error, #ef4444)", fontWeight: 800 }}>
                        {a.isCorrect ? "✓" : "✗"}
                      </span>
                      <span style={{ fontWeight: 700, color: "var(--text)" }}>{a.displayName}</span>
                      <span style={{ color: "var(--muted)", marginLeft: "auto" }}>{a.answer}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      ) : auto && !auto.isPlaying && data.status === "playing" ? (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--muted)" }}>
          <div style={{ fontSize: "28px", marginBottom: "10px" }}>⏳</div>
          <div style={{ fontWeight: 700 }}>Keyingi savol tayyorlanmoqda...</div>
        </div>
      ) : null}
    </div>
  );
}
