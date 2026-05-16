import { calculateAnswerScore } from "../utils/scoring";
import type {
  AnswerResult,
  AnswerStatus,
  AppUser,
  AuthResponse,
  GameStats,
  LeaderboardUser,
  NewQuestionInput,
  Question,
  RoundFilter,
  Submission
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
    category: "geography",
    difficulty: "easy",
    correctAnswer: "Toshkent"
  },
  {
    id: "2",
    text: "Alisher Navoiy qaysi asrda yashagan?",
    category: "history",
    difficulty: "easy",
    correctAnswer: "XV asr"
  },
  {
    id: "3",
    text: "Suv necha darajada qaynaydi?",
    category: "science",
    difficulty: "easy",
    correctAnswer: "100 daraja"
  },
  {
    id: "4",
    text: "O'zbekiston mustaqilligini qaysi yili oldi?",
    category: "history",
    difficulty: "easy",
    correctAnswer: "1991"
  },
  {
    id: "5",
    text: "Matematik: 15 × 8 = ?",
    category: "math",
    difficulty: "easy",
    correctAnswer: "120"
  },
  {
    id: "6",
    text: "Dunyo bo'yicha eng baland tog' qaysi?",
    category: "geography",
    difficulty: "medium",
    correctAnswer: "Everest"
  },
  {
    id: "7",
    text: "Insonning normal tana harorati necha daraja?",
    category: "science",
    difficulty: "easy",
    correctAnswer: "36.6"
  },
  {
    id: "8",
    text: "O'zbekistonning milliy valyutasi nima?",
    category: "general",
    difficulty: "easy",
    correctAnswer: "So'm"
  },
  {
    id: "9",
    text: "Bir yilda necha kun bor?",
    category: "general",
    difficulty: "easy",
    correctAnswer: "365"
  },
  {
    id: "10",
    text: "Amir Temur qaysi shaharda tug'ilgan?",
    category: "history",
    difficulty: "medium",
    correctAnswer: "Kesh (Shahrisabz)"
  }
];

type RequestOptions = {
  body?: unknown;
  initData?: string;
  method?: "GET" | "POST";
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

export async function login(initData: string): Promise<AuthResponse> {
  try {
    const response = await request<AuthResponse>("/auth/login", {
      method: "POST",
      initData,
      body: { initData }
    });

    return response ?? FALLBACK_AUTH;
  } catch (error) {
    console.error("Login fallback enabled", error);
    return FALLBACK_AUTH;
  }
}

export async function getCategories(): Promise<string[]> {
  const response = await request<{ categories: string[] }>("/questions/categories");

  if (response?.categories?.length) {
    return response.categories;
  }

  return [...new Set(FALLBACK_QUESTIONS.map((question) => question.category).filter(isText))].sort();
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

export async function submitAnswer(
  question: Question,
  userAnswer: string,
  timeTaken: number,
  streakBefore: number
): Promise<AnswerResult> {
  const offlineAnswer = findFallbackAnswer(question.id);

  if (timeTaken >= ANSWER_TIMEOUT_MS) {
    return {
      isCorrect: false,
      status: "incorrect",
      explanation: "Vaqt tugadi",
      correctAnswer: offlineAnswer ?? "",
      pointsEarned: 0,
      streak: 0
    };
  }

  if (offlineAnswer !== undefined) {
    const status = checkAnswerLocally(offlineAnswer, userAnswer);
    const score = calculateAnswerScore({
      status,
      difficulty: question.difficulty,
      timeTakenMs: timeTaken,
      streakBefore
    });

    return {
      isCorrect: status === "correct",
      status,
      explanation: "",
      correctAnswer: offlineAnswer,
      pointsEarned: score.pointsEarned,
      streak: score.streakAfter
    };
  }

  const response = await request<SubmitAnswerApiResponse>("/answer", {
    method: "POST",
    body: { questionId: question.id, userAnswer, timeTaken, streak: streakBefore }
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

  return {
    isCorrect: false,
    status: "incorrect",
    explanation: "Javobni tekshirib bo'lmadi",
    correctAnswer: "",
    pointsEarned: 0,
    streak: 0
  };
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
  decision: "approve" | "reject"
): Promise<boolean> {
  const response = await request<{ status: string }>(`/submissions/${submissionId}/review`, {
    method: "POST",
    body: { decision }
  });

  return Boolean(response?.status);
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
