import type { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../middleware/error.middleware";
import { questionRepository } from "../repositories/question.repository";
import { userRepository } from "../repositories/user.repository";
import { issueAnswerTicket, verifyAnswerTicket } from "../services/answerTicket.service";
import { checkAnswer } from "../services/gemini.service";
import { calculateAnswerScore } from "../services/scoring.service";
import type { SubmitAnswerResponse } from "../types";

const ANSWER_TIMEOUT_MS = 15000;
const TIMEOUT_GRACE_MS = 2000;

const ticketSchema = z.object({
  questionId: z.string().uuid()
});

const answerSchema = z.object({
  ticket: z.string().min(1),
  userAnswer: z.string().trim().default(""),
  streak: z.coerce.number().int().nonnegative().default(0)
});

export const answerController = {
  issueTicket(req: Request, res: Response) {
    const { questionId } = ticketSchema.parse(req.body);

    return res.json({ ticket: issueAnswerTicket(questionId) });
  },

  async submitAnswer(req: Request, res: Response) {
    const currentUser = req.currentUser;

    if (!currentUser) {
      throw new AppError(401, "Unauthorized");
    }

    const payload = answerSchema.parse(req.body);
    const { questionId, issuedAt } = verifyAnswerTicket(payload.ticket);
    const question = await questionRepository.getQuestionById(questionId);

    if (!question) {
      throw new AppError(404, "Question not found");
    }

    const timeTaken = Date.now() - issuedAt;

    if (timeTaken > ANSWER_TIMEOUT_MS + TIMEOUT_GRACE_MS) {
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
      timeTakenMs: Math.min(timeTaken, ANSWER_TIMEOUT_MS),
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
