/**
 * Ustoz AI — API client funksiyalari
 * Subject → Lesson → UstozQuestion ierarxiyasi
 */

const API_URL = (() => {
  const raw = import.meta.env.VITE_API_URL;
  if (raw && typeof raw === "string") return raw;
  return "http://localhost:3000";
})();
const BASE = `${API_URL.replace(/\/$/, "")}/api/ustoz`;
const ADMIN_BASE = `${API_URL.replace(/\/$/, "")}/api/admin/ustoz`;

function getInitData() {
  return window.Telegram?.WebApp?.initData || "guest";
}

function headers() {
  return {
    "Content-Type": "application/json",
    Authorization: `tma ${getInitData()}`,
  };
}

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: headers() });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.message ?? `HTTP ${res.status}`);
  return body as T;
}

async function post<T>(url: string, data: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(data),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.message ?? `HTTP ${res.status}`);
  return body as T;
}

async function patch(url: string, data: unknown): Promise<void> {
  const res = await fetch(url, {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message ?? `HTTP ${res.status}`);
  }
}

async function del(url: string): Promise<void> {
  const res = await fetch(url, { method: "DELETE", headers: headers() });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

// ─── Tiplar ──────────────────────────────────────────────────────────────────

export type UstozoSubject = {
  id: number;
  name: string;
  iconEmoji: string;
  description: string;
  lessonCount: number;
};

export type UstozoLesson = {
  id: number;
  name: string;
  description: string;
  questionCount: number;
};

export type UstozoQuestion = {
  id: number;
  text: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
};

export type UstozoCheckResult = {
  correct: boolean;
  correctOption: "a" | "b" | "c" | "d";
  explanation: string;
};

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getSubjects(): Promise<UstozoSubject[]> {
  const data = await get<{ items: UstozoSubject[] }>(`${BASE}/subjects/`);
  return data.items;
}

export async function getLessons(
  subjectId: number
): Promise<{ subject: { id: number; name: string; iconEmoji: string }; items: UstozoLesson[] }> {
  return get(`${BASE}/subjects/${subjectId}/lessons/`);
}

export async function getUstozQuestions(
  lessonId: number
): Promise<{
  lesson: { id: number; name: string; subject: { id: number; name: string } };
  items: UstozoQuestion[];
}> {
  return get(`${BASE}/lessons/${lessonId}/questions/`);
}

export async function checkUstozAnswer(
  questionId: number,
  selected: "a" | "b" | "c" | "d"
): Promise<UstozoCheckResult> {
  return post(`${BASE}/questions/${questionId}/check/`, { selected });
}

// ─── Admin API ────────────────────────────────────────────────────────────────

export type AdminSubject = UstozoSubject & { order: number; isActive: boolean };
export type AdminLesson = UstozoLesson & {
  subjectId: number;
  subjectName: string;
  order: number;
  isActive: boolean;
};
export type AdminQuestion = UstozoQuestion & {
  lessonId: number;
  lessonName: string;
  subjectName: string;
  correctOption: "a" | "b" | "c" | "d";
  explanation: string;
  order: number;
  isActive: boolean;
};

export async function adminGetSubjects(): Promise<AdminSubject[]> {
  const d = await get<{ items: AdminSubject[] }>(`${ADMIN_BASE}/subjects/`);
  return d.items;
}

export async function adminCreateSubject(data: {
  name: string;
  iconEmoji?: string;
  description?: string;
  order?: number;
}): Promise<{ id: number; name: string }> {
  return post(`${ADMIN_BASE}/subjects/`, data);
}

export async function adminUpdateSubject(
  id: number,
  data: Partial<{ name: string; iconEmoji: string; description: string; order: number; isActive: boolean }>
): Promise<void> {
  return patch(`${ADMIN_BASE}/subjects/${id}/`, data);
}

export async function adminDeleteSubject(id: number): Promise<void> {
  return del(`${ADMIN_BASE}/subjects/${id}/`);
}

export async function adminGetLessons(subjectId?: number): Promise<AdminLesson[]> {
  const url = subjectId
    ? `${ADMIN_BASE}/lessons/?subjectId=${subjectId}`
    : `${ADMIN_BASE}/lessons/`;
  const d = await get<{ items: AdminLesson[] }>(url);
  return d.items;
}

export async function adminCreateLesson(data: {
  subjectId: number;
  name: string;
  description?: string;
  order?: number;
}): Promise<{ id: number; name: string }> {
  return post(`${ADMIN_BASE}/lessons/`, data);
}

export async function adminUpdateLesson(
  id: number,
  data: Partial<{ name: string; description: string; order: number; isActive: boolean }>
): Promise<void> {
  return patch(`${ADMIN_BASE}/lessons/${id}/`, data);
}

export async function adminDeleteLesson(id: number): Promise<void> {
  return del(`${ADMIN_BASE}/lessons/${id}/`);
}

export async function adminGetQuestions(lessonId?: number): Promise<AdminQuestion[]> {
  const url = lessonId
    ? `${ADMIN_BASE}/questions/?lessonId=${lessonId}`
    : `${ADMIN_BASE}/questions/`;
  const d = await get<{ items: AdminQuestion[] }>(url);
  return d.items;
}

export async function adminCreateQuestion(data: {
  lessonId: number;
  text: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: "a" | "b" | "c" | "d";
  explanation?: string;
}): Promise<{ id: number }> {
  return post(`${ADMIN_BASE}/questions/`, data);
}

export async function adminUpdateQuestion(
  id: number,
  data: Partial<{
    text: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    correctOption: "a" | "b" | "c" | "d";
    explanation: string;
    isActive: boolean;
  }>
): Promise<void> {
  return patch(`${ADMIN_BASE}/questions/${id}/`, data);
}

export async function adminDeleteQuestion(id: number): Promise<void> {
  return del(`${ADMIN_BASE}/questions/${id}/`);
}
