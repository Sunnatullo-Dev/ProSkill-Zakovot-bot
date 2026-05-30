/**
 * Svoyak Question Overlay — to'liq ekran savol ko'rsatish.
 *
 * Spec'dan:
 *   - Minimalizm: faqat markazda chiroyli savol matni (Montserrat)
 *   - Taymer vizualizatsiyasi: tepada chiziqli progress-bar (15s)
 *   - Mavzu va ball qiymati ham ko'rinadi
 *
 * Bu komponent BOARD ekrani ustiga overlay sifatida ko'rinadi
 * (position: fixed, z-index yuqori).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useTTS } from "./useTTS";
import { useT } from "../i18n";

type Props = {
  /** Mavzu nomi (yuqorida ko'rinadi). */
  categoryName: string;
  categoryIcon: string;
  /** Ball qiymati (markaz-yuqorida). */
  value: number;
  /** Savol matni. */
  questionText: string;
  /** Round boshlangan vaqt (server ISO timestamp) — taymerni ushbu vaqtdan hisoblash. */
  startedAt?: string | null;
  /** Umumiy vaqt limiti soniyalarda (default: 15). */
  timeLimitSeconds?: number;
  /** Ostida ko'rinadigan slot (BUZZ tugma, javob input va h.k.). */
  children?: ReactNode;
  /** TTS'ni avtomatik boshlash (default: true). */
  autoSpeak?: boolean;
  /** TTS tugagandan keyin callback (host uchun open_buzz). */
  onSpeakEnd?: () => void;
};

const TIMER_DEFAULT_SECONDS = 15;

const PAGE: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 100,
  display: "flex",
  flexDirection: "column",
  background:
    "radial-gradient(140% 90% at 50% -10%, rgba(124,58,237,0.25), transparent 50%)," +
    "radial-gradient(140% 100% at 50% 110%, rgba(245,200,66,0.10), transparent 55%)," +
    "var(--svoyak-bg-deep, #050a18)",
  color: "var(--text)",
  fontFamily: "var(--svoyak-font-body)",
  padding: "0",
  overflow: "hidden",
};

const PROGRESS_TRACK: CSSProperties = {
  height: "8px",
  background: "rgba(255,255,255,0.08)",
  position: "relative",
  overflow: "hidden",
};

const HEADER_ROW: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "16px 24px",
};

const CATEGORY_TAG: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  padding: "8px 14px",
  borderRadius: "999px",
  background: "rgba(245,200,66,0.10)",
  border: "1px solid rgba(245,200,66,0.30)",
  color: "var(--svoyak-gold, #f5c842)",
  fontFamily: "var(--svoyak-font-heading)",
  fontSize: "12px",
  fontWeight: 800,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
};

const VALUE_BADGE: CSSProperties = {
  fontFamily: "var(--svoyak-font-heading)",
  fontSize: "28px",
  fontWeight: 900,
  color: "var(--svoyak-gold, #f5c842)",
  textShadow: "0 0 16px rgba(245,200,66,0.45)",
};

const QUESTION_AREA: CSSProperties = {
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "24px 28px",
  textAlign: "center",
};

const QUESTION_TEXT: CSSProperties = {
  fontFamily: "var(--svoyak-font-heading)",
  fontSize: "clamp(20px, 5.5vw, 30px)",
  fontWeight: 700,
  lineHeight: 1.35,
  color: "var(--text)",
  maxWidth: "560px",
  textShadow: "0 4px 24px rgba(0,0,0,0.45)",
};

const SLOT_AREA: CSSProperties = {
  padding: "0 20px 24px",
  minHeight: "120px",
};

