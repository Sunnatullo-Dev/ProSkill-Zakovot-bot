export type TelegramUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
};

export type TelegramAuthData = {
  authDate: number;
  user: TelegramUser;
};

export type DbUser = {
  id: string;
  telegram_id: number;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  score: number;
};

export type AppUser = {
  id: string;
  telegramId: number;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  score: number;
};

export type DbQuestion = {
  id: string;
  question: string;
  correct_answer: string;
};

export type QuestionWithAnswer = {
  id: string;
  question: string;
  correctAnswer: string;
};
