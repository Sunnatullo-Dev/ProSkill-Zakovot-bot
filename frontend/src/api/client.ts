import type {
  AnswerResult,
  AnswerStatus,
  AppUser,
  AuthResponse,
  LeaderboardUser,
  NewQuestionInput,
  Question,
  Submission
} from "../types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
const API_BASE_URL = `${API_URL.replace(/\/$/, "")}/api`;
const ANSWER_TIMEOUT_MS = 15000;
const DEFAULT_USER: AppUser = {
  id: "0",
  telegramId: 0,
  firstName: "Zakovatchi",
  lastName: null,
  username: "guest",
  score: 0
};

type FallbackQuestion = Question & { correctAnswer: string };

const FALLBACK_QUESTIONS: FallbackQuestion[] = [
  {
    id: "1",
    text: "O'zbekistonning poytaxti qaysi shahar?",
    category: "geography",
    difficulty: "easy",
    correctAnswer: "Toshkent"
  },
  {
    id: "2",
    text: "Alisher Navoiy qaysi asrda yashagan?",
    category: "history",
    difficulty: "easy",
    correctAnswer: "XV asr"
  },
  {
    id: "3",
    text: "Suv necha darajada qaynaydi?",
    category: "science",
    difficulty: "easy",
    correctAnswer: "100 daraja"
  },
  {
    id: "4",
    text: "O'zbekiston mustaqilligini qaysi yili oldi?",
    category: "history",
    difficulty: "easy",
    correctAnswer: "1991"
  },
  {
    id: "5",
    text: "Matematik: 15 × 8 = ?",
    category: "math",
    difficulty: "easy",
    correctAnswer: "120"
  },
  {
    id: "6",
    text: "Dunyo bo'yicha eng baland tog' qaysi?",
    category: "geography",
    difficulty: "medium",
    correctAnswer: "Everest"
  },
  {
    id: "7",
    text: "Insonning normal tana harorati necha daraja?",
    category: "science",
    difficulty: "easy",
    correctAnswer: "36.6"
  },
  {
    id: "8",
    text: "O'zbekistonning milliy valyutasi nima?",
    category: "general",
    difficulty: "easy",
    correctAnswer: "So'm"
  },
  {
    id: "9",
    text: "Bir yilda necha kun bor?",
    category: "general",
    difficulty: "easy",
    correctAnswer: "365"
  },
  {
    id: "10",
    text: "Amir Temur qaysi shaharda tug'ilgan?",
    category: "history",
    difficulty: "medium",
    correctAnswer: "Kesh (Shahrisabz)"
  }
];

type RequestOptions = {
  body?: unknown;
  initData?: string;
  method?: "GET" | "POST";
};

type TopUsersResponse = {
  users: LeaderboardUser[];
};

type SubmissionsResponse = {
  submissions: Submission[];
};

export type SubmitQuestionResult = {
  ok: boolean;
  message: string;
};

type RemoteQuestion = {
  id: string | number;
  text: string;
  category: string | null;
  difficulty: string | null;
};

type SubmitAnswerApiResponse = {
  status: AnswerStatus;
  isCorrect: boolean;
  explanation: string;
  newScore: number;
  correctAnswer: string;
};

const FALLBACK_AUTH: AuthResponse = { user: DEFAULT_USER, isAdmin: false };

export async function login(initData: string): Promise<AuthResponse> {
  try {
    const response = await request<AuthResponse>("/auth/login", {
      method: "POST",
      initData,
      body: { initData }
    });

    return response ?? FALLBACK_AUTH;
  } catch (error) {
    console.error("Login fallback enabled", error);
    return FALLBACK_AUTH;
  }
}

export async function getQuestion(): Promise<Question> {
  try {
    const response = await request<RemoteQuestion>("/questions/random");

    return response ? normalizeQuestion(response) : getRandomFallbackQuestion();
  } catch (error) {
    console.error("Question fallback enabled", error);
    return getRandomFallbackQuestion();
  }
}

export async function submitAnswer(
  question: Question,
  userAnswer: string,
  timeTaken: number
): Promise<AnswerResult> {
  const offlineAnswer = findFallbackAnswer(question.id);

  if (timeTaken >= ANSWER_TIMEOUT_MS) {
    return {
      isCorrect: false,
      status: "incorrect",
      explanation: "Vaqt tugadi",
      newScore: 0,
      correctAnswer: offlineAnswer ?? ""
    };
  }

  if (offlineAnswer !== undefined) {
    const status = checkAnswerLocally(offlineAnswer, userAnswer);

    return {
      isCorrect: status === "correct",
      status,
      explanation: "",
      newScore: status === "correct" ? 1 : 0,
      correctAnswer: offlineAnswer
    };
  }

  const response = await request<SubmitAnswerApiResponse>("/answer", {
    method: "POST",
    body: { questionId: question.id, userAnswer, timeTaken }
  });

  if (response) {
    return {
      isCorrect: response.isCorrect,
      status: response.status,
      explanation: response.explanation,
      newScore: response.newScore,
      correctAnswer: response.correctAnswer
    };
  }

  return {
    isCorrect: false,
    status: "incorrect",
    explanation: "Javobni tekshirib bo'lmadi",
    newScore: 0,
    correctAnswer: ""
  };
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

export async function submitQuestion(input: NewQuestionInput): Promise<SubmitQuestionResult> {
  const response = await request<{ submission: Submission }>("/submissions", {
    method: "POST",
    body: input
  });

  if (response?.submission) {
    return { ok: true, message: "Savol adminga yuborildi. Tasdiqlangach bazaga qo'shiladi." };
  }

  return {
    ok: false,
    message: "Savol yuborilmadi. Internet aloqasini yoki maydonlarni tekshiring."
  };
}

export async function getMySubmissions(): Promise<Submission[]> {
  const response = await request<SubmissionsResponse>("/submissions/mine");

  return response?.submissions ?? [];
}

export async function getPendingSubmissions(): Promise<Submission[]> {
  const response = await request<SubmissionsResponse>("/submissions/pending");

  return response?.submissions ?? [];
}

export async function reviewSubmission(
  submissionId: string,
  decision: "approve" | "reject"
): Promise<boolean> {
  const response = await request<{ status: string }>(`/submissions/${submissionId}/review`, {
    method: "POST",
    body: { decision }
  });

  return Boolean(response?.status);
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

function normalizeQuestion(question: RemoteQuestion): Question {
  return {
    id: String(question.id),
    text: question.text,
    category: question.category ?? null,
    difficulty: question.difficulty ?? null
  };
}

function findFallbackAnswer(id: string): string | undefined {
  return FALLBACK_QUESTIONS.find((question) => question.id === id)?.correctAnswer;
}

function checkAnswerLocally(correctAnswer: string, userAnswer: string): AnswerStatus {
  const clean = (value: string) =>
    value
      .toLowerCase()
      .trim()
      .replace(/[().,!?-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const user = clean(userAnswer);
  const correct = clean(correctAnswer);

  if (!user) {
    return "incorrect";
  }

  if (user === correct) {
    return "correct";
  }

  if (correct.includes(user) && user.length >= 3) {
    return "partial";
  }

  return "incorrect";
}
