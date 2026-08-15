/**
 * Interaktiv Zakovat Stoli — mini-app kuzatuvchi (spectator) tip ta'riflari.
 *
 * Backend `apps/zakovat_table/repositories._serialize_room` bilan moslashtirilgan.
 * Bu ekran faqat o'qiydi (tma auth, allow_admin_fields=False) — shu sababli
 * admin-only maydonlar (to'g'ri javob, kapitan javobi) hech qachon kelmaydi
 * va bu yerda umuman e'lon qilinmagan.
 */

export type ZtRoomStatus =
  | "waiting"
  | "team_confirmed"
  | "in_progress"
  | "discussion"
  | "awaiting_answer"
  | "verifying"
  | "finished";

export type ZtWinner = "team" | "fans" | "draw" | null;

export type ZtPlayer = {
  seat: number;
  telegramId: number;
  displayName: string;
  isCaptain: boolean;
};

export type ZtCurrentQuestion = {
  id: number;
  sector: number;
  text: string;
};

export type ZtRoomState = {
  code: string;
  displayCode: string;
  status: ZtRoomStatus;
  adminTelegramId: number;
  teamScore: number;
  fansScore: number;
  winner: ZtWinner;
  players: ZtPlayer[];
  playerCount: number;
  teamFull: boolean;
  captainTelegramId: number | null;
  captainName: string | null;
  questionsTotal: number;
  questionsUsed: number;
  currentQuestion: ZtCurrentQuestion | null;
  discussionSeconds: number;
  discussionDeadline: string | null;
  discussionSecondsRemaining: number | null;
  spectatorCount: number;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  viewerTelegramId: number | null;
  viewerIsAdmin: boolean;
};

export const ZT_TEAM_SIZE = 6;
export const ZT_WIN_SCORE = 6;
export const ZT_QUESTION_COUNT = 12;
