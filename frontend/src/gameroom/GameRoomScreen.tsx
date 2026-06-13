/**
 * Online O'yin Xonasi — ishtirokchi uchun asosiy ekran.
 *
 * Uchta holat:
 *   waiting  → Lobby: "Admin o'yinni boshlashini kuting"
 *   active   → Aktiv savol (text/image/audio) + countdown + javob inputi
 *   finished → Yakuniy reyting (🥇🥈🥉)
 *
 * Layout: QuestionCard'dagi `100dvh` + flex yondashuvi saqlanadi.
 * Timer: useTimer hook'dan foydalanib, server `timeRemainingMs` bilan sync.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { submitGameRoomAnswer } from "../api/client";
import { useTimer } from "../hooks/useTimer";
import { useGameRoom } from "./useGameRoom";
import { useAuthedMedia } from "./useAuthedMedia";
import type { GameRoomParticipant, GameRoomQuestion, GameRoomState } from "../types";
import { hapticTap } from "../utils/haptics";

// ─── Layout konstantalari ─────────────────────────────────────────────────────

const PAGE_STYLE = {
  height: "100dvh",
  display: "flex",
  flexDirection: "column" as const,
  background: "var(--bg)",
  maxWidth: "430px",
  margin: "0 auto",
  boxSizing: "border-box" as const,
  overflow: "hidden" as const,
};

const CARD_STYLE = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "20px",
  padding: "16px",
} as const;

// ─── Asosiy komponent ─────────────────────────────────────────────────────────

type Props = {
  roomCode: string;
  playerName: string;
  onExit: () => void;
};

export default function GameRoomScreen({ roomCode, playerName, onExit }: Props) {
  const { data, isLoading, error, failureCount, refetch } = useGameRoom(roomCode);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // O'yin tugaganda
  useEffect(() => {
    if (data?.status === "finished") {
      setShowLeaderboard(false);
    }
  }, [data?.status]);

  if (isLoading && !data) {
    return (
      <div style={{ ...PAGE_STYLE, alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "32px", marginBottom: "12px" }}>🎮</div>
          <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--text)" }}>
            Yuklanmoqda...
          </div>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div style={{ ...PAGE_STYLE, alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <div style={{ textAlign: "center", width: "100%" }}>
          <div style={{ fontSize: "36px", marginBottom: "12px" }}>⚠️</div>
          <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--text)", marginBottom: "6px" }}>
            Ulanishda xato
          </div>
          <div style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "20px" }}>
            {error}
          </div>
          <button type="button" onClick={onExit} style={btnSecondary}>
            Orqaga qaytish
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // Yakuniy reyting
  if (data.status === "finished") {
    return <FinishedView data={data} onExit={onExit} />;
  }

  // Leaderboard overlay
  if (showLeaderboard) {
    return (
      <LeaderboardView
        participants={data.leaderboard}
        viewerTelegramId={data.viewerTelegramId}
        roomName={data.name}
        status={data.status}
        onClose={() => setShowLeaderboard(false)}
      />
    );
  }

  // Kutish (lobby)
  if (data.status === "waiting") {
    return (
      <WaitingView
        data={data}
        failureCount={failureCount}
        onShowLeaderboard={() => setShowLeaderboard(true)}
        onExit={onExit}
      />
    );
  }

  // Aktiv (o'yin jarayonida)
  return (
    <ActiveView
      data={data}
      playerName={playerName}
      failureCount={failureCount}
      refetch={refetch}
      onShowLeaderboard={() => setShowLeaderboard(true)}
      onExit={onExit}
    />
  );
}

// ─── Kutish ekrani ────────────────────────────────────────────────────────────

function WaitingView({
  data,
  failureCount,
  onShowLeaderboard,
  onExit,
}: {
  data: GameRoomState;
  failureCount: number;
  onShowLeaderboard: () => void;
  onExit: () => void;
}) {
  return (
    <div
      style={{
        ...PAGE_STYLE,
        padding: "24px 20px",
        paddingBottom: "calc(24px + env(safe-area-inset-bottom, 0px))",
        overflowY: "auto" as const,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <button type="button" onClick={onExit} style={btnIcon} aria-label="Chiqish">
          ✕
        </button>
        <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>
          Online O'yin Xonasi
        </div>
        <button type="button" onClick={onShowLeaderboard} style={btnIcon} aria-label="Reyting">
          🏅
        </button>
      </div>

      {/* Xona nomi */}
      <div style={{ textAlign: "center", marginBottom: "28px" }}>
        <div style={{ fontSize: "28px", marginBottom: "10px" }}>🎮</div>
        <div style={{ fontSize: "20px", fontWeight: 900, color: "var(--text)", marginBottom: "4px" }}>
          {data.name}
        </div>
        <div
          style={{
            display: "inline-block",
            background: "rgba(77,166,255,0.12)",
            border: "1px solid rgba(77,166,255,0.3)",
            borderRadius: "8px",
            padding: "4px 12px",
            fontSize: "13px",
            fontWeight: 700,
            color: "var(--accent)",
            letterSpacing: "2px",
          }}
        >
          {data.code}
        </div>
      </div>

      {/* Kutish xabari */}
      <div
        style={{
          ...CARD_STYLE,
          textAlign: "center",
          marginBottom: "16px",
        }}
      >
        <div style={{ fontSize: "32px", marginBottom: "10px" }}>⏳</div>
        <div style={{ fontSize: "16px", fontWeight: 800, color: "var(--text)", marginBottom: "6px" }}>
          Admin o'yinni boshlashini kuting...
        </div>
        <div style={{ fontSize: "13px", color: "var(--muted)" }}>
          Siz xonaga kirgansiz. O'yin boshlanishi bilanoq savollar ko'rinadi.
        </div>
      </div>

      {/* Ishtirokchilar soni */}
      <div
        style={{
          ...CARD_STYLE,
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        <span style={{ fontSize: "22px" }}>👥</span>
        <div>
          <div style={{ fontSize: "14px", fontWeight: 800, color: "var(--text)" }}>
            {data.participantCount} ishtirokchi
          </div>
          <div style={{ fontSize: "12px", color: "var(--muted)" }}>
            xonaga qo'shilgan
          </div>
        </div>
      </div>

      {/* Ishtirokchilar ro'yxati */}
      {data.leaderboard.length > 0 && (
        <div style={{ ...CARD_STYLE, marginBottom: "16px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", letterSpacing: "1.5px", marginBottom: "10px" }}>
            ISHTIROKCHILAR
          </div>
          {data.leaderboard.map((p) => (
            <div
              key={p.telegramId}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "7px 0",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #4DA6FF, #7C3AED)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "13px",
                  fontWeight: 800,
                  color: "white",
                  flex: "0 0 auto",
                }}
              >
                {p.displayName[0]?.toUpperCase() ?? "?"}
              </div>
              <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)" }}>
                {p.displayName}
              </span>
            </div>
          ))}
        </div>
      )}

      {failureCount > 2 && (
        <div style={{ fontSize: "12px", color: "var(--muted)", textAlign: "center", marginBottom: "8px" }}>
          Ulanish muammosi — qayta urinilmoqda...
        </div>
      )}
    </div>
  );
}

