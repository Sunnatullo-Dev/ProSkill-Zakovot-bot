/**
 * Zakovat Stoli — jonli xona ko'rinishi (kuzatuvchi, faqat o'qish).
 *
 * Botning ASCII stol ko'rinishi bilan bir xil ma'lumotni ko'rsatadi (xona
 * kodi, jamoa/muxlislar hisobi, 6 ta o'rindiq + kapitan belgisi, joriy
 * sektor/savol, muhokama countdown'i, yakuniy natija) — lekin mobil-first
 * React UI sifatida.
 *
 * Bu komponent hech qanday mutatsiya chaqirmaydi — faqat useZakovatTableRoom
 * orqali poll qiladi. O'yinni boshqarish faqat bot orqali (spec talabi).
 */
import { useZakovatTableRoom } from "./useZakovatTableRoom";
import type { ZtPlayer, ZtRoomState } from "./types";
import { ZT_TEAM_SIZE, ZT_WIN_SCORE, ZT_QUESTION_COUNT } from "./types";

const PAGE_STYLE: React.CSSProperties = {
  minHeight: "100dvh",
  background: "var(--bg)",
  maxWidth: "430px",
  margin: "0 auto",
  boxSizing: "border-box",
  overflowY: "auto",
};

const CARD_STYLE: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "20px",
  padding: "16px",
};

const btnIcon: React.CSSProperties = {
  width: "36px",
  height: "36px",
  borderRadius: "10px",
  border: "1px solid var(--border)",
  background: "var(--card)",
  color: "var(--muted)",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "16px",
  flexShrink: 0,
};

type Props = {
  code: string;
  onExit: () => void;
};

