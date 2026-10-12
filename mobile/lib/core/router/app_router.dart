import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'package:flutter_bloc/flutter_bloc.dart';

import '../../features/admin/presentation/pages/admin_panel_page.dart';
import '../../features/auth/domain/entities/telegram_challenge.dart';
import '../../features/auth/presentation/bloc/auth_bloc.dart';
import '../../features/auth/presentation/bloc/forgot_password_cubit.dart';
import '../../features/auth/presentation/bloc/register_cubit.dart';
import '../../features/auth/presentation/pages/forgot_password_page.dart';
import '../../features/auth/presentation/pages/login_page.dart';
import '../../features/auth/presentation/pages/onboarding_page.dart';
import '../../features/auth/presentation/pages/register_page.dart';
import '../../features/auth/presentation/pages/reset_password_page.dart';
import '../../features/auth/presentation/pages/splash_page.dart';
import '../../features/auth/presentation/pages/telegram_otp_verify_page.dart';
import '../../features/battle/presentation/pages/battle_page.dart';
import '../../features/daily/presentation/pages/daily_page.dart';
import '../../features/gameroom/presentation/pages/gameroom_join_page.dart';
import '../../features/gameroom/presentation/pages/gameroom_play_page.dart';
import '../../features/home/presentation/pages/home_page.dart';
import '../../features/home/presentation/pages/main_shell.dart';
import '../../features/leaderboard/presentation/pages/leaderboard_page.dart';
import '../../features/premium/presentation/pages/premium_checkout_page.dart';
import '../../features/premium/presentation/pages/premium_history_page.dart';
import '../../features/premium/presentation/pages/premium_page.dart';
import '../../features/profile/presentation/pages/achievements_page.dart';
import '../../features/profile/presentation/pages/change_password_page.dart';
import '../../features/profile/presentation/pages/game_history_page.dart';
import '../../features/profile/presentation/pages/profile_page.dart';
import '../../features/profile/presentation/pages/settings_page.dart';
import '../../features/quiz/domain/entities/round_summary.dart';
import '../../features/quiz/presentation/pages/quiz_page.dart';
import '../../features/quiz/presentation/pages/quiz_result_page.dart';
import '../../features/svoyak/presentation/pages/svoyak_board_page.dart';
import '../../features/svoyak/presentation/pages/svoyak_lobby_page.dart';
import '../../features/team/presentation/pages/team_screen.dart';
import '../../features/zakovat_table/presentation/pages/zakovat_table_join_page.dart';
import '../../features/zakovat_table/presentation/pages/zakovat_table_room_page.dart';
import '../../shared/widgets/feature_placeholder_page.dart';
import 'app_routes.dart';

/// Ilova navigatsiyasi — barcha yo'nalishlar.
///
/// ## Tuzilma
///
/// ```
/// /                       splash        (qobiqdan tashqarida)
/// /onboarding             onboarding
/// /login  /register       auth
///
/// StatefulShellRoute (pastki navigatsiya bilan, 5 branch):
///   0 /home            Asosiy
///   1 /leaderboard     Reyting
///   2 /svoyak          Svoyak      → /svoyak/lobby, /svoyak/room/:code, /svoyak/auto/:code
///   3 /team            Jamoa
///   4 /profile         Profil      → /profile/history, /profile/achievements
///
/// To'liq ekran (qobiqdan tashqarida — pastki navigatsiya ko'rinmaydi):
///   /quiz  /daily  /battle/:battleId  /gameroom/:code
///   /zakovat-table/:code  /premium  /settings
/// ```
///
/// ## Nega ba'zi ekranlar qobiqdan tashqarida
///
/// O'yin ekranlarida (savol, bellashuv, Svoyak doskasi) pastki navigatsiya
/// **ko'rinmasligi kerak**: foydalanuvchi taymer ishlab turganda tasodifan
/// boshqa tabga o'tib, raundni yo'qotmasin.
///
/// ## Yagona haqiqat manbai
///
/// Yo'naltirish mantig'i faqat `_redirect` da. Ekranlar o'zini surib
/// yubormaydi — aks holda splash ham, router ham navigatsiya qilib
/// "ekran miltillashi" paydo bo'ladi.
class AppRouter {
  AppRouter(this._authBloc);

  final AuthBloc _authBloc;

  static final _rootKey = GlobalKey<NavigatorState>(debugLabel: 'root');
  static final _shellKey = GlobalKey<NavigatorState>(debugLabel: 'shell');

