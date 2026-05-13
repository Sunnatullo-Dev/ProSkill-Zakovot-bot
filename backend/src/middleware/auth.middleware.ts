import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { AppError } from "./error.middleware";
import { userRepository } from "../repositories/user.repository";
import { validateTelegramInitData } from "../services/telegram.service";
import type { AppUser, TelegramUser } from "../types";

declare module "express-serve-static-core" {
  interface Request {
    telegramUser?: TelegramUser;
    currentUser?: AppUser;
  }
}

export async function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  try {
    const initData = getInitDataFromRequest(req);
    const telegramAuth = validateTelegramInitData(initData, env.TELEGRAM_BOT_TOKEN);
    const user = await userRepository.upsertTelegramUser(telegramAuth.user);

    req.telegramUser = telegramAuth.user;
    req.currentUser = user;

    next();
  } catch (error) {
    next(error);
  }
}

function getInitDataFromRequest(req: Request) {
  const authHeader = req.header("authorization");
  const fromBearer = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";
  const fromCustomHeader = req.header("x-telegram-init-data") ?? "";
  const initData = fromBearer || fromCustomHeader;

  if (!initData) {
    throw new AppError(401, "Telegram initData yuborilmadi.");
  }

  return initData;
}
