import 'package:dartz/dartz.dart';

import '../../../../core/error/failure.dart';
import '../entities/daily_challenge.dart';

/// Kunlik topshiriq shartnomasi.
///
/// Savollarga javob berish `QuizRepository` orqali ketadi — bilet oqimi
/// yakka o'yin bilan **bir xil** (`/api/answer/ticket` → `/api/answer`).
/// Bu yerda faqat kunlik topshiriqqa xos ikkita amal bor.
abstract class DailyRepository {
  /// Bugungi topshiriq: 5 savol + streak holati.
  ///
  /// Premium limiti tugagan bo'lsa `ForbiddenFailure`.
  Future<Either<Failure, DailyChallenge>> getToday();

  /// Topshiriqni yakunlaydi va streak bonusini oladi.
  ///
  /// ⚠️ To'g'ri javoblar soni va ball **kliyentdan yuborilmaydi** —
  /// backend ularni `daily_answers` jadvalidan o'zi hisoblaydi.
  /// Shu sababli hech qanday parametr yo'q.
  ///
  /// Xatolar:
  ///   * 409 — bugun allaqachon yakunlangan
  ///   * 403 — birorta ham savolga javob berilmagan
  Future<Either<Failure, DailyCompletion>> complete();
}
