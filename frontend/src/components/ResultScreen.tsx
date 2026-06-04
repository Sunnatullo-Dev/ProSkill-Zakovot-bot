import type { AnswerResult } from "../types";
import ResultCard from "./ResultCard";

type ResultScreenProps = {
  autoNextSeconds: number;
  canReport: boolean;
  result: AnswerResult;
  userAnswer: string;
  onNext: () => void;
  onReport: () => void;
};

export default function ResultScreen({
  autoNextSeconds,
  canReport,
  result,
  userAnswer,
  onNext,
  onReport
}: ResultScreenProps) {
  return (
    <>
      {(result.betWon ?? 0) !== 0 && (
        <div
          style={{
            position: "fixed",
            top: "16px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 200,
            padding: "10px 20px",
            borderRadius: "20px",
            background: (result.betWon ?? 0) > 0 ? "rgba(34,197,94,0.95)" : "rgba(239,68,68,0.95)",
            color: "white",
            fontSize: "15px",
            fontWeight: 800,
            boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
            pointerEvents: "none"
          }}
        >
          {(result.betWon ?? 0) > 0
            ? `⚡ +${result.betWon} ball yutdingiz!`
            : `⚡ ${result.betWon} ball yutqazdingiz`}
        </div>
      )}
      <ResultCard
        autoNextSeconds={autoNextSeconds}
        canReport={canReport}
        correctAnswer={result.correctAnswer}
        explanation={result.explanation}
        pointsEarned={result.pointsEarned}
        status={result.status}
        streak={result.streak}
        userAnswer={userAnswer}
        onNext={onNext}
        onReport={onReport}
      />
    </>
  );
}
