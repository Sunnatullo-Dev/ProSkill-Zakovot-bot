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
    <div className="screen-transition flex min-h-[calc(100vh-32px)] flex-col justify-between gap-6 py-5">
      <header className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-[var(--color-muted)]">
            Savol {currentQuestion}/{totalQuestions}
          </p>
          <p className="text-xs font-semibold text-[var(--color-muted)]">{remainingSeconds}s</p>
        </div>
        <div className="h-1.5 overflow-hidden rounded-[3px] bg-[var(--color-card)]">
          <div className={`h-full rounded-[3px] bg-[var(--color-accent)] transition-all duration-500 ${getProgressWidthClass(currentQuestion)}`} />
        </div>
      </header>

      <section className="rounded-[20px] border border-[#1E3A5F] bg-[var(--color-surface)] p-5 shadow-2xl shadow-black/20">
        <div className="flex justify-center">
          <Timer seconds={remainingSeconds} totalSeconds={totalSeconds} />
        </div>

        <div className="mt-8 rounded-2xl bg-[var(--color-card)] px-6 py-6">
          {isLoading ? (
            <div className="space-y-4">
              <div className="h-5 w-11/12 animate-pulse rounded-full bg-white/10" />
              <div className="h-5 w-10/12 animate-pulse rounded-full bg-white/10" />
              <div className="h-5 w-8/12 animate-pulse rounded-full bg-white/10" />
            </div>
          ) : (
            <h1 className="select-none text-center text-xl font-bold leading-[1.6] text-[var(--color-text)]">
              {question || "Savol topilmadi."}
            </h1>
          )}
        </div>
      </section>

      <section className="space-y-4">
        {error ? (
          <div className="rounded-xl border border-[var(--color-error)]/30 bg-[var(--color-error)]/10 px-4 py-3 text-sm font-semibold text-[var(--color-text)]">
            {error}
          </div>
        ) : null}

        <AnswerForm
          answer={answer}
          disabled={disabled}
          isChecking={isChecking}
          submitDisabled={disabled || isAnswerEmpty}
          onAnswerChange={onAnswerChange}
          onSubmit={onSubmit}
        />
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
