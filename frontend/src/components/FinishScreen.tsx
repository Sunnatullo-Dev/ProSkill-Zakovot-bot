type FinishScreenProps = {
  correctCount: number;
  totalQuestions: number;
  roundPoints: number;
  totalScore: number;
  onRestart: () => void;
};

export default function FinishScreen({
  correctCount,
  totalQuestions,
  roundPoints,
  totalScore,
  onRestart
}: FinishScreenProps) {
  const ratio = totalQuestions > 0 ? correctCount / totalQuestions : 0;
  const message =
    ratio >= 0.8
      ? "Ajoyib natija! \u{1F3C6}"
      : ratio >= 0.5
        ? "Yaxshi! Davom eting \u{1F44D}"
        : "Ko'proq mashq qiling \u{1F4DA}";
  const messageColor = ratio >= 0.8 ? "var(--gold)" : ratio >= 0.5 ? "var(--accent)" : "var(--muted)";

  return (
    <div
      className="animate-scaleIn"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        padding: "24px 24px 104px"
      }}
    >
      <div style={{ fontSize: "64px", marginBottom: "4px" }}>{"\u{1F389}"}</div>

      <div
        style={{
          fontSize: "13px",
          color: "var(--muted)",
          letterSpacing: "2px",
          textTransform: "uppercase",
          marginBottom: "6px"
        }}
      >
        Raund bali
      </div>

      <div
        style={{
          fontSize: "68px",
          fontWeight: 900,
          background: "linear-gradient(135deg, #4DA6FF, #A78BFA)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          lineHeight: 1,
          marginBottom: "8px"
        }}
      >
        +{roundPoints}
      </div>

      <div style={{ fontSize: "17px", fontWeight: 600, marginBottom: "28px", color: messageColor }}>
        {message}
      </div>

      <div
        style={{
          width: "100%",
          maxWidth: "360px",
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "20px",
          padding: "20px",
          marginBottom: "16px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "16px",
          textAlign: "center"
        }}
      >
        <div>
          <div
            style={{
              fontSize: "11px",
              color: "var(--muted)",
              letterSpacing: "2px",
              marginBottom: "6px"
            }}
          >
            TO'G'RI
          </div>
          <div style={{ fontSize: "34px", fontWeight: 900, color: "var(--success)" }}>
            {correctCount}
          </div>
        </div>
        <div>
          <div
            style={{
              fontSize: "11px",
              color: "var(--muted)",
              letterSpacing: "2px",
              marginBottom: "6px"
            }}
          >
            NOTO'G'RI
          </div>
          <div style={{ fontSize: "34px", fontWeight: 900, color: "var(--error)" }}>
            {totalQuestions - correctCount}
          </div>
        </div>
      </div>

      <div
        style={{
          width: "100%",
          maxWidth: "360px",
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          padding: "14px 18px",
          marginBottom: "24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}
      >
        <span style={{ fontSize: "13px", color: "var(--muted)" }}>Umumiy ball</span>
        <span style={{ fontSize: "20px", fontWeight: 800, color: "var(--gold)" }}>{totalScore}</span>
      </div>

      <button
        style={{
          width: "100%",
          maxWidth: "360px",
          padding: "16px",
          background: "linear-gradient(135deg, #4DA6FF, #7C3AED)",
          border: "none",
          borderRadius: "16px",
          fontSize: "17px",
          fontWeight: 700,
          color: "white",
          cursor: "pointer",
          boxShadow: "0 8px 24px rgba(77,166,255,0.3)"
        }}
        type="button"
        onClick={onRestart}
      >
        Qayta o'ynash {"\u{1F504}"}
      </button>
    </div>
  );
}
