import type { AnswerResult } from "../types";
import ResultCard from "./ResultCard";

type ResultScreenProps = {
  autoNextSeconds: number;
  currentQuestion: number;
  result: AnswerResult;
  totalQuestions: number;
  userAnswer: string;
  onNext: () => void;
};

export default function ResultScreen({
  autoNextSeconds,
  result,
  userAnswer,
  onNext
}: ResultScreenProps) {
  return (
    <ResultCard
      autoNextSeconds={autoNextSeconds}
      correctAnswer={result.correctAnswer}
      explanation={result.explanation}
      newScore={result.newScore}
      status={result.status}
      userAnswer={userAnswer}
      onNext={onNext}
    />
  );
}
