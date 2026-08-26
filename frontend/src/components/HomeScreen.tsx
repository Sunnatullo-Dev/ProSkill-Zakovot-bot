import type { ReactNode } from "react";
import type { DailyInfo, RoundFilter, Difficulty } from "../types";
import { useT } from "../i18n";
import type { StringKey } from "../i18n";
import { useAppSettings } from "../hooks/useAppSettings";

type HomeScreenProps = {
  error: string;
  isLoading: boolean;
  playerName: string;
  record: number;
  score: number;
  dailyInfo?: DailyInfo | null;
  showPremiumPaywall?: boolean;
  onStart: (filter: RoundFilter) => void;
  onDailyOpen?: () => void;
  onGameRoomOpen?: () => void;
  onZakovatTableOpen?: () => void;
  onPremiumOpen?: () => void;
  onUstozoAiOpen?: () => void;
};

type DifficultyOption = {
  value: Difficulty | null;
  emoji: string;
  labelKey: "home_difficulty_easy" | "home_difficulty_medium" | "home_difficulty_hard" | "home_any_difficulty";
  color: string;
  glow: string;
  desc: string;
};

const DIFFICULTY_OPTIONS: DifficultyOption[] = [
  { value: "easy",   emoji: "🟢", labelKey: "home_difficulty_easy",   color: "#22C55E", glow: "rgba(34,197,94,0.25)",   desc: "Boshlang'ich" },
  { value: "medium", emoji: "🟡", labelKey: "home_difficulty_medium", color: "#F59E0B", glow: "rgba(245,158,11,0.25)", desc: "O'rtacha"      },
  { value: "hard",   emoji: "🔴", labelKey: "home_difficulty_hard",   color: "#EF4444", glow: "rgba(239,68,68,0.25)",  desc: "Murakkab"      },
  { value: null,     emoji: "🎲", labelKey: "home_any_difficulty",    color: "#A78BFA", glow: "rgba(167,139,250,0.25)", desc: "Barchasi"      },
];

