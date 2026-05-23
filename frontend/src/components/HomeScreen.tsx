import type { ReactNode } from "react";
import type { RoundFilter } from "../types";
import { PlayIcon, StarIcon, TrophyIcon } from "./icons";

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

export default function HomeScreen({
  error,
  isLoading,
  playerName,
  record,
  score,
  onStart
}: HomeScreenProps) {
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

      <button
        disabled={isLoading}
        style={{
          marginTop: "auto",
          width: "100%",
          padding: "17px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "9px",
          background: "linear-gradient(135deg, #4DA6FF, #7C3AED)",
          border: "none",
          borderRadius: "16px",
          fontSize: "17px",
          fontWeight: 800,
          color: "white",
          cursor: isLoading ? "not-allowed" : "pointer",
          boxShadow: "0 10px 28px rgba(77,166,255,0.32)",
          opacity: isLoading ? 0.7 : 1,
          transition: "opacity 0.15s"
        }}
        type="button"
        onClick={() => onStart({ category: null, difficulty: null })}
      >
        {isLoading ? (
          "Yuklanmoqda..."
        ) : (
          <>
            <PlayIcon size={18} />
            O'yinni boshlash
          </>
        )}
      </button>
    </div>
  );
}
