import { useEffect, useState } from "react";
import WebApp from "@twa-dev/sdk";
import type { TelegramUser } from "../types";

type TelegramState = {
  initData: string;
  telegramUser: TelegramUser | null;
  isReady: boolean;
  error: string;
};

export function useTelegram(): TelegramState {
  const [state, setState] = useState<TelegramState>({
    initData: "",
    telegramUser: null,
    isReady: false,
    error: ""
  });

  useEffect(() => {
    try {
      WebApp.ready();
      WebApp.expand();

      setState({
        initData: WebApp.initData,
        telegramUser: (WebApp.initDataUnsafe.user as TelegramUser | undefined) ?? null,
        isReady: true,
        error: WebApp.initData ? "" : "Telegram initData topilmadi."
      });
    } catch {
      setState({
        initData: "",
        telegramUser: null,
        isReady: true,
        error: "Telegram Web App SDK ishga tushmadi."
      });
    }
  }, []);

  return state;
}
