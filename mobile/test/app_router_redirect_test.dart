import 'package:dartz/dartz.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:zakovat/core/di/injector.dart';
import 'package:zakovat/core/router/app_router.dart';
import 'package:zakovat/core/router/app_routes.dart';
import 'package:zakovat/core/storage/prefs_store.dart';
import 'package:zakovat/core/usecase/usecase.dart';
import 'package:zakovat/features/auth/domain/entities/app_user.dart';
import 'package:zakovat/features/auth/domain/repositories/auth_repository.dart';
import 'package:zakovat/features/auth/domain/usecases/auth_usecases.dart';
import 'package:zakovat/features/auth/presentation/bloc/auth_bloc.dart';
import 'package:zakovat/features/leaderboard/domain/entities/leaderboard.dart';
import 'package:zakovat/features/leaderboard/domain/repositories/leaderboard_repository.dart';
import 'package:zakovat/features/profile/domain/entities/game_stats.dart';
import 'package:zakovat/features/profile/domain/repositories/profile_repository.dart';

class _MockRestoreSession extends Mock implements RestoreSessionUseCase {}

class _MockLogout extends Mock implements LogoutUseCase {}

class _MockRepository extends Mock implements AuthRepository {}

class _MockPrefs extends Mock implements PrefsStore {}

class _MockLogin extends Mock implements LoginUseCase {}

class _MockRegister extends Mock implements RegisterUseCase {}

class _MockLeaderboardRepo extends Mock implements LeaderboardRepository {}

class _MockProfileRepo extends Mock implements ProfileRepository {}

const _user = AppUser(
  id: '1',
  telegramId: 2000000000001,
  score: 0,
  language: 'uz-latn',
  currentStreak: 0,
  authProvider: 'phone',
  isAppAccount: true,
  hasPassword: true,
  isPremium: false,
  firstName: 'Amirxon',
);