// ─── Aktiv savol ekrani ───────────────────────────────────────────────────────

function ActiveView({
  data,
  playerName,
  failureCount,
  refetch,
  onShowLeaderboard,
  onExit,
}: {
  data: GameRoomState;
  playerName: string;
  failureCount: number;
  refetch: () => Promise<void>;
  onShowLeaderboard: () => void;
  onExit: () => void;
}) {
  const q = data.currentQuestion;

  if (!q) {
    // Savol yo'q — keyingi savol kutilmoqda
    return (
      <div style={{ ...PAGE_STYLE, alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", width: "100%", position: "absolute", top: "16px", left: 0, right: 0, padding: "0 16px", boxSizing: "border-box" }}>
          <button type="button" onClick={onExit} style={btnIcon}>✕</button>
          <button type="button" onClick={onShowLeaderboard} style={btnIcon}>🏅</button>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "32px", marginBottom: "12px" }}>⏳</div>
          <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--text)" }}>
            Keyingi savol tayyorlanmoqda...
          </div>
          <div style={{ fontSize: "13px", color: "var(--muted)", marginTop: "6px" }}>
            {data.name}
          </div>
        </div>
      </div>
    );
  }

  return (
    <QuestionView
      roomCode={data.code}
      question={q}
      viewerTelegramId={data.viewerTelegramId}
      roomName={data.name}
      participantCount={data.participantCount}
      failureCount={failureCount}
      refetch={refetch}
      onShowLeaderboard={onShowLeaderboard}
      onExit={onExit}
    />
  );
}

