import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { userRepository } from "../repositories/user.repository";
import { validateTelegramInitData } from "../services/telegram.service";
import type { AppUser, TelegramUser } from "../types";
import { AppError } from "./error.middleware";

const AUTH_PREFIX = "tma ";

declare module "express-serve-static-core" {
  interface Request {
    user?: TelegramUser;
    currentUser?: AppUser;
  }
}

export async function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  try {
    const initData = getInitDataFromRequest(req);
    const user = validateTelegramInitData(initData, env.TELEGRAM_BOT_TOKEN);
    const currentUser = await userRepository.upsertUser(user.id, user.first_name, user.last_name, user.username);

    req.user = user;
    req.currentUser = currentUser;

    next();
  } catch (error) {
    next(error instanceof AppError ? error : new AppError(401, "Unauthorized"));
  }
}

function getInitDataFromRequest(req: Request) {
  const authHeader = req.header("authorization") ?? "";

  if (!authHeader.startsWith(AUTH_PREFIX)) {
    throw new AppError(401, "Unauthorized");
  }

  const initData = authHeader.slice(AUTH_PREFIX.length).trim();

  if (!initData) {
    throw new AppError(401, "Unauthorized");
  }

  return initData;
}
