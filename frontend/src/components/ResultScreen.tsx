import type { AnswerResult } from "../types";

type ResultScreenProps = {
  currentQuestion: number;
  result: AnswerResult;
  totalQuestions: number;
  onNext: () => void;
};

export default function ResultScreen({ currentQuestion, result, totalQuestions, onNext }: ResultScreenProps) {
  const isCorrect = result.isCorrect;
  const nextLabel = currentQuestion >= totalQuestions ? "Yakunlash" : "Keyingi";

  return (
    <div className={`result-overlay flex min-h-[calc(100vh-32px)] flex-col justify-center py-6 ${isCorrect ? "bg-[#052010]" : "bg-[#200505]"}`}>
      <section className="px-5 text-center">
        <div className="text-5xl leading-none">{isCorrect ? "\u2705" : "\u274C"}</div>
        <h1 className={`mt-5 text-[32px] font-black ${isCorrect ? "text-[var(--color-success)]" : "text-[var(--color-error)]"}`}>
          {isCorrect ? "+1 ball!" : "Noto'g'ri"}
        </h1>

        {!isCorrect ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-[var(--color-card)] p-4 text-left shadow-xl shadow-black/20">
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
        <p className="mt-3 text-xs font-semibold text-[var(--color-muted)]">2s da avtomatik o'tadi</p>
      </section>
    </div>
  );
}
