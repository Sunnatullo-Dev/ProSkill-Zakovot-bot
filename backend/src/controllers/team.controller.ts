import type { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../middleware/error.middleware";
import { teamRepository } from "../repositories/team.repository";

const createSchema = z.object({
  name: z.string().trim().min(2, "Jamoa nomi kamida 2 belgi").max(30, "Jamoa nomi 30 belgidan oshmasin")
});

const joinSchema = z.object({
  code: z.string().trim().min(4, "Kod noto'g'ri").max(8, "Kod noto'g'ri")
});

export const teamController = {
  async createTeam(req: Request, res: Response) {
    const currentUser = req.currentUser;

    if (!currentUser) {
      throw new AppError(401, "Unauthorized");
    }

    const { name } = createSchema.parse(req.body);
    const existing = await teamRepository.findMembership(currentUser.telegramId);

    if (existing) {
      throw new AppError(409, "Siz allaqachon jamoadasiz");
    }

    const team = await teamRepository.createTeam(name, currentUser.telegramId);

    return res.status(201).json({ team, code: team.code });
  },

  async joinTeam(req: Request, res: Response) {
    const currentUser = req.currentUser;

    if (!currentUser) {
      throw new AppError(401, "Unauthorized");
    }

    const { code } = joinSchema.parse(req.body);
    const existing = await teamRepository.findMembership(currentUser.telegramId);

    if (existing) {
      throw new AppError(409, "Siz allaqachon jamoadasiz");
    }

    const team = await teamRepository.joinTeamByCode(code, currentUser.telegramId);

    return res.json({ team, members: team.members });
  },

  async getMyTeam(req: Request, res: Response) {
    const currentUser = req.currentUser;

    if (!currentUser) {
      throw new AppError(401, "Unauthorized");
    }

    const team = await teamRepository.getTeamByTelegramId(currentUser.telegramId);

    return res.json({ team });
  },

  async leaveTeam(req: Request, res: Response) {
    const currentUser = req.currentUser;

    if (!currentUser) {
      throw new AppError(401, "Unauthorized");
    }

    await teamRepository.leaveTeam(currentUser.telegramId);

    return res.json({ ok: true });
  }
};
