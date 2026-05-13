type ScoreBadgeProps = {
  score: number;
};

export default function ScoreBadge({ score }: ScoreBadgeProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#1E2D42] px-4 py-3 text-right">
      <p className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">Ball</p>
      <p className="text-2xl font-black text-white">{score}</p>
    </div>
  );
}
