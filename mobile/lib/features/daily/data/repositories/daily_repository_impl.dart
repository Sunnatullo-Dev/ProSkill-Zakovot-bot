import 'package:dartz/dartz.dart';
import 'package:dio/dio.dart';

import '../../../../core/error/exceptions.dart';
import '../../../../core/error/failure.dart';
import '../../domain/entities/daily_challenge.dart';
import '../../domain/repositories/daily_repository.dart';
import '../datasources/daily_remote_data_source.dart';

class DailyRepositoryImpl implements DailyRepository {
  const DailyRepositoryImpl(this._remote);

  final DailyRemoteDataSource _remote;

  @override
  Future<Either<Failure, DailyChallenge>> getToday() =>
      _guard(() async => (await _remote.getToday()).toEntity());

  @override
  Future<Either<Failure, DailyCompletion>> complete() =>
      _guard(() async => (await _remote.complete()).toEntity());

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
