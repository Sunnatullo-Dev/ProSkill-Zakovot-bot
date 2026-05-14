type FinishScreenProps = {
  playerName: string;
  roundScore: number;
  totalQuestions: number;
  totalScore: number;
  onRestart: () => void;
};

export default function FinishScreen({ playerName, roundScore, totalQuestions, totalScore, onRestart }: FinishScreenProps) {
  const resultTone = getResultToneClass(roundScore);
  const message = getFinishMessage(roundScore);

  return (
    <div className="screen-transition flex min-h-[calc(100vh-32px)] flex-col justify-center gap-7 py-8 text-center">
      <div className="text-[64px] leading-none">{"\u{1F389}"}</div>
      <section className="rounded-[20px] border border-[#1E3A5F] bg-[var(--color-card)] p-7 shadow-2xl shadow-black/20">
        <p className="text-sm font-bold uppercase tracking-[2px] text-[var(--color-muted)]">Natija</p>
        <h1 className="mt-3 bg-gradient-to-r from-[var(--color-accent)] to-[#A78BFA] bg-clip-text text-[64px] font-black leading-none text-transparent">
          {roundScore}/{totalQuestions}
        </h1>
        <p className={`mt-5 text-xl font-black ${resultTone}`}>{message}</p>
        <p className="mt-4 text-sm font-semibold text-[var(--color-muted)]">
          {playerName}, umumiy ballingiz {totalScore}
        </p>
      </section>

      <button
        className="h-14 w-full rounded-[14px] bg-gradient-to-br from-[var(--color-accent)] to-[#7C3AED] text-base font-bold text-white shadow-[0_4px_20px_rgba(77,166,255,0.3)] transition duration-200 hover:-translate-y-px hover:brightness-110 active:translate-y-0"
        type="button"
        onClick={onRestart}
      >
        Qayta o'ynash
      </button>
    </div>
  );
}

function getFinishMessage(score: number) {
  if (score >= 8) {
    return "Ajoyib natija! \u{1F3C6}";
  }
  if (score >= 5) {
    return "Yaxshi! Davom eting \u{1F44D}";
  }
  return "Ko'proq mashq qiling \u{1F4DA}";
}

function getResultToneClass(score: number) {
  if (score >= 8) {
    return "text-[#F5C842]";
  }
  if (score >= 5) {
    return "text-[var(--color-accent)]";
  }
  return "text-[var(--color-muted)]";
}
