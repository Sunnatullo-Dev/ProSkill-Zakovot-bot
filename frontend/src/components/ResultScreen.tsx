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
  currentQuestion,
  result,
  totalQuestions,
  userAnswer,
  onNext
}: ResultScreenProps) {
  const nextLabel = currentQuestion >= totalQuestions ? "Yakunlash" : "Keyingi";

  return (
    <div className={`result-overlay flex min-h-[calc(100vh-32px)] flex-col justify-center py-6 ${getOverlayClass(result.status)}`}>
      <ResultCard
        autoNextSeconds={autoNextSeconds}
        nextLabel={nextLabel}
        result={result}
        userAnswer={userAnswer}
        onNext={onNext}
      />
    </div>
  );
}

function getOverlayClass(status: AnswerResult["status"]) {
  if (status === "correct") {
    return "bg-[#052010]";
  }

  if (status === "partial") {
    return "bg-[#211805]";
  }

  return "bg-[#200505]";
}
