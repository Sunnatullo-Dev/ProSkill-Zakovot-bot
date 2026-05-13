import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { authMiddleware } from "../middleware/auth.middleware";

export const authRouter = Router();

authRouter.post("/login", (req, res, next) => {
  authController.login(req, res).catch(next);
});

authRouter.get("/me", authMiddleware, (req, res, next) => {
  authController.me(req, res).catch(next);
});
