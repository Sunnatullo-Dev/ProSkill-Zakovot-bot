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

const CATEGORY_LABELS: Record<string, string> = {
  geography: "Geografiya",
  history: "Tarix",
  science: "Fan",
  math: "Matematika",
  general: "Umumiy"
};

const DIFFICULTY_OPTIONS: Array<{ value: Difficulty | null; label: string }> = [
  { value: null, label: "Barchasi" },
  { value: "easy", label: "Oson" },
  { value: "medium", label: "O'rta" },
  { value: "hard", label: "Qiyin" }
];

function categoryLabel(category: string) {
  return CATEGORY_LABELS[category] ?? category.charAt(0).toUpperCase() + category.slice(1);
}

function chip(label: string, isActive: boolean, onClick: () => void) {
  return (
    <button
      key={label}
      style={{
        padding: "9px 14px",
        borderRadius: "20px",
        border: `1.5px solid ${isActive ? "var(--accent)" : "var(--border)"}`,
        background: isActive ? "rgba(77,166,255,0.14)" : "var(--card)",
        color: isActive ? "var(--accent)" : "var(--muted)",
        fontSize: "13px",
        fontWeight: 700,
        cursor: "pointer",
        whiteSpace: "nowrap"
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
  const userInitial = playerName[0]?.toUpperCase() ?? "Z";

  return (
    <div
      className="animate-fadeInUp"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg)",
        padding: "32px 20px 104px"
      }}
    >
      <div style={{ textAlign: "center", marginBottom: "24px" }}>
        <div
          style={{
            fontSize: "56px",
            filter: "drop-shadow(0 0 24px rgba(77,166,255,0.4))",
            lineHeight: 1
          }}
        >
          {"\u{1F9E0}"}
        </div>
        <div
          style={{
            fontSize: "30px",
            fontWeight: 900,
            letterSpacing: "6px",
            background: "linear-gradient(135deg, #4DA6FF, #A78BFA)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            marginTop: "6px"
          }}
        >
          ZAKOVAT
        </div>
        <div style={{ color: "var(--muted)", fontSize: "13px", marginTop: "4px" }}>
          Bilimingizni sinang
        </div>
      </div>

      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "20px",
          padding: "16px 18px",
          marginBottom: "16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #4DA6FF, #7C3AED)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "17px",
              fontWeight: 700,
              color: "white",
              flex: "0 0 auto"
            }}
          >
            {userInitial}
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: "15px",
                fontWeight: 700,
                color: "var(--text)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap"
              }}
            >
              {playerName}
            </div>
            <div style={{ fontSize: "12px", color: "var(--muted)" }}>Joriy ball: {score}</div>
          </div>
        </div>
        <div
          style={{
            background: "rgba(245,200,66,0.12)",
            color: "var(--gold)",
            fontSize: "12px",
            fontWeight: 700,
            padding: "5px 12px",
            borderRadius: "20px",
            border: "1px solid rgba(245,200,66,0.2)",
            whiteSpace: "nowrap"
          }}
        >
          {"\u{1F3C6}"} {record}
        </div>
      </div>

      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "20px",
          padding: "18px",
          marginBottom: "16px"
        }}
      >
        <div
          style={{
            fontSize: "11px",
            fontWeight: 700,
            color: "var(--muted)",
            letterSpacing: "1.5px",
            textTransform: "uppercase",
            marginBottom: "10px"
          }}
        >
          Mavzu
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "18px" }}>
          {chip("Barchasi", selectedCategory === null, () => setSelectedCategory(null))}
          {categories.map((category) =>
            chip(categoryLabel(category), selectedCategory === category, () =>
              setSelectedCategory(category)
            )
          )}
        </div>

        <div
          style={{
            fontSize: "11px",
            fontWeight: 700,
            color: "var(--muted)",
            letterSpacing: "1.5px",
            textTransform: "uppercase",
            marginBottom: "10px"
          }}
        >
          Qiyinlik
        </div>
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
            marginBottom: "14px",
            padding: "11px 14px",
            borderRadius: "12px",
            fontSize: "13px",
            fontWeight: 600,
            background: "rgba(239,68,68,0.12)",
            color: "var(--error)",
            border: "1px solid rgba(239,68,68,0.3)"
          }}
        >
          {error}
        </div>
      ) : null}

      <button
        disabled={isLoading}
        style={{
          width: "100%",
          padding: "16px",
          background: "linear-gradient(135deg, #4DA6FF, #7C3AED)",
          border: "none",
          borderRadius: "16px",
          fontSize: "17px",
          fontWeight: 700,
          color: "white",
          cursor: isLoading ? "not-allowed" : "pointer",
          boxShadow: "0 8px 24px rgba(77,166,255,0.3)",
          opacity: isLoading ? 0.7 : 1
        }}
        type="button"
        onClick={() => onStart({ category: selectedCategory, difficulty: selectedDifficulty })}
      >
        {isLoading ? "Yuklanmoqda..." : "Testni boshlash \u{1F680}"}
      </button>
    </div>
  );
}
