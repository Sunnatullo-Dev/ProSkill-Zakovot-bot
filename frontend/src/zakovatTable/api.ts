/**
 * Interaktiv Zakovat Stoli — mini-app kuzatuvchi uchun REST klient.
 *
 * `svoyak/api.ts` bilan bir xil naqsh: o'zining minimal `request` helper'i
 * (tma auth headerlari). Faqat bitta, o'qish uchun endpoint chaqiriladi —
 * bu ekranda hech qanday mutatsiya (join/spin/verify va h.k.) yo'q, chunki
 * bu rejim faqat bot orqali boshqariladi (spec talabi).
 */
import type { ZtRoomState } from "./types";

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
  return headers;
}

async function request<T>(path: string): Promise<T> {
  const url = `${API_URL}/api${path}`;
  const response = await fetch(url, { method: "GET", headers: buildHeaders() });
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
  return (await response.json()) as T;
}

/** Kod orqali xona holatini olish — polling endpoint (kuzatuvchi ekrani). */
export async function getZakovatTableRoomState(code: string): Promise<ZtRoomState> {
  return request<ZtRoomState>(`/zakovat-table/rooms/${encodeURIComponent(code)}/state`);
}
