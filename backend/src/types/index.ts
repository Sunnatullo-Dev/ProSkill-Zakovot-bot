export type TelegramUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
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
  text: string;
  correct_answer: string;
  category: string | null;
  difficulty: string | null;
};

export type Question = {
  id: string;
  text: string;
  category: string | null;
  difficulty: string | null;
};

export type QuestionWithAnswer = Question & {
  correctAnswer: string;
};

export type CheckAnswerResult = {
  isCorrect: boolean;
  explanation: string;
};

export type SubmitAnswerResponse = CheckAnswerResult & {
  newScore: number;
  correctAnswer: string;
};
