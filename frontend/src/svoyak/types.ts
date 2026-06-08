/**
 * Svoyak frontend tip ta'riflari.
 *
 * Backend `apps/svoyak/repositories._serialize_*` bilan moslashtirilgan.
 */

export type SvoyakRoomStatus = "lobby" | "playing" | "paused" | "finished";

export type SvoyakPlayerStatus = "connected" | "disconnected" | "kicked";

export type SvoyakRoundStatus =
  | "reading"
  | "waiting_buzz"
  | "answering"
  | "completed"
  | "skipped";

export type SvoyakPlayer = {
  telegramId: number;
  displayName: string;
  avatarUrl: string | null;
  score: number;
  status: SvoyakPlayerStatus;
  role: "player" | "coordinator";
  canPick: boolean;
  isHost: boolean;
};

export type SvoyakBoardCell = {
  categoryId: number;
  categoryName: string;
  categoryIcon: string;
  order: number;
  /** Foydalanilgan ball qiymatlari ro'yxati ([10, 30, 50] va h.k.). */
  usedValueTiers: number[];
};

export type SvoyakCurrentRound = {
  id: number;
  questionId: number;
  questionText: string;
  questionType: "text" | "abcd";
  options: string[];
  value: number;
  status: SvoyakRoundStatus;
  startedAt: string | null;
  buzzWinnerTelegramId: number | null;
  buzzWinnerAtMs: number | null;
  isMyTurn: boolean;
  answerCorrect: boolean | null;
  correctAnswer: string | null;
  scoreDelta: number | null;
};

export type SvoyakAutoAttempt = {
  telegramId: number;
  displayName: string;
  answer: string;
  isCorrect: boolean;
  atMs: number;
};

export type SvoyakAutoState = {
  questionIndex: number;
  totalQuestions: number;
  questionText: string;
  correctAnswer: string | null;
  /** O'qish fazasi (bloklangan) yoki javob berish fazasi. */
  phase: "reading" | "answering";
  /** O'qish fazasida qolgan ms (10s dan boshlanadi). */
  readingTimeRemainingMs: number;
  /** Javob berish fazasida qolgan ms. */
  timeRemainingMs: number;
  startedAtMs: number;
  attempts: SvoyakAutoAttempt[];
  myAttempt: SvoyakAutoAttempt | null;
  isPlaying: boolean;
};

export type SvoyakRoomState = {
  code: string;
  status: SvoyakRoomStatus;
  hostTelegramId: number;
  createdAt: string | null;
  startedAt: string | null;
  settings: Record<string, unknown>;
  isAutoMode: boolean;
  autoState: SvoyakAutoState | null;
  players: SvoyakPlayer[];
  board: SvoyakBoardCell[];
  currentRound: SvoyakCurrentRound | null;
  viewerTelegramId: number;
  viewerIsHost: boolean;
};

export const SVOYAK_VALUE_TIERS = [10, 20, 30, 40, 50] as const;
export type SvoyakValueTier = (typeof SVOYAK_VALUE_TIERS)[number];
