/**
 * LeaderboardScreen — Reyting bo'limi.
 *
 * Xususiyatlar:
 *  - Ball / Takliflar tab switcher
 *  - 10 / 20 / 50 / 100 ta ko'rsatish (standart 10)
 *  - Limit o'zgarsa server'dan qayta yuklanadi
 *  - Top-3 alohida medal dizayn
 *  - "Sizning o'rningiz" gradient karta
 *  - Skeleton loading holati
 */
import { useCallback, useEffect, useState } from "react";
import { getLeaderboard, getReferrals } from "../api/client";
import { isCleanName } from "../utils/nameQuality";
import type { LeaderboardData, LeaderboardUser, ReferralData } from "../types";

type LeaderboardScreenProps = {
  currentUserId: number;
  playerName: string;
  score: number;
};

type Mode = "score" | "referral";
type Limit = 10 | 20 | 50 | 100;

const MEDALS = ["🥇", "🥈", "🥉"];
const LIMITS: Limit[] = [10, 20, 50, 100];

const EMPTY_LB: LeaderboardData = { users: [], rank: 0 };
const EMPTY_REF: ReferralData = { referrers: [], myCount: 0 };

function displayName(user: LeaderboardUser): string {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  if (fullName && isCleanName(fullName)) return fullName;
  if (user.username?.trim()) return `@${user.username.trim()}`;
  if (fullName) return fullName;
  return "Foydalanuvchi";
}

function getInitials(user: LeaderboardUser): string {
  const name = displayName(user);
  return name.replace(/^@/, "").slice(0, 2).toUpperCase();
}

// Rang palitasi — indeks bo'yicha takrorlanuvchi rang
const AVATAR_COLORS = [
  "#4DA6FF", "#7B61FF", "#F5C842", "#22c55e",
  "#F59E0B", "#ef4444", "#8b5cf6", "#06b6d4",
];

function avatarColor(idx: number): string {
  return AVATAR_COLORS[idx % AVATAR_COLORS.length];
}

