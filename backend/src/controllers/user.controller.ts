import type { Request, Response } from "express";
import { AppError } from "../middleware/error.middleware";
import { userRepository } from "../repositories/user.repository";

const DEFAULT_TOP_USERS_LIMIT = 10;
const LEADERBOARD_LIMIT = 20;

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
  }
};
