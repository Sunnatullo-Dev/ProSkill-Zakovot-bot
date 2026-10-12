import 'package:dartz/dartz.dart';
import 'package:equatable/equatable.dart';

import '../../../../core/error/failure.dart';
import '../../../../core/usecase/usecase.dart';
import '../entities/app_user.dart';
import '../entities/auth_session.dart';
import '../entities/telegram_challenge.dart';
import '../repositories/auth_repository.dart';

/// Auth use-case'lari bitta faylda — ular kichik va bir-biriga bog'liq.
/// Har birini alohida faylga ajratish bu yerda faqat shovqin qo'shardi.

// ─── Ro'yxatdan o'tish ────────────────────────────────────────────────────────

class RegisterParams extends Equatable {
  const RegisterParams({
    required this.phone,
    required this.password,
    required this.firstName,
    this.lastName,
    this.language,
  });

  final String phone;
  final String password;
  final String firstName;
  final String? lastName;
  final String? language;

  @override
  List<Object?> get props => [phone, password, firstName, lastName, language];
}

class RegisterUseCase implements UseCase<AuthSession, RegisterParams> {
  const RegisterUseCase(this._repository);
  final AuthRepository _repository;

  @override
  Future<Either<Failure, AuthSession>> call(RegisterParams params) {
    return _repository.register(
      phone: params.phone,
      password: params.password,
      firstName: params.firstName,
      lastName: params.lastName,
      language: params.language,
    );
  }
}

// ─── Kirish ──────────────────────────────────────────────────────────────────

class LoginParams extends Equatable {
  const LoginParams({required this.phone, required this.password});

  final String phone;
  final String password;

  @override
  List<Object?> get props => [phone, password];
}

class LoginUseCase implements UseCase<AuthSession, LoginParams> {
  const LoginUseCase(this._repository);
  final AuthRepository _repository;

  @override
  Future<Either<Failure, AuthSession>> call(LoginParams params) {
    return _repository.login(phone: params.phone, password: params.password);
  }
}

// ─── Sessiyani tiklash ───────────────────────────────────────────────────────

class RestoreSessionUseCase implements UseCase<AppUser, NoParams> {
  const RestoreSessionUseCase(this._repository);
  final AuthRepository _repository;

  @override
  Future<Either<Failure, AppUser>> call(NoParams params) =>
      _repository.restoreSession();
}

// ─── Chiqish ─────────────────────────────────────────────────────────────────

class LogoutUseCase implements UseCase<Unit, NoParams> {
  const LogoutUseCase(this._repository);
  final AuthRepository _repository;

  @override
  Future<Either<Failure, Unit>> call(NoParams params) => _repository.logout();
}

// ─── Parolni o'zgartirish ────────────────────────────────────────────────────

class ChangePasswordParams extends Equatable {
  const ChangePasswordParams({
    this.currentPassword,
    required this.newPassword,
  });

  final String? currentPassword;
  final String newPassword;

  @override
  List<Object?> get props => [currentPassword, newPassword];
}

class ChangePasswordUseCase implements UseCase<AuthSession, ChangePasswordParams> {
  const ChangePasswordUseCase(this._repository);
  final AuthRepository _repository;

  @override
  Future<Either<Failure, AuthSession>> call(ChangePasswordParams params) {
    return _repository.changePassword(
      currentPassword: params.currentPassword,
      newPassword: params.newPassword,
    );
  }
}

// ─── Profilni yangilash ──────────────────────────────────────────────────────

class UpdateDisplayNameUseCase implements UseCase<AppUser, String?> {
  const UpdateDisplayNameUseCase(this._repository);
  final AuthRepository _repository;

  @override
  Future<Either<Failure, AppUser>> call(String? displayName) =>
      _repository.updateDisplayName(displayName);
}

// ─── Telegram OTP Registratsiya va Parol Tiklash ─────────────────────────────

class StartTelegramRegisterUseCase
    implements UseCase<TelegramChallenge, RegisterParams> {
  const StartTelegramRegisterUseCase(this._repository);
  final AuthRepository _repository;

  @override
  Future<Either<Failure, TelegramChallenge>> call(RegisterParams params) {
    return _repository.startTelegramRegister(
      phone: params.phone,
      password: params.password,
      firstName: params.firstName,
      lastName: params.lastName,
      language: params.language,
    );
  }
}

class VerifyTelegramRegisterParams extends Equatable {
  const VerifyTelegramRegisterParams({
    required this.sessionToken,
    required this.otp,
  });

  final String sessionToken;
  final String otp;

  @override
  List<Object?> get props => [sessionToken, otp];
}

class VerifyTelegramRegisterUseCase
    implements UseCase<AuthSession, VerifyTelegramRegisterParams> {
  const VerifyTelegramRegisterUseCase(this._repository);
  final AuthRepository _repository;

  @override
  Future<Either<Failure, AuthSession>> call(
    VerifyTelegramRegisterParams params,
  ) {
    return _repository.verifyTelegramRegister(
      sessionToken: params.sessionToken,
      otp: params.otp,
    );
  }
}

class ForgotPasswordUseCase implements UseCase<TelegramChallenge, String> {
  const ForgotPasswordUseCase(this._repository);
  final AuthRepository _repository;

  @override
  Future<Either<Failure, TelegramChallenge>> call(String identifier) {
    return _repository.forgotPassword(identifier: identifier);
  }
}

class ResetPasswordParams extends Equatable {
  const ResetPasswordParams({
    required this.sessionToken,
    required this.otp,
    required this.newPassword,
  });

  final String sessionToken;
  final String otp;
  final String newPassword;

  @override
  List<Object?> get props => [sessionToken, otp, newPassword];
}

class ResetPasswordUseCase
    implements UseCase<AuthSession, ResetPasswordParams> {
  const ResetPasswordUseCase(this._repository);
  final AuthRepository _repository;

  @override
  Future<Either<Failure, AuthSession>> call(ResetPasswordParams params) {
    return _repository.resetPassword(
      sessionToken: params.sessionToken,
      otp: params.otp,
      newPassword: params.newPassword,
    );
  }
}

class ResendOtpUseCase implements UseCase<String, String> {
  const ResendOtpUseCase(this._repository);
  final AuthRepository _repository;

  @override
  Future<Either<Failure, String>> call(String sessionToken) {
    return _repository.resendOtp(sessionToken: sessionToken);
  }
}
