import type { Request, Response } from "express";
import { questionService } from "../services/question.service";

export const questionController = {
  async getRandomQuestion(_req: Request, res: Response) {
    const question = await questionService.getRandomQuestion();

    res.json(question);
  }
};
