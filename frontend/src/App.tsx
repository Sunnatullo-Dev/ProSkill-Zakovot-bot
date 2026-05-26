import { useCallback, useEffect, useRef, useState } from "react";
import {
  getAnswerTicket,
  getRound,
  getTopUsers,
  login,
  reportQuestion,
  revealAnswer,
  saveGameResult,
  submitAnswer,
  updateMyLanguage
} from "./api/client";
import { isCleanName } from "./utils/nameQuality";
import TeamScreen from "./components/TeamScreen";
import AdminPanel from "./components/AdminPanel";
import BattlePage from "./components/BattlePage";
import NameEntryScreen from "./components/NameEntryScreen";
import BottomNav from "./components/BottomNav";
import ConfirmDialog from "./components/ConfirmDialog";
import FinishScreen from "./components/FinishScreen";
import HomeScreen from "./components/HomeScreen";
import LeaderboardScreen from "./components/LeaderboardScreen";
import OnboardingScreen from "./components/OnboardingScreen";
import ProfileScreen from "./components/ProfileScreen";
import QuestionCard from "./components/QuestionCard";
import ResultScreen from "./components/ResultScreen";
import { useLanguage } from "./i18n/LanguageContext";
import { SUPPORTED_LANGS } from "./i18n/strings";
import type { Lang } from "./i18n/strings";
import { useTelegram } from "./hooks/useTelegram";
import { useTimer } from "./hooks/useTimer";
import { hapticResult, hapticSelect, hapticTap } from "./utils/haptics";
import type {
  AnswerResult,
  AppUser,
  LeaderboardUser,
  NavTab,
  Question,
  RevealInfo,
  RoundFilter,
  Screen,
  TelegramUser
} from "./types";

const NAME_STORAGE_KEY = "zakovat:playerName";
const ONBOARDING_STORAGE_KEY = "zakovat:onboardingDone";

