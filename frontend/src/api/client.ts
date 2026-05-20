import { calculateAnswerScore } from "../utils/scoring";
import type {
  AnswerResult,
  AnswerStatus,
  ApiResult,
  AppUser,
  AuthResponse,
  BattleState,
  Difficulty,
  GameStats,
  LeaderboardData,
  LeaderboardUser,
  NewQuestionInput,
  PendingChallenge,
  Question,
  ReferralData,
  ReportedQuestion,
  RevealInfo,
  RoundFilter,
  Submission,
  Team,
  TeamWithMembers
} from "../types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
const API_BASE_URL = `${API_URL.replace(/\/$/, "")}/api`;
const ANSWER_TIMEOUT_MS = 15000;
const DEFAULT_ROUND_COUNT = 10;
const EMPTY_STATS: GameStats = { gamesPlayed: 0, accuracy: 0, bestRoundScore: 0, totalCorrect: 0 };
const DEFAULT_USER: AppUser = {
  id: "0",
  telegramId: 0,
  firstName: "Zakovatchi",
  lastName: null,
  username: "guest",
  score: 0
};

type FallbackQuestion = Question & { correctAnswer: string };

const FALLBACK_QUESTIONS: FallbackQuestion[] = [
  {
    id: "1",
    text: "O'zbekistonning poytaxti qaysi shahar?",
    category: "Geografiya",
    difficulty: "easy",
    correctAnswer: "Toshkent"
  },
  {
    id: "2",
    text: "Alisher Navoiy qaysi asrda yashagan?",
    category: "Tarix",
    difficulty: "easy",
    correctAnswer: "XV asr"
  },
  {
    id: "3",
    text: "Suv necha darajada qaynaydi?",
    category: "Fan",
    difficulty: "easy",
    correctAnswer: "100 daraja"
  },
  {
    id: "4",
    text: "O'zbekiston mustaqilligini qaysi yili oldi?",
    category: "Tarix",
    difficulty: "easy",
    correctAnswer: "1991"
  },
  {
    id: "5",
    text: "Matematik: 15 × 8 = ?",
    category: "Matematika",
    difficulty: "easy",
    correctAnswer: "120"
  },
  {
    id: "6",
    text: "Dunyo bo'yicha eng baland tog' qaysi?",
    category: "Geografiya",
    difficulty: "medium",
    correctAnswer: "Everest"
  },
  {
    id: "7",
    text: "Insonning normal tana harorati necha daraja?",
    category: "Fan",
    difficulty: "easy",
    correctAnswer: "36.6"
  },
  {
    id: "8",
    text: "O'zbekistonning milliy valyutasi nima?",
    category: "Umumiy",
    difficulty: "easy",
    correctAnswer: "So'm"
  },
  {
    id: "9",
    text: "Bir yilda necha kun bor?",
    category: "Umumiy",
    difficulty: "easy",
    correctAnswer: "365"
  },
  {
    id: "10",
    text: "Amir Temur qaysi shaharda tug'ilgan?",
    category: "Tarix",
    difficulty: "medium",
    correctAnswer: "Kesh (Shahrisabz)"
  }
];

type RequestOptions = {
  body?: unknown;
  initData?: string;
  method?: "GET" | "POST" | "DELETE" | "PATCH";
};

export type SubmissionEdits = {
  text?: string;
  correctAnswer?: string;
  category?: string;
  difficulty?: Difficulty;
};

type TopUsersResponse = {
  users: LeaderboardUser[];
};

type SubmissionsResponse = {
  submissions: Submission[];
};

export type SubmitQuestionResult = {
  ok: boolean;
  message: string;
};

export type SaveGameResultInput = {
  correctCount: number;
  totalCount: number;
  roundScore: number;
};

type RemoteQuestion = {
  id: string | number;
  text: string;
  category: string | null;
  difficulty: string | null;
};

type SubmitAnswerApiResponse = {
  status: AnswerStatus;
  isCorrect: boolean;
  explanation: string;
  correctAnswer: string;
  pointsEarned: number;
  streak: number;
};

