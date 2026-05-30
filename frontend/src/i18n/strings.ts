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

  // ─── Svoyak (BottomNav + ekranlar) ───
  nav_svoyak: string;

  // Svoyak tanlash menyusi
  svoyak_menu_title: string;
  svoyak_menu_subtitle: string;
  svoyak_menu_create: string;
  svoyak_menu_join: string;

  // Lobby: host kategoriya tanlash
  svoyak_host_pick_categories: string;
  svoyak_host_pick_categories_hint: string;
  svoyak_lobby_loading: string;
  svoyak_lobby_loading_hint: string;
  svoyak_lobby_load_failed: string;
  svoyak_lobby_retry: string;
  svoyak_categories_empty_title: string;
  svoyak_categories_empty_text: string;
  svoyak_category_needs_5: string;
  svoyak_create_room: string; // "Xona yaratish ({n})"
  svoyak_create_failed: string;

  // Lobby: join (kod orqali)
  svoyak_join_title: string;
  svoyak_join_subtitle: string;
  svoyak_join_placeholder: string;
  svoyak_join_button: string;
  svoyak_join_failed: string;

  // Xona tayyor (lobby active)
  svoyak_room_ready_title: string;
  svoyak_room_ready_subtitle: string;
  svoyak_room_code_label: string;
  svoyak_copy_code: string;
  svoyak_copied: string;
  svoyak_invite_friend: string;
  svoyak_invite_share_text: string; // "Svoyak o'yiniga qo'shiling: {url}"
  svoyak_players_count: string; // "O'YINCHILAR ({n})"
  svoyak_player_status_host: string;
  svoyak_player_status_connected: string;
  svoyak_player_status_disconnected: string;
  svoyak_start_game: string;
  svoyak_need_2_players: string;
  svoyak_close_room: string;
  svoyak_leave_room: string;

  // Board (kategoriya×ball grid)
  svoyak_board_pick_now: string;
  svoyak_board_waiting_pick: string;
  svoyak_board_scoreboard_you: string;
  svoyak_board_exit_host: string;
  svoyak_board_exit_player: string;

  // QuestionOverlay (savol overlay)
  svoyak_q_reading: string;
  svoyak_q_open_buzz: string;
  svoyak_q_value: string; // "{value} ball"
  svoyak_q_mute: string;
  svoyak_q_unmute: string;

  // BUZZ overlay
  svoyak_buzz_waiting_label: string; // "KUTING"
  svoyak_buzz_waiting_hint: string;
  svoyak_buzz_active_label: string; // "BOSING!"
  svoyak_buzz_active_hint: string;
  svoyak_buzz_blocked_label: string; // "BLOKLANGAN"
  svoyak_buzz_blocked_hint: string;
  svoyak_buzz_winner_label: string; // "SIZ G'OLIBSIZ!"
  svoyak_buzz_winner_hint: string;

  // Answer overlay
  svoyak_answer_time_left: string; // "{n}s qoldi"
  svoyak_answer_skip: string;
  svoyak_answer_no_options: string;

  // Round result flash
  svoyak_result_correct: string; // "TO'G'RI!"
  svoyak_result_wrong: string;  // "XATO"
  svoyak_result_skipped: string; // "O'TKAZILDI"
  svoyak_result_ball: string;    // "{n} ball"
  svoyak_result_correct_answer: string; // "TO'G'RI JAVOB"
  svoyak_result_your_answer: string; // "Sizning javobingiz:"

  // Game over (Finished)
  svoyak_finished_title: string;
  svoyak_finished_champion_label: string;
  svoyak_finished_no_winner: string;
  svoyak_finished_play_again: string;
  svoyak_finished_main_menu: string;

  // Error boundary
  svoyak_error_title: string;
  svoyak_error_text: string;
  svoyak_error_details: string;
  svoyak_error_retry: string;

  // AdminPanel Svoyak section
  svoyak_admin_categories_tab: string;
  svoyak_admin_questions_tab: string;
  svoyak_admin_empty_db_title: string;
  svoyak_admin_empty_db_text: string;
  svoyak_admin_seed_button: string;
  svoyak_admin_seeding: string;
  svoyak_admin_seed_short: string;
  svoyak_admin_categories_count: string; // "{n} ta kategoriya"
  svoyak_admin_questions_count: string; // "{n} savol topildi · {page}/{pages}"
  svoyak_admin_new_button: string;
  svoyak_admin_new_question: string;
  svoyak_admin_question_label_category: string;
  svoyak_admin_question_label_value: string;
  svoyak_admin_question_label_text: string;
  svoyak_admin_question_label_correct: string;
  svoyak_admin_question_label_wrong: string;
  svoyak_admin_question_text_mode: string;
  svoyak_admin_category_new: string;
  svoyak_admin_category_label_name: string;
  svoyak_admin_category_label_emoji: string;
  svoyak_admin_category_label_lang: string;
  svoyak_admin_category_label_order: string;
  svoyak_admin_filter_all_categories: string;
  svoyak_admin_filter_all_values: string;
  svoyak_admin_filter_search_placeholder: string;
  svoyak_admin_filter_search_button: string;
  svoyak_admin_no_results: string;
  svoyak_admin_pagination_prev: string;
  svoyak_admin_pagination_next: string;
  svoyak_admin_edit: string;
  svoyak_admin_delete: string;
  svoyak_admin_active_off: string;
  svoyak_admin_active_on: string;
  svoyak_admin_saving: string;
  svoyak_admin_seed_result_ok: string; // "✓ Bajarildi. Kategoriya: {cb} → {ca} (+{cd}). Savol: {qb} → {qa} (+{qd})."
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
  onboarding_get_started: "Boshlash",

  nav_svoyak: "Svoyak",

  svoyak_menu_title: "🎲 Svoyak",
  svoyak_menu_subtitle:
    "Boshlovchi va do'stlar bilan jonli intellektual o'yin. Tezkorlik, aniqlik va tavakkalchilik.",
  svoyak_menu_create: "🆕 Yangi xona yaratish",
  svoyak_menu_join: "🔑 Kod orqali kirish",

  svoyak_host_pick_categories: "Kategoriyalarni tanlang",
  svoyak_host_pick_categories_hint:
    "Kamida 1 ta. Tavsiya: 3-5 ta — har biri 5 ta savol tushadi.",
  svoyak_lobby_loading: "Yuklanmoqda...",
  svoyak_lobby_loading_hint: "Server uyqudan turyapti — 30 sekundgacha kuting",
  svoyak_lobby_load_failed: "⚠️ Kategoriyalar yuklanmadi",
  svoyak_lobby_retry: "🔄 Qayta urinib ko'rish",
  svoyak_categories_empty_title:
    "⚠️ Hech qaysi kategoriyada yetarli savol yo'q",
  svoyak_categories_empty_text:
    "Admin → Svoyak → \"✨ Bazani seed qilish\" — 7 ta kategoriya va 110 ta savol qo'shiladi.",
  svoyak_category_needs_5: "⚠️ Kamida 5 savol kerak",
  svoyak_create_room: "▶ Xona yaratish ({n})",
  svoyak_create_failed: "Xona yaratib bo'lmadi",

  svoyak_join_title: "Xona kodini kiriting",
  svoyak_join_subtitle: "Do'stingizdan olgan 6 belgili kodni kiriting.",
  svoyak_join_placeholder: "ABCDEF",
  svoyak_join_button: "▶ Qo'shilish",
  svoyak_join_failed: "Qo'shilib bo'lmadi",

  svoyak_room_ready_title: "Xona tayyor",
  svoyak_room_ready_subtitle:
    "Do'stlaringizga kodni yuboring va boshlash uchun kuting.",
  svoyak_room_code_label: "XONA KODI",
  svoyak_copy_code: "Nusxalash",
  svoyak_copied: "Nusxalandi ✓",
  svoyak_invite_friend: "✉️ Do'stni taklif qilish",
  svoyak_invite_share_text: "Svoyak o'yiniga qo'shiling: {url}",
  svoyak_players_count: "O'YINCHILAR ({n})",
  svoyak_player_status_host: "👑 Boshlovchi",
  svoyak_player_status_connected: "● ulangan",
  svoyak_player_status_disconnected: "○ uzilgan",
  svoyak_start_game: "▶ O'yinni boshlash",
  svoyak_need_2_players: "Kamida 2 ta ulangan o'yinchi kerak",
  svoyak_close_room: "✕ Xonani yopish",
  svoyak_leave_room: "← Xonadan chiqish",

  svoyak_board_pick_now: "MAVZU VA BALLNI TANLANG",
  svoyak_board_waiting_pick: "BOSHQA O'YINCHI TANLAMOQDA...",
  svoyak_board_scoreboard_you: "Siz",
  svoyak_board_exit_host: "✕ O'yinni tugatish",
  svoyak_board_exit_player: "← Chiqib ketish",

  svoyak_q_reading: "⏳ Boshlovchi savolni o'qimoqda...",
  svoyak_q_open_buzz: "▶ BUZZ OCHISH",
  svoyak_q_value: "{value} ball",
  svoyak_q_mute: "Ovozni o'chirish",
  svoyak_q_unmute: "Ovozni yoqish",

  svoyak_buzz_waiting_label: "KUTING",
  svoyak_buzz_waiting_hint: "Savol o'qilmoqda...",
  svoyak_buzz_active_label: "BOSING!",
  svoyak_buzz_active_hint: "Tezroq — kim oldin bossa!",
  svoyak_buzz_blocked_label: "BLOKLANGAN",
  svoyak_buzz_blocked_hint: "Sizdan oldin bosildi",
  svoyak_buzz_winner_label: "SIZ G'OLIBSIZ!",
  svoyak_buzz_winner_hint: "Javob bering",

  svoyak_answer_time_left: "⏱ {n}s qoldi",
  svoyak_answer_skip: "O'tkazib yuborish",
  svoyak_answer_no_options: "Variantlar yetishmayapti.",

  svoyak_result_correct: "TO'G'RI!",
  svoyak_result_wrong: "XATO",
  svoyak_result_skipped: "O'TKAZILDI",
  svoyak_result_ball: "{n} ball",
  svoyak_result_correct_answer: "TO'G'RI JAVOB",
  svoyak_result_your_answer: "Sizning javobingiz:",

  svoyak_finished_title: "O'yin tugadi",
  svoyak_finished_champion_label: "G'OLIB",
  svoyak_finished_no_winner: "G'olib aniqlanmadi",
  svoyak_finished_play_again: "▶ Yana o'ynash",
  svoyak_finished_main_menu: "← Asosiy menyu",

  svoyak_error_title: "Svoyak'da xato yuz berdi",
  svoyak_error_text:
    "Tashvishlanmang — qayta urinish tugmasini bosing yoki Mini-App'ni yopib qayta oching.",
  svoyak_error_details: "Texnik tafsilot",
  svoyak_error_retry: "🔄 Qayta urinib ko'rish",

  svoyak_admin_categories_tab: "🗂 Kategoriyalar",
  svoyak_admin_questions_tab: "❓ Savollar",
  svoyak_admin_empty_db_title: "🌱 Baza bo'sh",
  svoyak_admin_empty_db_text:
    "Boshlang'ich 7 kategoriya va 90+ savol bilan to'ldirish mumkin.",
  svoyak_admin_seed_button: "✨ Bazani seed qilish",
  svoyak_admin_seeding: "Yuklanmoqda...",
  svoyak_admin_seed_short: "🌱 Seed",
  svoyak_admin_categories_count: "{n} ta kategoriya",
  svoyak_admin_questions_count: "{n} savol topildi · {page}/{pages}",
  svoyak_admin_new_button: "+ Yangi",
  svoyak_admin_new_question: "+ Yangi savol",
  svoyak_admin_question_label_category: "Kategoriya",
  svoyak_admin_question_label_value: "Ball",
  svoyak_admin_question_label_text: "Savol matni",
  svoyak_admin_question_label_correct: "To'g'ri javob",
  svoyak_admin_question_label_wrong: "3 ta noto'g'ri variant",
  svoyak_admin_question_text_mode:
    "Erkin matn (A/B/C/D yo'q — foydalanuvchi qo'lda yozadi)",
  svoyak_admin_category_new: "Yangi kategoriya",
  svoyak_admin_category_label_name: "Nom",
  svoyak_admin_category_label_emoji: "Emoji",
  svoyak_admin_category_label_lang: "Til",
  svoyak_admin_category_label_order: "Tartib",
  svoyak_admin_filter_all_categories: "Barcha kategoriyalar",
  svoyak_admin_filter_all_values: "Barcha ballar",
  svoyak_admin_filter_search_placeholder: "Savol matn bo'yicha qidirish...",
  svoyak_admin_filter_search_button: "Qidir",
  svoyak_admin_no_results: "Filtr bo'yicha hech narsa topilmadi",
  svoyak_admin_pagination_prev: "← Oldingi",
  svoyak_admin_pagination_next: "Keyingi →",
  svoyak_admin_edit: "✎ Tahrir",
  svoyak_admin_delete: "✕ O'chir",
  svoyak_admin_active_off: "Off",
  svoyak_admin_active_on: "On",
  svoyak_admin_saving: "Saqlanmoqda...",
  svoyak_admin_seed_result_ok:
    "✓ Bajarildi. Kategoriya: {cb} → {ca} (+{cd}). Savol: {qb} → {qa} (+{qd})."
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
  onboarding_get_started: "Бошлаш",

  nav_svoyak: "Свояк",

  svoyak_menu_title: "🎲 Свояк",
  svoyak_menu_subtitle:
    "Бошловчи ва дўстлар билан жонли интеллектуал ўйин. Тезкорлик, аниқлик ва таваккалчилик.",
  svoyak_menu_create: "🆕 Янги хона яратиш",
  svoyak_menu_join: "🔑 Код орқали кириш",

  svoyak_host_pick_categories: "Категорияларни танланг",
  svoyak_host_pick_categories_hint:
    "Камида 1 та. Тавсия: 3-5 та — ҳар бири 5 та савол тушади.",
  svoyak_lobby_loading: "Юкланмоқда...",
  svoyak_lobby_loading_hint: "Сервер уйқудан туряпти — 30 сониягача кутинг",
  svoyak_lobby_load_failed: "⚠️ Категориялар юкланмади",
  svoyak_lobby_retry: "🔄 Қайта уриниб кўриш",
  svoyak_categories_empty_title:
    "⚠️ Ҳеч қайси категорияда етарли савол йўқ",
  svoyak_categories_empty_text:
    "Admin → Свояк → \"✨ Базани seed қилиш\" — 7 та категория ва 110 та савол қўшилади.",
  svoyak_category_needs_5: "⚠️ Камида 5 савол керак",
  svoyak_create_room: "▶ Хона яратиш ({n})",
  svoyak_create_failed: "Хона яратиб бўлмади",

  svoyak_join_title: "Хона кодини киритинг",
  svoyak_join_subtitle: "Дўстингиздан олган 6 белгили кодни киритинг.",
  svoyak_join_placeholder: "ABCDEF",
  svoyak_join_button: "▶ Қўшилиш",
  svoyak_join_failed: "Қўшилиб бўлмади",

  svoyak_room_ready_title: "Хона тайёр",
  svoyak_room_ready_subtitle:
    "Дўстларингизга кодни юборинг ва бошлаш учун кутинг.",
  svoyak_room_code_label: "ХОНА КОДИ",
  svoyak_copy_code: "Нусхалаш",
  svoyak_copied: "Нусхаланди ✓",
  svoyak_invite_friend: "✉️ Дўстни таклиф қилиш",
  svoyak_invite_share_text: "Свояк ўйинига қўшилинг: {url}",
  svoyak_players_count: "ЎЙИНЧИЛАР ({n})",
  svoyak_player_status_host: "👑 Бошловчи",
  svoyak_player_status_connected: "● уланган",
  svoyak_player_status_disconnected: "○ узилган",
  svoyak_start_game: "▶ Ўйинни бошлаш",
  svoyak_need_2_players: "Камида 2 та уланган ўйинчи керак",
  svoyak_close_room: "✕ Хонани ёпиш",
  svoyak_leave_room: "← Хонадан чиқиш",

  svoyak_board_pick_now: "МАВЗУ ВА БАЛЛНИ ТАНЛАНГ",
  svoyak_board_waiting_pick: "БОШҚА ЎЙИНЧИ ТАНЛАМОҚДА...",
  svoyak_board_scoreboard_you: "Сиз",
  svoyak_board_exit_host: "✕ Ўйинни тугатиш",
  svoyak_board_exit_player: "← Чиқиб кетиш",

  svoyak_q_reading: "⏳ Бошловчи саволни ўқимоқда...",
  svoyak_q_open_buzz: "▶ BUZZ ОЧИШ",
  svoyak_q_value: "{value} балл",
  svoyak_q_mute: "Овозни ўчириш",
  svoyak_q_unmute: "Овозни ёқиш",

  svoyak_buzz_waiting_label: "КУТИНГ",
  svoyak_buzz_waiting_hint: "Савол ўқилмоқда...",
  svoyak_buzz_active_label: "БОСИНГ!",
  svoyak_buzz_active_hint: "Тезроқ — ким олдин боссa!",
  svoyak_buzz_blocked_label: "БЛОКЛАНГАН",
  svoyak_buzz_blocked_hint: "Сиздан олдин босилди",
  svoyak_buzz_winner_label: "СИЗ ҒОЛИБСИЗ!",
  svoyak_buzz_winner_hint: "Жавоб беринг",

  svoyak_answer_time_left: "⏱ {n}с қолди",
  svoyak_answer_skip: "Ўтказиб юбориш",
  svoyak_answer_no_options: "Вариантлар етишмаяпти.",

  svoyak_result_correct: "ТЎҒРИ!",
  svoyak_result_wrong: "ХАТО",
  svoyak_result_skipped: "ЎТКАЗИЛДИ",
  svoyak_result_ball: "{n} балл",
  svoyak_result_correct_answer: "ТЎҒРИ ЖАВОБ",
  svoyak_result_your_answer: "Сизнинг жавобингиз:",

  svoyak_finished_title: "Ўйин тугади",
  svoyak_finished_champion_label: "ҒОЛИБ",
  svoyak_finished_no_winner: "Ғолиб аниқланмади",
  svoyak_finished_play_again: "▶ Яна ўйнаш",
  svoyak_finished_main_menu: "← Асосий меню",

  svoyak_error_title: "Своякда хато юз берди",
  svoyak_error_text:
    "Ташвишланманг — қайта уриниш тугмасини босинг ёки Mini-Appни ёпиб қайта очинг.",
  svoyak_error_details: "Техник тафсилот",
  svoyak_error_retry: "🔄 Қайта уриниб кўриш",

  svoyak_admin_categories_tab: "🗂 Категориялар",
  svoyak_admin_questions_tab: "❓ Саволлар",
  svoyak_admin_empty_db_title: "🌱 База бўш",
  svoyak_admin_empty_db_text:
    "Бошланғич 7 категория ва 90+ савол билан тўлдириш мумкин.",
  svoyak_admin_seed_button: "✨ Базани seed қилиш",
  svoyak_admin_seeding: "Юкланмоқда...",
  svoyak_admin_seed_short: "🌱 Seed",
  svoyak_admin_categories_count: "{n} та категория",
  svoyak_admin_questions_count: "{n} савол топилди · {page}/{pages}",
  svoyak_admin_new_button: "+ Янги",
  svoyak_admin_new_question: "+ Янги савол",
  svoyak_admin_question_label_category: "Категория",
  svoyak_admin_question_label_value: "Балл",
  svoyak_admin_question_label_text: "Савол матни",
  svoyak_admin_question_label_correct: "Тўғри жавоб",
  svoyak_admin_question_label_wrong: "3 та нотўғри вариант",
  svoyak_admin_question_text_mode:
    "Эркин матн (A/B/C/D йўқ — фойдаланувчи қўлда ёзади)",
  svoyak_admin_category_new: "Янги категория",
  svoyak_admin_category_label_name: "Ном",
  svoyak_admin_category_label_emoji: "Эможи",
  svoyak_admin_category_label_lang: "Тил",
  svoyak_admin_category_label_order: "Тартиб",
  svoyak_admin_filter_all_categories: "Барча категориялар",
  svoyak_admin_filter_all_values: "Барча баллар",
  svoyak_admin_filter_search_placeholder: "Савол матн бўйича қидириш...",
  svoyak_admin_filter_search_button: "Қидир",
  svoyak_admin_no_results: "Фильтр бўйича ҳеч нарса топилмади",
  svoyak_admin_pagination_prev: "← Олдинги",
  svoyak_admin_pagination_next: "Кейинги →",
  svoyak_admin_edit: "✎ Таҳрир",
  svoyak_admin_delete: "✕ Ўчир",
  svoyak_admin_active_off: "Off",
  svoyak_admin_active_on: "On",
  svoyak_admin_saving: "Сақланмоқда...",
  svoyak_admin_seed_result_ok:
    "✓ Бажарилди. Категория: {cb} → {ca} (+{cd}). Савол: {qb} → {qa} (+{qd})."
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
  onboarding_get_started: "Начать",

  nav_svoyak: "Свояк",

  svoyak_menu_title: "🎲 Свояк",
  svoyak_menu_subtitle:
    "Живая интеллектуальная игра с ведущим и друзьями. Скорость, точность и риск.",
  svoyak_menu_create: "🆕 Создать новую комнату",
  svoyak_menu_join: "🔑 Войти по коду",

  svoyak_host_pick_categories: "Выберите категории",
  svoyak_host_pick_categories_hint:
    "Минимум 1. Рекомендуется 3-5 — по 5 вопросов в каждой.",
  svoyak_lobby_loading: "Загрузка...",
  svoyak_lobby_loading_hint: "Сервер просыпается — подождите до 30 секунд",
  svoyak_lobby_load_failed: "⚠️ Не удалось загрузить категории",
  svoyak_lobby_retry: "🔄 Попробовать ещё раз",
  svoyak_categories_empty_title:
    "⚠️ Недостаточно вопросов ни в одной категории",
  svoyak_categories_empty_text:
    "Admin → Свояк → \"✨ Засеять базу\" — добавит 7 категорий и 110 вопросов.",
  svoyak_category_needs_5: "⚠️ Нужно минимум 5 вопросов",
  svoyak_create_room: "▶ Создать комнату ({n})",
  svoyak_create_failed: "Не удалось создать комнату",

  svoyak_join_title: "Введите код комнаты",
  svoyak_join_subtitle: "Введите 6-значный код, полученный от друга.",
  svoyak_join_placeholder: "ABCDEF",
  svoyak_join_button: "▶ Присоединиться",
  svoyak_join_failed: "Не удалось присоединиться",

  svoyak_room_ready_title: "Комната готова",
  svoyak_room_ready_subtitle:
    "Отправьте код друзьям и ждите начала.",
  svoyak_room_code_label: "КОД КОМНАТЫ",
  svoyak_copy_code: "Копировать",
  svoyak_copied: "Скопировано ✓",
  svoyak_invite_friend: "✉️ Пригласить друга",
  svoyak_invite_share_text: "Присоединяйся к Свояку: {url}",
  svoyak_players_count: "ИГРОКИ ({n})",
  svoyak_player_status_host: "👑 Ведущий",
  svoyak_player_status_connected: "● онлайн",
  svoyak_player_status_disconnected: "○ оффлайн",
  svoyak_start_game: "▶ Начать игру",
  svoyak_need_2_players: "Нужно минимум 2 игрока",
  svoyak_close_room: "✕ Закрыть комнату",
  svoyak_leave_room: "← Покинуть комнату",

  svoyak_board_pick_now: "ВЫБЕРИТЕ ТЕМУ И БАЛЛ",
  svoyak_board_waiting_pick: "ВЫБИРАЕТ ДРУГОЙ ИГРОК...",
  svoyak_board_scoreboard_you: "Вы",
  svoyak_board_exit_host: "✕ Завершить игру",
  svoyak_board_exit_player: "← Выйти",

  svoyak_q_reading: "⏳ Ведущий читает вопрос...",
  svoyak_q_open_buzz: "▶ ОТКРЫТЬ BUZZ",
  svoyak_q_value: "{value} баллов",
  svoyak_q_mute: "Выключить звук",
  svoyak_q_unmute: "Включить звук",

  svoyak_buzz_waiting_label: "ЖДИТЕ",
  svoyak_buzz_waiting_hint: "Читается вопрос...",
  svoyak_buzz_active_label: "ЖМИ!",
  svoyak_buzz_active_hint: "Быстрее — кто первый!",
  svoyak_buzz_blocked_label: "ЗАБЛОКИРОВАНО",
  svoyak_buzz_blocked_hint: "Кто-то нажал раньше",
  svoyak_buzz_winner_label: "ВЫ ПОБЕДИЛИ!",
  svoyak_buzz_winner_hint: "Отвечайте",

  svoyak_answer_time_left: "⏱ Осталось {n}с",
  svoyak_answer_skip: "Пропустить",
  svoyak_answer_no_options: "Недостаточно вариантов.",

  svoyak_result_correct: "ПРАВИЛЬНО!",
  svoyak_result_wrong: "НЕВЕРНО",
  svoyak_result_skipped: "ПРОПУЩЕНО",
  svoyak_result_ball: "{n} баллов",
  svoyak_result_correct_answer: "ПРАВИЛЬНЫЙ ОТВЕТ",
  svoyak_result_your_answer: "Ваш ответ:",

  svoyak_finished_title: "Игра окончена",
  svoyak_finished_champion_label: "ПОБЕДИТЕЛЬ",
  svoyak_finished_no_winner: "Победитель не определён",
  svoyak_finished_play_again: "▶ Сыграть ещё",
  svoyak_finished_main_menu: "← Главное меню",

  svoyak_error_title: "В Свояке произошла ошибка",
  svoyak_error_text:
    "Не волнуйтесь — нажмите кнопку повтора или перезапустите Mini-App.",
  svoyak_error_details: "Технические детали",
  svoyak_error_retry: "🔄 Повторить",

  svoyak_admin_categories_tab: "🗂 Категории",
  svoyak_admin_questions_tab: "❓ Вопросы",
  svoyak_admin_empty_db_title: "🌱 База пуста",
  svoyak_admin_empty_db_text:
    "Можно заполнить начальными 7 категориями и 90+ вопросами.",
  svoyak_admin_seed_button: "✨ Засеять базу",
  svoyak_admin_seeding: "Загрузка...",
  svoyak_admin_seed_short: "🌱 Seed",
  svoyak_admin_categories_count: "{n} категорий",
  svoyak_admin_questions_count: "Найдено: {n} · {page}/{pages}",
  svoyak_admin_new_button: "+ Новая",
  svoyak_admin_new_question: "+ Новый вопрос",
  svoyak_admin_question_label_category: "Категория",
  svoyak_admin_question_label_value: "Балл",
  svoyak_admin_question_label_text: "Текст вопроса",
  svoyak_admin_question_label_correct: "Правильный ответ",
  svoyak_admin_question_label_wrong: "3 неправильных варианта",
  svoyak_admin_question_text_mode:
    "Свободный ввод (A/B/C/D нет — пользователь пишет сам)",
  svoyak_admin_category_new: "Новая категория",
  svoyak_admin_category_label_name: "Название",
  svoyak_admin_category_label_emoji: "Эмодзи",
  svoyak_admin_category_label_lang: "Язык",
  svoyak_admin_category_label_order: "Порядок",
  svoyak_admin_filter_all_categories: "Все категории",
  svoyak_admin_filter_all_values: "Все баллы",
  svoyak_admin_filter_search_placeholder: "Поиск по тексту вопроса...",
  svoyak_admin_filter_search_button: "Найти",
  svoyak_admin_no_results: "По фильтру ничего не найдено",
  svoyak_admin_pagination_prev: "← Назад",
  svoyak_admin_pagination_next: "Вперёд →",
  svoyak_admin_edit: "✎ Изменить",
  svoyak_admin_delete: "✕ Удалить",
  svoyak_admin_active_off: "Off",
  svoyak_admin_active_on: "On",
  svoyak_admin_saving: "Сохраняется...",
  svoyak_admin_seed_result_ok:
    "✓ Готово. Категории: {cb} → {ca} (+{cd}). Вопросы: {qb} → {qa} (+{qd})."
};

export const STRINGS: Record<Lang, Strings> = {
  "uz-latn": uzLatn,
  "uz-cyrl": uzCyrl,
  ru
};

export type StringKey = keyof Strings;
