import { Router } from "express";
import { submissionController } from "../controllers/submission.controller";
import { adminMiddleware } from "../middleware/admin.middleware";
import { authMiddleware } from "../middleware/auth.middleware";

export const submissionRouter = Router();

submissionRouter.post("/", authMiddleware, (req, res, next) => {
  submissionController.submitQuestion(req, res).catch(next);
});

submissionRouter.get("/mine", authMiddleware, (req, res, next) => {
  submissionController.getMySubmissions(req, res).catch(next);
});

submissionRouter.get("/pending", authMiddleware, adminMiddleware, (req, res, next) => {
  submissionController.getPending(req, res).catch(next);
});

submissionRouter.post("/:id/review", authMiddleware, adminMiddleware, (req, res, next) => {
  submissionController.reviewSubmission(req, res).catch(next);
});
