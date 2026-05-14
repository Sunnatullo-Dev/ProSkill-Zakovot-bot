import type { AnswerResult, AnswerStatus } from "../types";
import DiffDisplay from "./DiffDisplay";

type ResultCardProps = {
  autoNextSeconds: number;
  nextLabel: string;
  result: AnswerResult;
  userAnswer: string;
  onNext: () => void;
};

export default function ResultCard({ autoNextSeconds, nextLabel, result, userAnswer, onNext }: ResultCardProps) {
  const config = getStatusConfig(result.status);
  const showDiff = result.status === "partial" || result.status === "incorrect";

  return (
    <section className="px-5 text-center">
      <div className="text-5xl leading-none">{config.icon}</div>
      <h1 className={`mt-5 text-[32px] font-black leading-tight ${config.titleClass}`}>{config.title}</h1>

      {showDiff ? <DiffDisplay correctAnswer={result.correctAnswer} userAnswer={userAnswer} /> : null}

      {result.status === "partial" ? (
        <div className="mt-5 rounded-2xl border border-[#F5C842]/20 bg-[var(--color-card)] p-4 text-left shadow-xl shadow-black/20">
          <p className="text-xs font-bold uppercase tracking-[2px] text-[var(--color-muted)]">To'g'ri yozilishi:</p>
          <p className="mt-2 text-base font-bold leading-7 text-[var(--color-text)]">{result.correctAnswer}</p>
        </div>
      ) : null}

      {result.status === "incorrect" ? (
        <div className="mt-5 rounded-2xl border border-white/10 bg-[var(--color-card)] p-4 text-left shadow-xl shadow-black/20">
          <p className="text-xs font-bold uppercase tracking-[2px] text-[var(--color-muted)]">To'g'ri javob:</p>
          <p className="mt-2 text-base font-bold leading-7 text-[var(--color-text)]">{result.correctAnswer}</p>
        </div>
      ) : null}

      {result.explanation ? (
        <p className="mt-6 text-sm italic leading-6 text-[var(--color-muted)]">{result.explanation}</p>
      ) : null}

      <button
        className="mt-8 h-14 w-full rounded-xl bg-[var(--color-accent)] text-base font-bold text-white shadow-[0_4px_20px_rgba(77,166,255,0.25)] transition duration-200 hover:brightness-110 active:scale-[0.99]"
        type="button"
        onClick={onNext}
      >
        {nextLabel} {"\u2192"}
      </button>
      <p className="mt-3 text-xs font-semibold text-[var(--color-muted)]">
        {autoNextSeconds}s da avtomatik o'tadi
      </p>
    </section>
  );
}

function getStatusConfig(status: AnswerStatus) {
  if (status === "correct") {
    return {
      icon: "\u2705",
      title: "To'g'ri! +1 ball",
      titleClass: "text-[var(--color-success)]"
    };
  }

  if (status === "partial") {
    return {
      icon: "\u26A0\uFE0F",
      title: "Qisman to'g'ri — imlo xatosi bor",
      titleClass: "text-[#F5C842]"
    };
  }

  return {
    icon: "\u274C",
    title: "Noto'g'ri",
    titleClass: "text-[var(--color-error)]"
  };
}
