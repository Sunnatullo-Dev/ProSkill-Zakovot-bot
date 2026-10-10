import 'package:dio/dio.dart';
import 'package:pretty_dio_logger/pretty_dio_logger.dart';

import '../config/app_config.dart';
import '../storage/token_store.dart';
import 'interceptors/auth_interceptor.dart';
import 'interceptors/error_interceptor.dart';

/// Ilovaning HTTP mijozini yig'adi.
///
/// Ikkita `Dio` yaratiladi:
///   * [refreshDio] — interceptorsiz (faqat `ErrorInterceptor`).
///     `/token/refresh` va 401 dan keyingi qayta urinish shu orqali ketadi.
///     Agar u ham `AuthInterceptor` ga ega bo'lsa — cheksiz rekursiya bo'lardi.
///   * [dio] — asosiy mijoz: auth + xato + log.
class DioFactory {
  const DioFactory._();

  static BaseOptions _baseOptions() => BaseOptions(
        baseUrl: AppConfig.apiBaseUrl,
        connectTimeout: AppConfig.connectTimeout,
        receiveTimeout: AppConfig.receiveTimeout,
        sendTimeout: AppConfig.sendTimeout,
        headers: const {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        // 4xx/5xx ni ham `onError` ga tushiramiz — bitta joyda ishlov beramiz.
        validateStatus: (status) => status != null && status >= 200 && status < 300,
        responseType: ResponseType.json,
      );

  /// Refresh va retry uchun — auth interceptorsiz.
  static Dio createRefreshDio() {
    final dio = Dio(_baseOptions());
    dio.interceptors.add(ErrorInterceptor());
    if (AppConfig.enableNetworkLogs) {
      dio.interceptors.add(_logger(name: 'REFRESH'));
    }
    return dio;
  }

  /// Asosiy mijoz.
  static Dio create({
    required TokenStore tokenStore,
    required Dio refreshDio,
    required Future<void> Function() onSessionExpired,
  }) {
    final dio = Dio(_baseOptions());

    dio.interceptors.addAll([
      AuthInterceptor(
        tokenStore: tokenStore,
        refreshDio: refreshDio,
        onSessionExpired: onSessionExpired,
      ),
      ErrorInterceptor(),
      if (AppConfig.enableNetworkLogs) _logger(),
    ]);

    return dio;
  }

  static PrettyDioLogger _logger({String name = 'API'}) => PrettyDioLogger(
        requestHeader: true,
        requestBody: true,
        responseBody: true,
        responseHeader: false,
        error: true,
        compact: true,
        maxWidth: 120,
        // Tokenlar logga tushmasin.
        filter: (options, args) => !options.path.contains('token'),
        logPrint: (obj) {
          // ignore: avoid_print
          print('[$name] $obj');
        },
      );
}
