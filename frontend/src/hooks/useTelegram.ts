import { useEffect, useState } from "react";
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
  // Debug diagnostika maydonlari — Profile diagnostic kartasi uchun.
  debug: {
    hasTelegram: boolean;
    hasWebApp: boolean;
    platform: string;
    version: string;
    hasInitData: boolean;
    hasInitDataUnsafe: boolean;
    rawUserId: number;
  };
};

function emptyDebug() {
  return {
    hasTelegram: false,
    hasWebApp: false,
    platform: "",
    version: "",
    hasInitData: false,
    hasInitDataUnsafe: false,
    rawUserId: 0,
  };
}

// Telegram WebApp ob'ekti bo'lsa-yu, biz haqiqatdan ham Telegram klientida ekanligimizni
// bildiradigan belgi bormi? `platform === "unknown"` browser-mode (TWA SDK localda),
// boshqa qiymatlar haqiqiy Telegram klientida.
function isRealTelegramPlatform(webApp: TelegramWebApp | null | undefined): boolean {
  if (!webApp) return false;
  const platform = (webApp.platform ?? "").toLowerCase();
  if (!platform || platform === "unknown") return false;
  return true;
}

// Telegram klientida ekanligimizning ikkinchi belgisi — initDataUnsafe.user
// va boshqa metadata. Ba'zi versiyalar platform'ni bermasligi mumkin, lekin
// initDataUnsafe.user'ni beradi.
function hasTelegramSignals(webApp: TelegramWebApp | null | undefined): boolean {
  if (!webApp) return false;
  if (isRealTelegramPlatform(webApp)) return true;
  // Telegram bizga foydalanuvchi ma'lumotini bergan, lekin imzolangan initData bermagan —
  // bu ham "Telegramda lekin auth singan" holat.
  return Boolean(webApp.initDataUnsafe?.user?.id);
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
    initDataMissing: false,
    debug: emptyDebug()
  });

  useEffect(() => {
    const hasTelegram = typeof window !== "undefined" && Boolean(window.Telegram);
    const webApp = window.Telegram?.WebApp ?? tg;
    const hasWebApp = Boolean(webApp);

    // Web App SDK umuman yuklanmagan — sof browser rejimi (lokal dev, screenshot, va h.k.).
    if (!webApp?.ready || !webApp?.expand) {
      setState({
        initData: "guest",
        isReady: true,
        user: BROWSER_USER,
        startParam: "",
        error: "",
        tg: null,
        inTelegram: false,
        initDataMissing: false,
        debug: { ...emptyDebug(), hasTelegram, hasWebApp }
      });
      return;
    }

    try {
      webApp.ready();
      webApp.expand();
      webApp.setHeaderColor?.("#080f1e");
      webApp.setBackgroundColor?.("#080f1e");

      const realPlatform = isRealTelegramPlatform(webApp);
      const telegramSignals = hasTelegramSignals(webApp);
      const rawInitData = webApp.initData ?? "";
      const hasInitData = rawInitData.length > 0;
      const unsafeUser = webApp.initDataUnsafe?.user;
      const rawUserId = Number(unsafeUser?.id ?? 0);

      // Agar Telegram klientidamiz (platform haqiqiy yoki initDataUnsafe.user mavjud),
      // ammo signed initData yo'q bo'lsa — bu "guest" emas, bu BUZILGAN auth holati.
      // Foydalanuvchini "guest" sifatida xizmat qilish noto'g'ri (jamoa leak/spam) va
      // backend'ga "guest" token yuborish ham noto'g'ri.
      const isBrokenAuth = telegramSignals && !hasInitData;

      setState({
        initData: hasInitData ? rawInitData : (telegramSignals ? "" : "guest"),
        isReady: true,
        user: normalizeTelegramUser(unsafeUser) ?? BROWSER_USER,
        startParam: webApp.initDataUnsafe?.start_param ?? "",
        error: "",
        tg: webApp,
        inTelegram: realPlatform || telegramSignals,
        initDataMissing: isBrokenAuth,
        debug: {
          hasTelegram,
          hasWebApp: true,
          platform: webApp.platform ?? "",
          version: webApp.version ?? "",
          hasInitData,
          hasInitDataUnsafe: Boolean(webApp.initDataUnsafe),
          rawUserId
        }
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
        initDataMissing: false,
        debug: { ...emptyDebug(), hasTelegram, hasWebApp }
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
