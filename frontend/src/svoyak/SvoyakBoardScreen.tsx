/**
 * Svoyak Board — asosiy o'yin doskasi.
 *
 * Yuqorida live scoreboard.
 * Markazda grid: ustun har biri kategoriya, qator har biri ball qiymati (10/20/30/40/50).
 * Pick huquqi bo'lgan o'yinchi tile'ni bosadi → /pick chaqiriladi → Round boshlanadi.
 *
 * Day 5'da bu ekran ustiga BUZZ overlay va Question overlay qo'shiladi.
 * Hozircha ko'rsatish + pick mexanikasi.
 */
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { buzz, endGame, openBuzz, pickQuestion, skipRound, submitAnswer } from "./api";
import { useSvoyakRoom } from "./useSvoyakRoom";
import type { SvoyakRoomState } from "./types";
import { SVOYAK_VALUE_TIERS } from "./types";
import { hapticSelect, hapticTap } from "../utils/haptics";
import QuestionOverlay from "./QuestionOverlay";
import BuzzOverlay from "./BuzzOverlay";
import AnswerOverlay from "./AnswerOverlay";
import RoundResultOverlay from "./RoundResultOverlay";
import { useT } from "../i18n";

type Props = {
  code: string;
  /** O'yin tugaganda (status=finished) chaqiriladi. */
  onGameEnded: (state: SvoyakRoomState) => void;
  /** Chiqib ketish — Svoyak tabidan asosiy menyuga qaytish. */
  onExit: () => void;
};

const PAGE: CSSProperties = {
  minHeight: "100dvh",
  background:
    "radial-gradient(140% 80% at 50% -10%, rgba(245,200,66,0.10), transparent 55%)," +
    "radial-gradient(140% 100% at 50% 110%, rgba(124,58,237,0.16), transparent 60%)," +
    "var(--svoyak-bg, #0a1428)",
  color: "var(--text)",
  fontFamily: "var(--svoyak-font-body)",
  padding: "16px 12px 100px",
  maxWidth: "430px",
  margin: "0 auto",
};


