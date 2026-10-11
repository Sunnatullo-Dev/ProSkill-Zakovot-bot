/// Backend endpointlari — bitta joyda.
///
/// Manba: `backend-django/zakovat/urls.py` va app'larning `urls.py` fayllari.
/// Bu yerdagi yo'llar `AppConfig.apiBaseUrl` ga nisbatan.
class ApiPaths {
  const ApiPaths._();

  // ── Tizim ─────────────────────────────────────────────────────────────────
  static const health = '/health';
  static const serverTime = '/api/time';

  // ── Auth (mobil, JWT) ─────────────────────────────────────────────────────
  static const register = '/api/auth/register';
  static const loginPassword = '/api/auth/login/password';
  static const tokenRefresh = '/api/auth/token/refresh';
  static const logout = '/api/auth/logout';
  static const logoutAll = '/api/auth/logout/all';
  static const me = '/api/auth/me';
  static const changePassword = '/api/auth/password';
  static const linkTelegram = '/api/auth/link-telegram';
  static const createTelegramLinkToken = '/api/auth/telegram-link/create-token';
  static const telegramLinkStatus = '/api/auth/telegram-link/status';
  static const telegramOtpRegisterStart = '/api/auth/telegram-otp/register/start';
  static const telegramOtpRegisterVerify = '/api/auth/telegram-otp/register/verify';
  static const telegramOtpForgotPassword = '/api/auth/telegram-otp/forgot-password';
  static const telegramOtpResetPassword = '/api/auth/telegram-otp/reset-password';
  static const telegramOtpResend = '/api/auth/telegram-otp/resend';

  // ── Foydalanuvchi ─────────────────────────────────────────────────────────
  static const usersTop = '/api/users/top';
  static const leaderboard = '/api/users/leaderboard';
  static const referrals = '/api/users/referrals';
  static const updateMe = '/api/users/me';
  static const updateLanguage = '/api/users/me/language';
  static const checkAchievements = '/api/users/me/check-achievements';

  // ── Savollar / javoblar ───────────────────────────────────────────────────
  static const questionsRound = '/api/questions/round';
  static const questionCategories = '/api/questions/categories';
  static String reportQuestion(String id) => '/api/questions/$id/report';

  static const answerTicket = '/api/answer/ticket';
  static const submitAnswer = '/api/answer';
  static const revealAnswer = '/api/answer/reveal';
  static const tts = '/api/answer/tts';

  // ── O'yin natijalari ──────────────────────────────────────────────────────
  static const gameResults = '/api/game-results';
  static const gameStats = '/api/game-results/stats';
  static const gameHistory = '/api/game-results/history';

  // ── Kunlik topshiriq ──────────────────────────────────────────────────────
  static const dailyToday = '/api/daily/today';
  static const dailyComplete = '/api/daily/complete';

  // ── Premium ───────────────────────────────────────────────────────────────
  static const premiumInfo = '/api/premium/info';
  static const premiumRequest = '/api/premium/request';
  static const premiumHistory = '/api/premium/history';

  // ── Svoyak ────────────────────────────────────────────────────────────────
  static const svoyakCategories = '/api/svoyak/categories';
  static const svoyakRooms = '/api/svoyak/rooms';
  static String svoyakRoomJoin(String code) => '/api/svoyak/rooms/$code/join';
  static String svoyakRoomState(String code) => '/api/svoyak/rooms/$code/state';
  static String svoyakRoomStart(String code) => '/api/svoyak/rooms/$code/start';
  static String svoyakRoomBuzz(String code) => '/api/svoyak/rooms/$code/buzz';
  static String svoyakRoomAnswer(String code) => '/api/svoyak/rooms/$code/answer';
  static String svoyakRoomAutoAnswer(String code) => '/api/svoyak/rooms/$code/auto-answer';
  static String svoyakRoomLeave(String code) => '/api/svoyak/rooms/$code/leave';
  static String svoyakRoomEnd(String code) => '/api/svoyak/rooms/$code/end';

  // ── Online O'yin Xonasi (GameRooms) ─────────────────────────────────────────
  static const gameRooms = '/api/gamerooms/rooms';
  static String gameRoomJoinPath(String code) => '/api/gamerooms/rooms/$code/join';
  static String gameRoomState(String code) => '/api/gamerooms/rooms/$code/state';
  static String gameRoomAnswer(String code) => '/api/gamerooms/rooms/$code/answer';

  // ── Zakovat Stoli (Zakovat Table) ──────────────────────────────────────────
  static const zakovatTableRooms = '/api/zakovat-table/rooms';
  static String zakovatTableState(String code) => '/api/zakovat-table/rooms/$code/state';
  static String zakovatTableJoin(String code) => '/api/zakovat-table/rooms/$code/join';
  static String zakovatTableSpectate(String code) => '/api/zakovat-table/rooms/$code/spectate';
  static String zakovatTableAnswer(String code) => '/api/zakovat-table/rooms/$code/answer';

  // ── Jamoa (Teams) ──────────────────────────────────────────────────────────
  static const teamCreate = '/api/teams/';
  static const teamJoin = '/api/teams/join';
  static const teamMy = '/api/teams/my';
  static const teamChat = '/api/teams/my/chat';
  static const teamChatSend = '/api/teams/my/chat/send';
  static const teamLeave = '/api/teams/leave';

  // ── Bellashuv (Battles 1v1) ────────────────────────────────────────────────
  static const battlePending = '/api/battles/pending';
  static const battleChallenge = '/api/battles/challenge';
  static String battleState(String id) => '/api/battles/$id/state';
  static String battleAnswer(String id) => '/api/battles/$id/answer';
  static String battleForfeit(String id) => '/api/battles/$id/forfeit';

  // ── Kanallar (Channels) ───────────────────────────────────────────────────
  static const channelsList = '/api/channels/';
  static const channelsCheck = '/api/channels/check';

  // ── Admin ─────────────────────────────────────────────────────────────────
  static const adminStats = '/api/admin/stats';
  static const adminQuestions = '/api/admin/questions';
  static const adminChannels = '/api/admin/channels';
  static const adminUsers = '/api/admin/users';
  static const adminPremiumRequests = '/api/admin/premium/requests';

  /// Auth sarlavhasi TALAB QILINMAYDIGAN yo'llar.
  ///
  /// `AuthInterceptor` shu ro'yxatdagi so'rovlarga token qo'shmaydi va
  /// 401 kelganda refresh urinmaydi (aks holda cheksiz sikl bo'lardi).
  static const Set<String> publicPaths = {
    health,
    serverTime,
    register,
    loginPassword,
    tokenRefresh,
    logout,
  };

  static bool isPublic(String path) {
    return publicPaths.any((p) => path == p || path.endsWith(p));
  }
}
