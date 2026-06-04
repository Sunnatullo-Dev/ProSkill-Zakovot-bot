import type { DailyCompleteResult, DailyInfo } from "../types";
import { hapticResult, hapticTap } from "../utils/haptics";

type Props = {
  info: DailyInfo;
  onStart: () => void;
  onBack: () => void;
  lastResult?: DailyCompleteResult | null;
};

function StreakFlame({ count }: { count: number }) {
  const color = count >= 30 ? "#FF6B6B" : count >= 14 ? "#FF9F43" : count >= 7 ? "#FFC048" : count >= 3 ? "#FFD700" : "var(--muted)";
  return (
    <span style={{ color, fontSize: "22px" }}>
      {count >= 3 ? "🔥" : "✦"}
    </span>
  );
}

export default function DailyChallengeScreen({ info, onStart, onBack, lastResult }: Props) {
  const today = new Date(info.date + "T00:00:00").toLocaleDateString("uz-UZ", {
    day: "numeric",
    month: "long",
    weekday: "long"
  });

  const nextStreak = info.streak.current + 1;
  const bonusForNext =
    nextStreak >= 30 ? 20 :
    nextStreak >= 14 ? 14 :
    nextStreak >= 7  ? 7  :
    nextStreak >= 3  ? 3  : 0;

  return (
    <div
      className="animate-fadeInUp"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg)",
        padding: "24px 20px 100px"
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
        <button
          style={{
            width: "34px", height: "34px",
            borderRadius: "10px",
            background: "var(--card)",
            border: "1px solid var(--border)",
            color: "var(--muted)",
            fontSize: "18px",
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}
          type="button"
          onClick={() => { hapticTap(); onBack(); }}
        >
          ←
        </button>
        <div>
          <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--text)" }}>
            Kunlik topshiriq
          </div>
          <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>
            {today}
          </div>
        </div>
      </div>

      {/* Streak card */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(77,166,255,0.15), rgba(124,58,237,0.15))",
          border: "1px solid rgba(77,166,255,0.3)",
          borderRadius: "20px",
          padding: "20px",
          marginBottom: "16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}
      >
        <div>
          <div style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 700, letterSpacing: "1px" }}>
            STREAK
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
            <StreakFlame count={info.streak.current} />
            <span style={{ fontSize: "32px", fontWeight: 900, color: "var(--text)", lineHeight: 1 }}>
              {info.streak.current}
            </span>
            <span style={{ fontSize: "14px", color: "var(--muted)", fontWeight: 600 }}>kun</span>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 700 }}>
            ENG UZUN
          </div>
          <div style={{ fontSize: "22px", fontWeight: 800, color: "var(--text)", marginTop: "2px" }}>
            {info.streak.longest} kun
          </div>
        </div>
      </div>

      {/* Bonus preview */}
      {!info.completed && bonusForNext > 0 && (
        <div
          style={{
            background: "rgba(245,200,66,0.1)",
            border: "1px solid rgba(245,200,66,0.3)",
            borderRadius: "14px",
            padding: "12px 16px",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            gap: "10px"
          }}
        >
          <span style={{ fontSize: "20px" }}>🏆</span>
          <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--gold)" }}>
            {nextStreak} kunlik streak → +{bonusForNext} bonus ball!
          </span>
        </div>
      )}

      {/* Last result */}
      {lastResult && (
        <div
          style={{
            background: lastResult.streakBonus > 0 ? "rgba(34,197,94,0.12)" : "var(--card)",
            border: `1px solid ${lastResult.streakBonus > 0 ? "rgba(34,197,94,0.3)" : "var(--border)"}`,
            borderRadius: "16px",
            padding: "16px",
            marginBottom: "16px",
            textAlign: "center"
          }}
        >
          <div style={{ fontSize: "28px", marginBottom: "8px" }}>
            {lastResult.newStreak >= 7 ? "🔥" : "✅"}
          </div>
          <div style={{ fontSize: "15px", fontWeight: 800, color: "var(--success)" }}>
            Bugun yakunlandi!
          </div>
          <div style={{ fontSize: "13px", color: "var(--muted)", marginTop: "4px" }}>
            Streak: {lastResult.newStreak} kun
            {lastResult.streakBonus > 0 && (
              <span style={{ color: "var(--gold)", fontWeight: 700 }}>
                {" "}· +{lastResult.streakBonus} bonus ball 🏆
              </span>
            )}
          </div>
        </div>
      )}

      {/* Questions info */}
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "20px",
          padding: "20px",
          marginBottom: "20px"
        }}
      >
        <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--muted)", marginBottom: "12px", letterSpacing: "1px" }}>
          BUGUNGI SAVOLLAR
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {info.questions.map((q, i) => (
            <div
              key={q.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
                opacity: info.completed ? 0.6 : 1
              }}
            >
              <span
                style={{
                  width: "22px", height: "22px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, var(--accent), var(--accent2, #7C3AED))",
                  color: "white",
                  fontSize: "11px",
                  fontWeight: 800,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flex: "0 0 auto"
                }}
              >
                {i + 1}
              </span>
              <span style={{ fontSize: "14px", color: "var(--text)", lineHeight: 1.5 }}>
                {q.text.length > 80 ? q.text.slice(0, 80) + "…" : q.text}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      {info.completed ? (
        <div style={{ textAlign: "center", padding: "16px" }}>
          <div style={{ fontSize: "32px", marginBottom: "8px" }}>✅</div>
          <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--success)" }}>
            Bugun allaqachon bajarildi!
          </div>
          <div style={{ fontSize: "13px", color: "var(--muted)", marginTop: "6px" }}>
            Ertaga yangi 5 ta savol kutadi
          </div>
        </div>
      ) : (
        <button
          style={{
            width: "100%",
            padding: "17px",
            background: "linear-gradient(135deg, #4DA6FF, #7C3AED)",
            border: "none",
            borderRadius: "16px",
            fontSize: "17px",
            fontWeight: 800,
            color: "white",
            cursor: "pointer",
            boxShadow: "0 8px 24px rgba(77,166,255,0.35)"
          }}
          type="button"
          onClick={() => { hapticTap(); onStart(); }}
        >
          Boshlash →
        </button>
      )}
    </div>
  );
}
