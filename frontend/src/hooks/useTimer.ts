import { useCallback, useEffect, useRef, useState } from "react";

export function useTimer(initialSeconds: number, isRunning: boolean, onComplete: () => void) {
  const [remainingSeconds, setRemainingSeconds] = useState(initialSeconds);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    if (remainingSeconds <= 0) {
      onCompleteRef.current();
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setRemainingSeconds((current) => current - 1);
    }, 1000);

    return () => window.clearTimeout(timeoutId);
  }, [isRunning, remainingSeconds]);

  const resetTimer = useCallback(() => {
    setRemainingSeconds(initialSeconds);
  }, [initialSeconds]);

  return {
    remainingSeconds,
    resetTimer
  };
}
