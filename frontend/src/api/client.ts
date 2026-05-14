import type { AnswerResult, AnswerStatus, AppUser, AuthResponse, LeaderboardUser, Question } from "../types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
const API_BASE_URL = `${API_URL.replace(/\/$/, "")}/api`;
const DEFAULT_USER: AppUser = {
  id: "0",
  telegramId: 0,
  firstName: "Zakovatchi",
  lastName: null,
  username: "guest",
  score: 0
};
const FALLBACK_ANSWER_RESULT: AnswerResult = {
  isCorrect: false,
  status: "incorrect",
  explanation: "Tekshirib bo'lmadi",
  newScore: 0,
  correctAnswer: ""
};
const FALLBACK_QUESTIONS = [
  {
    id: "1",
    text: "O'zbekistonning poytaxti qaysi shahar?",
    category: "geography",
    difficulty: "easy",
    correct_answer: "Toshkent"
  },
  {
    id: "2",
    text: "Alisher Navoiy qaysi asrda yashagan?",
    category: "history",
    difficulty: "easy",
    correct_answer: "XV asr"
  },
  {
    id: "3",
    text: "Suv necha darajada qaynaydi?",
    category: "science",
    difficulty: "easy",
    correct_answer: "100 daraja"
  },
  {
    id: "4",
    text: "O'zbekiston mustaqilligini qaysi yili oldi?",
    category: "history",
    difficulty: "easy",
    correct_answer: "1991"
  },
  {
    id: "5",
    text: "Matematik: 15 × 8 = ?",
    category: "math",
    difficulty: "easy",
    correct_answer: "120"
  },
  {
    id: "6",
    text: "Dunyo bo'yicha eng baland tog' qaysi?",
    category: "geography",
    difficulty: "medium",
    correct_answer: "Everest"
  },
  {
    id: "7",
    text: "Insonning normal tana harorati necha daraja?",
    category: "science",
    difficulty: "easy",
    correct_answer: "36.6"
  },
  {
    id: "8",
    text: "O'zbekistonning milliy valyutasi nima?",
    category: "general",
    difficulty: "easy",
    correct_answer: "So'm"
  },
  {
    id: "9",
    text: "Bir yilda necha kun bor?",
    category: "general",
    difficulty: "easy",
    correct_answer: "365"
  },
  {
    id: "10",
    text: "Amir Temur qaysi shaharda tug'ilgan?",
    category: "history",
    difficulty: "medium",
    correct_answer: "Kesh (Shahrisabz)"
  }
] satisfies Array<Question & { correct_answer: string }>;

type RequestOptions = {
  body?: unknown;
  initData?: string;
  method?: "GET" | "POST";
};

type TopUsersResponse = {
  users: LeaderboardUser[];
};

export async function login(initData: string): Promise<AuthResponse> {
  try {
    const response = await request<AuthResponse>("/auth/login", {
      method: "POST",
      initData,
      body: { initData }
    });

    return response ?? { user: DEFAULT_USER };
  } catch (error) {
    console.error("Login fallback enabled", error);
    return { user: DEFAULT_USER };
  }
}

export async function getQuestion(): Promise<Question> {
  try {
    return (await request<Question>("/questions/random")) ?? getRandomFallbackQuestion();
  } catch (error) {
    console.error("Question fallback enabled", error);
    return getRandomFallbackQuestion();
  }
}

export async function submitAnswer(
  questionId: string,
  userAnswer: string,
  timeTaken: number
): Promise<AnswerResult> {
  try {
    const response = await request<AnswerResult>("/answer", {
      method: "POST",
      body: {
        questionId,
        userAnswer,
        timeTaken
      }
    });

    return response ? normalizeAnswerResult(response, userAnswer) : checkFallbackAnswer(questionId, userAnswer);
  } catch (error) {
    console.error("Answer fallback enabled", error);
    return checkFallbackAnswer(questionId, userAnswer);
  }
}

export async function getMe(): Promise<AppUser> {
  try {
    const response = await request<AuthResponse>("/auth/me");

    return response?.user ?? DEFAULT_USER;
  } catch (error) {
    console.error("Me fallback enabled", error);
    return DEFAULT_USER;
  }
}

