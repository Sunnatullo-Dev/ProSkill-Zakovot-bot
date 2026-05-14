import type { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../middleware/error.middleware";
import { questionRepository } from "../repositories/question.repository";
import { userRepository } from "../repositories/user.repository";
import { checkAnswer } from "../services/gemini.service";
import type { SubmitAnswerResponse } from "../types";

const ANSWER_TIMEOUT_MS = 15000;
const answerSchema = z.object({
  questionId: z.string().uuid(),
  userAnswer: z.string().trim().default(""),
  timeTaken: z.coerce.number().nonnegative()
});

export const answerController = {
  async submitAnswer(req: Request, res: Response) {
    const currentUser = req.currentUser;

    if (!currentUser) {
      throw new AppError(401, "Unauthorized");
    }

    const payload = answerSchema.parse(req.body);

    if (!payload.questionId) {
      throw new AppError(400, "questionId is required");
    }

    const question = await questionRepository.getQuestionById(payload.questionId);

    if (!question) {
      throw new AppError(404, "Question not found");
    }

    if (payload.timeTaken > ANSWER_TIMEOUT_MS) {
      return res.json({
        isCorrect: false,
        explanation: "Vaqt tugadi",
        newScore: currentUser.score,
        correctAnswer: question.correctAnswer
      } satisfies SubmitAnswerResponse);
    }

    const result = await checkAnswer(question.text, question.correctAnswer, payload.userAnswer);
    const updatedUser = result.isCorrect
      ? await userRepository.incrementScore(currentUser.telegramId)
      : currentUser;

    return res.json({
      isCorrect: result.isCorrect,
      explanation: result.explanation,
      newScore: updatedUser.score,
      correctAnswer: question.correctAnswer
    } satisfies SubmitAnswerResponse);
  }
};
