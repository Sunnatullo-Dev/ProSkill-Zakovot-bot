import { useEffect, useState } from "react";

type QuestionCardProps = {
  question: {
    id: string;
    text: string;
  };
  questionNumber: number;
  totalQuestions: number;
  timeLeft: number;
  onSubmit: (answer: string) => void;
};

export default function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  timeLeft,
  onSubmit
}: QuestionCardProps) {
  const [answer, setAnswer] = useState("");
  const timerColor = timeLeft > 10 ? "var(--accent)" : timeLeft > 5 ? "var(--warning)" : "var(--error)";
  const progress = timeLeft / 15;
  const circumference = 2 * Math.PI * 34;
  const strokeDashoffset = circumference * (1 - progress);

  useEffect(() => {
    setAnswer("");
  }, [question.id]);

  function handleSubmit() {
    const trimmedAnswer = answer.trim();

    if (!trimmedAnswer) {
      return;
    }

    onSubmit(trimmedAnswer);
  }

  return (
    <div
      className="animate-fadeInUp"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg)",
        padding: "20px",
        maxWidth: "430px",
        margin: "0 auto"
      }}
    >
      <div
        style={{
          height: "4px",
          background: "var(--border)",
          borderRadius: "2px",
          marginBottom: "16px",
          overflow: "hidden"
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${(questionNumber / totalQuestions) * 100}%`,
            background: "linear-gradient(90deg, var(--accent), var(--accent2))",
            borderRadius: "2px",
            transition: "width 0.3s ease"
          }}
        />
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px"
        }}
      >
        <span
          style={{
            fontSize: "14px",
            fontWeight: 600,
            color: "var(--text)"
          }}
        >
          Savol {questionNumber}/{totalQuestions}
        </span>
        <span
          style={{
            fontSize: "14px",
            fontWeight: 600,
            color: timerColor,
            transition: "color 0.5s"
          }}
        >
          {"\u23F1"} {timeLeft}s
        </span>
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          paddingTop: "24px"
        }}
      >
        <div
          style={{
            width: "100%",
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "20px",
            padding: "28px 24px",
            fontSize: "20px",
            fontWeight: 600,
            color: "var(--text)",
            textAlign: "center",
            lineHeight: 1.6,
            userSelect: "none",
            WebkitUserSelect: "none",
            marginBottom: "24px"
          }}
        >
          {question.text}
        </div>

        <svg height="80" style={{ marginBottom: "24px" }} viewBox="0 0 80 80" width="80">
          <circle cx="40" cy="40" fill="none" r="34" stroke="var(--border)" strokeWidth="6" />
          <circle
            cx="40"
            cy="40"
            fill="none"
            r="34"
            stroke={timerColor}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            strokeWidth="6"
            style={{ transition: "stroke-dashoffset 1s linear, stroke 0.5s ease" }}
            transform="rotate(-90 40 40)"
          />
          <text
            dominantBaseline="central"
            fill={timerColor}
            fontSize="22"
            fontWeight="800"
            style={{ transition: "fill 0.5s" }}
            textAnchor="middle"
            x="40"
            y="40"
          >
            {timeLeft}
          </text>
        </svg>

        <input
          placeholder="Javobingizni yozing..."
          style={{
            width: "100%",
            padding: "16px 18px",
            background: "var(--card)",
            border: "1.5px solid var(--border)",
            borderRadius: "14px",
            fontSize: "16px",
            color: "var(--text)",
            outline: "none",
            marginBottom: "12px",
            transition: "border-color 0.2s, box-shadow 0.2s"
          }}
          type="text"
          value={answer}
          onBlur={(event) => {
            event.target.style.borderColor = "var(--border)";
            event.target.style.boxShadow = "none";
          }}
          onChange={(event) => setAnswer(event.target.value)}
          onFocus={(event) => {
            event.target.style.borderColor = "var(--accent)";
            event.target.style.boxShadow = "0 0 0 3px rgba(77,166,255,0.12)";
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && answer.trim()) {
              handleSubmit();
            }
          }}
        />
        <button
          disabled={!answer.trim()}
          style={{
            width: "100%",
            padding: "15px",
            background: answer.trim() ? "var(--accent)" : "var(--border)",
            border: "none",
            borderRadius: "14px",
            fontSize: "16px",
            fontWeight: 700,
            color: "white",
            cursor: answer.trim() ? "pointer" : "not-allowed",
            opacity: answer.trim() ? 1 : 0.4,
            transition: "all 0.2s"
          }}
          type="button"
          onClick={handleSubmit}
        >
          Javob berish {"\u2713"}
        </button>
      </div>
    </div>
  );
}
