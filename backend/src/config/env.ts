import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  FRONTEND_URL: z.string().url().default("http://localhost:5173"),
  TELEGRAM_BOT_TOKEN: z.string().min(1, "TELEGRAM_BOT_TOKEN kerak"),
  SUPABASE_URL: z.string().url("SUPABASE_URL noto'g'ri"),
  SUPABASE_SERVICE_KEY: z.string().min(1, "SUPABASE_SERVICE_KEY kerak"),
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY kerak"),
  GEMINI_MODEL: z.string().min(1).default("gemini-1.5-flash"),
  ADMIN_TELEGRAM_IDS: z
    .string()
    .default("")
    .transform((value) =>
      value
        .split(",")
        .map((part) => Number(part.trim()))
        .filter((id) => Number.isFinite(id) && id > 0)
    )
});

export const env = envSchema.parse(process.env);
