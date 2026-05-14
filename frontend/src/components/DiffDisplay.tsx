type DiffDisplayProps = {
  correctAnswer: string;
  userAnswer: string;
};

type DiffToken = {
  value: string;
  state: "correct" | "wrong" | "extra";
};

export default function DiffDisplay({ correctAnswer, userAnswer }: DiffDisplayProps) {
  const userTokens = splitAnswer(userAnswer);
  const correctTokens = splitAnswer(correctAnswer);
  const maxLength = Math.max(userTokens.length, correctTokens.length);
  const userDiff = Array.from({ length: maxLength }, (_, index) =>
    buildToken(userTokens[index] ?? "", correctTokens[index] ?? "")
  );
  const correctDiff = Array.from({ length: maxLength }, (_, index) =>
    buildToken(correctTokens[index] ?? "", userTokens[index] ?? "")
  );

  return (
    <div className="mt-5 space-y-4 rounded-2xl border border-white/10 bg-black/10 p-4 text-left">
      <DiffRow label="Siz yozdingiz:" tokens={userDiff} />
      <DiffRow label="To'g'ri javob:" tokens={correctDiff} />
    </div>
  );
}

function DiffRow({ label, tokens }: { label: string; tokens: DiffToken[] }) {
  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-[1.5px] text-[var(--color-muted)]">{label}</p>
      <div className="flex flex-wrap gap-1">
        {tokens.map((token, index) => (
          <span
            className={`grid h-8 w-7 place-items-center rounded-md border font-mono text-sm font-bold ${getTokenClass(token.state)}`}
            key={`${token.value}-${index}`}
          >
            {token.value || "-"}
          </span>
        ))}
      </div>
    </div>
  );
}

function buildToken(value: string, oppositeValue: string): DiffToken {
  if (!value) {
    return {
      value: "",
      state: "extra"
    };
  }

  if (!oppositeValue) {
    return {
      value,
      state: "extra"
    };
  }

  return {
    value,
    state: normalizeToken(value) === normalizeToken(oppositeValue) ? "correct" : "wrong"
  };
}

function getTokenClass(state: DiffToken["state"]) {
  if (state === "correct") {
    return "border-[var(--color-success)]/40 bg-[#052010] text-[var(--color-success)]";
  }

  if (state === "wrong") {
    return "border-[var(--color-error)]/40 bg-[#200505] text-[var(--color-error)] line-through";
  }

  return "border-slate-500/30 bg-slate-700/30 text-slate-300";
}

function splitAnswer(answer: string) {
  const tokens: string[] = [];

  for (let index = 0; index < answer.length; index += 1) {
    const current = answer[index] ?? "";
    const next = answer[index + 1] ?? "";
    const pair = `${current}${next}`.toLowerCase();

    if (pair === "sh" || pair === "ch") {
      tokens.push(`${current}${next}`);
      index += 1;
      continue;
    }

    if ((pair === "o'" || pair === "g'") && next) {
      tokens.push(`${current}${next}`);
      index += 1;
      continue;
    }

    if (current.trim()) {
      tokens.push(current);
    }
  }

  return tokens;
}

function normalizeToken(token: string) {
  return token.toLowerCase();
}
