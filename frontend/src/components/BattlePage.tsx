import { useEffect, useRef, useState } from "react";
import { forfeitBattle, getBattleState, submitBattleAnswer } from "../api/client";
import type { BattleState, BattleTeamView } from "../types";
import { hapticResult } from "../utils/haptics";

type BattlePageProps = {
  battleId: string;
  currentUserId: number;
  onExit: () => void;
};

const POLL_INTERVAL_MS = 2000;
const POLL_BACKOFF_MS = 6000;
const TICK_INTERVAL_MS = 1000;

function memberLabel(member: BattleTeamView["members"][number], currentUserId: number): string {
  const name = member.firstName || (member.username ? `@${member.username}` : `#${member.telegramId}`);

  return member.telegramId === currentUserId && currentUserId !== 0 ? `${name} (siz)` : name;
}

function ScoreCard({
  team,
  highlight,
  align
}: {
  team: BattleTeamView;
  highlight: boolean;
  align: "left" | "right";
}) {
  return (
    <div
      style={{
        flex: 1,
        background: highlight
          ? "linear-gradient(135deg, rgba(77,166,255,0.18), rgba(124,58,237,0.18))"
          : "var(--card)",
        border: `1px solid ${highlight ? "var(--accent)" : "var(--border)"}`,
        borderRadius: "16px",
        padding: "14px 12px",
        textAlign: align === "left" ? "left" : "right"
      }}
    >
      <div
        style={{
          fontSize: "11px",
          color: "var(--muted)",
          letterSpacing: "1px",
          marginBottom: "4px",
          textTransform: "uppercase"
        }}
      >
        {highlight ? "SIZNING JAMOA" : "RAQIB"}
      </div>
      <div
        style={{
          fontSize: "15px",
          fontWeight: 800,
          color: "var(--text)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          marginBottom: "6px"
        }}
      >
        {team.name}
      </div>
      <div
        style={{
          fontSize: "34px",
          fontWeight: 900,
          color: "var(--gold)",
          lineHeight: 1
        }}
      >
        {team.score}
      </div>
    </div>
  );
}

