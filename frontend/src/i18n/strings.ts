/**
 * Zakovat mini-app uchun matn tarjimalari.
 *
 * Yangi kalit qo'shganda 3 ta tilga ham yozing — TypeScript bo'sh
 * qoldirilganini aniqlash uchun strict tip ishlatamiz.
 *
 * Til kodlari:
 *   - uz-latn: O'zbek (lotin yozuvi) — default
 *   - uz-cyrl: Ўзбек (кирилл ёзуви)
 *   - ru: Русский
 */

export type Lang = "uz-latn" | "uz-cyrl" | "ru";

export const SUPPORTED_LANGS: Lang[] = ["uz-latn", "uz-cyrl", "ru"];

export const LANG_LABELS: Record<Lang, string> = {
  "uz-latn": "O'zbek",
  "uz-cyrl": "Ўзбек",
  ru: "Русский"
};

export const LANG_FLAGS: Record<Lang, string> = {
  "uz-latn": "🇺🇿",
  "uz-cyrl": "🇺🇿",
  ru: "🇷🇺"
};

// Bayroqlardan keyin yoziladigan qisqa belgi (Uz-cyrl uchun "(Кр)").
export const LANG_SUBLABEL: Record<Lang, string> = {
  "uz-latn": "(Lat)",
  "uz-cyrl": "(Кр)",
  ru: ""
};

// Barcha string kalitlari shu yerda. Yangi kalit qo'shilganda
// 3 ta til uchun ham qiymat majburiy (Record<Lang, string>).
type Strings = {
  // Umumiy
  app_name: string;
  loading: string;
  loading_dots: string;
  retry: string;
  back: string;
  next: string;
  skip: string;
  done: string;
  cancel: string;
  confirm: string;
  save: string;
  close: string;
  error_generic: string;
  error_network: string;

  // Auth / kirish
  telegram_required_title: string;
  telegram_required_text: string;

  // Asosiy ekran (HomeScreen)
  home_start: string;
  home_start_quick: string;
  home_categories: string;
  home_difficulty: string;
  home_difficulty_easy: string;
  home_difficulty_medium: string;
  home_difficulty_hard: string;
  home_any_category: string;
  home_any_difficulty: string;

  // BottomNav
  nav_home: string;
  nav_team: string;
  nav_leaderboard: string;
  nav_profile: string;

  // Profil
  profile_title: string;
  profile_level: string;
  profile_score: string;
  profile_games: string;
  profile_accuracy: string;
  profile_best_streak: string;
  profile_achievements: string;
  profile_change_name: string;
  profile_language: string;
  profile_language_choose: string;

  // Leaderboard
  leaderboard_title: string;
  leaderboard_score: string;
  leaderboard_referrals: string;
  leaderboard_my_rank: string;
  leaderboard_empty: string;
  leaderboard_user_placeholder: string;

  // Jamoa (Team)
  team_title: string;
  team_no_team: string;
  team_create: string;
  team_join: string;
  team_my_team: string;
  team_owner_badge: string;
  team_members: string;
  team_leave: string;
  team_rename: string;
  team_make_owner: string;
  team_code: string;
  team_copy_code: string;
  team_create_modal_title: string;
  team_create_name_placeholder: string;
  team_join_modal_title: string;
  team_join_code_placeholder: string;

  // O'yin (Question/Battle)
  question_placeholder: string;
  question_submit: string;
  question_submitting: string;
  question_giveup: string;
  question_report: string;
  result_correct: string;
  result_wrong: string;
  result_partial: string;
  result_correct_answer: string;
  result_points_earned: string;
  finish_title: string;
  finish_score: string;
  finish_correct: string;
  finish_again: string;
  finish_home: string;

  // Ism so'rash (NameEntryScreen)
  name_title: string;
  name_subtitle: string;
  name_placeholder: string;
  name_save: string;

  // Onboarding
  onboarding_step_lang_title: string;
  onboarding_step_lang_subtitle: string;
  onboarding_step_welcome_title: string;
  onboarding_step_welcome_text: string;
  onboarding_step_play_title: string;
  onboarding_step_play_text: string;
  onboarding_step_progress: string; // "{n} / {total}"
  onboarding_get_started: string;
};

