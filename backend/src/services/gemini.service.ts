import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../config/env";
import type { CheckAnswerResult } from "../types";

const GEMINI_TIMEOUT_MS = 10000;
const FALLBACK_EXPLANATION = "Tekshirib bo'lmadi";

type GeminiJsonResponse = {
  isCorrect?: unknown;
  explanation?: unknown;
};

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: env.GEMINI_MODEL });

export async function checkAnswer(
  question: string,
  correctAnswer: string,
  userAnswer: string
): Promise<CheckAnswerResult> {
  try {
    const response = await withTimeout(model.generateContent(buildPrompt(question, correctAnswer, userAnswer)));
    const text = response.response.text();
    const parsed = parseGeminiResponse(text);

    if (!parsed) {
      return {
        isCorrect: false,
        explanation: FALLBACK_EXPLANATION
      };
    }

    return parsed;
  } catch (error) {
    console.error("Gemini answer check failed", error);

    return {
      isCorrect: false,
      explanation: FALLBACK_EXPLANATION
    };
  }
}

function buildPrompt(question: string, correctAnswer: string, userAnswer: string) {
  return `
Sen bilim o'yini hakamisisan.
Savol: ${question}
To'g'ri javob: ${correctAnswer}
Foydalanuvchi javobi: ${userAnswer}

Qoidalar:
- Imlo xatolariga e'tibor berma
- Ma'no to'g'ri bo'lsa to'g'ri deb hisobla
- Qisqa yoki to'liq javob bo'lsin — farqi yo'q
- Faqat JSON qaytar: {"isCorrect": true/false, "explanation": "..."}
`.trim();
}

function parseGeminiResponse(text: string): CheckAnswerResult | null {
  try {
    const jsonText = extractJson(text);

    if (!jsonText) {
      return null;
    }

    const parsed = JSON.parse(jsonText) as GeminiJsonResponse;

    if (typeof parsed.isCorrect !== "boolean") {
      return null;
    }

    return {
      isCorrect: parsed.isCorrect,
      explanation: typeof parsed.explanation === "string" ? parsed.explanation : ""
    };
  } catch (error) {
    console.error("Gemini JSON parse failed", error);
    return null;
  }
}

function extractJson(text: string) {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");
  const jsonStart = cleaned.indexOf("{");
  const jsonEnd = cleaned.lastIndexOf("}");

  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd < jsonStart) {
    return "";
  }

  return cleaned.slice(jsonStart, jsonEnd + 1);
}

async function withTimeout<T>(promise: Promise<T>) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error("Gemini request timeout"));
    }, GEMINI_TIMEOUT_MS);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}
