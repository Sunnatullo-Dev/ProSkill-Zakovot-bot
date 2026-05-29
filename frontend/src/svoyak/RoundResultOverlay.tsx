/**
 * RoundResultOverlay — round status='completed' yoki 'skipped' bo'lganda
 * 2 sekund davomida full-screen flash: "✓ TO'G'RI! +30" yashil yoki
 * "✗ XATO -30" qizil. To'g'ri javob ham ko'rsatiladi.
 */
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { hapticResult } from "../utils/haptics";

type Props = {
  /** True = to'g'ri javob, False = xato, null = skipped */
  correct: boolean | null;
  /** Ball delta (musbat/manfiy). null = skip. */
  scoreDelta: number | null;
  /** To'g'ri javob matni. */
  correctAnswer: string | null;
  /** Foydalanuvchi bergan javob (winner uchun). */
  userAnswer?: string | null;
  /** Overlay yopilganda chaqiriladi. */
  onDismiss?: () => void;
  /** Avtomatik yopilish (ms). 0 = avto-yopilmaydi. Default: 2400. */
  autoDismissMs?: number;
};

const PAGE: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 200,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "24px",
  textAlign: "center",
  pointerEvents: "auto",
};

export default function RoundResultOverlay({
  correct,
  scoreDelta,
  correctAnswer,
  userAnswer,
  onDismiss,
  autoDismissMs = 2400,
}: Props) {
  const [visible, setVisible] = useState(true);

  // Haptic + auto-dismiss
  useEffect(() => {
    try {
      if (correct === true) hapticResult("correct");
      else if (correct === false) hapticResult("incorrect");
    } catch {
      /* ignore */
    }
    if (autoDismissMs > 0) {
      const t = window.setTimeout(() => {
        setVisible(false);
        window.setTimeout(() => onDismiss?.(), 220);
      }, autoDismissMs);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [correct, autoDismissMs, onDismiss]);

  // Rang sxemasi
  const isSkip = correct === null;
  const bgColor = isSkip
    ? "rgba(255,170,28,0.20)"
    : correct
    ? "rgba(34,224,127,0.18)"
    : "rgba(255,59,92,0.20)";
  const accentColor = isSkip
    ? "var(--svoyak-warning, #ffaa1c)"
    : correct
    ? "var(--svoyak-neon-green, #22e07f)"
    : "var(--svoyak-neon-red, #ff3b5c)";
  const verdictLabel = isSkip ? "O'TKAZILDI" : correct ? "TO'G'RI!" : "XATO";
  const icon = isSkip ? "⊘" : correct ? "✓" : "✗";

  const formattedDelta =
    scoreDelta === null
      ? "0"
      : scoreDelta > 0
      ? `+${scoreDelta}`
      : `${scoreDelta}`;

  return (
    <div
      style={{
        ...PAGE,
        background: `radial-gradient(60% 50% at 50% 50%, ${bgColor}, rgba(5,10,24,0.95))`,
        opacity: visible ? 1 : 0,
        transition: "opacity 0.22s ease",
      }}
      onClick={() => {
        setVisible(false);
        window.setTimeout(() => onDismiss?.(), 200);
      }}
    >
      <div
        style={{
          fontSize: "120px",
          color: accentColor,
          textShadow: `0 0 60px ${accentColor}`,
          lineHeight: 1,
          marginBottom: "12px",
          animation: "svoyakResultPop 0.45s cubic-bezier(0.18, 0.89, 0.32, 1.28) both",
        }}
      >
        {icon}
      </div>
      <div
        style={{
          fontFamily: "var(--svoyak-font-heading)",
          fontWeight: 900,
          fontSize: "44px",
          color: accentColor,
          letterSpacing: "0.06em",
          marginBottom: "6px",
          textShadow: `0 4px 20px ${accentColor}`,
        }}
      >
        {verdictLabel}
      </div>
      {scoreDelta !== null ? (
        <div
          style={{
            fontFamily: "var(--svoyak-font-heading)",
            fontWeight: 900,
            fontSize: "36px",
            color: "#fff",
            marginBottom: "24px",
            textShadow: "0 4px 12px rgba(0,0,0,0.45)",
          }}
        >
          {formattedDelta} ball
        </div>
      ) : null}

      {correctAnswer ? (
        <div
          style={{
            background: "rgba(0,0,0,0.40)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: "14px",
            padding: "14px 18px",
            maxWidth: "92%",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              color: "var(--muted)",
              letterSpacing: "0.18em",
              marginBottom: "6px",
            }}
          >
            TO'G'RI JAVOB
          </div>
          <div
            style={{
              fontFamily: "var(--svoyak-font-heading)",
              fontWeight: 800,
              fontSize: "20px",
              color: "var(--svoyak-gold, #f5c842)",
              lineHeight: 1.3,
            }}
          >
            {correctAnswer}
          </div>
          {userAnswer && !correct ? (
            <div style={{ marginTop: "10px", fontSize: "12px", color: "var(--muted)" }}>
              Sizning javobingiz:{" "}
              <span style={{ color: "var(--svoyak-neon-red)", fontWeight: 700 }}>
                {userAnswer}
              </span>
            </div>
          ) : null}
        </div>
      ) : null}

      <style>{`
        @keyframes svoyakResultPop {
          0%   { transform: scale(0.35); opacity: 0; }
          60%  { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