export default function SvoyakBoardScreen({ code, onGameEnded, onExit }: Props) {
  const t = useT();
  const { data, error, refetch } = useSvoyakRoom(code);

  // ─── BARCHA HOOKS EARLY RETURN DAN OLDIN ───────────────────────────────
  // React qoidasi: hook'lar har renderda BIR XIL tartibda, SHARTISIZ chaqirilishi shart.

  const canPick = useMemo(() => {
    if (!data) return false;
    const me = (data.players ?? []).find((p) => p.telegramId === data.viewerTelegramId);
    return Boolean(me?.canPick);
  }, [data]);

  const isCoordinator = useMemo(() => {
    if (!data) return false;
    const me = (data.players ?? []).find((p) => p.telegramId === data.viewerTelegramId);
    return me?.role === "coordinator";
  }, [data]);

  // Round result flash uchun state — early return dan OLDIN bo'lishi SHART
  const [dismissedResultRoundId, setDismissedResultRoundId] = useState<number | null>(null);

  const round = data?.currentRound ?? null;

  // Yangi round boshlansa eski dismiss state'ni tozalaymiz
  useEffect(() => {
    if (round && round.status !== "completed" && round.status !== "skipped") {
      setDismissedResultRoundId(null);
    }
  }, [round?.id, round?.status]);

  // Bloklagan o'yinchi ismi
  const blockedBy = useMemo(() => {
    if (!round || !round.buzzWinnerTelegramId) return undefined;
    const w = (data?.players ?? []).find((p) => p.telegramId === round.buzzWinnerTelegramId);
    return w?.displayName;
  }, [round, data?.players]);

  // Joriy savol uchun kategoriya
  const currentCategory = useMemo(() => {
    if (!round) return null;
    const cellsWithThisValue = (data?.board ?? []).filter(
      (b) => Array.isArray(b.usedValueTiers) && b.usedValueTiers.includes(round.value)
    );
    return cellsWithThisValue[0] ?? null;
  }, [round, data?.board]);

  // ─── HOOKS TUGADI — endi early return mumkin ───────────────────────────

  // O'yin tugagani — auto-redirect
  if (data && data.status === "finished") {
    Promise.resolve().then(() => onGameEnded(data));
  }

  if (!data) {
    return (
      <div style={{ ...PAGE, display: "grid", placeItems: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "32px", marginBottom: "8px" }}>🎲</div>
          <div style={{ color: "var(--muted)" }}>
            {error ? `⚠ ${error}` : "Yuklanmoqda..."}
          </div>
        </div>
      </div>
    );
  }

  const isHost = data.viewerIsHost;
  const meIsWinner = round?.buzzWinnerTelegramId === data.viewerTelegramId;

  async function handlePick(categoryId: number, valueTier: number) {
    if (!canPick) return;
    hapticSelect();
    try {
      await pickQuestion({ code, categoryId, valueTier });
      await refetch();
    } catch (err) {
      console.error("pick failed", err);
    }
  }

  async function handleBuzz() {
    try {
      await buzz(code);
      await refetch();
    } catch (err) {
      console.error("buzz failed", err);
    }
  }

  async function handleOpenBuzz() {
    if (!isHost) return;
    hapticTap();
    try {
      await openBuzz(code);
      await refetch();
    } catch (err) {
      console.error("openBuzz failed", err);
    }
  }

  async function handleAnswer(answer: string) {
    if (!meIsWinner) return;
    hapticTap();
    try {
      await submitAnswer({ code, answer });
      await refetch();
    } catch (err) {
      console.error("answer failed", err);
    }
  }

  async function handleSkip() {
    hapticTap();
    try {
      await skipRound(code);
      await refetch();
    } catch (err) {
      console.error("skip failed", err);
    }
  }

  const players = Array.isArray(data.players) ? data.players : [];
  const board = Array.isArray(data.board) ? data.board : [];
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  const showOverlay =
    round && (round.status === "reading" || round.status === "waiting_buzz" || round.status === "answering");

  const showResultOverlay =
    round &&
    (round.status === "completed" || round.status === "skipped") &&
    dismissedResultRoundId !== round.id;

  function buzzStateForViewer(): "waiting" | "active" | "blocked" | "winner" {
    if (!round) return "waiting";
    if (round.status === "reading") return "waiting";
    if (round.status === "answering") {
      return meIsWinner ? "winner" : "blocked";
    }
    if (round.buzzWinnerTelegramId !== null) {
      return meIsWinner ? "winner" : "blocked";
    }
    return "active";
  }

  return (
    <>
    <div style={PAGE}>
      {/* Scoreboard */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          padding: "10px",
          background: "rgba(0,0,0,0.30)",
          borderRadius: "14px",
          marginBottom: "14px",
          overflowX: "auto",
        }}
      >
        {sortedPlayers.map((p) => {
          const isMinus = p.score < 0;
          return (
            <div
              key={p.telegramId}
              style={{
                flex: "0 0 auto",
                minWidth: "92px",
                padding: "10px 12px",
                borderRadius: "12px",
                background: isMinus
                  ? "linear-gradient(135deg, rgba(255,59,92,0.18), rgba(255,59,92,0.06))"
                  : "rgba(255,255,255,0.04)",
                border: isMinus
                  ? "1px solid rgba(255,59,92,0.5)"
                  : "1px solid rgba(255,255,255,0.06)",
                boxShadow: isMinus ? "var(--svoyak-glow-red, 0 0 16px rgba(255,59,92,0.35))" : "none",
                textAlign: "center",
                opacity: p.status === "connected" ? 1 : 0.4,
              }}
            >
              <div style={{ fontSize: "10px", color: "var(--muted)", marginBottom: "4px" }}>
                {p.isHost ? "👑 " : ""}
                {p.displayName.slice(0, 8)}
              </div>
              <div
                style={{
                  fontFamily: "var(--svoyak-font-heading)",
                  fontSize: "22px",
                  fontWeight: 900,
                  color: isMinus ? "var(--svoyak-neon-red, #ff3b5c)" : "var(--svoyak-gold, #f5c842)",
                }}
              >
                {p.score > 0 ? `+${p.score}` : p.score}
              </div>
              {p.canPick ? (
                <div style={{ fontSize: "9px", color: "var(--svoyak-neon-green)", marginTop: "2px" }}>
                  🎯 navbat
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Board grid */}
      <div
        style={{
          marginTop: "8px",
          background: "var(--svoyak-surface, #0f1f3a)",
          border: "1px solid var(--svoyak-border)",
          borderRadius: "16px",
          padding: "10px",
        }}
      >
        <div style={{ fontSize: "11px", color: "var(--muted)", letterSpacing: "0.2em", marginBottom: "10px", textAlign: "center" }}>
          {canPick ? t("svoyak_board_pick_now") : t("svoyak_board_waiting_pick")}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {board.map((cell) => (
            <div key={cell.categoryId} style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <div
                style={{
                  flex: "0 0 84px",
                  fontFamily: "var(--svoyak-font-heading)",
                  fontSize: "11px",
                  fontWeight: 800,
                  color: "var(--svoyak-gold, #f5c842)",
                  padding: "8px 6px",
                  textAlign: "center",
                  letterSpacing: "0.04em",
                  lineHeight: 1.2,
                }}
              >
                <div style={{ fontSize: "18px", marginBottom: "2px" }}>{cell.categoryIcon}</div>
                {cell.categoryName.slice(0, 14)}
              </div>
              <div style={{ display: "flex", gap: "4px", flex: 1 }}>
                {SVOYAK_VALUE_TIERS.map((v) => {
                  const used = cell.usedValueTiers.includes(v);
                  const clickable = canPick && !used && !round;
                  return (
                    <button
                      key={v}
                      type="button"
                      disabled={!clickable}
                      onClick={() => handlePick(cell.categoryId, v)}
                      style={{
                        flex: 1,
                        padding: "12px 4px",
                        borderRadius: "10px",
                        border: clickable
                          ? "1.5px solid var(--svoyak-gold, #f5c842)"
                          : "1px solid var(--svoyak-border)",
                        background: used
                          ? "rgba(0,0,0,0.40)"
                          : clickable
                          ? "linear-gradient(135deg, rgba(245,200,66,0.20), rgba(255,138,76,0.10))"
                          : "rgba(255,255,255,0.03)",
                        color: used ? "rgba(255,255,255,0.20)" : "var(--svoyak-gold, #f5c842)",
                        fontFamily: "var(--svoyak-font-heading)",
                        fontSize: "16px",
                        fontWeight: 900,
                        cursor: clickable ? "pointer" : "not-allowed",
                        boxShadow: clickable ? "0 4px 10px -4px rgba(245,200,66,0.4)" : "none",
                        opacity: used ? 0.4 : 1,
                      }}
                    >
                      {v}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Host uchun yakuniy tugma */}
      <button
        type="button"
        onClick={async () => {
          await endGame(code).catch(() => {});
          onExit();
        }}
        style={{
          marginTop: "16px",
          width: "100%",
          padding: "12px",
          borderRadius: "12px",
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(255,59,92,0.10)",
          color: "var(--svoyak-neon-red, #ff3b5c)",
          fontSize: "13px",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        {isHost ? t("svoyak_board_exit_host") : t("svoyak_board_exit_player")}
      </button>
    </div>

    {/* Full-screen QuestionOverlay — aktiv raund bo'lsa */}
    <QuestionOverlay
      visible={Boolean(showOverlay && round)}
      categoryName={currentCategory?.categoryName ?? ""}
      categoryIcon={currentCategory?.categoryIcon ?? "🎲"}
      value={round?.value ?? 0}
      questionText={round?.questionText ?? ""}
      startedAt={round?.startedAt}
    >
      {round ? (
        <>
        {/* Slot: BUZZ tugma + javob input — vaziyatga qarab */}
        {round.status === "reading" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", alignItems: "center" }}>
            <div style={{ fontSize: "13px", color: "var(--svoyak-warning)" }}>
              {t("svoyak_q_reading")}
            </div>
            {isHost ? (
              <button
                type="button"
                onClick={handleOpenBuzz}
                style={{
                  padding: "13px 28px",
                  borderRadius: "999px",
                  border: "none",
                  background: "linear-gradient(135deg, #22e07f, #4DA6FF)",
                  color: "#0B0B14",
                  fontFamily: "var(--svoyak-font-heading)",
                  fontSize: "14px",
                  fontWeight: 900,
                  letterSpacing: "0.06em",
                  cursor: "pointer",
                  boxShadow: "0 8px 22px -6px rgba(34,224,127,0.55)",
                }}
              >
                {t("svoyak_q_open_buzz")}
              </button>
            ) : null}
          </div>
        ) : null}

        {round.status === "waiting_buzz" ? (
          isCoordinator ? (
            <div style={{ textAlign: "center", padding: "16px" }}>
              <div style={{ fontSize: "14px", color: "var(--svoyak-gold)", fontWeight: 700 }}>
                🎤 O'yinchilar javob kutilmoqda...
              </div>
              <button
                type="button"
                onClick={handleSkip}
                style={{
                  marginTop: "12px",
                  padding: "10px 24px",
                  borderRadius: "999px",
                  border: "1px solid rgba(255,255,255,0.15)",
                  background: "rgba(255,59,92,0.12)",
                  color: "var(--svoyak-neon-red, #ff3b5c)",
                  fontWeight: 700,
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                O'tkazib yuborish
              </button>
            </div>
          ) : (
            <BuzzOverlay state={buzzStateForViewer()} onPress={handleBuzz} blockedBy={blockedBy} />
          )
        ) : null}

        {round.status === "answering" ? (
          meIsWinner ? (
            <AnswerOverlay
              options={round.options}
              onAnswer={handleAnswer}
              onSkip={handleSkip}
            />
          ) : isCoordinator ? (
            <div style={{ textAlign: "center", padding: "16px" }}>
              <div style={{ fontSize: "14px", color: "var(--svoyak-gold)", fontWeight: 700 }}>
                🎤 Javob kutilmoqda...
              </div>
              <button
                type="button"
                onClick={handleSkip}
                style={{
                  marginTop: "12px",
                  padding: "10px 24px",
                  borderRadius: "999px",
                  border: "1px solid rgba(255,255,255,0.15)",
                  background: "rgba(255,59,92,0.12)",
                  color: "var(--svoyak-neon-red, #ff3b5c)",
                  fontWeight: 700,
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                Noto'g'ri / O'tkazish
              </button>
            </div>
          ) : (
            <BuzzOverlay state={buzzStateForViewer()} onPress={async () => {}} blockedBy={blockedBy} />
          )
        ) : null}
        </>
      ) : null}
    </QuestionOverlay>

    {/* Round result flash — completed/skipped, bir round uchun bir marta */}
    {showResultOverlay && round ? (
      <RoundResultOverlay
        correct={round.status === "skipped" ? null : round.answerCorrect === true}
        scoreDelta={round.scoreDelta}
        correctAnswer={round.correctAnswer}
        userAnswer={null}
        onDismiss={() => setDismissedResultRoundId(round.id)}
      />
    ) : null}
    </>
  );
}