export default function QuestionOverlay({
  categoryName,
  categoryIcon,
  value,
  questionText,
  startedAt,
  timeLimitSeconds = TIMER_DEFAULT_SECONDS,
  children,
  autoSpeak = true,
  onSpeakEnd,
}: Props) {
  const t = useT();
  // TTS — savol matnini ovozli o'qish
  const tts = useTTS({ lang: "uz", onEnd: onSpeakEnd });
  const lastSpokenRef = useRef<string>("");
  useEffect(() => {
    if (!autoSpeak) return;
    if (!questionText) return;
    if (lastSpokenRef.current === questionText) return;
    lastSpokenRef.current = questionText;
    tts.speak(questionText);
  }, [autoSpeak, questionText, tts]);

  // Taymer: server tomondan startedAt ISO timestamp keladi. Mahalliy interval
  // har 100ms qoldiq vaqtni qayta hisoblaydi. Bu drift'siz va polling
  // bilan sinxron qoldiruvchi yagona to'g'ri yo'l.
  const startMs = useMemo(() => {
    if (!startedAt) return Date.now();
    const parsed = Date.parse(startedAt);
    return Number.isFinite(parsed) ? parsed : Date.now();
  }, [startedAt]);

  const totalMs = timeLimitSeconds * 1000;
  const [elapsed, setElapsed] = useState(() => Math.max(0, Date.now() - startMs));
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    let mounted = true;
    const tick = () => {
      if (!mounted) return;
      setElapsed(Math.max(0, Date.now() - startMs));
      rafRef.current = window.requestAnimationFrame(tick);
    };
    rafRef.current = window.requestAnimationFrame(tick);
    return () => {
      mounted = false;
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, [startMs]);

  const remainingMs = Math.max(0, totalMs - elapsed);
  const progress = Math.max(0, Math.min(1, remainingMs / totalMs));
  const seconds = Math.ceil(remainingMs / 1000);
  const isCritical = remainingMs < 4000;

  // Progress bar rangi: yashil → sariq → qizil
  const barColor = isCritical
    ? "var(--svoyak-neon-red, #ff3b5c)"
    : remainingMs < 8000
    ? "var(--svoyak-warning, #ffaa1c)"
    : "var(--svoyak-neon-green, #22e07f)";

  return (
    <div style={PAGE}>
      {/* Chiziqli taymer — tepada */}
      <div style={PROGRESS_TRACK}>
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            bottom: 0,
            width: `${progress * 100}%`,
            background: `linear-gradient(90deg, ${barColor}, ${barColor})`,
            boxShadow: `0 0 16px ${barColor}`,
            transition: isCritical ? "none" : "width 0.1s linear",
          }}
        />
      </div>

      {/* Yuqori panel: kategoriya + mute + ball */}
      <div style={HEADER_ROW}>
        <div style={CATEGORY_TAG}>
          <span style={{ fontSize: "16px" }}>{categoryIcon}</span>
          <span>{categoryName}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {tts.supported ? (
            <button
              type="button"
              onClick={tts.toggleMute}
              aria-label={tts.isMuted ? t("svoyak_q_unmute") : t("svoyak_q_mute")}
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "50%",
                border: "1px solid rgba(255,255,255,0.18)",
                background: "rgba(0,0,0,0.30)",
                color: tts.isMuted ? "rgba(255,255,255,0.40)" : "var(--svoyak-gold, #f5c842)",
                fontSize: "16px",
                cursor: "pointer",
                padding: 0,
              }}
            >
              {tts.isMuted ? "🔇" : tts.isSpeaking ? "🔊" : "🔈"}
            </button>
          ) : null}
          <div style={VALUE_BADGE}>{value}</div>
        </div>
      </div>

      {/* Savol matni */}
      <div style={QUESTION_AREA}>
        <div style={QUESTION_TEXT}>{questionText}</div>
      </div>

      {/* Pastki vaqt indikator (raqamli, optional) */}
      <div style={{ textAlign: "center", marginBottom: "8px" }}>
        <span
          style={{
            display: "inline-block",
            fontFamily: "var(--svoyak-font-heading)",
            fontSize: "14px",
            fontWeight: 800,
            color: isCritical ? "var(--svoyak-neon-red)" : "var(--muted)",
            opacity: 0.85,
            letterSpacing: "0.04em",
            animation: isCritical ? "svoyakPulse 0.8s ease-in-out infinite" : "none",
          }}
        >
          {seconds}s
        </span>
      </div>

      {/* Slot: BUZZ tugma yoki javob input */}
      <div style={SLOT_AREA}>{children}</div>

      {/* Lokal animation keyframes */}
      <style>{`
        @keyframes svoyakPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.08); }
        }
      `}</style>
    </div>
  );
}
