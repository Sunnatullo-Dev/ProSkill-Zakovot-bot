import { useEffect, useState } from "react";
import { getLeaderboard } from "../api/client";
import type { LeaderboardUser } from "../types";

type LeaderboardScreenProps = {
  currentUserId: number;
  playerName: string;
  score: number;
};

const MEDALS = ["\u{1F947}", "\u{1F948}", "\u{1F949}"];

function displayName(user: LeaderboardUser): string {
  return user.firstName || user.username || "Zakovatchi";
}

export default function LeaderboardScreen({ currentUserId, playerName, score }: LeaderboardScreenProps) {
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [rank, setRank] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      const data = await getLeaderboard();

      if (active) {
        setUsers(data.users);
        setRank(data.rank);
        setIsLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

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
      <h1 style={{ fontSize: "22px", fontWeight: 900, color: "var(--text)", marginBottom: "16px" }}>
        Reyting
      </h1>

      <div
        style={{
          background: "linear-gradient(135deg, #4DA6FF, #7C3AED)",
          borderRadius: "20px",
          padding: "18px 20px",
          marginBottom: "20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}
      >
        <div>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.75)", letterSpacing: "2px" }}>
            SIZNING O'RNINGIZ
          </div>
          <div style={{ fontSize: "16px", fontWeight: 800, color: "white", marginTop: "4px" }}>
            {playerName}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "30px", fontWeight: 900, color: "white", lineHeight: 1 }}>
            {rank > 0 ? `#${rank}` : "—"}
          </div>
          <div style={{ fontSize: "12px", fontWeight: 700, color: "rgba(255,255,255,0.85)", marginTop: "4px" }}>
            {score} ball
          </div>
        </div>
      </div>

      <h2 style={{ fontSize: "15px", fontWeight: 800, color: "var(--text)", marginBottom: "12px" }}>
        Eng yaxshi 20 talik
      </h2>

      {isLoading ? (
        <p style={{ fontSize: "13px", color: "var(--muted)" }}>Yuklanmoqda...</p>
      ) : users.length === 0 ? (
        <p style={{ fontSize: "13px", color: "var(--muted)" }}>Reyting hozircha bo'sh.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {users.map((user, index) => {
            const isCurrent = user.telegramId === currentUserId && currentUserId !== 0;

            return (
              <div
                key={user.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  background: isCurrent ? "rgba(77,166,255,0.16)" : "var(--card)",
                  border: `1px solid ${isCurrent ? "var(--accent)" : "var(--border)"}`,
                  borderRadius: "14px",
                  padding: "12px 14px"
                }}
              >
                <div
                  style={{
                    width: "32px",
                    textAlign: "center",
                    fontSize: index < 3 ? "20px" : "14px",
                    fontWeight: 800,
                    color: "var(--muted)"
                  }}
                >
                  {index < 3 ? MEDALS[index] : `#${index + 1}`}
                </div>
                <div
                  style={{
                    flex: 1,
                    fontSize: "15px",
                    fontWeight: isCurrent ? 800 : 600,
                    color: "var(--text)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap"
                  }}
                >
                  {displayName(user)}
                  {isCurrent ? " (siz)" : ""}
                </div>
                <div style={{ fontSize: "15px", fontWeight: 800, color: "var(--gold)" }}>{user.score}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
