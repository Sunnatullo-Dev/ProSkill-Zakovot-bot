import type { AnswerStatus } from "../types";

const FAST_ANSWER_MS = 4000;
const FAST_POINTS = 2;
const BASE_POINTS = 1;
const STREAK_THRESHOLD = 3;
const STREAK_BONUS = 1;

export type ScoreInput = {
  status: AnswerStatus;
  timeTakenMs: number;
  streakBefore: number;
};

export type ScoreResult = {
  pointsEarned: number;
  streakAfter: number;
};

export function calculateAnswerScore(input: ScoreInput): ScoreResult {
  if (input.status !== "correct") {
    return { pointsEarned: 0, streakAfter: 0 };
  }

  const base = input.timeTakenMs <= FAST_ANSWER_MS ? FAST_POINTS : BASE_POINTS;
  const streakAfter = input.streakBefore + 1;
  const streakBonus = streakAfter >= STREAK_THRESHOLD ? STREAK_BONUS : 0;

  return { pointsEarned: base + streakBonus, streakAfter };
}
