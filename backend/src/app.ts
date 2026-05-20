import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { env } from "./config/env";
import { adminRouter } from "./routes/admin.routes";
import { answerRouter } from "./routes/answer.routes";
import { authRouter } from "./routes/auth.routes";
import { battleRouter } from "./routes/battle.routes";
import { gameResultRouter } from "./routes/gameResult.routes";
import { questionRouter } from "./routes/question.routes";
import { submissionRouter } from "./routes/submission.routes";
import { teamRouter } from "./routes/team.routes";
import { userRouter } from "./routes/user.routes";
import { errorMiddleware } from "./middleware/error.middleware";

export const app = express();

const TOO_MANY_REQUESTS = { message: "Juda ko'p so'rov yuborildi, biroz kuting" };

// Asosiy API limiti — polling endpointlar (battles /state, battles /pending)
// ham shu yerga kirgani uchun hisob kengroq. Bir IP da bir nechta foydalanuvchi
// (Telegram in-app brauzer) bo'lishi mumkinligini ham hisobga oldik.
const apiLimiter = rateLimit({
  windowMs: 60_000,
  limit: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: TOO_MANY_REQUESTS
});

const writeLimiter = rateLimit({
  windowMs: 60_000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: TOO_MANY_REQUESTS
});

app.set("trust proxy", 1);
app.use(helmet());
app.use(
  cors({
    // Production: faqat FRONTEND_URL. Development: har qanday origin
    // (localhost va LAN IP — masalan 192.168.x.x:5173 — ham ishlashi uchun).
    origin: env.NODE_ENV === "production" ? env.FRONTEND_URL : true,
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

app.use("/api", apiLimiter);

app.use("/api/auth", authRouter);
app.use("/api/questions", questionRouter);
app.use("/api/answer", answerRouter);
app.use("/api/users", userRouter);
app.use("/api/submissions", writeLimiter, submissionRouter);
app.use("/api/game-results", gameResultRouter);
app.use("/api/teams", teamRouter);
app.use("/api/battles", battleRouter);
app.use("/api/admin", adminRouter);

app.use(errorMiddleware);
