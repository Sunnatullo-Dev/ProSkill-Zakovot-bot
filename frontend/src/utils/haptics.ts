import type { AnswerStatus } from "../types";

function feedback() {
  return window.Telegram?.WebApp?.HapticFeedback;
}

export function hapticResult(status: AnswerStatus): void {
  const type = status === "correct" ? "success" : status === "partial" ? "warning" : "error";

  feedback()?.notificationOccurred(type);
}

export function hapticTap(): void {
  feedback()?.impactOccurred("light");
}

export function hapticSelect(): void {
  feedback()?.selectionChanged();
}
