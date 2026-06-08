import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_SECONDS = 15;
const TICK_INTERVAL_MS = 250; // tez yangilanish, lekin Date.now() bilan drift'siz

/**
 * Drift'siz countdown taymer.
 *
 * Eski versiya har 1s ga setTimeout chaqirib, render vaqtini hisobga olmasdi —
 * 15s real-time'da 16-17s bo'lib ketardi. Endi `deadline = Date.now() + N*1000`
 * deb yozib qo'yamiz va har tick'da `Math.ceil((deadline - Date.now()) / 1000)`
 * bilan qoldiqni hisoblaymiz. Page hidden'dan keyin qaytsa ham to'g'ri
 * bo'ladi — visibility'ni alohida tutmaymiz, Date.now() o'zi ishonchli.
 *
 * `resetWithSeconds(n)` — yangi savol uchun turli vaqt bilan qayta boshlash.
 */
export function useTimer(initialSeconds = DEFAULT_SECONDS, onExpire?: () => void) {
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const onExpireRef = useRef(onExpire);
  const deadlineRef = useRef<number | null>(null);
  const expiredFiredRef = useRef(false);
  // Joriy aktiv savol uchun sekund soni — resetWithSeconds() orqali yangilanadi
  const currentSecondsRef = useRef(initialSeconds);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    if (!isRunning || deadlineRef.current === null) {
      return;
    }

    const tick = () => {
      const deadline = deadlineRef.current;
      if (deadline === null) return;
      const remainingMs = deadline - Date.now();
      const seconds = Math.max(0, Math.ceil(remainingMs / 1000));
      setTimeLeft(seconds);
      if (remainingMs <= 0 && !expiredFiredRef.current) {
        expiredFiredRef.current = true;
        setIsRunning(false);
        setIsExpired(true);
        onExpireRef.current?.();
      }
    };

    // Birinchi tick'ni darrov bajaramiz — start()'dan keyin 250ms kutmaslik uchun
    tick();
    const intervalId = window.setInterval(tick, TICK_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [isRunning]);

  const start = useCallback(() => {
    expiredFiredRef.current = false;
    const secs = currentSecondsRef.current;
    // Faqat yangi deadline o'rnatamiz, agar ilgari to'xtatilgan bo'lsa.
    if (deadlineRef.current === null || timeLeft <= 0) {
      deadlineRef.current = Date.now() + secs * 1000;
      setTimeLeft(secs);
    }
    setIsExpired(false);
    setIsRunning(true);
  }, [timeLeft]);

  const stop = useCallback(() => {
    setIsRunning(false);
  }, []);

  const reset = useCallback(() => {
    deadlineRef.current = null;
    expiredFiredRef.current = false;
    setTimeLeft(currentSecondsRef.current);
    setIsExpired(false);
    setIsRunning(false);
  }, []);

  /** Yangi savol uchun vaqt bilan reset — timer to'xtatiladi, yangi qiymat o'rnatiladi. */
  const resetWithSeconds = useCallback((seconds: number) => {
    currentSecondsRef.current = seconds;
    deadlineRef.current = null;
    expiredFiredRef.current = false;
    setTimeLeft(seconds);
    setIsExpired(false);
    setIsRunning(false);
  }, []);

  return {
    timeLeft,
    isExpired,
    start,
    stop,
    reset,
    resetWithSeconds,
  };
}
