import { useCallback, useEffect, useRef, useState } from "react";
import { fetchTTS, forfeitBattle, getBattleState, submitBattleAnswer } from "../api/client";
import type { BattleState, BattleTeamView, TeamMember } from "../types";
import { hapticResult } from "../utils/haptics";
import { SpeakerIcon } from "./icons";
import TeamChatPanel from "./TeamChatPanel";
import { useAppSettings } from "../hooks/useAppSettings";

function addWavHeaderIfNeeded(bytes: Uint8Array): ArrayBuffer {
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  }
  const sampleRate = 24000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const dataSize = bytes.byteLength;
  const buf = new ArrayBuffer(44 + dataSize);
  const v = new DataView(buf);
  const s = (o: number, t: string) => { for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
  s(0, "RIFF"); v.setUint32(4, 36 + dataSize, true); s(8, "WAVE");
  s(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
  v.setUint16(22, numChannels, true); v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * numChannels * bitsPerSample / 8, true);
  v.setUint16(32, numChannels * bitsPerSample / 8, true); v.setUint16(34, bitsPerSample, true);
  s(36, "data"); v.setUint32(40, dataSize, true);
  new Uint8Array(buf, 44).set(bytes);
  return buf;
}

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
  const appSettings = useAppSettings();
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
  const [isLoadingTTS, setIsLoadingTTS] = useState(false);
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);
  // TTS mute — localStorage'dan o'qiladi, QuestionCard bilan sinxron kalit
  const [ttsIsMuted, setTtsIsMuted] = useState<boolean>(() => {
    try { return localStorage.getItem("zakovat:tts:muted") === "1"; } catch { return false; }
  });
  // TTS tugagandan keyin taymerni ishga tushiramiz
  const [timerActive, setTimerActive] = useState(false);
  const lastRoundIdRef = useRef<string | null>(null);
  // Polling har 2s da timeRemainingMs ni yangilaydi — TTS tugaganda shu ref'dan sinxronlaymiz
  const latestTimeRemainingMsRef = useRef<number>(0);
  const answerInputRef = useRef<HTMLInputElement | null>(null);
  const submitButtonRef = useRef<HTMLButtonElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Klaviatura ochilganda submit tugmasi ko'rinmay qolishini oldini olamiz.
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const handler = () => {
      const isKeyboardOpen = vv.height < window.innerHeight - 100;
      if (isKeyboardOpen && submitButtonRef.current) {
        submitButtonRef.current.scrollIntoView({ block: "end", behavior: "smooth" });
      }
    };
    vv.addEventListener("resize", handler);
    return () => vv.removeEventListener("resize", handler);
  }, []);

  // AudioContext — komponent mount bo'lganda yaratamiz.
  useEffect(() => {
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;
    ctx.resume().catch(() => {});
    return () => {
      ctx.close().catch(() => {});
    };
  }, []);

  const playBuffer = useCallback((onEnded?: () => void) => {
    const ctx = audioCtxRef.current;
    const buffer = audioBufferRef.current;
    if (!ctx || !buffer) return;

    if (activeSourceRef.current) {
      try { activeSourceRef.current.stop(); } catch { /* ignore */ }
      activeSourceRef.current.disconnect();
      activeSourceRef.current = null;
    }

    const doPlay = () => {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.onended = () => {
        setIsPlayingTTS(false);
        onEnded?.();
      };
      activeSourceRef.current = source;
      setIsPlayingTTS(true);
      source.start(0);
    };

    if (ctx.state === "suspended") {
      ctx.resume().then(doPlay).catch(() => { setIsPlayingTTS(false); onEnded?.(); });
    } else {
      doPlay();
    }
  }, []);

  // Yangi round kelganda savolni TTS orqali o'qib beramiz,
  // TTS tugaguncha taymer muzlatiladi.
  const currentRoundId = state?.currentRound?.roundId ?? null;
  const currentRoundText = state?.currentRound?.questionText ?? "";
  useEffect(() => {
    // Yangi round = taymer to'xtadi
    setTimerActive(false);

    if (!currentRoundId || !currentRoundText) {
      // Savol yo'q — taymerni darhol boshlash
      setTimerActive(true);
      return;
    }

    if (activeSourceRef.current) {
      try { activeSourceRef.current.stop(); } catch { /* ignore */ }
      activeSourceRef.current.disconnect();
      activeSourceRef.current = null;
    }
    audioBufferRef.current = null;
    setIsPlayingTTS(false);
    setHasAudio(false);

    // TTS tugaganda server vaqti bilan sinxronlab taymerni ishga tushiramiz
    const startTimer = () => {
      const ms = latestTimeRemainingMsRef.current;
      if (ms > 0) setSecondsLeft(Math.ceil(ms / 1000));
      setTimerActive(true);
    };

    // Mute bo'lsa — TTS yuklamas, taymerni darhol boshlaymiz
    if (ttsIsMuted) {
      startTimer();
      return;
    }

    setIsLoadingTTS(true);

    let cancelled = false;
    fetchTTS(currentRoundText).then(async (result) => {
      if (cancelled) { setIsLoadingTTS(false); return; }
      if (!result) { setIsLoadingTTS(false); startTimer(); return; }
      try {
        const bytes = Uint8Array.from(atob(result.audio), (c) => c.charCodeAt(0));
        const arrayBuf = addWavHeaderIfNeeded(bytes);
        const ctx = audioCtxRef.current;
        if (!ctx) { setIsLoadingTTS(false); startTimer(); return; }
        const decoded = await ctx.decodeAudioData(arrayBuf);
        if (cancelled) return;
        audioBufferRef.current = decoded;
        setHasAudio(true);
        setIsLoadingTTS(false);
        // Auto-o'qish — tugaganda taymer boshlanadi
        playBuffer(startTimer);
      } catch {
        setIsLoadingTTS(false);
        if (!cancelled) startTimer();
      }
    });

    return () => { cancelled = true; };
  }, [currentRoundId, currentRoundText, playBuffer, ttsIsMuted]);

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

        const newRoundId = next.currentRound?.roundId ?? null;
        const isRoundChange = newRoundId !== lastRoundIdRef.current;

        // `secondsLeft` ni FAQAT yangi round kelganda server qiymatidan
        // sinxronlaymiz. Bir xil round davomida server qiymati har 2s da
        // kelib, local 1s tick bilan to'qnashib jitter qildi (10→9→10→9).
        if (next.currentRound) {
          latestTimeRemainingMsRef.current = next.currentRound.timeRemainingMs;
        }
        if (isRoundChange && next.currentRound) {
          setSecondsLeft(Math.ceil(next.currentRound.timeRemainingMs / 1000));
        }

        if (isRoundChange) {
          lastRoundIdRef.current = newRoundId;
          setAnswer("");
          setErrorMessage("");
          // To'g'ri javob feedback'ini 2.5s davomida saqlash (oldindan
          // darhol nullga tushirardik). Bu — feedback #2 yechimi: foydalanuvchi
          // savol vaqti tugaganidan keyin TO'G'RI JAVOBni ko'rsin, keyin yangi
          // savolga o'tsin.
          window.setTimeout(() => {
            setFeedback(null);
          }, 2500);
          // Yangi round kelganda input avtomatik focus — mobil'da qimmatli
          // sekundlarni tejaymiz, foydalanuvchi qo'l bilan tegma kerakmas.
          // Lekin focus'ni 2.5s'dan keyin qilamiz — feedback ko'rinishida
          // klaviatura ochilib kelmasin.
          window.setTimeout(() => {
            answerInputRef.current?.focus();
          }, 2500);
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
    if (!state?.currentRound || state.finished || !timerActive) {
      return;
    }

    const id = window.setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, TICK_INTERVAL_MS);

    return () => {
      window.clearInterval(id);
    };
  }, [state?.currentRound?.roundId, state?.finished, timerActive]);

  // Feedback #2: vaqt tugaganda va foydalanuvchi javob bermagan bo'lsa,
  // to'g'ri javobni ko'rsatamiz (agar admin sozlamasida yoqilgan bo'lsa).
  useEffect(() => {
    if (
      secondsLeft === 0 &&
      state?.currentRound &&
      !state.currentRound.myAnswered &&
      !feedback &&
      !state.finished
    ) {
      // Backend correctAnswer'ni vaqt tugaganda qaytaradi (timeRemainingMs <= 0)
      const correctAnswer = appSettings.battleShowCorrectOnTimeout
        ? (state.currentRound.correctAnswer ?? "")
        : "";
      setFeedback({ isCorrect: false, correctAnswer });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, state?.currentRound?.roundId, state?.currentRound?.myAnswered]);

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
    // Stuck: ko'pchilik network xato hollarda 1 ta failure'dan keyin ham
    // foydalanuvchiga chiqish imkonini beramiz — uzoq kutib turishi shart emas.
    const stuck = failureCount >= 1;
    return (
      <div
        style={{
          minHeight: "100dvh",
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
          minHeight: "100dvh",
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
        minHeight: "100dvh",
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
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* Ovoz o'chirish/yoqish toggle */}
          <button
            type="button"
            title={ttsIsMuted ? "Ovozni yoqish" : "Ovozni o'chirish"}
            onClick={() => {
              setTtsIsMuted((prev) => {
                const next = !prev;
                try { localStorage.setItem("zakovat:tts:muted", next ? "1" : "0"); } catch { /* ignore */ }
                if (next && activeSourceRef.current) {
                  try { activeSourceRef.current.stop(); } catch { /* ignore */ }
                  setIsPlayingTTS(false);
                }
                return next;
              });
            }}
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "50%",
              border: `1px solid ${ttsIsMuted ? "rgba(239,68,68,0.4)" : "var(--border)"}`,
              background: ttsIsMuted ? "rgba(239,68,68,0.10)" : "transparent",
              color: ttsIsMuted ? "var(--error)" : "var(--muted)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "14px",
              flexShrink: 0
            }}
          >
            {ttsIsMuted ? "🔇" : "🔈"}
          </button>
          {!ttsIsMuted && (isLoadingTTS || isPlayingTTS) ? (
            <span
              style={{
                fontSize: "13px",
                fontWeight: 800,
                color: "var(--accent)",
                display: "flex",
                alignItems: "center",
                gap: "5px"
              }}
            >
              <SpeakerIcon size={14} />
              {isLoadingTTS ? "..." : "O'qilmoqda"}
            </span>
          ) : (
            <span
              style={{
                fontSize: "16px",
                fontWeight: 800,
                color: secondsLeft <= 5 ? "var(--error)" : secondsLeft <= 10 ? "var(--gold)" : "var(--accent)"
              }}
            >
              ⏱ {secondsLeft}s
            </span>
          )}
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
            padding: "24px 18px 14px",
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
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
            <button
              type="button"
              title="Savolni qayta eshitish"
              disabled={isLoadingTTS || !hasAudio}
              onClick={() => playBuffer()}
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "50%",
                border: `1.5px solid ${isPlayingTTS ? "var(--accent)" : "var(--border)"}`,
                background: isPlayingTTS ? "rgba(77,166,255,0.15)" : "var(--bg)",
                color: isPlayingTTS ? "var(--accent)" : "var(--muted)",
                cursor: hasAudio && !isLoadingTTS ? "pointer" : "default",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: !hasAudio && !isLoadingTTS ? 0.35 : 1,
                transition: "all 0.2s",
                flexShrink: 0
              }}
            >
              {isLoadingTTS ? (
                <svg
                  fill="none"
                  height="14"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  width="14"
                  style={{ animation: "spin 1s linear infinite" }}
                >
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
              ) : (
                <SpeakerIcon size={14} />
              )}
            </button>
          </div>
        </div>
      ) : null}

      {round && !round.myAnswered ? (
        <div style={{ marginBottom: "16px" }}>
          {/* A/B/C/D rejimi: aniq 4 ta options bo'lsa tugmalar, aks holda input */}
          {Array.isArray(round.options) && round.options.length === 4 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {round.options.map((option, index) => {
                const letter = ["A", "B", "C", "D"][index] ?? "";
                const isSelected = answer === option;
                const disabled = submitting || Boolean(answer);
                return (
                  <button
                    key={`${round.roundId}-${index}`}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      if (disabled) return;
                      setAnswer(option);
                      // Darrov submit — tap = javob
                      window.setTimeout(() => {
                        void (async () => {
                          // handleSubmit answer state'idan o'qiydi, biz endi
                          // setAnswer chaqirdik — yuborish to'g'ridan-to'g'ri:
                          setSubmitting(true);
                          try {
                            const result = await submitBattleAnswer(battleId, round.roundId, option);
                            if (result.ok) {
                              setFeedback({
                                isCorrect: result.data.isCorrect,
                                correctAnswer: result.data.correctAnswer ?? ""
                              });
                            } else {
                              setErrorMessage(result.error);
                            }
                          } finally {
                            setSubmitting(false);
                          }
                        })();
                      }, 0);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      width: "100%",
                      padding: "13px 14px",
                      borderRadius: "12px",
                      border: isSelected ? "1.5px solid var(--accent)" : "1.5px solid var(--border)",
                      background: isSelected ? "rgba(77,166,255,0.16)" : "var(--card)",
                      color: "var(--text)",
                      fontSize: "14px",
                      fontWeight: 700,
                      textAlign: "left",
                      cursor: disabled ? "not-allowed" : "pointer",
                      opacity: disabled && !isSelected ? 0.55 : 1
                    }}
                  >
                    <span
                      style={{
                        flex: "0 0 auto",
                        width: "28px",
                        height: "28px",
                        borderRadius: "50%",
                        background: isSelected ? "var(--accent)" : "rgba(255,255,255,0.05)",
                        color: isSelected ? "white" : "var(--accent)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "13px",
                        fontWeight: 900
                      }}
                    >
                      {letter}
                    </span>
                    <span style={{ flex: 1, lineHeight: 1.4 }}>{option}</span>
                  </button>
                );
              })}
              {errorMessage ? (
                <div style={{ fontSize: "12px", color: "var(--error)", marginTop: "4px" }}>
                  {errorMessage}
                </div>
              ) : null}
            </div>
          ) : (
            <>
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
                onFocus={() => {
                  window.setTimeout(() => {
                    submitButtonRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
                  }, 350);
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
                ref={submitButtonRef}
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
            </>
          )}
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
          {/* Vaqt tugaganda yoki noto'g'ri bo'lganda to'g'ri javobni ko'rsatamiz */}
          {feedback?.isCorrect === false && feedback.correctAnswer ? (
            <div style={{
              marginTop: "8px",
              padding: "8px 12px",
              background: "rgba(34,197,94,0.12)",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 700,
              color: "var(--success)"
            }}>
              ✅ To'g'ri javob: {feedback.correctAnswer}
            </div>
          ) : null}
          <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "4px" }}>
            Boshqalarni kuting yoki vaqt tugashini kuting
          </div>
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
        <MembersStatus team={myTeam} currentUserId={currentUserId} />
        <MembersStatus team={otherTeam} currentUserId={currentUserId} />
      </div>

      {/* Jamoa chat — battle paytida muhokama qilish uchun (admin tomonidan boshqariladi) */}
      {appSettings.battleChatEnabled ? (
        <TeamChatPanel
          currentUserId={currentUserId}
          members={myTeam.members.map((m) => ({
            telegramId: m.telegramId,
            joinedAt: "",
            firstName: m.firstName ?? null,
            username: m.username ?? null,
          } satisfies TeamMember))}
          canSend={currentUserId > 0}
          pollIntervalMs={appSettings.battleChatPollIntervalMs}
        />
      ) : null}
    </div>
  );
}
