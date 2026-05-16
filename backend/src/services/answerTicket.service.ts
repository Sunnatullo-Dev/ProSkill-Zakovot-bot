import { createHmac, timingSafeEqual } from "crypto";
import { env } from "../config/env";
import { AppError } from "../middleware/error.middleware";

type TicketPayload = {
  questionId: string;
  issuedAt: number;
};

export function issueAnswerTicket(questionId: string): string {
  const issuedAt = Date.now();
  const body = `${questionId}.${issuedAt}`;

  return Buffer.from(`${body}.${sign(body)}`).toString("base64url");
}

export function verifyAnswerTicket(ticket: string): TicketPayload {
  let decoded: string;

  try {
    decoded = Buffer.from(ticket, "base64url").toString("utf8");
  } catch {
    throw new AppError(400, "Javob tiketi noto'g'ri");
  }

  const parts = decoded.split(".");

  if (parts.length !== 3) {
    throw new AppError(400, "Javob tiketi noto'g'ri");
  }

  const [questionId, issuedAtRaw, signature] = parts;

  if (!signatureMatches(`${questionId}.${issuedAtRaw}`, signature)) {
    throw new AppError(400, "Javob tiketi imzosi noto'g'ri");
  }

  const issuedAt = Number(issuedAtRaw);

  if (!Number.isFinite(issuedAt)) {
    throw new AppError(400, "Javob tiketi noto'g'ri");
  }

  return { questionId, issuedAt };
}

function sign(body: string): string {
  return createHmac("sha256", env.TELEGRAM_BOT_TOKEN).update(body).digest("hex");
}

function signatureMatches(body: string, signature: string): boolean {
  try {
    const expected = Buffer.from(sign(body), "hex");
    const received = Buffer.from(signature, "hex");

    return expected.length === received.length && timingSafeEqual(expected, received);
  } catch {
    return false;
  }
}
