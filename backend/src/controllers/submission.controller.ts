import type { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../middleware/error.middleware";
import { questionRepository } from "../repositories/question.repository";
import { submissionRepository } from "../repositories/submission.repository";
import { userRepository } from "../repositories/user.repository";

const APPROVED_QUESTION_BONUS = 5;

const submitSchema = z.object({
  text: z.string().trim().min(5, "Savol kamida 5 ta belgidan iborat bo'lsin"),
  correctAnswer: z.string().trim().min(1, "To'g'ri javob kerak"),
  category: z.string().trim().max(40).optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional()
});

const reviewSchema = z.object({
  decision: z.enum(["approve", "reject"])
});

export const submissionController = {
  async submitQuestion(req: Request, res: Response) {
    const currentUser = req.currentUser;

    if (!currentUser) {
      throw new AppError(401, "Unauthorized");
    }

    const payload = submitSchema.parse(req.body);
    const submission = await submissionRepository.createSubmission({
      text: payload.text,
      correctAnswer: payload.correctAnswer,
      category: payload.category ?? null,
      difficulty: payload.difficulty ?? null,
      submittedBy: currentUser.telegramId
    });

    return res.status(201).json({ submission });
  },

  async getMySubmissions(req: Request, res: Response) {
    const currentUser = req.currentUser;

    if (!currentUser) {
      throw new AppError(401, "Unauthorized");
    }

    const submissions = await submissionRepository.getSubmissionsByUser(currentUser.telegramId);

    return res.json({ submissions });
  },

  async getPending(_req: Request, res: Response) {
    const submissions = await submissionRepository.getPendingSubmissions();

    return res.json({ submissions });
  },

  async reviewSubmission(req: Request, res: Response) {
    const { decision } = reviewSchema.parse(req.body);
    const submissionId = z.string().uuid().parse(req.params.id);
    const submission = await submissionRepository.getSubmissionById(submissionId);

    if (!submission) {
      throw new AppError(404, "Submission not found");
    }

    if (submission.status !== "pending") {
      throw new AppError(409, "Submission allaqachon ko'rib chiqilgan");
    }

    if (decision === "approve") {
      await questionRepository.createQuestion({
        text: submission.text,
        correctAnswer: submission.correctAnswer,
        category: submission.category,
        difficulty: submission.difficulty
      });
      await submissionRepository.updateStatus(submissionId, "approved");

      if (submission.submittedBy > 0) {
        await userRepository.addScore(submission.submittedBy, APPROVED_QUESTION_BONUS);
      }

      return res.json({ status: "approved", bonus: APPROVED_QUESTION_BONUS });
    }

    await submissionRepository.updateStatus(submissionId, "rejected");

    return res.json({ status: "rejected", bonus: 0 });
  }
};
