export type TelegramUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  /** ISO-639 til kodi (Telegram interfeysi tili): "ru", "uz", "en" va h.k. */
  language_code?: string;
};

export type TelegramHapticFeedback = {
  impactOccurred: (style: "light" | "medium" | "heavy" | "rigid" | "soft") => void;
  notificationOccurred: (type: "error" | "success" | "warning") => void;
  selectionChanged: () => void;
};

export type TelegramBackButton = {
  show: () => void;
  hide: () => void;
  onClick: (callback: () => void) => void;
  offClick: (callback: () => void) => void;
};

export type TelegramWebApp = {
  initData: string;
  initDataUnsafe: {
    user?: TelegramUser;
    start_param?: string;
  };
  platform?: string;
  version?: string;
  ready: () => void;
  expand: () => void;
  close?: () => void;
  openTelegramLink?: (url: string) => void;
  openLink?: (url: string) => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  HapticFeedback?: TelegramHapticFeedback;
  BackButton?: TelegramBackButton;
};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}

export type AppUser = {
  id: string;
  telegramId: number;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  displayName: string | null;
  score: number;
  language?: string | null;
};

export type AuthResponse = {
  user: AppUser;
  isAdmin: boolean;
};

export type Difficulty = "easy" | "medium" | "hard";

export type RoundFilter = {
  category: string | null;
  difficulty: Difficulty | null;
};

export type GameStats = {
  gamesPlayed: number;
  accuracy: number;
  bestRoundScore: number;
  totalCorrect: number;
};

export type ReportedQuestion = {
  id: string;
  text: string;
  correctAnswer: string;
  category: string | null;
  difficulty: string | null;
  reportCount: number;
};

export type Question = {
  id: string;
  text: string;
  category: string | null;
  difficulty: string | null;
  /**
   * A/B/C/D rejimi variantlari (backend aralashtirilgan tartibda yuboradi,
   * to'g'ri javob shu massivning bir elementi). Bo'sh massiv yoki 4 ta
   * emas — erkin matn rejimi (Gemini AI baholaydi).
   *
   * MUHIM: To'g'ri javob hech qachon alohida `correctAnswer` sifatida
   * frontend'ga keladi emas — sahifa source orqali cheat'lash xavfi.
   * Frontend faqat foydalanuvchi tanlovini server'ga yuboradi,
   * server tasdiqlaydi.
   */
  options: string[];
  /**
   * Savol uchun vaqt limiti (soniya). null yoki undefined = standart (15s).
   */
  timeLimitSeconds?: number | null;
};

export type RevealInfo = {
  correctAnswer: string;
  explanation: string;
};

export type AnswerStatus = "correct" | "partial" | "incorrect";

export type AnswerResult = {
  isCorrect: boolean;
  status: AnswerStatus;
  explanation: string;
  correctAnswer: string;
  pointsEarned: number;
  streak: number;
  betAmount?: number;
  betWon?: number;
};

export type DailyStreak = {
  current: number;
  longest: number;
};

export type DailyInfo = {
  date: string;
  questions: Question[];
  completed: boolean;
  streak: DailyStreak;
  bonusPreview: number;
};

export type DailyCompleteResult = {
  newStreak: number;
  longestStreak: number;
  streakBonus: number;
};

export type GameHistoryItem = {
  id: string;
  correctCount: number;
  totalCount: number;
  roundScore: number;
  accuracy: number;
  createdAt: string;
};

export type Screen =
  | "loading"
  | "name"
  | "home"
  | "question"
  | "result"
  | "finish"
  | "team"
  | "profile"
  | "admin"
  | "leaderboard"
  | "battle"
  | "svoyak"
  | "daily"
  | "gameroom";

export type NavTab = "home" | "leaderboard" | "svoyak" | "team" | "profile" | "admin";

// ─── Online O'yin Xonasi (GameRoom) ──────────────────────────────────────────

export type GameRoomStatus = "waiting" | "active" | "finished";

export type GameQuestionType = "text" | "audio" | "image";

/** Backend `_serialize_question_for_participant` ga mos. */
export type GameRoomQuestion = {
  id: number;
  questionType: GameQuestionType;
  body: string;
  /** Telegram file_id yoki URL. null = mavjud emas. */
  mediaRef: string | null;
  /**
   * Backend tomonidan tayyor media URL.
   * - Mutlaq http(s) URL → to'g'ridan-to'g'ri ishlatiladi.
   * - Nisbiy /api/... yo'l → autentifikatsiya bilan proxy orqali yuklanadi.
   * - null/undefined → media yo'q.
   */
  mediaUrl?: string | null;
  caption: string | null;
  timeLimitSeconds: number;
  pointValue: number;
  orderIndex: number;
  isBonus: boolean;
  isQuick: boolean;
  status: "active" | "closed";
  activatedAt: string | null;
  closedAt: string | null;
  timeRemainingMs: number;
  isExpired: boolean;
  /** Faqat savol yopilgandan keyin yoki admin ko'rganda. */
  correctAnswer: string | null;
  mySubmission: GameRoomSubmission | null;
};

