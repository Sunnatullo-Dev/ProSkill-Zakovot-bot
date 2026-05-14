import type { FormEvent } from "react";

type AnswerFormProps = {
  answer: string;
  disabled: boolean;
  isChecking: boolean;
  submitDisabled?: boolean;
  onAnswerChange: (answer: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export default function AnswerForm({
  answer,
  disabled,
  isChecking,
  submitDisabled,
  onAnswerChange,
  onSubmit
}: AnswerFormProps) {
  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <input
        className="h-14 w-full rounded-xl border-[1.5px] border-[#1E3A5F] bg-[var(--color-card)] px-4 text-base font-semibold text-[var(--color-text)] outline-none transition duration-200 placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent)] focus:shadow-[0_0_0_3px_rgba(77,166,255,0.15)] disabled:cursor-not-allowed disabled:opacity-60"
        disabled={disabled}
        id="answer"
        name="answer"
        placeholder="Javobingizni yozing..."
        type="text"
        value={answer}
        onChange={(event) => onAnswerChange(event.target.value)}
      />
      <button
        className="h-14 w-full rounded-xl bg-[var(--color-accent)] px-4 text-base font-bold text-white shadow-[0_4px_20px_rgba(77,166,255,0.25)] transition duration-200 hover:brightness-110 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40"
        disabled={(submitDisabled ?? disabled) || isChecking}
        type="submit"
      >
        {isChecking ? "Tekshirilmoqda..." : "Javob berish \u2713"}
      </button>
    </form>
  );
}
