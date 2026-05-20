import type { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../middleware/error.middleware";
import { questionRepository } from "../repositories/question.repository";
import { submissionRepository } from "../repositories/submission.repository";
import { supabase } from "../db/supabase";
import { userRepository } from "../repositories/user.repository";

const MAX_PAGE_LIMIT = 50;
const DEFAULT_PAGE_LIMIT = 20;

const createQuestionSchema = z.object({
  text: z.string().trim().min(3, "Savol matni qisqa"),
  correctAnswer: z.string().trim().min(1, "Javob bo'sh bo'lmasin"),
  category: z.string().trim().min(1).nullable().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).nullable().optional()
});

const BULK_LIMIT = 500;
const bulkCreateSchema = z.object({
  questions: z
    .array(createQuestionSchema)
    .min(1, "Hech bo'lmaganda bitta savol bo'lishi kerak")
    .max(BULK_LIMIT, `Maksimum ${BULK_LIMIT} ta savol`)
});

const updateQuestionSchema = z.object({
  text: z.string().trim().min(3).optional(),
  correctAnswer: z.string().trim().min(1).optional(),
  category: z.string().trim().min(1).nullable().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).nullable().optional()
});

const listQuerySchema = z.object({
  search: z.string().trim().optional(),
  category: z.string().trim().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(MAX_PAGE_LIMIT).default(DEFAULT_PAGE_LIMIT)
});

const renameCategorySchema = z.object({
  oldName: z.string().trim().min(1),
  newName: z.string().trim().min(1)
});

const questionIdSchema = z.string().uuid("Savol ID noto'g'ri");

async function safeCount(promise: Promise<number>): Promise<number> {
  try {
    return await promise;
  } catch (error) {
    console.error("admin stat count failed", error);
    return 0;
  }
}

export const adminController = {
  async getStats(_req: Request, res: Response) {
    const [
      usersCount,
      questionsCount,
      pendingSubmissions,
      approvedSubmissions,
      rejectedSubmissions,
      categoriesStats,
      gameResultsCount,
      battlesCount,
      teamsCount
    ] = await Promise.all([
      safeCount(userRepository.countAll()),
      safeCount(questionRepository.countAll()),
      safeCount(submissionRepository.countByStatus("pending")),
      safeCount(submissionRepository.countByStatus("approved")),
      safeCount(submissionRepository.countByStatus("rejected")),
      questionRepository.getCategoryStats().catch(() => []),
      safeCount(
        (async () => {
          const { count, error } = await supabase
            .from("game_results")
            .select("id", { count: "exact", head: true });

          if (error) {
            throw error;
          }

          return count ?? 0;
        })()
      ),
      safeCount(
        (async () => {
          const { count, error } = await supabase
            .from("battle_challenges")
            .select("id", { count: "exact", head: true });

          if (error) {
            throw error;
          }

          return count ?? 0;
        })()
      ),
      safeCount(
        (async () => {
          const { count, error } = await supabase
            .from("teams")
            .select("id", { count: "exact", head: true });

          if (error) {
            throw error;
          }

          return count ?? 0;
        })()
      )
    ]);

    return res.json({
      users: usersCount,
      questions: questionsCount,
      submissions: {
        pending: pendingSubmissions,
        approved: approvedSubmissions,
        rejected: rejectedSubmissions
      },
      categories: categoriesStats,
      games: gameResultsCount,
      battles: battlesCount,
      teams: teamsCount
    });
  },

  async listQuestions(req: Request, res: Response) {
    const query = listQuerySchema.parse(req.query);
    const offset = (query.page - 1) * query.limit;
    const result = await questionRepository.listAllQuestions({
      search: query.search ?? null,
      category: query.category ?? null,
      difficulty: query.difficulty ?? null,
      limit: query.limit,
      offset
    });

    return res.json({
      items: result.items,
      total: result.total,
      page: query.page,
      limit: query.limit
    });
  },

  async createQuestion(req: Request, res: Response) {
    const payload = createQuestionSchema.parse(req.body);
    await questionRepository.createQuestion({
      text: payload.text,
      correctAnswer: payload.correctAnswer,
      category: payload.category ?? null,
      difficulty: payload.difficulty ?? null
    });

    return res.status(201).json({ ok: true });
  },

  async bulkCreateQuestions(req: Request, res: Response) {
    const payload = bulkCreateSchema.parse(req.body);
    const inserted = await questionRepository.bulkCreateQuestions(
      payload.questions.map((item) => ({
        text: item.text,
        correctAnswer: item.correctAnswer,
        category: item.category ?? null,
        difficulty: item.difficulty ?? null
      }))
    );

    return res.status(201).json({ ok: true, inserted });
  },

  async updateQuestion(req: Request, res: Response) {
    const id = questionIdSchema.parse(req.params.id);
    const payload = updateQuestionSchema.parse(req.body);

    await questionRepository.updateQuestion(id, {
      text: payload.text,
      correctAnswer: payload.correctAnswer,
      category: payload.category ?? undefined,
      difficulty: payload.difficulty ?? undefined
    });

    return res.json({ ok: true });
  },

  async deleteQuestion(req: Request, res: Response) {
    const id = questionIdSchema.parse(req.params.id);
    await questionRepository.deleteQuestion(id);

    return res.json({ ok: true });
  },

  async listCategories(_req: Request, res: Response) {
    const items = await questionRepository.getCategoryStats();

    return res.json({ items });
  },

  async renameCategory(req: Request, res: Response) {
    const payload = renameCategorySchema.parse(req.body);

    if (payload.oldName === payload.newName) {
      throw new AppError(400, "Yangi nomi eski nomidan farq qilishi kerak");
    }

    const updatedCount = await questionRepository.renameCategory(payload.oldName, payload.newName);

    return res.json({ ok: true, updatedCount });
  }
};
