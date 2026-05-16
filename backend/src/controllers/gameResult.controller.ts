import type { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../middleware/error.middleware";
import { gameResultRepository } from "../repositories/gameResult.repository";

const gameResultSchema = z
  .object({
    correctCount: z.coerce.number().int().nonnegative(),
    totalCount: z.coerce.number().int().positive(),
    roundScore: z.coerce.number().int().nonnegative()
  })
  .refine((value) => value.correctCount <= value.totalCount, {
    message: "correctCount totalCount dan oshmasligi kerak"
  });

export const gameResultController = {
  async createResult(req: Request, res: Response) {
    const currentUser = req.currentUser;

    if (!currentUser) {
      throw new AppError(401, "Unauthorized");
    }

    const payload = gameResultSchema.parse(req.body);
    await gameResultRepository.createGameResult({
      telegramId: currentUser.telegramId,
      correctCount: payload.correctCount,
      totalCount: payload.totalCount,
      roundScore: payload.roundScore
    });

    return res.status(201).json({ ok: true });
  },

  async getStats(req: Request, res: Response) {
    const currentUser = req.currentUser;

    if (!currentUser) {
      throw new AppError(401, "Unauthorized");
    }

    const stats = await gameResultRepository.getStats(currentUser.telegramId);

    return res.json({ stats });
  }
};
