export type TelegramUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
};

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
  question: string;
};

export type AnswerPayload = {
  questionId: string;
  answer: string;
};

export type AnswerResult = {
  isCorrect: boolean;
  score: number;
  feedback: string;
};

export type AnswerStatus = "idle" | "checking" | "correct" | "wrong" | "timeout";
