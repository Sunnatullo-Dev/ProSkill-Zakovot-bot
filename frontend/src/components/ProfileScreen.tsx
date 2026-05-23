import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  checkAchievements,
  getGameStats,
  getReferrals,
  updateMyDisplayName
} from "../api/client";
import type { AchievementUnlock } from "../api/client";
import type { AppUser, GameStats } from "../types";
import { computeAchievements } from "../utils/achievements";
import { buildInviteShare } from "../utils/share";
import { hapticResult, hapticTap } from "../utils/haptics";
import { CheckCircleIcon, EditIcon, ShieldIcon, StarIcon, TeamIcon } from "./icons";
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
  onUserUpdate?: (user: AppUser) => void;
  onScoreBonus?: (amount: number) => void;
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

// Hero card ichidagi qalam tugmasi — yengil shisha effekt va aksent hover.
const editButtonStyle: CSSProperties = {
  width: "30px",
  height: "30px",
  padding: 0,
  background:
    "linear-gradient(135deg, rgba(255,255,255,0.18), rgba(255,255,255,0.06))",
  border: "1px solid rgba(255,255,255,0.28)",
  color: "white",
  borderRadius: "10px",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flex: "0 0 auto",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.25), 0 4px 10px rgba(0,0,0,0.18)",
  backdropFilter: "blur(6px)",
  transition: "transform 0.12s ease, box-shadow 0.15s ease"
};

