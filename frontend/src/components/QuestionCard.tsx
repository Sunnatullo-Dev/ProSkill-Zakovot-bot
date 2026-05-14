import type { FormEvent } from "react";
import AnswerForm from "./AnswerForm";
import Timer from "./Timer";

type QuestionCardProps = {
  answer: string;
  currentQuestion: number;
  disabled: boolean;
  error: string;
  isChecking: boolean;
  isLoading: boolean;
  question: string;
  remainingSeconds: number;
  totalQuestions: number;
  totalSeconds: number;
  onAnswerChange: (answer: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export default function QuestionCard({
  answer,
  currentQuestion,
  disabled,
  error,
  isChecking,
  isLoading,
  question,
  remainingSeconds,
  totalQuestions,
  totalSeconds,
  onAnswerChange,
  onSubmit
}: QuestionCardProps) {
  const isAnswerEmpty = answer.trim().length === 0;

  return (
    <div className="flex min-h-[calc(100vh-32px)] flex-col gap-6 pb-5 pt-3 transition-all duration-300 animate-screen-in">
      <header className="space-y-3">
        <p className="text-center text-sm font-black uppercase tracking-[0.22em] text-[#94A3B8]">
          Savol {currentQuestion}/{totalQuestions}
        </p>

        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div className={`h-full rounded-full bg-[#4DA6FF] transition-all duration-500 ${getProgressWidthClass(currentQuestion)}`} />
        </div>
      </header>

      <section className="flex flex-1 flex-col justify-between rounded-3xl bg-[#1E2D42] p-5 shadow-2xl shadow-black/20">
        <div className="space-y-8">
          <div className="flex justify-center">
            <Timer seconds={remainingSeconds} totalSeconds={totalSeconds} />
          </div>

          {isLoading ? (
            <div className="space-y-4 pt-4">
              <div className="h-5 w-11/12 animate-pulse rounded-full bg-white/10" />
              <div className="h-5 w-10/12 animate-pulse rounded-full bg-white/10" />
              <div className="h-5 w-8/12 animate-pulse rounded-full bg-white/10" />
            </div>
          ) : (
            <h1 className="text-center text-2xl font-black leading-9 text-white">{question || "Savol topilmadi."}</h1>
          )}
        </div>

        <div className="mt-8 space-y-3">
          {error ? (
            <div className="rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/10 px-4 py-3 text-sm font-medium text-white">
              {error}
            </div>
          ) : null}

          <AnswerForm
            answer={answer}
            disabled={disabled}
            submitDisabled={disabled || isAnswerEmpty}
            isChecking={isChecking}
            onAnswerChange={onAnswerChange}
            onSubmit={onSubmit}
          />
        </div>
      </section>
    </div>
  );
}

function getProgressWidthClass(currentQuestion: number) {
  if (currentQuestion <= 1) {
    return "w-[10%]";
  }
  if (currentQuestion === 2) {
    return "w-[20%]";
  }
  if (currentQuestion === 3) {
    return "w-[30%]";
  }
  if (currentQuestion === 4) {
    return "w-[40%]";
  }
  if (currentQuestion === 5) {
    return "w-[50%]";
  }
  if (currentQuestion === 6) {
    return "w-[60%]";
  }
  if (currentQuestion === 7) {
    return "w-[70%]";
  }
  if (currentQuestion === 8) {
    return "w-[80%]";
  }
  if (currentQuestion === 9) {
    return "w-[90%]";
  }
  return "w-full";
}
