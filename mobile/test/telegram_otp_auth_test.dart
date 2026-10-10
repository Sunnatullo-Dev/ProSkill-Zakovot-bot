import 'package:dartz/dartz.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:zakovat/core/error/failure.dart';
import 'package:zakovat/core/router/app_routes.dart';
import 'package:zakovat/features/auth/domain/entities/app_user.dart';
import 'package:zakovat/features/auth/domain/entities/auth_session.dart';
import 'package:zakovat/features/auth/domain/entities/telegram_challenge.dart';
import 'package:zakovat/features/auth/domain/repositories/auth_repository.dart';
import 'package:zakovat/features/auth/domain/usecases/auth_usecases.dart';
import 'package:zakovat/features/auth/presentation/bloc/forgot_password_cubit.dart';
import 'package:zakovat/features/auth/presentation/bloc/login_cubit.dart' show FormStatus;
import 'package:zakovat/features/auth/presentation/bloc/register_cubit.dart';

class MockAuthRepository extends Mock implements AuthRepository {}

void main() {
  late MockAuthRepository mockRepo;
  late RegisterUseCase registerUseCase;
  late StartTelegramRegisterUseCase startRegisterUseCase;
  late VerifyTelegramRegisterUseCase verifyRegisterUseCase;
  late ForgotPasswordUseCase forgotPasswordUseCase;
  late ResetPasswordUseCase resetPasswordUseCase;
  late ResendOtpUseCase resendOtpUseCase;

  const sampleChallenge = TelegramChallenge(
    sessionToken: 'test_token_123',
    botUsername: 'ZakovatApp_bot',
    deepLink: 'https://t.me/ZakovatApp_bot?start=reg_test_token_123',
    expiresInSeconds: 600,
    message: 'Havola yuborildi',
  );

  const sampleUser = AppUser(
    id: '1',
    telegramId: 987654321,
    phone: '+998901234567',
    displayName: 'Amirxon',
    score: 0,
    language: 'uz-latn',
    currentStreak: 0,
    unlockedAchievements: [],
    authProvider: 'both',
    isAppAccount: false,
    hasPassword: true,
    isPremium: false,
  );

  const sampleTokens = AuthTokens(
    accessToken: 'access_abc',
    refreshToken: 'refresh_xyz',
    accessExpiresIn: 900,
    refreshExpiresIn: 2592000,
  );

  const sampleSession = AuthSession(
    user: sampleUser,
    isAdmin: false,
    tokens: sampleTokens,
  );

  setUp(() {
    mockRepo = MockAuthRepository();
    registerUseCase = RegisterUseCase(mockRepo);
    startRegisterUseCase = StartTelegramRegisterUseCase(mockRepo);
    verifyRegisterUseCase = VerifyTelegramRegisterUseCase(mockRepo);
    forgotPasswordUseCase = ForgotPasswordUseCase(mockRepo);
    resetPasswordUseCase = ResetPasswordUseCase(mockRepo);
    resendOtpUseCase = ResendOtpUseCase(mockRepo);
  });

  group('AppRoutes OTP public routes', () {
    test('OTP routes are public', () {
      expect(AppRoutes.isPublic(AppRoutes.registerVerify), isTrue);
      expect(AppRoutes.isPublic(AppRoutes.forgotPassword), isTrue);
      expect(AppRoutes.isPublic(AppRoutes.resetPassword), isTrue);
    });
  });

  group('RegisterCubit Telegram OTP', () {
    test('startRegistration success sets challenge in state', () async {
      when(() => mockRepo.startTelegramRegister(
            phone: any(named: 'phone'),
            password: any(named: 'password'),
            firstName: any(named: 'firstName'),
            lastName: any(named: 'lastName'),
            language: any(named: 'language'),
          )).thenAnswer((_) async => const Right(sampleChallenge));

      final cubit = RegisterCubit(
        registerUseCase,
        startTelegramRegister: startRegisterUseCase,
        verifyTelegramRegister: verifyRegisterUseCase,
        resendOtp: resendOtpUseCase,
      );

      final ok = await cubit.startRegistration(
        phone: '+998901234567',
        password: 'password123',
        firstName: 'Amirxon',
      );

      expect(ok, isTrue);
      expect(cubit.state.challenge, sampleChallenge);
      expect(cubit.state.status, FormStatus.idle);
      await cubit.close();
    });

    test('verifyOtp success sets session and status.success', () async {
      when(() => mockRepo.verifyTelegramRegister(
            sessionToken: any(named: 'sessionToken'),
            otp: any(named: 'otp'),
          )).thenAnswer((_) async => const Right(sampleSession));

      final cubit = RegisterCubit(
        registerUseCase,
        startTelegramRegister: startRegisterUseCase,
        verifyTelegramRegister: verifyRegisterUseCase,
        resendOtp: resendOtpUseCase,
      );

      final ok = await cubit.verifyOtp(
        sessionToken: 'test_token_123',
        otp: '123456',
      );

      expect(ok, isTrue);
      expect(cubit.state.session, sampleSession);
      expect(cubit.state.status, FormStatus.success);
      await cubit.close();
    });

    test('verifyOtp failure sets status.failure and errorMessage', () async {
      when(() => mockRepo.verifyTelegramRegister(
            sessionToken: any(named: 'sessionToken'),
            otp: any(named: 'otp'),
          )).thenAnswer((_) async => const Left(ValidationFailure('Kod noto\'g\'ri')));

      final cubit = RegisterCubit(
        registerUseCase,
        startTelegramRegister: startRegisterUseCase,
        verifyTelegramRegister: verifyRegisterUseCase,
        resendOtp: resendOtpUseCase,
      );

      final ok = await cubit.verifyOtp(
        sessionToken: 'test_token_123',
        otp: '000000',
      );

      expect(ok, isFalse);
      expect(cubit.state.status, FormStatus.failure);
      expect(cubit.state.errorMessage, 'Kod noto\'g\'ri');
      await cubit.close();
    });
  });

  group('ForgotPasswordCubit', () {
    test('sendRecoveryRequest success sets challenge', () async {
      when(() => mockRepo.forgotPassword(identifier: any(named: 'identifier')))
          .thenAnswer((_) async => const Right(sampleChallenge));

      final cubit = ForgotPasswordCubit(
        forgotPassword: forgotPasswordUseCase,
        resetPassword: resetPasswordUseCase,
        resendOtp: resendOtpUseCase,
      );

      final ok = await cubit.sendRecoveryRequest('+998901234567');
      expect(ok, isTrue);
      expect(cubit.state.challenge, sampleChallenge);
      await cubit.close();
    });

    test('resetPassword success sets session', () async {
      when(() => mockRepo.resetPassword(
            sessionToken: any(named: 'sessionToken'),
            otp: any(named: 'otp'),
            newPassword: any(named: 'newPassword'),
          )).thenAnswer((_) async => const Right(sampleSession));

      final cubit = ForgotPasswordCubit(
        forgotPassword: forgotPasswordUseCase,
        resetPassword: resetPasswordUseCase,
        resendOtp: resendOtpUseCase,
      );

      final ok = await cubit.resetPassword(
        sessionToken: 'test_token_123',
        otp: '123456',
        newPassword: 'newStrongPassword123',
      );
      expect(ok, isTrue);
      expect(cubit.state.session, sampleSession);
      expect(cubit.state.status, FormStatus.success);
      await cubit.close();
    });

    test('resendOtp returns confirmation message', () async {
      when(() => mockRepo.resendOtp(sessionToken: any(named: 'sessionToken')))
          .thenAnswer((_) async => const Right('Yangi kod yuborildi'));

      final cubit = ForgotPasswordCubit(
        forgotPassword: forgotPasswordUseCase,
        resetPassword: resetPasswordUseCase,
        resendOtp: resendOtpUseCase,
      );

      final msg = await cubit.resendOtp('test_token_123');
      expect(msg, 'Yangi kod yuborildi');
      await cubit.close();
    });
  });
}
