import type { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../middleware/error.middleware";
import { battleService } from "../services/battle.service";

const challengeSchema = z.object({
  opponent_code: z.string().trim().min(4, "Kod noto'g'ri").max(8, "Kod noto'g'ri")
});

const answerSchema = z.object({
  answer: z.string().trim().default(""),
  roundId: z.string().uuid("Round ID noto'g'ri")
});

const battleIdSchema = z.string().uuid("Bellashuv ID noto'g'ri");

export const battleController = {
  async challengeOpponent(req: Request, res: Response) {
    const currentUser = req.currentUser;

    if (!currentUser) {
      throw new AppError(401, "Unauthorized");
    }

    const { opponent_code } = challengeSchema.parse(req.body);
    const battle = await battleService.challenge(currentUser.telegramId, opponent_code);

    return res.status(201).json({ battleId: battle.id });
  },

  async acceptChallenge(req: Request, res: Response) {
    const currentUser = req.currentUser;

    if (!currentUser) {
      throw new AppError(401, "Unauthorized");
    }

    const battleId = battleIdSchema.parse(req.params.battleId);
    await battleService.acceptChallenge(battleId, currentUser.telegramId);

    return res.json({ ok: true, battleId });
  },

  async declineChallenge(req: Request, res: Response) {
    const currentUser = req.currentUser;

    if (!currentUser) {
      throw new AppError(401, "Unauthorized");
    }

    const battleId = battleIdSchema.parse(req.params.battleId);
    await battleService.declineChallenge(battleId, currentUser.telegramId);

    return res.json({ ok: true });
  },

  async submitAnswer(req: Request, res: Response) {
    const currentUser = req.currentUser;

    if (!currentUser) {
      throw new AppError(401, "Unauthorized");
    }

    const battleId = battleIdSchema.parse(req.params.battleId);
    const payload = answerSchema.parse(req.body);
    const result = await battleService.processAnswer(
      battleId,
      currentUser.telegramId,
      payload.roundId,
      payload.answer
    );

    return res.json(result);
  },

  async getState(req: Request, res: Response) {
    const currentUser = req.currentUser;

    if (!currentUser) {
      throw new AppError(401, "Unauthorized");
    }

    const battleId = battleIdSchema.parse(req.params.battleId);
    const state = await battleService.getBattleState(battleId, currentUser.telegramId);

    return res.json(state);
  },

  async getPending(req: Request, res: Response) {
    const currentUser = req.currentUser;

    if (!currentUser) {
      throw new AppError(401, "Unauthorized");
    }

    const challenges = await battleService.getPendingForUser(currentUser.telegramId);

    return res.json({ challenges });
  }
};
