import { Router } from "express";
import { questionController } from "../controllers/question.controller";
import { adminMiddleware } from "../middleware/admin.middleware";
import { authMiddleware } from "../middleware/auth.middleware";

export const questionRouter = Router();

questionRouter.get("/round", authMiddleware, (req, res, next) => {
  questionController.getRound(req, res).catch(next);
});

questionRouter.get("/categories", authMiddleware, (req, res, next) => {
  questionController.getCategories(req, res).catch(next);
});

questionRouter.get("/reported", authMiddleware, adminMiddleware, (req, res, next) => {
  questionController.getReportedQuestions(req, res).catch(next);
});

questionRouter.post("/:id/report", authMiddleware, (req, res, next) => {
  questionController.reportQuestion(req, res).catch(next);
});

questionRouter.delete("/:id", authMiddleware, adminMiddleware, (req, res, next) => {
  questionController.deleteQuestion(req, res).catch(next);
});
