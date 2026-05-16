import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env";
import { answerRouter } from "./routes/answer.routes";
import { authRouter } from "./routes/auth.routes";
import { questionRouter } from "./routes/question.routes";
import { submissionRouter } from "./routes/submission.routes";
import { userRouter } from "./routes/user.routes";
import { errorMiddleware } from "./middleware/error.middleware";

export const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true
  })
);
app.use(express.json({ limit: "1mb" }));

app.get("/", (_req, res) => {
  res.json({ ok: true, name: "Zakovat API" });
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRouter);
app.use("/api/questions", questionRouter);
app.use("/api/answer", answerRouter);
app.use("/api/users", userRouter);
app.use("/api/submissions", submissionRouter);

app.use(errorMiddleware);
