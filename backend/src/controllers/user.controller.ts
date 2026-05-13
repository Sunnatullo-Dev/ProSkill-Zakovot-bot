import type { Request, Response } from "express";
import { userRepository } from "../repositories/user.repository";

const DEFAULT_TOP_USERS_LIMIT = 10;

export const userController = {
  async getTopUsers(req: Request, res: Response) {
    const rawLimit = Number(req.query.limit);
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.floor(rawLimit) : DEFAULT_TOP_USERS_LIMIT;
    const users = await userRepository.getTopUsers(limit);

    return res.json({ users });
  }
};
