import { Router } from "express";
import { gameResultController } from "../controllers/gameResult.controller";
import { authMiddleware } from "../middleware/auth.middleware";

export const gameResultRouter = Router();

gameResultRouter.post("/", authMiddleware, (req, res, next) => {
  gameResultController.createResult(req, res).catch(next);
});

gameResultRouter.get("/stats", authMiddleware, (req, res, next) => {
  gameResultController.getStats(req, res).catch(next);
});
