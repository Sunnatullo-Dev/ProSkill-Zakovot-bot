/**
 * Svoyak xona state'ini real-time tarzda sinxron tutib turuvchi hook.
 *
 * - 500ms interval (production'da kerakli, free Render tier'ni og'irlashtirmaydi)
 * - `document.visibilityState === "hidden"` bo'lsa pollingni pauza qiladi
 *   (telefonda mini-app fonga ketganda batareyani saqlash)
 * - Xato yuz berganda exponential backoff (1s → 2s → 4s, max 10s)
 * - Component unmount'da to'liq to'xtaydi
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { getRoomState } from "./api";
import type { SvoyakRoomState } from "./types";

type State = {
  data: SvoyakRoomState | null;
  isLoading: boolean;
  error: string | null;
  /** ketma-ket muvaffaqiyatsizliklar soni — UI'da "Aloqa uzildi" ko'rsatish uchun */
  failureCount: number;
};

const BASE_INTERVAL_MS = 500;
const ERROR_BACKOFF_MAX_MS = 10_000;

export function useSvoyakRoom(code: string | null): State & {
  /** Qo'lda majburiy yangilash — mutation'lardan keyin. */
  refetch: () => Promise<void>;
} {
  const [state, setState] = useState<State>({
    data: null,
    isLoading: Boolean(code),
    error: null,
    failureCount: 0,
  });

  // Stable ref'lar — closure stale state ushlashidan saqlanish uchun.
  const failureCountRef = useRef(0);
  const mountedRef = useRef(true);
  const timeoutRef = useRef<number | null>(null);
  const inflightRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const pollOnce = useCallback(
    async (currentCode: string) => {
      if (inflightRef.current) return;
      inflightRef.current = true;
      try {
        const data = await getRoomState(currentCode);
        if (!mountedRef.current) return;
        failureCountRef.current = 0;
        setState({
          data,
          isLoading: false,
          error: null,
          failureCount: 0,
        });
      } catch (err) {
        if (!mountedRef.current) return;
        failureCountRef.current += 1;
        const message =
          err instanceof Error ? err.message : "Xona holatini olib bo'lmadi";
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: message,
          failureCount: failureCountRef.current,
        }));
      } finally {
        inflightRef.current = false;
      }
    },
    []
  );

  const scheduleNext = useCallback(
    (currentCode: string) => {
      clearTimer();
      // Visibility hidden bo'lsa — yangi tick belgilamaymiz.
      // Visibilitychange listener qaytib ko'rinish bo'lganda re-trigger qiladi.
      if (
        typeof document !== "undefined" &&
        document.visibilityState === "hidden"
      ) {
        return;
      }
      const failures = failureCountRef.current;
      const delay =
        failures > 0
          ? Math.min(ERROR_BACKOFF_MAX_MS, BASE_INTERVAL_MS * 2 ** failures)
          : BASE_INTERVAL_MS;
      timeoutRef.current = window.setTimeout(async () => {
        await pollOnce(currentCode);
        if (mountedRef.current) {
          scheduleNext(currentCode);
        }
      }, delay);
    },
    [clearTimer, pollOnce]
  );

  // Asosiy effekt — code o'zgarganda qaytadan polling boshlaydi.
  useEffect(() => {
    mountedRef.current = true;
    if (!code) {
      setState({ data: null, isLoading: false, error: null, failureCount: 0 });
      return () => {
        mountedRef.current = false;
        clearTimer();
      };
    }

    setState((prev) => ({ ...prev, isLoading: prev.data === null }));
    // Birinchi chaqiruv darhol, keyin interval.
    void (async () => {
      await pollOnce(code);
      if (mountedRef.current) {
        scheduleNext(code);
      }
    })();

    // Visibility listener — fonga ketganda pauza, qaytib kelganda resume.
    const handleVisibility = () => {
      if (typeof document === "undefined") return;
      if (document.visibilityState === "hidden") {
        clearTimer();
      } else if (mountedRef.current && code) {
        // Qaytib ko'rinish bo'ldi — darhol bir tick + qayta jadval.
        void pollOnce(code).then(() => {
          if (mountedRef.current) scheduleNext(code);
        });
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      mountedRef.current = false;
      clearTimer();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [code, clearTimer, pollOnce, scheduleNext]);

  const refetch = useCallback(async () => {
    if (!code) return;
    await pollOnce(code);
  }, [code, pollOnce]);

  return { ...state, refetch };
}
