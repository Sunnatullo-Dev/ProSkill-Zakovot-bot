import { checkWithGemini } from "./gemini";
import type { AnswerResult, AppUser, AuthResponse, LeaderboardUser, Question } from "../types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
const API_BASE_URL = `${API_URL.replace(/\/$/, "")}/api`;
const ANSWER_TIMEOUT_MS = 15000;
const DEFAULT_USER: AppUser = {
  id: "0",
  telegramId: 0,
  firstName: "Zakovatchi",
  lastName: null,
  username: "guest",
  score: 0
};
const FALLBACK_QUESTIONS = [
  {
    id: "1",
    text: "O'zbekistonning poytaxti qaysi shahar?",
    category: "geography",
    difficulty: "easy",
    correct_answer: "Toshkent"
  },
  {
    id: "2",
    text: "Alisher Navoiy qaysi asrda yashagan?",
    category: "history",
    difficulty: "easy",
    correct_answer: "XV asr"
  },
  {
    id: "3",
    text: "Suv necha darajada qaynaydi?",
    category: "science",
    difficulty: "easy",
    correct_answer: "100 daraja"
  },
  {
    id: "4",
    text: "O'zbekiston mustaqilligini qaysi yili oldi?",
    category: "history",
    difficulty: "easy",
    correct_answer: "1991"
  },
  {
    id: "5",
    text: "Matematik: 15 × 8 = ?",
    category: "math",
    difficulty: "easy",
    correct_answer: "120"
  },
  {
    id: "6",
    text: "Dunyo bo'yicha eng baland tog' qaysi?",
    category: "geography",
    difficulty: "medium",
    correct_answer: "Everest"
  },
  {
    id: "7",
    text: "Insonning normal tana harorati necha daraja?",
    category: "science",
    difficulty: "easy",
    correct_answer: "36.6"
  },
  {
    id: "8",
    text: "O'zbekistonning milliy valyutasi nima?",
    category: "general",
    difficulty: "easy",
    correct_answer: "So'm"
  },
  {
    id: "9",
    text: "Bir yilda necha kun bor?",
    category: "general",
    difficulty: "easy",
    correct_answer: "365"
  },
  {
    id: "10",
    text: "Amir Temur qaysi shaharda tug'ilgan?",
    category: "history",
    difficulty: "medium",
    correct_answer: "Kesh (Shahrisabz)"
  }
] satisfies Question[];

type RequestOptions = {
  body?: unknown;
  initData?: string;
  method?: "GET" | "POST";
};

type TopUsersResponse = {
  users: LeaderboardUser[];
};

type RemoteQuestion = {
  id: string | number;
  text: string;
  category: string | null;
  difficulty: string | null;
  correct_answer?: string;
  correctAnswer?: string;
};

export async function login(initData: string): Promise<AuthResponse> {
  try {
    const response = await request<AuthResponse>("/auth/login", {
      method: "POST",
      initData,
      body: { initData }
    });

    return response ?? { user: DEFAULT_USER };
  } catch (error) {
    console.error("Login fallback enabled", error);
    return { user: DEFAULT_USER };
  }
}

export async function getQuestion(): Promise<Question> {
  try {
    const response = await request<RemoteQuestion>("/questions/random");

    return response ? normalizeQuestion(response) : getRandomFallbackQuestion();
  } catch (error) {
    console.error("Question fallback enabled", error);
    return getRandomFallbackQuestion();
  }
}

export async function submitAnswer(
  questionId: string,
  questionText: string,
  correctAnswer: string,
  userAnswer: string,
  timeTaken: number
): Promise<AnswerResult> {
  void questionId;

  if (timeTaken >= ANSWER_TIMEOUT_MS) {
    return {
      isCorrect: false,
      status: "incorrect",
      explanation: "",
      newScore: 0,
      correctAnswer
    };
  }

  const result = await checkWithGemini(questionText, correctAnswer, userAnswer);

  return {
    isCorrect: result.status === "correct",
    status: result.status,
    explanation: result.explanation,
    newScore: result.status === "correct" ? 1 : 0,
    correctAnswer
  };
}

export async function getMe(): Promise<AppUser> {
  try {
    const response = await request<AuthResponse>("/auth/me");

    return response?.user ?? DEFAULT_USER;
  } catch (error) {
    console.error("Me fallback enabled", error);
    return DEFAULT_USER;
  }
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

function getRandomFallbackQuestion(): Question {
  const index = Math.floor(Math.random() * FALLBACK_QUESTIONS.length);
  const question = FALLBACK_QUESTIONS[index] ?? FALLBACK_QUESTIONS[0];

  return { ...question };
}

function normalizeQuestion(question: RemoteQuestion): Question {
  const id = String(question.id);
  const fallbackQuestion = FALLBACK_QUESTIONS.find(
    (fallback) => fallback.id === id || fallback.text === question.text
  );

  return {
    id,
    text: question.text,
    category: question.category ?? null,
    difficulty: question.difficulty ?? null,
    correct_answer: question.correct_answer ?? question.correctAnswer ?? fallbackQuestion?.correct_answer ?? ""
  };
}
