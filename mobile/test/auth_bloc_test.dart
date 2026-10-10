import 'package:bloc_test/bloc_test.dart';
import 'package:dartz/dartz.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:zakovat/core/error/failure.dart';
import 'package:zakovat/core/storage/prefs_store.dart';
import 'package:zakovat/core/usecase/usecase.dart';
import 'package:zakovat/features/auth/domain/entities/app_user.dart';
import 'package:zakovat/features/auth/domain/entities/auth_session.dart';
import 'package:zakovat/features/auth/domain/repositories/auth_repository.dart';
import 'package:zakovat/features/auth/domain/usecases/auth_usecases.dart';
import 'package:zakovat/features/auth/presentation/bloc/auth_bloc.dart';

class _MockRestoreSession extends Mock implements RestoreSessionUseCase {}

class _MockLogout extends Mock implements LogoutUseCase {}

class _MockRepository extends Mock implements AuthRepository {}

class _MockPrefs extends Mock implements PrefsStore {}

const _user = AppUser(
  id: '1',
  telegramId: 2000000000001,
  score: 120,
  language: 'uz-latn',
  currentStreak: 3,
  authProvider: 'phone',
  isAppAccount: true,
  hasPassword: true,
  isPremium: false,
  firstName: 'Amirxon',
  phone: '+998901234567',
);

void main() {
  late _MockRestoreSession restoreSession;
  late _MockLogout logout;
  late _MockRepository repository;
  late _MockPrefs prefs;

  setUpAll(() {
    registerFallbackValue(const NoParams());
  });

  setUp(() {
    restoreSession = _MockRestoreSession();
    logout = _MockLogout();
    repository = _MockRepository();
    prefs = _MockPrefs();

    when(() => prefs.onboardingDone).thenReturn(true);
    when(() => prefs.setOnboardingDone(any())).thenAnswer((_) async {});
  });

  AuthBloc build() => AuthBloc(
        restoreSession: restoreSession,
        logout: logout,
        repository: repository,
        prefs: prefs,
      );

  group('AuthStarted', () {
    blocTest<AuthBloc, AuthState>(
      'saqlangan token yo\'q — tarmoqqa chiqmaydi',
      setUp: () => when(() => repository.hasStoredSession).thenReturn(false),
      build: build,
      act: (bloc) => bloc.add(const AuthStarted()),
      expect: () => [
        isA<AuthState>()
            .having((s) => s.status, 'status', AuthStatus.unauthenticated),
      ],
      verify: (_) => verifyNever(() => restoreSession(any())),
    );

    blocTest<AuthBloc, AuthState>(
      'token bor va yaroqli — authenticated',
      setUp: () {
        when(() => repository.hasStoredSession).thenReturn(true);
        when(() => restoreSession(any()))
            .thenAnswer((_) async => const Right(_user));
      },
      build: build,
      act: (bloc) => bloc.add(const AuthStarted()),
      expect: () => [
        isA<AuthState>().having((s) => s.status, 'status', AuthStatus.checking),
        isA<AuthState>()
            .having((s) => s.status, 'status', AuthStatus.authenticated)
            .having((s) => s.user, 'user', _user),
      ],
    );

    blocTest<AuthBloc, AuthState>(
      '401 — sessiya bekor qilinadi',
      setUp: () {
        when(() => repository.hasStoredSession).thenReturn(true);
        when(() => restoreSession(any())).thenAnswer(
          (_) async => const Left(UnauthorizedFailure()),
        );
      },
      build: build,
      act: (bloc) => bloc.add(const AuthStarted()),
      expect: () => [
        isA<AuthState>().having((s) => s.status, 'status', AuthStatus.checking),
        isA<AuthState>()
            .having((s) => s.status, 'status', AuthStatus.unauthenticated)
            .having((s) => s.message, 'message', isNull),
      ],
    );

    blocTest<AuthBloc, AuthState>(
      'tarmoq xatosi — foydalanuvchiga xabar ko\'rsatiladi',
      setUp: () {
        when(() => repository.hasStoredSession).thenReturn(true);
        when(() => restoreSession(any())).thenAnswer(
          (_) async => const Left(NetworkFailure()),
        );
      },
      build: build,
      act: (bloc) => bloc.add(const AuthStarted()),
      expect: () => [
        isA<AuthState>().having((s) => s.status, 'status', AuthStatus.checking),
        isA<AuthState>()
            .having((s) => s.status, 'status', AuthStatus.unauthenticated)
            .having((s) => s.message, 'message', isNotNull),
      ],
    );
  });

  group('AuthSessionGranted', () {
    blocTest<AuthBloc, AuthState>(
      'login natijasini qabul qiladi',
      build: build,
      act: (bloc) => bloc.add(
        const AuthSessionGranted(
          AuthSession(
            user: _user,
            isAdmin: true,
            tokens: AuthTokens(
              accessToken: 'a',
              refreshToken: 'r',
              accessExpiresIn: 1800,
              refreshExpiresIn: 5184000,
            ),
          ),
        ),
      ),
      expect: () => [
        isA<AuthState>()
            .having((s) => s.status, 'status', AuthStatus.authenticated)
            .having((s) => s.isAdmin, 'isAdmin', true),
      ],
    );
  });

  group('AuthLogoutRequested', () {
    blocTest<AuthBloc, AuthState>(
      'chiqishda unauthenticated bo\'ladi',
      setUp: () => when(() => logout(any()))
          .thenAnswer((_) async => const Right(unit)),
      build: build,
      seed: () => const AuthState.authenticated(user: _user),
      act: (bloc) => bloc.add(const AuthLogoutRequested()),
      expect: () => [
        isA<AuthState>().having((s) => s.status, 'status', AuthStatus.checking),
        isA<AuthState>()
            .having((s) => s.status, 'status', AuthStatus.unauthenticated),
      ],
      verify: (_) => verify(() => logout(any())).called(1),
    );
  });

  group('AuthSessionExpired', () {
    blocTest<AuthBloc, AuthState>(
      'interceptor chaqirganda xabar bilan chiqaradi',
      build: build,
      seed: () => const AuthState.authenticated(user: _user),
      act: (bloc) => bloc.add(const AuthSessionExpired()),
      expect: () => [
        isA<AuthState>()
            .having((s) => s.status, 'status', AuthStatus.unauthenticated)
            .having((s) => s.message, 'message', contains('Sessiya tugadi')),
      ],
    );
  });
}
