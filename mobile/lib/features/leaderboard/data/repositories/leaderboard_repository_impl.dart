import 'package:dartz/dartz.dart';
import 'package:dio/dio.dart';

import '../../../../core/error/exceptions.dart';
import '../../../../core/error/failure.dart';
import '../../domain/entities/leaderboard.dart';
import '../../domain/repositories/leaderboard_repository.dart';
import '../datasources/leaderboard_remote_data_source.dart';

class LeaderboardRepositoryImpl implements LeaderboardRepository {
  const LeaderboardRepositoryImpl(this._remote);

  final LeaderboardRemoteDataSource _remote;

  /// Backend ruxsat beradigan qiymatlar (`users/views.py::ALLOWED`).
  static const allowedLimits = {10, 20, 50, 100};

  @override
  Future<Either<Failure, LeaderboardPage>> getLeaderboard({
    required LeaderboardPeriod period,
    int limit = 20,
  }) {
    // Ruxsat etilmagan limit backend tomonidan jimgina 10 ga tushiriladi —
    // buni oldindan to'g'rilab, kutilmagan natijadan saqlanamiz.
    final safeLimit = allowedLimits.contains(limit) ? limit : 20;

    return _guard(() async {
      final response = await _remote.getLeaderboard(
        period: period.apiValue,
        limit: safeLimit,
      );

      final entries = <LeaderboardEntry>[];
      for (var i = 0; i < response.users.length; i++) {
        final u = response.users[i];
        entries.add(LeaderboardEntry(
          // Backend `rank` ni faqat joriy foydalanuvchi uchun qaytaradi,
          // ro'yxatdagilar uchun tartib raqami = indeks + 1.
          rank: i + 1,
          telegramId: u.telegramId,
          name: u.visibleName,
          score: u.score,
        ));
      }

      return LeaderboardPage(
        entries: entries,
        myRank: response.rank,
        myScore: period == LeaderboardPeriod.monthly
            ? response.myMonthlyScore
            : 0,
      );
    });
  }

  @override
  Future<Either<Failure, LeaderboardPage>> getReferrals({
    required LeaderboardPeriod period,
  }) {
    return _guard(() async {
      final response = await _remote.getReferrals(period: period.apiValue);

      final entries = <LeaderboardEntry>[];
      for (var i = 0; i < response.referrers.length; i++) {
        final r = response.referrers[i];
        entries.add(LeaderboardEntry(
          rank: i + 1,
          telegramId: r.user.telegramId,
          name: r.user.visibleName,
          score: r.count,
        ));
      }

      // Taklif reytingida backend `rank` qaytarmaydi — o'z o'rnimizni
      // ro'yxatdan qidiramiz (topilmasa 0).
      return LeaderboardPage(
        entries: entries,
        myRank: 0,
        myScore: response.myCount,
      );
    });
  }

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
    } catch (e) {
      return Left(UnknownFailure('Kutilmagan xatolik: $e'));
    }
  }
}
