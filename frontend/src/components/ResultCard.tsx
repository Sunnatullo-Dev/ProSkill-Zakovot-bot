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
    background: "linear-gradient(180deg, #030D06 0%, #080F1E 100%)",
    title: "To'g'ri! +1 ball",
    titleColor: "var(--success)"
  },
  partial: {
    background: "linear-gradient(180deg, #0D0A02 0%, #080F1E 100%)",
    title: "Qisman to'g'ri \u2014 imlo xatosi",
    titleColor: "var(--warning)"
  },
  incorrect: {
    background: "linear-gradient(180deg, #200508 0%, #080F1E 100%)",
    title: "Noto'g'ri",
    titleColor: "var(--error)"
  }
} satisfies Record<AnswerStatus, { background: string; title: string; titleColor: string }>;

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
        background: currentConfig.background,
        padding: "24px"
      }}
    >
      <div style={{ marginBottom: "16px" }}>
        <StatusIcon status={status} />
      </div>

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
          padding: "20px 18px",
          display: "flex",
          flexDirection: "column",
          gap: "20px"
        }}
      >
        {status !== "incorrect" ? <DiffDisplay correctAnswer={correctAnswer} userAnswer={userAnswer} /> : null}

        {status !== "correct" ? (
          <div>
            <div
              style={{
                fontSize: "11px",
                color: "var(--muted)",
                letterSpacing: "2px",
                textTransform: "uppercase",
                marginBottom: "6px"
              }}
            >
              To'g'ri javob:
            </div>
            <div
              style={{
                fontSize: "22px",
                fontWeight: 800,
                color: "var(--text)"
              }}
            >
              {correctAnswer}
            </div>
          </div>
        ) : null}

        {explanation && explanation !== "Tekshirib bo'lmadi" ? (
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

function StatusIcon({ status }: { status: AnswerStatus }) {
  if (status === "correct") {
    return (
      <svg height="64" viewBox="0 0 64 64" width="64">
        <circle cx="32" cy="32" fill="#052010" r="32" />
        <path
          d="M18 32l10 10 18-18"
          fill="none"
          stroke="#22C55E"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="4"
        />
      </svg>
    );
  }

  if (status === "partial") {
    return (
      <svg height="64" viewBox="0 0 64 64" width="64">
        <circle cx="32" cy="32" fill="#1A1000" r="32" />
        <path d="M32 20v16M32 42v2" fill="none" stroke="#F59E0B" strokeLinecap="round" strokeWidth="4" />
      </svg>
    );
  }

  return (
    <svg height="64" viewBox="0 0 64 64" width="64">
      <circle cx="32" cy="32" fill="#200508" r="32" />
      <path d="M20 20l24 24M44 20L20 44" fill="none" stroke="#EF4444" strokeLinecap="round" strokeWidth="4" />
    </svg>
  );
}
