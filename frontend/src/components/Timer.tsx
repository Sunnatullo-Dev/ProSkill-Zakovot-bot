type TimerProps = {
  seconds: number;
  totalSeconds: number;
};

export default function Timer({ seconds, totalSeconds }: TimerProps) {
  const percent = Math.max(0, Math.min(100, (seconds / totalSeconds) * 100));

  return (
    <div className="flex min-w-28 items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${percent}%` }} />
      </div>
      <span className="w-8 text-right text-sm font-bold tabular-nums">{seconds}s</span>
    </div>
  );
}
