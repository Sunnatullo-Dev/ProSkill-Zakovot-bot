import type { AnswerStatus } from "../types";

const DIFFICULTY_BASE: Record<string, number> = {
  easy: 10,
  medium: 15,
  hard: 20
};
const DEFAULT_BASE = 10;
const MAX_SPEED_BONUS = 10;
const ANSWER_WINDOW_MS = 15000;
const STREAK_THRESHOLD = 3;
const STREAK_MULTIPLIER = 1.5;

type ScoreInput = {
  status: AnswerStatus;
  difficulty: string | null;
  timeTakenMs: number;
  streakBefore: number;
};

type ScoreResult = {
  pointsEarned: number;
  streakAfter: number;
};

export function calculateAnswerScore(input: ScoreInput): ScoreResult {
  if (input.status !== "correct") {
    return { pointsEarned: 0, streakAfter: 0 };
  }

  const base = DIFFICULTY_BASE[input.difficulty ?? ""] ?? DEFAULT_BASE;
  const speedRatio = Math.max(0, 1 - input.timeTakenMs / ANSWER_WINDOW_MS);
  const speedBonus = Math.round(MAX_SPEED_BONUS * speedRatio);
  const streakAfter = input.streakBefore + 1;
  const multiplier = streakAfter >= STREAK_THRESHOLD ? STREAK_MULTIPLIER : 1;
  const pointsEarned = Math.round((base + speedBonus) * multiplier);

  return { pointsEarned, streakAfter };
}
