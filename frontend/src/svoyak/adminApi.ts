/**
 * Svoyak admin API klient — faqat AdminPanel ichida ishlatiladi.
 *
 * `svoyak/api.ts` ichidagi buildHeaders/request mantiqi qayta ishlatiladi.
 * Backend tomondan har endpoint `require_admin` decorator bilan himoyalangan.
 */

const API_URL =
  (typeof import.meta.env !== "undefined" && (import.meta.env.VITE_API_URL as string | undefined)) ||
  "";

function buildHeaders(): Headers {
  const initData =
    (typeof window !== "undefined" && window.Telegram?.WebApp?.initData) || "guest";
  const headers = new Headers({ "Content-Type": "application/json" });
  if (initData) {
    headers.set("Authorization", `tma ${initData}`);
  }
  try {
    const devTid = typeof window !== "undefined" ? window.localStorage.getItem("svoyak:devTid") : null;
    if (devTid && /^\d+$/.test(devTid)) {
      headers.set("X-Dev-Tid", devTid);
    }
  } catch {
    /* ignore */
  }
  return headers;
}

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; query?: Record<string, string | number | undefined> } = {}
): Promise<T> {
  let url = `${API_URL}/api${path}`;
  if (options.query) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(options.query)) {
      if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
    }
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }
  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers: buildHeaders(),
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const data = await response.json();
      if (data && typeof data === "object" && "message" in data) {
        message = String(data.message);
      }
    } catch {
      /* ignore */
    }
    const err = new Error(message) as Error & { status?: number };
    err.status = response.status;
    throw err;
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}


// ─── Types ────────────────────────────────────────────────────────────────

export type AdminSvoyakCategory = {
  id: number;
  name: string;
  iconEmoji: string;
  language: string;
  order: number;
  isActive: boolean;
  questionCount: number;
};

export type AdminSvoyakQuestion = {
  id: number;
  categoryId: number;
  categoryName: string;
  categoryIcon: string;
  valueTier: 10 | 20 | 30 | 40 | 50;
  text: string;
  correctAnswer: string;
  wrongAnswers: string[];
  questionType: "abcd" | "text";
  isActive: boolean;
};

export type QuestionListResponse = {
  items: AdminSvoyakQuestion[];
  total: number;
  page: number;
  limit: number;
};

// ─── Categories ───────────────────────────────────────────────────────────

export async function adminListCategories(): Promise<AdminSvoyakCategory[]> {
  const data = await request<{ items: AdminSvoyakCategory[] }>("/svoyak/admin/categories");
  return data.items ?? [];
}

export async function adminCreateCategory(input: {
  name: string;
  iconEmoji?: string;
  language?: string;
  order?: number;
}): Promise<AdminSvoyakCategory> {
  return request<AdminSvoyakCategory>("/svoyak/admin/categories", {
    method: "POST",
    body: input,
  });
}

export async function adminUpdateCategory(
  id: number,
  input: Partial<{ name: string; iconEmoji: string; language: string; order: number; isActive: boolean }>
): Promise<AdminSvoyakCategory> {
  return request<AdminSvoyakCategory>(`/svoyak/admin/categories/${id}`, {
    method: "PATCH",
    body: input,
  });
}

export async function adminDeleteCategory(id: number): Promise<void> {
  await request<{ ok: boolean }>(`/svoyak/admin/categories/${id}`, {
    method: "DELETE",
  });
}

// ─── Questions ────────────────────────────────────────────────────────────

export async function adminListQuestions(filter: {
  categoryId?: number;
  valueTier?: number;
  search?: string;
  page?: number;
  limit?: number;
} = {}): Promise<QuestionListResponse> {
  return request<QuestionListResponse>("/svoyak/admin/questions", {
    query: {
      categoryId: filter.categoryId,
      valueTier: filter.valueTier,
      search: filter.search,
      page: filter.page,
      limit: filter.limit,
    },
  });
}

export async function adminCreateQuestion(input: {
  categoryId: number;
  valueTier: 10 | 20 | 30 | 40 | 50;
  text: string;
  correctAnswer: string;
  wrongAnswers?: string[]; // 3 ta yoki bo'sh (text mode)
}): Promise<AdminSvoyakQuestion> {
  return request<AdminSvoyakQuestion>("/svoyak/admin/questions", {
    method: "POST",
    body: input,
  });
}

export async function adminUpdateQuestion(
  id: number,
  input: Partial<{
    categoryId: number;
    valueTier: 10 | 20 | 30 | 40 | 50;
    text: string;
    correctAnswer: string;
    wrongAnswers: string[];
    isActive: boolean;
  }>
): Promise<AdminSvoyakQuestion> {
  return request<AdminSvoyakQuestion>(`/svoyak/admin/questions/${id}`, {
    method: "PATCH",
    body: input,
  });
}

export async function adminDeleteQuestion(id: number): Promise<void> {
  await request<{ ok: boolean }>(`/svoyak/admin/questions/${id}`, {
    method: "DELETE",
  });
}
