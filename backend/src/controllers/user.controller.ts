import type { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../middleware/error.middleware";
import { gameResultRepository } from "../repositories/gameResult.repository";
import { userRepository } from "../repositories/user.repository";
import { findNewlyUnlocked } from "../services/achievements.service";

const DEFAULT_TOP_USERS_LIMIT = 10;
const LEADERBOARD_LIMIT = 20;

const updateMeSchema = z.object({
  displayName: z.union([z.string().trim().max(30, "Ism 30 belgidan oshmasin"), z.null()])
});

export const userController = {
  async getTopUsers(req: Request, res: Response) {
    const rawLimit = Number(req.query.limit);
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.floor(rawLimit) : DEFAULT_TOP_USERS_LIMIT;
    const users = await userRepository.getTopUsers(limit);

    return res.json({ users });
  },

  async getLeaderboard(req: Request, res: Response) {
    const currentUser = req.currentUser;

    if (!currentUser) {
      throw new AppError(401, "Unauthorized");
    }

    const [users, rank] = await Promise.all([
      userRepository.getTopUsers(LEADERBOARD_LIMIT),
      userRepository.getUserRank(currentUser.telegramId)
    ]);

    return res.json({ users, rank });
  },

  async getReferrals(req: Request, res: Response) {
    const currentUser = req.currentUser;

    if (!currentUser) {
      throw new AppError(401, "Unauthorized");
    }

    const [referrers, myCount] = await Promise.all([
      userRepository.getReferralLeaderboard(),
      userRepository.getReferralCount(currentUser.telegramId)
    ]);

    return res.json({ referrers, myCount });
  },

  async updateMe(req: Request, res: Response) {
    const currentUser = req.currentUser;

    if (!currentUser) {
      throw new AppError(401, "Unauthorized");
    }

    const payload = updateMeSchema.parse(req.body);
    const trimmed = payload.displayName?.trim() ?? null;
    const value = trimmed && trimmed.length > 0 ? trimmed : null;
    const updated = await userRepository.updateDisplayName(currentUser.telegramId, value);

    return res.json({ user: updated });
  },

  async checkAchievements(req: Request, res: Response) {
    const currentUser = req.currentUser;

    if (!currentUser) {
      throw new AppError(401, "Unauthorized");
    }

    const stats = await gameResultRepository.getStats(currentUser.telegramId);
    const current = await userRepository.findByTelegramId(currentUser.telegramId);

    if (!current) {
      throw new AppError(404, "Foydalanuvchi topilmadi");
    }

    const already = await userRepository.getUnlockedAchievements(currentUser.telegramId);
    const newly = findNewlyUnlocked(
      {
        gamesPlayed: stats.gamesPlayed,
        bestRoundScore: stats.bestRoundScore,
        totalScore: current.score
      },
      already
    );

    if (newly.length === 0) {
      return res.json({ newlyUnlocked: [], totalBonus: 0, user: current });
    }

    const totalBonus = newly.reduce((sum, a) => sum + a.bonus, 0);
    const updatedUser =
      totalBonus > 0
        ? await userRepository.addScore(currentUser.telegramId, totalBonus)
        : current;

    const newIds = newly.map((a) => a.id);
    await userRepository.setUnlockedAchievements(currentUser.telegramId, [...already, ...newIds]);

    return res.json({
      newlyUnlocked: newly.map((a) => ({ id: a.id, label: a.label, bonus: a.bonus })),
      totalBonus,
      user: updatedUser
    });
  }
};
