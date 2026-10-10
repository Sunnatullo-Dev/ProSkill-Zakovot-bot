import 'package:dartz/dartz.dart';
import 'package:dio/dio.dart';

import '../../../../core/error/exceptions.dart';
import '../../../../core/error/failure.dart';
import '../../../auth/domain/entities/app_user.dart';
import '../../domain/entities/answer_outcome.dart';
import '../../domain/entities/quiz_question.dart';
import '../../domain/repositories/quiz_repository.dart';
import '../datasources/quiz_remote_data_source.dart';

class QuizRepositoryImpl implements QuizRepository {
  const QuizRepositoryImpl(this._remote);

  final QuizRemoteDataSource _remote;

  /// Backend qabul qiladigan garov qiymatlari (`answers/views.py::VALID_BETS`).
  static const validBets = <int>{0, 5, 10, 20, 50};

  @override
  Future<Either<Failure, List<QuizQuestion>>> getRound({
    int count = 10,
    String? category,
    String? difficulty,
  }) {
    return _guard(() async {
      final response = await _remote.getRound(
        count: count.clamp(1, 20),
        category: category,
        difficulty: difficulty,
      );
      return response.questions
          .map((q) => q.toEntity())
          .toList(growable: false);
    });
  }

  @override
  Future<Either<Failure, String>> issueTicket(String questionId) {
    return _guard(() async {
      final response = await _remote.issueTicket({'questionId': questionId});
      return response.ticket;
    });
  }

  @override
  Future<Either<Failure, AnswerOutcome>> submitAnswer({
    required String ticket,
    required String userAnswer,
    int betAmount = 0,
  }) {
    // Kliyent tomonida ham tekshiramiz — serverga aniq 400 olib boradigan
    // so'rov yubormaslik uchun.
    if (!validBets.contains(betAmount)) {
      return Future.value(
        const Left(ValidationFailure('Garov faqat 0, 5, 10, 20 yoki 50 bo\'lishi mumkin')),
      );
    }

    return _guard(() async {
      final response = await _remote.submitAnswer({
        'ticket': ticket,
        'userAnswer': userAnswer,
        'betAmount': betAmount,
      });
      return response.toEntity();
    });
  }

  @override
  Future<Either<Failure, RevealedAnswer>> revealAnswer(String ticket) {
    return _guard(() async {
      final response = await _remote.reveal({'ticket': ticket});
      return response.toEntity();
    });
  }

  @override
  Future<Either<Failure, Unit>> saveResult({
    required int correctCount,
    required int totalCount,
    required int roundScore,
  }) {
    return _guard(() async {
      await _remote.saveResult({
        'correctCount': correctCount,
        'totalCount': totalCount,
        'roundScore': roundScore,
      });
      return unit;
    });
  }

  @override
  Future<Either<Failure, (List<UnlockedAchievement>, int, AppUser?)>>
      checkAchievements() {
    return _guard(() async {
      final response = await _remote.checkAchievements();
      return (
        response.newlyUnlocked.map((a) => a.toEntity()).toList(growable: false),
        response.totalBonus,
        response.user?.toEntity(),
      );
    });
  }

  /// Istisnolarni `Failure` ga aylantiradigan yagona joy.
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