export type GameRoomSubmission = {
  submissionId: number;
  answerText: string;
  submittedAt: string;
  updatedAt: string;
  /** null = hali baholanmagan yoki savol hali ochiq. */
  isCorrect: boolean | null;
  pointsAwarded: number | null;
};

export type GameRoomParticipant = {
  rank: number;
  telegramId: number;
  displayName: string;
  totalPoints: number;
  joinedAt: string;
};

/** Backend `get_room_state` javobi. */
export type GameRoomState = {
  code: string;
  name: string;
  status: GameRoomStatus;
  adminTelegramId: number;
  hasPassword: boolean;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  participantCount: number;
  leaderboard: GameRoomParticipant[];
  currentQuestion: GameRoomQuestion | null;
  viewerTelegramId: number;
  viewerIsAdmin: boolean;
};

/** Backend `get_leaderboard` javobi. */
export type GameRoomLeaderboard = {
  roomCode: string;
  roomName: string;
  status: GameRoomStatus;
  leaderboard: GameRoomParticipant[];
  /** Faqat `finished` bo'lsa to'ldiriladi. */
  winners: GameRoomParticipant[];
  viewerTelegramId: number;
};

/** Backend `submit_answer` javobi. */
export type GameRoomSubmitResult = {
  submissionId: number;
  questionId: number;
  answerText: string;
  submittedAt: string;
  updatedAt: string;
  graded: boolean;
};

export type LeaderboardUser = AppUser;

export type LeaderboardData = {
  users: LeaderboardUser[];
  rank: number;
};

export type ReferralEntry = {
  user: LeaderboardUser;
  count: number;
};

export type ReferralData = {
  referrers: ReferralEntry[];
  myCount: number;
};

export type TeamStatus = "open" | "in_battle" | "closed";

export type Team = {
  id: string;
  name: string;
  code: string;
  ownerId: number;
  maxMembers: number;
  status: TeamStatus;
  createdAt: string;
};

export type TeamMember = {
  telegramId: number;
  joinedAt: string;
  firstName: string | null;
  username: string | null;
};

export type TeamWithMembers = Team & {
  members: TeamMember[];
};

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

export type BattleStatus = "pending" | "accepted" | "in_progress" | "finished" | "declined";

export type BattleTeamMemberView = {
  telegramId: number;
  firstName: string | null;
  username: string | null;
  answeredCurrentRound: boolean;
  isCaptain: boolean;
};

export type BattleTeamView = {
  id: string;
  name: string;
  score: number;
  /** Jamoa egasining telegram_id si (sardor). */
  ownerId: number;
  members: BattleTeamMemberView[];
};

export type BattleRoundView = {
  roundId: string;
  roundNumber: number;
  totalRounds: number;
  questionText: string;
  /**
   * A/B/C/D rejimi variantlari (4 ta shuffled, to'g'ri javob ichida yashirin).
   * Bo'sh massiv yoki 4'dan kam — erkin matn rejimi (Gemini AI).
   */
  options?: string[];
  /**
   * To'g'ri javob — faqat foydalanuvchi javob bergan yoki vaqt tugagan bo'lsa
   * backend qaytaradi. Aks holda null.
   */
  correctAnswer?: string | null;
  timeLimitSeconds: number;
  timeRemainingMs: number;
  myAnswered: boolean;
  /** Challenger jamoa sardori shu roundga javob berganmi. */
  challengerTeamAnswered?: boolean;
  /** Opponent jamoa sardori shu roundga javob berganmi. */
  opponentTeamAnswered?: boolean;
};

export type BattleState = {
  battleId: string;
  status: BattleStatus;
  challengerTeam: BattleTeamView;
  opponentTeam: BattleTeamView;
  myTeamId: string | null;
  /** Joriy foydalanuvchi o'z jamoasining sardori (egasi) ekanligini bildiradi. */
  isCaptain: boolean;
  currentRound: BattleRoundView | null;
  finished: boolean;
  winnerTeamId: string | null;
};

export type PendingChallenge = {
  battleId: string;
  status: BattleStatus;
  challengerTeam: Team;
  opponentTeam: Team;
  iAmOpponent: boolean;
  createdAt: string;
};
