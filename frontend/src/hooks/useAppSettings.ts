/**
 * useAppSettings — global ilova sozlamalarini yuklab keshlaydigan hook.
 *
 * Sozlamalar 5 daqiqa localStorage'da saqlanadi va har sahifa yuklanishida
 * background'da yangilanadi (stale-while-revalidate pattern).
 */
import { useEffect, useState } from "react";
import { getAppSettings } from "../api/client";
import type { AppSettings } from "../api/client";

const CACHE_KEY = "zakovat:app_settings";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 daqiqa

// Default sozlamalar — backend yuklanmasa ham o'yin ishlaydi
const DEFAULT_SETTINGS: AppSettings = {
  battleChatEnabled: true,
  battleChatPollIntervalMs: 4000,
  battleShowCorrectOnTimeout: true,
  ttsEnabled: true,
  ttsDefaultMuted: false,
  difficultyEasyEnabled: true,
  difficultyMediumEnabled: true,
  difficultyHardEnabled: true,
  svoyakCoordinatorEnabled: true,
  svoyakTimePerQuestion: 15,
};

function readCache(): AppSettings | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL_MS) return null;
    return data as AppSettings;
  } catch {
    return null;
  }
}

function writeCache(data: AppSettings): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch {
    /* ignore */
  }
}

export function useAppSettings(): AppSettings {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    // Mount'da keshdan o'qiymiz — lazy initializer o'rniga useEffect ichida
    // (Telegram WebView localStorage xatolaridan himoya)
    const cached = readCache();
    if (cached) setSettings(cached);

    // Background revalidate — UI tez ko'rinadi, yangi ma'lumot kelsa yangilanadi
    void getAppSettings().then((data) => {
      if (data) {
        writeCache(data);
        setSettings(data);
      }
    }).catch(() => {
      // Xato bo'lsa kesh yoki default ishlatiladi
    });
  }, []);

  return settings;
}
