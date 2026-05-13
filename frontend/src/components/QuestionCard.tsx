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
  const progress = Math.max(0, Math.min(100, (currentQuestion / totalQuestions) * 100));

  return (
    <div className="flex min-h-[calc(100vh-32px)] flex-col gap-5 pb-4 pt-2 transition-all duration-300">
      <header className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1E2D42] text-xl">
              {"\u{1F9E0}"}
            </span>
            <span className="text-lg font-bold tracking-wide">Zakovot</span>
          </div>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm font-semibold text-[#94A3B8]">
            {currentQuestion}/{totalQuestions} savol
          </span>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-[#4DA6FF] transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </header>

      <section className="flex flex-1 flex-col justify-between rounded-2xl bg-[#1E2D42] p-5 shadow-2xl shadow-black/20">
        <div className="space-y-6">
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
            <h1 className="text-center text-2xl font-bold leading-9 text-white">{question || "Savol topilmadi."}</h1>
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
            isChecking={isChecking}
            onAnswerChange={onAnswerChange}
            onSubmit={onSubmit}
          />
        </div>
      </section>
    </div>
  );
}