  late final GoRouter router = GoRouter(
    navigatorKey: _rootKey,
    initialLocation: AppRoutes.splash,
    debugLogDiagnostics: false,
    refreshListenable: _AuthRefreshStream(_authBloc.stream),
    redirect: _redirect,
    errorBuilder: (context, state) => _RouteErrorPage(error: state.error),
    routes: [
      // ═══ Auth oqimi ══════════════════════════════════════════════════════
      GoRoute(
        path: AppRoutes.splash,
        builder: (_, _) => const SplashPage(),
      ),
      GoRoute(
        path: AppRoutes.onboarding,
        builder: (_, _) => const OnboardingPage(),
      ),
      GoRoute(
        path: AppRoutes.login,
        builder: (_, _) => const LoginPage(),
      ),
      GoRoute(
        path: AppRoutes.register,
        builder: (_, _) => const RegisterPage(),
      ),
      GoRoute(
        path: AppRoutes.registerVerify,
        builder: (context, state) {
          final extra = state.extra;
          if (extra is Map<String, dynamic>) {
            final challenge = extra['challenge'] as TelegramChallenge;
            final cubit = extra['cubit'] as RegisterCubit?;
            if (cubit != null) {
              return BlocProvider.value(
                value: cubit,
                child: TelegramOtpVerifyPage(challenge: challenge),
              );
            }
            return TelegramOtpVerifyPage(challenge: challenge);
          }
          if (extra is TelegramChallenge) {
            return TelegramOtpVerifyPage(challenge: extra);
          }
          return const RegisterPage();
        },
      ),
      GoRoute(
        path: AppRoutes.forgotPassword,
        builder: (_, _) => const ForgotPasswordPage(),
      ),
      GoRoute(
        path: AppRoutes.resetPassword,
        builder: (context, state) {
          final extra = state.extra;
          if (extra is Map<String, dynamic>) {
            final challenge = extra['challenge'] as TelegramChallenge;
            final cubit = extra['cubit'] as ForgotPasswordCubit?;
            return ResetPasswordPage(challenge: challenge, cubit: cubit);
          }
          if (extra is TelegramChallenge) {
            return ResetPasswordPage(challenge: extra);
          }
          return const ForgotPasswordPage();
        },
      ),

      // ═══ Asosiy qobiq — 5 tab ════════════════════════════════════════════
      StatefulShellRoute.indexedStack(
        builder: (_, _, navigationShell) =>
            MainShell(navigationShell: navigationShell),
        branches: [
          // ── 0. Asosiy ─────────────────────────────────────────────────────
          StatefulShellBranch(
            navigatorKey: _shellKey,
            routes: [
              GoRoute(
                path: AppRoutes.home,
                builder: (_, _) => const HomePage(),
              ),
            ],
          ),

          // ── 1. Reyting ────────────────────────────────────────────────────
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.leaderboard,
                builder: (_, _) => const LeaderboardScreen(),
              ),
            ],
          ),

          // ── 2. Svoyak ─────────────────────────────────────────────────────
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.svoyak,
                builder: (_, _) => const SvoyakLobbyPage(),
                routes: [
                  GoRoute(
                    path: 'lobby',
                    builder: (_, _) => const SvoyakLobbyPage(),
                  ),
                ],
              ),
            ],
          ),

          // ── 3. Jamoa ──────────────────────────────────────────────────────
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.team,
                builder: (_, _) => const TeamScreen(),
              ),
            ],
          ),

          // ── 4. Profil ─────────────────────────────────────────────────────
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.profile,
                builder: (_, _) => const ProfileScreen(),
                routes: [
                  GoRoute(
                    path: 'history',
                    builder: (_, _) => const GameHistoryPage(),
                  ),
                  GoRoute(
                    path: 'achievements',
                    builder: (_, _) => const AchievementsPage(),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),

      // ═══ To'liq ekran: yakka o'yin ═══════════════════════════════════════
      GoRoute(
        path: AppRoutes.quiz,
        parentNavigatorKey: _rootKey,
        builder: (context, state) => QuizPage(
          // `?difficulty=easy|medium|hard` — bo'lmasa aralash.
          difficulty: state.uri.queryParameters['difficulty'],
        ),
        routes: [
          GoRoute(
            path: 'result',
            parentNavigatorKey: _rootKey,
            builder: (context, state) {
              final summary = state.extra;
              // `extra` yo'qolgan bo'lsa (masalan deep-link orqali kelinsa)
              // natija ko'rsatib bo'lmaydi — bosh sahifaga qaytaramiz.
              if (summary is! RoundSummary) {
                return const FeaturePlaceholderPage(
                  emoji: '🏁',
                  title: 'Natija topilmadi',
                  description: 'Raund natijasi mavjud emas. '
                      'Yangi o\'yin boshlang.',
                );
              }
              return QuizResultPage(summary: summary);
            },
          ),
        ],
      ),

      // ═══ To'liq ekran: kunlik topshiriq ══════════════════════════════════
      GoRoute(
        path: AppRoutes.daily,
        parentNavigatorKey: _rootKey,
        builder: (_, _) => const DailyPage(),
      ),

      // ═══ To'liq ekran: Svoyak xonalari ═══════════════════════════════════
      GoRoute(
        path: AppRoutes.svoyakRoomPattern,
        parentNavigatorKey: _rootKey,
        builder: (context, state) => SvoyakBoardPage(
          roomCode: state.pathParameters['code'] ?? '',
        ),
      ),
      GoRoute(
        path: AppRoutes.svoyakAutoPattern,
        parentNavigatorKey: _rootKey,
        builder: (context, state) => SvoyakBoardPage(
          roomCode: state.pathParameters['code'] ?? '',
        ),
      ),

      // ═══ To'liq ekran: bellashuv ═════════════════════════════════════════
      GoRoute(
        path: AppRoutes.battlePattern,
        parentNavigatorKey: _rootKey,
        builder: (context, state) => BattlePage(
          battleId: state.pathParameters['battleId'] ?? '',
        ),
      ),

      // ═══ To'liq ekran: O'yin xonasi ══════════════════════════════════════
      GoRoute(
        path: AppRoutes.gameRoomJoin,
        parentNavigatorKey: _rootKey,
        builder: (_, _) => const GameRoomJoinPage(),
        routes: [
          GoRoute(
            path: ':code',
            parentNavigatorKey: _rootKey,
            builder: (context, state) => GameRoomPlayPage(
              roomCode: state.pathParameters['code'] ?? '',
            ),
          ),
        ],
      ),

      // ═══ To'liq ekran: Zakovat Stoli (kuzatuvchi) ════════════════════════
      GoRoute(
        path: AppRoutes.zakovatTable,
        parentNavigatorKey: _rootKey,
        builder: (_, _) => const ZakovatTableJoinPage(),
        routes: [
          GoRoute(
            path: ':code',
            parentNavigatorKey: _rootKey,
            builder: (context, state) => ZakovatTableRoomPage(
              roomCode: state.pathParameters['code'] ?? '',
            ),
          ),
        ],
      ),

      // ═══ To'liq ekran: Premium ═══════════════════════════════════════════
      GoRoute(
        path: AppRoutes.premium,
        parentNavigatorKey: _rootKey,
        builder: (_, _) => const PremiumPage(),
        routes: [
          GoRoute(
            path: 'checkout',
            parentNavigatorKey: _rootKey,
            builder: (_, _) => const PremiumCheckoutPage(),
          ),
          GoRoute(
            path: 'history',
            parentNavigatorKey: _rootKey,
            builder: (_, _) => const PremiumHistoryPage(),
          ),
        ],
      ),

      // ═══ To'liq ekran: sozlamalar ════════════════════════════════════════
      GoRoute(
        path: AppRoutes.settings,
        parentNavigatorKey: _rootKey,
        builder: (_, _) => const SettingsPage(),
        routes: [
          GoRoute(
            path: 'password',
            parentNavigatorKey: _rootKey,
            builder: (_, _) => const ChangePasswordPage(),
          ),
        ],
      ),

      // ═══ To'liq ekran: Admin Paneli ══════════════════════════════════════
      GoRoute(
        path: AppRoutes.admin,
        parentNavigatorKey: _rootKey,
        builder: (_, _) => const AdminPanelPage(),
      ),
    ],
  );

  /// Kirish nazorati — barcha yo'llar uchun yagona qoida.
  String? _redirect(BuildContext context, GoRouterState state) {
    final auth = _authBloc.state;
    final location = state.matchedLocation;

    // 1. Sessiya hali aniqlanmagan — splash'da ushlab turamiz.
    if (!auth.isResolved) {
      return location == AppRoutes.splash ? null : AppRoutes.splash;
    }

    // 2. Kirilgan — auth ekranlarida qolib ketmasin.
    if (auth.isAuthenticated) {
      return AppRoutes.isPublic(location) ? AppRoutes.home : null;
    }

    // 3. Kirilmagan, onboarding ko'rilmagan.
    if (!auth.onboardingDone) {
      return location == AppRoutes.onboarding ? null : AppRoutes.onboarding;
    }

    // 4. Kirilmagan, onboarding ko'rilgan → auth sahifalariga ruxsat.
    if (AppRoutes.isAuthRoute(location)) {
      return null;
    }
    return AppRoutes.login;
  }

  void dispose() => router.dispose();
}

/// BLoC oqimini `Listenable` ga aylantiradi — GoRouter shuni kuzatadi.
class _AuthRefreshStream extends ChangeNotifier {
  _AuthRefreshStream(Stream<AuthState> stream) {
    notifyListeners();
    _subscription = stream.asBroadcastStream().listen((_) => notifyListeners());
  }

  late final StreamSubscription<AuthState> _subscription;

  @override
  void dispose() {
    _subscription.cancel();
    super.dispose();
  }
}

class _RouteErrorPage extends StatelessWidget {
  const _RouteErrorPage({this.error});

  final Exception? error;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.explore_off_rounded, size: 56),
              const SizedBox(height: 16),
              Text(
                'Sahifa topilmadi',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 8),
              Text(
                error?.toString() ?? 'Noma\'lum yo\'l',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodySmall,
              ),
              const SizedBox(height: 24),
              FilledButton(
                onPressed: () => context.go(AppRoutes.home),
                child: const Text('Bosh sahifa'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
