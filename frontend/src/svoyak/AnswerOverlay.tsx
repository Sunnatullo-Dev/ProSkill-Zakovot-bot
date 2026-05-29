/**
 * AnswerOverlay — buzz g'olibi A/B/C/D variantlardan birini tanlaydi.
 *
 * Spec: katta tile'lar (ekranning ~22-25%), 4 rang (qizil/ko'k/yashil/sariq),
 * 1 marta bosish — kuchli haptic, blocking pending overlay.
 *
 * BUZZ tugmasi joyiga (slot child) ko'rsatiladi — QuestionOverlay ichida.
 */
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { hapticResult, hapticSelect } from "../utils/haptics";

type Props = {
  options: string[]; // har doim 4 ta
  onAnswer: (answer: string) => Promise<void> | void;
  onSkip?: () => void;
  /** Hisoblash uchun mahalliy taymer (sekundlarda) — default 10. */
  timeLimitSeconds?: number;
};

const LETTERS = ["A", "B", "C", "D"];

const COLORS = [
  { bg: "linear-gradient(135deg, #FF3B5C, #C7234C)", glow: "rgba(255,59,92,0.40)" },
  { bg: "linear-gradient(135deg, #4DA6FF, #2C6FCC)", glow: "rgba(77,166,255,0.40)" },
  { bg: "linear-gradient(135deg, #22E07F, #15A75C)", glow: "rgba(34,224,127,0.40)" },
  { bg: "linear-gradient(135deg, #F5C842, #E09810)", glow: "rgba(245,200,66,0.40)" },
];

export default function AnswerOverlay({ options, onAnswer, onSkip, timeLimitSeconds = 10 }: Props) {
  const [pendingIdx, setPendingIdx] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(timeLimitSeconds);
  const startedRef = useRef(Date.now());

  // Lokal taymer (har 250ms yangilanadi). Backend ham 10s'da blokirovka
  // qiladi — bu vizual ko'rsatkich.
  useEffect(() => {
    const id = window.setInterval(() => {
      const elapsed = (Date.now() - startedRef.current) / 1000;
      setRemaining(Math.max(0, Math.ceil(timeLimitSeconds - elapsed)));
    }, 250);
    return () => window.clearInterval(id);
  }, [timeLimitSeconds]);

  async function handlePick(opt: string, idx: number) {
    if (pendingIdx !== null) return;
    setPendingIdx(idx);
    try {
      hapticResult("correct");
    } catch {
      /* ignore */
    }
    try {
      await onAnswer(opt);
    } catch (err) {
      console.error("answer submit failed", err);
      setPendingIdx(null);
    }
  }

  const wrap: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    padding: "0 4px",
  };

  if (options.length !== 4) {
    // Fallback: input maydoni — agar backend 4 ta variant bermasa
    return (
      <div style={{ textAlign: "center", color: "var(--svoyak-warning)", padding: "12px" }}>
        Variantlar yetishmayapti. (Backend issue)
      </div>
    );
  }

  return (
    <div style={wrap}>
      {options.map((opt, idx) => {
        const palette = COLORS[idx % COLORS.length];
        const isPending = pendingIdx === idx;
        const isFaded = pendingIdx !== null && !isPending;
        return (
          <button
            key={opt + idx}
            type="button"
            onClick={() => {
              try {
                hapticSelect();
              } catch {
                /* ignore */
              }
              void handlePick(opt, idx);
            }}
            disabled={pendingIdx !== null}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              minHeight: "62px",
              padding: "12px 16px",
              borderRadius: "16px",
              border: "1.5px solid rgba(255,255,255,0.10)",
              background: palette.bg,
              color: "#fff",
              fontFamily: "var(--svoyak-font-heading)",
              fontSize: "16px",
              fontWeight: 800,
              textAlign: "left",
              cursor: pendingIdx !== null ? "default" : "pointer",
              opacity: isFaded ? 0.35 : 1,
              transform: isPending ? "scale(0.97)" : "scale(1)",
              transition: "transform 0.12s ease, opacity 0.18s ease, box-shadow 0.18s ease",
              boxShadow: isPending
                ? `0 0 30px ${palette.glow}, inset 0 0 16px rgba(255,255,255,0.20)`
                : `0 6px 18px -8px ${palette.glow}`,
            }}
          >
            <span
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "50%",
                background: "rgba(0,0,0,0.30)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--svoyak-font-heading)",
                fontWeight: 900,
                fontSize: "14px",
                color: "#fff",
                flex: "0 0 auto",
              }}
            >
              {LETTERS[idx]}
            </span>
            <span style={{ flex: 1, lineHeight: 1.3, fontSize: "14px" }}>{opt}</span>
            {isPending ? (
              <span style={{ fontSize: "18px", flex: "0 0 auto" }}>⏳</span>
            ) : null}
          </button>
        );
      })}

      {/* Skip + taymer */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "4px",
          padding: "4px 8px",
        }}
      >
        <span style={{ fontSize: "11px", color: "var(--muted)" }}>
          ⏱ {remaining}s qoldi
        </span>
        {onSkip ? (
          <button
            type="button"
            onClick={onSkip}
            disabled={pendingIdx !== null}
            style={{
              padding: "6px 12px",
              borderRadius: "10px",
              border: "1px solid rgba(255,255,255,0.18)",
              background: "transparent",
              color: "var(--muted)",
              fontSize: "11px",
              fontWeight: 700,
              cursor: pendingIdx !== null ? "default" : "pointer",
            }}
          >
            O'tkazib yuborish
          </button>
        ) : null}
      </div>
    </div>
  );
}
