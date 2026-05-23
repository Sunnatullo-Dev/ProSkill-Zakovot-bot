import { useCallback, useEffect, useRef, useState } from "react";
import {
  getAnswerTicket,
  getRound,
  getTopUsers,
  login,
  reportQuestion,
  revealAnswer,
  saveGameResult,
  submitAnswer
} from "./api/client";
import TeamScreen from "./components/TeamScreen";
import AdminPanel from "./components/AdminPanel";
import BattlePage from "./components/BattlePage";
import BottomNav from "./components/BottomNav";
import ConfirmDialog from "./components/ConfirmDialog";
import FinishScreen from "./components/FinishScreen";
import HomeScreen from "./components/HomeScreen";
import LeaderboardScreen from "./components/LeaderboardScreen";
import ProfileScreen from "./components/ProfileScreen";
import QuestionCard from "./components/QuestionCard";
import ResultScreen from "./components/ResultScreen";
import { useTelegram } from "./hooks/useTelegram";
import { useTimer } from "./hooks/useTimer";
import { hapticResult, hapticSelect, hapticTap } from "./utils/haptics";
import type {
  AnswerResult,
  AppUser,
  AuthResponse,
  LeaderboardUser,
  NavTab,
  Question,
  RevealInfo,
  RoundFilter,
  Screen
} from "./types";

// Admin alohida to'liq oyna sifatida ochiladi — foydalanuvchi navigatsiyasiga aralashmaydi.
const NAV_SCREENS: Screen[] = ["home", "finish", "team", "profile", "leaderboard"];

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
  displayName: null,
  score: 0
};

type SubmitAnswerFn = (userAnswer: string, timeTaken: number) => Promise<void>;

// Browserda /admin yo'li orqali admin panelini ochish (Telegramsiz sinash uchun).
const isAdminRoute = window.location.pathname.replace(/\/+$/, "").endsWith("/admin");

