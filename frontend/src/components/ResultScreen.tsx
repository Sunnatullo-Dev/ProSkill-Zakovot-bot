import type { AnswerResult } from "../types";

type ResultScreenProps = {
  currentQuestion: number;
  result: AnswerResult;
  totalQuestions: number;
  onNext: () => void;
};

export default function ResultScreen({ currentQuestion, result, totalQuestions, onNext }: ResultScreenProps) {
  const isCorrect = result.isCorrect;
  const toneColor = isCorrect ? "#22C55E" : "#EF4444";
  const nextLabel = currentQuestion >= totalQuestions ? "Yakunlash" : "Keyingi savol";

  return (
    <div className="flex min-h-[calc(100vh-32px)] flex-col justify-center py-6 transition-all duration-300">
      <section className="rounded-[30px] bg-[#1E2D42] p-6 text-center shadow-2xl shadow-black/30">
        <div
          className="mx-auto grid h-28 w-28 animate-pulse place-items-center rounded-full border-8 text-5xl font-black"
          style={{
            borderColor: `${toneColor}33`,
            backgroundColor: `${toneColor}1A`,
            color: toneColor
          }}
        >
          {isCorrect ? "\u2713" : "\u00D7"}
        </div>

        <p className="mt-6 text-sm font-bold uppercase tracking-[0.25em]" style={{ color: toneColor }}>
          {isCorrect ? "To'g'ri javob" : "Noto'g'ri javob"}
        </p>
        <h1 className="mt-3 text-4xl font-black text-white">{isCorrect ? "+1 ball" : "0 ball"}</h1>
        <p className="mt-4 text-base font-medium leading-7 text-[#94A3B8]">{result.explanation}</p>

        {!isCorrect && result.correctAnswer ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-[#0F1B2D] p-4 text-left">
            <p className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">To'g'ri javob</p>
            <p className="mt-2 text-lg font-black text-white">{result.correctAnswer}</p>
          </div>
        ) : null}

        <button
          className="mt-8 h-14 w-full rounded-2xl bg-[#4DA6FF] text-base font-black text-white shadow-xl shadow-[#4DA6FF]/25 transition duration-200 hover:bg-[#3B95EF] active:scale-[0.98]"
          type="button"
          onClick={onNext}
        >
          {nextLabel}
        </button>
      </section>
    </div>
  );
}
