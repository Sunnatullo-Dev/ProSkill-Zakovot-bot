import type { Request, Response } from "express";
import { AppError } from "../middleware/error.middleware";
import { questionRepository } from "../repositories/question.repository";

export const questionController = {
  async getRandomQuestion(_req: Request, res: Response) {
    const question = await questionRepository.getRandomQuestion();

    if (!question) {
      throw new AppError(404, "Question not found");
    }

    return res.json(question);
  }
};
