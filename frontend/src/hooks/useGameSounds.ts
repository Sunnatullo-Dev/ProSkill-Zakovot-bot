/**
 * useGameSounds — Web Audio API orqali o'yin sound effektlari.
 * Faylsiz, inline generatsiya. Foydalanuvchi mute qilishi mumkin.
 */
import { useCallback, useRef } from "react";

const MUTE_KEY = "zakovat:sfx:muted";

function isMuted(): boolean {
  try { return localStorage.getItem(MUTE_KEY) === "1"; } catch { return false; }
}

/** AudioContext — lazy init (foydalanuvchi interaction'dan keyin) */
let _ctx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  try {
    if (!_ctx || _ctx.state === "closed") {
      _ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return _ctx;
  } catch {
    return null;
  }
}

/** Bir nota chalaydigan helper */
function playNote(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  gainPeak: number,
  type: OscillatorType = "sine"
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);

  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(gainPeak, startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  osc.start(startTime);
  osc.stop(startTime + duration + 0.01);
}

/** ✅ To'g'ri javob — 3 ta ko'tariluvchi ding (C-E-G akkord) */
function playCorrect() {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  // Do-Mi-Sol — major triad, yoqimli "win" sound
  const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
  notes.forEach((freq, i) => {
    playNote(ctx, freq, now + i * 0.09, 0.35, 0.22, "sine");
  });
  // Shimmer — yuqori harmonik
  playNote(ctx, 1046.5, now + 0.18, 0.28, 0.08, "sine");
}

/** ❌ Noto'g'ri javob — pasayuvchi "buzz" */
function playWrong() {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  // Quyi "thud" + kichik buzz
  playNote(ctx, 180, now,        0.12, 0.3, "sawtooth");
  playNote(ctx, 140, now + 0.08, 0.18, 0.25, "sawtooth");
  playNote(ctx, 100, now + 0.18, 0.22, 0.18, "sawtooth");
}

/** ⏰ Vaqt tugadi — tezlashuvchi beep-beep */
function playTimeout() {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  [0, 0.15, 0.28].forEach((offset) => {
    playNote(ctx, 440, now + offset, 0.1, 0.2, "square");
  });
}

export function useGameSounds() {
  const isMutedRef = useRef(isMuted());

  const toggleMute = useCallback(() => {
    isMutedRef.current = !isMutedRef.current;
    try { localStorage.setItem(MUTE_KEY, isMutedRef.current ? "1" : "0"); } catch { /* ignore */ }
    return isMutedRef.current;
  }, []);

  const soundCorrect = useCallback(() => {
    if (isMutedRef.current) return;
    // Lazy resume AudioContext (autoplay policy)
    const ctx = getCtx();
    if (ctx?.state === "suspended") {
      void ctx.resume().then(() => playCorrect());
    } else {
      playCorrect();
    }
  }, []);

  const soundWrong = useCallback(() => {
    if (isMutedRef.current) return;
    const ctx = getCtx();
    if (ctx?.state === "suspended") {
      void ctx.resume().then(() => playWrong());
    } else {
      playWrong();
    }
  }, []);

  const soundTimeout = useCallback(() => {
    if (isMutedRef.current) return;
    const ctx = getCtx();
    if (ctx?.state === "suspended") {
      void ctx.resume().then(() => playTimeout());
    } else {
      playTimeout();
    }
  }, []);

  return {
    soundCorrect,
    soundWrong,
    soundTimeout,
    toggleMute,
    get isMuted() { return isMutedRef.current; },
  };
}
