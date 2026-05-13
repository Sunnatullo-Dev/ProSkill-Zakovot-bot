export type TelegramUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
};

export type TelegramWebApp = {
  initData: string;
  initDataUnsafe: {
    user?: TelegramUser;
  };
  ready: () => void;
  expand: () => void;
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
  score: number;
};

export type AuthResponse = {
  user: AppUser;
};

export type Question = {
  id: string;
  text: string;
  category: string | null;
  difficulty: string | null;
};

export type AnswerResult = {
  isCorrect: boolean;
  explanation: string;
  newScore: number;
  correctAnswer: string;
};

export type Screen = "loading" | "home" | "question" | "result" | "finish";

export type LeaderboardUser = AppUser;
