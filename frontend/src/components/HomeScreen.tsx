import type { LeaderboardUser } from "../types";

type HomeScreenProps = {
  error: string;
  isLoading: boolean;
  leaderboard: LeaderboardUser[];
  playerName: string;
  record: number;
  score: number;
  onStart: () => void;
};

export default function HomeScreen({
  error,
  isLoading,
  leaderboard,
  playerName,
  record,
  score,
  onStart
}: HomeScreenProps) {
  const topScore = Math.max(record, leaderboard[0]?.score ?? 0);

  return (
    <div className="flex min-h-[calc(100vh-32px)] flex-col justify-between gap-8 pb-6 pt-8 transition-all duration-300 animate-screen-in">
      <header className="text-center">
        <div className="text-6xl leading-none">{"\u{1F9E0}"}</div>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-white">Zakovot</h1>
        <p className="mt-2 text-base font-semibold text-[#94A3B8]">Bilimingizni sinang</p>
      </header>

      <section className="rounded-3xl bg-[#1E2D42] p-6 text-center shadow-2xl shadow-black/25">
        <p className="text-lg font-bold text-white">{playerName}</p>
        <p className="mt-5 text-sm font-bold uppercase tracking-[0.22em] text-[#94A3B8]">Joriy ball</p>
        <p className="mt-2 text-7xl font-black leading-none text-yellow-400">{score}</p>
        <p className="mt-4 text-sm font-semibold text-[#94A3B8]">Rekord: {topScore}</p>

        {error ? (
          <div className="mt-6 rounded-2xl border border-[#EF4444]/30 bg-[#EF4444]/10 px-4 py-3 text-sm font-semibold text-white">
            {error}
          </div>
        ) : null}

        <button
          className="mt-8 flex w-full items-center justify-center gap-3 rounded-xl bg-[#4DA6FF] p-4 text-base font-black text-white shadow-xl shadow-[#4DA6FF]/25 transition duration-200 hover:bg-[#3B95EF] active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-[#94A3B8] disabled:shadow-none"
          disabled={isLoading || Boolean(error)}
          type="button"
          onClick={onStart}
        >
          {isLoading ? (
            <>
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Yuklanmoqda...
            </>
          ) : (
            <>
              Testni boshlash <span>{"\u{1F680}"}</span>
            </>
          )}
        </button>
      </section>

      <div className="h-4" />
    </div>
  );
}
