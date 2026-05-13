import { createHmac, timingSafeEqual } from "crypto";
import { AppError } from "../middleware/error.middleware";
import type { TelegramAuthData, TelegramUser } from "../types";

const INIT_DATA_MAX_AGE_SECONDS = 86400;

export function validateTelegramInitData(initData: string, botToken: string): TelegramAuthData {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  const authDate = Number(params.get("auth_date"));
  const rawUser = params.get("user");

  if (!hash || !authDate || !rawUser) {
    throw new AppError(401, "Telegram initData to'liq emas.");
  }

  const nowSeconds = Math.floor(Date.now() / 1000);

  if (nowSeconds - authDate > INIT_DATA_MAX_AGE_SECONDS) {
    throw new AppError(401, "Telegram initData muddati o'tgan.");
  }

  const dataCheckString = Array.from(params.entries())
    .filter(([key]) => key !== "hash")
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const calculatedHash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  if (!isSafeEqual(hash, calculatedHash)) {
    throw new AppError(401, "Telegram initData imzosi noto'g'ri.");
  }

  let user: TelegramUser;

  try {
    user = JSON.parse(rawUser) as TelegramUser;
  } catch {
    throw new AppError(401, "Telegram user ma'lumoti noto'g'ri.");
  }

  if (!user.id) {
    throw new AppError(401, "Telegram user ID topilmadi.");
  }

  return {
    authDate,
    user
  };
}

function isSafeEqual(receivedHash: string, calculatedHash: string) {
  const received = Buffer.from(receivedHash, "hex");
  const calculated = Buffer.from(calculatedHash, "hex");

  return received.length === calculated.length && timingSafeEqual(received, calculated);
}
