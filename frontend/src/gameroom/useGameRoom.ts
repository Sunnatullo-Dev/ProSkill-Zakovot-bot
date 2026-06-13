/**
 * Online O'yin Xonasi — xona holatini real-time polling orqali oluvchi hook.
 *
 * useSvoyakRoom dan ilhom olindi:
 * - waiting: 2s interval (ishtirokchilar kutilmoqda)
 * - active:  1s interval (savol bor, tez polling)
 * - finished: polling to'xtatiladi
 * - Visibility hidden bo'lsa pauza, qaytib kelganda darhol fetch.
 * - Xato bo'lsa exponential backoff (max 10s).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { getGameRoomState } from "../api/client";
import type { GameRoomState } from "../types";

type HookState = {
  data: GameRoomState | null;
  isLoading: boolean;
  error: string | null;
  failureCount: number;
};

const ACTIVE_INTERVAL_MS = 1_000;
const WAITING_INTERVAL_MS = 2_000;
const ERROR_BACKOFF_MAX_MS = 10_000;

export function useGameRoom(code: string | null): HookState & {
  refetch: () => Promise<void>;
} {
  const [state, setState] = useState<HookState>({
    data: null,
    isLoading: Boolean(code),
    error: null,
    failureCount: 0,
  });

  const failureCountRef = useRef(0);
  const mountedRef = useRef(true);
  const timeoutRef = useRef<number | null>(null);
  const inflightRef = useRef(false);
  const lastStatusRef = useRef<string | null>(null);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const pollOnce = useCallback(async (currentCode: string) => {
    if (inflightRef.current) return;
    inflightRef.current = true;
    try {
      const data = await getGameRoomState(currentCode);
      if (!mountedRef.current) return;
      if (!data) {
        // null = 404 yoki tarmoq xato — error sifatida hisoblaymiz
        failureCountRef.current += 1;
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: "Xona topilmadi yoki ulanishda xato",
          failureCount: failureCountRef.current,
        }));
        return;
      }
      failureCountRef.current = 0;
      lastStatusRef.current = data.status;
      setState({ data, isLoading: false, error: null, failureCount: 0 });
    } catch (err) {
      if (!mountedRef.current) return;
      failureCountRef.current += 1;
      const message = err instanceof Error ? err.message : "Xona holatini olib bo'lmadi";
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: message,
        failureCount: failureCountRef.current,
      }));
    } finally {
      inflightRef.current = false;
    }
  }, []);

  const scheduleNext = useCallback(
    (currentCode: string) => {
      clearTimer();
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      // Finished bo'lsa — polling to'xtatiladi (parent unmount qiladi)
      if (lastStatusRef.current === "finished") {
        return;
      }
      const failures = failureCountRef.current;
      const baseInterval =
        lastStatusRef.current === "active" ? ACTIVE_INTERVAL_MS : WAITING_INTERVAL_MS;
      const delay =
        failures > 0
          ? Math.min(ERROR_BACKOFF_MAX_MS, baseInterval * 2 ** failures)
          : baseInterval;
      timeoutRef.current = window.setTimeout(async () => {
        await pollOnce(currentCode);
        if (mountedRef.current) {
          scheduleNext(currentCode);
        }
      }, delay);
    },
    [clearTimer, pollOnce],
  );

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
    void (async () => {
      await pollOnce(code);
      if (mountedRef.current) scheduleNext(code);
    })();

    const handleVisibility = () => {
      if (typeof document === "undefined") return;
      if (document.visibilityState === "hidden") {
        clearTimer();
      } else if (mountedRef.current && code) {
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
