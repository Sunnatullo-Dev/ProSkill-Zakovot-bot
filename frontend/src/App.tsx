import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { getQuestion, getTopUsers, login, submitAnswer } from "./api/client";
import FinishScreen from "./components/FinishScreen";
import HomeScreen from "./components/HomeScreen";
import QuestionCard from "./components/QuestionCard";
import ResultScreen from "./components/ResultScreen";
import { useTelegram } from "./hooks/useTelegram";
import { useTimer } from "./hooks/useTimer";
import type { AnswerResult, AppUser, LeaderboardUser, Question, Screen } from "./types";

const TIMER_SECONDS = 15;
const ANSWER_TIMEOUT_MS = 15000;
const MAX_QUESTION_COUNT = 10;
const SERVER_ERROR_MESSAGE = "Serverga ulanib bo'lmadi. Qayta urinib ko'ring.";
const TELEGRAM_ERROR_MESSAGE = "Telegram orqali oching";

type SubmitAnswerFn = (userAnswer: string, timeTaken: number) => Promise<void>;

export default function App() {
  const { initData, isReady, user: telegramUser, error: telegramError } = useTelegram();
  const [screen, setScreen] = useState<Screen>("loading");
  const [user, setUser] = useState<AppUser | null>(null);
  const [score, setScore] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [lastResult, setLastResult] = useState<AnswerResult | null>(null);
  const [questionCount, setQuestionCount] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [answer, setAnswer] = useState("");
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const submitAnswerRef = useRef<SubmitAnswerFn | null>(null);
  const timer = useTimer(TIMER_SECONDS, () => {
    void submitAnswerRef.current?.("", ANSWER_TIMEOUT_MS + 1);
  });

  const loadTopUsers = useCallback(async () => {
    try {
      const users = await getTopUsers(3);
      setLeaderboard(users);
    } catch (error) {
      console.error("Top users load failed", error);
      setLeaderboard([]);
    }
  }, []);

  const loadQuestion = useCallback(async (nextQuestionCount: number) => {
    try {
      setErrorMessage("");
      setAnswer("");
      setLastResult(null);
      setCurrentQuestion(null);
      setScreen("question");
      timer.reset();

      const question = await getQuestion();

      setCurrentQuestion(question);
      setQuestionCount(nextQuestionCount);
      timer.start();
    } catch (error) {
      console.error("Question load failed", error);
      setErrorMessage(SERVER_ERROR_MESSAGE);
      setScreen("home");
    }
  }, [timer]);

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
      timer.stop();

      const result = await submitAnswer(currentQuestion.id, userAnswer.trim(), timeTaken);

      if (result.isCorrect) {
        setCorrectAnswers((currentValue) => currentValue + 1);
      }

      setLastResult(result);
      setScore(result.newScore);
      setUser((currentUser) => (currentUser ? { ...currentUser, score: result.newScore } : currentUser));
      setScreen("result");
      void loadTopUsers();
    } catch (error) {
      console.error("Answer submit failed", error);
      setErrorMessage(SERVER_ERROR_MESSAGE);
      timer.start();
    } finally {
      setIsSubmitting(false);
    }
  }, [currentQuestion, isSubmitting, loadTopUsers, timer]);

  useEffect(() => {
    submitAnswerRef.current = handleSubmitAnswer;
  }, [handleSubmitAnswer]);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (!initData) {
      console.error("Telegram initData is missing", telegramError);
      setErrorMessage(TELEGRAM_ERROR_MESSAGE);
      setScreen("home");
      return;
    }

    async function bootstrap() {
      try {
        setScreen("loading");
        setErrorMessage("");

        const response = await login(initData);

        setUser(response.user);
        setScore(response.user.score);
        await loadTopUsers();
        setScreen("home");
      } catch (error) {
        console.error("Login failed", error);
        setErrorMessage(SERVER_ERROR_MESSAGE);
        setScreen("home");
      }
    }

    void bootstrap();
  }, [initData, isReady, loadTopUsers, telegramError]);

  function handleStartGame() {
    if (!initData) {
      setErrorMessage(TELEGRAM_ERROR_MESSAGE);
      return;
    }

    setQuestionCount(0);
    setCorrectAnswers(0);
    void loadQuestion(1);
  }

  async function handleAnswerSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const timeTaken = (TIMER_SECONDS - timer.timeLeft) * 1000;
    await handleSubmitAnswer(answer, timeTaken);
  }

  function handleNextQuestion() {
    if (questionCount >= MAX_QUESTION_COUNT) {
      timer.reset();
      setCurrentQuestion(null);
      setScreen("finish");
      return;
    }

    void loadQuestion(questionCount + 1);
  }

  const playerName = telegramUser?.first_name || user?.firstName || user?.username || "Zakovotchi";

  return (
    <main className="min-h-screen bg-[#0F1B2D] px-4 py-4 text-white">
      <section className="mx-auto min-h-[calc(100vh-32px)] w-full max-w-[430px]">
        {screen === "loading" ? (
          <div className="grid min-h-[calc(100vh-32px)] place-items-center text-center">
            <div>
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-[#1E2D42] text-3xl">
                {"\u{1F9E0}"}
              </span>
              <p className="mt-4 text-lg font-black text-white">Zakovot</p>
              <p className="mt-2 text-sm font-semibold text-[#94A3B8]">Yuklanmoqda...</p>
            </div>
          </div>
        ) : null}

        {screen === "home" ? (
          <HomeScreen
            error={errorMessage}
            isLoading={false}
            leaderboard={leaderboard}
            playerName={playerName}
            score={score}
            onStart={handleStartGame}
          />
        ) : null}

        {screen === "question" ? (
          <QuestionCard
            answer={answer}
            currentQuestion={questionCount}
            disabled={!currentQuestion || isSubmitting || timer.isExpired}
            error={errorMessage}
            isChecking={isSubmitting}
            isLoading={!currentQuestion}
            question={currentQuestion?.text ?? ""}
            remainingSeconds={timer.timeLeft}
            totalQuestions={MAX_QUESTION_COUNT}
            totalSeconds={TIMER_SECONDS}
            onAnswerChange={setAnswer}
            onSubmit={handleAnswerSubmit}
          />
        ) : null}

        {screen === "result" && lastResult ? (
          <ResultScreen
            currentQuestion={questionCount}
            result={lastResult}
            totalQuestions={MAX_QUESTION_COUNT}
            onNext={handleNextQuestion}
          />
        ) : null}

        {screen === "finish" ? (
          <FinishScreen
            leaderboard={leaderboard}
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
