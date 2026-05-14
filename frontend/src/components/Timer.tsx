type TimerProps = {
  seconds: number;
  totalSeconds: number;
};

export default function Timer({ seconds, totalSeconds }: TimerProps) {
  const toneClass = getTimerToneClass(seconds, totalSeconds);

  return (
    <div className={`grid h-32 w-32 place-items-center rounded-full border-8 bg-[#0F1B2D] shadow-inner shadow-black/30 transition-colors duration-500 ${toneClass}`}>
      <div className="text-center">
        <span className="block text-4xl font-black tabular-nums">{seconds}</span>
        <span className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">soniya</span>
      </div>
    </div>
  );
}

function getTimerToneClass(seconds: number, totalSeconds: number) {
  if (seconds <= Math.ceil(totalSeconds / 3)) {
    return "border-[#EF4444] text-[#EF4444]";
  }
  if (seconds <= Math.ceil((totalSeconds * 2) / 3)) {
    return "border-yellow-400 text-yellow-300";
  }
  return "border-[#4DA6FF] text-[#4DA6FF]";
}