const FALLBACK_AUTH: AuthResponse = { user: DEFAULT_USER, isAdmin: false };

export async function login(initData: string, referrerId?: number): Promise<AuthResponse> {
  try {
    const response = await request<AuthResponse>("/auth/login", {
      method: "POST",
      initData,
      body: referrerId ? { initData, referrerId } : { initData }
    });

    return response ?? FALLBACK_AUTH;
  } catch (error) {
    console.error("Login fallback enabled", error);
    return FALLBACK_AUTH;
  }
}

export async function getReferrals(): Promise<ReferralData> {
  try {
    const response = await request<ReferralData>("/users/referrals");

    return response ?? { referrers: [], myCount: 0 };
  } catch (error) {
    console.error("Referrals fallback enabled", error);
    return { referrers: [], myCount: 0 };
  }
}

export async function getCategories(): Promise<string[]> {
  const response = await request<{ categories: string[] }>("/questions/categories");

  if (response?.categories?.length) {
    return [...response.categories].sort((left, right) => left.localeCompare(right));
  }

  return [...new Set(FALLBACK_QUESTIONS.map((question) => question.category).filter(isText))].sort(
    (left, right) => left.localeCompare(right)
  );
}

export async function getRound(
  filter: RoundFilter,
  count = DEFAULT_ROUND_COUNT
): Promise<Question[]> {
  const params = new URLSearchParams({ count: String(count) });

  if (filter.category) {
    params.set("category", filter.category);
  }

  if (filter.difficulty) {
    params.set("difficulty", filter.difficulty);
  }

  const response = await request<{ questions: RemoteQuestion[] }>(`/questions/round?${params}`);

  if (response?.questions?.length) {
    return response.questions.map(normalizeQuestion);
  }

  return getFallbackRound(filter, count);
}

export async function getAnswerTicket(questionId: string): Promise<string | null> {
  const response = await request<{ ticket: string }>("/answer/ticket", {
    method: "POST",
    body: { questionId }
  });

  return response?.ticket ?? null;
}

export async function submitAnswer(
  question: Question,
  userAnswer: string,
  timeTaken: number,
  streakBefore: number,
  ticket: string | null
): Promise<AnswerResult> {
  const offlineAnswer = findFallbackAnswer(question.id);

  if (offlineAnswer !== undefined) {
    if (timeTaken >= ANSWER_TIMEOUT_MS) {
      return {
        isCorrect: false,
        status: "incorrect",
        explanation: "Vaqt tugadi",
        correctAnswer: offlineAnswer,
        pointsEarned: 0,
        streak: 0
      };
    }

    const status = checkAnswerLocally(offlineAnswer, userAnswer);
    const score = calculateAnswerScore({ status, timeTakenMs: timeTaken, streakBefore });

    return {
      isCorrect: status === "correct",
      status,
      explanation: "",
      correctAnswer: offlineAnswer,
      pointsEarned: score.pointsEarned,
      streak: score.streakAfter
    };
  }

  if (ticket) {
    const response = await request<SubmitAnswerApiResponse>("/answer", {
      method: "POST",
      body: { ticket, userAnswer, streak: streakBefore }
    });

    if (response) {
      return {
        isCorrect: response.isCorrect,
        status: response.status,
        explanation: response.explanation,
        correctAnswer: response.correctAnswer,
        pointsEarned: response.pointsEarned,
        streak: response.streak
      };
    }
  }

  return {
    isCorrect: false,
    status: "incorrect",
    explanation: "Javobni tekshirib bo'lmadi",
    correctAnswer: "",
    pointsEarned: 0,
    streak: 0
  };
}

export async function revealAnswer(question: Question, ticket: string | null): Promise<RevealInfo> {
  const offlineAnswer = findFallbackAnswer(question.id);

  if (offlineAnswer !== undefined) {
    return { correctAnswer: offlineAnswer, explanation: "" };
  }

  if (ticket) {
    const response = await request<RevealInfo>("/answer/reveal", {
      method: "POST",
      body: { ticket }
    });

    if (response) {
      return response;
    }
  }

  return { correctAnswer: "", explanation: "" };
}

