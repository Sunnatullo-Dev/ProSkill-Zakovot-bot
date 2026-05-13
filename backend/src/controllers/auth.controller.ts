import type { Request, Response } from "express";
import { z } from "zod";
import { env } from "../config/env";
import { userRepository } from "../repositories/user.repository";
import { validateTelegramInitData } from "../services/telegram.service";

const loginSchema = z.object({
  initData: z.string().min(1)
});

export const authController = {
  async loginWithTelegram(req: Request, res: Response) {
    const { initData } = loginSchema.parse(req.body);
    const telegramAuth = validateTelegramInitData(initData, env.TELEGRAM_BOT_TOKEN);
    const user = await userRepository.upsertTelegramUser(telegramAuth.user);

    res.json({ user });
  }
};
