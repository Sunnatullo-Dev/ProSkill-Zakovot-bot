type DiffDisplayProps = {
  correctAnswer: string;
  userAnswer: string;
};

export default function DiffDisplay({ correctAnswer, userAnswer }: DiffDisplayProps) {
  const user = userAnswer.trim();
  const correct = correctAnswer.trim();

  // Foydalanuvchi javobi to'g'ri javob bilan bir xil yoki ichida bo'lsa —
  // faqat "Siz yozdingiz" ko'rsatamiz, qiyoslash keraksiz.
  const isExactOrContains =
    user.toLowerCase() === correct.toLowerCase() ||
    correct.toLowerCase().includes(user.toLowerCase()) ||
    user.toLowerCase().includes(correct.toLowerCase());

  return (
    <div style={{ width: "100%" }}>
      {/* Foydalanuvchi javobi */}
      <div style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "6px" }}>
        Siz yozdingiz:
      </div>
      <div
        style={{
          fontSize: "18px",
          fontWeight: 700,
          color: "var(--success)",
          background: "rgba(34,197,94,0.08)",
          border: "1px solid rgba(34,197,94,0.2)",
          borderRadius: "12px",
          padding: "10px 14px",
          marginBottom: isExactOrContains ? 0 : "14px",
          lineHeight: 1.4,
          wordBreak: "break-word"
        }}
      >
        {user}
      </div>

      {/* To'g'ri javob — faqat farq bo'lsa ko'rsatamiz */}
      {!isExactOrContains && (
        <>
          <div style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "6px" }}>
            To'g'ri javob:
          </div>
          <div
            style={{
              fontSize: "18px",
              fontWeight: 700,
              color: "var(--warning)",
              background: "rgba(245,158,11,0.08)",
              border: "1px solid rgba(245,158,11,0.2)",
              borderRadius: "12px",
              padding: "10px 14px",
              lineHeight: 1.4,
              wordBreak: "break-word"
            }}
          >
            {correct}
          </div>
        </>
      )}
    </div>
  );
}