// uz-latn — asosiy ish tili
const uzLatn: Strings = {
  app_name: "Zakovat",
  loading: "Yuklanmoqda",
  loading_dots: "Yuklanmoqda...",
  retry: "Qayta urinish",
  back: "Orqaga",
  next: "Keyingi",
  skip: "O'tkazib yuborish",
  done: "Tayyor",
  cancel: "Bekor qilish",
  confirm: "Tasdiqlash",
  save: "Saqlash",
  close: "Yopish",
  error_generic: "Xato yuz berdi",
  error_network: "Tarmoq xatosi. Qayta urinib ko'ring.",

  telegram_required_title: "Telegram ulanmadi",
  telegram_required_text:
    "Mini-app ochildi, ammo Telegram identifikatsiya ma'lumotlarini uzata olmadi. Iltimos, mini-app oynasini yopib, botning menyu tugmasi orqali qayta oching.",

  home_start: "O'yinni boshlash",
  home_start_quick: "Tezkor o'yin",
  home_categories: "Mavzular",
  home_difficulty: "Qiyinlik",
  home_difficulty_easy: "Oson",
  home_difficulty_medium: "O'rta",
  home_difficulty_hard: "Qiyin",
  home_any_category: "Aralash",
  home_any_difficulty: "Aralash",

  nav_home: "Asosiy",
  nav_team: "Jamoa",
  nav_leaderboard: "Reyting",
  nav_profile: "Profil",

  profile_title: "Profil",
  profile_level: "Daraja",
  profile_score: "Ballar",
  profile_games: "O'yinlar",
  profile_accuracy: "Aniqlik",
  profile_best_streak: "Eng uzun streak",
  profile_achievements: "Yutuqlar",
  profile_change_name: "Ismni o'zgartirish",
  profile_language: "Til",
  profile_language_choose: "Tilni tanlang",

  leaderboard_title: "Reyting",
  leaderboard_score: "Ball",
  leaderboard_referrals: "Takliflar",
  leaderboard_my_rank: "Sizning o'rningiz",
  leaderboard_empty: "Hali hech kim yo'q",
  leaderboard_user_placeholder: "Foydalanuvchi",

  team_title: "Jamoa",
  team_no_team: "Hali jamoada emassiz",
  team_create: "Yangi jamoa",
  team_join: "Jamoaga qo'shilish",
  team_my_team: "Mening jamoam",
  team_owner_badge: "SARDOR",
  team_members: "A'zolar",
  team_leave: "Jamoadan chiqish",
  team_rename: "Nomni o'zgartirish",
  team_make_owner: "Sardor qil",
  team_code: "Kod",
  team_copy_code: "Kodni nusxalash",
  team_create_modal_title: "Yangi jamoa",
  team_create_name_placeholder: "Jamoa nomi",
  team_join_modal_title: "Jamoaga qo'shilish",
  team_join_code_placeholder: "Jamoa kodi",

  question_placeholder: "Javobingizni yozing...",
  question_submit: "Yuborish",
  question_submitting: "Yuborilmoqda...",
  question_giveup: "Javobni ko'rsatish",
  question_report: "Savol noto'g'ri",
  result_correct: "To'g'ri javob!",
  result_wrong: "Afsuski, noto'g'ri",
  result_partial: "Qisman to'g'ri",
  result_correct_answer: "To'g'ri javob",
  result_points_earned: "+{points} ball",
  finish_title: "O'yin tugadi",
  finish_score: "Sizning balingiz",
  finish_correct: "{correct} / {total} to'g'ri",
  finish_again: "Yana o'ynash",
  finish_home: "Asosiyga qaytish",

  name_title: "Ismingizni kiriting",
  name_subtitle: "Bu sizning rating jadvalida ko'rinadigan ismingiz",
  name_placeholder: "Ism",
  name_save: "Saqlash",

  onboarding_step_lang_title: "Tilni tanlang",
  onboarding_step_lang_subtitle: "Keyinroq sozlamalardan o'zgartira olasiz",
  onboarding_step_welcome_title: "Zakovat — bilim o'yini",
  onboarding_step_welcome_text:
    "Yagona va jamoa bo'lib o'ynang, do'stlaringizni chaqiring, bilimlaringizni sinab ko'ring. Har savol uchun cheklangan vaqt — tez va aniq javob bering!",
  onboarding_step_play_title: "Qanday o'ynaymiz?",
  onboarding_step_play_text:
    "Tezkor o'yinda 10 ta savol, har biriga 15 soniya. To'g'ri javob — ball; ketma-ket to'g'ri javoblar — bonus. Jamoa tuzing va 1v1 bellashuvlarga chiqing!",
  onboarding_step_progress: "{n} / {total}",
  onboarding_get_started: "Boshlash"
};

