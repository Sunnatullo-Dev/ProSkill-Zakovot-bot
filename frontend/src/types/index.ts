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
  isAdmin: boolean;
};

export type SubmissionStatus = "pending" | "approved" | "rejected";

export type Submission = {
  id: string;
  text: string;
  correctAnswer: string;
  category: string | null;
  difficulty: string | null;
  submittedBy: number;
  status: SubmissionStatus;
  createdAt: string;
};

export type NewQuestionInput = {
  text: string;
  correctAnswer: string;
  category?: string;
  difficulty?: "easy" | "medium" | "hard";
};

export type Question = {
  id: string;
  text: string;
  category: string | null;
  difficulty: string | null;
};

export type AnswerStatus = "correct" | "partial" | "incorrect";

export type AnswerResult = {
  isCorrect: boolean;
  status: AnswerStatus;
  explanation: string;
  newScore: number;
  correctAnswer: string;
};

export type Screen =
  | "loading"
  | "home"
  | "question"
  | "result"
  | "finish"
  | "add"
  | "profile"
  | "admin";

export type NavTab = "home" | "add" | "profile" | "admin";

export type LeaderboardUser = AppUser;
