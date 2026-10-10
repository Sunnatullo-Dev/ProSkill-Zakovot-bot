import 'failure.dart';

/// `data` qatlamida ko'tariladigan istisnolar.
///
/// `ErrorInterceptor` `DioException` ni shularga aylantiradi,
/// repository esa ularni `Failure` ga o'giradi.
class ApiException implements Exception {
  const ApiException({
    required this.message,
    required this.statusCode,
    this.fieldErrors = const {},
  });

  final String message;
  final int? statusCode;
  final Map<String, String> fieldErrors;

  /// Backend `{"message": "..."}` formatida javob beradi (`AppError`).
  factory ApiException.fromResponse(int? status, dynamic body) {
    var message = _defaultMessageFor(status);
    final fieldErrors = <String, String>{};

    if (body is Map) {
      final raw = body['message'] ?? body['detail'] ?? body['error'];
      if (raw is String && raw.trim().isNotEmpty) {
        message = raw.trim();
      }
      // DRF serializer uslubidagi maydon xatolari: {"phone": ["..."]}
      body.forEach((key, value) {
        if (key == 'message' || key == 'detail' || key == 'error') return;
        if (value is List && value.isNotEmpty) {
          fieldErrors['$key'] = '${value.first}';
        } else if (value is String) {
          fieldErrors['$key'] = value;
        }
      });
    }

    return ApiException(
      message: message,
      statusCode: status,
      fieldErrors: fieldErrors,
    );
  }

  static String _defaultMessageFor(int? status) => switch (status) {
        400 => 'Ma\'lumotlar noto\'g\'ri',
        401 => 'Sessiya tugadi, qaytadan kiring',
        403 => 'Ruxsat yo\'q',
        404 => 'Topilmadi',
        409 => 'Bu amal hozir bajarilmaydi',
        429 => 'Juda ko\'p urinish. Biroz kuting.',
        final int s when s >= 500 => 'Serverda xatolik yuz berdi',
        _ => 'Noma\'lum xatolik',
      };

  /// Domen qatlamiga o'tkazish.
  Failure toFailure() => switch (statusCode) {
        400 => ValidationFailure(message, fieldErrors: fieldErrors),
        401 => UnauthorizedFailure(message),
        403 => ForbiddenFailure(message),
        404 => NotFoundFailure(message),
        409 => ConflictFailure(message),
        429 => RateLimitFailure(message),
        final int s when s >= 500 => ServerFailure(message, s),
        _ => UnknownFailure(message),
      };

  @override
  String toString() => 'ApiException($statusCode): $message';
}

/// Internet yo'q / DNS xatosi / ulanish uzildi.
class NetworkException implements Exception {
  const NetworkException([this.message = 'Internet aloqasi yo\'q']);
  final String message;

  @override
  String toString() => 'NetworkException: $message';
}

/// So'rov taymauti.
class TimeoutException implements Exception {
  const TimeoutException([this.message = 'Server javob bermadi']);
  final String message;

  @override
  String toString() => 'TimeoutException: $message';
}

/// Lokal xotira xatosi.
class CacheException implements Exception {
  const CacheException([this.message = 'Ma\'lumotni o\'qib bo\'lmadi']);
  final String message;

  @override
  String toString() => 'CacheException: $message';
}
