type ScoreBadgeProps = {
  score: number;
};

export default function ScoreBadge({ score }: ScoreBadgeProps) {
  return (
    <div className="rounded-xl border border-[#1E3A5F] bg-[var(--color-card)] px-4 py-3 text-right">
      <p className="text-[11px] font-bold uppercase tracking-[2px] text-[var(--color-muted)]">Ball</p>
      <p className="text-2xl font-black text-[#F5C842]">{score}</p>
    </div>
  );
}