export async function reportQuestion(questionId: string): Promise<boolean> {
  const response = await request<{ ok: boolean }>(`/questions/${questionId}/report`, {
    method: "POST",
    body: {}
  });

  return Boolean(response?.ok);
}

export async function getReportedQuestions(): Promise<ReportedQuestion[]> {
  const response = await request<{ questions: ReportedQuestion[] }>("/questions/reported");

  return response?.questions ?? [];
}

export async function deleteQuestion(questionId: string): Promise<boolean> {
  const response = await request<{ ok: boolean }>(`/questions/${questionId}`, { method: "DELETE" });

  return Boolean(response?.ok);
}

export async function getTopUsers(limit = 3): Promise<LeaderboardUser[]> {
  try {
    const response = await request<TopUsersResponse>(`/users/top?limit=${limit}`);

    return response?.users ?? [];
  } catch (error) {
    console.error("Top users fallback enabled", error);
    return [];
  }
}

export async function getLeaderboard(): Promise<LeaderboardData> {
  try {
    const response = await request<LeaderboardData>("/users/leaderboard");

    return response ?? { users: [], rank: 0 };
  } catch (error) {
    console.error("Leaderboard fallback enabled", error);
    return { users: [], rank: 0 };
  }
}

export async function saveGameResult(input: SaveGameResultInput): Promise<void> {
  await request("/game-results", { method: "POST", body: input });
}

export async function getGameStats(): Promise<GameStats> {
  const response = await request<{ stats: GameStats }>("/game-results/stats");

  return response?.stats ?? EMPTY_STATS;
}

export async function submitQuestion(input: NewQuestionInput): Promise<SubmitQuestionResult> {
  const response = await request<{ submission: Submission }>("/submissions", {
    method: "POST",
    body: input
  });

  if (response?.submission) {
    return { ok: true, message: "Savol adminga yuborildi. Tasdiqlangach bazaga qo'shiladi." };
  }

  return {
    ok: false,
    message: "Savol yuborilmadi. Internet aloqasini yoki maydonlarni tekshiring."
  };
}

export async function getMySubmissions(): Promise<Submission[]> {
  const response = await request<SubmissionsResponse>("/submissions/mine");

  return response?.submissions ?? [];
}

export async function getPendingSubmissions(): Promise<Submission[]> {
  const response = await request<SubmissionsResponse>("/submissions/pending");

  return response?.submissions ?? [];
}

export async function reviewSubmission(
  submissionId: string,
  decision: "approve" | "reject",
  edits?: SubmissionEdits
): Promise<boolean> {
  const response = await request<{ status: string }>(`/submissions/${submissionId}/review`, {
    method: "POST",
    body: { decision, ...edits }
  });

  return Boolean(response?.status);
}

export async function createTeam(name: string): Promise<ApiResult<{ team: Team; code: string }>> {
  return requestResult<{ team: Team; code: string }>("/teams", {
    method: "POST",
    body: { name }
  });
}

export async function joinTeamByCode(
  code: string
): Promise<ApiResult<{ team: TeamWithMembers; members: TeamWithMembers["members"] }>> {
  return requestResult<{ team: TeamWithMembers; members: TeamWithMembers["members"] }>(
    "/teams/join",
    {
      method: "POST",
      body: { code }
    }
  );
}

export async function getMyTeam(): Promise<TeamWithMembers | null> {
  try {
    const response = await request<{ team: TeamWithMembers | null }>("/teams/my");

    return response?.team ?? null;
  } catch (error) {
    console.error("getMyTeam failed", error);

    return null;
  }
}

export async function leaveTeam(): Promise<boolean> {
  const response = await request<{ ok: boolean }>("/teams/leave", { method: "DELETE" });

  return Boolean(response?.ok);
}

export async function getPendingBattles(): Promise<PendingChallenge[]> {
  try {
    const response = await request<{ challenges: PendingChallenge[] }>("/battles/pending");

    return response?.challenges ?? [];
  } catch (error) {
    console.error("getPendingBattles failed", error);

    return [];
  }
}

