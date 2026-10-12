import 'package:equatable/equatable.dart';

/// Domen qatlamidagi xato — UI shu turlarga qarab xabar ko'rsatadi.
///
/// Qoida: `Exception` faqat `data` qatlamida yashaydi; `domain` va
/// `presentation` faqat `Failure` ko'radi. Shu sababli UI hech qachon
/// `DioException` yoki `SocketException` bilan ishlashi shart emas.
sealed class Failure extends Equatable {
  const Failure(this.message, {this.code});

  /// Foydalanuvchiga ko'rsatiladigan xabar (o'zbek tilida).
  final String message;

  /// HTTP status yoki ichki kod — logika uchun.
  final int? code;

  @override
  List<Object?> get props => [message, code];

  @override
  String toString() => '$runtimeType($code): $message';
}

/// Tarmoq yo'q yoki ulanib bo'lmadi.
class NetworkFailure extends Failure {
  const NetworkFailure([super.message = 'Internet aloqasi yo\'q']);
}

/// So'rov vaqti tugadi.
class TimeoutFailure extends Failure {
  const TimeoutFailure([super.message = 'Server javob bermadi, qaytadan urinib ko\'ring']);
}

/// Server 5xx qaytardi.
class ServerFailure extends Failure {
  const ServerFailure([
    super.message = 'Serverda xatolik yuz berdi',
    int? code,
  ]) : super(code: code);
}

/// 400 — noto'g'ri ma'lumot yuborildi.
class ValidationFailure extends Failure {
  const ValidationFailure(super.message, {this.fieldErrors = const {}})
      : super(code: 400);

  /// Maydon nomi → xato xabari (backend bersa).
  final Map<String, String> fieldErrors;

  @override
  List<Object?> get props => [message, code, fieldErrors];
}

/// 401 — autentifikatsiya kerak yoki token yaroqsiz.
class UnauthorizedFailure extends Failure {
  const UnauthorizedFailure([super.message = 'Sessiya tugadi, qaytadan kiring'])
      : super(code: 401);
}

/// 403 — huquq yetarli emas (yoki premium limit tugadi).
class ForbiddenFailure extends Failure {
  const ForbiddenFailure(super.message) : super(code: 403);
}

/// 404
class NotFoundFailure extends Failure {
  const NotFoundFailure([super.message = 'Topilmadi']) : super(code: 404);
}

/// 409 — mantiqiy to'qnashuv (allaqachon mavjud, allaqachon boshlangan…).
class ConflictFailure extends Failure {
  const ConflictFailure(super.message) : super(code: 409);
}

/// 429 — juda ko'p so'rov.
class RateLimitFailure extends Failure {
  const RateLimitFailure([
    super.message = 'Juda ko\'p urinish. Biroz kuting.',
  ]) : super(code: 429);
}

/// Lokal xotira (secure storage / prefs) bilan bog'liq xato.
class CacheFailure extends Failure {
  const CacheFailure([super.message = 'Ma\'lumotni o\'qib bo\'lmadi']);
}

/// Kutilmagan xato.
class UnknownFailure extends Failure {
  const UnknownFailure([super.message = 'Noma\'lum xatolik']);
}
