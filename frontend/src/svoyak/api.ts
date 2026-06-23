/**
 * Svoyak REST API klient.
 *
 * Mavjud `../api/client.ts` ichidagi `request` / `requestResult` helper'larni
 * qayta ishlatamiz — auth, headers, error handling shu yerda hal qilingan.
 */
import type { SvoyakRoomState } from "./types";

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
  // Dev-only: X-Dev-Tid header — bir browser'dan ko'p tab orqali multi-player
  // simulyatsiyasi (localStorage'da saqlanadi, ?devTid=N URL parametri orqali
  // o'rnatiladi — qarang main.tsx).
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

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  const url = `${API_URL}/api${path}`;
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


export type SvoyakCategoryListItem = {
  id: number;
  name: string;
  iconEmoji: string;
  language: string;
  questionCount: number;
  ready: boolean;
};

/** Backend'ni uyg'otish (Render free tier coldstart oldini olish).
 *
 * Health endpoint auth talab qilmaydi va arzon. 1 marta urinamiz, ignored.
 */
async function warmupBackend(): Promise<void> {
  try {
    const ctl = new AbortController();
    const timer = window.setTimeout(() => ctl.abort(), 35000);
    await fetch(`${API_URL}/health`, { method: "GET", signal: ctl.signal });
    window.clearTimeout(timer);
  } catch (err) {
    console.warn("[svoyak] warmup failed:", err);
    /* warmup fail bo'lsa ham asosiy chaqiruv qayta urinadi */
  }
}

/** Diagnostik xato — xatoga API_URL qo'shamiz, foydalanuvchi qaysi backend
 * URL'ga so'rov yuborilayotganini ko'rishi mumkin. */
function makeDiagnosticError(originalErr: unknown, hint: string): Error {
  const base = originalErr instanceof Error ? originalErr.message : String(originalErr);
  const url = API_URL || "(VITE_API_URL O'RNATILMAGAN!)";
  return new Error(`${hint}\nBackend: ${url}\nXato: ${base}`);
}

/** Aktiv kategoriyalar (host xona yaratish uchun).
 *
 * Render free tier'da backend 15 daqiqa idle bo'lsa uxlaydi → birinchi
 * request 30-40 sek davom etadi (cold start). Avval `warmupBackend()`
 * orqali serverni uyg'otamiz, keyin 3 marta retry (0s/3s/10s backoff)
 * bilan kategoriyalarni so'raymiz.
 */
export async function listCategories(): Promise<SvoyakCategoryListItem[]> {
  await warmupBackend();
  const delays = [0, 3000, 10000];
  let lastErr: unknown = null;
  for (let i = 0; i < delays.length; i++) {
    if (delays[i] > 0) await new Promise((r) => setTimeout(r, delays[i]));
    try {
      const data = await request<{ items: SvoyakCategoryListItem[] }>("/svoyak/categories");
      return data.items ?? [];
    } catch (err) {
      lastErr = err;
      // Network/coldstart bo'lsa qayta urinaman. Auth/clientside xato bo'lsa darhol uzaman.
      const e = err as Error & { status?: number };
      if (e.status && e.status >= 400 && e.status < 500) {
        throw err;
      }
    }
  }
  throw makeDiagnosticError(lastErr, "Server ulanib bo'lmadi");
}

/** Host yangi xona yaratadi.
 *
 * categoryIds yo'q bo'lsa — auto rejim.
 * categoryId berilsa — auto rejimda faqat shu mavzudan savollar.
 * categoryId null bo'lsa yoki ko'rsatilmasa — barcha mavzulardan aralash.
 */
export async function createRoom(input: {
  displayName: string;
  categoryIds?: number[];
  /** Auto rejim uchun bitta mavzu IDsi. null = aralash. */
  categoryId?: number | null;
  settings?: Record<string, unknown>;
}): Promise<SvoyakRoomState> {
  return request<SvoyakRoomState>("/svoyak/rooms", {
    method: "POST",
    body: input,
  });
}

/** Auto rejimda javob yuborish (buzz yo'q). */
export async function autoAnswer(input: {
  code: string;
  answer: string;
}): Promise<SvoyakRoomState> {
  return request<SvoyakRoomState>(
    `/svoyak/rooms/${encodeURIComponent(input.code)}/auto-answer`,
    { method: "POST", body: { answer: input.answer } }
  );
}

/** Kod orqali xonaga qo'shilish. */
export async function joinRoom(input: {
  code: string;
  displayName: string;
  role?: "player" | "coordinator";
}): Promise<SvoyakRoomState> {
  return request<SvoyakRoomState>(`/svoyak/rooms/${encodeURIComponent(input.code)}/join`, {
    method: "POST",
    body: { displayName: input.displayName, role: input.role ?? "player" },
  });
}

export async function leaveRoom(code: string): Promise<void> {
  await request<{ ok: boolean }>(`/svoyak/rooms/${encodeURIComponent(code)}/leave`, {
    method: "DELETE",
  });
}

/** Polling endpoint — har 500ms chaqirilishi mumkin. */
export async function getRoomState(code: string): Promise<SvoyakRoomState> {
  return request<SvoyakRoomState>(`/svoyak/rooms/${encodeURIComponent(code)}/state`);
}

export async function startGame(code: string): Promise<SvoyakRoomState> {
  return request<SvoyakRoomState>(`/svoyak/rooms/${encodeURIComponent(code)}/start`, {
    method: "POST",
  });
}

export async function pickQuestion(input: {
  code: string;
  categoryId: number;
  valueTier: number;
}): Promise<SvoyakRoomState> {
  return request<SvoyakRoomState>(`/svoyak/rooms/${encodeURIComponent(input.code)}/pick`, {
    method: "POST",
    body: { categoryId: input.categoryId, valueTier: input.valueTier },
  });
}

export async function openBuzz(code: string): Promise<SvoyakRoomState> {
  return request<SvoyakRoomState>(`/svoyak/rooms/${encodeURIComponent(code)}/open-buzz`, {
    method: "POST",
  });
}

export async function buzz(code: string): Promise<SvoyakRoomState> {
  return request<SvoyakRoomState>(`/svoyak/rooms/${encodeURIComponent(code)}/buzz`, {
    method: "POST",
  });
}

export async function submitAnswer(input: {
  code: string;
  answer: string;
}): Promise<SvoyakRoomState> {
  return request<SvoyakRoomState>(`/svoyak/rooms/${encodeURIComponent(input.code)}/answer`, {
    method: "POST",
    body: { answer: input.answer },
  });
}

export async function skipRound(code: string): Promise<SvoyakRoomState> {
  return request<SvoyakRoomState>(`/svoyak/rooms/${encodeURIComponent(code)}/skip`, {
    method: "POST",
  });
}

export async function endGame(code: string): Promise<SvoyakRoomState> {
  return request<SvoyakRoomState>(`/svoyak/rooms/${encodeURIComponent(code)}/end`, {
    method: "POST",
  });
}
