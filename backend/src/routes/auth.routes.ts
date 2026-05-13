import { Router } from "express";
import { authController } from "../controllers/auth.controller";

export const authRouter = Router();

authRouter.post("/telegram", (req, res, next) => {
  authController.loginWithTelegram(req, res).catch(next);
});
