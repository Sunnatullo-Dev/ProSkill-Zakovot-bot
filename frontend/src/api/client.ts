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

// Production build'da vite.config.ts VITE_API_URL'siz fail qiladi —
// shu yerga kelguncha env mavjudligiga ishonamiz. Dev'da bo'lmasa
// loud warning + localhost fallback.
const API_URL = (() => {
  const raw = import.meta.env.VITE_API_URL;
  if (raw && typeof raw === "string") return raw;
  if (import.meta.env.DEV) {
    console.warn("[zakovat] VITE_API_URL o'rnatilmagan, localhost:3000 ishlatilmoqda");
    return "http://localhost:3000";
  }
  // Production'da hech qachon bu yerga tushmaslik kerak (vite.config build'da
  // xato chiqaradi), lekin xavfsizlik uchun aniq xato chiqaramiz.
  throw new Error("VITE_API_URL o'rnatilmagan");
})();
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
  options?: string[] | null;
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

/**
 * Foydalanuvchining UI tilini backend bilan sinxron qiladi.
 * Mehmon (telegram_id=0) uchun backend 200 OK qaytaradi lekin DB'ga yozmaydi —
 * frontend localStorage'ga tayanadi.
 */
export async function updateMyLanguage(language: string): Promise<boolean> {
  const result = await request<{ ok: boolean }>("/users/me/language", {
    method: "PATCH",
    body: { language }
  });
  return Boolean(result?.ok);
}

export type WhoamiResponse = {
  isAuthenticated: boolean;
  telegramId: number;
  isAdmin: boolean;
  environment: {
    isProduction: boolean;
    hasBotToken: boolean;
    allowedHosts: string[];
  };
  diagnostic: {
    guestPathEnabled: boolean;
    willAcceptGuest: boolean;
    adminCount: number;
    currentUserIsInAdminList: boolean;
    adminListEmpty: boolean;
  };
};

/**
 * Diagnostika: backend joriy auth header'ni qanday ko'rmoqda?
 * Foydalanuvchi mini-app'dan ham, brauzerdan (manual curl bilan) ham
 * chaqirib o'z holatini bilib oladi.
 */
