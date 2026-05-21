import { Router } from "express";
import { userController } from "../controllers/user.controller";
import { authMiddleware } from "../middleware/auth.middleware";

export const userRouter = Router();

userRouter.get("/top", authMiddleware, (req, res, next) => {
  userController.getTopUsers(req, res).catch(next);
});

userRouter.get("/leaderboard", authMiddleware, (req, res, next) => {
  userController.getLeaderboard(req, res).catch(next);
});

userRouter.get("/referrals", authMiddleware, (req, res, next) => {
  userController.getReferrals(req, res).catch(next);
});

userRouter.patch("/me", authMiddleware, (req, res, next) => {
  userController.updateMe(req, res).catch(next);
});

userRouter.post("/me/check-achievements", authMiddleware, (req, res, next) => {
  userController.checkAchievements(req, res).catch(next);
});
