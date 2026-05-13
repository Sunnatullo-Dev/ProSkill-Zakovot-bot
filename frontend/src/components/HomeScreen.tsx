import type { LeaderboardUser } from "../types";
import ScoreBadge from "./ScoreBadge";

type HomeScreenProps = {
  error: string;
  isLoading: boolean;
  leaderboard: LeaderboardUser[];
  playerName: string;
  score: number;
  onStart: () => void;
};

export default function HomeScreen({
  error,
  isLoading,
  leaderboard,
  playerName,
  score,
  onStart
}: HomeScreenProps) {
  return (
    <div className="flex min-h-[calc(100vh-32px)] flex-col gap-6 pb-4 pt-2 transition-all duration-300">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#1E2D42] text-2xl shadow-lg shadow-black/20">
            {"\u{1F9E0}"}
          </span>
          <div>
            <p className="text-xl font-black tracking-wide text-white">Zakovot</p>
            <p className="text-sm font-medium text-[#94A3B8]">Bilim tekshirish o'yini</p>
          </div>
        </div>
        <ScoreBadge score={score} />
      </header>

      <section className="flex flex-1 flex-col justify-center rounded-[28px] bg-[#1E2D42] p-6 text-center shadow-2xl shadow-black/25">
        <p className="text-base font-semibold text-[#94A3B8]">Salom, {playerName}</p>
        <div className="mt-5">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#4DA6FF]">Joriy ball</p>
          <p className="mt-2 text-7xl font-black leading-none text-white">{score}</p>
        </div>

        {error ? (
          <div className="mt-6 rounded-2xl border border-[#EF4444]/30 bg-[#EF4444]/10 px-4 py-3 text-sm font-semibold text-white">
            {error}
          </div>
        ) : null}

        <button
          className="mt-8 h-14 w-full rounded-2xl bg-[#4DA6FF] text-base font-black text-white shadow-xl shadow-[#4DA6FF]/25 transition duration-200 hover:bg-[#3B95EF] active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-[#94A3B8] disabled:shadow-none"
          disabled={isLoading || Boolean(error)}
          type="button"
          onClick={onStart}
        >
          {isLoading ? "Yuklanmoqda..." : "O'yin boshlash"}
        </button>
      </section>

      <section className="rounded-3xl bg-[#1E2D42] p-4 shadow-xl shadow-black/20">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-black text-white">Top 3</h2>
          <span className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">Leaderboard</span>
        </div>

        <div className="space-y-2">
          {[0, 1, 2].map((index) => {
            const player = leaderboard[index];
            const displayName = player?.firstName || player?.username || "Hali natija yo'q";

            return (
              <div
                className="flex items-center justify-between rounded-2xl border border-white/5 bg-[#0F1B2D]/70 px-4 py-3 transition duration-200"
                key={player?.id ?? index}
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-[#4DA6FF]/15 text-sm font-black text-[#4DA6FF]">
                    {index + 1}
                  </span>
                  <span className="max-w-48 truncate text-sm font-bold text-white">{displayName}</span>
                </div>
                <span className="text-sm font-black tabular-nums text-white">{player?.score ?? 0}</span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
