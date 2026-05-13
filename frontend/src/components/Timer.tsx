type TimerProps = {
  seconds: number;
  totalSeconds: number;
};

export default function Timer({ seconds, totalSeconds }: TimerProps) {
  const percent = Math.max(0, Math.min(100, (seconds / totalSeconds) * 100));

  return (
    <div
      className="grid h-28 w-28 place-items-center rounded-full transition-all duration-500"
      style={{
        background: `conic-gradient(#4DA6FF ${percent}%, rgba(255,255,255,0.10) ${percent}% 100%)`
      }}
    >
      <div className="grid h-24 w-24 place-items-center rounded-full bg-[#1E2D42] shadow-inner shadow-black/30">
        <div className="text-center">
          <span className="block text-3xl font-black tabular-nums text-white">{seconds}</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">soniya</span>
        </div>
      </div>
    </div>
  );
}
