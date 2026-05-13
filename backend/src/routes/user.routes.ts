import { Router } from "express";
import { userController } from "../controllers/user.controller";
import { authMiddleware } from "../middleware/auth.middleware";

export const userRouter = Router();

userRouter.get("/leaderboard", authMiddleware, (req, res, next) => {
  userController.getLeaderboard(req, res).catch(next);
});
