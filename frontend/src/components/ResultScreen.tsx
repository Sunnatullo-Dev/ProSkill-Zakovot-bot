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
  const betWon = result.betWon ?? 0;
  const hasBet = betWon !== 0;

  return (
    <>
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
      {/* Bet natijasi — pastda sabit, content'ni bloklamaydi */}
      {hasBet && (
        <div
          style={{
            position: "fixed",
            bottom: "88px", // BottomNav ustida
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 200,
            padding: "12px 24px",
            borderRadius: "20px",
            background: betWon > 0 ? "rgba(34,197,94,0.96)" : "rgba(239,68,68,0.96)",
            color: "white",
            fontSize: "15px",
            fontWeight: 800,
            boxShadow: "0 4px 20px rgba(0,0,0,0.35)",
            pointerEvents: "none",
            whiteSpace: "nowrap"
          }}
        >
          {betWon > 0
            ? `⚡ +${betWon} ball yutdingiz!`
            : `⚡ ${betWon} ball yutqazdingiz`}
        </div>
      )}
    </>
  );
}
