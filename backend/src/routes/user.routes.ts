import { Router } from "express";
import { userController } from "../controllers/user.controller";
import { authMiddleware } from "../middleware/auth.middleware";

export const userRouter = Router();

userRouter.get("/top", authMiddleware, (req, res, next) => {
  userController.getTopUsers(req, res).catch(next);
});