function MembersStatus({ team, currentUserId }: { team: BattleTeamView; currentUserId: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <div
        style={{
          fontSize: "11px",
          color: "var(--muted)",
          letterSpacing: "1.5px",
          textTransform: "uppercase"
        }}
      >
        {team.name}
      </div>
      {team.members.map((member) => (
        <div
          key={member.telegramId}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            padding: "8px 12px",
            fontSize: "13px"
          }}
        >
          <span style={{ color: "var(--text)" }}>{memberLabel(member, currentUserId)}</span>
          <span style={{ color: member.answeredCurrentRound ? "var(--success)" : "var(--muted)", fontWeight: 700 }}>
            {member.answeredCurrentRound ? "✓" : "..."}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function BattlePage({ battleId, currentUserId, onExit }: BattlePageProps) {
  const [state, setState] = useState<BattleState | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; correctAnswer: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [exitConfirm, setExitConfirm] = useState(false);
  const [forfeiting, setForfeiting] = useState(false);
  // Ketma-ket muvaffaqiyatsiz polling sonini hisoblaymiz — agar 5+ marta
  // qaytib kela olmasa, "Chiqish" tugmasini ko'rsatamiz.
  const [failureCount, setFailureCount] = useState(0);
  const lastRoundIdRef = useRef<string | null>(null);
  const answerInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let active = true;
    let timeoutId: number | null = null;

    async function poll() {
      if (!active) {
        return;
      }

      // Brauzer tab orqada turganda polling'ni to'xtatib turamiz —
      // server resurslarini va batareyani tejaymiz, qaytib kelganda darhol yangilanadi.
      if (typeof document !== "undefined" && document.hidden) {
        scheduleNext(POLL_INTERVAL_MS);
        return;
      }

      const next = await getBattleState(battleId);

      if (!active) {
        return;
      }

      if (next) {
        setFailureCount(0);
        setState(next);

        if (next.currentRound) {
          setSecondsLeft(Math.ceil(next.currentRound.timeRemainingMs / 1000));
        }

        const newRoundId = next.currentRound?.roundId ?? null;

        if (newRoundId !== lastRoundIdRef.current) {
          lastRoundIdRef.current = newRoundId;
          setAnswer("");
          setFeedback(null);
          setErrorMessage("");
          // Yangi round kelganda input avtomatik focus — mobil'da qimmatli
          // sekundlarni tejaymiz, foydalanuvchi qo'l bilan tegma kerakmas.
          window.setTimeout(() => {
            answerInputRef.current?.focus();
          }, 0);
        }

        // Bellashuv tugagan bo'lsa endi qayta-qayta tekshirib o'tirishimiz shart emas.
        if (next.finished) {
          return;
        }

        scheduleNext(POLL_INTERVAL_MS);
      } else {
        // Server xato qaytarsa yoki tarmoq uzilsa — backoff bilan urinishni sekinlatamiz.
        setFailureCount((prev) => prev + 1);
        scheduleNext(POLL_BACKOFF_MS);
      }
    }

    function scheduleNext(delay: number) {
      if (!active) {
        return;
      }
      timeoutId = window.setTimeout(() => void poll(), delay);
    }

    function handleVisibilityChange() {
      if (!document.hidden) {
        if (timeoutId !== null) {
          window.clearTimeout(timeoutId);
        }
        void poll();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    void poll();

    return () => {
      active = false;

      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }

      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [battleId]);

  useEffect(() => {
    if (!state?.currentRound || state.finished) {
      return;
    }

    const id = window.setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, TICK_INTERVAL_MS);

    return () => {
      window.clearInterval(id);
    };
  }, [state?.currentRound?.roundId, state?.finished]);

  async function handleForfeit() {
    setForfeiting(true);
    await forfeitBattle(battleId);
    onExit();
  }

  async function handleSubmit() {
    if (!state?.currentRound || submitting || state.currentRound.myAnswered) {
      return;
    }

    const trimmed = answer.trim();

    if (!trimmed) {
      setErrorMessage("Javob yozing");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");
    const result = await submitBattleAnswer(battleId, state.currentRound.roundId, trimmed);
    setSubmitting(false);

    if (result.ok) {
      hapticResult(result.data.isCorrect ? "correct" : "incorrect");
      setFeedback({ isCorrect: result.data.isCorrect, correctAnswer: result.data.correctAnswer });
      const fresh = await getBattleState(battleId);

      if (fresh) {
        setState(fresh);
      }
    } else {
      setErrorMessage(result.error);
    }
  }

  if (!state) {
    const stuck = failureCount >= 3;
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg)",
          gap: "16px",
          padding: "24px"
        }}
      >
        <p style={{ color: "var(--muted)", fontSize: "14px", textAlign: "center" }}>
          {stuck
            ? "Bellashuv ma'lumotlarini olib bo'lmadi. Tarmoq aloqasini tekshiring."
            : "Yuklanmoqda..."}
        </p>
        {stuck ? (
          <button
            style={{
              padding: "12px 24px",
              background: "linear-gradient(135deg, #4DA6FF, #7C3AED)",
              border: "none",
              borderRadius: "12px",
              color: "white",
              fontSize: "14px",
              fontWeight: 700,
              cursor: "pointer"
            }}
            type="button"
            onClick={onExit}
          >
            Chiqish
          </button>
        ) : null}
      </div>
    );
  }

  const myIsChallenger = state.myTeamId === state.challengerTeam.id;
  const myTeam = myIsChallenger ? state.challengerTeam : state.opponentTeam;
  const otherTeam = myIsChallenger ? state.opponentTeam : state.challengerTeam;

  if (state.finished) {
    const iWon = state.winnerTeamId === state.myTeamId && state.myTeamId !== null;
    const isDraw = !state.winnerTeamId;
    const winningTeam =
      state.winnerTeamId === state.challengerTeam.id
        ? state.challengerTeam
        : state.winnerTeamId === state.opponentTeam.id
          ? state.opponentTeam
          : null;

    return (
      <div
        className="animate-scaleIn"
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg)",
          padding: "24px",
          textAlign: "center"
        }}
      >
        <div style={{ fontSize: "72px", marginBottom: "8px" }}>
          {isDraw ? "🤝" : iWon ? "🏆" : "😅"}
        </div>
        <div
          style={{
            fontSize: "13px",
            color: "var(--muted)",
            letterSpacing: "2px",
            marginBottom: "6px",
            textTransform: "uppercase"
          }}
        >
          {isDraw ? "Durang" : iWon ? "G'alaba" : "Mag'lubiyat"}
        </div>
        <div
          style={{
            fontSize: "26px",
            fontWeight: 900,
            background: "linear-gradient(135deg, #4DA6FF, #A78BFA)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            marginBottom: "20px"
          }}
        >
          {winningTeam ? winningTeam.name : "Hech kim"}
        </div>

        <div
          style={{
            display: "flex",
            gap: "12px",
            width: "100%",
            maxWidth: "360px",
            marginBottom: "24px"
          }}
        >
          <ScoreCard team={myTeam} highlight align="left" />
          <ScoreCard team={otherTeam} highlight={false} align="right" />
        </div>

        {iWon ? (
          <div style={{ fontSize: "13px", color: "var(--gold)", marginBottom: "20px" }}>
            Har a'zoga +5 bonus ball
          </div>
        ) : null}

        <button
          style={{
            width: "100%",
            maxWidth: "360px",
            padding: "16px",
            background: "linear-gradient(135deg, #4DA6FF, #7C3AED)",
            border: "none",
            borderRadius: "14px",
            fontSize: "16px",
            fontWeight: 800,
            color: "white",
            cursor: "pointer"
          }}
          type="button"
          onClick={onExit}
        >
          Tugatdim
        </button>
      </div>
    );
  }

  const round = state.currentRound;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg)",
        padding: "20px",
        maxWidth: "430px",
        margin: "0 auto"
      }}
    >
      {exitConfirm ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "24px"
          }}
        >
          <div
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "20px",
              padding: "28px 24px",
              textAlign: "center",
              width: "100%",
              maxWidth: "320px"
            }}
          >
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>🏳️</div>
            <div style={{ fontSize: "17px", fontWeight: 800, color: "var(--text)", marginBottom: "8px" }}>
              Bellashuvdan chiqasizmi?
            </div>
            <div style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "24px" }}>
              Chiqsangiz, raqib g'olib deb hisoblanadi
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                disabled={forfeiting}
                style={{
                  flex: 1,
                  padding: "13px",
                  background: "var(--border)",
                  border: "none",
                  borderRadius: "12px",
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "var(--text)",
                  cursor: "pointer"
                }}
                type="button"
                onClick={() => setExitConfirm(false)}
              >
                Qolish
              </button>
              <button
                disabled={forfeiting}
                style={{
                  flex: 1,
                  padding: "13px",
                  background: "linear-gradient(135deg, #ef4444, #b91c1c)",
                  border: "none",
                  borderRadius: "12px",
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "white",
                  cursor: forfeiting ? "not-allowed" : "pointer",
                  opacity: forfeiting ? 0.6 : 1
                }}
                type="button"
                onClick={() => void handleForfeit()}
              >
                {forfeiting ? "..." : "Chiqish"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "14px"
        }}
      >
        <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text)" }}>
          Bellashuv {round ? `· Round ${round.roundNumber}/${round.totalRounds}` : ""}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span
            style={{
              fontSize: "16px",
              fontWeight: 800,
              color: secondsLeft <= 5 ? "var(--error)" : secondsLeft <= 10 ? "var(--warning)" : "var(--accent)"
            }}
          >
            ⏱ {secondsLeft}s
          </span>
          <button
            style={{
              background: "rgba(239,68,68,0.15)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: "8px",
              color: "var(--error)",
              fontSize: "12px",
              fontWeight: 700,
              padding: "5px 10px",
              cursor: "pointer"
            }}
            type="button"
            onClick={() => setExitConfirm(true)}
          >
            Tark etish
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "18px" }}>
        <ScoreCard team={myTeam} highlight align="left" />
        <ScoreCard team={otherTeam} highlight={false} align="right" />
      </div>

      {round ? (
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "20px",
            padding: "24px 18px",
            fontSize: "17px",
            fontWeight: 700,
            color: "var(--text)",
            textAlign: "center",
            lineHeight: 1.5,
            marginBottom: "16px",
            userSelect: "none"
          }}
        >
          {round.questionText || "Savol yuklanmoqda..."}
        </div>
      ) : null}

      {round && !round.myAnswered ? (
        <div style={{ marginBottom: "16px" }}>
          <input
            placeholder="Javobingiz..."
            style={{
              width: "100%",
              padding: "15px 16px",
              background: "var(--card)",
              border: "1.5px solid var(--border)",
              borderRadius: "12px",
              fontSize: "15px",
              color: "var(--text)",
              outline: "none",
              marginBottom: "10px"
            }}
            type="text"
            value={answer}
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            enterKeyHint="send"
            inputMode="text"
            ref={answerInputRef}
            onChange={(event) => {
              setAnswer(event.target.value);
              setErrorMessage("");
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void handleSubmit();
              }
            }}
          />
          {errorMessage ? (
            <div style={{ fontSize: "12px", color: "var(--error)", marginBottom: "8px" }}>
              {errorMessage}
            </div>
          ) : null}
          <button
            disabled={!answer.trim() || submitting}
            style={{
              width: "100%",
              padding: "14px",
              background: !answer.trim() || submitting ? "var(--border)" : "var(--accent)",
              border: "none",
              borderRadius: "12px",
              fontSize: "15px",
              fontWeight: 800,
              color: "white",
              cursor: !answer.trim() || submitting ? "not-allowed" : "pointer",
              opacity: !answer.trim() || submitting ? 0.6 : 1
            }}
            type="button"
            onClick={() => void handleSubmit()}
          >
            {submitting ? "Yuborilmoqda..." : "Javob berish"}
          </button>
        </div>
      ) : round && round.myAnswered ? (
        <div
          style={{
            background: feedback?.isCorrect
              ? "rgba(34,197,94,0.12)"
              : feedback?.isCorrect === false
                ? "rgba(239,68,68,0.10)"
                : "var(--card)",
            border: `1px solid ${
              feedback?.isCorrect
                ? "rgba(34,197,94,0.3)"
                : feedback?.isCorrect === false
                  ? "rgba(239,68,68,0.3)"
                  : "var(--border)"
            }`,
            borderRadius: "14px",
            padding: "14px",
            marginBottom: "16px",
            textAlign: "center"
          }}
        >
          <div
            style={{
              fontSize: "14px",
              fontWeight: 700,
              color: feedback?.isCorrect
                ? "var(--success)"
                : feedback?.isCorrect === false
                  ? "var(--error)"
                  : "var(--text)"
            }}
          >
            {feedback?.isCorrect ? "✓ To'g'ri!" : feedback?.isCorrect === false ? "✗ Noto'g'ri" : "Javobingiz qabul qilindi"}
          </div>
          <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "4px" }}>
            Boshqalarni kuting yoki vaqt tugashini kuting
          </div>
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <MembersStatus team={myTeam} currentUserId={currentUserId} />
        <MembersStatus team={otherTeam} currentUserId={currentUserId} />
      </div>
    </div>
  );
}
