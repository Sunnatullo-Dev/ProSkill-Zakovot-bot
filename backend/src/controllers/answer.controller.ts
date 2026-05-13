import type { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../middleware/error.middleware";
import { geminiService } from "../services/gemini.service";
import { questionService } from "../services/question.service";
import { scoreService } from "../services/score.service";

const answerSchema = z.object({
  questionId: z.string().uuid(),
  answer: z.string().trim().min(1).max(500)
});

export const answerController = {
  async submitAnswer(req: Request, res: Response) {
    const currentUser = req.currentUser;

    if (!currentUser) {
      throw new AppError(401, "Foydalanuvchi aniqlanmadi.");
    }

    const payload = answerSchema.parse(req.body);
    const question = await questionService.getQuestionWithAnswer(payload.questionId);
    const result = await geminiService.checkAnswer({
      question: question.question,
      correctAnswer: question.correctAnswer,
      userAnswer: payload.answer
    });
    const score = await scoreService.applyAnswerResult(currentUser.telegramId, result.isCorrect);

    res.json({
      isCorrect: result.isCorrect,
      score,
      feedback: result.feedback
    });
  }
};
