import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchTTS } from "../api/client";
import type { RevealInfo } from "../types";
import { CloseIcon, SpeakerIcon } from "./icons";

type QuestionCardProps = {
  question: {
    id: string;
    text: string;
    /**
     * Backend tomonidan aralashtirilgan 4 ta variant (A/B/C/D rejimi).
     * To'g'ri javob shu ichida yashirin (frontend qaysi to'g'ri ekanini bilmaydi).
     * Bo'sh yoki 4'dan kam bo'lsa — eski erkin matn rejimi (input + Gemini AI).
     */
    options?: string[];
  };
  questionNumber: number;
  totalQuestions: number;
  timeLeft: number;
  /** Joriy savol uchun umumiy vaqt (soniya) — doira progress uchun (default: 90). */
  totalTimeSeconds?: number;
  streak: number;
  reveal: RevealInfo | null;
  isRevealing: boolean;
  isSubmitting?: boolean;
  onSubmit: (answer: string) => void;
  onGiveUp: () => void;
  onContinue: () => void;
  onExit: () => void;
  /** TTS o'qib bo'lgandan keyin chaqiriladi — shu paytda taymer boshlanadi */
  onTimerStart?: () => void;
};

const OPTION_LETTERS = ["A", "B", "C", "D"];

// Gemini ba'zan WAV header'siz raw L16 PCM qaytaradi.
// Agar RIFF imzosi yo'q bo'lsa — 24kHz/16-bit/mono WAV header qo'shamiz.
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