export default function ProfileScreen({
  user,
  playerName,
  score,
  record,
  isAdmin,
  onUserUpdate,
  onScoreBonus
}: ProfileScreenProps) {
  const [stats, setStats] = useState<GameStats>(EMPTY_STATS);
  const [referralCount, setReferralCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(playerName);
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState("");
  const [unlocks, setUnlocks] = useState<AchievementUnlock[]>([]);
  const checkedRef = useRef(false);

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

  // Yutuqlarni tekshirish — bir marta mountda, qaytalanmasin.
  useEffect(() => {
    if (checkedRef.current || !user || user.telegramId <= 0) {
      return;
    }
    checkedRef.current = true;

    void (async () => {
      const result = await checkAchievements();

      if (result && result.newlyUnlocked.length > 0) {
        setUnlocks(result.newlyUnlocked);
        hapticResult("correct");

        if (result.totalBonus > 0) {
          onScoreBonus?.(result.totalBonus);
        }
        if (result.user) {
          onUserUpdate?.(result.user);
        }
      }
    })();
  }, [user, onScoreBonus, onUserUpdate]);

  useEffect(() => {
    setDraftName(playerName);
  }, [playerName]);

  async function saveName() {
    if (!user || user.telegramId <= 0) {
      setEditingName(false);
      return;
    }

    setNameError("");
    const trimmed = draftName.trim();

    // Empty string clears displayName so Telegram name shows again
    if (trimmed.length > 30) {
      setNameError("Ism 30 belgidan oshmasin");
      return;
    }

    setSavingName(true);
    const result = await updateMyDisplayName(trimmed.length > 0 ? trimmed : null);
    setSavingName(false);

    if (!result.ok) {
      setNameError(result.error);
      return;
    }

    onUserUpdate?.(result.data.user);
    hapticTap();
    setEditingName(false);
  }

  function cancelEdit() {
    setEditingName(false);
    setNameError("");
    setDraftName(playerName);
  }

  const levelInfo = getLevelInfo(score);
  const achievements = computeAchievements({
    gamesPlayed: stats.gamesPlayed,
    totalScore: score,
    bestRoundScore: stats.bestRoundScore
  });
  const userInitial = playerName.trim()[0]?.toUpperCase() ?? "Z";
  const canEdit = Boolean(user && user.telegramId > 0);

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
          background: "linear-gradient(135deg, rgba(77,166,255,0.20), rgba(124,58,237,0.18))",
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
            {editingName ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <input
                  autoFocus
                  maxLength={30}
                  placeholder="Bo'sh qoldirsa Telegram ismi ko'rinadi"
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    background: "rgba(0,0,0,0.25)",
                    border: "1px solid rgba(255,255,255,0.25)",
                    borderRadius: "10px",
                    fontSize: "16px",
                    fontWeight: 800,
                    color: "white",
                    outline: "none",
                    fontFamily: "inherit"
                  }}
                  type="text"
                  value={draftName}
                  onChange={(event) => {
                    setDraftName(event.target.value);
                    setNameError("");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      void saveName();
                    }
                    if (event.key === "Escape") {
                      cancelEdit();
                    }
                  }}
                />
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    disabled={savingName}
                    style={{
                      flex: 1,
                      padding: "7px",
                      background: "var(--success)",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "white",
                      cursor: "pointer",
                      opacity: savingName ? 0.6 : 1
                    }}
                    type="button"
                    onClick={() => void saveName()}
                  >
                    {savingName ? "..." : "Saqlash"}
                  </button>
                  <button
                    disabled={savingName}
                    style={{
                      flex: 1,
                      padding: "7px",
                      background: "rgba(255,255,255,0.1)",
                      border: "1px solid rgba(255,255,255,0.2)",
                      borderRadius: "8px",
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "white",
                      cursor: "pointer"
                    }}
                    type="button"
                    onClick={cancelEdit}
                  >
                    Bekor
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}
                >
                  <span
                    style={{
                      fontSize: "19px",
                      fontWeight: 900,
                      color: "var(--text)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      minWidth: 0,
                      flex: 1
                    }}
                  >
                    {playerName}
                  </span>
                  {canEdit ? (
                    <button
                      aria-label="Ismni o'zgartirish"
                      style={editButtonStyle}
                      title="Ismni o'zgartirish"
                      type="button"
                      onClick={() => {
                        setDraftName(playerName);
                        setEditingName(true);
                        setNameError("");
                      }}
                    >
                      <EditIcon size={15} />
                    </button>
                  ) : null}
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "var(--accent)",
                    fontWeight: 700,
                    marginTop: "4px",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px"
                  }}
                >
                  <span style={{ color: "var(--gold)", display: "inline-flex" }}>
                    <StarIcon size={12} />
                  </span>
                  {levelInfo.title} · Lvl {levelInfo.level}
                </div>
              </>
            )}
            {nameError ? (
              <div style={{ fontSize: "11px", color: "#FCA5A5", marginTop: "6px" }}>
                {nameError}
              </div>
            ) : null}
          </div>
          {isAdmin ? (
            <div
              style={{
                color: "var(--gold)",
                display: "flex",
                flex: "0 0 auto",
                alignSelf: "flex-start",
                marginTop: "2px"
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
            title={`${achievement.description} · +${achievement.bonus} ball`}
            style={{
              width: "calc(33.333% - 7px)",
              background: "var(--card)",
              border: `1px solid ${achievement.unlocked ? "rgba(245,200,66,0.35)" : "var(--border)"}`,
              borderRadius: "14px",
              padding: "12px 6px",
              textAlign: "center",
              opacity: achievement.unlocked ? 1 : 0.45,
              position: "relative"
            }}
          >
            {achievement.unlocked ? (
              <div
                style={{
                  position: "absolute",
                  top: "6px",
                  right: "8px",
                  fontSize: "9px",
                  fontWeight: 800,
                  color: "var(--gold)",
                  letterSpacing: "0.5px"
                }}
              >
                +{achievement.bonus}
              </div>
            ) : null}
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

      {unlocks.length > 0 ? (
        <AchievementToast unlocks={unlocks} onClose={() => setUnlocks([])} />
      ) : null}
    </div>
  );
}

function AchievementToast({
  unlocks,
  onClose
}: {
  unlocks: AchievementUnlock[];
  onClose: () => void;
}) {
  const totalBonus = unlocks.reduce((sum, item) => sum + item.bonus, 0);

  useEffect(() => {
    const id = window.setTimeout(onClose, 6500);
    return () => window.clearTimeout(id);
  }, [onClose]);

  return (
    <div
      role="status"
      style={{
        position: "fixed",
        top: "16px",
        left: "50%",
        transform: "translateX(-50%)",
        width: "calc(100% - 32px)",
        maxWidth: "400px",
        background: "linear-gradient(135deg, rgba(245,200,66,0.92), rgba(247,167,57,0.95))",
        border: "1px solid rgba(255,255,255,0.35)",
        borderRadius: "16px",
        padding: "14px 16px",
        boxShadow: "0 14px 36px rgba(245,200,66,0.4)",
        zIndex: 1100,
        animation: "fadeInUp 0.35s ease both"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "10px",
            background: "rgba(255,255,255,0.25)",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flex: "0 0 auto"
          }}
        >
          <CheckCircleIcon size={18} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "14px", fontWeight: 900, color: "#1a1410" }}>
            Yutuq ochildi!
          </div>
          <div style={{ fontSize: "11px", color: "#5a3a0a", marginTop: "1px", fontWeight: 600 }}>
            Hisobingizga +{totalBonus} ball qo'shildi
          </div>
        </div>
        <button
          aria-label="Yopish"
          style={{
            background: "transparent",
            border: "none",
            color: "#1a1410",
            cursor: "pointer",
            fontSize: "18px",
            fontWeight: 800,
            padding: "2px 6px",
            lineHeight: 1
          }}
          type="button"
          onClick={onClose}
        >
          ×
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        {unlocks.map((unlock) => (
          <div
            key={unlock.id}
            style={{
              fontSize: "13px",
              fontWeight: 700,
              color: "#1a1410",
              display: "flex",
              justifyContent: "space-between"
            }}
          >
            <span>{unlock.label}</span>
            <span style={{ color: "#7a4f00" }}>+{unlock.bonus}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
