import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_SECONDS = 15;

export function useTimer(initialSeconds = DEFAULT_SECONDS, onExpire?: () => void) {
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    if (timeLeft <= 0) {
      setIsRunning(false);
      setIsExpired(true);
      onExpireRef.current?.();
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setTimeLeft((currentTime) => Math.max(0, currentTime - 1));
    }, 1000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isRunning, timeLeft]);

  const start = useCallback(() => {
    setTimeLeft((currentTime) => (currentTime <= 0 ? initialSeconds : currentTime));
    setIsExpired(false);
    setIsRunning(true);
  }, [initialSeconds]);

  const stop = useCallback(() => {
    setIsRunning(false);
  }, []);

  const reset = useCallback(() => {
    setTimeLeft(initialSeconds);
    setIsExpired(false);
    setIsRunning(false);
  }, [initialSeconds]);

  return {
    timeLeft,
    isExpired,
    start,
    stop,
    reset
  };
}
