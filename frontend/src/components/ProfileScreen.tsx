import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { getGameStats, getReferrals } from "../api/client";
import type { AppUser, GameStats } from "../types";
import { computeAchievements } from "../utils/achievements";
import { buildInviteShare } from "../utils/share";
import { ShieldIcon, TeamIcon } from "./icons";
import ShareSheet from "./ShareSheet";

const EMPTY_STATS: GameStats = { gamesPlayed: 0, accuracy: 0, bestRoundScore: 0, totalCorrect: 0 };

const LEVELS = [
  { min: 0, title: "Yangi boshlovchi" },
  { min: 50, title: "Bilim sinovchi" },
  { min: 150, title: "Bilimdon" },
  { min: 300, title: "Tajribali" },
  { min: 600, title: "Bilim ustasi" },
  { min: 1000, title: "Daho" }
];

type LevelInfo = {
  level: number;
  title: string;
  currentMin: number;
  nextMin: number | null;
  progress: number;
};

function getLevelInfo(score: number): LevelInfo {
  let index = 0;

  for (let i = 0; i < LEVELS.length; i += 1) {
    if (score >= LEVELS[i].min) {
      index = i;
    }
  }

  const current = LEVELS[index];
  const next = LEVELS[index + 1] ?? null;
  const progress = next
    ? Math.min(1, Math.max(0, (score - current.min) / (next.min - current.min)))
    : 1;

  return {
    level: index + 1,
    title: current.title,
    currentMin: current.min,
    nextMin: next?.min ?? null,
    progress
  };
}

type ProfileScreenProps = {
  user: AppUser | null;
  playerName: string;
  score: number;
  record: number;
  isAdmin: boolean;
};

function StatTile({
  label,
  value,
  color,
  large
}: {
  label: string;
  value: ReactNode;
  color: string;
  large?: boolean;
}) {
  return (
    <div
      style={{
        flex: 1,
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: large ? "18px" : "14px",
        padding: large ? "18px 12px" : "14px 10px",
        textAlign: "center"
      }}
    >
      <div
        style={{
          fontSize: large ? "32px" : "22px",
          fontWeight: 900,
          color,
          lineHeight: 1
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: large ? "11px" : "10px",
          color: "var(--muted)",
          letterSpacing: "1.5px",
          textTransform: "uppercase",
          marginTop: "6px"
        }}
      >
        {label}
      </div>
    </div>
  );
}