export async function getTopUsers(limit = 3): Promise<LeaderboardUser[]> {
  try {
    const response = await request<TopUsersResponse>(`/users/top?limit=${limit}`);

    return response?.users ?? [];
  } catch (error) {
    console.error("Top users fallback enabled", error);
    return [];
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T | null> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? "GET",
      headers: buildHeaders(options.initData),
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    const responseBody = await parseResponse(response);

    if (!response.ok) {
      console.error("API request failed", {
        path,
        status: response.status,
        responseBody
      });
      return null;
    }

    return responseBody as T;
  } catch (error) {
    console.error("API request error", error);
    return null;
  }
}

function buildHeaders(initDataOverride?: string) {
  const initData = initDataOverride ?? getTelegramInitData();
  const headers = new Headers({
    "Content-Type": "application/json"
  });

  if (initData) {
    headers.set("Authorization", `tma ${initData}`);
  }

  return headers;
}

async function parseResponse(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function getTelegramInitData() {
  return window.Telegram?.WebApp?.initData || "guest";
}

function getRandomFallbackQuestion(): Question {
  const index = Math.floor(Math.random() * FALLBACK_QUESTIONS.length);
  const question = FALLBACK_QUESTIONS[index] ?? FALLBACK_QUESTIONS[0];

  return {
    id: question.id,
    text: question.text,
    category: question.category,
    difficulty: question.difficulty
  };
}

function checkFallbackAnswer(questionId: string, userAnswer: string): AnswerResult {
  const question = FALLBACK_QUESTIONS.find((fallbackQuestion) => fallbackQuestion.id === questionId);

  if (!question) {
    return FALLBACK_ANSWER_RESULT;
  }

  const { status } = checkAnswerLocally(userAnswer, question.correct_answer);
  const isCorrect = status === "correct";

  return {
    isCorrect,
    status,
    explanation: getFallbackExplanation(status),
    newScore: isCorrect ? 1 : 0,
    correctAnswer: question.correct_answer
  };
}

function checkAnswerLocally(userAnswer: string, correctAnswer: string): { status: AnswerStatus; similarity: number } {
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
    return { status: "correct", similarity: 1 };
  }

  const maxLen = Math.max(user.length, correct.length);
  const distance = levenshtein(user, correct);
  const similarity = maxLen > 0 ? 1 - distance / maxLen : 0;
  const partialMatch =
    (similarity >= 0.5 && similarity < 0.9) ||
    (correct.includes(user) && user.length >= 3) ||
    user.includes(correct);

  if (similarity >= 0.9) {
    return { status: "correct", similarity };
  }

  if (partialMatch) {
    return { status: "partial", similarity };
  }

  const correctWords = correct.split(" ").filter((word) => word.length > 2);
  const matchCount = correctWords.filter((word) => user.includes(word)).length;

  if (correctWords.length > 0 && matchCount / correctWords.length >= 0.6) {
    return { status: "partial", similarity };
  }

  return { status: "incorrect", similarity: 0 };
}

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, rowIndex) =>
    Array.from({ length: b.length + 1 }, (_, columnIndex) => {
      if (rowIndex === 0) {
        return columnIndex;
      }

      if (columnIndex === 0) {
        return rowIndex;
      }

      return 0;
    })
  );

  for (let rowIndex = 1; rowIndex <= a.length; rowIndex += 1) {
    for (let columnIndex = 1; columnIndex <= b.length; columnIndex += 1) {
      dp[rowIndex][columnIndex] =
        a[rowIndex - 1] === b[columnIndex - 1]
          ? dp[rowIndex - 1][columnIndex - 1]
          : 1 +
            Math.min(
              dp[rowIndex - 1][columnIndex],
              dp[rowIndex][columnIndex - 1],
              dp[rowIndex - 1][columnIndex - 1]
            );
    }
  }

  return dp[a.length][b.length];
}

function normalizeAnswerResult(result: AnswerResult, userAnswer: string): AnswerResult {
  const localStatus = result.correctAnswer ? checkAnswerLocally(userAnswer, result.correctAnswer).status : "incorrect";
  const status = result.status ?? (result.isCorrect ? "correct" : localStatus);

  return {
    ...result,
    isCorrect: status === "correct",
    status
  };
}

function getFallbackExplanation(status: AnswerStatus) {
  if (status === "correct") {
    return "Javob to'g'ri";
  }

  if (status === "partial") {
    return "Javob qisman to'g'ri, imloni tekshiring";
  }

  return "Tekshirib bo'lmadi";
}