function readOnboardingDone(): boolean {
  try {
    if (window.localStorage.getItem(ONBOARDING_STORAGE_KEY) === "1") {
      return true;
    }
    // Eski foydalanuvchilar (onboarding feature'dan oldin ishlatganlar)
    // uchun: agar `zakovat:playerName` saqlangan bo'lsa, demak ular
    // allaqachon onboarding'ni o'tgan deb hisoblaymiz. Bu birinchi safar
    // kelganda flag'ni ham yozib qo'yamiz.
    if (window.localStorage.getItem(NAME_STORAGE_KEY)) {
      window.localStorage.setItem(ONBOARDING_STORAGE_KEY, "1");
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function writeOnboardingDone(): void {
  try {
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
}

function pickDisplayName(user: AppUser | null, tgUser: TelegramUser | null): string {
  if (user?.displayName?.trim()) return user.displayName.trim();
  const tgFull = [tgUser?.first_name, tgUser?.last_name].filter(Boolean).join(" ").trim();
  if (tgFull) return tgFull;
  const dbFull = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();
  if (dbFull) return dbFull;
  if (user?.username?.trim()) return user.username.trim();
  return "";
}

function readCachedName(): string {
  try {
    return window.localStorage.getItem(NAME_STORAGE_KEY)?.trim() ?? "";
  } catch {
    return "";
  }
}

function writeCachedName(name: string): void {
  try {
    window.localStorage.setItem(NAME_STORAGE_KEY, name);
  } catch {
    // localStorage o'chirilgan — jim qoldiramiz
  }
}

// Admin alohida to'liq oyna sifatida ochiladi — foydalanuvchi navigatsiyasiga aralashmaydi.
const NAV_SCREENS: Screen[] = ["home", "finish", "team", "profile", "leaderboard"];

const TIMER_SECONDS = 15;
const ANSWER_TIMEOUT_MS = 15000;
const RESULT_AUTO_DELAY_MS = 3000;
const PARTIAL_RESULT_AUTO_DELAY_MS = 3500;
const DEFAULT_FILTER: RoundFilter = { category: null, difficulty: null };
// Auth ishlamay qolganda zaxira foydalanuvchi — ism bo'sh, frontend Telegram'dan
// keladigan ismni ishlatadi (yoki "Foydalanuvchi" placeholder ko'rsatadi).
const DEFAULT_APP_USER: AppUser = {
  id: "0",
  telegramId: 0,
  firstName: null,
  lastName: null,
  username: null,
  displayName: null,
  score: 0
};

type SubmitAnswerFn = (userAnswer: string, timeTaken: number) => Promise<void>;

// Browserda /admin yo'li orqali admin panelini ochish (Telegramsiz sinash uchun).
const isAdminRoute = window.location.pathname.replace(/\/+$/, "").endsWith("/admin");

export default function App() {
  const { initData, isReady, startParam, user: telegramUser, initDataMissing } = useTelegram();
  const { lang, setLang, t } = useLanguage();
  const [onboardingDone, setOnboardingDone] = useState<boolean>(() => readOnboardingDone());
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
  const [autoJoinCode, setAutoJoinCode] = useState("");
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  // Foydalanuvchi haqiqiy Telegram'da, lekin backend uni mehmon deb qabul
  // qilyapti — bu HMAC nomos kelishi yoki NODE_ENV != production belgisi.
  // Bunday holatda app'ga davom etmaymiz, aniq xato ekran ko'rsatamiz.
  const [authBroken, setAuthBroken] = useState(false);
  // Backend tasdiqlagan admin holati — ADMIN_TELEGRAM_IDS env'iga
  // qo'shilgan foydalanuvchilar uchun BottomNav'da Admin tugmasi chiqadi.
  const [isAdminUser, setIsAdminUser] = useState(false);
  // Bootstrap fakat bir martagina ishlasin — `lang` o'zgarganda qayta
  // login qilib foydalanuvchini Profile'dan Home'ga otib yubormasin.
  const bootstrapDoneRef = useRef(false);
  const submitAnswerRef = useRef<SubmitAnswerFn | null>(null);
  // Stale ticket fetch'lardan himoya — har savolning o'z ticket fetch
  // belgisi bor; eski fetch keyin kelsa, biz uni e'tibordan chiqaramiz.
  const ticketRequestKeyRef = useRef<string | null>(null);
  const handleTimerExpire = useCallback(() => {
    void submitAnswerRef.current?.("", ANSWER_TIMEOUT_MS + 1);
  }, []);
  const timer = useTimer(TIMER_SECONDS, handleTimerExpire);
  const { reset, start, stop, timeLeft } = timer;

  const currentQuestion = roundQuestions[questionIndex] ?? null;
  const totalQuestions = roundQuestions.length;

  const fetchTicketFor = useCallback((questionId: string) => {
    // Har bir fetch'ga noyob belgi qo'yamiz. Faqat aktual belgi qaytgan
    // ticket'ni qabul qilamiz — boshqalarni tashlab yuboramiz.
    const key = `${questionId}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
    ticketRequestKeyRef.current = key;
    void getAnswerTicket(questionId).then((ticket) => {
      if (ticketRequestKeyRef.current === key) {
        setCurrentTicket(ticket);
      }
    });
  }, []);

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
        const message =
          error instanceof Error && error.message
            ? `Javobni yuborib bo'lmadi: ${error.message}`
            : "Javobni yuborib bo'lmadi. Qayta urinib ko'ring.";
        setErrorMessage(message);
        // Taymerni qaytadan boshlamaymiz — foydalanuvchi xatoni o'qib,
        // tugmani qayta bossin. Aks holda timer tugashi bilan bo'sh javob
        // ketib, infinite loop'ga tushib qolish xavfi bor.
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
      fetchTicketFor(nextQuestion.id);
    }
  }, [correctAnswers, fetchTicketFor, loadTopUsers, questionIndex, reset, roundQuestions, roundScore, start]);

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

    // Telegram ichida bo'lib initData topib bo'lmagan bo'lsa — login chaqirmaymiz,
    // chunki "guest" yuborilsa backend bizni mehmon deb belgilab qo'yadi.
    if (initDataMissing) {
      return;
    }

    // Onboarding tugamagan bo'lsa, login'ni keyinroqqa qoldiramiz —
    // foydalanuvchi avval til tanlasin va xush kelibsiz ekranni ko'rsin.
    // Onboarding tugagandan keyin shu effect qayta ishga tushadi.
    if (!onboardingDone) {
      return;
    }

    // BIR MARTAGINA: bootstrap qaytarilmasin. Aks holda til o'zgarganda
    // (lang dep array'da bo'lmasa-da, hozir ham xotira oldidan boshqa
    // joydan triggerlanish ehtimoli bor) qayta login bo'lib screen'ni
    // bosh sahifaga qaytaradi.
    if (bootstrapDoneRef.current) {
      return;
    }
    bootstrapDoneRef.current = true;

    async function bootstrap() {
      try {
        setScreen("loading");
        setErrorMessage("");
        const effectiveInitData = initData || "guest";
        // join_CODE — jamoaga taklif havolasi
        const joinMatch = /^join_([A-Z0-9]{4,8})$/i.exec(startParam);
        const joinCode = joinMatch ? joinMatch[1].toUpperCase() : "";
        const referrerId = !joinCode && /^\d+$/.test(startParam) ? Number(startParam) : undefined;

        // Login natijasini to'liq kutamiz — sekin tarmoqda foydalanuvchi
        // "mehmon" sifatida tezda kirib qolib, keyin haqiqiy javob keldikida
        // o'zgarmay qolmasligi uchun. Loading state shu vaqt davomida ko'rinadi.
        const response = await login(effectiveInitData, referrerId);

        // Auth desync aniqlash: Telegram SDK haqiqiy user.id berdi, lekin
        // backend bizni mehmon (telegramId=0) deb hisobladi. Bu — backend
        // HMAC tekshirishida xato yoki Render'da NODE_ENV != production
        // belgisi. App'ga davom etmaymiz, foydalanuvchi noaniq "Telegram
        // orqali kiring" xatosini takror-takror olmasin.
        const tgRealId = telegramUser?.id ?? 0;
        if (tgRealId > 0 && response.user.telegramId === 0) {
          console.warn(
            "Auth desync: Telegram SDK id=%d, backend telegramId=0. " +
              "Backend HMAC failed yoki NODE_ENV != production.",
            tgRealId
          );
          setAuthBroken(true);
          return;
        }
        setAuthBroken(false);
        setIsAdminUser(Boolean(response.isAdmin));

        setUser(response.user);
        setScore(response.user.score);

        // Til sinxronlash: client (localStorage) va server (DB) o'rtasidagi
        // farq bo'lganda:
        //   - client default `uz-latn`, server boshqacha → server'dan pull
        //     (boshqa qurilmada o'zgartirgan bo'lishi mumkin)
        //   - client default'dan boshqa → client'dan server'ga push
        //     (foydalanuvchi onboarding'da tanlagan, lekin login'gacha
        //     saqlanmagan edi — endi push qilamiz)
        if (
          onboardingDone &&
          response.user.language &&
          (SUPPORTED_LANGS as string[]).includes(response.user.language) &&
          response.user.language !== lang
        ) {
          if (lang === "uz-latn") {
            // Client default'da, server bilan sinxronlanmagan — pull
            setLang(response.user.language as Lang);
          } else {
            // Client foydalanuvchi tanlagan til'da, server hali o'zgarmagan — push
            void updateMyLanguage(lang).catch(() => {
              /* offline yoki auth singan — localStorage ishonchli */
            });
          }
        }

        await loadTopUsers();

        if (isAdminRoute) {
          setScreen("admin");
          return;
        }

        // Ism so'rash ekranini faqat zaruriy hollarda ko'rsatamiz.
        //
        // `tgRealId` allaqachon yuqorida hisoblangan (auth desync check uchun) —
        // qayta foydalanamiz.
        const isRealTelegram = tgRealId > 0;
        const tgFull = [telegramUser?.first_name, telegramUser?.last_name]
          .filter(Boolean)
          .join(" ")
          .trim();
        const cachedName = readCachedName();

        // displayName backend'dan kelgan — faqat shu Telegram user'iniki bo'lsa
        // ishonamiz. Aks holda u "umumiy mehmon" qatoridan kelgan bo'lishi mumkin.
        const ownDisplayName =
          response.user.telegramId === tgRealId
            ? response.user.displayName?.trim() ?? ""
            : "";

        let needsName = false;

        if (isRealTelegram) {
          if (ownDisplayName) {
            needsName = false; // o'zi qo'ygan ism
          } else if (isCleanName(tgFull)) {
            needsName = false; // Telegram'dagi ism toza — shuni ishlatamiz
          } else if (cachedName) {
            needsName = false; // localStorage'dagi
          } else {
            needsName = true;
          }
        } else {
          // Brauzer/dev rejim — Telegram tashqarisida
          needsName = !cachedName;
        }

        if (joinCode) {
          setAutoJoinCode(joinCode);
          setScreen("team");
        } else {
          setScreen(needsName ? "name" : "home");
        }
      } catch (error) {
        console.error("Login failed", error);
        // Bootstrap fail bo'ldi — keyingi safar (foydalanuvchi qaytadan
        // urinishi bilan) qayta urinish imkonini qoldiramiz.
        bootstrapDoneRef.current = false;
        setUser(DEFAULT_APP_USER);
        setScore(DEFAULT_APP_USER.score);
        setScreen(isAdminRoute ? "admin" : "home");
      }
    }

    void bootstrap();
    // Dep array minimal — bootstrap faqat to'liq tayyor bo'lganda ishlasin.
    // `lang` va `setLang` bo'lmaydi: aks holda til o'zgarganda foydalanuvchi
    // Profile'dan Home'ga otib yuboriladi.
  }, [initData, initDataMissing, isReady, loadTopUsers, onboardingDone, startParam, telegramUser]);

  // BackButton handler'ini stable saqlaymiz — useCallback bilan kafolatlanmasa,
  // har screen o'zgarishda yangi closure yaratilib, Telegram SDK'da off/on
  // takror chaqirilganda handler'lar stack'lashishi mumkin.
  const handleBack = useCallback(() => {
    setErrorMessage("");
    setScreen("home");
  }, []);

  useEffect(() => {
    const backButton = window.Telegram?.WebApp?.BackButton;
    if (!backButton) return;

    const showOn: Screen[] = ["team", "profile", "admin", "finish", "leaderboard"];
    if (showOn.includes(screen)) {
      backButton.onClick(handleBack);
      backButton.show();
      return () => {
        backButton.offClick(handleBack);
      };
    }
    backButton.hide();
    return undefined;
  }, [handleBack, screen]);

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
        fetchTicketFor(questions[0].id);
      } catch (error) {
        console.error("Start game failed", error);
        setScreen("home");
      } finally {
        setIsStarting(false);
      }
    },
    [fetchTicketFor, reset, start]
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

  // Ism ustuvorligi: profilda o'zi qo'ygan ism → Telegram first_name + last_name →
  // DB'dagi ism+familiya → username → "Foydalanuvchi" (hech qaysisi bo'lmaganda).
  // "Zakovatchi" hardcoded ism endi ishlatilmaydi.
  // Ism aniqlash mantig'i:
  // - Haqiqiy Telegram foydalanuvchi (SDK'dan): backend displayName faqat shu user'iniki
  //   bo'lsa ishlatiladi (umumiy mehmon qatoridagi "Sunnatulla" kelmasligi uchun).
  //   So'ng Telegram'dagi first_name+last_name, undan keyin localStorage.
  // - Brauzer: localStorage > Telegram (agar bor bo'lsa) > "Foydalanuvchi".
  const playerName = (() => {
    const tgRealId = telegramUser?.id ?? 0;
    const tgFull = [telegramUser?.first_name, telegramUser?.last_name]
      .filter(Boolean)
      .join(" ")
      .trim();
    const cached = readCachedName();

    if (tgRealId > 0) {
      // SDK orqali haqiqiy Telegram user
      if (user?.telegramId === tgRealId && user.displayName?.trim()) {
        return user.displayName.trim();
      }
      if (tgFull) return tgFull;
      if (cached) return cached;
      return "Foydalanuvchi";
    }

    // Brauzer rejim
    if (cached) return cached;
    if (tgFull) return tgFull;
    return "Foydalanuvchi";
  })();
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

  // Telegram ichida ochilgan, lekin initData topib bo'lmadi — auth ishlamaydi.
  // Foydalanuvchini "guest" sifatida o'tkazib yuborish o'rniga aniq xato ko'rsatamiz.
  // Onboarding birinchi kirgan foydalanuvchiga ko'rsatiladi: til tanlash + tutorial.
  // initDataMissing ekrani onboarding'dan keyin ko'rinmasligi uchun bunday tartib.
  if (isReady && !initDataMissing && !onboardingDone) {
    return (
      <OnboardingScreen
        onDone={(chosen) => {
          writeOnboardingDone();
          setOnboardingDone(true);
          // Tanlangan tilni backend bilan sinxron qilamiz (fire-and-forget;
          // mehmon bo'lsa backend 200 OK qaytaradi-yu DB'ga yozmaydi).
          void updateMyLanguage(chosen).catch(() => {
            /* offline yoki auth muammosi — localStorage'ga ishonamiz */
          });
        }}
      />
    );
  }

  if (isReady && initDataMissing) {
    return (
      <main className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
        <section className="mx-auto grid min-h-screen w-full max-w-[430px] place-items-center px-6 text-center">
          <div className="space-y-5">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-[var(--card)] text-4xl">
              {"⚠️"}
            </div>
            <h1 className="text-xl font-black">{t("telegram_required_title")}</h1>
            <p className="text-sm font-semibold text-[var(--muted)]">
              {t("telegram_required_text")}
            </p>
            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="w-full rounded-2xl bg-[var(--accent)] px-6 py-3 text-sm font-black text-[var(--bg)]"
              >
                {t("retry")}
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    window.Telegram?.WebApp?.close?.();
                  } catch {
                    /* ignore */
                  }
                }}
                className="w-full rounded-2xl border border-[var(--card-border)] px-6 py-3 text-sm font-black text-[var(--text)]"
              >
                {t("close")}
              </button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  // Backend HMAC tekshiruvi muvaffaqiyatsiz / NODE_ENV != production —
  // Telegram SDK haqiqiy user.id berdi-yu, backend bizni mehmon deb hisobladi.
  // Bu holatda app'ga davom etishning hech qanday foydasi yo'q — har bir
  // yozish amali 403 olib keladi. Aniq diagnostic ko'rsatamiz.
  if (isReady && authBroken) {
    const tgId = telegramUser?.id ?? 0;
    return (
      <main className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
        <section className="mx-auto grid min-h-screen w-full max-w-[430px] place-items-center px-6 text-center">
          <div className="w-full space-y-5">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-[var(--card)] text-4xl">
              {"🔌"}
            </div>
            <h1 className="text-xl font-black">Server bilan auth muvaffaqiyatsiz</h1>
            <p className="text-sm font-semibold text-[var(--muted)]">
              Telegram sizni aniqladi (ID: {tgId}), lekin server tasdiqlay olmadi.
              Bu Render serveridagi sozlama xatosi — quyidagilarni tekshiring:
            </p>
            <div
              className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 text-left text-xs font-mono"
              style={{ lineHeight: 1.6, color: "var(--muted)" }}
            >
              <div style={{ color: "var(--text)", fontWeight: 800, marginBottom: "6px" }}>
                Render env:
              </div>
              <div>NODE_ENV=production</div>
              <div>TELEGRAM_BOT_TOKEN=&lt;bot bilan bir xil&gt;</div>
              <div>TICKET_HMAC_SECRET=&lt;random 48 byte&gt;</div>
              <div>BOT_INTERNAL_API_KEY=&lt;random 48 byte&gt;</div>
              <div>DJANGO_ALLOWED_HOSTS=&lt;domain&gt;</div>
            </div>
            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="w-full rounded-2xl bg-[var(--accent)] px-6 py-3 text-sm font-black text-[var(--bg)]"
              >
                {t("retry")}
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    window.Telegram?.WebApp?.close?.();
                  } catch {
                    /* ignore */
                  }
                }}
                className="w-full rounded-2xl border border-[var(--card-border)] px-6 py-3 text-sm font-black text-[var(--text)]"
              >
                {t("close")}
              </button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <section className="mx-auto min-h-screen w-full max-w-[430px]">
        {screen === "loading" ? (
          <div className="grid min-h-screen place-items-center text-center">
            <div>
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-[var(--card)] text-3xl">
                {"\u{1F9E0}"}
              </span>
              <p className="mt-4 text-lg font-black text-[var(--text)]">{t("app_name")}</p>
              <p className="mt-2 text-sm font-semibold text-[var(--muted)]">{t("loading_dots")}</p>
            </div>
          </div>
        ) : null}

        {screen === "name" ? (
          <NameEntryScreen
            initialName={(() => {
              // Faqat Telegram'dan kelgan toza ismni prefill qilamiz.
              // Backend'dagi displayName boshqa user'niki bo'lishi mumkin —
              // uni avtomatik kiritmaymiz, foydalanuvchi o'zi yozsin.
              const tgFull = [telegramUser?.first_name, telegramUser?.last_name]
                .filter(Boolean)
                .join(" ")
                .trim();
              if (isCleanName(tgFull)) return tgFull;
              return "";
            })()}
            isGuest={(telegramUser?.id ?? 0) <= 0}
            onDone={(updated, enteredName) => {
              writeCachedName(enteredName);
              if (updated) {
                setUser(updated);
              } else if (user) {
                setUser({ ...user, displayName: enteredName });
              }
              setScreen("home");
            }}
          />
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
              text: currentQuestion?.text ?? "Savol yuklanmoqda...",
              options: currentQuestion?.options ?? []
            }}
            questionNumber={questionIndex + 1}
            streak={streak}
            timeLeft={timeLeft}
            totalQuestions={totalQuestions}
            reveal={revealInfo}
            isRevealing={isRevealing}
            isSubmitting={isSubmitting}
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
            autoJoinCode={autoJoinCode}
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
            isAdmin={isAdminRoute || isAdminUser}
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

        {screen === "admin" && (isAdminRoute || isAdminUser) ? (
          <AdminPanel onExitToUser={() => setScreen("home")} />
        ) : null}

        {showBottomNav ? (
          <BottomNav
            active={navActive}
            showAdmin={isAdminRoute || isAdminUser}
            onNavigate={handleNavigate}
          />
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

