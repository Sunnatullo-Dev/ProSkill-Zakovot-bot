import 'dart:async';

import 'package:dio/dio.dart';

import '../../storage/token_store.dart';
import '../api_paths.dart';

/// Har so'rovga `Authorization: Bearer <access>` qo'shadi va token
/// eskirganda uni avtomatik yangilaydi.
///
/// ## Yechilgan asosiy muammo: "thundering herd" refresh
///
/// Bosh ekran ochilganda 5-6 ta so'rov bir vaqtda ketadi. Agar access token
/// eskirgan bo'lsa, sodda implementatsiyada ularning HAMMASI bir vaqtda
/// `/token/refresh` ga uradi. Backend refresh'ni ROTATSIYA qiladi (eski token
/// darhol bekor bo'ladi) — natijada birinchi so'rov muvaffaqiyatli bo'ladi,
/// qolganlari 401 oladi va foydalanuvchi tizimdan chiqib ketadi.
///
/// Yechim — **single-flight**: bir vaqtning o'zida faqat BITTA refresh
/// bajariladi, qolganlari o'sha `Future` ni kutadi.
///
/// ## Ikkinchi muammo: interceptor rekursiyasi
///
/// Refresh so'rovi asosiy `Dio` orqali ketsa, u yana shu interceptorga
/// tushadi. Shuning uchun refresh uchun ALOHIDA, interceptorsiz `Dio`
/// ishlatiladi.
class AuthInterceptor extends Interceptor {
  AuthInterceptor({
    required TokenStore tokenStore,
    required Dio refreshDio,
    required Future<void> Function() onSessionExpired,
  })  : _tokens = tokenStore,
        _refreshDio = refreshDio,
        _onSessionExpired = onSessionExpired;

  final TokenStore _tokens;

  /// Interceptorsiz Dio — faqat `/token/refresh` uchun.
  final Dio _refreshDio;

  /// Refresh ham muvaffaqiyatsiz bo'lganda chaqiriladi (majburiy logout).
  final Future<void> Function() _onSessionExpired;

  /// Ayni damdagi refresh operatsiyasi (single-flight qulfi).
  Future<bool>? _inFlightRefresh;

  static const _retriedFlag = 'zakovat_retried';

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    if (ApiPaths.isPublic(options.path)) {
      return handler.next(options);
    }

    // Proaktiv yangilash: token muddati tugagan bo'lsa 401 kutib
    // o'tirmasdan, so'rovdan OLDIN yangilaymiz. Bu bitta ortiqcha
    // round-trip'ni tejaydi.
    if (_tokens.isAccessExpired() && _tokens.refreshToken != null) {
      await _refreshOnce();
    }

    final token = _tokens.accessToken;
    if (token != null && token.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    final response = err.response;
    final options = err.requestOptions;

    final isUnauthorized = response?.statusCode == 401;
    final isPublic = ApiPaths.isPublic(options.path);
    final alreadyRetried = options.extra[_retriedFlag] == true;

    if (!isUnauthorized || isPublic || alreadyRetried) {
      return handler.next(err);
    }

    if (_tokens.refreshToken == null) {
      await _onSessionExpired();
      return handler.next(err);
    }

    final refreshed = await _refreshOnce();
    if (!refreshed) {
      return handler.next(err);
    }

    // Tokenni yangiladik — so'rovni BIR MARTA qayta yuboramiz.
    try {
      final retryOptions = options
        ..extra[_retriedFlag] = true
        ..headers['Authorization'] = 'Bearer ${_tokens.accessToken}';

      final retryResponse = await _refreshDio.fetch<dynamic>(retryOptions);
      return handler.resolve(retryResponse);
    } on DioException catch (retryError) {
      return handler.next(retryError);
    }
  }

  /// Bir vaqtda faqat bitta refresh bajarilishini kafolatlaydi.
  Future<bool> _refreshOnce() {
    return _inFlightRefresh ??= _performRefresh().whenComplete(() {
      _inFlightRefresh = null;
    });
  }

  Future<bool> _performRefresh() async {
    final refreshToken = _tokens.refreshToken;
    if (refreshToken == null || refreshToken.isEmpty) {
      await _onSessionExpired();
      return false;
    }

    try {
      final response = await _refreshDio.post<Map<String, dynamic>>(
        ApiPaths.tokenRefresh,
        data: {'refreshToken': refreshToken},
      );

      final tokens = response.data?['tokens'] as Map<String, dynamic>?;
      final access = tokens?['accessToken'] as String?;
      final refresh = tokens?['refreshToken'] as String?;
      final expiresIn = tokens?['accessExpiresIn'];

      if (access == null || refresh == null) {
        await _onSessionExpired();
        return false;
      }

      await _tokens.save(
        accessToken: access,
        refreshToken: refresh,
        accessExpiresInSeconds:
            expiresIn is int ? expiresIn : int.tryParse('$expiresIn') ?? 1800,
      );
      return true;
    } on DioException catch (e) {
      final status = e.response?.statusCode;
      // 401/403 — refresh token ham yaroqsiz: majburiy chiqish.
      // Tarmoq xatosi bo'lsa sessiyani O'CHIRMAYMIZ — foydalanuvchi
      // internetsiz qolgan bo'lishi mumkin, keyin qayta urinadi.
      if (status == 401 || status == 403) {
        await _onSessionExpired();
      }
      return false;
    } catch (_) {
      return false;
    }
  }
}
