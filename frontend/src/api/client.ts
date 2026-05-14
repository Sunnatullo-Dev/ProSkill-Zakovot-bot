import type { AnswerResult, AppUser, AuthResponse, LeaderboardUser, Question } from "../types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
const API_BASE_URL = `${API_URL.replace(/\/$/, "")}/api`;

type RequestOptions = {
  body?: unknown;
  initData?: string;
  method?: "GET" | "POST";
};

type TopUsersResponse = {
  users: LeaderboardUser[];
};

export async function login(initData: string): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/login", {
    method: "POST",
    initData,
    body: { initData }
  });
}

export async function getQuestion(): Promise<Question> {
  return request<Question>("/questions/random");
}

export async function submitAnswer(
  questionId: string,
  userAnswer: string,
  timeTaken: number
): Promise<AnswerResult> {
  return request<AnswerResult>("/answer", {
    method: "POST",
    body: {
      questionId,
      userAnswer,
      timeTaken
    }
  });
}

export async function getMe(): Promise<AppUser> {
  const response = await request<AuthResponse>("/auth/me");

  return response.user;
}

export async function getTopUsers(limit = 3): Promise<LeaderboardUser[]> {
  const response = await request<TopUsersResponse>(`/users/top?limit=${limit}`);

  return response.users;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
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
      throw new Error("API request failed");
    }

    return responseBody as T;
  } catch (error) {
    console.error("API request error", error);
    throw error;
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
