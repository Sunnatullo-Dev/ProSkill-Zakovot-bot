/**
 * Zakovat Stoli xona holatini kuzatuvchi (spectator) uchun polling qiluvchi hook.
 *
 * `svoyak/useSvoyakRoom.ts` bilan bir xil naqsh, faqat interval qiymatlari
 * bu rejimning sekinroq sur'atiga moslashtirilgan (60s muhokama, buzzer yo'q):
 * - Raund jonli (discussion/awaiting_answer/verifying) — 1500ms
 * - Lobbi/kutish (waiting/team_confirmed/in_progress) — 4000ms
 * - `document.visibilityState === "hidden"` bo'lsa pauza (batareya)
 * - Xato bo'lsa exponential backoff (bazadan 2x, max 10s)
 * - status="finished" bo'lsa polling to'xtaydi
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { getZakovatTableRoomState } from "./api";
import type { ZtRoomState } from "./types";

type State = {
  data: ZtRoomState | null;
  isLoading: boolean;
  error: string | null;
  failureCount: number;
};

const ACTIVE_INTERVAL_MS = 1500; // discussion / awaiting_answer / verifying
const LOBBY_INTERVAL_MS = 4000; // waiting / team_confirmed / in_progress
const ERROR_BACKOFF_MAX_MS = 10_000;

const ACTIVE_STATUSES = new Set(["discussion", "awaiting_answer", "verifying"]);

export function useZakovatTableRoom(code: string | null): State & {
  refetch: () => Promise<void>;
} {
  const [state, setState] = useState<State>({
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
      const data = await getZakovatTableRoomState(currentCode);
      if (!mountedRef.current) return;
      failureCountRef.current = 0;
      lastStatusRef.current = data.status;
      setState({ data, isLoading: false, error: null, failureCount: 0 });
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
  }, []);

  const scheduleNext = useCallback(
    (currentCode: string) => {
      clearTimer();
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      if (lastStatusRef.current === "finished") {
        return;
      }
      const failures = failureCountRef.current;
      const baseInterval = ACTIVE_STATUSES.has(lastStatusRef.current ?? "")
        ? ACTIVE_INTERVAL_MS
        : LOBBY_INTERVAL_MS;
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
    [clearTimer, pollOnce]
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
      if (mountedRef.current) {
        scheduleNext(code);
      }
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
