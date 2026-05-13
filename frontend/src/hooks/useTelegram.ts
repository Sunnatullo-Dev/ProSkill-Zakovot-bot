import { useEffect, useState } from "react";
import "@twa-dev/sdk";
import type { TelegramUser, TelegramWebApp } from "../types";

export const tg: TelegramWebApp | null = window.Telegram?.WebApp ?? null;

type TelegramState = {
  initData: string;
  isReady: boolean;
  user: TelegramUser | null;
  error: string;
  tg: TelegramWebApp | null;
};

export function useTelegram(): TelegramState {
  const [state, setState] = useState<TelegramState>({
    initData: "",
    isReady: false,
    user: null,
    error: "",
    tg
  });

  useEffect(() => {
    const webApp = window.Telegram?.WebApp ?? tg;

    if (!webApp?.ready || !webApp?.expand) {
      console.error("Telegram WebApp object is not available");
      setState({
        initData: "",
        isReady: true,
        user: null,
        error: "Telegram orqali oching",
        tg: webApp
      });
      return;
    }

    try {
      webApp.ready();
      webApp.expand();

      setState({
        initData: webApp.initData,
        isReady: true,
        user: normalizeTelegramUser(webApp.initDataUnsafe?.user),
        error: webApp.initData ? "" : "Telegram orqali oching",
        tg: webApp
      });
    } catch (error) {
      console.error("Telegram WebApp init failed", error);
      setState({
        initData: "",
        isReady: true,
        user: null,
        error: "Telegram orqali oching",
        tg: webApp
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
