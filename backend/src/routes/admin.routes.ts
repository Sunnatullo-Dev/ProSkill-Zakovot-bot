import { Router } from "express";
import { adminController } from "../controllers/admin.controller";
import { adminMiddleware } from "../middleware/admin.middleware";
import { authMiddleware } from "../middleware/auth.middleware";

export const adminRouter = Router();

adminRouter.use(authMiddleware, adminMiddleware);

adminRouter.get("/stats", (req, res, next) => {
  adminController.getStats(req, res).catch(next);
});

adminRouter.get("/questions", (req, res, next) => {
  adminController.listQuestions(req, res).catch(next);
});

adminRouter.post("/questions", (req, res, next) => {
  adminController.createQuestion(req, res).catch(next);
});

adminRouter.post("/questions/bulk", (req, res, next) => {
  adminController.bulkCreateQuestions(req, res).catch(next);
});

adminRouter.patch("/questions/:id", (req, res, next) => {
  adminController.updateQuestion(req, res).catch(next);
});

adminRouter.delete("/questions/:id", (req, res, next) => {
  adminController.deleteQuestion(req, res).catch(next);
});

adminRouter.get("/categories", (req, res, next) => {
  adminController.listCategories(req, res).catch(next);
});

adminRouter.post("/categories/rename", (req, res, next) => {
  adminController.renameCategory(req, res).catch(next);
});