export default function LeaderboardScreen({ currentUserId, playerName, score }: LeaderboardScreenProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardData>(EMPTY_LB);
  const [referrals, setReferrals] = useState<ReferralData>(EMPTY_REF);
  const [mode, setMode] = useState<Mode>("score");
  const [limit, setLimit] = useState<Limit>(10);
  const [loading, setLoading] = useState(true);
  const [limitLoading, setLimitLoading] = useState(false);

  const load = useCallback(async (lim: Limit, initial = false) => {
    if (initial) setLoading(true);
    else setLimitLoading(true);

    const [lb, ref] = await Promise.all([
      getLeaderboard(lim),
      referrals.referrers.length === 0 ? getReferrals() : Promise.resolve(referrals),
    ]);

    setLeaderboard(lb);
    if (referrals.referrers.length === 0) setReferrals(ref);
    if (initial) setLoading(false);
    else setLimitLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { void load(10, true); }, [load]);

  async function handleLimitChange(newLimit: Limit) {
    if (newLimit === limit || limitLoading) return;
    setLimit(newLimit);
    await load(newLimit);
  }

  const isScore = mode === "score";
  const rows = isScore
    ? leaderboard.users.map((u, i) => ({ user: u, value: u.score, index: i }))
    : referrals.referrers.map((e, i) => ({ user: e.user, value: e.count, index: i }));

  const myRank = isScore ? (leaderboard.rank > 0 ? `#${leaderboard.rank}` : "—") : null;
  const myValue = isScore ? `${score} ball` : `${referrals.myCount} do'st`;

  return (
    <div style={{
      minHeight: "100dvh",
      background: "var(--bg)",
      padding: "20px 16px 104px",
      maxWidth: "430px",
      margin: "0 auto",
    }}>

      {/* ── Sarlavha ─────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
        <div style={{ fontSize: "26px" }}>🏆</div>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 900, color: "var(--text)", margin: 0, lineHeight: 1.1 }}>
            Reyting
          </h1>
          <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>
            {loading ? "Yuklanmoqda..." : `${rows.length} ta o'rincha`}
          </div>
        </div>
      </div>

      {/* ── Tab switcher ─────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", gap: "6px",
        background: "var(--card)", border: "1px solid var(--border)",
        borderRadius: "14px", padding: "4px", marginBottom: "14px",
      }}>
        {(["score", "referral"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            style={{
              flex: 1, padding: "10px", borderRadius: "10px", border: "none",
              background: m === mode ? "var(--accent)" : "transparent",
              color: m === mode ? "white" : "var(--muted)",
              fontSize: "13px", fontWeight: 700, cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {m === "score" ? "🏆 Ball" : "👥 Takliflar"}
          </button>
        ))}
      </div>

      {/* ── Mening o'rnim ─────────────────────────────────────────────────── */}
      <div style={{
        background: "linear-gradient(135deg, #4DA6FF 0%, #7C3AED 100%)",
        borderRadius: "20px", padding: "16px 18px", marginBottom: "16px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        boxShadow: "0 4px 24px rgba(77,166,255,0.25)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "42px", height: "42px", borderRadius: "50%",
            background: "rgba(255,255,255,0.2)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "16px", fontWeight: 900, color: "white", flexShrink: 0,
          }}>
            {playerName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.7)", letterSpacing: "1.5px" }}>
              {isScore ? "SIZNING O'RNINGIZ" : "SIZNING TAKLIFLARINGIZ"}
            </div>
            <div style={{ fontSize: "15px", fontWeight: 800, color: "white", marginTop: "2px" }}>
              {playerName}
            </div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          {isScore && (
            <div style={{ fontSize: "28px", fontWeight: 900, color: "white", lineHeight: 1 }}>
              {myRank}
            </div>
          )}
          <div style={{ fontSize: "13px", fontWeight: 700, color: "rgba(255,255,255,0.85)", marginTop: "2px" }}>
            {myValue}
          </div>
        </div>
      </div>

      {/* ── Ko'rsatish soni ───────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
        <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--muted)", flexShrink: 0 }}>
          Ko'rsatish:
        </span>
        <div style={{ display: "flex", gap: "6px" }}>
          {LIMITS.map((l) => {
            const active = l === limit;
            return (
              <button
                key={l}
                type="button"
                disabled={limitLoading}
                onClick={() => void handleLimitChange(l)}
                style={{
                  padding: "5px 13px",
                  borderRadius: "20px",
                  border: `1.5px solid ${active ? "var(--accent)" : "var(--border)"}`,
                  background: active ? "rgba(77,166,255,0.15)" : "var(--card)",
                  color: active ? "var(--accent)" : "var(--muted)",
                  fontSize: "13px",
                  fontWeight: active ? 800 : 600,
                  cursor: limitLoading ? "not-allowed" : "pointer",
                  opacity: limitLoading && !active ? 0.5 : 1,
                  transition: "all 0.15s",
                }}
              >
                {l}
              </button>
            );
          })}
        </div>
        {limitLoading && (
          <div style={{ fontSize: "11px", color: "var(--muted)", marginLeft: "4px" }}>
            ⟳
          </div>
        )}
      </div>

      {/* ── Ro'yxat ───────────────────────────────────────────────────────── */}
      {loading ? (
        /* Skeleton loading */
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{
              height: "62px", borderRadius: "14px",
              background: "var(--card)", border: "1px solid var(--border)",
              opacity: 1 - i * 0.15,
              animation: "pulse 1.5s ease-in-out infinite",
            }} />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)" }}>
          <div style={{ fontSize: "36px", marginBottom: "10px" }}>📭</div>
          <div style={{ fontSize: "14px" }}>
            {isScore ? "Reyting hozircha bo'sh" : "Hali hech kim taklif qilmagan"}
          </div>
        </div>
      ) : (
        <>
          {/* Top-3 podium */}
          {rows.length >= 3 && (
            <div style={{
              display: "flex", gap: "8px", marginBottom: "12px",
              alignItems: "flex-end",
            }}>
              {/* 2-o'rin (chap) */}
              {rows[1] && (
                <PodiumCard
                  row={rows[1]}
                  colorIdx={1}
                  currentUserId={currentUserId}
                  height="80px"
                  small
                />
              )}
              {/* 1-o'rin (markazda, balandroq) */}
              {rows[0] && (
                <PodiumCard
                  row={rows[0]}
                  colorIdx={0}
                  currentUserId={currentUserId}
                  height="96px"
                />
              )}
              {/* 3-o'rin (o'ng) */}
              {rows[2] && (
                <PodiumCard
                  row={rows[2]}
                  colorIdx={2}
                  currentUserId={currentUserId}
                  height="72px"
                  small
                />
              )}
            </div>
          )}

          {/* 4+ qatorlar */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {rows.slice(3).map((row) => {
              const isCurrent = row.user.telegramId === currentUserId && currentUserId !== 0;
              return (
                <div
                  key={row.user.id}
                  style={{
                    display: "flex", alignItems: "center", gap: "12px",
                    padding: "12px 14px", borderRadius: "14px",
                    background: isCurrent ? "rgba(77,166,255,0.12)" : "var(--card)",
                    border: `1px solid ${isCurrent ? "rgba(77,166,255,0.4)" : "var(--border)"}`,
                    transition: "all 0.15s",
                  }}
                >
                  {/* O'rin raqami */}
                  <div style={{
                    width: "30px", textAlign: "center",
                    fontSize: "13px", fontWeight: 800, color: "var(--muted)", flexShrink: 0,
                  }}>
                    #{row.index + 1}
                  </div>

                  {/* Avatar */}
                  <div style={{
                    width: "36px", height: "36px", borderRadius: "50%",
                    background: avatarColor(row.index),
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "13px", fontWeight: 900, color: "#0B0B14",
                    flexShrink: 0,
                  }}>
                    {getInitials(row.user)}
                  </div>

                  {/* Ism */}
                  <div style={{
                    flex: 1, fontSize: "14px",
                    fontWeight: isCurrent ? 800 : 600,
                    color: "var(--text)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {displayName(row.user)}
                    {isCurrent && (
                      <span style={{ fontSize: "11px", color: "var(--accent)", marginLeft: "6px", fontWeight: 700 }}>
                        (Siz)
                      </span>
                    )}
                  </div>

                  {/* Qiymat */}
                  <div style={{ fontSize: "15px", fontWeight: 800, color: "var(--gold)", flexShrink: 0 }}>
                    {typeof row.value === "number"
                      ? row.value.toLocaleString()
                      : row.value}
                    {isScore ? "" : " 👥"}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pastki eslatma */}
          <div style={{ marginTop: "16px", textAlign: "center", fontSize: "12px", color: "var(--muted)" }}>
            {rows.length < limit
              ? `Jami ${rows.length} ta foydalanuvchi`
              : `Ko'proq ko'rish uchun yuqoridagi sonni o'zgartiring`}
          </div>
        </>
      )}
    </div>
  );
}

// ── Podium kartochkasi (top-3) ────────────────────────────────────────────────

function PodiumCard({
  row,
  colorIdx,
  currentUserId,
  height,
  small,
}: {
  row: { user: LeaderboardUser; value: number | string; index: number };
  colorIdx: number;
  currentUserId: number;
  height: string;
  small?: boolean;
}) {
  const isCurrent = row.user.telegramId === currentUserId && currentUserId !== 0;
  const color = avatarColor(colorIdx);
  const medal = MEDALS[colorIdx];
  const name = displayName(row.user);

  return (
    <div style={{
      flex: 1,
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "10px 6px",
      borderRadius: "16px",
      background: isCurrent ? "rgba(77,166,255,0.14)" : "var(--card)",
      border: `1.5px solid ${isCurrent ? "rgba(77,166,255,0.5)" : "var(--border)"}`,
      minHeight: height,
      justifyContent: "center",
      gap: "4px",
      boxShadow: colorIdx === 0 ? "0 2px 16px rgba(245,200,66,0.15)" : "none",
    }}>
      {/* Medal */}
      <div style={{ fontSize: small ? "20px" : "26px" }}>{medal}</div>

      {/* Avatar */}
      <div style={{
        width: small ? "36px" : "44px",
        height: small ? "36px" : "44px",
        borderRadius: "50%",
        background: color,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: small ? "12px" : "15px",
        fontWeight: 900, color: "#0B0B14",
        boxShadow: `0 2px 8px ${color}60`,
      }}>
        {getInitials(row.user)}
      </div>

      {/* Ism */}
      <div style={{
        fontSize: small ? "11px" : "12px",
        fontWeight: 700,
        color: "var(--text)",
        textAlign: "center",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        width: "100%",
        padding: "0 4px",
      }}>
        {name.length > 8 ? name.slice(0, 7) + "…" : name}
        {isCurrent && " ✦"}
      </div>

      {/* Ball */}
      <div style={{
        fontSize: small ? "13px" : "16px",
        fontWeight: 900,
        color: colorIdx === 0 ? "var(--svoyak-gold, #f5c842)" : "var(--text)",
      }}>
        {typeof row.value === "number" ? row.value.toLocaleString() : row.value}
      </div>
    </div>
  );
}
