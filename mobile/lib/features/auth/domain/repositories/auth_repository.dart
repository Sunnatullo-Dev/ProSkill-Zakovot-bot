import 'package:dartz/dartz.dart';

import '../../../../core/error/failure.dart';
import '../entities/app_user.dart';
import '../entities/auth_session.dart';
import '../entities/telegram_challenge.dart';

/// Auth uchun domen shartnomasi.
///
/// Implementatsiya `data/repositories/auth_repository_impl.dart` da.
/// Presentation faqat shu interfeysni biladi — shuning uchun testda
/// uni mock qilish oson va backend almashsa UI o'zgarmaydi.
abstract class AuthRepository {
  /// Telefon + parol bilan ro'yxatdan o'tish.
  Future<Either<Failure, AuthSession>> register({
    required String phone,
    required String password,
    required String firstName,
    String? lastName,
    String? language,
  });

  /// Telegram orqali ro'yxatdan o'tish seansini boshlaydi.
  Future<Either<Failure, TelegramChallenge>> startTelegramRegister({
    required String phone,
    required String password,
    required String firstName,
    String? lastName,
    String? language,
  });

  /// Telegram bot yuborgan OTP bilan ro'yxatdan o'tishni yakunlaydi.
  Future<Either<Failure, AuthSession>> verifyTelegramRegister({
    required String sessionToken,
    required String otp,
  });

  /// Parolni unutganda Telegram orqali OTP so'rash.
  Future<Either<Failure, TelegramChallenge>> forgotPassword({
    required String identifier,
  });

  /// Telegram OTP va yangi parol bilan parolni tiklash.
  Future<Either<Failure, AuthSession>> resetPassword({
    required String sessionToken,
    required String otp,
    required String newPassword,
  });

  /// OTP kodini qayta yuborish.
  Future<Either<Failure, String>> resendOtp({
    required String sessionToken,
  });

  /// Telefon + parol bilan kirish.
  Future<Either<Failure, AuthSession>> login({
    required String phone,
    required String password,
  });

  /// Saqlangan token orqali sessiyani tiklash (ilova ochilganda).
  ///
  /// Token yo'q bo'lsa `UnauthorizedFailure` qaytaradi — bu XATO emas,
  /// shunchaki "kirilmagan" holat.
  Future<Either<Failure, AppUser>> restoreSession();

  /// Joriy profil (`/api/auth/me`).
  Future<Either<Failure, AppUser>> fetchMe();

  /// Chiqish — serverda refresh tokenni bekor qiladi va lokal xotirani tozalaydi.
  ///
  /// Server bilan aloqa bo'lmasa ham lokal tozalash BAJARILADI —
  /// foydalanuvchi baribir chiqa olishi kerak.
  Future<Either<Failure, Unit>> logout();

  /// Barcha qurilmalardan chiqish.
  Future<Either<Failure, Unit>> logoutAll();

  /// Parolni o'zgartirish (yangi tokenlar qaytadi).
  Future<Either<Failure, AuthSession>> changePassword({
    String? currentPassword,
    required String newPassword,
  });

  /// Ko'rsatiladigan ismni yangilash.
  Future<Either<Failure, AppUser>> updateDisplayName(String? displayName);

  /// Interfeys tilini yangilash.
  Future<Either<Failure, Unit>> updateLanguage(String language);

  /// Lokal: sessiya bormi (tarmoqqa chiqmasdan).
  bool get hasStoredSession;
}
