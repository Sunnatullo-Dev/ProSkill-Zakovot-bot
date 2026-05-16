import type { Request, Response } from "express";
import { z } from "zod";
import { questionRepository } from "../repositories/question.repository";

const DEFAULT_ROUND_COUNT = 10;
const MAX_ROUND_COUNT = 20;

const roundQuerySchema = z.object({
  count: z.coerce.number().int().positive().max(MAX_ROUND_COUNT).default(DEFAULT_ROUND_COUNT),
  category: z.string().trim().min(1).optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional()
});

export const questionController = {
  async getRound(req: Request, res: Response) {
    const query = roundQuerySchema.parse(req.query);
    const questions = await questionRepository.getRoundQuestions({
      count: query.count,
      category: query.category ?? null,
      difficulty: query.difficulty ?? null
    });

    return res.json({ questions });
  },

  async getCategories(_req: Request, res: Response) {
    const categories = await questionRepository.getCategories();

    return res.json({ categories });
  }
};
