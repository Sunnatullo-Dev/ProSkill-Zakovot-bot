import type { AnswerResult } from "../types";
import ResultCard from "./ResultCard";

type ResultScreenProps = {
  autoNextSeconds: number;
  result: AnswerResult;
  userAnswer: string;
  onNext: () => void;
};

export default function ResultScreen({ autoNextSeconds, result, userAnswer, onNext }: ResultScreenProps) {
  return (
    <ResultCard
      autoNextSeconds={autoNextSeconds}
      correctAnswer={result.correctAnswer}
      explanation={result.explanation}
      pointsEarned={result.pointsEarned}
      status={result.status}
      streak={result.streak}
      userAnswer={userAnswer}
      onNext={onNext}
    />
  );
}
