type HomeScreenProps = {
  error: string;
  isLoading: boolean;
  playerName: string;
  record: number;
  score: number;
  onStart: () => void;
};

export default function HomeScreen({ isLoading, playerName, record, score, onStart }: HomeScreenProps) {
  const userInitial = playerName[0]?.toUpperCase() ?? "Z";

  return (
    <div
      className="animate-fadeInUp"
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
      <div style={{ textAlign: "center", marginBottom: "36px" }}>
        <div
          style={{
            fontSize: "64px",
            filter: "drop-shadow(0 0 24px rgba(77,166,255,0.4))",
            marginBottom: "12px",
            lineHeight: 1
          }}
        >
          {"\u{1F9E0}"}
        </div>
        <div
          style={{
            fontSize: "32px",
            fontWeight: 900,
            letterSpacing: "6px",
            background: "linear-gradient(135deg, #4DA6FF, #A78BFA)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent"
          }}
        >
          ZAKOVAT
        </div>
        <div
          style={{
            color: "var(--muted)",
            fontSize: "14px",
            marginTop: "8px"
          }}
        >
          Bilimingizni sinang
        </div>
      </div>

      <div
        style={{
          width: "100%",
          maxWidth: "360px",
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "24px",
          padding: "24px 20px",
          boxShadow: "0 0 40px rgba(77,166,255,0.08), 0 2px 0 rgba(255,255,255,0.04) inset"
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
            gap: "12px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #4DA6FF, #7C3AED)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
                fontWeight: 700,
                color: "white",
                flex: "0 0 auto"
              }}
            >
              {userInitial}
            </div>
            <span
              style={{
                fontSize: "16px",
                fontWeight: 600,
                color: "var(--text)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap"
              }}
            >
              {playerName || "Zakovatchi"}
            </span>
          </div>
          <div
            style={{
              background: "#1A2E10",
              color: "var(--gold)",
              fontSize: "12px",
              fontWeight: 600,
              padding: "5px 12px",
              borderRadius: "20px",
              border: "1px solid rgba(245,200,66,0.2)",
              whiteSpace: "nowrap"
            }}
          >
            {"\u{1F3C6}"} Rekord: {record}
          </div>
        </div>

        <div
          style={{
            height: "1px",
            background: "var(--border)",
            marginTop: 0,
            marginBottom: "20px"
          }}
        />

        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div
            style={{
              color: "var(--muted)",
              fontSize: "11px",
              letterSpacing: "3px",
              marginBottom: "8px"
            }}
          >
            JORIY BALL
          </div>
          <div
            style={{
              fontSize: "72px",
              fontWeight: 900,
              color: "var(--gold)",
              lineHeight: 1,
              filter: score > 0 ? "drop-shadow(0 0 16px rgba(245,200,66,0.4))" : "none"
            }}
          >
            {score}
          </div>
        </div>

        <button
          disabled={isLoading}
          style={{
            width: "100%",
            padding: "16px",
            background: "linear-gradient(135deg, #4DA6FF, #7C3AED)",
            border: "none",
            borderRadius: "16px",
            fontSize: "17px",
            fontWeight: 700,
            color: "white",
            cursor: isLoading ? "not-allowed" : "pointer",
            boxShadow: "0 8px 24px rgba(77,166,255,0.3)",
            transition: "transform 0.15s, box-shadow 0.15s",
            opacity: isLoading ? 0.7 : 1
          }}
          type="button"
          onClick={onStart}
          onMouseEnter={(event) => {
            event.currentTarget.style.transform = "translateY(-2px)";
            event.currentTarget.style.boxShadow = "0 12px 32px rgba(77,166,255,0.4)";
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.transform = "translateY(0)";
            event.currentTarget.style.boxShadow = "0 8px 24px rgba(77,166,255,0.3)";
          }}
        >
          {isLoading ? "Yuklanmoqda..." : "Testni boshlash \u{1F680}"}
        </button>
      </div>
    </div>
  );
}
