import 'package:dartz/dartz.dart';

import '../../../../core/error/failure.dart';
import '../entities/leaderboard.dart';

abstract class LeaderboardRepository {
  /// Ball reytingi.
  ///
  /// ⚠️ Backend `limit` uchun faqat {10, 20, 50, 100} qabul qiladi
  /// (`users/views.py::ALLOWED`). Boshqa qiymat jimgina 10 ga tushiriladi.
  Future<Either<Failure, LeaderboardPage>> getLeaderboard({
    required LeaderboardPeriod period,
    int limit = 20,
  });

  /// Taklif (referral) reytingi.
  Future<Either<Failure, LeaderboardPage>> getReferrals({
    required LeaderboardPeriod period,
  });
}
