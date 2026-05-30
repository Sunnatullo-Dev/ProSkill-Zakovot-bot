/**
 * Svoyak BUZZ Overlay — 70-80% ekran katta tugma.
 *
 * Spec:
 *   "Telefon ekranining 70-80% qismini bitta katta BUZZ tugmasi egallashi
 *    lozim. O'yinchi savol o'qilayotganda ekranga qaramay, faqat shu
 *    tugmaga barmog'ini qo'yib turadi."
 *
 *   Holat ranglari:
 *     - sariq/ko'k → savol o'qilmoqda (kutish)
 *     - yashil    → aktiv, bosish mumkin
 *     - xira     → kimdir sizdan oldin bosdi
 *
 * Bu komponent QuestionOverlay ichida yoki o'ziga xos full-screen sifatida
 * render qilinishi mumkin. Hozir minimal — Board ichidan chiqarib qo'yiladi.
 */
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { hapticResult } from "../utils/haptics";
import { useT } from "../i18n";

type BuzzState = "waiting" | "active" | "blocked" | "winner";

type Props = {
  state: BuzzState;
  /** Foydalanuvchi BUZZ bosadi — backend chaqiriladi. */
  onPress: () => Promise<void> | void;
  /** Bloklanish sababi — qisqa matn. */
  blockedBy?: string;
};

const COLORS: Record<BuzzState, { bg: string; ring: string; text: string; glow: string }> = {
  waiting: {
    bg: "radial-gradient(circle at 30% 25%, rgba(255,170,28,0.5), rgba(245,158,11,0.18))",
    ring: "rgba(255,170,28,0.65)",
    text: "#FFD37A",
    glow: "0 0 64px rgba(255,170,28,0.55), inset 0 0 24px rgba(255,255,255,0.10)",
  },
  active: {
    bg: "radial-gradient(circle at 30% 25%, rgba(60,255,150,0.65), rgba(34,224,127,0.30))",
    ring: "rgba(34,224,127,0.85)",
    text: "#E7FFEC",
    glow:
      "0 0 80px rgba(34,224,127,0.7), 0 0 36px rgba(34,224,127,0.55), inset 0 0 28px rgba(255,255,255,0.18)",
  },
  blocked: {
    bg: "radial-gradient(circle at 30% 25%, rgba(80,80,90,0.45), rgba(40,42,55,0.40))",
    ring: "rgba(255,255,255,0.10)",
    text: "rgba(255,255,255,0.45)",
    glow: "none",
  },
  winner: {
    bg: "radial-gradient(circle at 30% 25%, rgba(245,200,66,0.55), rgba(255,138,76,0.30))",
    ring: "rgba(245,200,66,0.85)",
    text: "#FFFCEA",
    glow:
      "0 0 80px rgba(245,200,66,0.75), inset 0 0 28px rgba(255,255,255,0.18)",
  },
};

/** Labels endi useT() orqali render vaqtida olinadi. */

export default function BuzzOverlay({ state, onPress, blockedBy }: Props) {
  const t = useT();
  const LABELS: Record<BuzzState, { primary: string; secondary?: string }> = {
    waiting: { primary: t("svoyak_buzz_waiting_label"), secondary: t("svoyak_buzz_waiting_hint") },
    active: { primary: t("svoyak_buzz_active_label"), secondary: t("svoyak_buzz_active_hint") },
    blocked: { primary: t("svoyak_buzz_blocked_label"), secondary: t("svoyak_buzz_blocked_hint") },
    winner: { primary: t("svoyak_buzz_winner_label"), secondary: t("svoyak_buzz_winner_hint") },
  };
  const [busy, setBusy] = useState(false);
  const [pressed, setPressed] = useState(false);
  const wasActiveRef = useRef(false);

  // Holat 'active' bo'lganda haptic - "shoshilish" signali
  useEffect(() => {
    if (state === "active" && !wasActiveRef.current) {
      wasActiveRef.current = true;
      try {
        hapticResult("correct");
      } catch {
        /* ignore */
      }
    }
    if (state !== "active") {
      wasActiveRef.current = false;
    }
  }, [state]);

  const isClickable = state === "active" && !busy;

  async function handleClick() {
    if (!isClickable) return;
    setPressed(true);
    setBusy(true);
    try {
      hapticResult("correct");
    } catch {
      /* ignore */
    }
    try {
      await onPress();
    } finally {
      setBusy(false);
      window.setTimeout(() => setPressed(false), 200);
    }
  }

  const palette = COLORS[state];
  const labels = LABELS[state];

  const wrapStyle: CSSProperties = {
    width: "100%",
    minHeight: "62vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "12px",
    gap: "14px",
    userSelect: "none",
    WebkitUserSelect: "none",
    WebkitTapHighlightColor: "transparent",
  };

  const buttonStyle: CSSProperties = {
    width: "min(78vw, 360px)",
    height: "min(78vw, 360px)",
    maxWidth: "92%",
    borderRadius: "50%",
    border: `3px solid ${palette.ring}`,
    background: palette.bg,
    color: palette.text,
    fontFamily: "var(--svoyak-font-heading)",
    fontSize: "clamp(28px, 8vw, 44px)",
    fontWeight: 900,
    letterSpacing: "0.05em",
    cursor: isClickable ? "pointer" : "default",
    boxShadow: palette.glow,
    transition:
      "transform 0.12s ease, box-shadow 0.18s ease, background 0.18s, border-color 0.18s, color 0.18s",
    transform: pressed ? "scale(0.94)" : state === "active" ? "scale(1)" : "scale(0.96)",
    outline: "none",
    animation:
      state === "active" ? "svoyakBuzzPulse 1.1s ease-in-out infinite" : "none",
  };

  return (
    <div style={wrapStyle}>
      <button
        type="button"
        onClick={handleClick}
        onTouchStart={() => {
          if (isClickable) setPressed(true);
        }}
        onTouchEnd={() => setPressed(false)}
        disabled={!isClickable}
        style={buttonStyle}
        aria-label={labels.primary}
      >
        {labels.primary}
      </button>

      {labels.secondary ? (
        <div
          style={{
            fontFamily: "var(--svoyak-font-body)",
            fontSize: "13px",
            fontWeight: 600,
            color: state === "blocked" ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.75)",
            textAlign: "center",
            letterSpacing: "0.02em",
          }}
        >
          {labels.secondary}
          {state === "blocked" && blockedBy ? ` (${blockedBy})` : ""}
        </div>
      ) : null}

      <style>{`
        @keyframes svoyakBuzzPulse {
          0%, 100% { transform: scale(1.00); box-shadow: ${palette.glow}; }
          50%      { transform: scale(1.04); box-shadow: 0 0 110px rgba(34,224,127,0.85), inset 0 0 36px rgba(255,255,255,0.22); }
        }
      `}</style>
    </div>
  );
}
