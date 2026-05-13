import { Router } from "express";
import { answerController } from "../controllers/answer.controller";
import { authMiddleware } from "../middleware/auth.middleware";

export const answerRouter = Router();

answerRouter.post("/", authMiddleware, (req, res, next) => {
  answerController.submitAnswer(req, res).catch(next);
});
