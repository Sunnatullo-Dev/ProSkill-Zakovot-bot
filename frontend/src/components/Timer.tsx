type TimerProps = {
  seconds: number;
  totalSeconds: number;
};

export default function Timer({ seconds, totalSeconds }: TimerProps) {
  const dashOffset = getDashOffset(seconds, totalSeconds);
  const toneClass = getTimerToneClass(seconds);

  return (
    <div className="relative grid h-20 w-20 place-items-center">
      <svg aria-hidden="true" className="-rotate-90" height="80" viewBox="0 0 80 80" width="80">
        <circle
          className="stroke-[var(--color-card)]"
          cx="40"
          cy="40"
          fill="none"
          r="34"
          strokeWidth="7"
        />
        <circle
          className={`transition-all duration-500 ${toneClass}`}
          cx="40"
          cy="40"
          fill="none"
          pathLength="100"
          r="34"
          strokeDasharray="100"
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          strokeWidth="7"
        />
      </svg>
      <span className="absolute text-xl font-black tabular-nums text-[var(--color-text)]">{seconds}</span>
    </div>
  );
}

function getDashOffset(seconds: number, totalSeconds: number) {
  const progress = Math.max(0, Math.min(100, (seconds / totalSeconds) * 100));

  return 100 - progress;
}

function getTimerToneClass(seconds: number) {
  if (seconds <= 5) {
    return "stroke-[var(--color-error)]";
  }
  if (seconds <= 10) {
    return "stroke-[#F5C842]";
  }
  return "stroke-[var(--color-accent)]";
}
