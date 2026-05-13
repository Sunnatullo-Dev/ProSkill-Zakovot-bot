import type { Request, Response } from "express";
import { userRepository } from "../repositories/user.repository";

export const userController = {
  async getLeaderboard(_req: Request, res: Response) {
    const leaderboard = await userRepository.getLeaderboard(3);

    res.json({ leaderboard });
  }
};