export default function ZakovatTableRoomView({ code, onExit }: Props) {
  const { data, isLoading, error, failureCount } = useZakovatTableRoom(code);

  if (isLoading && !data) {
    return (
      <div style={{ ...PAGE_STYLE, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "32px", marginBottom: "12px" }}>👁</div>
          <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--text)" }}>
            Xona qidirilmoqda...
          </div>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div style={{ ...PAGE_STYLE, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <div style={{ textAlign: "center", width: "100%" }}>
          <div style={{ fontSize: "36px", marginBottom: "12px" }}>⚠️</div>
          <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--text)", marginBottom: "6px" }}>
            Xonani topib bo'lmadi
          </div>
          <div style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "20px" }}>
            {error}
          </div>
          <button
            type="button"
            onClick={onExit}
            style={{
              width: "100%",
              padding: "13px",
              borderRadius: "14px",
              border: "1px solid var(--border)",
              background: "var(--card)",
              color: "var(--text)",
              fontSize: "14px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Orqaga qaytish
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  if (data.status === "finished") {
    return <FinishedView data={data} onExit={onExit} />;
  }

  return <LiveView data={data} failureCount={failureCount} onExit={onExit} />;
}

// ─── Jonli ko'rinish ──────────────────────────────────────────────────────────

function LiveView({
  data,
  failureCount,
  onExit,
}: {
  data: ZtRoomState;
  failureCount: number;
  onExit: () => void;
}) {
  return (
    <div style={{ ...PAGE_STYLE, padding: "16px 20px", paddingBottom: "calc(24px + env(safe-area-inset-bottom, 0px))" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px" }}>
        <button type="button" onClick={onExit} style={btnIcon} aria-label="Chiqish">
          ✕
        </button>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "14px", fontWeight: 800, color: "var(--text)" }}>
            Zakovat Stoli
          </div>
          <div
            style={{
              display: "inline-block",
              marginTop: "4px",
              background: "rgba(77,166,255,0.12)",
              border: "1px solid rgba(77,166,255,0.3)",
              borderRadius: "8px",
              padding: "2px 10px",
              fontSize: "12px",
              fontWeight: 700,
              color: "var(--accent)",
              letterSpacing: "1.5px",
            }}
          >
            #{data.displayCode}
          </div>
        </div>
        <div style={{ width: "36px" }} />
      </div>

      {/* Hisob */}
      <ScoreCard data={data} />

      {/* Holat */}
      <div style={{ ...CARD_STYLE, marginTop: "12px" }}>
        <StatusBlock data={data} />
      </div>

      {/* O'yinchilar */}
      <div style={{ ...CARD_STYLE, marginTop: "12px" }}>
        <div
          style={{
            fontSize: "11px",
            fontWeight: 700,
            color: "var(--muted)",
            letterSpacing: "1.5px",
            marginBottom: "12px",
          }}
        >
          O'YINCHILAR ({data.playerCount}/{ZT_TEAM_SIZE})
        </div>
        <SeatsGrid players={data.players} viewerTelegramId={data.viewerTelegramId} />
      </div>

      {/* Footer */}
      <div
        style={{
          fontSize: "12px",
          color: "var(--muted)",
          textAlign: "center",
          marginTop: "14px",
          display: "flex",
          justifyContent: "center",
          gap: "14px",
          flexWrap: "wrap",
        }}
      >
        <span>📝 Savollar: {data.questionsUsed}/{ZT_QUESTION_COUNT}</span>
        <span>👁 {data.spectatorCount} kuzatuvchi</span>
      </div>

      {failureCount > 2 && (
        <div style={{ fontSize: "12px", color: "var(--muted)", textAlign: "center", marginTop: "10px" }}>
          Ulanish muammosi — qayta urinilmoqda...
        </div>
      )}
    </div>
  );
}

// ─── Hisob kartasi ────────────────────────────────────────────────────────────

function ScoreCard({ data }: { data: ZtRoomState }) {
  const teamPct = Math.min(100, (data.teamScore / ZT_WIN_SCORE) * 100);
  const fansPct = Math.min(100, (data.fansScore / ZT_WIN_SCORE) * 100);
  return (
    <div style={CARD_STYLE}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <ScoreSide emoji="👥" label="Jamoa" score={data.teamScore} align="left" />
        <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--muted)", padding: "0 10px" }}>
          {ZT_WIN_SCORE} ballgacha
        </div>
        <ScoreSide emoji="🧠" label="Muxlislar" score={data.fansScore} align="right" />
      </div>
      <div style={{ display: "flex", gap: "6px", marginTop: "12px" }}>
        <div style={{ flex: 1, height: "6px", borderRadius: "4px", background: "var(--border)", overflow: "hidden" }}>
          <div style={{ width: `${teamPct}%`, height: "100%", background: "linear-gradient(90deg, #4DA6FF, #7C3AED)", transition: "width 0.4s" }} />
        </div>
        <div style={{ flex: 1, height: "6px", borderRadius: "4px", background: "var(--border)", overflow: "hidden" }}>
          <div
            style={{
              width: `${fansPct}%`,
              height: "100%",
              marginLeft: "auto",
              background: "linear-gradient(270deg, #F59E0B, #DC2626)",
              transition: "width 0.4s",
            }}
          />
        </div>
      </div>
    </div>
  );
}

function ScoreSide({
  emoji,
  label,
  score,
  align,
}: {
  emoji: string;
  label: string;
  score: number;
  align: "left" | "right";
}) {
  return (
    <div style={{ textAlign: align, flex: "0 0 auto" }}>
      <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", letterSpacing: "1px" }}>
        {emoji} {label.toUpperCase()}
      </div>
      <div style={{ fontSize: "30px", fontWeight: 900, color: "var(--text)", lineHeight: 1.15 }}>
        {score}
      </div>
    </div>
  );
}

// ─── Holat bloki ──────────────────────────────────────────────────────────────

function StatusBlock({ data }: { data: ZtRoomState }) {
  const s = data.status;

  if (s === "waiting") {
    return (
      <StatusLine
        emoji="⏳"
        text={
          data.teamFull
            ? "Jamoa to'liq yig'ildi. Boshlovchi tasdiqlashini kutmoqda..."
            : `Jamoa yig'ilmoqda (${data.playerCount}/${ZT_TEAM_SIZE})...`
        }
      />
    );
  }
  if (s === "team_confirmed") {
    return (
      <StatusLine
        emoji="📝"
        text={
          data.questionsTotal >= ZT_QUESTION_COUNT
            ? "Hammasi tayyor! O'yin boshlanishini kutmoqda..."
            : `Jamoa tasdiqlandi. Savollar yuklanmoqda (${data.questionsTotal}/${ZT_QUESTION_COUNT}).`
        }
      />
    );
  }
  if (s === "in_progress") {
    return <StatusLine emoji="🐎" text="Boshlovchi otni aylantirishini kutmoqda..." />;
  }
  if (s === "discussion") {
    const sector = data.currentQuestion?.sector ?? "?";
    return (
      <div>
        <StatusLine emoji="🎯" text={`${sector}-sektor — savol o'qildi, jamoa muhokama qilmoqda`} />
        {data.currentQuestion?.text ? (
          <div
            style={{
              marginTop: "10px",
              padding: "12px",
              borderRadius: "12px",
              background: "rgba(77,166,255,0.08)",
              border: "1px solid rgba(77,166,255,0.2)",
              fontSize: "14px",
              fontWeight: 600,
              color: "var(--text)",
              lineHeight: 1.5,
            }}
          >
            {data.currentQuestion.text}
          </div>
        ) : null}
        <DiscussionCountdown data={data} />
      </div>
    );
  }
  if (s === "awaiting_answer") {
    return (
      <StatusLine
        emoji="🎙"
        text={`Kapitan (${data.captainName ?? "—"}) yakuniy javobini bermoqda...`}
      />
    );
  }
  if (s === "verifying") {
    return <StatusLine emoji="⚖️" text="Admin javobni baholamoqda..." />;
  }
  return null;
}

function StatusLine({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <span style={{ fontSize: "22px", flexShrink: 0 }}>{emoji}</span>
      <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)", lineHeight: 1.4 }}>
        {text}
      </span>
    </div>
  );
}

