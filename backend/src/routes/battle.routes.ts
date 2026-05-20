import { Router } from "express";
import rateLimit from "express-rate-limit";
import { battleController } from "../controllers/battle.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const challengeLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Juda ko'p chaqiruv yuborildi, biroz kuting" }
});

export const battleRouter = Router();

battleRouter.get("/pending", authMiddleware, (req, res, next) => {
  battleController.getPending(req, res).catch(next);
});

battleRouter.post("/challenge", challengeLimiter, authMiddleware, (req, res, next) => {
  battleController.challengeOpponent(req, res).catch(next);
});

battleRouter.post("/:battleId/accept", authMiddleware, (req, res, next) => {
  battleController.acceptChallenge(req, res).catch(next);
});

battleRouter.post("/:battleId/decline", authMiddleware, (req, res, next) => {
  battleController.declineChallenge(req, res).catch(next);
});

battleRouter.post("/:battleId/cancel", authMiddleware, (req, res, next) => {
  battleController.cancelChallenge(req, res).catch(next);
});

battleRouter.post("/:battleId/answer", authMiddleware, (req, res, next) => {
  battleController.submitAnswer(req, res).catch(next);
});

battleRouter.get("/:battleId/state", authMiddleware, (req, res, next) => {
  battleController.getState(req, res).catch(next);
});