export default function App() {
  const { initData, isReady, startParam, user: telegramUser } = useTelegram();
  const [screen, setScreen] = useState<Screen>("loading");
  const [user, setUser] = useState<AppUser | null>(null);
  const [score, setScore] = useState(0);
  const [roundQuestions, setRoundQuestions] = useState<Question[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [lastResult, setLastResult] = useState<AnswerResult | null>(null);
  const [lastUserAnswer, setLastUserAnswer] = useState("");
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [streak, setStreak] = useState(0);
  const [roundScore, setRoundScore] = useState(0);
  const [lastFilter, setLastFilter] = useState<RoundFilter>(DEFAULT_FILTER);
  const [currentTicket, setCurrentTicket] = useState<string | null>(null);
  const [revealInfo, setRevealInfo] = useState<RevealInfo | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  const [activeBattleId, setActiveBattleId] = useState<string | null>(null);
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

        hapticResult(result.status);

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
    hapticTap();
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
    setRevealInfo(null);
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
        const referrerId = /^\d+$/.test(startParam) ? Number(startParam) : undefined;

        const response = await withTimeout(login(effectiveInitData, referrerId), {
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
        await loadTopUsers();
        setScreen(isAdminRoute ? "admin" : "home");
      } catch (error) {
        console.error("Login failed", error);
        setUser(DEFAULT_APP_USER);
        setScore(DEFAULT_APP_USER.score);
        setScreen(isAdminRoute ? "admin" : "home");
      }
    }

    void bootstrap();
  }, [initData, isReady, loadTopUsers, startParam, telegramUser]);

  useEffect(() => {
    const backButton = window.Telegram?.WebApp?.BackButton;

    if (!backButton) {
      return;
    }

    const handleBack = () => {
      setErrorMessage("");
      setScreen("home");
    };

    if (
      screen === "team" ||
      screen === "profile" ||
      screen === "admin" ||
      screen === "finish" ||
      screen === "leaderboard"
    ) {
      backButton.onClick(handleBack);
      backButton.show();
    } else {
      backButton.hide();
    }

    return () => {
      backButton.offClick(handleBack);
    };
  }, [screen]);

  const startGame = useCallback(
    async (filter: RoundFilter) => {
      hapticTap();
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
        setRevealInfo(null);
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
    hapticSelect();
    setErrorMessage("");
    setScreen(tab);
  }

  function handleReportQuestion() {
    const question = roundQuestions[questionIndex];

    if (question) {
      void reportQuestion(question.id);
    }
  }

  async function handleGiveUp() {
    const question = roundQuestions[questionIndex];

    if (!question || isRevealing || revealInfo) {
      return;
    }

    hapticTap();
    stop();
    setIsRevealing(true);

    try {
      const info = await revealAnswer(question, currentTicket);
      setRevealInfo(info);
    } catch (error) {
      console.error("Reveal failed", error);
      setRevealInfo({ correctAnswer: "", explanation: "" });
    } finally {
      setIsRevealing(false);
    }
  }

  function handleContinue() {
    setStreak(0);
    handleNextQuestion();
  }

  function handleRequestExit() {
    stop();
    setExitConfirmOpen(true);
  }

  function handleConfirmExit() {
    hapticTap();
    setExitConfirmOpen(false);
    setRevealInfo(null);
    setCurrentTicket(null);
    reset();
    setScreen("home");
  }

  function handleCancelExit() {
    setExitConfirmOpen(false);

    if (screen === "question" && !revealInfo && !isRevealing) {
      start();
    }
  }

  function handleEnterBattle(battleId: string) {
    setActiveBattleId(battleId);
    setScreen("battle");
  }

  function handleExitBattle() {
    setActiveBattleId(null);
    setScreen("team");
  }

  // displayName foydalanuvchi tomonidan profilda o'rnatilgan — eng yuqori ustuvorlik.
  const telegramFullName = [telegramUser?.first_name, telegramUser?.last_name].filter(Boolean).join(" ");
  const dbFullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ");
  const playerName =
    user?.displayName ||
    telegramFullName ||
    dbFullName ||
    user?.username ||
    "Zakovatchi";
  const recordScore = Math.max(score, leaderboard[0]?.score ?? 0);
  const showBottomNav = NAV_SCREENS.includes(screen);
  const navActive: NavTab =
    screen === "team"
      ? "team"
      : screen === "profile"
        ? "profile"
        : screen === "admin"
          ? "admin"
          : screen === "leaderboard"
            ? "leaderboard"
            : "home";

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
            reveal={revealInfo}
            isRevealing={isRevealing}
            onSubmit={handleQuestionSubmit}
            onGiveUp={handleGiveUp}
            onContinue={handleContinue}
            onExit={handleRequestExit}
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

        {screen === "leaderboard" ? (
          <LeaderboardScreen
            currentUserId={user?.telegramId ?? 0}
            playerName={playerName}
            score={score}
          />
        ) : null}

        {screen === "team" ? (
          <TeamScreen
            currentUserId={user?.telegramId ?? 0}
            onEnterBattle={handleEnterBattle}
          />
        ) : null}

        {screen === "battle" && activeBattleId ? (
          <BattlePage
            battleId={activeBattleId}
            currentUserId={user?.telegramId ?? 0}
            onExit={handleExitBattle}
          />
        ) : null}

        {screen === "profile" ? (
          <ProfileScreen
            isAdmin={isAdminRoute}
            playerName={playerName}
            record={recordScore}
            score={score}
            user={user}
            onScoreBonus={(amount) => {
              setScore((value) => value + amount);
            }}
            onUserUpdate={(updated) => {
              setUser(updated);
              setScore(updated.score);
            }}
          />
        ) : null}

        {screen === "admin" && isAdminRoute ? (
          <AdminPanel onExitToUser={() => setScreen("home")} />
        ) : null}

        {showBottomNav ? (
          <BottomNav active={navActive} showAdmin={isAdminRoute} onNavigate={handleNavigate} />
        ) : null}

        {exitConfirmOpen ? (
          <ConfirmDialog
            title="O'yindan chiqish"
            message="Joriy raund saqlanmaydi. Rostdan chiqasizmi?"
            confirmLabel="Ha, chiqish"
            cancelLabel="Yo'q"
            onConfirm={handleConfirmExit}
            onCancel={handleCancelExit}
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
