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
  );
}
