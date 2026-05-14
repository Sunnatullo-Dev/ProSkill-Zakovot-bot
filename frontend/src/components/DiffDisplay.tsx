type DiffDisplayProps = {
  correctAnswer: string;
  userAnswer: string;
};

export default function DiffDisplay({ correctAnswer, userAnswer }: DiffDisplayProps) {
  const userClean = userAnswer.trim();
  const correctClean = correctAnswer.trim();
  const maxLen = Math.max(userClean.length, correctClean.length);

  return (
    <div style={{ width: "100%" }}>
      <div
        style={{
          fontSize: "12px",
          color: "var(--muted)",
          marginBottom: "8px"
        }}
      >
        Siz yozdingiz:
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "4px",
          marginBottom: "16px"
        }}
      >
        {Array.from({ length: maxLen }).map((_, index) => {
          const char = userClean[index];
          const isMatch = Boolean(char) && char.toLowerCase() === correctClean[index]?.toLowerCase();
          const isMissing = !char;

          return (
            <div
              key={index}
              style={{
                width: "32px",
                height: "36px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "8px",
                fontSize: "15px",
                fontFamily: "monospace",
                fontWeight: 600,
                background: isMissing ? "var(--surface)" : isMatch ? "#0A2010" : "#200508",
                color: isMissing ? "var(--border)" : isMatch ? "var(--success)" : "var(--error)",
                border: `1px solid ${
                  isMissing ? "var(--border)" : isMatch ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"
                }`,
                textDecoration: !isMissing && !isMatch ? "line-through" : "none"
              }}
            >
              {char ?? ""}
            </div>
          );
        })}
      </div>

      <div
        style={{
          fontSize: "12px",
          color: "var(--muted)",
          marginBottom: "8px"
        }}
      >
        To'g'ri yozilishi:
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "4px"
        }}
      >
        {Array.from(correctClean).map((char, index) => {
          const isMatch = char.toLowerCase() === userClean[index]?.toLowerCase();

          return (
            <div
              key={`${char}-${index}`}
              style={{
                width: "32px",
                height: "36px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "8px",
                fontSize: "15px",
                fontFamily: "monospace",
                fontWeight: 600,
                background: isMatch ? "#0A2010" : "#0D0203",
                color: isMatch ? "var(--success)" : "var(--error)",
                border: `1px solid ${isMatch ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`
              }}
            >
              {char}
            </div>
          );
        })}
      </div>
    </div>
  );
}
