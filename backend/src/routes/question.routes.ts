import { Router } from "express";
import { questionController } from "../controllers/question.controller";
import { authMiddleware } from "../middleware/auth.middleware";

export const questionRouter = Router();

questionRouter.get("/random", authMiddleware, (req, res, next) => {
  questionController.getRandomQuestion(req, res).catch(next);
});
