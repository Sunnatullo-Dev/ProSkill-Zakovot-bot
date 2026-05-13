import { createHmac, timingSafeEqual } from "crypto";
import { AppError } from "../middleware/error.middleware";
import type { TelegramUser } from "../types";

const INIT_DATA_MAX_AGE_SECONDS = 60 * 60;

type TelegramUserPayload = {
  id?: unknown;
  first_name?: unknown;
  last_name?: unknown;
  username?: unknown;
};

export function validateTelegramInitData(initData: string, botToken: string): TelegramUser {
  const params = new URLSearchParams(initData);
  const receivedHash = params.get("hash");
  const authDate = Number(params.get("auth_date"));
  const rawUser = params.get("user");

  if (!receivedHash || !authDate || !rawUser) {
    throw new AppError(401, "Unauthorized");
  }

  if (isExpired(authDate)) {
    throw new AppError(401, "Unauthorized");
  }

  if (!isValidHash(params, receivedHash, botToken)) {
    throw new AppError(401, "Unauthorized");
  }

  return parseTelegramUser(rawUser);
}

function isExpired(authDate: number) {
  const nowSeconds = Math.floor(Date.now() / 1000);

  return nowSeconds - authDate > INIT_DATA_MAX_AGE_SECONDS;
}

function isValidHash(params: URLSearchParams, receivedHash: string, botToken: string) {
  const dataCheckString = Array.from(params.entries())
    .filter(([key]) => key !== "hash")
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const calculatedHash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  return safeCompare(receivedHash, calculatedHash);
}

function safeCompare(receivedHash: string, calculatedHash: string) {
  try {
    const received = Buffer.from(receivedHash, "hex");
    const calculated = Buffer.from(calculatedHash, "hex");

    return received.length === calculated.length && timingSafeEqual(received, calculated);
  } catch {
    return false;
  }
}

function parseTelegramUser(rawUser: string): TelegramUser {
  try {
    const payload = JSON.parse(rawUser) as TelegramUserPayload;

    if (typeof payload.id !== "number") {
      throw new Error("Telegram user id is missing");
    }

    return {
      id: payload.id,
      first_name: typeof payload.first_name === "string" ? payload.first_name : undefined,
      last_name: typeof payload.last_name === "string" ? payload.last_name : undefined,
      username: typeof payload.username === "string" ? payload.username : undefined
    };
  } catch (error) {
    console.error("Telegram user parse failed", error);
    throw new AppError(401, "Unauthorized");
  }
}
