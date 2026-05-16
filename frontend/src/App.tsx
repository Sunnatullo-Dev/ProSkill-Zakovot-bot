import { useCallback, useEffect, useRef, useState } from "react";
import {
  getAnswerTicket,
  getCategories,
  getRound,
  getTopUsers,
  login,
  reportQuestion,
  saveGameResult,
  submitAnswer
} from "./api/client";
import AddQuestionScreen from "./components/AddQuestionScreen";
import AdminScreen from "./components/AdminScreen";
import BottomNav from "./components/BottomNav";
import FinishScreen from "./components/FinishScreen";
import HomeScreen from "./components/HomeScreen";
import ProfileScreen from "./components/ProfileScreen";
import QuestionCard from "./components/QuestionCard";
import ResultScreen from "./components/ResultScreen";
import { useTelegram } from "./hooks/useTelegram";
import { useTimer } from "./hooks/useTimer";
import type {
  AnswerResult,
  AppUser,
  AuthResponse,
  LeaderboardUser,
  NavTab,
  Question,
  RoundFilter,
  Screen
} from "./types";

const NAV_SCREENS: Screen[] = ["home", "finish", "add", "profile", "admin"];

const TIMER_SECONDS = 15;
const ANSWER_TIMEOUT_MS = 15000;
const BOOTSTRAP_TIMEOUT_MS = 1000;
const RESULT_AUTO_DELAY_MS = 3000;
const PARTIAL_RESULT_AUTO_DELAY_MS = 3500;
const DEFAULT_FILTER: RoundFilter = { category: null, difficulty: null };
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);
  const [score, setScore] = useState(0);
  const [categories, setCategories] = useState<string[]>([]);
  const [roundQuestions, setRoundQuestions] = useState<Question[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [lastResult, setLastResult] = useState<AnswerResult | null>(null);
  const [lastUserAnswer, setLastUserAnswer] = useState("");
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [streak, setStreak] = useState(0);
  const [roundScore, setRoundScore] = useState(0);
  const [lastFilter, setLastFilter] = useState<RoundFilter>(DEFAULT_FILTER);
  const [currentTicket, setCurrentTicket] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const submitAnswerRef = useRef<SubmitAnswerFn | null>(null);
  const handleTimerExpire = useCallback(() => {
    void submitAnswerRef.current?.("", ANSWER_TIMEOUT_MS + 1);
  }, []);
  const timer = useTimer(TIMER_SECONDS, handleTimerExpire);
  const { reset, start, stop, timeLeft } = timer;

  const currentQuestion = roundQuestions[questionIndex] ?? null;
  const totalQuestions = roundQuestions.length;

  const loadTopUsers = useCallback(async () => {
    try {
      const users = await getTopUsers(3);
      setLeaderboard(users);
    } catch (error) {
      console.error("Top users load failed", error);
      setLeaderboard([]);
    }
  }, []);

  const handleSubmitAnswer = useCallback<SubmitAnswerFn>(
    async (userAnswer: string, timeTaken: number) => {
      const question = roundQuestions[questionIndex];

      if (!question || isSubmitting) {
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
        const result = await submitAnswer(question, submittedAnswer, timeTaken, streak, currentTicket);

        if (result.status === "correct") {
          setCorrectAnswers((value) => value + 1);
        }

        setStreak(result.streak);
        setRoundScore((value) => value + result.pointsEarned);
        setScore((value) => value + result.pointsEarned);
        setUser((currentUser) =>
          currentUser ? { ...currentUser, score: currentUser.score + result.pointsEarned } : currentUser
        );
        setLastUserAnswer(submittedAnswer);
        setLastResult(result);
        setScreen("result");
      } catch (error) {
        console.error("Answer submit failed", error);
        start();
      } finally {
        setIsSubmitting(false);
      }
    },
    [currentTicket, isSubmitting, questionIndex, roundQuestions, start, stop, streak]
  );

  useEffect(() => {
    submitAnswerRef.current = handleSubmitAnswer;
  }, [handleSubmitAnswer]);

  const handleNextQuestion = useCallback(() => {
    const nextIndex = questionIndex + 1;

    if (nextIndex >= roundQuestions.length) {
      reset();
      setScreen("finish");
      void saveGameResult({
        correctCount: correctAnswers,
        totalCount: roundQuestions.length,
        roundScore
      });
      void loadTopUsers();
      return;
    }

    setLastResult(null);
    setLastUserAnswer("");
    setQuestionIndex(nextIndex);
    setCurrentTicket(null);
    setScreen("question");
    reset();
    start();

    const nextQuestion = roundQuestions[nextIndex];

    if (nextQuestion) {
      void getAnswerTicket(nextQuestion.id).then(setCurrentTicket);
    }
  }, [correctAnswers, loadTopUsers, questionIndex, reset, roundQuestions, roundScore, start]);

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
          isAdmin: false,
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
        setIsAdmin(response.isAdmin);
        await loadTopUsers();
        setCategories(await getCategories());
        setScreen("home");
      } catch (error) {
        console.error("Login failed", error);
        setUser(DEFAULT_APP_USER);
        setScore(DEFAULT_APP_USER.score);
        setIsAdmin(false);
        setScreen("home");
      }
    }

    void bootstrap();
  }, [initData, isReady, loadTopUsers, telegramUser]);

  const startGame = useCallback(
    async (filter: RoundFilter) => {
      setIsStarting(true);
      setErrorMessage("");

      try {
        const questions = await getRound(filter);

        if (questions.length === 0) {
          setErrorMessage("Bu mavzu bo'yicha savol topilmadi.");
          setScreen("home");
          return;
        }

        setRoundQuestions(questions);
        setQuestionIndex(0);
        setCorrectAnswers(0);
        setStreak(0);
        setRoundScore(0);
        setLastResult(null);
        setLastUserAnswer("");
        setLastFilter(filter);
        setCurrentTicket(null);
        setScreen("question");
        reset();
        start();
        void getAnswerTicket(questions[0].id).then(setCurrentTicket);
      } catch (error) {
        console.error("Start game failed", error);
        setScreen("home");
      } finally {
        setIsStarting(false);
      }
    },
    [reset, start]
  );

  async function handleQuestionSubmit(answer: string) {
    const timeTaken = (TIMER_SECONDS - timeLeft) * 1000;
    await handleSubmitAnswer(answer, timeTaken);
  }

  function handleNavigate(tab: NavTab) {
    setErrorMessage("");
    setScreen(tab);
  }

  function handleReportQuestion() {
    const question = roundQuestions[questionIndex];

    if (question) {
      void reportQuestion(question.id);
    }
  }

  const playerName = telegramUser?.first_name || user?.firstName || user?.username || "Zakovatchi";
  const recordScore = Math.max(score, leaderboard[0]?.score ?? 0);
  const showBottomNav = NAV_SCREENS.includes(screen);
  const navActive: NavTab =
    screen === "add" ? "add" : screen === "profile" ? "profile" : screen === "admin" ? "admin" : "home";

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <section className="mx-auto min-h-screen w-full max-w-[430px]">
        {screen === "loading" ? (
          <div className="grid min-h-screen place-items-center text-center">
            <div>
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-[var(--card)] text-3xl">
                {"\u{1F9E0}"}
              </span>
              <p className="mt-4 text-lg font-black text-[var(--text)]">Zakovat</p>
              <p className="mt-2 text-sm font-semibold text-[var(--muted)]">Yuklanmoqda...</p>
            </div>
          </div>
        ) : null}

        {screen === "home" ? (
          <HomeScreen
            categories={categories}
            error={errorMessage}
            isLoading={isStarting}
            playerName={playerName}
            record={recordScore}
            score={score}
            onStart={startGame}
          />
        ) : null}

        {screen === "question" ? (
          <QuestionCard
            question={{
              id: currentQuestion?.id ?? "loading",
              text: currentQuestion?.text ?? "Savol yuklanmoqda..."
            }}
            questionNumber={questionIndex + 1}
            streak={streak}
            timeLeft={timeLeft}
            totalQuestions={totalQuestions}
            onSubmit={handleQuestionSubmit}
          />
        ) : null}

        {screen === "result" && lastResult ? (
          <ResultScreen
            autoNextSeconds={lastResult.status === "partial" ? 3.5 : 3}
            canReport={Boolean(currentTicket)}
            result={lastResult}
            userAnswer={lastUserAnswer}
            onNext={handleNextQuestion}
            onReport={handleReportQuestion}
          />
        ) : null}

        {screen === "finish" ? (
          <FinishScreen
            correctCount={correctAnswers}
            roundPoints={roundScore}
            totalQuestions={totalQuestions}
            totalScore={score}
            onRestart={() => void startGame(lastFilter)}
          />
        ) : null}

        {screen === "add" ? <AddQuestionScreen /> : null}

        {screen === "profile" ? (
          <ProfileScreen
            isAdmin={isAdmin}
            playerName={playerName}
            record={recordScore}
            score={score}
            user={user}
          />
        ) : null}

        {screen === "admin" && isAdmin ? <AdminScreen /> : null}

        {showBottomNav ? (
          <BottomNav active={navActive} isAdmin={isAdmin} onNavigate={handleNavigate} />
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
