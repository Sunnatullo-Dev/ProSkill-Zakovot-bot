import type { AnswerResult } from "../types";

type ResultScreenProps = {
  currentQuestion: number;
  result: AnswerResult;
  totalQuestions: number;
  onNext: () => void;
};

export default function ResultScreen({ currentQuestion, result, totalQuestions, onNext }: ResultScreenProps) {
  const isCorrect = result.isCorrect;
  const nextLabel = currentQuestion >= totalQuestions ? "Yakunlash" : "Keyingi savol";

  return (
    <div className={`flex min-h-[calc(100vh-32px)] flex-col justify-center py-6 transition-all duration-300 ${isCorrect ? "animate-result-correct" : "animate-result-wrong"}`}>
      <section className="rounded-[30px] bg-[#1E2D42] p-6 text-center shadow-2xl shadow-black/30">
        <div className={`mx-auto grid h-28 w-28 place-items-center rounded-full border-8 text-5xl font-black ${isCorrect ? "border-[#22C55E]/30 bg-[#22C55E]/10 text-[#22C55E]" : "border-[#EF4444]/30 bg-[#EF4444]/10 text-[#EF4444]"}`}>
          {isCorrect ? "\u2705" : "\u274C"}
        </div>

        <p className={`mt-6 text-sm font-bold uppercase tracking-[0.25em] ${isCorrect ? "text-[#22C55E]" : "text-[#EF4444]"}`}>
          {isCorrect ? "To'g'ri" : "Noto'g'ri"}
        </p>
        <h1 className={`mt-3 text-4xl font-black animate-pop ${isCorrect ? "text-[#22C55E]" : "text-[#EF4444]"}`}>
          {isCorrect ? "+1 ball!" : "Noto'g'ri"}
        </h1>
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
          {nextLabel} {"\u2192"}
        </button>
      </section>
    </div>
  );
}
