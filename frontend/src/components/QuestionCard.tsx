type QuestionCardProps = {
  question: string;
  isLoading: boolean;
};

export default function QuestionCard({ question, isLoading }: QuestionCardProps) {
  return (
    <article className="min-h-40 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="mb-2 text-sm font-medium text-slate-500">Savol</p>
      {isLoading ? (
        <div className="space-y-3">
          <div className="h-4 w-11/12 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-9/12 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-7/12 animate-pulse rounded bg-slate-200" />
        </div>
      ) : (
        <h2 className="text-xl font-semibold leading-7">{question || "Savol topilmadi."}</h2>
      )}
    </article>
  );
}