export async function challengeTeamByCode(
  opponentCode: string
): Promise<ApiResult<{ battleId: string }>> {
  return requestResult<{ battleId: string }>("/battles/challenge", {
    method: "POST",
    body: { opponent_code: opponentCode }
  });
}

export async function acceptBattle(battleId: string): Promise<ApiResult<{ battleId: string }>> {
  return requestResult<{ battleId: string }>(`/battles/${battleId}/accept`, {
    method: "POST",
    body: {}
  });
}

export async function declineBattle(battleId: string): Promise<ApiResult<{ ok: boolean }>> {
  return requestResult<{ ok: boolean }>(`/battles/${battleId}/decline`, {
    method: "POST",
    body: {}
  });
}

export async function cancelBattle(battleId: string): Promise<ApiResult<{ ok: boolean }>> {
  return requestResult<{ ok: boolean }>(`/battles/${battleId}/cancel`, {
    method: "POST",
    body: {}
  });
}

export async function getBattleState(battleId: string): Promise<BattleState | null> {
  try {
    const response = await request<BattleState>(`/battles/${battleId}/state`);

    return response ?? null;
  } catch (error) {
    console.error("getBattleState failed", error);

    return null;
  }
}

// ----- Admin -----

export type AdminStats = {
  users: number;
  questions: number;
  submissions: { pending: number; approved: number; rejected: number };
  categories: Array<{ category: string; count: number }>;
  games: number;
  battles: number;
  teams: number;
};

export type AdminQuestion = {
  id: string;
  text: string;
  correctAnswer: string;
  category: string | null;
  difficulty: string | null;
};

export type AdminQuestionsResponse = {
  items: AdminQuestion[];
  total: number;
  page: number;
  limit: number;
};

export type AdminQuestionsFilter = {
  search?: string;
  category?: string;
  difficulty?: "easy" | "medium" | "hard";
  page?: number;
  limit?: number;
};

export type AdminCategoryStat = { category: string; count: number };

export async function getAdminStats(): Promise<AdminStats | null> {
  return (await request<AdminStats>("/admin/stats")) ?? null;
}

export async function getAdminQuestions(
  filter: AdminQuestionsFilter = {}
): Promise<AdminQuestionsResponse> {
  const params = new URLSearchParams();

  if (filter.search) params.set("search", filter.search);
  if (filter.category) params.set("category", filter.category);
  if (filter.difficulty) params.set("difficulty", filter.difficulty);
  if (filter.page) params.set("page", String(filter.page));
  if (filter.limit) params.set("limit", String(filter.limit));

  const query = params.toString();
  const path = query ? `/admin/questions?${query}` : "/admin/questions";
  const response = await request<AdminQuestionsResponse>(path);

  return (
    response ?? {
      items: [],
      total: 0,
      page: filter.page ?? 1,
      limit: filter.limit ?? 20
    }
  );
}

export async function createAdminQuestion(input: {
  text: string;
  correctAnswer: string;
  category?: string | null;
  difficulty?: "easy" | "medium" | "hard" | null;
}): Promise<ApiResult<{ ok: boolean }>> {
  return requestResult<{ ok: boolean }>("/admin/questions", {
    method: "POST",
    body: input
  });
}

export async function bulkCreateAdminQuestions(
  questions: Array<{
    text: string;
    correctAnswer: string;
    category?: string | null;
    difficulty?: "easy" | "medium" | "hard" | null;
  }>
): Promise<ApiResult<{ ok: boolean; inserted: number }>> {
  return requestResult<{ ok: boolean; inserted: number }>("/admin/questions/bulk", {
    method: "POST",
    body: { questions }
  });
}

export async function updateAdminQuestion(
  id: string,
  input: {
    text?: string;
    correctAnswer?: string;
    category?: string | null;
    difficulty?: "easy" | "medium" | "hard" | null;
  }
): Promise<ApiResult<{ ok: boolean }>> {
  return requestResult<{ ok: boolean }>(`/admin/questions/${id}`, {
    method: "PATCH",
    body: input
  });
}

