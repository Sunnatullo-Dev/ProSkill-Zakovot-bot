import 'package:dartz/dartz.dart';
import 'package:dio/dio.dart';

import '../../../../core/error/exceptions.dart';
import '../../../../core/error/failure.dart';
import '../../../../core/storage/prefs_store.dart';
import '../../../../core/storage/token_store.dart';
import '../../domain/entities/app_user.dart';
import '../../domain/entities/auth_session.dart';
import '../../domain/entities/telegram_challenge.dart';
import '../../domain/repositories/auth_repository.dart';
import '../datasources/auth_remote_data_source.dart';
import '../models/auth_response_model.dart';

/// `AuthRepository` implementatsiyasi.
///
/// Vazifasi:
///   1. `AuthRemoteDataSource` ni chaqirish
///   2. Istisnolarni `Failure` ga aylantirish
///   3. Tokenlarni `TokenStore` ga yozish/o'chirish
///   4. DTO → domen entity
class AuthRepositoryImpl implements AuthRepository {
  AuthRepositoryImpl({
    required AuthRemoteDataSource remote,
    required TokenStore tokenStore,
    required PrefsStore prefs,
  })  : _remote = remote,
        _tokens = tokenStore,
        _prefs = prefs;

  final AuthRemoteDataSource _remote;
  final TokenStore _tokens;
  final PrefsStore _prefs;

  @override
  bool get hasStoredSession => _tokens.hasSession;

  // ─── Ro'yxatdan o'tish ────────────────────────────────────────────────────

  @override
  Future<Either<Failure, AuthSession>> register({
    required String phone,
    required String password,
    required String firstName,
    String? lastName,
    String? language,
  }) {
    return _guard(() async {
      final response = await _remote.register({
        'phone': phone,
        'password': password,
        'firstName': firstName,
        if (lastName != null && lastName.trim().isNotEmpty)
          'lastName': lastName.trim(),
        'language': ?language,
      });
      await _persist(response);
      await _prefs.setLastPhone(response.user.phone);
      return response.toEntity();
    });
  }

  @override
  Future<Either<Failure, TelegramChallenge>> startTelegramRegister({
    required String phone,
    required String password,
    required String firstName,
    String? lastName,
    String? language,
  }) {
    return _guard(() async {
      final data = await _remote.startTelegramRegister({
        'phone': phone,
        'password': password,
        'firstName': firstName,
        if (lastName != null && lastName.trim().isNotEmpty)
          'lastName': lastName.trim(),
        'language': ?language,
      });
      return TelegramChallenge.fromJson(data);
    });
  }

  @override
  Future<Either<Failure, AuthSession>> verifyTelegramRegister({
    required String sessionToken,
    required String otp,
  }) {
    return _guard(() async {
      final response = await _remote.verifyTelegramRegister({
        'sessionToken': sessionToken,
        'otp': otp,
      });
      await _persist(response);
      await _prefs.setLastPhone(response.user.phone);
      return response.toEntity();
    });
  }

  @override
  Future<Either<Failure, TelegramChallenge>> forgotPassword({
    required String identifier,
  }) {
    return _guard(() async {
      final data = await _remote.forgotPassword({
        'identifier': identifier,
      });
      return TelegramChallenge.fromJson(data);
    });
  }

  @override
  Future<Either<Failure, AuthSession>> resetPassword({
    required String sessionToken,
    required String otp,
    required String newPassword,
  }) {
    return _guard(() async {
      final response = await _remote.resetPassword({
        'sessionToken': sessionToken,
        'otp': otp,
        'newPassword': newPassword,
      });
      await _persist(response);
      await _prefs.setLastPhone(response.user.phone);
      return response.toEntity();
    });
  }

  @override
  Future<Either<Failure, String>> resendOtp({
    required String sessionToken,
  }) {
    return _guard(() async {
      final data = await _remote.resendTelegramOtp({
        'sessionToken': sessionToken,
      });
      return data['message'] as String? ?? 'Kodni qayta yuborildi';
    });
  }

  // ─── Kirish ───────────────────────────────────────────────────────────────

  @override
  Future<Either<Failure, AuthSession>> login({
    required String phone,
    required String password,
  }) {
    return _guard(() async {
      final response = await _remote.login({
        'phone': phone,
        'password': password,
      });
      await _persist(response);
      await _prefs.setLastPhone(response.user.phone);
      return response.toEntity();
    });
  }

