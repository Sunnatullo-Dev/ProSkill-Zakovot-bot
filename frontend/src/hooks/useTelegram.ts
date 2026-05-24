import { useEffect, useState } from "react";
import "@twa-dev/sdk";
import type { TelegramUser, TelegramWebApp } from "../types";

export const tg: TelegramWebApp | null = window.Telegram?.WebApp ?? null;
// Telegram tashqarisida (yoki initData yo'q bo'lganda) — bo'sh BROWSER_USER.
// Hech qanday "Zakovatchi" hardcoded ism qo'yilmaydi — ism faqat real Telegram'dan keladi.
const BROWSER_USER: TelegramUser = {
  id: 0,
  first_name: "",
  username: ""
};

type TelegramState = {
  initData: string;
  isReady: boolean;
  user: TelegramUser | null;
  startParam: string;
  error: string;
  tg: TelegramWebApp | null;
  // Foydalanuvchi haqiqiy Telegram klientida (mobil/desktop/web)mi?
  inTelegram: boolean;
  // Telegram ichida bo'lib, initData topib bo'lmadimi? (broken auth situation)
  initDataMissing: boolean;
};

function isRealTelegramPlatform(platform?: string): boolean {
  if (!platform) return false;
  const p = platform.toLowerCase();
  return p !== "unknown" && p !== "";
}

export function useTelegram(): TelegramState {
  const [state, setState] = useState<TelegramState>({
    initData: "",
    isReady: false,
    user: null,
    startParam: "",
    error: "",
    tg,
    inTelegram: false,
    initDataMissing: false
  });

  useEffect(() => {
    const webApp = window.Telegram?.WebApp ?? tg;

    if (!webApp?.ready || !webApp?.expand) {
      setState({
        initData: "guest",
        isReady: true,
        user: BROWSER_USER,
        startParam: "",
        error: "",
        tg: null,
        inTelegram: false,
        initDataMissing: false
      });
      return;
    }

    try {
      webApp.ready();
      webApp.expand();
      webApp.setHeaderColor?.("#080f1e");
      webApp.setBackgroundColor?.("#080f1e");

      const realPlatform = isRealTelegramPlatform(webApp.platform);
      const rawInitData = webApp.initData ?? "";
      const hasInitData = rawInitData.length > 0;

      setState({
        // Telegram ichida bo'lib initData bo'sh bo'lsa "guest" qaytarmaymiz —
        // backend mehmon deb noto'g'ri belgilab qo'yadi. Bo'sh string qaytaramiz
        // va App.tsx yuqorida xato ekran ko'rsatadi.
        initData: hasInitData ? rawInitData : (realPlatform ? "" : "guest"),
        isReady: true,
        user: normalizeTelegramUser(webApp.initDataUnsafe?.user) ?? BROWSER_USER,
        startParam: webApp.initDataUnsafe?.start_param ?? "",
        error: "",
        tg: webApp,
        inTelegram: realPlatform,
        initDataMissing: realPlatform && !hasInitData
      });
    } catch (error) {
      console.error("Telegram WebApp init failed", error);
      setState({
        initData: "guest",
        isReady: true,
        user: BROWSER_USER,
        startParam: "",
        error: "",
        tg: null,
        inTelegram: false,
        initDataMissing: false
      });
    }
  }, []);

  return state;
}

function normalizeTelegramUser(user?: TelegramUser): TelegramUser | null {
  if (!user?.id) {
    return null;
  }

  return {
    id: user.id,
    first_name: user.first_name,
    last_name: user.last_name,
    username: user.username
  };
}
