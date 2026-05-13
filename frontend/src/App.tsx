import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { apiClient } from "./api/client";
import FinishScreen from "./components/FinishScreen";
import HomeScreen from "./components/HomeScreen";
import QuestionCard from "./components/QuestionCard";
import ResultScreen from "./components/ResultScreen";
import { useTelegram } from "./hooks/useTelegram";
import { useTimer } from "./hooks/useTimer";
import type { AnswerResult, AnswerStatus, AppUser, LeaderboardUser, Question } from "./types";

const ROUND_SECONDS = 15;
const TOTAL_QUESTIONS = 10;

type GameScreen = "home" | "question" | "result" | "finish";

export default function App() {
  const { initData, telegramUser, isReady, error: telegramError } = useTelegram();
  const [user, setUser] = useState<AppUser | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [question, setQuestion] = useState<Question | null>(null);
  const [answer, setAnswer] = useState("");
  const [answerResult, setAnswerResult] = useState<AnswerResult | null>(null);
  const [status, setStatus] = useState<AnswerStatus>("idle");
  const [screen, setScreen] = useState<GameScreen>("home");
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState(1);
  const [roundScore, setRoundScore] = useState(0);
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [isQuestionLoading, setIsQuestionLoading] = useState(false);
  const [error, setError] = useState("");

  const loadLeaderboard = useCallback(async () => {
    if (!initData) {
      return;
    }

    try {
      const nextLeaderboard = await apiClient.getLeaderboard(initData);
      setLeaderboard(nextLeaderboard);
    } catch {
      setLeaderboard([]);
    }
  }, [initData]);

  const submitAnswer = useCallback(async (answerText: string, timedOut = false) => {
    if (!initData || !question || status !== "idle") {
      return;
    }

    if (!timedOut && !answerText.trim()) {
      setError("Javob yozing.");
      return;
    }

    setStatus(timedOut ? "timeout" : "checking");
    setError("");

    try {
      const result = await apiClient.submitAnswer(initData, {
        questionId: question.id,
        answer: answerText.trim(),
        timedOut
      });

      if (result.isCorrect) {
        setRoundScore((currentScore) => currentScore + 1);
      }

      setUser((currentUser) => (currentUser ? { ...currentUser, score: result.score } : currentUser));
      setAnswerResult(result);
      setStatus(result.isCorrect ? "correct" : timedOut ? "timeout" : "wrong");
      setScreen("result");
      void loadLeaderboard();
    } catch (requestError) {
      setStatus("idle");
      setError(requestError instanceof Error ? requestError.message : "Javobni tekshirishda xatolik yuz berdi.");
    }
  }, [initData, loadLeaderboard, question, status]);

  const { remainingSeconds, resetTimer } = useTimer(
    ROUND_SECONDS,
    screen === "question" && Boolean(question) && !isQuestionLoading && status === "idle",
    () => {
      void submitAnswer("", true);
    }
  );

  const loadQuestion = useCallback(async (questionNumber: number) => {
    if (!initData) {
      setError("Telegram initData topilmadi.");
      return;
    }

    setScreen("question");
    setCurrentQuestionNumber(questionNumber);
    setIsQuestionLoading(true);
    setAnswer("");
    setAnswerResult(null);
    setError("");
    setStatus("idle");

    try {
      const nextQuestion = await apiClient.getRandomQuestion(initData);
      setQuestion(nextQuestion);
      resetTimer();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Savolni olishda xatolik yuz berdi.");
      setScreen("home");
    } finally {
      setIsQuestionLoading(false);
    }
  }, [initData, resetTimer]);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (!initData) {
      setIsAppLoading(false);
      setError(telegramError || "Zakovotni Telegram Mini App ichida oching.");
      return;
    }

    async function bootstrap() {
      setIsAppLoading(true);
      setError("");

      try {
        const authResponse = await apiClient.login(initData);
        setUser(authResponse.user);
        const nextLeaderboard = await apiClient.getLeaderboard(initData);
        setLeaderboard(nextLeaderboard);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Ilovani yuklashda xatolik yuz berdi.");
      } finally {
        setIsAppLoading(false);
      }
    }

    void bootstrap();
  }, [initData, isReady, telegramError]);

  function handleStartGame() {
    setRoundScore(0);
    setCurrentQuestionNumber(1);
    void loadQuestion(1);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitAnswer(answer);
  }

  function handleNextQuestion() {
    if (currentQuestionNumber >= TOTAL_QUESTIONS) {
      setQuestion(null);
      setAnswerResult(null);
      setStatus("idle");
      setScreen("finish");
      return;
    }

    void loadQuestion(currentQuestionNumber + 1);
  }

  const playerName = telegramUser?.first_name || user?.firstName || user?.username || "Zakovotchi";

  return (
    <main className="min-h-screen bg-[#0F1B2D] px-4 py-4 text-white">
      <section className="mx-auto min-h-[calc(100vh-32px)] w-full max-w-[430px]">
        {screen === "home" ? (
          <HomeScreen
            error={error}
            isLoading={isAppLoading}
            leaderboard={leaderboard}
            playerName={playerName}
            score={user?.score ?? 0}
            onStart={handleStartGame}
          />
        ) : null}

        {screen === "question" ? (
          <QuestionCard
            answer={answer}
            currentQuestion={currentQuestionNumber}
            disabled={!question || status !== "idle" || isQuestionLoading}
            error={error}
            isChecking={status === "checking" || status === "timeout"}
            isLoading={isQuestionLoading}
            question={question?.question ?? ""}
            remainingSeconds={remainingSeconds}
            totalQuestions={TOTAL_QUESTIONS}
            totalSeconds={ROUND_SECONDS}
            onAnswerChange={setAnswer}
            onSubmit={handleSubmit}
          />
        ) : null}

        {screen === "result" && answerResult ? (
          <ResultScreen
            currentQuestion={currentQuestionNumber}
            result={answerResult}
            totalQuestions={TOTAL_QUESTIONS}
            onNext={handleNextQuestion}
          />
        ) : null}

        {screen === "finish" ? (
          <FinishScreen
            leaderboard={leaderboard}
            playerName={playerName}
            roundScore={roundScore}
            totalQuestions={TOTAL_QUESTIONS}
            totalScore={user?.score ?? 0}
            onRestart={handleStartGame}
          />
        ) : null}
      </section>
    </main>
  );
}