export async function deleteAdminQuestion(id: string): Promise<ApiResult<{ ok: boolean }>> {
  return requestResult<{ ok: boolean }>(`/admin/questions/${id}`, { method: "DELETE" });
}

export async function getAdminCategories(): Promise<AdminCategoryStat[]> {
  const response = await request<{ items: AdminCategoryStat[] }>("/admin/categories");

  return response?.items ?? [];
}

export async function renameAdminCategory(
  oldName: string,
  newName: string
): Promise<ApiResult<{ ok: boolean; updatedCount: number }>> {
  return requestResult<{ ok: boolean; updatedCount: number }>("/admin/categories/rename", {
    method: "POST",
    body: { oldName, newName }
  });
}

export async function submitBattleAnswer(
  battleId: string,
  roundId: string,
  answer: string
): Promise<ApiResult<{ isCorrect: boolean; correctAnswer: string }>> {
  return requestResult<{ isCorrect: boolean; correctAnswer: string }>(`/battles/${battleId}/answer`, {
    method: "POST",
    body: { roundId, answer }
  });
}

// Backend xato xabarini UI ga uzatish uchun result-tipidagi yordamchi.
async function requestResult<T>(path: string, options: RequestOptions = {}): Promise<ApiResult<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? "GET",
      headers: buildHeaders(options.initData),
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    const responseBody = await parseResponse(response);

    if (!response.ok) {
      const message =
        (responseBody as { message?: string } | null)?.message ??
        `So'rov muvaffaqiyatsiz (${response.status})`;

      return { ok: false, error: message };
    }

    return { ok: true, data: responseBody as T };
  } catch (error) {
    console.error("API request error", error);

    return { ok: false, error: "Internet aloqasi bilan muammo" };
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T | null> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? "GET",
      headers: buildHeaders(options.initData),
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    const responseBody = await parseResponse(response);

    if (!response.ok) {
      console.error("API request failed", {
        path,
        status: response.status,
        responseBody
      });
      return null;
    }

    return responseBody as T;
  } catch (error) {
    console.error("API request error", error);
    return null;
  }
}

function buildHeaders(initDataOverride?: string) {
  const initData = initDataOverride ?? getTelegramInitData();
  const headers = new Headers({
    "Content-Type": "application/json"
  });

  if (initData) {
    headers.set("Authorization", `tma ${initData}`);
  }

  return headers;
}

async function parseResponse(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function getTelegramInitData() {
  return window.Telegram?.WebApp?.initData || "guest";
}

function getFallbackRound(filter: RoundFilter, count: number): Question[] {
  const matching = FALLBACK_QUESTIONS.filter((question) => {
    const categoryOk = !filter.category || question.category === filter.category;
    const difficultyOk = !filter.difficulty || question.difficulty === filter.difficulty;

    return categoryOk && difficultyOk;
  });
  const pool = matching.length > 0 ? matching : FALLBACK_QUESTIONS;

  return shuffle(pool)
    .slice(0, count)
    .map(normalizeQuestion);
}

function normalizeQuestion(question: RemoteQuestion): Question {
  return {
    id: String(question.id),
    text: question.text,
    category: question.category ?? null,
    difficulty: question.difficulty ?? null
  };
}

function findFallbackAnswer(id: string): string | undefined {
  return FALLBACK_QUESTIONS.find((question) => question.id === id)?.correctAnswer;
}

function checkAnswerLocally(correctAnswer: string, userAnswer: string): AnswerStatus {
  const clean = (value: string) =>
    value
      .toLowerCase()
      .trim()
      .replace(/[().,!?-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const user = clean(userAnswer);
  const correct = clean(correctAnswer);

  if (!user) {
    return "incorrect";
  }

  if (user === correct) {
    return "correct";
  }

  if (correct.includes(user) && user.length >= 3) {
    return "partial";
  }

  return "incorrect";
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }

  return result;
}

function isText(value: string | null): value is string {
  return Boolean(value);
}
