type HomeScreenProps = {
  error: string;
  isLoading: boolean;
  playerName: string;
  record: number;
  score: number;
  onStart: () => void;
};

export default function HomeScreen({ error, isLoading, playerName, record, score, onStart }: HomeScreenProps) {
  return (
    <div className="screen-transition flex min-h-[calc(100vh-32px)] flex-col justify-center gap-8 py-8">
      <header className="text-center">
        <div className="text-[52px] leading-none">{"\u{1F9E0}"}</div>
        <h1 className="mt-4 bg-gradient-to-r from-[var(--color-accent)] to-[#A78BFA] bg-clip-text text-[28px] font-[800] tracking-[4px] text-transparent">
          ZAKOVOT
        </h1>
        <p className="mt-2 text-sm font-medium text-[var(--color-muted)]">Bilimingizni sinang</p>
      </header>

      <section className="rounded-[20px] border border-[#1E3A5F] bg-[var(--color-card)] p-7 text-center shadow-2xl shadow-black/20">
        <p className="text-lg font-semibold text-[var(--color-text)]">{playerName}</p>
        <p className="mt-6 text-[11px] font-bold uppercase tracking-[2px] text-[var(--color-muted)]">Joriy ball</p>
        <p className="mt-1 text-[56px] font-[800] leading-none text-[#F5C842]">{score}</p>
        <p className="mt-4 text-[13px] font-semibold text-[var(--color-muted)]">Rekord: {record}</p>

        {error ? (
          <div className="mt-5 rounded-xl border border-[var(--color-error)]/30 bg-[var(--color-error)]/10 px-4 py-3 text-sm font-semibold text-[var(--color-text)]">
            {error}
          </div>
        ) : null}

        <div className="my-7 h-px bg-[#1E3A5F]" />

        <button
          className="flex w-full items-center justify-center gap-3 rounded-[14px] bg-gradient-to-br from-[var(--color-accent)] to-[#7C3AED] p-4 text-base font-bold text-white shadow-[0_4px_20px_rgba(77,166,255,0.3)] transition duration-200 hover:-translate-y-px hover:brightness-110 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isLoading}
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
    </div>
  );
}
