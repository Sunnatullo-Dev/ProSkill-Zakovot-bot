import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CSSProperties, ReactNode } from "react";
import {
  checkAchievements,
  getGameHistory,
  getGameStats,
  getPremiumHistory,
  getReferrals,
  submitAuthorQuestion,
  updateMyDisplayName,
  updateMyLanguage
} from "../api/client";
import type { AchievementUnlock, PremiumHistoryItem } from "../api/client";
import type { AppUser, GameHistoryItem, GameStats } from "../types";
import { computeAchievements } from "../utils/achievements";
import { buildInviteShare } from "../utils/share";
import { hapticResult, hapticSelect, hapticTap } from "../utils/haptics";
import { useLanguage } from "../i18n/LanguageContext";
import { LANG_FLAGS, LANG_LABELS, LANG_SUBLABEL, SUPPORTED_LANGS } from "../i18n/strings";
import type { Lang } from "../i18n/strings";
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
  isPremium?: boolean;
  premiumUntil?: string | null;
  onUserUpdate?: (user: AppUser) => void;
  onScoreBonus?: (amount: number) => void;
  onPremiumOpen?: () => void;
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
  isPremium,
  premiumUntil,
  onUserUpdate,
  onScoreBonus,
  onPremiumOpen,
}: ProfileScreenProps) {
  const { lang, setLang, t } = useLanguage();
  const [stats, setStats] = useState<GameStats>(EMPTY_STATS);
  const [history, setHistory] = useState<GameHistoryItem[]>([]);
  const [premiumHistory, setPremiumHistory] = useState<PremiumHistoryItem[]>([]);
  const [referralCount, setReferralCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(playerName);
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState("");
  const [unlocks, setUnlocks] = useState<AchievementUnlock[]>([]);
  const checkedRef = useRef(false);

  // Muallif savoli yuborish form
  const [authorFormOpen, setAuthorFormOpen] = useState(false);
  const [authorQuestion, setAuthorQuestion] = useState("");
  const [authorAnswer, setAuthorAnswer] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [authorSubmitting, setAuthorSubmitting] = useState(false);
  const [authorError, setAuthorError] = useState("");
  const [authorSuccess, setAuthorSuccess] = useState(false);

  function handleLangChange(next: Lang) {
    if (next === lang) return;
    hapticSelect();
    setLang(next);
    // Fire-and-forget — mehmon bo'lsa backend baribir 200 OK qaytaradi.
    void updateMyLanguage(next).catch(() => {
      /* offline yoki auth singan — localStorage ishlaydi */
    });
  }

  useEffect(() => {
    let active = true;

    async function load() {
      setIsLoading(true);
      const [gameStats, referrals, hist, pHist] = await Promise.all([
        getGameStats(),
        getReferrals(),
        getGameHistory(10),
        getPremiumHistory(),
      ]);

      if (active) {
        setStats(gameStats);
        setHistory(hist);
        setPremiumHistory(pHist);
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
    if (!user) {
      setEditingName(false);
      return;
    }

    setNameError("");
    const trimmed = draftName.trim();

    if (trimmed.length > 30) {
      setNameError("Ism 30 belgidan oshmasin");
      return;
    }

    // Mehmon (telegram_id=0) — DB'ga yozmaymiz, faqat localStorage va lokal state.
    if (user.telegramId <= 0) {
      try {
        if (trimmed.length > 0) {
          window.localStorage.setItem("zakovat:playerName", trimmed);
        } else {
          window.localStorage.removeItem("zakovat:playerName");
        }
      } catch {
        // localStorage o'chirilgan
      }
      onUserUpdate?.({ ...user, displayName: trimmed.length > 0 ? trimmed : null });
      hapticTap();
      setEditingName(false);
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

  function openAuthorForm() {
    hapticTap();
    setAuthorFormOpen(true);
    setAuthorQuestion("");
    setAuthorAnswer("");
    setAuthorName("");
    setAuthorError("");
    setAuthorSuccess(false);
  }

  function closeAuthorForm() {
    setAuthorFormOpen(false);
    setAuthorError("");
    setAuthorSuccess(false);
  }

  async function handleAuthorSubmit() {
    setAuthorError("");
    const qTrimmed = authorQuestion.trim();
    const aTrimmed = authorAnswer.trim();
    const nTrimmed = authorName.trim();

    if (!qTrimmed) {
      setAuthorError("Savol matnini kiriting");
      return;
    }
    if (!aTrimmed) {
      setAuthorError("To'g'ri javobni kiriting");
      return;
    }
    if (!nTrimmed) {
      setAuthorError("Muallif ismingizni kiriting");
      return;
    }

    setAuthorSubmitting(true);
    const result = await submitAuthorQuestion({
      questionText: qTrimmed,
      answer: aTrimmed,
      authorName: nTrimmed,
    });
    setAuthorSubmitting(false);

    if (!result.ok) {
      setAuthorError(result.error);
      return;
    }

    hapticResult("correct");
    setAuthorSuccess(true);
    setAuthorQuestion("");
    setAuthorAnswer("");
    setAuthorName("");
  }

  const levelInfo = getLevelInfo(score);
  const achievements = computeAchievements({
    gamesPlayed: stats.gamesPlayed,
    totalScore: score,
    bestRoundScore: stats.bestRoundScore
  });
  const userInitial = playerName.trim()[0]?.toUpperCase() ?? "Z";
  // Mehmonlar uchun ham ism tahrirlash mumkin — localStorage'ga saqlanadi.
  const canEdit = Boolean(user);

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
                  {isPremium ? (
                    <span
                      title="Premium a'zo"
                      style={{
                        fontSize: "16px",
                        flex: "0 0 auto",
                        lineHeight: 1,
                        filter: "drop-shadow(0 0 4px rgba(218,165,32,0.7))",
                      }}
                    >
                      ⭐
                    </span>
                  ) : null}
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

      {isPremium ? (
        <div
          style={{
            width: "100%",
            background: "linear-gradient(135deg, rgba(184,134,11,0.18), rgba(218,165,32,0.1))",
            border: "1.5px solid rgba(218,165,32,0.45)",
            borderRadius: "14px",
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "12px",
          }}
        >
          <span style={{ fontSize: "20px" }}>⭐</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "14px", fontWeight: 800, color: "#DAA520" }}>
              Premium a'zo
            </div>
            <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "1px" }}>
              {premiumUntil
                ? `${new Date(premiumUntil).toLocaleDateString("uz-UZ", { day: "numeric", month: "long", year: "numeric" })} gacha`
                : "Faol"}
            </div>
          </div>
        </div>
      ) : onPremiumOpen ? (
        <button
          type="button"
          onClick={onPremiumOpen}
          style={{
            width: "100%",
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "14px",
            padding: "12px 16px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            textAlign: "left",
            marginBottom: "12px",
          }}
        >
          <span style={{ fontSize: "20px" }}>⭐</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "14px", fontWeight: 800, color: "var(--text)" }}>
              Zakovat Premium
            </div>
            <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "1px" }}>
              Cheksiz o'yin tajribasini oching
            </div>
          </div>
          <span style={{ fontSize: "14px", color: "var(--gold)" }}>›</span>
        </button>
      ) : null}

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

      {/* Til tanlash — doim ko'rinadigan 3 ta tugma. Tap qilish bilan
          darrov til o'zgaradi (collapse/expand yo'q — yashirin emas). */}
      <div style={{ marginBottom: "22px" }}>
        <div
          style={{
            fontSize: "11px",
            fontWeight: 800,
            color: "var(--muted)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: "8px"
          }}
        >
          {t("profile_language")}
        </div>
        <div
          role="radiogroup"
          aria-label={t("profile_language")}
          style={{
            display: "flex",
            gap: "8px",
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "14px",
            padding: "6px"
          }}
        >
          {SUPPORTED_LANGS.map((code) => {
            const active = lang === code;
            return (
              <button
                key={code}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => handleLangChange(code)}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "2px",
                  padding: "10px 6px",
                  borderRadius: "10px",
                  border: "none",
                  background: active
                    ? "linear-gradient(135deg, #4DA6FF 0%, #7C5BFF 100%)"
                    : "transparent",
                  color: active ? "#0B1126" : "var(--text)",
                  fontSize: "12px",
                  fontWeight: 800,
                  cursor: "pointer",
                  boxShadow: active ? "0 4px 12px -4px rgba(77,166,255,0.55)" : "none",
                  transition: "background 0.15s, color 0.15s, transform 0.1s"
                }}
              >
                <span style={{ fontSize: "18px", lineHeight: 1 }}>{LANG_FLAGS[code]}</span>
                <span>
                  {LANG_LABELS[code]}
                  {LANG_SUBLABEL[code] ? (
                    <span style={{ opacity: 0.7, marginLeft: "2px", fontWeight: 600 }}>
                      {LANG_SUBLABEL[code]}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
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


      {premiumHistory.length > 0 ? (
        <div
          style={{
            background: "var(--card)",
            border: "1px solid rgba(218,165,32,0.3)",
            borderRadius: "20px",
            padding: "16px",
            marginTop: "18px",
          }}
        >
          <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--muted)", letterSpacing: "1px", marginBottom: "12px" }}>
            PREMIUMLAR TARIXI
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {premiumHistory.map((item) => {
              const d = new Date(item.createdAt);
              const dateLabel = d.toLocaleDateString("uz-UZ", { day: "numeric", month: "short", year: "numeric" });
              return (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 12px",
                    background: "var(--bg)",
                    borderRadius: "12px",
                    border: "1px solid rgba(218,165,32,0.15)",
                  }}
                >
                  <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                    📅 {dateLabel} · ⏳ {item.durationDays} kun
                  </div>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#DAA520" }}>
                    💰 {item.amount.toLocaleString()} {item.currency}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <button
        type="button"
        style={{
          width: "100%",
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          padding: "14px 16px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          textAlign: "left",
          marginTop: "12px",
        }}
        onClick={() => {
          hapticTap();
          setHistoryOpen(true);
        }}
      >
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "12px",
            background: "rgba(77,166,255,0.14)",
            color: "var(--accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flex: "0 0 auto",
            fontSize: "20px",
          }}
        >
          🎮
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "14px", fontWeight: 800, color: "var(--text)" }}>
            O'yinlar tarixi
          </div>
          <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>
            {isLoading
              ? "Yuklanmoqda..."
              : history.length > 0
              ? `${history.length} ta o'yin`
              : "Hali o'yin o'ynalmagan"}
          </div>
        </div>
        <span style={{ fontSize: "16px", color: "var(--muted)" }}>›</span>
      </button>

      {/* Savol qo'sh tugmasi */}
      <button
        type="button"
        style={{
          width: "100%",
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          padding: "14px 16px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          textAlign: "left",
          marginTop: "12px",
        }}
        onClick={openAuthorForm}
      >
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "12px",
            background: "rgba(167,139,250,0.14)",
            color: "#A78BFA",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flex: "0 0 auto",
            fontSize: "20px",
          }}
        >
          ✍️
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "14px", fontWeight: 800, color: "var(--text)" }}>
            Savol qo'sh
          </div>
          <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>
            Mualliflik savolingizni yuboring
          </div>
        </div>
        <span style={{ fontSize: "16px", color: "var(--muted)" }}>›</span>
      </button>

      {authorFormOpen
        ? createPortal(
            <AuthorQuestionForm
              onClose={closeAuthorForm}
              question={authorQuestion}
              answer={authorAnswer}
              authorName={authorName}
              submitting={authorSubmitting}
              error={authorError}
              success={authorSuccess}
              onChangeQuestion={setAuthorQuestion}
              onChangeAnswer={setAuthorAnswer}
              onChangeAuthorName={setAuthorName}
              onSubmit={() => void handleAuthorSubmit()}
            />,
            document.body
          )
        : null}

      {historyOpen
        ? createPortal(
            <GameHistoryOverlay
              history={history}
              onClose={() => setHistoryOpen(false)}
            />,
            document.body
          )
        : null}

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

