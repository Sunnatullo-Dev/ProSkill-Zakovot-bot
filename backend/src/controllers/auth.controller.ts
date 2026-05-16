import type { Request, Response } from "express";
import { z } from "zod";
import { env } from "../config/env";
import { isAdmin } from "../middleware/admin.middleware";
import { AppError } from "../middleware/error.middleware";
import { userRepository } from "../repositories/user.repository";
import { validateTelegramInitData } from "../services/telegram.service";

const loginSchema = z.object({
  initData: z.string().min(1)
});

export const authController = {
  async login(req: Request, res: Response) {
    const { initData } = loginSchema.parse(req.body);
    const telegramUser = validateTelegramInitData(initData, env.TELEGRAM_BOT_TOKEN);
    const user = await userRepository.upsertUser(
      telegramUser.id,
      telegramUser.first_name,
      telegramUser.last_name,
      telegramUser.username
    );

    return res.json({ user, isAdmin: isAdmin(user.telegramId) });
  },

  async me(req: Request, res: Response) {
    const currentUser = req.currentUser;

    if (!currentUser) {
      throw new AppError(401, "Unauthorized");
    }

    return res.json({ user: currentUser, isAdmin: isAdmin(currentUser.telegramId) });
  }
};