void main() {
  late _MockRestoreSession restoreSession;
  late _MockLogout logout;
  late _MockRepository repository;
  late _MockPrefs prefs;

  setUpAll(() {
    registerFallbackValue(const NoParams());
    registerFallbackValue(LeaderboardPeriod.all);
  });

  setUp(() {
    restoreSession = _MockRestoreSession();
    logout = _MockLogout();
    repository = _MockRepository();
    prefs = _MockPrefs();
    when(() => prefs.setOnboardingDone(any())).thenAnswer((_) async {});
    when(() => prefs.lastPhone).thenReturn(null);
    when(() => prefs.language).thenReturn('uz-latn');

    // Login/Register sahifalari GetIt orqali bog'liqlik oladi
    // (`LoginCubit(sl())`, `sl<PrefsStore>()`), shuning uchun router testida
    // ham ularni ro'yxatga olishimiz kerak.
    // Reyting va Profil ekranlari ochilganda darhol so'rov yuboradi —
    // stublamasak `Null is not a Future<...>` bilan yiqiladi.
    final leaderboardRepo = _MockLeaderboardRepo();
    when(() => leaderboardRepo.getLeaderboard(
          period: any(named: 'period'),
          limit: any(named: 'limit'),
        )).thenAnswer(
      (_) async => const Right(
        LeaderboardPage(entries: [], myRank: 0, myScore: 0),
      ),
    );
    when(() => leaderboardRepo.getReferrals(period: any(named: 'period')))
        .thenAnswer(
      (_) async => const Right(
        LeaderboardPage(entries: [], myRank: 0, myScore: 0),
      ),
    );

    final profileRepo = _MockProfileRepo();
    when(() => profileRepo.getStats())
        .thenAnswer((_) async => const Right(GameStats.empty()));

    sl
      ..registerSingleton<PrefsStore>(prefs)
      ..registerSingleton<LoginUseCase>(_MockLogin())
      ..registerSingleton<RegisterUseCase>(_MockRegister())
      // Reyting va Profil tablari ham GetIt orqali repository oladi.
      ..registerSingleton<LeaderboardRepository>(leaderboardRepo)
      ..registerSingleton<ProfileRepository>(profileRepo)
      ..registerSingleton<AuthRepository>(repository);
  });

  tearDown(() => sl.reset());

  /// `pumpAndSettle` O'RNIGA ishlatiladi.
  ///
  /// Splash'dagi `CircularProgressIndicator` va boshqa uzluksiz
  /// animatsiyalar hech qachon "settle" bo'lmaydi — `pumpAndSettle`
  /// timeout beradi. Shuning uchun aniq sondagi kadrni pump qilamiz:
  /// bu redirect va async bloc hodisalari uchun yetarli.
  Future<void> settle(WidgetTester tester) async {
    for (var i = 0; i < 10; i++) {
      await tester.pump(const Duration(milliseconds: 120));
    }
  }

  AuthBloc buildBloc() => AuthBloc(
        restoreSession: restoreSession,
        logout: logout,
        repository: repository,
        prefs: prefs,
      );

  /// Router'ni haqiqiy `MaterialApp.router` ichida ko'taradi va
  /// yakuniy manzilni qaytaradi.
  Future<String> pumpRouter(WidgetTester tester, AuthBloc bloc) async {
    final appRouter = AppRouter(bloc);
    addTearDown(appRouter.dispose);

    await tester.pumpWidget(_wrap(bloc, appRouter));
    await settle(tester);

    return appRouter
        .router.routerDelegate.currentConfiguration.uri
        .toString();
  }

  testWidgets('sessiya aniqlanmagan — splash da ushlab turadi',
      (tester) async {
    final bloc = buildBloc(); // boshlang'ich holat: unknown
    addTearDown(bloc.close);

    final location = await pumpRouter(tester, bloc);
    expect(location, AppRoutes.splash);
  });

  testWidgets('kirilmagan + onboarding ko\'rilmagan → onboarding',
      (tester) async {
    when(() => prefs.onboardingDone).thenReturn(false);
    when(() => repository.hasStoredSession).thenReturn(false);

    final bloc = buildBloc()..add(const AuthStarted());
    addTearDown(bloc.close);

    final location = await pumpRouter(tester, bloc);
    expect(location, AppRoutes.onboarding);
  });

  testWidgets('kirilmagan + onboarding ko\'rilgan → login', (tester) async {
    when(() => prefs.onboardingDone).thenReturn(true);
    when(() => repository.hasStoredSession).thenReturn(false);

    final bloc = buildBloc()..add(const AuthStarted());
    addTearDown(bloc.close);

    final location = await pumpRouter(tester, bloc);
    expect(location, AppRoutes.login);
  });

  testWidgets('kirilgan → bosh sahifa (qobiq bilan)', (tester) async {
    when(() => prefs.onboardingDone).thenReturn(true);
    when(() => repository.hasStoredSession).thenReturn(true);
    when(() => restoreSession(any())).thenAnswer((_) async => const Right(_user));

    final bloc = buildBloc()..add(const AuthStarted());
    addTearDown(bloc.close);

    final location = await pumpRouter(tester, bloc);
    expect(location, AppRoutes.home);

    // Pastki navigatsiya ko'rinishi kerak (5 tab: 4 ta yorliq + markaziy tugma)
    expect(find.text('Asosiy'), findsOneWidget);
    expect(find.text('Reyting'), findsOneWidget);
    expect(find.text('Jamoa'), findsOneWidget);
    expect(find.text('Profil'), findsOneWidget);
  });

  testWidgets('kirilgan foydalanuvchi login sahifasida qololmaydi',
      (tester) async {
    when(() => prefs.onboardingDone).thenReturn(true);
    when(() => repository.hasStoredSession).thenReturn(true);
    when(() => restoreSession(any())).thenAnswer((_) async => const Right(_user));

    final bloc = buildBloc()..add(const AuthStarted());
    addTearDown(bloc.close);

    final appRouter = AppRouter(bloc);
    addTearDown(appRouter.dispose);

    await tester.pumpWidget(_wrap(bloc, appRouter));
    await settle(tester);

    appRouter.router.go(AppRoutes.login);
    await settle(tester);

    expect(
      appRouter.router.routerDelegate.currentConfiguration.uri.toString(),
      AppRoutes.home,
    );
  });

  testWidgets('sessiya tugasa avtomatik login ga qaytadi', (tester) async {
    when(() => prefs.onboardingDone).thenReturn(true);
    when(() => repository.hasStoredSession).thenReturn(true);
    when(() => restoreSession(any())).thenAnswer((_) async => const Right(_user));

    final bloc = buildBloc()..add(const AuthStarted());
    addTearDown(bloc.close);

    final appRouter = AppRouter(bloc);
    addTearDown(appRouter.dispose);

    await tester.pumpWidget(_wrap(bloc, appRouter));
    await settle(tester);
    expect(
      appRouter.router.routerDelegate.currentConfiguration.uri.toString(),
      AppRoutes.home,
    );

    // Interceptor 401 dan keyin shu hodisani yuboradi.
    bloc.add(const AuthSessionExpired());
    await settle(tester);

    expect(
      appRouter.router.routerDelegate.currentConfiguration.uri.toString(),
      AppRoutes.login,
    );
  });

  testWidgets('himoyalangan yo\'lga to\'g\'ridan-to\'g\'ri kirib bo\'lmaydi',
      (tester) async {
    when(() => prefs.onboardingDone).thenReturn(true);
    when(() => repository.hasStoredSession).thenReturn(false);

    final bloc = buildBloc()..add(const AuthStarted());
    addTearDown(bloc.close);

    final appRouter = AppRouter(bloc);
    addTearDown(appRouter.dispose);

    await tester.pumpWidget(_wrap(bloc, appRouter));
    await settle(tester);

    // Deep-link bilan bellashuvga kirishga urinish
    appRouter.router.go(AppRoutes.battle('any-id'));
    await settle(tester);

    expect(
      appRouter.router.routerDelegate.currentConfiguration.uri.toString(),
      AppRoutes.login,
    );
  });

  group('qobiq tablari orasida almashish', () {
    testWidgets('har tab o\'z sahifasini ochadi', (tester) async {
      when(() => prefs.onboardingDone).thenReturn(true);
      when(() => repository.hasStoredSession).thenReturn(true);
      when(() => restoreSession(any()))
          .thenAnswer((_) async => const Right(_user));

      final bloc = buildBloc()..add(const AuthStarted());
      addTearDown(bloc.close);

      final appRouter = AppRouter(bloc);
      addTearDown(appRouter.dispose);

      await tester.pumpWidget(_wrap(bloc, appRouter));
      await settle(tester);

      for (final entry in {
        'Reyting': AppRoutes.leaderboard,
        'Jamoa': AppRoutes.team,
        'Profil': AppRoutes.profile,
      }.entries) {
        await tester.tap(find.text(entry.key));
        await settle(tester);
        expect(
          appRouter.router.routerDelegate.currentConfiguration.uri.toString(),
          entry.value,
          reason: entry.key,
        );
      }
    });
  });
}

/// Haqiqiy `ZakovatApp` kabi: router + global `AuthBloc` provideri.
///
/// Bularsiz `HomePage` dagi `BlocBuilder<AuthBloc, AuthState>`
/// `ProviderNotFoundException` beradi.
Widget _wrap(AuthBloc bloc, AppRouter appRouter) {
  return BlocProvider.value(
    value: bloc,
    child: MaterialApp.router(routerConfig: appRouter.router),
  );
}
