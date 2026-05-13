import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { apiClient } from "./api/client";
import AnswerForm from "./components/AnswerForm";
import QuestionCard from "./components/QuestionCard";
import ScoreBadge from "./components/ScoreBadge";
import Timer from "./components/Timer";
import { useTelegram } from "./hooks/useTelegram";
import { useTimer } from "./hooks/useTimer";
import type { AnswerStatus, AppUser, Question } from "./types";

const ROUND_SECONDS = 15;

export default function App() {
  const { initData, telegramUser, isReady, error: telegramError } = useTelegram();
  const [user, setUser] = useState<AppUser | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState<AnswerStatus>("idle");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const canPlay = useMemo(() => Boolean(initData && user && question), [initData, user, question]);

  const handleTimeUp = useCallback(() => {
    setStatus((current) => {
      if (current !== "idle") {
        return current;
      }

      setMessage("Vaqt tugadi. Keyingi savolni oling.");
      return "timeout";
    });
  }, []);

  const { remainingSeconds, resetTimer } = useTimer(
    ROUND_SECONDS,
    canPlay && !isLoading && status === "idle",
    handleTimeUp
  );

  const loadQuestion = useCallback(async () => {
    if (!initData) {
      return;
    }

    setIsLoading(true);
    setError("");
    setAnswer("");
    setMessage("");
    setStatus("idle");

    try {
      const nextQuestion = await apiClient.getRandomQuestion(initData);
      setQuestion(nextQuestion);
      resetTimer();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Savolni olishda xatolik yuz berdi.");
    } finally {
      setIsLoading(false);
    }
  }, [initData, resetTimer]);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (!initData) {
      setIsLoading(false);
      setError(telegramError || "Zakovotni Telegram Mini App ichida oching.");
      return;
    }

    async function bootstrap() {
      setIsLoading(true);
      setError("");

      try {
        const authResponse = await apiClient.login(initData);
        setUser(authResponse.user);
        const firstQuestion = await apiClient.getRandomQuestion(initData);
        setQuestion(firstQuestion);
        resetTimer();
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Ilovani yuklashda xatolik yuz berdi.");
      } finally {
        setIsLoading(false);
      }
    }

    void bootstrap();
  }, [initData, isReady, resetTimer, telegramError]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!initData || !question || status !== "idle") {
      return;
    }

    const trimmedAnswer = answer.trim();

    if (!trimmedAnswer) {
      setMessage("Javob yozing.");
      return;
    }

    setStatus("checking");
    setMessage("Javob tekshirilmoqda...");

    try {
      const result = await apiClient.submitAnswer(initData, {
        questionId: question.id,
        answer: trimmedAnswer
      });

      setUser((currentUser) => (currentUser ? { ...currentUser, score: result.score } : currentUser));
      setStatus(result.isCorrect ? "correct" : "wrong");
      setMessage(result.feedback);
    } catch (requestError) {
      setStatus("idle");
      setMessage("");
      setError(requestError instanceof Error ? requestError.message : "Javobni tekshirishda xatolik yuz berdi.");
    }
  }

  return (
    <main className="min-h-screen bg-paper px-4 py-5 text-ink">
      <section className="mx-auto flex min-h-[calc(100vh-40px)] w-full max-w-md flex-col gap-4">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-brand">Zakovot</p>
            <h1 className="text-2xl font-bold">Bilim sinovi</h1>
          </div>
          <ScoreBadge score={user?.score ?? 0} />
        </header>

        {telegramUser?.first_name ? (
          <p className="text-sm text-slate-600">Salom, {telegramUser.first_name}.</p>
        ) : null}

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        ) : null}

        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3">
          <span className="text-sm font-medium text-slate-600">Raund vaqti</span>
          <Timer seconds={remainingSeconds} totalSeconds={ROUND_SECONDS} />
        </div>

        <QuestionCard question={question?.question ?? ""} isLoading={isLoading} />

        <AnswerForm
          answer={answer}
          disabled={!question || status !== "idle" || isLoading}
          isChecking={status === "checking"}
          onAnswerChange={setAnswer}
          onSubmit={handleSubmit}
        />

        {message ? (
          <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">{message}</div>
        ) : null}

        {status !== "idle" && status !== "checking" ? (
          <button
            className="h-11 rounded-lg bg-brand px-4 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={!initData || isLoading}
            type="button"
            onClick={loadQuestion}
          >
            Keyingi savol
          </button>
        ) : null}
      </section>
    </main>
  );
}
