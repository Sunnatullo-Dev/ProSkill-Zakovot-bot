import { Router } from "express";
import { questionController } from "../controllers/question.controller";
import { authMiddleware } from "../middleware/auth.middleware";

export const questionRouter = Router();

questionRouter.get("/round", authMiddleware, (req, res, next) => {
  questionController.getRound(req, res).catch(next);
});

questionRouter.get("/categories", authMiddleware, (req, res, next) => {
  questionController.getCategories(req, res).catch(next);
});
