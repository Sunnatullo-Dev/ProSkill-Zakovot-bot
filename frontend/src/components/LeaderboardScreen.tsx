import { useEffect, useState } from "react";
import { getLeaderboard, getReferrals } from "../api/client";
import { isCleanName } from "../utils/nameQuality";
import type { LeaderboardData, LeaderboardUser, ReferralData } from "../types";

type LeaderboardScreenProps = {
  currentUserId: number;
  playerName: string;
  score: number;
};

type Mode = "score" | "referral";

const MEDALS = ["\u{1F947}", "\u{1F948}", "\u{1F949}"];
const EMPTY_LEADERBOARD: LeaderboardData = { users: [], rank: 0 };
const EMPTY_REFERRALS: ReferralData = { referrers: [], myCount: 0 };

function displayName(user: LeaderboardUser): string {
  // Telegram first_name + last_name → username → placeholder.
  // Lekin ism "iflos" (emoji, faqat nuqta, juda qisqa) bo'lsa username'ga
  // tushamiz — leaderboard'da emoji va belgi-only ismlar ko'rinishi noqulay.
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  if (fullName && isCleanName(fullName)) return fullName;
  if (user.username && user.username.trim()) return `@${user.username.trim()}`;
  if (fullName) return fullName; // toza emas, lekin username ham yo'q — bori shu
  return "Foydalanuvchi";
}

export default function LeaderboardScreen({ currentUserId, playerName, score }: LeaderboardScreenProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardData>(EMPTY_LEADERBOARD);
  const [referrals, setReferrals] = useState<ReferralData>(EMPTY_REFERRALS);
  const [mode, setMode] = useState<Mode>("score");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      const [leaderboardData, referralData] = await Promise.all([getLeaderboard(), getReferrals()]);

      if (active) {
        setLeaderboard(leaderboardData);
        setReferrals(referralData);
        setIsLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  const isScore = mode === "score";
  const rows = isScore
    ? leaderboard.users.map((user) => ({ user, value: `${user.score}` }))
    : referrals.referrers.map((entry) => ({ user: entry.user, value: `${entry.count}` }));

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
          display: "flex",
          gap: "6px",
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "14px",
          padding: "4px",
          marginBottom: "18px"
        }}
      >
        {(["score", "referral"] as Mode[]).map((item) => {
          const active = item === mode;

          return (
            <button
              key={item}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "10px",
                border: "none",
                background: active ? "var(--accent)" : "transparent",
                color: active ? "white" : "var(--muted)",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer"
              }}
              type="button"
              onClick={() => setMode(item)}
            >
              {item === "score" ? "\u{1F3C6} Ball" : "\u{1F465} Takliflar"}
            </button>
          );
        })}
      </div>

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
            {isScore ? "SIZNING O'RNINGIZ" : "SIZNING TAKLIFLARINGIZ"}
          </div>
          <div style={{ fontSize: "16px", fontWeight: 800, color: "white", marginTop: "4px" }}>
            {playerName}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "30px", fontWeight: 900, color: "white", lineHeight: 1 }}>
            {isScore ? (leaderboard.rank > 0 ? `#${leaderboard.rank}` : "—") : referrals.myCount}
          </div>
          <div style={{ fontSize: "12px", fontWeight: 700, color: "rgba(255,255,255,0.85)", marginTop: "4px" }}>
            {isScore ? `${score} ball` : "do'st"}
          </div>
        </div>
      </div>

      <h2 style={{ fontSize: "15px", fontWeight: 800, color: "var(--text)", marginBottom: "12px" }}>
        {isScore ? "Eng yaxshi 20 talik" : "Eng ko'p taklif qilganlar"}
      </h2>

      {isLoading ? (
        <p style={{ fontSize: "13px", color: "var(--muted)" }}>Yuklanmoqda...</p>
      ) : rows.length === 0 ? (
        <p style={{ fontSize: "13px", color: "var(--muted)" }}>
          {isScore ? "Reyting hozircha bo'sh." : "Hali hech kim taklif qilmagan."}
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {rows.map((row, index) => {
            const isCurrent = row.user.telegramId === currentUserId && currentUserId !== 0;

            return (
              <div
                key={row.user.id}
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
                  {displayName(row.user)}
                  {isCurrent ? " (siz)" : ""}
                </div>
                <div style={{ fontSize: "15px", fontWeight: 800, color: "var(--gold)" }}>{row.value}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