// ─── Savol komponenti ─────────────────────────────────────────────────────────

function QuestionView({
  roomCode,
  question,
  viewerTelegramId,
  roomName,
  participantCount,
  failureCount,
  refetch,
  onShowLeaderboard,
  onExit,
}: {
  roomCode: string;
  question: GameRoomQuestion;
  viewerTelegramId: number;
  roomName: string;
  participantCount: number;
  failureCount: number;
  refetch: () => Promise<void>;
  onShowLeaderboard: () => void;
  onExit: () => void;
}) {
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [savedAnswer, setSavedAnswer] = useState<string | null>(
    question.mySubmission?.answerText ?? null,
  );
  const submitBtnRef = useRef<HTMLButtonElement | null>(null);
  const lastQuestionIdRef = useRef<number | null>(null);

  // Server tomonidan kelgan timeRemainingMs asosida taymer o'rnatamiz.
  const initialSecs = Math.max(1, Math.ceil(question.timeRemainingMs / 1000));
  const isDeadlinePassed = question.isExpired || question.status === "closed";

  const handleTimerExpire = useCallback(() => {
    // Timer tugadi — server allaqachon reject qiladi, shunchaki UI'ni yangilaymiz
    void refetch();
  }, [refetch]);

  const { timeLeft, start, resetWithSeconds } = useTimer(initialSecs, handleTimerExpire);

  // Yangi savol kelganda taymer reset + state tozalash
  useEffect(() => {
    if (question.id === lastQuestionIdRef.current) return;
    lastQuestionIdRef.current = question.id;
    setAnswer("");
    setSubmitError("");
    setSavedAnswer(question.mySubmission?.answerText ?? null);

    if (!isDeadlinePassed) {
      const secs = Math.max(1, Math.ceil(question.timeRemainingMs / 1000));
      resetWithSeconds(secs);
      start();
    }
  }, [question.id, question.timeRemainingMs, question.mySubmission, isDeadlinePassed, resetWithSeconds, start]);

  // Klaviatura chiqganda submit tugmasini ko'rinadigan joyga ko'taramiz
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const handler = () => {
      const isKeyboardOpen = vv.height < window.innerHeight - 100;
      if (isKeyboardOpen && submitBtnRef.current) {
        submitBtnRef.current.scrollIntoView({ block: "end", behavior: "smooth" });
      }
    };
    vv.addEventListener("resize", handler);
    return () => vv.removeEventListener("resize", handler);
  }, []);

  const timeRatio = question.timeLimitSeconds > 0 ? timeLeft / question.timeLimitSeconds : 0;
  const timerColor =
    isDeadlinePassed
      ? "var(--muted)"
      : timeRatio > 0.5
        ? "var(--accent)"
        : timeRatio > 0.25
          ? "var(--warning, #f59e0b)"
          : "var(--error)";
  const circumference = 2 * Math.PI * 28;
  const strokeDashoffset = circumference * (1 - (isDeadlinePassed ? 0 : timeRatio));

  async function handleSubmit() {
    const trimmed = answer.trim();
    if (!trimmed || submitting) return;
    hapticTap();
    setSubmitting(true);
    setSubmitError("");
    try {
      const result = await submitGameRoomAnswer(roomCode, question.id, trimmed);
      if (result.ok) {
        setSavedAnswer(trimmed);
        // Oxirgi saqlangan javobni tahrirlamoqchi bo'lsa — input tozalanmaydi,
        // foydalanuvchi davom etaveradi.
        await refetch();
      } else {
        setSubmitError(result.error);
      }
    } catch {
      setSubmitError("Javobni yuborib bo'lmadi. Qayta urinib ko'ring.");
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = !isDeadlinePassed && answer.trim().length > 0 && !submitting;

  return (
    <div style={PAGE_STYLE}>
      {/* Yuqori panel */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px 8px",
          flexShrink: 0,
        }}
      >
        <button type="button" onClick={onExit} style={btnIcon} aria-label="Chiqish">
          ✕
        </button>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text)" }}>{roomName}</div>
          <div style={{ fontSize: "11px", color: "var(--muted)" }}>
            {participantCount} ishtirokchi
            {question.isBonus ? " · 🌟 Bonus" : ""}
            {question.isQuick ? " · ⚡ Tez" : ""}
          </div>
        </div>
        <button type="button" onClick={onShowLeaderboard} style={btnIcon} aria-label="Reyting">
          🏅
        </button>
      </div>

      {/* Asosiy kontent — flex:1, minHeight:0 */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          padding: "0 16px",
          gap: "10px",
          overflowY: "auto" as const,
          overscrollBehavior: "contain",
        }}
      >
        {/* Savol kartasi */}
        <div
          style={{
            ...CARD_STYLE,
            flex: "1 1 auto",
            minHeight: "80px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Tur + ball */}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", flexShrink: 0 }}>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "var(--accent)",
                letterSpacing: "1.5px",
              }}
            >
              {question.questionType === "text"
                ? "SAVOL"
                : question.questionType === "image"
                  ? "📷 RASM"
                  : "🎵 AUDIO"}
            </span>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "var(--gold, #f5c842)",
                background: "rgba(245,200,66,0.12)",
                border: "1px solid rgba(245,200,66,0.25)",
                borderRadius: "6px",
                padding: "2px 8px",
              }}
            >
              {question.pointValue} ball
            </span>
          </div>

          {/* Media — rasm yoki audio */}
          <QuestionMedia question={question} />

          {/* Savol matni */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              fontSize: "16px",
              fontWeight: 700,
              color: "var(--text)",
              lineHeight: 1.55,
              textAlign: "center",
              userSelect: "none",
              WebkitUserSelect: "none",
              padding: "4px 0 8px",
            }}
          >
            {question.body}
          </div>
        </div>

        {/* Timer halqasi */}
        <div style={{ display: "flex", justifyContent: "center", flexShrink: 0 }}>
          <svg width="70" height="70" viewBox="0 0 70 70">
            <circle cx="35" cy="35" r={28} fill="none" stroke="var(--border)" strokeWidth="5" />
            <circle
              cx="35"
              cy="35"
              r={28}
              fill="none"
              stroke={timerColor}
              strokeWidth="5"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform="rotate(-90 35 35)"
              style={{ transition: "stroke-dashoffset 1s linear, stroke 0.5s" }}
            />
            <text
              x="35"
              y="35"
              textAnchor="middle"
              dominantBaseline="central"
              fill={timerColor}
              fontSize="17"
              fontWeight="900"
              style={{ transition: "fill 0.5s" }}
            >
              {isDeadlinePassed ? "✓" : timeLeft}
            </text>
          </svg>
        </div>

        {/* Javob qismi */}
        <div style={{ flexShrink: 0, paddingBottom: "calc(16px + env(safe-area-inset-bottom, 0px))" }}>
          {isDeadlinePassed ? (
            /* Deadline o'tgan — javobni ko'rsatamiz */
            <ClosedQuestionResult question={question} />
          ) : (
            /* Aktiv — input + submit */
            <>
              {savedAnswer && (
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "var(--success, #22c55e)",
                    background: "rgba(34,197,94,0.1)",
                    border: "1px solid rgba(34,197,94,0.25)",
                    borderRadius: "10px",
                    padding: "8px 12px",
                    marginBottom: "8px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <span>✓</span>
                  <span>Javobingiz saqlandi — tahrirlashingiz mumkin</span>
                </div>
              )}
              <input
                type="text"
                placeholder={savedAnswer ? `Avvalgi: "${savedAnswer}" — o'zgartirish uchun yozing` : "Javobingizni yozing..."}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canSubmit) void handleSubmit();
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "var(--accent)";
                  e.target.style.boxShadow = "0 0 0 3px rgba(77,166,255,0.12)";
                  window.setTimeout(() => {
                    submitBtnRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
                  }, 350);
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "var(--border)";
                  e.target.style.boxShadow = "none";
                }}
                disabled={submitting}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                enterKeyHint="send"
                style={{
                  width: "100%",
                  padding: "13px 16px",
                  background: "var(--card)",
                  border: "1.5px solid var(--border)",
                  borderRadius: "14px",
                  fontSize: "15px",
                  color: "var(--text)",
                  outline: "none",
                  marginBottom: "8px",
                  boxSizing: "border-box",
                  transition: "border-color 0.2s, box-shadow 0.2s",
                }}
              />
              {submitError && (
                <div style={{ fontSize: "12px", color: "var(--error)", marginBottom: "6px" }}>
                  {submitError}
                </div>
              )}
              <button
                ref={submitBtnRef}
                type="button"
                disabled={!canSubmit}
                onClick={() => void handleSubmit()}
                style={{
                  width: "100%",
                  padding: "14px",
                  borderRadius: "14px",
                  border: "none",
                  background: canSubmit ? "var(--accent)" : "var(--border)",
                  color: canSubmit ? "white" : "var(--muted)",
                  fontSize: "15px",
                  fontWeight: 700,
                  cursor: canSubmit ? "pointer" : "not-allowed",
                  opacity: canSubmit ? 1 : 0.5,
                  transition: "all 0.2s",
                }}
              >
                {submitting
                  ? "Yuborilmoqda..."
                  : savedAnswer
                    ? "Javobni yangilash ✓"
                    : "Javob berish ✓"}
              </button>
              {failureCount > 2 && (
                <div style={{ fontSize: "11px", color: "var(--muted)", textAlign: "center", marginTop: "6px" }}>
                  Ulanish muammosi...
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Media komponenti ─────────────────────────────────────────────────────────

/**
 * QuestionMedia — savol turига qarab rasm, audio yoki bo'sh qaytaradi.
 *
 * mediaUrl (backend proxy yoki mutlaq URL) mavjud bo'lsa ishlatiladi.
 * Nisbiy URL (/api/...) bo'lsa useAuthedMedia orqali autentifikatsiyalangan
 * blob sifatida yuklanadi. Mutlaq http(s) URL bo'lsa to'g'ridan-to'g'ri src'ga qo'yiladi.
 */
function QuestionMedia({ question }: { question: GameRoomQuestion }) {
  // mediaUrl mavjud bo'lsa uni, aks holda mediaRef (http URL bo'lsa) ishlatamiz.
  const rawUrl: string | null | undefined =
    question.mediaUrl != null
      ? question.mediaUrl
      : question.mediaRef?.startsWith("http")
        ? question.mediaRef
        : null;

  const media = useAuthedMedia(
    question.questionType !== "text" ? rawUrl : null,
  );

  if (question.questionType === "text") return null;

  // Media URL yo'q (ne mediaUrl, ne ishlatilishi mumkin bo'lgan mediaRef)
  if (!rawUrl) return null;

  // Yuklanmoqda
  if (media.status === "loading") {
    return (
      <div
        style={{
          background: "rgba(77,166,255,0.06)",
          border: "1px dashed rgba(77,166,255,0.25)",
          borderRadius: "12px",
          padding: "16px",
          textAlign: "center",
          marginBottom: "10px",
          flexShrink: 0,
        }}
      >
        <div style={{ fontSize: "22px", marginBottom: "6px" }}>
          {question.questionType === "image" ? "🖼" : "🎵"}
        </div>
        <div style={{ fontSize: "12px", color: "var(--muted)" }}>Yuklanmoqda...</div>
      </div>
    );
  }

  // Xato
  if (media.status === "error") {
    return (
      <div
        style={{
          background: "rgba(239,68,68,0.06)",
          border: "1px dashed rgba(239,68,68,0.25)",
          borderRadius: "12px",
          padding: "14px",
          textAlign: "center",
          marginBottom: "10px",
          flexShrink: 0,
        }}
      >
        <div style={{ fontSize: "12px", color: "var(--muted)", marginBottom: question.caption ? "6px" : 0 }}>
          {question.questionType === "image"
            ? "Rasmni yuklab bo'lmadi"
            : "Audioni yuklab bo'lmadi"}
        </div>
        {question.caption && (
          <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text)" }}>
            {question.caption}
          </div>
        )}
      </div>
    );
  }

  // Tayyor
  if (media.status === "ready") {
    if (question.questionType === "image") {
      return (
        <div style={{ marginBottom: "10px", flexShrink: 0, borderRadius: "12px", overflow: "hidden" }}>
          <img
            src={media.url}
            alt={question.caption ?? "Savol rasmi"}
            style={{ width: "100%", maxHeight: "220px", objectFit: "contain", background: "var(--bg)", display: "block" }}
          />
          {question.caption && (
            <div style={{ fontSize: "12px", color: "var(--muted)", textAlign: "center", padding: "6px" }}>
              {question.caption}
            </div>
          )}
        </div>
      );
    }

    if (question.questionType === "audio") {
      return (
        <div style={{ marginBottom: "10px", flexShrink: 0 }}>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio
            controls
            src={media.url}
            style={{ width: "100%", borderRadius: "10px" }}
          />
          {question.caption && (
            <div style={{ fontSize: "12px", color: "var(--muted)", textAlign: "center", marginTop: "4px" }}>
              {question.caption}
            </div>
          )}
        </div>
      );
    }
  }

  return null;
}

// ─── Yopilgan savol natijasi ──────────────────────────────────────────────────

function ClosedQuestionResult({ question }: { question: GameRoomQuestion }) {
  const sub = question.mySubmission;

  if (!sub) {
    return (
      <div
        style={{
          ...CARD_STYLE,
          textAlign: "center",
          color: "var(--muted)",
        }}
      >
        <div style={{ fontSize: "20px", marginBottom: "6px" }}>⏰</div>
        <div style={{ fontSize: "14px", fontWeight: 600 }}>
          Vaqt tugadi — javob berilmagan
        </div>
        {question.correctAnswer && (
          <div style={{ marginTop: "10px" }}>
            <div style={{ fontSize: "11px", color: "var(--muted)", letterSpacing: "1.5px" }}>
              TO'G'RI JAVOB
            </div>
            <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--success, #22c55e)", marginTop: "4px" }}>
              {question.correctAnswer}
            </div>
          </div>
        )}
        <div style={{ fontSize: "13px", color: "var(--muted)", marginTop: "8px" }}>
          Keyingi savolni kuting...
        </div>
      </div>
    );
  }

  const isGraded = sub.isCorrect !== null;
  const isCorrect = sub.isCorrect === true;

  return (
    <div
      style={{
        ...CARD_STYLE,
        background: isGraded
          ? isCorrect
            ? "rgba(34,197,94,0.1)"
            : "rgba(239,68,68,0.08)"
          : "var(--card)",
        border: `1px solid ${
          isGraded
            ? isCorrect
              ? "rgba(34,197,94,0.3)"
              : "rgba(239,68,68,0.25)"
            : "var(--border)"
        }`,
        textAlign: "center",
      }}
    >
      {isGraded ? (
        <>
          <div style={{ fontSize: "28px", marginBottom: "6px" }}>
            {isCorrect ? "✅" : "❌"}
          </div>
          <div
            style={{
              fontSize: "15px",
              fontWeight: 800,
              color: isCorrect ? "var(--success, #22c55e)" : "var(--error)",
              marginBottom: "4px",
            }}
          >
            {isCorrect ? "To'g'ri!" : "Noto'g'ri"}
          </div>
          {isCorrect && sub.pointsAwarded !== null && sub.pointsAwarded > 0 && (
            <div style={{ fontSize: "13px", color: "var(--gold, #f5c842)", fontWeight: 700 }}>
              +{sub.pointsAwarded} ball
            </div>
          )}
        </>
      ) : (
        <>
          <div style={{ fontSize: "20px", marginBottom: "6px" }}>⏳</div>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)", marginBottom: "4px" }}>
            Javobingiz: "{sub.answerText}"
          </div>
          <div style={{ fontSize: "12px", color: "var(--muted)" }}>
            Admin baholamoqda...
          </div>
        </>
      )}
      {question.correctAnswer && (
        <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: "1px solid var(--border)" }}>
          <div style={{ fontSize: "11px", color: "var(--muted)", letterSpacing: "1.5px" }}>
            TO'G'RI JAVOB
          </div>
          <div style={{ fontSize: "16px", fontWeight: 800, color: "var(--success, #22c55e)", marginTop: "4px" }}>
            {question.correctAnswer}
          </div>
        </div>
      )}
      <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "8px" }}>
        Keyingi savolni kuting...
      </div>
    </div>
  );
}

