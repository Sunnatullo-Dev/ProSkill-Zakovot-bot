import type { FormEvent } from "react";

type AnswerFormProps = {
  answer: string;
  disabled: boolean;
  isChecking: boolean;
  onAnswerChange: (answer: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export default function AnswerForm({
  answer,
  disabled,
  isChecking,
  onAnswerChange,
  onSubmit
}: AnswerFormProps) {
  return (
    <form className="flex flex-col gap-3" onSubmit={onSubmit}>
      <label className="text-sm font-medium text-slate-600" htmlFor="answer">
        Javobingiz
      </label>
      <input
        className="h-12 rounded-lg border border-slate-300 bg-white px-3 text-base outline-none transition focus:border-brand focus:ring-2 focus:ring-teal-100 disabled:bg-slate-100"
        disabled={disabled}
        id="answer"
        name="answer"
        placeholder="Javobni yozing"
        type="text"
        value={answer}
        onChange={(event) => onAnswerChange(event.target.value)}
      />
      <button
        className="h-11 rounded-lg bg-accent px-4 text-sm font-semibold text-slate-950 transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
        disabled={disabled || isChecking}
        type="submit"
      >
        {isChecking ? "Tekshirilmoqda..." : "Javobni yuborish"}
      </button>
    </form>
  );
}