// uz-cyrl — кирилл
const uzCyrl: Strings = {
  app_name: "Заковат",
  loading: "Юкланмоқда",
  loading_dots: "Юкланмоқда...",
  retry: "Қайта уриниш",
  back: "Орқага",
  next: "Кейинги",
  skip: "Ўтказиб юбориш",
  done: "Тайёр",
  cancel: "Бекор қилиш",
  confirm: "Тасдиқлаш",
  save: "Сақлаш",
  close: "Ёпиш",
  error_generic: "Хато юз берди",
  error_network: "Тармоқ хатоси. Қайта уриниб кўринг.",

  telegram_required_title: "Telegram уланмади",
  telegram_required_text:
    "Mini-app очилди, аммо Telegram идентификация маълумотларини узата олмади. Илтимос, mini-app ойнасини ёпиб, ботнинг меню тугмаси орқали қайта очинг.",

  home_start: "Ўйинни бошлаш",
  home_start_quick: "Тезкор ўйин",
  home_categories: "Мавзулар",
  home_difficulty: "Қийинлик",
  home_difficulty_easy: "Осон",
  home_difficulty_medium: "Ўрта",
  home_difficulty_hard: "Қийин",
  home_any_category: "Аралаш",
  home_any_difficulty: "Аралаш",

  nav_home: "Асосий",
  nav_team: "Жамоа",
  nav_leaderboard: "Рейтинг",
  nav_profile: "Профил",

  profile_title: "Профил",
  profile_level: "Даража",
  profile_score: "Баллар",
  profile_games: "Ўйинлар",
  profile_accuracy: "Аниқлик",
  profile_best_streak: "Энг узун streak",
  profile_achievements: "Ютуқлар",
  profile_change_name: "Исмни ўзгартириш",
  profile_language: "Тил",
  profile_language_choose: "Тилни танланг",

  leaderboard_title: "Рейтинг",
  leaderboard_score: "Балл",
  leaderboard_referrals: "Таклифлар",
  leaderboard_my_rank: "Сизнинг ўрнингиз",
  leaderboard_empty: "Ҳали ҳеч ким йўқ",
  leaderboard_user_placeholder: "Фойдаланувчи",

  team_title: "Жамоа",
  team_no_team: "Ҳали жамоада эмассиз",
  team_create: "Янги жамоа",
  team_join: "Жамоага қўшилиш",
  team_my_team: "Менинг жамоам",
  team_owner_badge: "САРДОР",
  team_members: "Аъзолар",
  team_leave: "Жамоадан чиқиш",
  team_rename: "Номни ўзгартириш",
  team_make_owner: "Сардор қил",
  team_code: "Код",
  team_copy_code: "Кодни нусхалаш",
  team_create_modal_title: "Янги жамоа",
  team_create_name_placeholder: "Жамоа номи",
  team_join_modal_title: "Жамоага қўшилиш",
  team_join_code_placeholder: "Жамоа коди",

  question_placeholder: "Жавобингизни ёзинг...",
  question_submit: "Юбориш",
  question_submitting: "Юборилмоқда...",
  question_giveup: "Жавобни кўрсатиш",
  question_report: "Савол нотўғри",
  result_correct: "Тўғри жавоб!",
  result_wrong: "Афсуски, нотўғри",
  result_partial: "Қисман тўғри",
  result_correct_answer: "Тўғри жавоб",
  result_points_earned: "+{points} балл",
  finish_title: "Ўйин тугади",
  finish_score: "Сизнинг баллингиз",
  finish_correct: "{correct} / {total} тўғри",
  finish_again: "Яна ўйнаш",
  finish_home: "Асосийга қайтиш",

  name_title: "Исмингизни киритинг",
  name_subtitle: "Бу сизнинг рейтинг жадвалида кўринадиган исмингиз",
  name_placeholder: "Исм",
  name_save: "Сақлаш",

  onboarding_step_lang_title: "Тилни танланг",
  onboarding_step_lang_subtitle: "Кейинроқ созламалардан ўзгартира оласиз",
  onboarding_step_welcome_title: "Заковат — билим ўйини",
  onboarding_step_welcome_text:
    "Якка ва жамоа бўлиб ўйнанг, дўстларингизни чақиринг, билимларингизни синаб кўринг. Ҳар савол учун чекланган вақт — тез ва аниқ жавоб беринг!",
  onboarding_step_play_title: "Қандай ўйнаймиз?",
  onboarding_step_play_text:
    "Тезкор ўйинда 10 та савол, ҳар бирига 15 сония. Тўғри жавоб — балл; кетма-кет тўғри жавоблар — бонус. Жамоа тузинг ва 1v1 беллашувларга чиқинг!",
  onboarding_step_progress: "{n} / {total}",
  onboarding_get_started: "Бошлаш"
};

