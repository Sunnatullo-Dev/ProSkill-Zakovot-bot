/**
 * Svoyak ichki state machine — lobby/board/finished ekranlari orasida o'tish.
 *
 * App.tsx faqat shu komponentni render qiladi `screen === "svoyak"` bo'lganda.
 * Ichkari state — bu Svoyak'ga xos (xonalar, kodlar va h.k.) — bosh App
 * state'iga aralashmasin.
 */
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import SvoyakLobbyScreen from "./SvoyakLobbyScreen";
import SvoyakBoardScreen from "./SvoyakBoardScreen";
import type { SvoyakRoomState } from "./types";

type Props = {
  /** Joriy foydalanuvchi ismi. */
  playerName: string;
  /** Deep link orqali kelgan room kod (?startapp=svoyak_XXXXXX). */
  initialJoinCode?: string;
  /** Svoyak tabidan chiqib ketish istasa (umuman boshqa nav). */
  onExitSvoyak: () => void;
};

type Stage =
  | { kind: "lobby" }
  | { kind: "board"; code: string }
  | { kind: "finished"; state: SvoyakRoomState };

export default function SvoyakRouter({
  playerName,
  initialJoinCode,
  onExitSvoyak,
}: Props) {
  const [stage, setStage] = useState<Stage>({ kind: "lobby" });

  // Deep link bilan kelganida lobby'ni "joining" rejimida ochish — bu SvoyakLobbyScreen
  // ichida prop bilan hal qilingan.

  if (stage.kind === "lobby") {
    return (
      <SvoyakLobbyScreen
        playerName={playerName}
        initialJoinCode={initialJoinCode}
        onGameStarted={(state) => setStage({ kind: "board", code: state.code })}
      />
    );
  }

  if (stage.kind === "board") {
    return (
      <SvoyakBoardScreen
        code={stage.code}
        onGameEnded={(state) => setStage({ kind: "finished", state })}
        onExit={onExitSvoyak}
      />
    );
  }

  // finished
  return <SvoyakFinished state={stage.state} onPlayAgain={() => setStage({ kind: "lobby" })} onExit={onExitSvoyak} />;
}


function SvoyakFinished(props: {
  state: SvoyakRoomState;
  onPlayAgain: () => void;
  onExit: () => void;
}) {
  const { state, onPlayAgain, onExit } = props;
  const sorted = [...state.players].sort((a, b) => b.score - a.score);
  const champion = sorted[0];

  const page: CSSProperties = {
    minHeight: "100dvh",
    background:
      "radial-gradient(140% 80% at 50% 0%, rgba(245,200,66,0.18), transparent 55%)," +
      "var(--svoyak-bg, #0a1428)",
    color: "var(--text)",
    fontFamily: "var(--svoyak-font-body)",
    padding: "32px 20px 100px",
    maxWidth: "430px",
    margin: "0 auto",
    textAlign: "center",
  };

  return (
    <div style={page}>
      <div style={{ fontSize: "60px", marginBottom: "8px" }}>🏆</div>
      <div
        style={{
          fontFamily: "var(--svoyak-font-heading)",
          fontSize: "26px",
          fontWeight: 900,
          background:
            "linear-gradient(120deg, #FFFFFF 0%, var(--svoyak-gold, #f5c842) 60%, #FF8A4C 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          marginBottom: "20px",
        }}
      >
        O'yin tugadi
      </div>

      {champion && champion.score > 0 ? (
        <div style={{ marginBottom: "24px" }}>
          <div style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "4px" }}>
            G'OLIB
          </div>
          <div
            style={{
              fontFamily: "var(--svoyak-font-heading)",
              fontSize: "22px",
              fontWeight: 900,
              color: "var(--svoyak-gold, #f5c842)",
            }}
          >
            {champion.displayName} — {champion.score}
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: "24px", color: "var(--muted)" }}>
          G'olib aniqlanmadi
        </div>
      )}

      <div
        style={{
          background: "var(--svoyak-surface, #0f1f3a)",
          border: "1px solid var(--svoyak-border)",
          borderRadius: "16px",
          padding: "12px",
          marginBottom: "20px",
          textAlign: "left",
        }}
      >
        {sorted.map((p, i) => (
          <div
            key={p.telegramId}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "8px",
              borderBottom: i < sorted.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
            }}
          >
            <span style={{ fontSize: "16px", width: "24px" }}>
              {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
            </span>
            <span style={{ flex: 1, fontWeight: 700 }}>{p.displayName}</span>
            <span
              style={{
                fontFamily: "var(--svoyak-font-heading)",
                fontWeight: 900,
                color: p.score < 0 ? "var(--svoyak-neon-red)" : "var(--svoyak-gold)",
              }}
            >
              {p.score > 0 ? `+${p.score}` : p.score}
            </span>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onPlayAgain}
        style={{
          width: "100%",
          padding: "16px",
          borderRadius: "14px",
          border: "none",
          background:
            "linear-gradient(135deg, var(--svoyak-gold, #f5c842) 0%, #FF8A4C 100%)",
          color: "#0B0B14",
          fontFamily: "var(--svoyak-font-heading)",
          fontSize: "15px",
          fontWeight: 900,
          cursor: "pointer",
          boxShadow: "0 10px 24px -6px rgba(245,200,66,0.45)",
          marginBottom: "10px",
        }}
      >
        ▶ Yana o'ynash
      </button>
      <button
        type="button"
        onClick={onExit}
        style={{
          width: "100%",
          padding: "14px",
          borderRadius: "14px",
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(255,255,255,0.04)",
          color: "var(--text)",
          fontSize: "14px",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        ← Asosiy menyu
      </button>
    </div>
  );
}
