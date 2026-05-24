import type {
  AnswerResult,
  AnswerStatus,
  ApiResult,
  AppUser,
  AuthResponse,
  BattleState,
  GameStats,
  LeaderboardData,
  LeaderboardUser,
  PendingChallenge,
  Question,
  ReferralData,
  ReportedQuestion,
  RevealInfo,
  RoundFilter,
  Team,
  TeamWithMembers
} from "../types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
const API_BASE_URL = `${API_URL.replace(/\/$/, "")}/api`;
const DEFAULT_ROUND_COUNT = 10;
const EMPTY_STATS: GameStats = { gamesPlayed: 0, accuracy: 0, bestRoundScore: 0, totalCorrect: 0 };
// Login muvaffaqiyatsiz bo'lganda zaxira foydalanuvchi — ism bo'sh, frontend
// Telegram first_name'ini ishlatadi (yoki "Foydalanuvchi" placeholder).
const DEFAULT_USER: AppUser = {
  id: "0",
  telegramId: 0,
  firstName: null,
  lastName: null,
  username: null,
  displayName: null,
  score: 0
};

type RequestOptions = {
  body?: unknown;
  initData?: string;
  method?: "GET" | "POST" | "DELETE" | "PATCH";
};

type TopUsersResponse = {
  users: LeaderboardUser[];
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

export type AchievementUnlock = { id: string; label: string; bonus: number };
export type CheckAchievementsResponse = {
  newlyUnlocked: AchievementUnlock[];
  totalBonus: number;
  user: AppUser;
};

export async function updateMyDisplayName(
  displayName: string | null
): Promise<ApiResult<{ user: AppUser }>> {
  return requestResult<{ user: AppUser }>("/users/me", {
    method: "PATCH",
    body: { displayName }
  });
}

export async function checkAchievements(): Promise<CheckAchievementsResponse | null> {
  try {
    const response = await request<CheckAchievementsResponse>("/users/me/check-achievements", {
      method: "POST",
      body: {}
    });

    return response ?? null;
  } catch (error) {
    console.error("checkAchievements failed", error);
    return null;
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
  return (response?.questions ?? []).map(normalizeQuestion);
}

export async function getAnswerTicket(questionId: string): Promise<string | null> {
  const response = await request<{ ticket: string }>("/answer/ticket", {
    method: "POST",
    body: { questionId }
  });

  return response?.ticket ?? null;
}

export async function submitAnswer(
  _question: Question,
  userAnswer: string,
  _timeTaken: number,
  streakBefore: number,
  ticket: string | null
): Promise<AnswerResult> {
  if (!ticket) {
    return {
      isCorrect: false,
      status: "incorrect",
      explanation: "Javobni tekshirib bo'lmadi",
      correctAnswer: "",
      pointsEarned: 0,
      streak: 0
    };
  }

  const response = await request<SubmitAnswerApiResponse>("/answer", {
    method: "POST",
    body: { ticket, userAnswer, streak: streakBefore }
  });

  if (!response) {
    return {
      isCorrect: false,
      status: "incorrect",
      explanation: "Javobni tekshirib bo'lmadi",
      correctAnswer: "",
      pointsEarned: 0,
      streak: 0
    };
  }

  return {
    isCorrect: response.isCorrect,
    status: response.status,
    explanation: response.explanation,
    correctAnswer: response.correctAnswer,
    pointsEarned: response.pointsEarned,
    streak: response.streak
  };
}

export async function revealAnswer(_question: Question, ticket: string | null): Promise<RevealInfo> {
  if (!ticket) {
    return { correctAnswer: "", explanation: "" };
  }

  const response = await request<RevealInfo>("/answer/reveal", {
    method: "POST",
    body: { ticket }
  });

  return response ?? { correctAnswer: "", explanation: "" };
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

export async function renameMyTeam(
  name: string
): Promise<ApiResult<{ team: TeamWithMembers }>> {
  return requestResult<{ team: TeamWithMembers }>("/teams/my/rename", {
    method: "PATCH",
    body: { name }
  });
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

export async function forfeitBattle(battleId: string): Promise<void> {
  try {
    await request<{ ok: boolean }>(`/battles/${battleId}/forfeit`, {
      method: "POST",
      body: {}
    });
  } catch {
    // Forfeit silently fails — we still exit the page
  }
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

function normalizeQuestion(question: RemoteQuestion): Question {
  return {
    id: String(question.id),
    text: question.text,
    category: question.category ?? null,
    difficulty: question.difficulty ?? null
  };
}
