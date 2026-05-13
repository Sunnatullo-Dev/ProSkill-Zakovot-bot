import type { AnswerPayload, AnswerResult, AuthResponse, Question } from "../types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
const API_BASE_URL = `${API_URL.replace(/\/$/, "")}/api`;

async function request<T>(path: string, initData: string | null, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  if (initData) {
    headers.set("Authorization", `Bearer ${initData}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  const responseBody = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(responseBody?.message ?? "Server bilan aloqa qilishda xatolik yuz berdi.");
  }

  return responseBody as T;
}

export const apiClient = {
  login(initData: string) {
    return request<AuthResponse>("/auth/telegram", null, {
      method: "POST",
      body: JSON.stringify({ initData })
    });
  },

  getRandomQuestion(initData: string) {
    return request<Question>("/questions/random", initData);
  },

  submitAnswer(initData: string, payload: AnswerPayload) {
    return request<AnswerResult>("/answers", initData, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }
};
