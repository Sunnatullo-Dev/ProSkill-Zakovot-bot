import type { ReactNode } from "react";
import type { RoundFilter, Difficulty } from "../types";
import { PlayIcon, StarIcon, TrophyIcon } from "./icons";
import { useT } from "../i18n";

type HomeScreenProps = {
  error: string;
  isLoading: boolean;
  playerName: string;
  record: number;
  score: number;
  onStart: (filter: RoundFilter) => void;
};

const cardStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "20px",
  padding: "18px"
};


function statCell(icon: ReactNode, value: number, label: string, color: string) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "5px" }}>
      <span style={{ color, display: "flex" }}>{icon}</span>
      <span style={{ fontSize: "22px", fontWeight: 900, color: "var(--text)", lineHeight: 1 }}>{value}</span>
      <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "1.5px", color: "var(--muted)" }}>
        {label}
      </span>
    </div>
  );
}

type DifficultyOption = {
  value: Difficulty | null;
  emoji: string;
  labelKey: "home_difficulty_easy" | "home_difficulty_medium" | "home_difficulty_hard" | "home_any_difficulty";
  gradient: string;
  shadow: string;
};

const DIFFICULTY_OPTIONS: DifficultyOption[] = [
  {
    value: "easy",
    emoji: "🟢",
    labelKey: "home_difficulty_easy",
    gradient: "linear-gradient(135deg, #22C55E, #16A34A)",
    shadow: "0 8px 22px rgba(34,197,94,0.32)",
  },
  {
    value: "medium",
    emoji: "🟡",
    labelKey: "home_difficulty_medium",
    gradient: "linear-gradient(135deg, #F59E0B, #D97706)",
    shadow: "0 8px 22px rgba(245,158,11,0.32)",
  },
  {
    value: "hard",
    emoji: "🔴",
    labelKey: "home_difficulty_hard",
    gradient: "linear-gradient(135deg, #EF4444, #DC2626)",
    shadow: "0 8px 22px rgba(239,68,68,0.32)",
  },
  {
    value: null,
    emoji: "🎲",
    labelKey: "home_any_difficulty",
    gradient: "linear-gradient(135deg, #4DA6FF, #7C3AED)",
    shadow: "0 8px 22px rgba(77,166,255,0.32)",
  },
];

export default function HomeScreen({
  error,
  isLoading,
  playerName,
  record,
  score,
  onStart
}: HomeScreenProps) {
  const t = useT();
  const userInitial = playerName.trim()[0]?.toUpperCase() ?? "Z";

  return (
    <div
      className="animate-fadeInUp"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        background: "var(--bg)",
        padding: "32px 20px 104px"
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontSize: "60px",
            lineHeight: 1,
            filter: "drop-shadow(0 0 28px rgba(77,166,255,0.45))"
          }}
        >
          {"\u{1F9E0}"}
        </div>
        <div
          style={{
            fontSize: "33px",
            fontWeight: 900,
            letterSpacing: "7px",
            marginTop: "8px",
            background: "linear-gradient(135deg, #4DA6FF, #A78BFA)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent"
          }}
        >
          ZAKOVAT
        </div>
        <div style={{ fontSize: "13px", color: "var(--muted)", marginTop: "6px" }}>
          Bilimingizni sinang
        </div>
      </div>

      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: "13px" }}>
          <div
            style={{
              width: "46px",
              height: "46px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #4DA6FF, #7C3AED)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "19px",
              fontWeight: 800,
              color: "white",
              flex: "0 0 auto"
            }}
          >
            {userInitial}
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: "16px",
                fontWeight: 800,
                color: "var(--text)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap"
              }}
            >
              {playerName}
            </div>
            <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>
              Bilim sinovchisi
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            marginTop: "16px",
            paddingTop: "16px",
            borderTop: "1px solid var(--border)"
          }}
        >
          {statCell(<StarIcon size={18} />, score, "BALL", "var(--gold)")}
          <div style={{ width: "1px", background: "var(--border)" }} />
          {statCell(<TrophyIcon size={18} />, record, "REKORD", "var(--accent)")}
        </div>
      </div>

      {error ? (
        <div
          style={{
            fontSize: "13px",
            fontWeight: 600,
            color: "var(--error)",
            textAlign: "center"
          }}
        >
          {error}
        </div>
      ) : null}

      {/* Qiyinlik tanlash — 4 ta kartochka */}
      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "10px" }}>
        <div
          style={{
            fontSize: "11px",
            fontWeight: 700,
            color: "var(--muted)",
            letterSpacing: "1.5px",
            textTransform: "uppercase",
            textAlign: "center",
            marginBottom: "2px",
          }}
        >
          {t("home_difficulty")}
        </div>
        {/* 3 ta qiyinlik (oson/o'rtacha/qiyin) — qator */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
          {DIFFICULTY_OPTIONS.slice(0, 3).map((opt) => (
            <button
              key={opt.value ?? "any"}
              type="button"
              disabled={isLoading}
              onClick={() => onStart({ category: null, difficulty: opt.value })}
              style={{
                padding: "14px 8px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "6px",
                background: opt.gradient,
                border: "none",
                borderRadius: "14px",
                color: "white",
                cursor: isLoading ? "not-allowed" : "pointer",
                boxShadow: opt.shadow,
                opacity: isLoading ? 0.6 : 1,
                transition: "transform 0.12s, opacity 0.15s",
                fontWeight: 800,
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = "scale(0.96)";
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = "scale(1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              <span style={{ fontSize: "26px", lineHeight: 1 }}>{opt.emoji}</span>
              <span style={{ fontSize: "13px", letterSpacing: "0.02em" }}>{t(opt.labelKey)}</span>
            </button>
          ))}
        </div>
        {/* Aralash — alohida keng tugma */}
        <button
          type="button"
          disabled={isLoading}
          onClick={() => onStart({ category: null, difficulty: null })}
          style={{
            width: "100%",
            padding: "14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "9px",
            background: DIFFICULTY_OPTIONS[3].gradient,
            border: "none",
            borderRadius: "14px",
            color: "white",
            cursor: isLoading ? "not-allowed" : "pointer",
            boxShadow: DIFFICULTY_OPTIONS[3].shadow,
            opacity: isLoading ? 0.6 : 1,
            fontWeight: 800,
            fontSize: "15px",
          }}
        >
          {isLoading ? (
            t("loading_dots")
          ) : (
            <>
              <PlayIcon size={16} />
              <span style={{ fontSize: "16px" }}>{DIFFICULTY_OPTIONS[3].emoji}</span>
              {t("home_any_difficulty")} ({t("home_start").toLowerCase()})
            </>
          )}
        </button>
      </div>

    </div>
  );
}