export default function ProfileScreen({ user, playerName, score, record, isAdmin }: ProfileScreenProps) {
  const [stats, setStats] = useState<GameStats>(EMPTY_STATS);
  const [referralCount, setReferralCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      setIsLoading(true);
      const [gameStats, referrals] = await Promise.all([getGameStats(), getReferrals()]);

      if (active) {
        setStats(gameStats);
        setReferralCount(referrals.myCount);
        setIsLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  const levelInfo = getLevelInfo(score);
  const achievements = computeAchievements({
    gamesPlayed: stats.gamesPlayed,
    totalScore: score,
    bestRoundScore: stats.bestRoundScore,
    approvedSubmissions: 0
  });
  const userInitial = playerName.trim()[0]?.toUpperCase() ?? "Z";

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
      <div
        style={{
          background: "linear-gradient(135deg, rgba(77,166,255,0.18), rgba(124,58,237,0.16))",
          border: "1px solid var(--accent)",
          borderRadius: "22px",
          padding: "20px",
          marginBottom: "18px",
          boxShadow: "0 8px 28px rgba(77,166,255,0.18)"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "20px",
              background: "linear-gradient(135deg, #4DA6FF, #7C3AED)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "26px",
              fontWeight: 800,
              color: "white",
              flex: "0 0 auto",
              boxShadow: "0 6px 16px rgba(124,58,237,0.4)"
            }}
          >
            {userInitial}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontSize: "19px",
                fontWeight: 900,
                color: "var(--text)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap"
              }}
            >
              {playerName}
            </div>
            <div style={{ fontSize: "12px", color: "var(--accent)", fontWeight: 700, marginTop: "4px" }}>
              {"⭐"} {levelInfo.title} · Lvl {levelInfo.level}
            </div>
          </div>
          {isAdmin ? (
            <div
              style={{
                color: "var(--gold)",
                display: "flex",
                flex: "0 0 auto"
              }}
              title="Admin"
            >
              <ShieldIcon size={22} />
            </div>
          ) : null}
        </div>

        <div style={{ marginTop: "18px" }}>
          <div
            style={{
              height: "8px",
              background: "rgba(0,0,0,0.25)",
              borderRadius: "999px",
              overflow: "hidden"
            }}
          >
            <div
              style={{
                width: `${levelInfo.progress * 100}%`,
                height: "100%",
                background: "linear-gradient(90deg, #4DA6FF, #A78BFA)",
                borderRadius: "999px",
                transition: "width 0.4s ease"
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "6px",
              fontSize: "11px",
              color: "var(--muted)",
              fontWeight: 600
            }}
          >
            <span>{score} ball</span>
            <span>
              {levelInfo.nextMin === null ? "MAX daraja" : `Keyingi: ${levelInfo.nextMin} ball`}
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
        <StatTile label="Joriy ball" value={score} color="var(--gold)" large />
        <StatTile label="Rekord" value={record} color="var(--accent)" large />
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "22px" }}>
        <StatTile
          label="O'ynalgan"
          value={isLoading ? "…" : stats.gamesPlayed}
          color="var(--accent)"
        />
        <StatTile
          label="Aniqlik"
          value={isLoading ? "…" : `${stats.accuracy}%`}
          color="var(--success)"
        />
        <StatTile
          label="Eng yaxshi"
          value={isLoading ? "…" : stats.bestRoundScore}
          color="var(--gold)"
        />
      </div>

      <h2 style={{ fontSize: "14px", fontWeight: 800, color: "var(--text)", marginBottom: "10px" }}>
        Yutuqlar
      </h2>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "22px" }}>
        {achievements.map((achievement) => (
          <div
            key={achievement.id}
            style={{
              width: "calc(33.333% - 7px)",
              background: "var(--card)",
              border: `1px solid ${achievement.unlocked ? "rgba(245,200,66,0.35)" : "var(--border)"}`,
              borderRadius: "14px",
              padding: "12px 6px",
              textAlign: "center",
              opacity: achievement.unlocked ? 1 : 0.45
            }}
          >
            <div
              style={{
                fontSize: "26px",
                lineHeight: 1,
                filter: achievement.unlocked ? "none" : "grayscale(1)"
              }}
            >
              {achievement.unlocked ? achievement.icon : "\u{1F512}"}
            </div>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: achievement.unlocked ? "var(--text)" : "var(--muted)",
                marginTop: "6px"
              }}
            >
              {achievement.label}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          padding: "14px",
          display: "flex",
          alignItems: "center",
          gap: "12px"
        }}
      >
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "12px",
            background: "rgba(77,166,255,0.16)",
            color: "var(--accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flex: "0 0 auto"
          }}
        >
          <TeamIcon size={20} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "14px", fontWeight: 800, color: "var(--text)" }}>
            Do'stlarni taklif qiling
          </div>
          <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>
            {referralCount} ta taklif qildingiz
          </div>
        </div>
        <button
          style={{
            padding: "10px 14px",
            background: "var(--accent)",
            border: "none",
            borderRadius: "10px",
            fontSize: "13px",
            fontWeight: 700,
            color: "white",
            cursor: "pointer",
            flex: "0 0 auto"
          }}
          type="button"
          onClick={() => setShareOpen(true)}
        >
          Ulashish
        </button>
      </div>

      {shareOpen ? (
        <ShareSheet
          content={buildInviteShare(user?.telegramId ?? 0)}
          onClose={() => setShareOpen(false)}
        />
      ) : null}
    </div>
  );
}
