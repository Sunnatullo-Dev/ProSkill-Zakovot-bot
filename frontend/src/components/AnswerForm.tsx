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
      <label className="text-sm font-semibold text-[#94A3B8]" htmlFor="answer">
        Javobingiz
      </label>
      <input
        className="h-14 rounded-2xl border border-white/10 bg-[#0F1B2D] px-4 text-lg font-semibold text-white outline-none transition duration-200 placeholder:text-[#94A3B8]/60 focus:border-[#4DA6FF] focus:ring-4 focus:ring-[#4DA6FF]/15 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={disabled}
        id="answer"
        name="answer"
        placeholder="Javobni yozing"
        type="text"
        value={answer}
        onChange={(event) => onAnswerChange(event.target.value)}
      />
      <button
        className="h-14 rounded-2xl bg-[#4DA6FF] px-4 text-base font-bold text-white shadow-lg shadow-[#4DA6FF]/25 transition duration-200 hover:bg-[#3B95EF] active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-[#94A3B8] disabled:shadow-none"
        disabled={disabled || isChecking}
        type="submit"
      >
        {isChecking ? "Tekshirilmoqda..." : "Javob berish"}
      </button>
    </form>
  );
}