function DiscussionCountdown({ data }: { data: ZtRoomState }) {
  const total = data.discussionSeconds || 60;
  const remaining = data.discussionSecondsRemaining ?? total;
  const ratio = Math.max(0, Math.min(1, remaining / total));
  const circumference = 2 * Math.PI * 22;
  const strokeDashoffset = circumference * (1 - ratio);
  const color = ratio > 0.5 ? "var(--accent)" : ratio > 0.25 ? "#F59E0B" : "var(--error)";

  return (
    <div style={{ display: "flex", justifyContent: "center", marginTop: "12px" }}>
      <svg width="56" height="56" viewBox="0 0 56 56">
        <circle cx="28" cy="28" r={22} fill="none" stroke="var(--border)" strokeWidth="4" />
        <circle
          cx="28"
          cy="28"
          r={22}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform="rotate(-90 28 28)"
          style={{ transition: "stroke-dashoffset 1s linear, stroke 0.5s" }}
        />
        <text x="28" y="28" textAnchor="middle" dominantBaseline="central" fill={color} fontSize="15" fontWeight="900">
          {remaining}
        </text>
      </svg>
    </div>
  );
}

// ─── O'rindiqlar ──────────────────────────────────────────────────────────────

function SeatsGrid({ players, viewerTelegramId }: { players: ZtPlayer[]; viewerTelegramId: number | null }) {
  const bySeat = new Map(players.map((p) => [p.seat, p]));
  const seats = Array.from({ length: ZT_TEAM_SIZE }, (_, i) => bySeat.get(i + 1) ?? null);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
      {seats.map((player, idx) => (
        <SeatCard key={idx} seat={idx + 1} player={player} isMe={player?.telegramId === viewerTelegramId} />
      ))}
    </div>
  );
}

function SeatCard({ seat, player, isMe }: { seat: number; player: ZtPlayer | null; isMe: boolean }) {
  const filled = Boolean(player);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "8px",
        borderRadius: "12px",
        background: isMe ? "rgba(77,166,255,0.1)" : filled ? "var(--bg)" : "transparent",
        border: isMe ? "1px solid rgba(77,166,255,0.3)" : "1px dashed var(--border)",
      }}
    >
      <div
        style={{
          width: "30px",
          height: "30px",
          borderRadius: "50%",
          background: filled ? "linear-gradient(135deg, #4DA6FF, #7C3AED)" : "var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "12px",
          fontWeight: 800,
          color: filled ? "white" : "var(--muted)",
          flexShrink: 0,
        }}
      >
        {filled ? player!.displayName[0]?.toUpperCase() ?? "?" : seat}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontSize: "12.5px",
            fontWeight: filled ? 700 : 500,
            color: filled ? "var(--text)" : "var(--muted)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {filled ? player!.displayName : `${seat}-o'rin — bo'sh`}
        </div>
        {filled && player!.isCaptain ? (
          <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--gold, #f5c842)" }}>
            👑 Kapitan
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ─── Yakuniy natija ───────────────────────────────────────────────────────────

function winnerLabel(winner: ZtRoomState["winner"]): string {
  if (winner === "team") return "O'yinchilar jamoasi!";
  if (winner === "fans") return "Muxlislar!";
  return "Durrang!";
}

function FinishedView({ data, onExit }: { data: ZtRoomState; onExit: () => void }) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        background:
          "radial-gradient(140% 80% at 50% 0%, rgba(245,200,66,0.16), transparent 50%)," +
          "var(--bg)",
        padding: "32px 20px",
        paddingBottom: "calc(32px + env(safe-area-inset-bottom, 0px))",
        maxWidth: "430px",
        margin: "0 auto",
        boxSizing: "border-box",
        overflowY: "auto",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: "52px", marginBottom: "8px" }}>🏆</div>
      <div
        style={{
          fontSize: "24px",
          fontWeight: 900,
          background: "linear-gradient(120deg, #FFFFFF 0%, #f5c842 60%, #FF8A4C 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          marginBottom: "6px",
        }}
      >
        O'yin tugadi!
      </div>
      <div style={{ fontSize: "16px", fontWeight: 800, color: "var(--gold, #f5c842)", marginBottom: "4px" }}>
        G'olib: {winnerLabel(data.winner)}
      </div>
      <div style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "20px" }}>
        #{data.displayCode}
      </div>

      <div style={{ marginBottom: "16px" }}>
        <ScoreCard data={data} />
      </div>

      <div style={{ ...CARD_STYLE, textAlign: "left", marginBottom: "20px" }}>
        <div
          style={{
            fontSize: "11px",
            fontWeight: 700,
            color: "var(--muted)",
            letterSpacing: "1.5px",
            marginBottom: "12px",
          }}
        >
          O'YINCHILAR
        </div>
        <SeatsGrid players={data.players} viewerTelegramId={data.viewerTelegramId} />
      </div>

      <button
        type="button"
        onClick={onExit}
        style={{
          width: "100%",
          padding: "15px",
          borderRadius: "14px",
          border: "none",
          background: "var(--accent)",
          color: "white",
          fontSize: "15px",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        Yopish
      </button>
    </div>
  );
}