export default function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  timeLeft,
  totalTimeSeconds = 90,
  streak,
  reveal,
  isRevealing,
  isSubmitting = false,
  onSubmit,
  onGiveUp,
  onContinue,
  onExit,
  onTimerStart
}: QuestionCardProps) {
  const [answer, setAnswer] = useState("");
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isLoadingTTS, setIsLoadingTTS] = useState(false);
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);
  // TTS mute — localStorage'da saqlanadi, default: o'chirilmagan (false)
  const [ttsIsMuted, setTtsIsMuted] = useState<boolean>(() => {
    try { return localStorage.getItem("zakovat:tts:muted") === "1"; } catch { return false; }
  });
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);
  // Rang: qolgan vaqt foiziga qarab (>50% yashil, 25–50% sariq, <25% qizil)
  const timeRatio = totalTimeSeconds > 0 ? timeLeft / totalTimeSeconds : 0;
  const timerColor = timeRatio > 0.5 ? "var(--accent)" : timeRatio > 0.25 ? "var(--warning)" : "var(--error)";
  const progress = timeRatio;
  const circumference = 2 * Math.PI * 34;
  const strokeDashoffset = circumference * (1 - progress);

  // A/B/C/D rejimi shartlari: backend aniq 4 ta variant yuborgan bo'lishi shart.
  const isMultipleChoice = Boolean(
    Array.isArray(question.options) && question.options.length === 4
  );

  // Backend allaqachon aralashtirilgan tartibda yuboradi (crypto-shuffle).
  // Frontend faqat shu tartibni hurmat qiladi — qayta aralashtirilsa,
  // har renderda joy almashinishi mumkin va tap noaniq tugmaga tushadi.
  const options = useMemo<string[]>(
    () => (isMultipleChoice ? (question.options as string[]) : []),
    [isMultipleChoice, question.options]
  );

  // Klaviatura ochilganda submit tugmasi ko'rinmay qolmasligi uchun ref:
  // input fokus bo'lganda yoki VisualViewport o'zgarganda tugmani scroll qilamiz.
  const submitButtonRef = useRef<HTMLButtonElement | null>(null);

  // AudioContext — foydalanuvchi "O'yinni boshlash" bosgan paytda mount bo'ladi,
  // shuning uchun resume() muvaffaqiyatli ishlaydi va autoplay bloklanmaydi.
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

  useEffect(() => {
    setAnswer("");
    setSelectedOption(null);
  }, [question.id]);

  // Yangi savol kelganda TTS yuklab auto-play qilamiz (mute bo'lmasa)
  useEffect(() => {
    if (activeSourceRef.current) {
      try { activeSourceRef.current.stop(); } catch { /* ignore */ }
      activeSourceRef.current.disconnect();
      activeSourceRef.current = null;
    }
    audioBufferRef.current = null;
    setIsPlayingTTS(false);
    setHasAudio(false);

    // Mute bo'lsa — TTS yuklamas, taymerni darhol boshlaymiz
    if (ttsIsMuted) {
      onTimerStart?.();
      return;
    }

    setIsLoadingTTS(true);

    let cancelled = false;
    fetchTTS(question.text).then(async (result) => {
      if (cancelled) { setIsLoadingTTS(false); return; }
      // TTS mavjud bo'lmasa — taymerni darhol boshlash
      if (!result) { setIsLoadingTTS(false); onTimerStart?.(); return; }
      try {
        const bytes = Uint8Array.from(atob(result.audio), (c) => c.charCodeAt(0));
        const arrayBuf = addWavHeaderIfNeeded(bytes);
        const ctx = audioCtxRef.current;
        // AudioContext yo'q bo'lsa — taymerni darhol boshlash
        if (!ctx) { setIsLoadingTTS(false); onTimerStart?.(); return; }
        const decoded = await ctx.decodeAudioData(arrayBuf);
        if (cancelled) return;
        audioBufferRef.current = decoded;
        setHasAudio(true);
        setIsLoadingTTS(false);
        // TTS tugaganda taymer boshlanadi (onTimerStart = callback)
        playBuffer(onTimerStart);
      } catch (err) {
        console.error("[TTS] decode error:", err);
        setIsLoadingTTS(false);
        // Decode xato bo'lsa ham — taymerni darhol boshlash
        if (!cancelled) onTimerStart?.();
      }
    }).catch(() => {
      // Network xato — taymerni darhol boshlash
      if (!cancelled) { setIsLoadingTTS(false); onTimerStart?.(); }
    });

    return () => { cancelled = true; };
  }, [question.id, question.text, playBuffer, onTimerStart, ttsIsMuted]);

  // Klaviatura ochilganda VisualViewport viewport balandligi kichrayadi.
  // Bu eventni tutib, submit tugmasini ko'rinadigan joyga scroll qilamiz.
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const handler = () => {
      // Klaviatura ochilgan paytda — viewport sezilarli kichrayadi (10%+ kamayadi)
      const isKeyboardOpen = vv.height < window.innerHeight - 100;
      if (isKeyboardOpen && submitButtonRef.current) {
        submitButtonRef.current.scrollIntoView({ block: "end", behavior: "smooth" });
      }
    };
    vv.addEventListener("resize", handler);
    return () => vv.removeEventListener("resize", handler);
  }, []);

  function handleInputFocus() {
    // Telefonda klaviatura paydo bo'lguncha ~300ms vaqt ketadi.
    // Shu tugagandan keyin submit tugmani ko'rinadigan joyga ko'taramiz.
    window.setTimeout(() => {
      submitButtonRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
    }, 350);
  }

  function handleSubmit() {
    const trimmedAnswer = answer.trim();

    if (!trimmedAnswer) {
      return;
    }

    onSubmit(trimmedAnswer);
  }

  function handlePickOption(option: string) {
    if (isSubmitting || selectedOption) return;
    setSelectedOption(option);
    onSubmit(option);
  }

  return (
    <div
      className="animate-fadeInUp"
      style={{
        // `100dvh` — klaviatura ochilganda viewport bilan birga kichrayadi.
        // `height` (not just minHeight) creates a true bounded container so
        // content can never push the page taller than the viewport.
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg)",
        paddingTop: "16px",
        paddingLeft: "16px",
        paddingRight: "16px",
        // safe-area: notch va home-indicator uchun qo'shimcha joy
        paddingBottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
        maxWidth: "430px",
        margin: "0 auto",
        boxSizing: "border-box",
        overflow: "hidden"
      }}
    >
      <div
        style={{
          height: "3px",
          background: "var(--border)",
          borderRadius: "2px",
          marginBottom: "10px",
          overflow: "hidden"
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${(questionNumber / totalQuestions) * 100}%`,
            background: "linear-gradient(90deg, var(--accent), var(--accent2))",
            borderRadius: "2px",
            transition: "width 0.3s ease"
          }}
        />
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "10px"
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            aria-label="O'yindan chiqish"
            style={{
              width: "30px",
              height: "30px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "9px",
              background: "var(--card)",
              border: "1px solid var(--border)",
              color: "var(--muted)",
              cursor: "pointer",
              flex: "0 0 auto"
            }}
            type="button"
            onClick={onExit}
          >
            <CloseIcon size={16} />
          </button>
          <span
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "var(--text)"
            }}
          >
            Savol {questionNumber}/{totalQuestions}
          </span>
          {streak >= 2 ? (
            <span
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: streak >= 3 ? "var(--gold)" : "var(--muted)",
                background: streak >= 3 ? "rgba(245,200,66,0.14)" : "var(--card)",
                border: `1px solid ${streak >= 3 ? "rgba(245,200,66,0.3)" : "var(--border)"}`,
                borderRadius: "20px",
                padding: "2px 9px"
              }}
            >
              {"\u{1F525}"} {streak}
            </span>
          ) : null}
        </span>
        <span
          style={{
            fontSize: "14px",
            fontWeight: 600,
            color: timerColor,
            transition: "color 0.5s"
          }}
        >
          {"\u23F1"} {timeLeft}s
        </span>
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          paddingTop: "12px",
          minHeight: 0,   // flex child'ni qisqartirish uchun muhim
          overflow: "hidden"  // savol kartasi bu chegaradan tashqariga chiqa olmaydi
        }}
      >
        {/* ── Savol kartasi — flex:1 bilan qolgan joyni egallaydi, zarur bo'lsa ichida scroll ── */}
        <div
          style={{
            width: "100%",
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "20px",
            marginBottom: "10px",
            display: "flex",
            flexDirection: "column",
            // flex:1 + minHeight:0 — bu karta mavjud bo'sh joyni egallaydi.
            // Timer va javob elementlari flexShrink:0 bo'lgani uchun ular
            // doim ko'rinadi; karta qisqartiriladi (shrink), ichidagi matn scroll bo'ladi.
            flex: 1,
            minHeight: "64px",
            overflow: "hidden"
          }}
        >
          {/* Scrollable matn qismi */}
          <div
            style={{
              overflowY: "auto",
              overscrollBehavior: "contain",
              flex: 1,
              padding: "16px 18px 0",
              fontSize: "15px",
              fontWeight: 600,
              color: "var(--text)",
              textAlign: "center",
              lineHeight: 1.55,
              userSelect: "none",
              WebkitUserSelect: "none",
            }}
          >
            {question.text}
          </div>

          {/* TTS tugmalari — doim kartaning pastida ko'rinadi */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: "8px",
              padding: "8px 14px 12px",
              flexShrink: 0
            }}
          >
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
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                border: `1.5px solid ${ttsIsMuted ? "var(--error)" : "var(--border)"}`,
                background: ttsIsMuted ? "rgba(239,68,68,0.12)" : "var(--bg)",
                color: ttsIsMuted ? "var(--error)" : "var(--muted)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "14px",
                transition: "all 0.2s",
                flexShrink: 0
              }}
            >
              {ttsIsMuted ? "🔇" : "🔈"}
            </button>
            <button
              type="button"
              title="Savolni qayta eshitish"
              disabled={isLoadingTTS || !hasAudio || ttsIsMuted}
              onClick={() => playBuffer()}
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                border: `1.5px solid ${isPlayingTTS ? "var(--accent)" : "var(--border)"}`,
                background: isPlayingTTS ? "rgba(77,166,255,0.15)" : "var(--bg)",
                color: isPlayingTTS ? "var(--accent)" : "var(--muted)",
                cursor: hasAudio && !isLoadingTTS && !ttsIsMuted ? "pointer" : "default",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: (!hasAudio && !isLoadingTTS) || ttsIsMuted ? 0.35 : 1,
                transition: "all 0.2s",
                flexShrink: 0
              }}
            >
              {isLoadingTTS ? (
                <svg
                  fill="none"
                  height="13"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  width="13"
                  style={{ animation: "spin 1s linear infinite" }}
                >
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
              ) : (
                <SpeakerIcon size={13} />
              )}
            </button>
          </div>
        </div>

        {/* ── Timer doirasi ── */}
        <svg height="60" style={{ marginBottom: "8px", flexShrink: 0 }} viewBox="0 0 80 80" width="60">
          <circle cx="40" cy="40" fill="none" r="34" stroke="var(--border)" strokeWidth="6" />
          <circle
            cx="40"
            cy="40"
            fill="none"
            r="34"
            stroke={timerColor}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            strokeWidth="6"
            style={{ transition: "stroke-dashoffset 1s linear, stroke 0.5s ease" }}
            transform="rotate(-90 40 40)"
          />
          <text
            dominantBaseline="central"
            fill={timerColor}
            fontSize="20"
            fontWeight="800"
            style={{ transition: "fill 0.5s" }}
            textAnchor="middle"
            x="40"
            y="40"
          >
            {timeLeft}
          </text>
        </svg>

        {reveal ? (
          <div
            style={{
              width: "100%",
              background: "var(--card)",
              border: "1px solid var(--accent)",
              borderRadius: "16px",
              padding: "18px"
            }}
          >
            <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--accent)", marginBottom: "12px" }}>
              {"\u{1F4DA}"} Bilib oling
            </div>
            <div style={{ fontSize: "11px", color: "var(--muted)", letterSpacing: "2px" }}>
              TO'G'RI JAVOB
            </div>
            <div style={{ fontSize: "20px", fontWeight: 800, color: "var(--success)", marginTop: "4px" }}>
              {reveal.correctAnswer || "\u2014"}
            </div>
            <div
              style={{
                fontSize: "14px",
                color: reveal.explanation ? "var(--text)" : "var(--muted)",
                fontStyle: reveal.explanation ? "normal" : "italic",
                lineHeight: 1.6,
                borderTop: "1px solid var(--border)",
                marginTop: "12px",
                paddingTop: "12px"
              }}
            >
              {reveal.explanation || "To'g'ri javobni eslab qoling."}
            </div>
            <button
              style={{
                width: "100%",
                marginTop: "16px",
                padding: "15px",
                background: "var(--accent)",
                border: "none",
                borderRadius: "14px",
                fontSize: "16px",
                fontWeight: 700,
                color: "white",
                cursor: "pointer"
              }}
              type="button"
              onClick={onContinue}
            >
              Davom qilish {"\u2192"}
            </button>
          </div>
        ) : isRevealing ? (
          <div
            style={{
              width: "100%",
              textAlign: "center",
              padding: "28px",
              fontSize: "14px",
              fontWeight: 600,
              color: "var(--muted)"
            }}
          >
            Ma'lumot yuklanmoqda...
          </div>
        ) : isMultipleChoice ? (
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "8px", flexShrink: 0 }}>
            {options.map((option, index) => {
              const isSelected = selectedOption === option;
              const disabled = isSubmitting || selectedOption !== null;
              return (
                <button
                  key={`${question.id}-${index}`}
                  type="button"
                  disabled={disabled}
                  onClick={() => handlePickOption(option)}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "14px",
                    border: isSelected ? "1.5px solid var(--accent)" : "1.5px solid var(--border)",
                    background: isSelected ? "rgba(77,166,255,0.16)" : "var(--card)",
                    color: "var(--text)",
                    fontSize: "14px",
                    fontWeight: 600,
                    textAlign: "left",
                    cursor: disabled ? "not-allowed" : "pointer",
                    opacity: disabled && !isSelected ? 0.55 : 1,
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    transition: "all 0.15s"
                  }}
                >
                  <span
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      background: isSelected ? "var(--accent)" : "rgba(255,255,255,0.05)",
                      color: isSelected ? "white" : "var(--accent)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "13px",
                      fontWeight: 900,
                      flex: "0 0 auto"
                    }}
                  >
                    {OPTION_LETTERS[index] ?? ""}
                  </span>
                  <span style={{ flex: 1, lineHeight: 1.4 }}>{option}</span>
                </button>
              );
            })}
            <button
              style={{
                width: "100%",
                marginTop: "4px",
                padding: "9px",
                background: "transparent",
                border: "none",
                fontSize: "13px",
                fontWeight: 600,
                color: "var(--muted)",
                textDecoration: "underline",
                cursor: "pointer"
              }}
              type="button"
              onClick={onGiveUp}
              disabled={isSubmitting || selectedOption !== null}
            >
              Javobni bilmayman
            </button>
          </div>
        ) : (
          <div style={{ width: "100%", display: "flex", flexDirection: "column", flexShrink: 0 }}>
            <input
              placeholder="Javobingizni yozing..."
              style={{
                width: "100%",
                padding: "13px 16px",
                background: "var(--card)",
                border: "1.5px solid var(--border)",
                borderRadius: "14px",
                fontSize: "15px",
                color: "var(--text)",
                outline: "none",
                marginBottom: "10px",
                transition: "border-color 0.2s, box-shadow 0.2s",
                boxSizing: "border-box"
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
              onBlur={(event) => {
                event.target.style.borderColor = "var(--border)";
                event.target.style.boxShadow = "none";
              }}
              onChange={(event) => setAnswer(event.target.value)}
              onFocus={(event) => {
                event.target.style.borderColor = "var(--accent)";
                event.target.style.boxShadow = "0 0 0 3px rgba(77,166,255,0.12)";
                handleInputFocus();
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && answer.trim()) {
                  handleSubmit();
                }
              }}
            />
            <button
              ref={submitButtonRef}
              disabled={!answer.trim()}
              style={{
                width: "100%",
                padding: "13px",
                background: answer.trim() ? "var(--accent)" : "var(--border)",
                border: "none",
                borderRadius: "14px",
                fontSize: "15px",
                fontWeight: 700,
                color: "white",
                cursor: answer.trim() ? "pointer" : "not-allowed",
                opacity: answer.trim() ? 1 : 0.4,
                transition: "all 0.2s"
              }}
              type="button"
              onClick={handleSubmit}
            >
              Javob berish {"\u2713"}
            </button>
            <button
              style={{
                width: "100%",
                marginTop: "8px",
                padding: "9px",
                background: "transparent",
                border: "none",
                fontSize: "13px",
                fontWeight: 600,
                color: "var(--muted)",
                textDecoration: "underline",
                cursor: "pointer"
              }}
              type="button"
              onClick={onGiveUp}
            >
              Javobni bilmayman
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
