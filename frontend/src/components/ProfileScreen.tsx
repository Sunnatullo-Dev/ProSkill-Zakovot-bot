import { useEffect, useState } from "react";
import { getMySubmissions } from "../api/client";
import type { AppUser, Submission } from "../types";

type ProfileScreenProps = {
  user: AppUser | null;
  playerName: string;
  score: number;
  record: number;
  isAdmin: boolean;
};

function statCard(label: string, value: string | number, color: string) {
  return (
    <div
      style={{
        flex: 1,
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: "16px",
        padding: "16px 12px",
        textAlign: "center"
      }}
    >
      <div style={{ fontSize: "28px", fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
      <div
        style={{
          fontSize: "10px",
          color: "var(--muted)",
          letterSpacing: "1px",
          textTransform: "uppercase",
          marginTop: "6px"
        }}
      >
        {label}
      </div>
    </div>
  );
}

function infoRow(label: string, value: string) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "12px 0",
        borderBottom: "1px solid var(--border)"
      }}
    >
      <span style={{ fontSize: "13px", color: "var(--muted)" }}>{label}</span>
      <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)" }}>{value}</span>
    </div>
  );
}

export default function ProfileScreen({ user, playerName, score, record, isAdmin }: ProfileScreenProps) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      setIsLoading(true);
      const items = await getMySubmissions();

      if (active) {
        setSubmissions(items);
        setIsLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  const approved = submissions.filter((item) => item.status === "approved").length;
  const pending = submissions.filter((item) => item.status === "pending").length;
  const rejected = submissions.filter((item) => item.status === "rejected").length;
  const userInitial = playerName[0]?.toUpperCase() ?? "Z";
  const username = user?.username ? `@${user.username}` : "—";
  const telegramId = user && user.telegramId > 0 ? String(user.telegramId) : "Mehmon";

  return (
    <div
      className="animate-fadeInUp"
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        padding: "24px 20px 104px",
        maxWidth: "430px",
        margin: "0 auto"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "24px" }}>
        <div
          style={{
            width: "60px",
            height: "60px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #4DA6FF, #7C3AED)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "26px",
            fontWeight: 800,
            color: "white",
            flex: "0 0 auto"
          }}
        >
          {userInitial}
        </div>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: "20px",
              fontWeight: 800,
              color: "var(--text)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap"
            }}
          >
            {playerName}
          </div>
          <div
            style={{
              display: "inline-block",
              marginTop: "4px",
              fontSize: "11px",
              fontWeight: 700,
              padding: "3px 10px",
              borderRadius: "20px",
              background: isAdmin ? "rgba(245,200,66,0.15)" : "rgba(77,166,255,0.12)",
              color: isAdmin ? "var(--gold)" : "var(--accent)"
            }}
          >
            {isAdmin ? "Admin" : "O'yinchi"}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        {statCard("Joriy ball", score, "var(--gold)")}
        {statCard("Rekord", record, "var(--accent)")}
      </div>

      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "18px",
          padding: "4px 16px",
          marginBottom: "24px"
        }}
      >
        {infoRow("Foydalanuvchi nomi", username)}
        {infoRow("Telegram ID", telegramId)}
      </div>

      <h2 style={{ fontSize: "15px", fontWeight: 800, color: "var(--text)", marginBottom: "12px" }}>
        Mening savollarim
      </h2>

      {isLoading ? (
        <p style={{ fontSize: "13px", color: "var(--muted)" }}>Yuklanmoqda...</p>
      ) : (
        <div style={{ display: "flex", gap: "10px" }}>
          {statCard("Tasdiqlangan", approved, "var(--success)")}
          {statCard("Kutilmoqda", pending, "var(--warning)")}
          {statCard("Rad etilgan", rejected, "var(--error)")}
        </div>
      )}
    </div>
  );
}
