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
  | "battle";

export type NavTab = "home" | "leaderboard" | "team" | "profile" | "admin";

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
};

export type BattleTeamView = {
  id: string;
  name: string;
  score: number;
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
  timeLimitSeconds: number;
  timeRemainingMs: number;
  myAnswered: boolean;
};

export type BattleState = {
  battleId: string;
  status: BattleStatus;
  challengerTeam: BattleTeamView;
  opponentTeam: BattleTeamView;
  myTeamId: string | null;
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
