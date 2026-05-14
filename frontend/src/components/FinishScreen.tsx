type FinishScreenProps = {
  playerName: string;
  roundScore: number;
  totalQuestions: number;
  totalScore: number;
  onRestart: () => void;
};

export default function FinishScreen({
  playerName: _playerName,
  roundScore,
  totalQuestions,
  totalScore: _totalScore,
  onRestart
}: FinishScreenProps) {
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
        padding: "24px"
      }}
    >
      <div style={{ fontSize: "72px", marginBottom: "8px" }}>{"\u{1F389}"}</div>

      <div
        style={{
          fontSize: "14px",
          color: "var(--muted)",
          letterSpacing: "2px",
          textTransform: "uppercase",
          marginBottom: "8px"
        }}
      >
        Natija
      </div>

      <div
        style={{
          fontSize: "72px",
          fontWeight: 900,
          background: "linear-gradient(135deg, #4DA6FF, #A78BFA)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          lineHeight: 1,
          marginBottom: "8px"
        }}
      >
        {roundScore}/{totalQuestions}
      </div>

      <div
        style={{
          fontSize: "18px",
          fontWeight: 600,
          marginBottom: "32px",
          color: roundScore >= 8 ? "var(--gold)" : roundScore >= 5 ? "var(--accent)" : "var(--muted)"
        }}
      >
        {roundScore >= 8
          ? "Ajoyib natija! \u{1F3C6}"
          : roundScore >= 5
            ? "Yaxshi! Davom eting \u{1F44D}"
            : "Ko'proq mashq qiling \u{1F4DA}"}
      </div>

      <div
        style={{
          width: "100%",
          maxWidth: "360px",
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "20px",
          padding: "20px",
          marginBottom: "24px",
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
          <div
            style={{
              fontSize: "36px",
              fontWeight: 900,
              color: "var(--success)"
            }}
          >
            {roundScore}
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
          <div
            style={{
              fontSize: "36px",
              fontWeight: 900,
              color: "var(--error)"
            }}
          >
            {totalQuestions - roundScore}
          </div>
        </div>
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