// ─── Reyting overlay ──────────────────────────────────────────────────────────

function LeaderboardView({
  participants,
  viewerTelegramId,
  roomName,
  status,
  onClose,
}: {
  participants: GameRoomParticipant[];
  viewerTelegramId: number;
  roomName: string;
  status: string;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        ...PAGE_STYLE,
        padding: "24px 20px",
        paddingBottom: "calc(24px + env(safe-area-inset-bottom, 0px))",
        overflowY: "auto" as const,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <button type="button" onClick={onClose} style={btnIcon} aria-label="Yopish">
          ✕
        </button>
        <div style={{ fontSize: "15px", fontWeight: 800, color: "var(--text)" }}>
          Joriy Reyting
        </div>
        <div style={{ width: "36px" }} />
      </div>

      <div style={{ fontSize: "13px", color: "var(--muted)", textAlign: "center", marginBottom: "16px" }}>
        {roomName}
      </div>

      {participants.length === 0 ? (
        <div style={{ textAlign: "center", color: "var(--muted)", marginTop: "40px" }}>
          Hali hech kim javob bermadi
        </div>
      ) : (
        <div style={CARD_STYLE}>
          {participants.map((p, i) => {
            const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
            const isMe = p.telegramId === viewerTelegramId;
            return (
              <div
                key={p.telegramId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 8px",
                  borderRadius: "12px",
                  background: isMe ? "rgba(77,166,255,0.1)" : "transparent",
                  border: isMe ? "1px solid rgba(77,166,255,0.25)" : "1px solid transparent",
                  marginBottom: "4px",
                }}
              >
                <span style={{ fontSize: "17px", width: "24px", textAlign: "center" }}>
                  {medal ?? `#${i + 1}`}
                </span>
                <span style={{ flex: 1, fontSize: "14px", fontWeight: isMe ? 800 : 600, color: "var(--text)" }}>
                  {p.displayName}
                  {isMe && (
                    <span style={{ fontSize: "11px", color: "var(--accent)", marginLeft: "6px" }}>
                      (siz)
                    </span>
                  )}
                </span>
                <span
                  style={{
                    fontSize: "16px",
                    fontWeight: 900,
                    color: p.totalPoints > 0 ? "var(--gold, #f5c842)" : "var(--muted)",
                  }}
                >
                  {p.totalPoints}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {status === "active" && (
        <div style={{ fontSize: "12px", color: "var(--muted)", textAlign: "center", marginTop: "16px" }}>
          Reyting real-vaqtda yangilanadi
        </div>
      )}
    </div>
  );
}

// ─── Yakuniy reyting ──────────────────────────────────────────────────────────

function FinishedView({ data, onExit }: { data: GameRoomState; onExit: () => void }) {
  const sorted = [...data.leaderboard];
  const myId = data.viewerTelegramId;
  const me = sorted.find((p) => p.telegramId === myId);

  return (
    <div
      style={{
        minHeight: "100dvh",
        background:
          "radial-gradient(140% 80% at 50% 0%, rgba(245,200,66,0.14), transparent 50%)," +
          "var(--bg)",
        padding: "32px 20px",
        paddingBottom: "calc(32px + env(safe-area-inset-bottom, 0px))",
        maxWidth: "430px",
        margin: "0 auto",
        boxSizing: "border-box",
        overflowY: "auto",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: "24px" }}>
        <div style={{ fontSize: "52px", marginBottom: "8px" }}>🏆</div>
        <div
          style={{
            fontSize: "24px",
            fontWeight: 900,
            background: "linear-gradient(120deg, #FFFFFF 0%, #f5c842 60%, #FF8A4C 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            marginBottom: "4px",
          }}
        >
          O'yin yakunlandi!
        </div>
        <div style={{ fontSize: "14px", color: "var(--muted)" }}>{data.name}</div>
      </div>

      {/* Mening natijam */}
      {me && (
        <div
          style={{
            ...CARD_STYLE,
            background: "rgba(77,166,255,0.1)",
            border: "1px solid rgba(77,166,255,0.3)",
            textAlign: "center",
            marginBottom: "16px",
          }}
        >
          <div style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "4px", letterSpacing: "1px" }}>
            MENING NATIJAM
          </div>
          <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text)", marginBottom: "2px" }}>
            {me.displayName}
          </div>
          <div style={{ fontSize: "28px", fontWeight: 900, color: "var(--gold, #f5c842)" }}>
            {me.totalPoints} ball
          </div>
          <div style={{ fontSize: "13px", color: "var(--muted)" }}>
            #{me.rank}-o'rin
          </div>
        </div>
      )}

      {/* Reyting */}
      <div style={CARD_STYLE}>
        <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", letterSpacing: "1.5px", marginBottom: "12px" }}>
          YAKUNIY REYTING
        </div>
        {sorted.map((p, i) => {
          const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
          const isMe = p.telegramId === myId;
          return (
            <div
              key={p.telegramId}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 8px",
                borderBottom: i < sorted.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                background: isMe ? "rgba(77,166,255,0.06)" : "transparent",
                borderRadius: "10px",
              }}
            >
              <span style={{ fontSize: "18px", width: "24px", textAlign: "center" }}>
                {medal ?? `#${i + 1}`}
              </span>
              <span
                style={{
                  flex: 1,
                  fontSize: "14px",
                  fontWeight: isMe ? 800 : 600,
                  color: "var(--text)",
                }}
              >
                {p.displayName}
                {isMe && (
                  <span style={{ fontSize: "11px", color: "var(--accent)", marginLeft: "5px" }}>
                    (siz)
                  </span>
                )}
              </span>
              <span
                style={{
                  fontSize: "17px",
                  fontWeight: 900,
                  color: p.totalPoints > 0 ? "var(--gold, #f5c842)" : "var(--muted)",
                }}
              >
                {p.totalPoints}
              </span>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onExit}
        style={{
          width: "100%",
          marginTop: "20px",
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
        Bosh menyu
      </button>
    </div>
  );
}

// ─── Umumiy stil yordamchilari ────────────────────────────────────────────────

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

const btnSecondary: React.CSSProperties = {
  width: "100%",
  padding: "13px",
  borderRadius: "14px",
  border: "1px solid var(--border)",
  background: "var(--card)",
  color: "var(--text)",
  fontSize: "14px",
  fontWeight: 700,
  cursor: "pointer",
};
