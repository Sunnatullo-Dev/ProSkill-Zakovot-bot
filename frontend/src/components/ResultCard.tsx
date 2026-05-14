import type { AnswerStatus } from "../types";
import DiffDisplay from "./DiffDisplay";

type ResultCardProps = {
  autoNextSeconds: number;
  correctAnswer: string;
  explanation: string;
  newScore: number;
  status: AnswerStatus;
  userAnswer: string;
  onNext: () => void;
};

const config = {
  correct: {
    bg: "#030D06",
    icon: "\u2705",
    title: "To'g'ri! +1 ball",
    titleColor: "var(--success)"
  },
  partial: {
    bg: "#0D0A02",
    icon: "\u26A0\uFE0F",
    title: "Qisman to'g'ri \u2014 imlo xatosi",
    titleColor: "var(--warning)"
  },
  incorrect: {
    bg: "#0D0203",
    icon: "\u274C",
    title: "Noto'g'ri",
    titleColor: "var(--error)"
  }
} satisfies Record<AnswerStatus, { bg: string; icon: string; title: string; titleColor: string }>;

export default function ResultCard({
  autoNextSeconds,
  correctAnswer,
  explanation,
  status,
  userAnswer,
  onNext
}: ResultCardProps) {
  const currentConfig = config[status];

  return (
    <div
      className="animate-scaleIn"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: currentConfig.bg,
        padding: "24px"
      }}
    >
      <div style={{ fontSize: "64px", marginBottom: "16px" }}>{currentConfig.icon}</div>

      <div
        style={{
          fontSize: "24px",
          fontWeight: 800,
          color: currentConfig.titleColor,
          marginBottom: "24px",
          textAlign: "center"
        }}
      >
        {currentConfig.title}
      </div>

      <div
        style={{
          width: "100%",
          maxWidth: "360px",
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "20px",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "16px"
        }}
      >
        {status !== "incorrect" ? <DiffDisplay correctAnswer={correctAnswer} userAnswer={userAnswer} /> : null}

        {status !== "correct" ? (
          <div>
            <div
              style={{
                fontSize: "12px",
                color: "var(--muted)",
                marginBottom: "6px"
              }}
            >
              To'g'ri javob:
            </div>
            <div
              style={{
                fontSize: "20px",
                fontWeight: 700,
                color: "var(--text)"
              }}
            >
              {correctAnswer}
            </div>
          </div>
        ) : null}

        {explanation ? (
          <div
            style={{
              fontSize: "13px",
              color: "var(--muted)",
              fontStyle: "italic",
              borderTop: "1px solid var(--border)",
              paddingTop: "12px"
            }}
          >
            {explanation}
          </div>
        ) : null}
      </div>

      <button
        style={{
          marginTop: "24px",
          width: "100%",
          maxWidth: "360px",
          padding: "15px",
          background: "var(--accent)",
          border: "none",
          borderRadius: "14px",
          fontSize: "16px",
          fontWeight: 700,
          color: "white",
          cursor: "pointer"
        }}
        type="button"
        onClick={onNext}
      >
        Keyingi savol {"\u2192"}
      </button>

      <div
        style={{
          marginTop: "12px",
          fontSize: "12px",
          color: "var(--muted)"
        }}
      >
        {autoNextSeconds}s da avtomatik o'tadi
      </div>
    </div>
  );
}