  // ─── Sessiyani tiklash ────────────────────────────────────────────────────

  @override
  Future<Either<Failure, AppUser>> restoreSession() async {
    if (!_tokens.hasSession) {
      return const Left(UnauthorizedFailure('Kirilmagan'));
    }
    // `AuthInterceptor` access token eskirgan bo'lsa avtomatik yangilaydi,
    // shuning uchun bu yerda faqat `/me` ni chaqirish yetarli.
    return fetchMe();
  }

  @override
  Future<Either<Failure, AppUser>> fetchMe() {
    return _guard(() async {
      final response = await _remote.me();
      return response.user.toEntity();
    });
  }

  // ─── Chiqish ──────────────────────────────────────────────────────────────

  @override
  Future<Either<Failure, Unit>> logout() async {
    final refresh = _tokens.refreshToken;

    // Serverga xabar berishga urinamiz, lekin natijasi MUHIM EMAS:
    // foydalanuvchi internetsiz ham chiqa olishi kerak.
    if (refresh != null && refresh.isNotEmpty) {
      try {
        await _remote.logout({'refreshToken': refresh});
      } catch (_) {
        // jim o'tamiz
      }
    }

    await _clearLocal();
    return const Right(unit);
  }

  @override
  Future<Either<Failure, Unit>> logoutAll() async {
    final result = await _guard(() async {
      await _remote.logoutAll();
      return unit;
    });
    // Muvaffaqiyatli bo'lsa ham, bo'lmasa ham lokal sessiyani tozalaymiz.
    await _clearLocal();
    return result.fold((failure) => Left(failure), (_) => const Right(unit));
  }

  // ─── Parol ────────────────────────────────────────────────────────────────

  @override
  Future<Either<Failure, AuthSession>> changePassword({
    String? currentPassword,
    required String newPassword,
  }) {
    return _guard(() async {
      final response = await _remote.changePassword({
        'currentPassword': ?currentPassword,
        'newPassword': newPassword,
      });
      // Backend eski tokenlarni bekor qildi va yangilarini qaytardi.
      await _persist(response);
      return response.toEntity();
    });
  }

  // ─── Profil ───────────────────────────────────────────────────────────────

  @override
  Future<Either<Failure, AppUser>> updateDisplayName(String? displayName) {
    return _guard(() async {
      final response = await _remote.updateMe({'displayName': displayName});
      return response.user.toEntity();
    });
  }

  @override
  Future<Either<Failure, Unit>> updateLanguage(String language) {
    return _guard(() async {
      await _remote.updateLanguage({'language': language});
      await _prefs.setLanguage(language);
      return unit;
    });
  }

  // ─── Ichki yordamchilar ───────────────────────────────────────────────────

  Future<void> _persist(AuthResponseModel response) async {
    await _tokens.save(
      accessToken: response.tokens.accessToken,
      refreshToken: response.tokens.refreshToken,
      accessExpiresInSeconds: response.tokens.accessExpiresIn,
    );
  }

  Future<void> _clearLocal() async {
    await _tokens.clear();
    await _prefs.clearUserScoped();
  }

  /// Barcha istisnolarni `Failure` ga aylantiradigan yagona joy.
  ///
  /// Shuning uchun har bir metodda `try/catch` takrorlanmaydi va
  /// yangi metod qo'shilganda xato boshqaruvini unutib bo'lmaydi.
  Future<Either<Failure, T>> _guard<T>(Future<T> Function() action) async {
    try {
      return Right(await action());
    } on DioException catch (e) {
      final inner = e.error;
      if (inner is ApiException) return Left(inner.toFailure());
      if (inner is NetworkException) return Left(NetworkFailure(inner.message));
      if (inner is TimeoutException) return Left(TimeoutFailure(inner.message));
      return Left(UnknownFailure(e.message ?? 'So\'rov bajarilmadi'));
    } on ApiException catch (e) {
      return Left(e.toFailure());
    } on NetworkException catch (e) {
      return Left(NetworkFailure(e.message));
    } on TimeoutException catch (e) {
      return Left(TimeoutFailure(e.message));
    } on CacheException catch (e) {
      return Left(CacheFailure(e.message));
    } catch (e) {
      return Left(UnknownFailure('Kutilmagan xatolik: $e'));
    }
  }
}