function AuthorQuestionForm({
  onClose,
  question,
  answer,
  authorName,
  submitting,
  error,
  success,
  onChangeQuestion,
  onChangeAnswer,
  onChangeAuthorName,
  onSubmit,
}: {
  onClose: () => void;
  question: string;
  answer: string;
  authorName: string;
  submitting: boolean;
  error: string;
  success: boolean;
  onChangeQuestion: (v: string) => void;
  onChangeAnswer: (v: string) => void;
  onChangeAuthorName: (v: string) => void;
  onSubmit: () => void;
}) {
  const inputStyle: CSSProperties = {
    width: "100%",
    padding: "12px 14px",
    background: "var(--card)",
    border: "1.5px solid var(--border)",
    borderRadius: "12px",
    fontSize: "14px",
    color: "var(--text)",
    outline: "none",
    fontFamily: "inherit",
    resize: "vertical" as const,
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--bg)",
        zIndex: 1200,
        display: "flex",
        flexDirection: "column",
        maxWidth: "430px",
        margin: "0 auto",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "16px 20px",
          borderBottom: "1px solid var(--border)",
          flex: "0 0 auto",
          paddingTop: "calc(16px + env(safe-area-inset-top))",
        }}
      >
        <button
          type="button"
          aria-label="Orqaga"
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "10px",
            background: "var(--card)",
            border: "1px solid var(--border)",
            color: "var(--text)",
            fontSize: "18px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flex: "0 0 auto",
          }}
          onClick={onClose}
        >
          ‹
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "17px", fontWeight: 900, color: "var(--text)" }}>
            Savol qo'sh
          </div>
          <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "1px" }}>
            Mualliflik savoli — admin ko'rib chiqadi
          </div>
        </div>
        <span style={{ fontSize: "22px", flex: "0 0 auto" }}>✍️</span>
      </div>

      {/* Scrollable content */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px",
          paddingBottom: "calc(24px + env(safe-area-inset-bottom))",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        {success ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "16px",
              paddingTop: "40px",
              textAlign: "center",
            }}
          >
            <span style={{ fontSize: "52px" }}>✅</span>
            <div style={{ fontSize: "18px", fontWeight: 900, color: "var(--text)" }}>
              Savolingiz yuborildi!
            </div>
            <div style={{ fontSize: "13px", color: "var(--muted)", lineHeight: 1.6 }}>
              Admin ko'rib chiqadi. Tasdiqlansa, savolingiz{" "}
              <strong>"Mualliflik savollari"</strong> pooliga qo'shiladi.
            </div>
            <button
              type="button"
              style={{
                marginTop: "8px",
                padding: "12px 28px",
                background: "var(--accent)",
                border: "none",
                borderRadius: "12px",
                fontSize: "14px",
                fontWeight: 800,
                color: "white",
                cursor: "pointer",
              }}
              onClick={onClose}
            >
              Yopish
            </button>
          </div>
        ) : (
          <>
            <div>
              <div
                style={{
                  fontSize: "10.5px",
                  fontWeight: 700,
                  color: "var(--muted)",
                  letterSpacing: "1.5px",
                  textTransform: "uppercase",
                  marginBottom: "6px",
                }}
              >
                Savol
              </div>
              <textarea
                rows={4}
                maxLength={2000}
                placeholder="Savol matnini yozing..."
                value={question}
                style={inputStyle}
                onChange={(e) => onChangeQuestion(e.target.value)}
              />
            </div>

            <div>
              <div
                style={{
                  fontSize: "10.5px",
                  fontWeight: 700,
                  color: "var(--muted)",
                  letterSpacing: "1.5px",
                  textTransform: "uppercase",
                  marginBottom: "6px",
                }}
              >
                To'g'ri javob
              </div>
              <input
                type="text"
                maxLength={500}
                placeholder="To'g'ri javobni yozing..."
                value={answer}
                style={{ ...inputStyle, resize: undefined }}
                onChange={(e) => onChangeAnswer(e.target.value)}
              />
            </div>

            <div>
              <div
                style={{
                  fontSize: "10.5px",
                  fontWeight: 700,
                  color: "var(--muted)",
                  letterSpacing: "1.5px",
                  textTransform: "uppercase",
                  marginBottom: "6px",
                }}
              >
                Muallif ismingiz (F.I.O)
              </div>
              <input
                type="text"
                maxLength={100}
                placeholder="Ism Familiya Otasining ismi"
                value={authorName}
                style={{ ...inputStyle, resize: undefined }}
                onChange={(e) => onChangeAuthorName(e.target.value)}
              />
            </div>

            {error ? (
              <div
                style={{
                  padding: "10px 14px",
                  background: "rgba(239,68,68,0.12)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  borderRadius: "10px",
                  fontSize: "13px",
                  color: "#EF4444",
                  fontWeight: 600,
                }}
              >
                {error}
              </div>
            ) : null}

            <div
              style={{
                padding: "12px 14px",
                background: "rgba(77,166,255,0.08)",
                border: "1px solid rgba(77,166,255,0.2)",
                borderRadius: "10px",
                fontSize: "12px",
                color: "var(--muted)",
                lineHeight: 1.6,
              }}
            >
              Yuborilgan savol admin tomonidan ko'rib chiqiladi. Tasdiqlangandan
              keyin u <strong style={{ color: "var(--text)" }}>asosiy savollar
              bazasiga emas</strong>, alohida{" "}
              <strong style={{ color: "var(--text)" }}>"Mualliflik savollari"</strong>{" "}
              pooliga qo'shiladi.
            </div>

            <button
              type="button"
              disabled={submitting}
              style={{
                width: "100%",
                padding: "14px 16px",
                background: submitting
                  ? "var(--border)"
                  : "linear-gradient(135deg, #A78BFA, #7C3AED)",
                border: "none",
                borderRadius: "12px",
                fontSize: "14px",
                fontWeight: 800,
                color: "white",
                cursor: submitting ? "not-allowed" : "pointer",
                opacity: submitting ? 0.6 : 1,
                boxShadow: submitting ? "none" : "0 6px 18px rgba(124,58,237,0.3)",
              }}
              onClick={onSubmit}
            >
              {submitting ? "Yuborilmoqda..." : "Yuborish"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function GameHistoryOverlay({
  history,
  onClose,
}: {
  history: GameHistoryItem[];
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--bg)",
        zIndex: 1200,
        display: "flex",
        flexDirection: "column",
        maxWidth: "430px",
        margin: "0 auto",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "16px 20px",
          borderBottom: "1px solid var(--border)",
          flex: "0 0 auto",
          paddingTop: "calc(16px + env(safe-area-inset-top))",
        }}
      >
        <button
          type="button"
          aria-label="Orqaga"
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "10px",
            background: "var(--card)",
            border: "1px solid var(--border)",
            color: "var(--text)",
            fontSize: "18px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flex: "0 0 auto",
          }}
          onClick={onClose}
        >
          ‹
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "17px", fontWeight: 900, color: "var(--text)" }}>
            O'yinlar tarixi
          </div>
          {history.length > 0 ? (
            <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "1px" }}>
              {history.length} ta o'yin
            </div>
          ) : null}
        </div>
        <span style={{ fontSize: "22px", flex: "0 0 auto" }}>🎮</span>
      </div>

      {/* Scrollable list */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 20px",
          paddingBottom: "calc(24px + env(safe-area-inset-bottom))",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        {history.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
              paddingTop: "60px",
            }}
          >
            <span style={{ fontSize: "48px", opacity: 0.35 }}>🎮</span>
            <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--muted)", textAlign: "center" }}>
              Hali o'yin o'ynalmagan
            </div>
          </div>
        ) : (
          [...history].reverse().map((item) => {
            const d = new Date(item.createdAt);
            const date = d.toLocaleDateString("uz-UZ", {
              day: "numeric",
              month: "long",
              year: "numeric",
            });
            const time = d.toLocaleTimeString("uz-UZ", {
              hour: "2-digit",
              minute: "2-digit",
            });
            return (
              <div
                key={item.id}
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "14px",
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                }}
              >
                {/* Left: date + result */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "var(--muted)",
                      fontWeight: 600,
                      marginBottom: "5px",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <span>{date}</span>
                    <span style={{ opacity: 0.5 }}>·</span>
                    <span>{time}</span>
                  </div>
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: 800,
                      color: "var(--text)",
                    }}
                  >
                    {item.correctCount}/{item.totalCount} to'g'ri
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color:
                        item.accuracy >= 80
                          ? "var(--success)"
                          : item.accuracy >= 50
                          ? "var(--accent)"
                          : "var(--muted)",
                      fontWeight: 700,
                      marginTop: "2px",
                    }}
                  >
                    {item.accuracy}% aniqlik
                  </div>
                </div>

                {/* Right: score badge */}
                <div
                  style={{
                    flex: "0 0 auto",
                    textAlign: "center",
                    background: "rgba(218,165,32,0.12)",
                    border: "1px solid rgba(218,165,32,0.28)",
                    borderRadius: "12px",
                    padding: "8px 14px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "22px",
                      fontWeight: 900,
                      color: "var(--gold)",
                      lineHeight: 1,
                    }}
                  >
                    +{item.roundScore}
                  </div>
                  <div
                    style={{
                      fontSize: "9px",
                      color: "var(--gold)",
                      fontWeight: 800,
                      letterSpacing: "1.5px",
                      opacity: 0.7,
                      marginTop: "3px",
                    }}
                  >
                    BALL
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
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

  // onClose har renderda yangi closure — `useRef` orqali stable saqlaymiz,
  // dep [] bilan timeout faqat mount paytida o'rnatilsin.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    const id = window.setTimeout(() => onCloseRef.current(), 6500);
    return () => window.clearTimeout(id);
  }, []);

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
