import { useState } from "react";
import type { Difficulty, RoundFilter } from "../types";

type HomeScreenProps = {
  categories: string[];
  error: string;
  isLoading: boolean;
  playerName: string;
  record: number;
  score: number;
  onStart: (filter: RoundFilter) => void;
};

const DIFFICULTY_OPTIONS: Array<{ value: Difficulty | null; label: string }> = [
  { value: null, label: "Barchasi" },
  { value: "easy", label: "Oson" },
  { value: "medium", label: "O'rta" },
  { value: "hard", label: "Qiyin" }
];

const labelStyle = {
  fontSize: "11px",
  fontWeight: 700,
  color: "var(--muted)",
  letterSpacing: "2px",
  marginBottom: "10px"
};

function chip(label: string, isActive: boolean, onClick: () => void) {
  return (
    <button
      key={label}
      style={{
        padding: "8px 15px",
        borderRadius: "999px",
        border: `1px solid ${isActive ? "var(--accent)" : "var(--border)"}`,
        background: isActive ? "var(--accent)" : "var(--card)",
        color: isActive ? "#ffffff" : "var(--muted)",
        fontSize: "13px",
        fontWeight: 600,
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: "background 0.15s, color 0.15s, border-color 0.15s"
      }}
      type="button"
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export default function HomeScreen({
  categories,
  error,
  isLoading,
  playerName,
  record,
  score,
  onStart
}: HomeScreenProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | null>(null);
  const sortedCategories = [...categories].sort((left, right) => left.localeCompare(right));

  return (
    <div
      className="animate-fadeInUp"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg)",
        padding: "clamp(36px, 8vh, 72px) 24px 104px"
      }}
    >
      <div style={{ textAlign: "center", marginBottom: "32px" }}>
        <div
          style={{
            fontSize: "68px",
            lineHeight: 1,
            filter: "drop-shadow(0 0 30px rgba(77,166,255,0.45))"
          }}
        >
          {"\u{1F9E0}"}
        </div>
        <div
          style={{
            fontSize: "38px",
            fontWeight: 900,
            letterSpacing: "8px",
            marginTop: "12px",
            background: "linear-gradient(135deg, #4DA6FF, #A78BFA)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent"
          }}
        >
          ZAKOVAT
        </div>
        <div style={{ fontSize: "13px", color: "var(--muted)", marginTop: "8px" }}>
          Bilimingizni sinang
        </div>
      </div>

      <div style={{ textAlign: "center", marginBottom: "36px" }}>
        <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)" }}>
          Salom, {playerName} {"\u{1F44B}"}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "24px",
            marginTop: "12px",
            fontSize: "13px",
            color: "var(--muted)"
          }}
        >
          <span>
            {"⭐"} <strong style={{ color: "var(--gold)", fontWeight: 800 }}>{score}</strong> ball
          </span>
          <span>
            {"\u{1F3C6}"} <strong style={{ color: "var(--accent)", fontWeight: 800 }}>{record}</strong> rekord
          </span>
        </div>
      </div>

      <div style={{ marginBottom: "auto" }}>
        <div style={labelStyle}>MAVZU</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "22px" }}>
          {chip("Barchasi", selectedCategory === null, () => setSelectedCategory(null))}
          {sortedCategories.map((category) =>
            chip(category, selectedCategory === category, () => setSelectedCategory(category))
          )}
        </div>

        <div style={labelStyle}>QIYINLIK</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {DIFFICULTY_OPTIONS.map((option) =>
            chip(option.label, selectedDifficulty === option.value, () =>
              setSelectedDifficulty(option.value)
            )
          )}
        </div>
      </div>

      {error ? (
        <div
          style={{
            marginTop: "20px",
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
          marginTop: "24px",
          width: "100%",
          padding: "17px",
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
        onClick={() => onStart({ category: selectedCategory, difficulty: selectedDifficulty })}
      >
        {isLoading ? "Yuklanmoqda..." : "O'yinni boshlash \u{1F680}"}
      </button>
    </div>
  );
}
