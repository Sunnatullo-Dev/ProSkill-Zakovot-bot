import type { AnswerStatus } from "../types";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
const GEMINI_TIMEOUT_MS = 10000;
const PLACEHOLDER_API_KEY = "your_gemini_api_key";

type GeminiCheckResult = {
  status: AnswerStatus;
  explanation: string;
};

type GeminiApiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

export async function checkWithGemini(
  question: string,
  correctAnswer: string,
  userAnswer: string
): Promise<GeminiCheckResult> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey || apiKey === PLACEHOLDER_API_KEY) {
    return localFallback(correctAnswer, userAnswer);
  }

  const prompt = `
Sen bilim o'yini hakamisisan. Faqat JSON qaytarasan.

Savol: "${question}"
To'g'ri javob: "${correctAnswer}"
Foydalanuvchi javobi: "${userAnswer}"

Qoidalar:
- Imlo xatolariga e'tibor berma
- Ma'no to'g'ri bo'lsa "correct" ber
- Qisman to'g'ri (yaqin, lekin to'liq emas) bo'lsa "partial"
- Umuman noto'g'ri bo'lsa "incorrect"
- explanation o'zbek tilida, qisqa (1 gap)

Faqat JSON qaytar, boshqa hech narsa yozma:
{"status":"correct"|"partial"|"incorrect","explanation":"..."}
`;

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => {
    controller.abort();
  }, GEMINI_TIMEOUT_MS);

  try {
    const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini request failed: ${response.status}`);
    }

    const data = (await response.json()) as GeminiApiResponse;
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const clean = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(clean) as {
      status?: unknown;
      explanation?: unknown;
    };

    if (!isAnswerStatus(parsed.status)) {
      throw new Error("Invalid Gemini status");
    }

    return {
      status: parsed.status,
      explanation: typeof parsed.explanation === "string" ? parsed.explanation : ""
    };
  } catch (error) {
    console.error("Gemini fallback enabled", error);
    return localFallback(correctAnswer, userAnswer);
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function isAnswerStatus(value: unknown): value is AnswerStatus {
  return value === "correct" || value === "partial" || value === "incorrect";
}

function localFallback(correctAnswer: string, userAnswer: string): GeminiCheckResult {
  const clean = (value: string) =>
    value
      .toLowerCase()
      .trim()
      .replace(/[().,!?-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const user = clean(userAnswer);
  const correct = clean(correctAnswer);

  if (user === correct) {
    return { status: "correct", explanation: "" };
  }

  if (correct.includes(user) && user.length >= 3) {
    return { status: "partial", explanation: "" };
  }

  return { status: "incorrect", explanation: "" };
}
