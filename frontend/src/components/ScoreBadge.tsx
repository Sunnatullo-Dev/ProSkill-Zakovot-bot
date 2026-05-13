type ScoreBadgeProps = {
  score: number;
};

export default function ScoreBadge({ score }: ScoreBadgeProps) {
  return (
    <div className="rounded-lg border border-teal-100 bg-teal-50 px-3 py-2 text-right">
      <p className="text-xs font-medium text-teal-700">Ball</p>
      <p className="text-xl font-bold text-brand">{score}</p>
    </div>
  );
}