export async function whoami(): Promise<WhoamiResponse | null> {
  return await request<WhoamiResponse>("/auth/whoami");
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

export async function fetchTTS(
  text: string
): Promise<{ audio: string; mimeType: string } | null> {
  return request<{ audio: string; mimeType: string }>("/answer/tts", {
    method: "POST",
    body: { text }
  });
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
  ticket: string | null,
  betAmount = 0
): Promise<AnswerResult> {
  if (!ticket) {
    return {
      isCorrect: false,
      status: "incorrect",
      explanation: "Javobni tekshirib bo'lmadi",
      correctAnswer: "",
      pointsEarned: 0,
      streak: 0,
      betAmount: 0,
      betWon: 0
    };
  }

  const body: Record<string, unknown> = { ticket, userAnswer, streak: streakBefore };
  if (betAmount > 0) body.betAmount = betAmount;

  const response = await request<SubmitAnswerApiResponse & { betAmount?: number; betWon?: number }>("/answer/", {
    method: "POST",
    body
  });

  if (!response) {
    return {
      isCorrect: false,
      status: "incorrect",
      explanation: "Javobni tekshirib bo'lmadi",
      correctAnswer: "",
      pointsEarned: 0,
      streak: 0,
      betAmount: 0,
      betWon: 0
    };
  }

  return {
    isCorrect: response.isCorrect,
    status: response.status,
    explanation: response.explanation,
    correctAnswer: response.correctAnswer,
    pointsEarned: response.pointsEarned,
    streak: response.streak,
    betAmount: response.betAmount ?? 0,
    betWon: response.betWon ?? 0
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
  // `keepalive: true` brauzer mini-app oynasi yopilsa ham requestni tark
  // etmaydi — natija backend'ga yetib boradi. fetch fire-and-forget'i
  // window.close()'dan keyin uzilib qoladi; keepalive shu darani yopadi.
  try {
    await fetch(`${API_BASE_URL}/game-results/`, {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify(input),
      keepalive: true
    });
  } catch (error) {
    // Network error — game result yo'qoladi. Bu critical emas (faqat statistika).
    console.warn("saveGameResult failed", error);
  }
}

export async function getGameStats(): Promise<GameStats> {
  const response = await request<{ stats: GameStats }>("/game-results/stats");

  return response?.stats ?? EMPTY_STATS;
}

export async function getGameHistory(limit = 20): Promise<import("../types").GameHistoryItem[]> {
  const response = await request<{ results: import("../types").GameHistoryItem[] }>(
    `/game-results/history?limit=${limit}`
  );
  return response?.results ?? [];
}

export async function getDailyToday(): Promise<import("../types").DailyInfo | null> {
  try {
    const response = await request<import("../types").DailyInfo>("/daily/today");
    return response ?? null;
  } catch (error) {
    console.error("getDailyToday failed", error);
    return null;
  }
}

export async function completeDailyChallenge(
  correctCount: number,
  scoreEarned: number
): Promise<import("../types").DailyCompleteResult | null> {
  try {
    return await request<import("../types").DailyCompleteResult>("/daily/complete", {
      method: "POST",
      body: { correctCount, scoreEarned }
    });
  } catch (error) {
    console.error("completeDailyChallenge failed", error);
    return null;
  }
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

export async function transferTeamOwner(
  newOwnerTelegramId: number
): Promise<ApiResult<{ team: TeamWithMembers }>> {
  return requestResult<{ team: TeamWithMembers }>("/teams/my/transfer-owner", {
    method: "POST",
    body: { newOwnerTelegramId }
  });
}

// ----- Team chat -----

export type TeamChatMessage = {
  id: string;
  telegramId: number;
  text: string;
  createdAt: string | null;
};

export async function getTeamChat(): Promise<TeamChatMessage[]> {
  try {
    const response = await request<{ messages: TeamChatMessage[] }>("/teams/my/chat");
    return response?.messages ?? [];
  } catch (error) {
    console.error("getTeamChat failed", error);
    return [];
  }
}

export async function postTeamChat(
  text: string
): Promise<ApiResult<{ message: TeamChatMessage }>> {
  return requestResult<{ message: TeamChatMessage }>("/teams/my/chat/send", {
    method: "POST",
    body: { text }
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
  wrongAnswers?: string[];
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
  /** Aniq 3 ta noto'g'ri variant — A/B/C/D rejimi uchun. Bo'sh array → erkin matn rejimi. */
  wrongAnswers?: string[];
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
    wrongAnswers?: string[];
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
    wrongAnswers?: string[];
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

// ----- App Settings (feature flags) -----

export type AppSettings = {
  battleChatEnabled: boolean;
  battleChatPollIntervalMs: number;
  battleShowCorrectOnTimeout: boolean;
  ttsEnabled: boolean;
  ttsDefaultMuted: boolean;
  difficultyEasyEnabled: boolean;
  difficultyMediumEnabled: boolean;
  difficultyHardEnabled: boolean;
  svoyakCoordinatorEnabled: boolean;
  svoyakTimePerQuestion: number;
};

export async function getAppSettings(): Promise<AppSettings | null> {
  return (await request<AppSettings>("/admin/settings")) ?? null;
}

export async function updateAppSettings(
  patch: Partial<AppSettings>
): Promise<ApiResult<AppSettings>> {
  return requestResult<AppSettings>("/admin/settings", {
    method: "PATCH",
    body: patch
  });
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

// ─── Required Channels ────────────────────────────────────────────────────────

export type RequiredChannel = {
  id: number;
  channelId: string;
  channelUsername: string;
  channelTitle: string;
  channelUrl: string;
  isActive: boolean;
  addedByTelegramId: number | null;
  addedByName: string;
  createdAt: string | null;
};

export type ChannelSubscriptionStatus = {
  id: number;
  channelId: string;
  channelTitle: string;
  channelUrl: string;
  subscribed: boolean;
};

export type SubscriptionCheckResult = {
  allSubscribed: boolean;
  channels: ChannelSubscriptionStatus[];
};

/** Aktiv majburiy kanallar ro'yxati (public). */
export async function getRequiredChannels(): Promise<RequiredChannel[]> {
  const res = await request<{ channels: RequiredChannel[] }>("/channels/");
  return res?.channels ?? [];
}

/** Hozirgi foydalanuvchining obuna holatini tekshirish. */
export async function checkSubscriptions(): Promise<SubscriptionCheckResult | null> {
  return request<SubscriptionCheckResult>("/channels/check");
}

/** Admin: barcha kanallar (aktiv + o'chirilgan). */
export async function adminListChannels(): Promise<RequiredChannel[]> {
  const res = await request<{ channels: RequiredChannel[] }>("/admin/channels");
  return res?.channels ?? [];
}

/** Admin: yangi kanal qo'shish. */
export async function adminAddChannel(data: {
  channelId: string;
  channelUsername?: string;
  channelTitle: string;
  channelUrl: string;
}): Promise<ApiResult<{ ok: boolean; channel: RequiredChannel }>> {
  return requestResult<{ ok: boolean; channel: RequiredChannel }>("/admin/channels", {
    method: "POST",
    body: data,
  });
}

/** Admin: kanalni o'chirish (soft delete). */
export async function adminDeactivateChannel(id: number): Promise<ApiResult<{ ok: boolean }>> {
  return requestResult<{ ok: boolean }>(`/admin/channels/${id}`, { method: "DELETE" });
}

/** Admin: o'chirilgan kanalni qayta faollashtirish. */
export async function adminActivateChannel(id: number): Promise<ApiResult<{ ok: boolean }>> {
  return requestResult<{ ok: boolean }>(`/admin/channels/${id}`, { method: "POST" });
}

// ─────────────────────────────────────────────────────────────────────────────

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

  // Dev-only: X-Dev-Tid header (qarang src/svoyak/api.ts) — bir browser'dan
  // bir nechta tabni alohida foydalanuvchi sifatida ishlatish uchun.
  try {
    const devTid = typeof window !== "undefined" ? window.localStorage.getItem("svoyak:devTid") : null;
    if (devTid && /^\d+$/.test(devTid)) {
      headers.set("X-Dev-Tid", devTid);
    }
  } catch {
    /* ignore localStorage errors */
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
  const rawOptions = Array.isArray(question.options) ? question.options : [];
  // String list bo'lishi va bo'sh qatorlarsiz qoldirishni kafolatlaymiz —
  // backend ishonchli, lekin defensive (ko'pchilik manbalardan keladi).
  const options = rawOptions
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  return {
    id: String(question.id),
    text: question.text,
    category: question.category ?? null,
    difficulty: question.difficulty ?? null,
    options
  };
}
