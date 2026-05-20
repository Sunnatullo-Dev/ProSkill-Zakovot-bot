import { Router } from "express";
import { teamController } from "../controllers/team.controller";
import { authMiddleware } from "../middleware/auth.middleware";

export const teamRouter = Router();

teamRouter.post("/", authMiddleware, (req, res, next) => {
  teamController.createTeam(req, res).catch(next);
});

teamRouter.post("/join", authMiddleware, (req, res, next) => {
  teamController.joinTeam(req, res).catch(next);
});

teamRouter.get("/my", authMiddleware, (req, res, next) => {
  teamController.getMyTeam(req, res).catch(next);
});

teamRouter.delete("/leave", authMiddleware, (req, res, next) => {
  teamController.leaveTeam(req, res).catch(next);
});
