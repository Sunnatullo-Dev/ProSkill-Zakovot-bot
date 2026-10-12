/// Ilovaning BARCHA yo'llari — bitta joyda.
///
/// Qoida: hech qayerda `context.go('/quiz')` kabi matn yozilmaydi,
/// faqat `AppRoutes.quiz`. Shunda yo'l o'zgarganda kompilyator
/// barcha ishlatilgan joyni ko'rsatadi.
class AppRoutes {
  const AppRoutes._();

  // ═══ Auth oqimi (qobiqdan tashqarida) ═══════════════════════════════════
  static const splash = '/';
  static const onboarding = '/onboarding';
  static const login = '/login';
  static const register = '/register';
  static const registerVerify = '/register/verify';
  static const forgotPassword = '/forgot-password';
  static const resetPassword = '/reset-password';

  // ═══ Asosiy qobiq — 5 ta tab ════════════════════════════════════════════
  // Web ilovadagi pastki navigatsiya bilan bir xil tartib:
  //   [Asosiy] [Reyting]  ((Svoyak))  [Jamoa] [Profil]
  static const home = '/home';
  static const leaderboard = '/leaderboard';
  static const svoyak = '/svoyak';
  static const team = '/team';
  static const profile = '/profile';

  /// Tab tartibi — `StatefulShellRoute` branch indekslariga mos.
  static const List<String> shellBranches = [
    home,
    leaderboard,
    svoyak,
    team,
    profile,
  ];

  // ═══ Yakka o'yin (to'liq ekran, taymer bilan) ═══════════════════════════
  static const quiz = '/quiz';
  static const quizResult = '/quiz/result';

  // ═══ Kunlik topshiriq ═══════════════════════════════════════════════════
  static const daily = '/daily';

  // ═══ Svoyak ichki oqimi ═════════════════════════════════════════════════
  /// Xona yaratish / kod bilan qo'shilish (lobbi)
  static const svoyakLobby = '/svoyak/lobby';

  /// Klassik doska — `/svoyak/room/ABC234`
  static const _svoyakRoom = '/svoyak/room';
  static String svoyakRoom(String code) => '$_svoyakRoom/$code';
  static const svoyakRoomPattern = '$_svoyakRoom/:code';

  /// Auto rejim — `/svoyak/auto/ABC234`
  static const _svoyakAuto = '/svoyak/auto';
  static String svoyakAuto(String code) => '$_svoyakAuto/$code';
  static const svoyakAutoPattern = '$_svoyakAuto/:code';

  // ═══ Bellashuv (Battle) ═════════════════════════════════════════════════
  /// `/battle/<uuid>`
  static const _battle = '/battle';
  static String battle(String battleId) => '$_battle/$battleId';
  static const battlePattern = '$_battle/:battleId';

  // ═══ Online O'yin Xonasi ════════════════════════════════════════════════
  static const gameRoomJoin = '/gameroom';

  /// `/gameroom/ABC234`
  static String gameRoom(String code) => '$gameRoomJoin/$code';
  static const gameRoomPattern = '$gameRoomJoin/:code';

  // ═══ Interaktiv Zakovat Stoli (faqat kuzatuvchi) ════════════════════════
  static const zakovatTable = '/zakovat-table';

  /// `/zakovat-table/7845`
  static String zakovatTableRoom(String code) => '$zakovatTable/$code';
  static const zakovatTablePattern = '$zakovatTable/:code';

  // ═══ Premium ════════════════════════════════════════════════════════════
  static const premium = '/premium';
  static const premiumCheckout = '/premium/checkout';
  static const premiumHistory = '/premium/history';

  // ═══ Profil ichki ekranlari ═════════════════════════════════════════════
  static const settings = '/settings';
  static const changePassword = '/settings/password';
  static const gameHistory = '/profile/history';
  static const achievements = '/profile/achievements';
  static const admin = '/admin';

  // ═══ Yordamchi ══════════════════════════════════════════════════════════

  /// Sessiya talab QILINMAYDIGAN yo'llar.
  static const Set<String> publicRoutes = {
    splash,
    onboarding,
    login,
    register,
    registerVerify,
    forgotPassword,
    resetPassword,
  };

  /// Ro'yxatdan o'tish / kirish / parolni tiklash oqimi yo'llari.
  static const Set<String> authRoutes = {
    login,
    register,
    registerVerify,
    forgotPassword,
    resetPassword,
  };

  static bool isPublic(String location) {
    return publicRoutes.any(
      (route) => location == route || location.startsWith('$route/'),
    );
  }

  static bool isAuthRoute(String location) {
    return authRoutes.any(
      (route) => location == route || location.startsWith('$route/'),
    );
  }

  /// Berilgan manzil qaysi tabga tegishli (0..4). Topilmasa `-1`.
  static int branchIndexFor(String location) {
    for (var i = shellBranches.length - 1; i >= 0; i--) {
      final branch = shellBranches[i];
      if (location == branch || location.startsWith('$branch/')) return i;
    }
    return -1;
  }
}
