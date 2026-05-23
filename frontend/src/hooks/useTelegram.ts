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
};

export function useTelegram(): TelegramState {
  const [state, setState] = useState<TelegramState>({
    initData: "",
    isReady: false,
    user: null,
    startParam: "",
    error: "",
    tg
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
        tg: null
      });
      return;
    }

    try {
      webApp.ready();
      webApp.expand();
      webApp.setHeaderColor?.("#080f1e");
      webApp.setBackgroundColor?.("#080f1e");

      setState({
        initData: webApp.initData || "guest",
        isReady: true,
        user: normalizeTelegramUser(webApp.initDataUnsafe?.user) ?? BROWSER_USER,
        startParam: webApp.initDataUnsafe?.start_param ?? "",
        error: "",
        tg: webApp
      });
    } catch (error) {
      console.error("Telegram WebApp init failed", error);
      setState({
        initData: "guest",
        isReady: true,
        user: BROWSER_USER,
        startParam: "",
        error: "",
        tg: null
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
