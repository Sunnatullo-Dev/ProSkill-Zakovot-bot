import 'dart:io';

import 'package:dio/dio.dart';

import '../../error/exceptions.dart';

/// `DioException` ni ilova ichidagi aniq istisnolarga aylantiradi.
///
/// Shu sababli `data` qatlamidan yuqorida hech kim `DioException` bilan
/// ishlamaydi — repository faqat `ApiException` / `NetworkException` /
/// `TimeoutException` ko'radi.
class ErrorInterceptor extends Interceptor {
  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    final mapped = switch (err.type) {
      DioExceptionType.connectionTimeout ||
      DioExceptionType.sendTimeout ||
      DioExceptionType.receiveTimeout =>
        const TimeoutException(),
      DioExceptionType.connectionError => const NetworkException(),
      DioExceptionType.badCertificate =>
        const NetworkException('Xavfsiz ulanishni o\'rnatib bo\'lmadi'),
      DioExceptionType.cancel => err,
      DioExceptionType.badResponse => ApiException.fromResponse(
          err.response?.statusCode,
          err.response?.data,
        ),
      DioExceptionType.unknown =>
        err.error is SocketException ? const NetworkException() : err,
      // Dio'ning yangi versiyalarida qo'shiladigan turlar (masalan
      // `transformTimeout`) shu yerga tushadi — kutubxona yangilanganda
      // kompilyatsiya buzilmasin.
      _ => err,
    };

    if (mapped is DioException) {
      return handler.next(mapped);
    }

    handler.next(
      DioException(
        requestOptions: err.requestOptions,
        response: err.response,
        type: err.type,
        error: mapped,
        stackTrace: err.stackTrace,
      ),
    );
  }
}