// ru — Русский
const ru: Strings = {
  app_name: "Zakovat",
  loading: "Загрузка",
  loading_dots: "Загрузка...",
  retry: "Повторить",
  back: "Назад",
  next: "Далее",
  skip: "Пропустить",
  done: "Готово",
  cancel: "Отмена",
  confirm: "Подтвердить",
  save: "Сохранить",
  close: "Закрыть",
  error_generic: "Произошла ошибка",
  error_network: "Ошибка сети. Попробуйте ещё раз.",

  telegram_required_title: "Telegram не подключён",
  telegram_required_text:
    "Мини-приложение открылось, но Telegram не передал данные авторизации. Закройте окно и откройте через меню бота.",

  home_start: "Начать игру",
  home_start_quick: "Быстрая игра",
  home_categories: "Категории",
  home_difficulty: "Сложность",
  home_difficulty_easy: "Лёгкая",
  home_difficulty_medium: "Средняя",
  home_difficulty_hard: "Сложная",
  home_any_category: "Любая",
  home_any_difficulty: "Любая",

  nav_home: "Главная",
  nav_team: "Команда",
  nav_leaderboard: "Рейтинг",
  nav_profile: "Профиль",

  profile_title: "Профиль",
  profile_level: "Уровень",
  profile_score: "Очки",
  profile_games: "Игры",
  profile_accuracy: "Точность",
  profile_best_streak: "Лучшая серия",
  profile_achievements: "Достижения",
  profile_change_name: "Изменить имя",
  profile_language: "Язык",
  profile_language_choose: "Выберите язык",

  leaderboard_title: "Рейтинг",
  leaderboard_score: "Очки",
  leaderboard_referrals: "Приглашения",
  leaderboard_my_rank: "Ваше место",
  leaderboard_empty: "Пока никого нет",
  leaderboard_user_placeholder: "Пользователь",

  team_title: "Команда",
  team_no_team: "Вы пока не в команде",
  team_create: "Новая команда",
  team_join: "Войти в команду",
  team_my_team: "Моя команда",
  team_owner_badge: "ЛИДЕР",
  team_members: "Участники",
  team_leave: "Покинуть",
  team_rename: "Переименовать",
  team_make_owner: "Сделать лидером",
  team_code: "Код",
  team_copy_code: "Скопировать код",
  team_create_modal_title: "Новая команда",
  team_create_name_placeholder: "Название команды",
  team_join_modal_title: "Войти в команду",
  team_join_code_placeholder: "Код команды",

  question_placeholder: "Ваш ответ...",
  question_submit: "Отправить",
  question_submitting: "Отправка...",
  question_giveup: "Показать ответ",
  question_report: "Вопрос некорректный",
  result_correct: "Правильно!",
  result_wrong: "К сожалению, нет",
  result_partial: "Частично верно",
  result_correct_answer: "Правильный ответ",
  result_points_earned: "+{points} очков",
  finish_title: "Игра окончена",
  finish_score: "Ваш счёт",
  finish_correct: "{correct} / {total} верных",
  finish_again: "Сыграть ещё",
  finish_home: "На главную",

  name_title: "Введите имя",
  name_subtitle: "Это имя будет видно в таблице рейтинга",
  name_placeholder: "Имя",
  name_save: "Сохранить",

  onboarding_step_lang_title: "Выберите язык",
  onboarding_step_lang_subtitle: "Позже можно изменить в настройках",
  onboarding_step_welcome_title: "Zakovat — игра знаний",
  onboarding_step_welcome_text:
    "Играйте в одиночку или в команде, приглашайте друзей, проверяйте свои знания. На каждый вопрос — ограниченное время: отвечайте быстро и точно!",
  onboarding_step_play_title: "Как играть?",
  onboarding_step_play_text:
    "В быстрой игре 10 вопросов, по 15 секунд каждый. Правильный ответ — очки; серия правильных ответов — бонус. Создавайте команду и участвуйте в дуэлях 1v1!",
  onboarding_step_progress: "{n} / {total}",
  onboarding_get_started: "Начать"
};

export const STRINGS: Record<Lang, Strings> = {
  "uz-latn": uzLatn,
  "uz-cyrl": uzCyrl,
  ru
};

export type StringKey = keyof Strings;
