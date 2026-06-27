/**
 * Svoyak Auto rejimi — ikki fazali taymer:
 *
 *  1. O'qish fazasi  (10s) — savol ko'rinadi, input BLOKLANGAN
 *  2. Javob fazasi   (sozlanuvchi) — input ochiladi, timer boshlanadi
 *
 * Javob bergach yoki vaqt tugagach keyingi savolga o'tiladi.
 *
 * TTS: Gemini fetchTTS orqali yuqori sifatli o'zbek ovozi (asosiy quiz bilan bir xil).
 * Mute kaliti: zakovat:tts:muted (asosiy quiz bilan umumiy, default: O'CHIRILMAGAN).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { autoAnswer, endGame } from "./api";
import { useSvoyakRoom } from "./useSvoyakRoom";
import { fetchTTS } from "../api/client";
import type { SvoyakRoomState } from "./types";
import { hapticResult, hapticTap } from "../utils/haptics";
import { useAppSettings } from "../hooks/useAppSettings";

const READING_SECS = 10; // O'qish fazasi — backend bilan mos (READING_TIME_MS = 10_000)
const TTS_MUTE_KEY = "zakovat:tts:muted"; // QuestionCard bilan umumiy kalit

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

// Gemini ba'zan WAV header'siz raw L16 PCM qaytaradi.
// Agar RIFF imzosi yo'q bo'lsa — 24kHz/16-bit/mono WAV header qo'shamiz.
function addWavHeaderIfNeeded(bytes: Uint8Array): ArrayBuffer {
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  }
  const sampleRate = 24000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const dataSize = bytes.byteLength;
  const buf = new ArrayBuffer(44 + dataSize);
  const v = new DataView(buf);
  const s = (o: number, t: string) => { for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
  s(0, "RIFF"); v.setUint32(4, 36 + dataSize, true); s(8, "WAVE");
  s(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
  v.setUint16(22, numChannels, true); v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * numChannels * bitsPerSample / 8, true);
  v.setUint16(32, numChannels * bitsPerSample / 8, true); v.setUint16(34, bitsPerSample, true);
  s(36, "data"); v.setUint32(40, dataSize, true);
  new Uint8Array(buf, 44).set(bytes);
  return buf;
}

export default function SvoyakAutoScreen({ code, onGameEnded, onExit }: Props) {
  const { data, error } = useSvoyakRoom(code);
  const appSettings = useAppSettings();
  const timePerQuestion = appSettings.svoyakTimePerQuestion ?? 70;

  // ── Holat ─────────────────────────────────────────────────────────────────
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // Buzz gate: har yangi savol uchun "+" bosilgunicha javob UI yashiriladi
  const [buzzed, setBuzzed] = useState(false);

  // Mahalliy fazalar va taymerlari
  const [localPhase, setLocalPhase] = useState<"reading" | "answering">("reading");
  const [readingSec, setReadingSec] = useState(READING_SECS);
  const [localSec, setLocalSec] = useState(timePerQuestion);

  const lastQuestionIdx = useRef<number>(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Gemini TTS holat ─────────────────────────────────────────────────────
  // Mute — QuestionCard bilan umumiy kalit, default: O'CHIRILMAGAN (false)
  const [ttsIsMuted, setTtsIsMuted] = useState<boolean>(() => {
    try { return localStorage.getItem(TTS_MUTE_KEY) === "1"; } catch { return false; }
  });
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);
  const [isLoadingTTS, setIsLoadingTTS] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // AudioContext — komponent mount bo'lganda yaratiladi.
  // Svoyak lobby'sida foydalanuvchi allaqachon biror tugma bosgan bo'ladi
  // (join/start), shuning uchun resume() muvaffaqiyatli ishlaydi.
  useEffect(() => {
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;
    ctx.resume().catch(() => {});
    return () => {
      ctx.close().catch(() => {});
    };
  }, []);

  // Bufer qaytadan chalish (replay tugmasi uchun)
  const playBuffer = useCallback((onEnded?: () => void) => {
    const ctx = audioCtxRef.current;
    const buffer = audioBufferRef.current;
    if (!ctx || !buffer) return;

    if (activeSourceRef.current) {
      try { activeSourceRef.current.stop(); } catch { /* ignore */ }
      activeSourceRef.current.disconnect();
      activeSourceRef.current = null;
    }

    const doPlay = () => {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.onended = () => {
        setIsPlayingTTS(false);
        onEnded?.();
      };
      activeSourceRef.current = source;
      setIsPlayingTTS(true);
      source.start(0);
    };

    if (ctx.state === "suspended") {
      ctx.resume().then(doPlay).catch(() => { setIsPlayingTTS(false); onEnded?.(); });
    } else {
      doPlay();
    }
  }, []);

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
    setBuzzed(false);

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

  // ── Gemini TTS: yangi savol kelganda ovozli o'qish ───────────────────────
  // Taymer TTS'ga bog'liq EMAS — countdown mustaqil ishlaydi.
  // Shunchaki audio fetch + play qilamiz; xato bo'lsa — jim o'tamiz.
  useEffect(() => {
    // Avvalgi audio va source'ni to'xtatib tozalaymiz
    if (activeSourceRef.current) {
      try { activeSourceRef.current.stop(); } catch { /* ignore */ }
      activeSourceRef.current.disconnect();
      activeSourceRef.current = null;
    }
    audioBufferRef.current = null;
    setIsPlayingTTS(false);
    setHasAudio(false);
    setIsLoadingTTS(false);

    const text = data?.autoState?.questionText;
    if (!text) return;

    // Mute bo'lsa — fetch qilmaymiz
    if (ttsIsMuted) return;

    setIsLoadingTTS(true);
    let cancelled = false;

    fetchTTS(text).then(async (result) => {
      if (cancelled) { setIsLoadingTTS(false); return; }
      if (!result) { setIsLoadingTTS(false); return; }
      try {
        const bytes = Uint8Array.from(atob(result.audio), (c) => c.charCodeAt(0));
        const arrayBuf = addWavHeaderIfNeeded(bytes);
        const ctx = audioCtxRef.current;
        if (!ctx) { setIsLoadingTTS(false); return; }
        const decoded = await ctx.decodeAudioData(arrayBuf);
        if (cancelled) return;
        audioBufferRef.current = decoded;
        setHasAudio(true);
        setIsLoadingTTS(false);
        // Countdown TTS'ga bog'liq EMAS — shunchaki auto-play
        playBuffer();
      } catch (err) {
        console.error("[SvoyakTTS] decode error:", err);
        setIsLoadingTTS(false);
      }
    }).catch((err) => {
      if (!cancelled) {
        console.error("[SvoyakTTS] fetch error:", err);
        setIsLoadingTTS(false);
      }
    });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.autoState?.questionIndex]);

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
        hapticResult(myAttempt.isCorrect === true ? "correct" : "incorrect");
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
  // Progressiv ball: 1-savol 10 ball, 2-savol 20 ball, ...
  const currentQuestionPoints = qIdx * 10;
  const myAttempt = auto?.myAttempt ?? null;
  const attempts = auto?.attempts ?? [];
  const isPlaying = !!auto?.isPlaying;

  return (
    <div style={PAGE}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
        <div style={{ fontSize: "14px", fontWeight: 800, color: "var(--text)" }}>🎯 Svoyak</div>
        {isPlaying && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "13px", color: "var(--muted)" }}>
              {qIdx}/{totalQ}
            </span>
            {/* Joriy savol ball qiymati */}
            <span style={{
              fontSize: "12px", fontWeight: 900, padding: "3px 8px",
              borderRadius: "8px",
              background: "rgba(245,200,66,0.20)",
              color: "var(--svoyak-gold, #f5c842)",
              border: "1px solid rgba(245,200,66,0.4)",
            }}>
              +{currentQuestionPoints}
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

      {/* ── Leaderboard (vertikal, to'liq) ────────────────────────────────── */}
      <div style={{
        background: "var(--svoyak-surface, #0f1f3a)",
        border: "1px solid var(--svoyak-border, #1f3a6e)",
        borderRadius: "16px",
        marginBottom: "14px",
        overflow: "hidden",
      }}>
        <div style={{
          padding: "8px 14px 6px",
          fontSize: "10px",
          fontWeight: 800,
          letterSpacing: "1.2px",
          color: "var(--muted)",
          borderBottom: "1px solid var(--svoyak-border, #1f3a6e)",
        }}>
          REYTING
        </div>
        <div style={{
          maxHeight: "160px",
          overflowY: "auto",
        }}>
          {players.map((p, i) => {
            const isMe = p.telegramId === myId;
            const rankLabel = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`;
            return (
              <div
                key={p.telegramId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "8px 14px",
                  background: isMe ? "rgba(245,200,66,0.10)" : "transparent",
                  borderBottom: i < players.length - 1 ? "1px solid rgba(31,58,110,0.5)" : "none",
                }}
              >
                <span style={{ fontSize: "13px", minWidth: "24px", textAlign: "center" }}>
                  {rankLabel}
                </span>
                <span style={{
                  flex: 1,
                  fontSize: "13px",
                  fontWeight: isMe ? 800 : 600,
                  color: isMe ? "var(--svoyak-gold, #f5c842)" : "var(--text)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}>
                  {p.displayName}
                  {isMe && (
                    <span style={{ fontSize: "10px", fontWeight: 700, marginLeft: "5px", color: "var(--svoyak-gold, #f5c842)", opacity: 0.8 }}>
                      (men)
                    </span>
                  )}
                </span>
                <span style={{
                  fontSize: "15px",
                  fontWeight: 900,
                  color: isMe ? "var(--svoyak-gold, #f5c842)" : "var(--text)",
                  minWidth: "36px",
                  textAlign: "right",
                }}>
                  {p.score}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Savol va Taymer ────────────────────────────────────────────────── */}
      {isPlaying && auto?.questionText ? (
        <>
          {/* Savol matni + TTS tugmalari */}
          <div style={{
            background: "var(--svoyak-surface, #0f1f3a)",
            border: `1.5px solid ${localPhase === "reading" ? "rgba(77,166,255,0.35)" : "var(--svoyak-border, #1f3a6e)"}`,
            borderRadius: "20px",
            marginBottom: "20px",
            overflow: "hidden",
            transition: "border-color 0.4s",
          }}>
            <div style={{
              padding: "24px 20px 16px",
              fontSize: "18px",
              fontWeight: 700,
              color: "var(--text)",
              lineHeight: 1.5,
              textAlign: "center",
              userSelect: "none",
            }}>
              {auto.questionText}
            </div>
            {/* TTS boshqaruv tugmalari — QuestionCard bilan bir xil stil */}
            <div style={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: "8px",
              padding: "0 14px 12px",
            }}>
              {/* Mute/unmute toggle */}
              <button
                type="button"
                title={ttsIsMuted ? "Ovozni yoqish" : "Ovozni o'chirish"}
                onClick={() => {
                  setTtsIsMuted((prev) => {
                    const next = !prev;
                    try { localStorage.setItem(TTS_MUTE_KEY, next ? "1" : "0"); } catch { /* ignore */ }
                    if (next && activeSourceRef.current) {
                      try { activeSourceRef.current.stop(); } catch { /* ignore */ }
                      activeSourceRef.current.disconnect();
                      activeSourceRef.current = null;
                      setIsPlayingTTS(false);
                    }
                    return next;
                  });
                }}
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  border: `1.5px solid ${ttsIsMuted ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.15)"}`,
                  background: ttsIsMuted ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.05)",
                  color: ttsIsMuted ? "#ef4444" : "var(--muted)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px",
                  flexShrink: 0,
                }}
              >
                {ttsIsMuted ? "🔇" : "🔈"}
              </button>
              {/* Qayta o'qish (replay) */}
              <button
                type="button"
                title="Savolni qayta eshitish"
                disabled={isLoadingTTS || !hasAudio || ttsIsMuted}
                onClick={() => { if (!ttsIsMuted) playBuffer(); }}
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  border: `1.5px solid ${isPlayingTTS ? "#4DA6FF" : "rgba(255,255,255,0.15)"}`,
                  background: isPlayingTTS ? "rgba(77,166,255,0.15)" : "rgba(255,255,255,0.05)",
                  color: isPlayingTTS ? "#4DA6FF" : "var(--muted)",
                  cursor: hasAudio && !isLoadingTTS && !ttsIsMuted ? "pointer" : "not-allowed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: (!hasAudio && !isLoadingTTS) || ttsIsMuted ? 0.35 : 1,
                  fontSize: "14px",
                  flexShrink: 0,
                }}
              >
                {isLoadingTTS ? (
                  <svg
                    fill="none"
                    height="13"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    width="13"
                    style={{ animation: "spin 1s linear infinite" }}
                  >
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                ) : isPlayingTTS ? "🔊" : "▶"}
              </button>
            </div>
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
                /* Allaqachon javob berildi — bu FAQAT o'zining javobi, isCorrect hech qachon null emas */
                <div style={{
                  padding: "18px", borderRadius: "14px",
                  background: myAttempt.isCorrect === true ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.12)",
                  border: `1px solid ${myAttempt.isCorrect === true ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.3)"}`,
                  textAlign: "center", marginBottom: "14px",
                }}>
                  <div style={{ fontSize: "24px", marginBottom: "6px" }}>
                    {myAttempt.isCorrect === true ? "✅" : "❌"}
                  </div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: myAttempt.isCorrect === true ? "var(--success, #22c55e)" : "var(--error, #ef4444)" }}>
                    {myAttempt.isCorrect === true ? `To'g'ri! +${currentQuestionPoints} ball` : "Noto'g'ri"}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "4px" }}>
                    Boshqalarni kuting...
                  </div>
                </div>
              ) : !buzzed ? (
                /* ── Buzz gate: "+" tugmasi ────────────────────────────────── */
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "14px" }}>
                  <button
                    type="button"
                    disabled={localSec === 0}
                    onClick={() => {
                      if (localSec === 0) return;
                      hapticTap();
                      setBuzzed(true);
                      setTimeout(() => inputRef.current?.focus(), 80);
                    }}
                    style={{
                      width: "96px",
                      height: "96px",
                      borderRadius: "50%",
                      border: "3px solid var(--svoyak-gold, #f5c842)",
                      background: localSec > 0
                        ? "linear-gradient(135deg, var(--svoyak-gold,#f5c842) 0%, #FF8A4C 100%)"
                        : "var(--border)",
                      color: localSec > 0 ? "#0B0B14" : "var(--muted)",
                      fontSize: "44px",
                      fontWeight: 900,
                      lineHeight: 1,
                      cursor: localSec > 0 ? "pointer" : "not-allowed",
                      opacity: localSec > 0 ? 1 : 0.4,
                      boxShadow: localSec > 0
                        ? "0 0 28px rgba(245,200,66,0.45), 0 4px 16px rgba(0,0,0,0.4)"
                        : "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "box-shadow 0.25s, opacity 0.25s",
                      WebkitTapHighlightColor: "transparent",
                    }}
                    aria-label="Javob beraman"
                  >
                    +
                  </button>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "14px", fontWeight: 800, color: "var(--svoyak-gold, #f5c842)" }}>
                      Javob beraman
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "3px" }}>
                      Javob yozish uchun "+" tugmasini bosing
                    </div>
                  </div>
                </div>
              ) : (
                /* Input — buzz bosilgandan keyin ko'rinadi */
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
                    O'YINCHILAR
                  </div>
                  {attempts.map((a) => {
                    // Backend raund ochiq paytda boshqalar uchun answer/isCorrect=null qaytaradi.
                    // Faqat o'zining javobi to'liq ko'rinadi.
                    const isRevealed = a.answer !== null && a.isCorrect !== null;
                    return (
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
                        {isRevealed ? (
                          <span style={{ color: a.isCorrect === true ? "var(--success, #22c55e)" : "var(--error, #ef4444)", fontWeight: 800 }}>
                            {a.isCorrect === true ? "✓" : "✗"}
                          </span>
                        ) : (
                          <span style={{ color: "var(--svoyak-gold, #f5c842)", fontWeight: 800, fontSize: "15px" }}>
                            ✓
                          </span>
                        )}
                        <span style={{ fontWeight: 700, color: "var(--text)" }}>{a.displayName}</span>
                        <span style={{ color: "var(--muted)", marginLeft: "auto", fontSize: "12px" }}>
                          {isRevealed ? a.answer : "javob berdi"}
                        </span>
                      </div>
                    );
                  })}
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
