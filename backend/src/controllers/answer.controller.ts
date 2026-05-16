import type { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../middleware/error.middleware";
import { questionRepository } from "../repositories/question.repository";
import { userRepository } from "../repositories/user.repository";
import { checkAnswer } from "../services/gemini.service";
import { calculateAnswerScore } from "../services/scoring.service";
import type { SubmitAnswerResponse } from "../types";

const ANSWER_TIMEOUT_MS = 15000;
const answerSchema = z.object({
  questionId: z.string().uuid(),
  userAnswer: z.string().trim().default(""),
  timeTaken: z.coerce.number().nonnegative(),
  streak: z.coerce.number().int().nonnegative().default(0)
});

export const answerController = {
  async submitAnswer(req: Request, res: Response) {
    const currentUser = req.currentUser;

    if (!currentUser) {
      throw new AppError(401, "Unauthorized");
    }

    const payload = answerSchema.parse(req.body);
    const question = await questionRepository.getQuestionById(payload.questionId);

    if (!question) {
      throw new AppError(404, "Question not found");
    }

    if (payload.timeTaken > ANSWER_TIMEOUT_MS) {
      return res.json({
        status: "incorrect",
        isCorrect: false,
        explanation: "Vaqt tugadi",
        correctAnswer: question.correctAnswer,
        pointsEarned: 0,
        streak: 0
      } satisfies SubmitAnswerResponse);
    }

    const result = await checkAnswer(question.text, question.correctAnswer, payload.userAnswer);
    const score = calculateAnswerScore({
      status: result.status,
      difficulty: question.difficulty,
      timeTakenMs: payload.timeTaken,
      streakBefore: payload.streak
    });

    if (score.pointsEarned > 0) {
      await userRepository.addScore(currentUser.telegramId, score.pointsEarned);
    }

    return res.json({
      status: result.status,
      isCorrect: result.status === "correct",
      explanation: result.explanation,
      correctAnswer: question.correctAnswer,
      pointsEarned: score.pointsEarned,
      streak: score.streakAfter
    } satisfies SubmitAnswerResponse);
  }
};
