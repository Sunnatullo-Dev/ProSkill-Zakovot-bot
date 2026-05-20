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

export type ReferralEntry = {
  user: AppUser;
  count: number;
};

export type TeamStatus = "open" | "in_battle" | "closed";

export type DbTeam = {
  id: string;
  name: string;
  code: string;
  owner_id: number;
  max_members: number;
  status: TeamStatus;
  created_at: string;
};

export type Team = {
  id: string;
  name: string;
  code: string;
  ownerId: number;
  maxMembers: number;
  status: TeamStatus;
  createdAt: string;
};

export type DbTeamMember = {
  id: string;
  team_id: string;
  telegram_id: number;
  joined_at: string;
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

export type ReportedQuestion = QuestionWithAnswer & {
  reportCount: number;
};

export type AnswerStatus = "correct" | "partial" | "incorrect";

export type CheckAnswerResult = {
  status: AnswerStatus;
  explanation: string;
};

export type SubmitAnswerResponse = {
  status: AnswerStatus;
  isCorrect: boolean;
  explanation: string;
  correctAnswer: string;
  pointsEarned: number;
  streak: number;
};

export type GameStats = {
  gamesPlayed: number;
  accuracy: number;
  bestRoundScore: number;
  totalCorrect: number;
};

export type DbGameResult = {
  id: string;
  telegram_id: number;
  correct_count: number;
  total_count: number;
  round_score: number;
  created_at: string;
};

export type NewGameResult = {
  telegramId: number;
  correctCount: number;
  totalCount: number;
  roundScore: number;
};

export type SubmissionStatus = "pending" | "approved" | "rejected";

export type DbSubmission = {
  id: string;
  text: string;
  correct_answer: string;
  category: string | null;
  difficulty: string | null;
  submitted_by: number;
  status: SubmissionStatus;
  created_at: string;
};

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

export type NewSubmission = {
  text: string;
  correctAnswer: string;
  category: string | null;
  difficulty: string | null;
  submittedBy: number;
};

export type NewQuestion = {
  text: string;
  correctAnswer: string;
  category: string | null;
  difficulty: string | null;
};