function MenuRow({ icon, iconBg, title, subtitle, onClick, badge }: {
  icon: string; iconBg: string; title: string; subtitle: string;
  onClick?: () => void; badge?: ReactNode;
}) {
  return (
    <button
      type="button" onClick={onClick} disabled={!onClick}
      style={{ width: "100%", background: "transparent", border: "none", borderRadius: "16px",
        padding: "12px 4px", cursor: onClick ? "pointer" : "default",
        display: "flex", alignItems: "center", gap: "14px", textAlign: "left", transition: "background 0.15s" }}
      onMouseDown={e  => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
      onMouseUp={e    => { e.currentTarget.style.background = "transparent"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
      onTouchStart={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
      onTouchEnd={e   => { e.currentTarget.style.background = "transparent"; }}
    >
      <div style={{ width: "46px", height: "46px", borderRadius: "14px", background: iconBg,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "22px", flexShrink: 0, boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--text)", lineHeight: 1.3 }}>{title}</div>
        <div style={{ fontSize: "12px", color: "var(--text-sub)", marginTop: "2px", lineHeight: 1.3 }}>{subtitle}</div>
      </div>
      {badge ?? <div style={{ color: "var(--muted)", fontSize: "18px", fontWeight: 300, flexShrink: 0 }}>›</div>}
    </button>
  );
}

function DiffCard({ opt, disabled, onClick, t }: {
  opt: DifficultyOption; disabled: boolean; onClick: () => void; t: (key: StringKey) => string;
}) {
  return (
    <button type="button" disabled={disabled} onClick={onClick}
      style={{ padding: "18px 10px", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px",
        background: "var(--glass-bg)", border: `1.5px solid ${opt.color}30`,
        borderTop: `2.5px solid ${opt.color}`, borderRadius: "18px",
        color: "var(--text)", cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1, transition: "transform 0.12s", backdropFilter: "blur(8px)" }}
      onMouseDown={e  => { e.currentTarget.style.transform = "scale(0.95)"; }}
      onMouseUp={e    => { e.currentTarget.style.transform = "scale(1)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
      onTouchStart={e => { e.currentTarget.style.transform = "scale(0.95)"; }}
      onTouchEnd={e   => { e.currentTarget.style.transform = "scale(1)"; }}
    >
      <span style={{ fontSize: "28px", lineHeight: 1, filter: `drop-shadow(0 2px 8px ${opt.glow})` }}>{opt.emoji}</span>
      <span style={{ fontSize: "13px", fontWeight: 800, letterSpacing: "0.02em" }}>{t(opt.labelKey)}</span>
      <span style={{ fontSize: "10px", color: "var(--text-sub)", fontWeight: 500 }}>{opt.desc}</span>
    </button>
  );
}

function ZakovatLogo() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none"
      style={{ filter: "drop-shadow(0 0 18px rgba(245,200,66,0.4))", animation: "logoFloat 4s ease-in-out infinite" }}>
      <defs>
        <linearGradient id="zGold" x1="0" y1="0" x2="72" y2="72" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFE580" />
          <stop offset="50%" stopColor="#F5C842" />
          <stop offset="100%" stopColor="#D4960A" />
        </linearGradient>
      </defs>
      <path d="M14 14 L58 14 L58 22 L26 50 L58 50 L58 58 L14 58 L14 50 L46 22 L14 22 Z" fill="url(#zGold)" />
    </svg>
  );
}

export default function HomeScreen({
  error, isLoading, playerName, record, score, dailyInfo,
  showPremiumPaywall, onStart, onDailyOpen, onGameRoomOpen,
  onZakovatTableOpen, onPremiumOpen, onUstozoAiOpen,
}: HomeScreenProps) {
  const t = useT();
  const appSettings = useAppSettings();
  const userInitial = playerName.trim()[0]?.toUpperCase() ?? "Z";

  const enabledDifficulties = DIFFICULTY_OPTIONS.slice(0, 3).filter((opt) => {
    if (opt.value === "easy"   && !appSettings.difficultyEasyEnabled)   return false;
    if (opt.value === "medium" && !appSettings.difficultyMediumEnabled) return false;
    if (opt.value === "hard"   && !appSettings.difficultyHardEnabled)   return false;
    return true;
  });

  return (
    <div className="animate-fadeInUp"
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column",
        background: "var(--bg)", padding: "0 0 104px", position: "relative", overflow: "hidden" }}>

      {/* Background glow */}
      <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
        width: "340px", height: "280px",
        background: "radial-gradient(ellipse at top, rgba(245,200,66,0.08) 0%, transparent 70%)",
        pointerEvents: "none" }} />

      <div style={{ display: "flex", flexDirection: "column", padding: "0 20px" }}>

        {/* HEADER */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
          paddingTop: "20px", paddingBottom: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "46px", height: "46px", borderRadius: "50%",
              border: "2px solid var(--gold)", background: "var(--surface)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "18px", fontWeight: 900, color: "var(--gold)",
              boxShadow: "0 0 12px rgba(245,200,66,0.2)", flexShrink: 0 }}>
              {userInitial}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--text)",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "140px" }}>
                {playerName}
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-sub)", marginTop: "1px" }}>
                Zakovat o'yinchisi
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px",
            background: "rgba(245,200,66,0.1)", border: "1px solid rgba(245,200,66,0.25)",
            borderRadius: "24px", padding: "6px 14px" }}>
            <span style={{ fontSize: "14px" }}>🏆</span>
            <span style={{ fontSize: "15px", fontWeight: 800, color: "var(--gold)" }}>{score.toLocaleString()}</span>
            <span style={{ fontSize: "11px", color: "var(--text-sub)", fontWeight: 600 }}>ball</span>
          </div>
        </div>

        {/* HERO */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
          paddingTop: "16px", paddingBottom: "20px", gap: "10px" }}>
          <ZakovatLogo />
          <div style={{ fontSize: "26px", fontWeight: 900, letterSpacing: "6px",
            background: "linear-gradient(135deg, #FFFFFF 0%, #F5C842 60%, #E0A800 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            ZAKOVAT
          </div>
          <div style={{ width: "56px", height: "2px",
            background: "linear-gradient(90deg, transparent, var(--gold), transparent)", borderRadius: "2px" }} />
          <div style={{ fontSize: "12px", color: "var(--text-sub)", fontStyle: "italic" }}>
            Bilimingizni sinab ko'ring
          </div>
        </div>

        {/* DIFFICULTY */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "2px",
            color: "var(--muted)", textTransform: "uppercase" }}>
            {t("home_difficulty")}
          </div>
          <div style={{ display: "grid",
            gridTemplateColumns: `repeat(${Math.min(enabledDifficulties.length, 2)}, 1fr)`, gap: "10px" }}>
            {enabledDifficulties.map((opt) => (
              <DiffCard key={opt.value ?? "any"} opt={opt} disabled={isLoading}
                onClick={() => onStart({ category: null, difficulty: opt.value })} t={t} />
            ))}
          </div>
          <button type="button" disabled={isLoading}
            onClick={() => onStart({ category: null, difficulty: null })}
            style={{ width: "100%", padding: "16px",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
              background: "linear-gradient(135deg, rgba(167,139,250,0.18), rgba(77,166,255,0.14))",
              border: "1.5px solid rgba(167,139,250,0.35)", borderRadius: "18px",
              color: "var(--text)", cursor: isLoading ? "not-allowed" : "pointer",
              opacity: isLoading ? 0.6 : 1, fontWeight: 800, fontSize: "15px",
              transition: "transform 0.12s" }}
            onMouseDown={e  => { e.currentTarget.style.transform = "scale(0.98)"; }}
            onMouseUp={e    => { e.currentTarget.style.transform = "scale(1)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
            onTouchStart={e => { e.currentTarget.style.transform = "scale(0.97)"; }}
            onTouchEnd={e   => { e.currentTarget.style.transform = "scale(1)"; }}
          >
            {isLoading
              ? <span style={{ color: "var(--text-sub)" }}>{t("loading_dots")}</span>
              : <><span style={{ fontSize: "22px" }}>🎲</span><span>{t("home_any_difficulty")}</span></>}
          </button>
        </div>

        {/* REJIMLAR */}
        <div style={{ marginTop: "20px" }}>
          <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "2px",
            color: "var(--muted)", textTransform: "uppercase", marginBottom: "4px" }}>
            Qo'shimcha rejimlar
          </div>
          <div style={{ height: "1px", background: "var(--border)", marginBottom: "4px" }} />

          {dailyInfo && onDailyOpen ? (
            <MenuRow icon={dailyInfo.completed ? "✅" : dailyInfo.streak.current >= 3 ? "🔥" : "📅"}
              iconBg={dailyInfo.completed ? "linear-gradient(135deg,#16A34A,#15803D)" : "linear-gradient(135deg,#2563EB,#1D4ED8)"}
              title="Kunlik topshiriq"
              subtitle={dailyInfo.completed ? `Streak: ${dailyInfo.streak.current} kun ✓`
                : dailyInfo.bonusPreview > 0 ? `+${dailyInfo.bonusPreview} bonus ball` : "Yangi savol har kun"}
              onClick={onDailyOpen} />
          ) : null}

          {onGameRoomOpen ? (
            <MenuRow icon="🎮" iconBg="linear-gradient(135deg,#7C3AED,#6D28D9)"
              title="Online O'yin Xonasi" subtitle="Do'stlar bilan real-vaqt o'yini" onClick={onGameRoomOpen} />
          ) : null}

          {onZakovatTableOpen ? (
            <MenuRow icon="👁" iconBg="linear-gradient(135deg,#DC2626,#B91C1C)"
              title="Zakovat Stoli" subtitle="Jonli guruh o'yinini kuzating" onClick={onZakovatTableOpen} />
          ) : null}

          {onUstozoAiOpen ? (
            <MenuRow icon="🎓" iconBg="linear-gradient(135deg,#0EA5E9,#0284C7)"
              title="Ustoz AI" subtitle="Fan va darslar bo'yicha test" onClick={onUstozoAiOpen} />
          ) : null}

          {onPremiumOpen ? (
            <MenuRow icon="⭐" iconBg="linear-gradient(135deg,#D97706,#B45309)"
              title="Zakovat Premium" subtitle="Cheksiz o'yin, barcha bo'limlar" onClick={onPremiumOpen}
              badge={
                <div style={{ background: "linear-gradient(135deg,#F5C842,#D4960A)",
                  borderRadius: "8px", padding: "3px 9px",
                  fontSize: "10px", fontWeight: 800, color: "#1a0a00" }}>PRO</div>
              } />
          ) : null}
        </div>

        {/* PAYWALL */}
        {showPremiumPaywall && onPremiumOpen ? (
          <div style={{ marginTop: "12px",
            background: "linear-gradient(135deg,rgba(184,134,11,0.14),rgba(218,165,32,0.08))",
            border: "1.5px solid rgba(245,200,66,0.35)", borderRadius: "18px", padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "24px", flexShrink: 0 }}>⛔</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "13px", fontWeight: 800, color: "var(--text)" }}>Bugungi bepul limit tugadi!</div>
                <div style={{ fontSize: "12px", color: "var(--text-sub)", marginTop: "2px" }}>⏳ Limit ertaga yangilanadi</div>
              </div>
              <button type="button" onClick={onPremiumOpen}
                style={{ padding: "8px 14px", background: "linear-gradient(135deg,#F5C842,#D4960A)",
                  border: "none", borderRadius: "12px", fontSize: "12px", fontWeight: 800,
                  color: "#1a0a00", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
                ⭐ Premium
              </button>
            </div>
          </div>
        ) : error ? (
          <div style={{ marginTop: "8px", fontSize: "13px", fontWeight: 600, color: "var(--error)", textAlign: "center" }}>
            {error}
          </div>
        ) : null}

        {/* Record */}
        {record > 0 ? (
          <div style={{ marginTop: "16px", display: "flex", alignItems: "center",
            justifyContent: "center", gap: "8px", fontSize: "12px", color: "var(--text-sub)" }}>
            <span>🏅</span><span>Shaxsiy rekord:</span>
            <span style={{ fontWeight: 800, color: "var(--gold)" }}>{record.toLocaleString()} ball</span>
          </div>
        ) : null}

      </div>
    </div>
  );
}
