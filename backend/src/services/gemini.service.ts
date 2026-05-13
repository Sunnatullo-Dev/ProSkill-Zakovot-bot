import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../config/env";
import { AppError } from "../middleware/error.middleware";

type CheckAnswerInput = {
  question: string;
  correctAnswer: string;
  userAnswer: string;
};

type GeminiAnswerResult = {
  isCorrect: boolean;
  feedback: string;
};

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: env.GEMINI_MODEL });

export const geminiService = {
  async checkAnswer(input: CheckAnswerInput): Promise<GeminiAnswerResult> {
    const prompt = buildPrompt(input);
    const response = await model.generateContent(prompt);
    const text = response.response.text();
    const parsed = parseGeminiJson(text);

    return {
      isCorrect: parsed.isCorrect,
      feedback: parsed.feedback || (parsed.isCorrect ? "To'g'ri javob." : "Noto'g'ri javob.")
    };
  }
};

function buildPrompt({ question, correctAnswer, userAnswer }: CheckAnswerInput) {
  return `
Siz Zakovot bilim o'yinida javoblarni tekshiradigan hakamsiz.
Foydalanuvchi javobini mazmunan tekshiring. Imlo xatolari yoki kichik farqlar bo'lsa, mazmun to'g'ri bo'lsa to'g'ri deb baholang.

Savol: ${question}
To'g'ri javob: ${correctAnswer}
Foydalanuvchi javobi: ${userAnswer}

Faqat valid JSON qaytaring. "isCorrect" qiymati boolean bo'lsin.
Misol: {"isCorrect": true, "feedback": "qisqa izoh uzbek tilida"}
`.trim();
}

function parseGeminiJson(text: string): GeminiAnswerResult {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");
  const jsonStart = cleaned.indexOf("{");
  const jsonEnd = cleaned.lastIndexOf("}");

  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd < jsonStart) {
    throw new AppError(502, "Gemini javobini o'qib bo'lmadi.");
  }

  try {
    const parsed = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1)) as GeminiAnswerResult;

    if (typeof parsed.isCorrect !== "boolean") {
      throw new Error("isCorrect boolean emas");
    }

    return {
      isCorrect: parsed.isCorrect,
      feedback: typeof parsed.feedback === "string" ? parsed.feedback : ""
    };
  } catch {
    throw new AppError(502, "Gemini javobini o'qib bo'lmadi.");
  }
}
