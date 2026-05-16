import { useState } from "react";
import { submitQuestion } from "../api/client";

type Difficulty = "easy" | "medium" | "hard";

type FormMessage = {
  type: "success" | "error";
  text: string;
};

const DIFFICULTY_OPTIONS: Array<{ value: Difficulty; label: string }> = [
  { value: "easy", label: "Oson" },
  { value: "medium", label: "O'rta" },
  { value: "hard", label: "Qiyin" }
];

const labelStyle = {
  fontSize: "12px",
  fontWeight: 600,
  color: "var(--muted)",
  letterSpacing: "1px",
  textTransform: "uppercase" as const,
  marginBottom: "8px",
  display: "block"
};

const fieldStyle = {
  width: "100%",
  padding: "14px 16px",
  background: "var(--card)",
  border: "1.5px solid var(--border)",
  borderRadius: "14px",
  fontSize: "15px",
  color: "var(--text)",
  outline: "none"
};

export default function AddQuestionScreen() {
  const [text, setText] = useState("");
  const [answer, setAnswer] = useState("");
  const [category, setCategory] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<FormMessage | null>(null);

  const canSubmit = text.trim().length >= 5 && answer.trim().length > 0 && !isSubmitting;

  async function handleSubmit() {
    if (!canSubmit) {
      setMessage({ type: "error", text: "Savol kamida 5 ta belgi, javob esa bo'sh bo'lmasligi kerak." });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    const result = await submitQuestion({
      text: text.trim(),
      correctAnswer: answer.trim(),
      category: category.trim() || undefined,
      difficulty
    });

    setMessage({ type: result.ok ? "success" : "error", text: result.message });

    if (result.ok) {
      setText("");
      setAnswer("");
      setCategory("");
      setDifficulty("easy");
    }

    setIsSubmitting(false);
  }

  return (
    <div
      className="animate-fadeInUp"
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        padding: "24px 20px 104px",
        maxWidth: "430px",
        margin: "0 auto"
      }}
    >
      <h1 style={{ fontSize: "22px", fontWeight: 900, color: "var(--text)", marginBottom: "6px" }}>
        Savol qo'shish
      </h1>
      <p style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "24px" }}>
        Yangi savolingiz admin tasdig'idan keyin o'yinga qo'shiladi.
      </p>

      <div style={{ marginBottom: "18px" }}>
        <label style={labelStyle} htmlFor="question-text">
          Savol matni
        </label>
        <textarea
          id="question-text"
          placeholder="Masalan: O'zbekistonning eng katta ko'li qaysi?"
          rows={3}
          style={{ ...fieldStyle, resize: "vertical", lineHeight: 1.5 }}
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
      </div>

      <div style={{ marginBottom: "18px" }}>
        <label style={labelStyle} htmlFor="question-answer">
          To'g'ri javob
        </label>
        <input
          id="question-answer"
          placeholder="Masalan: Orol dengizi"
          style={fieldStyle}
          type="text"
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
        />
      </div>

      <div style={{ marginBottom: "18px" }}>
        <label style={labelStyle} htmlFor="question-category">
          Kategoriya (ixtiyoriy)
        </label>
        <input
          id="question-category"
          placeholder="Masalan: geografiya"
          style={fieldStyle}
          type="text"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        />
      </div>

      <div style={{ marginBottom: "24px" }}>
        <label style={labelStyle}>Qiyinlik</label>
        <div style={{ display: "flex", gap: "8px" }}>
          {DIFFICULTY_OPTIONS.map((option) => {
            const isActive = option.value === difficulty;

            return (
              <button
                key={option.value}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "12px",
                  border: `1.5px solid ${isActive ? "var(--accent)" : "var(--border)"}`,
                  background: isActive ? "rgba(77,166,255,0.12)" : "var(--card)",
                  color: isActive ? "var(--accent)" : "var(--muted)",
                  fontSize: "14px",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
                type="button"
                onClick={() => setDifficulty(option.value)}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {message ? (
        <div
          style={{
            marginBottom: "16px",
            padding: "12px 14px",
            borderRadius: "12px",
            fontSize: "13px",
            fontWeight: 600,
            background: message.type === "success" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
            color: message.type === "success" ? "var(--success)" : "var(--error)",
            border: `1px solid ${
              message.type === "success" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"
            }`
          }}
        >
          {message.text}
        </div>
      ) : null}

      <button
        disabled={!canSubmit}
        style={{
          width: "100%",
          padding: "16px",
          background: canSubmit ? "linear-gradient(135deg, #4DA6FF, #7C3AED)" : "var(--border)",
          border: "none",
          borderRadius: "16px",
          fontSize: "16px",
          fontWeight: 700,
          color: "white",
          cursor: canSubmit ? "pointer" : "not-allowed",
          opacity: canSubmit ? 1 : 0.5
        }}
        type="button"
        onClick={handleSubmit}
      >
        {isSubmitting ? "Yuborilmoqda..." : "Adminga yuborish"}
      </button>
    </div>
  );
}
