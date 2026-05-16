import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { AppError } from "./error.middleware";

export function isAdmin(telegramId: number): boolean {
  return env.ADMIN_TELEGRAM_IDS.includes(telegramId);
}

export function adminMiddleware(req: Request, _res: Response, next: NextFunction) {
  if (!req.currentUser || !isAdmin(req.currentUser.telegramId)) {
    next(new AppError(403, "Admin huquqi kerak"));
    return;
  }

  next();
}
