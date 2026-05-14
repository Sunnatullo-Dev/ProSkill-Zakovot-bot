import type { LeaderboardUser } from "../types";

type FinishScreenProps = {
  leaderboard: LeaderboardUser[];
  playerName: string;
  roundScore: number;
  totalQuestions: number;
  totalScore: number;
  onRestart: () => void;
};

export default function FinishScreen({
  leaderboard,
  playerName,
  roundScore,
  totalQuestions,
  totalScore,
  onRestart
}: FinishScreenProps) {
  const message = getFinishMessage(roundScore);

  return (
    <div className="flex min-h-[calc(100vh-32px)] flex-col justify-center gap-5 py-6 transition-all duration-300 animate-screen-in">
      <section className="flex flex-1 flex-col justify-center rounded-[30px] bg-[#1E2D42] p-6 text-center shadow-2xl shadow-black/30">
        <span className="mx-auto text-7xl leading-none">
          {"\u{1F389}"}
        </span>
        <p className="mt-6 text-sm font-bold uppercase tracking-[0.25em] text-[#4DA6FF]">O'yin tugadi</p>
        <h1 className="mt-3 text-5xl font-black text-white">Natija: {roundScore}/{totalQuestions}</h1>
        <p className="mt-4 text-2xl font-black text-yellow-400">{message}</p>
        <p className="mt-3 text-base font-semibold text-[#94A3B8]">{playerName}, umumiy ballingiz {totalScore}</p>

        <button
          className="mt-8 h-14 w-full rounded-2xl bg-[#4DA6FF] text-base font-black text-white shadow-xl shadow-[#4DA6FF]/25 transition duration-200 hover:bg-[#3B95EF] active:scale-[0.98]"
          type="button"
          onClick={onRestart}
        >
          Qayta o'ynash
        </button>
      </section>

      <section className="rounded-3xl bg-[#1E2D42] p-4 shadow-xl shadow-black/20">
        <h2 className="mb-3 text-base font-black text-white">Top 3</h2>
        <div className="space-y-2">
          {leaderboard.slice(0, 3).map((player, index) => (
            <div
              className="flex items-center justify-between rounded-2xl border border-white/5 bg-[#0F1B2D]/70 px-4 py-3"
              key={player.id}
            >
              <span className="text-sm font-bold text-white">
                {index + 1}. {player.firstName || player.username || "Zakovotchi"}
              </span>
              <span className="text-sm font-black tabular-nums text-white">{player.score}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function getFinishMessage(score: number) {
  if (score >= 7) {
    return "Ajoyib! \u{1F3C6}";
  }
  if (score >= 4) {
    return "Yaxshi! \u{1F44D}";
  }
  return "Ko'proq o'qing \u{1F4DA}";
}
