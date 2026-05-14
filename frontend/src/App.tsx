import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { getQuestion, getTopUsers, login, submitAnswer } from "./api/client";
import FinishScreen from "./components/FinishScreen";
import HomeScreen from "./components/HomeScreen";
import QuestionCard from "./components/QuestionCard";
import ResultScreen from "./components/ResultScreen";
import { useTelegram } from "./hooks/useTelegram";
import { useTimer } from "./hooks/useTimer";
import type { AnswerResult, AppUser, AuthResponse, LeaderboardUser, Question, Screen } from "./types";

const TIMER_SECONDS = 15;
const ANSWER_TIMEOUT_MS = 15000;
const MAX_QUESTION_COUNT = 10;
const BOOTSTRAP_TIMEOUT_MS = 1000;
const RESULT_AUTO_DELAY_MS = 3000;
const PARTIAL_RESULT_AUTO_DELAY_MS = 3500;
const DEFAULT_APP_USER: AppUser = {
  id: "0",
  telegramId: 0,
  firstName: "Zakovatchi",
  lastName: null,
  username: "guest",
  score: 0
};

type SubmitAnswerFn = (userAnswer: string, timeTaken: number) => Promise<void>;

export default function App() {
  const { initData, isReady, user: telegramUser } = useTelegram();
  const [screen, setScreen] = useState<Screen>("loading");
  const [user, setUser] = useState<AppUser | null>(null);
  const [score, setScore] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [lastResult, setLastResult] = useState<AnswerResult | null>(null);
  const [lastUserAnswer, setLastUserAnswer] = useState("");
  const [questionCount, setQuestionCount] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [answer, setAnswer] = useState("");
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const submitAnswerRef = useRef<SubmitAnswerFn | null>(null);
  const handleTimerExpire = useCallback(() => {
    void submitAnswerRef.current?.("", ANSWER_TIMEOUT_MS + 1);
  }, []);
  const timer = useTimer(TIMER_SECONDS, handleTimerExpire);
  const { isExpired, reset, start, stop, timeLeft } = timer;

  const loadTopUsers = useCallback(async () => {
    try {
      const users = await getTopUsers(3);
      setLeaderboard(users);
    } catch (error) {
      console.error("Top users load failed", error);
      setLeaderboard([]);
    }
  }, []);

  const loadQuestion = useCallback(async (nextQuestionCount: number, keepCurrentScreen = false) => {
    try {
      setErrorMessage("");
      setAnswer("");
      setLastUserAnswer("");
      setLastResult(null);
      setCurrentQuestion(null);
      if (!keepCurrentScreen) {
        setScreen("question");
      }
      reset();

      const question = await getQuestion();

      setCurrentQuestion(question);
      setQuestionCount(nextQuestionCount);
      setScreen("question");
      start();
    } catch (error) {
      console.error("Question load failed", error);
      setScreen("home");
    }
  }, [reset, start]);

  const handleSubmitAnswer = useCallback<SubmitAnswerFn>(async (userAnswer: string, timeTaken: number) => {
    if (!currentQuestion || isSubmitting) {
      return;
    }

    if (timeTaken <= ANSWER_TIMEOUT_MS && !userAnswer.trim()) {
      setErrorMessage("Javob yozing.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");
      stop();

      const submittedAnswer = userAnswer.trim();
      const result = await submitAnswer(currentQuestion.id, submittedAnswer, timeTaken);
      const isFullyCorrect = result.status === "correct";
      const nextScore = isFullyCorrect ? Math.max(result.newScore, score + 1) : Math.max(result.newScore, score);

      if (isFullyCorrect) {
        setCorrectAnswers((currentValue) => currentValue + 1);
      }

      setLastUserAnswer(submittedAnswer);
      setLastResult({ ...result, isCorrect: isFullyCorrect, newScore: nextScore });
      setScore(nextScore);
      setUser((currentUser) => (currentUser ? { ...currentUser, score: nextScore } : currentUser));
      setScreen("result");
      void loadTopUsers();
    } catch (error) {
      console.error("Answer submit failed", error);
      start();
    } finally {
      setIsSubmitting(false);
    }
  }, [currentQuestion, isSubmitting, loadTopUsers, score, start, stop]);

  useEffect(() => {
    submitAnswerRef.current = handleSubmitAnswer;
  }, [handleSubmitAnswer]);

  const handleNextQuestion = useCallback(() => {
    if (questionCount >= MAX_QUESTION_COUNT) {
      reset();
      setCurrentQuestion(null);
      setScreen("finish");
      return;
    }

    void loadQuestion(questionCount + 1, true);
  }, [loadQuestion, questionCount, reset]);

  useEffect(() => {
    if (screen !== "result" || !lastResult) {
      return;
    }

    const delay = lastResult.status === "partial" ? PARTIAL_RESULT_AUTO_DELAY_MS : RESULT_AUTO_DELAY_MS;
    const timeoutId = window.setTimeout(() => {
      handleNextQuestion();
    }, delay);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [handleNextQuestion, lastResult, screen]);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    async function bootstrap() {
      try {
        setScreen("loading");
        setErrorMessage("");
        const effectiveInitData = initData || "guest";

        const response = await withTimeout(login(effectiveInitData), {
          user: telegramUser
            ? {
                ...DEFAULT_APP_USER,
                firstName: telegramUser.first_name ?? DEFAULT_APP_USER.firstName,
                lastName: telegramUser.last_name ?? null,
                username: telegramUser.username ?? DEFAULT_APP_USER.username
              }
            : DEFAULT_APP_USER
        });

        setUser(response.user);
        setScore(response.user.score);
        await loadTopUsers();
        setScreen("home");
      } catch (error) {
        console.error("Login failed", error);
        setUser(DEFAULT_APP_USER);
        setScore(DEFAULT_APP_USER.score);
        setScreen("home");
      }
    }

    void bootstrap();
  }, [initData, isReady, loadTopUsers, telegramUser]);

  async function handleStartGame() {
    try {
      setIsStarting(true);
      setQuestionCount(0);
      setCorrectAnswers(0);
      await loadQuestion(1, true);
    } catch (error) {
      console.error("Start game failed", error);
      setScreen("home");
    } finally {
      setIsStarting(false);
    }
  }

  async function handleAnswerSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const timeTaken = (TIMER_SECONDS - timeLeft) * 1000;
    await handleSubmitAnswer(answer, timeTaken);
  }

  const playerName = telegramUser?.first_name || user?.firstName || user?.username || "Zakovatchi";
  const recordScore = Math.max(score, leaderboard[0]?.score ?? 0);

  return (
    <main className="min-h-screen bg-[var(--color-bg)] px-4 py-4 text-[var(--color-text)]">
      <section className="mx-auto min-h-[calc(100vh-32px)] w-full max-w-[430px]">
        {screen === "loading" ? (
          <div className="grid min-h-[calc(100vh-32px)] place-items-center text-center">
            <div>
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-[var(--color-card)] text-3xl">
                {"\u{1F9E0}"}
              </span>
              <p className="mt-4 text-lg font-black text-[var(--color-text)]">Zakovat</p>
              <p className="mt-2 text-sm font-semibold text-[var(--color-muted)]">Yuklanmoqda...</p>
            </div>
          </div>
        ) : null}

        {screen === "home" ? (
          <HomeScreen
            error={errorMessage}
            isLoading={isStarting}
            playerName={playerName}
            record={recordScore}
            score={score}
            onStart={handleStartGame}
          />
        ) : null}

        {screen === "question" ? (
          <QuestionCard
            answer={answer}
            currentQuestion={questionCount}
            disabled={!currentQuestion || isSubmitting || isExpired}
            error={errorMessage}
            isChecking={isSubmitting}
            isLoading={!currentQuestion}
            question={currentQuestion?.text ?? ""}
            remainingSeconds={timeLeft}
            totalQuestions={MAX_QUESTION_COUNT}
            totalSeconds={TIMER_SECONDS}
            onAnswerChange={setAnswer}
            onSubmit={handleAnswerSubmit}
          />
        ) : null}

        {screen === "result" && lastResult ? (
          <ResultScreen
            autoNextSeconds={lastResult.status === "partial" ? 3.5 : 3}
            currentQuestion={questionCount}
            result={lastResult}
            totalQuestions={MAX_QUESTION_COUNT}
            userAnswer={lastUserAnswer}
            onNext={handleNextQuestion}
          />
        ) : null}

        {screen === "finish" ? (
          <FinishScreen
            playerName={playerName}
            roundScore={correctAnswers}
            totalQuestions={MAX_QUESTION_COUNT}
            totalScore={score}
            onRestart={handleStartGame}
          />
        ) : null}
      </section>
    </main>
  );
}

function withTimeout(promise: Promise<AuthResponse>, fallback: AuthResponse): Promise<AuthResponse> {
  return Promise.race([
    promise,
    new Promise<AuthResponse>((resolve) => {
      window.setTimeout(() => resolve(fallback), BOOTSTRAP_TIMEOUT_MS);
    })
  ]);
}
