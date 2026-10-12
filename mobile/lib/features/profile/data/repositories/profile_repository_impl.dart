import 'package:dartz/dartz.dart';
import 'package:dio/dio.dart';

import '../../../../core/error/exceptions.dart';
import '../../../../core/error/failure.dart';
import '../../domain/entities/game_stats.dart';
import '../../domain/repositories/profile_repository.dart';
import '../datasources/profile_remote_data_source.dart';

class ProfileRepositoryImpl implements ProfileRepository {
  const ProfileRepositoryImpl(this._remote);

  final ProfileRemoteDataSource _remote;

  @override
  Future<Either<Failure, GameStats>> getStats() async {
    try {
      return Right((await _remote.getStats()).toEntity());
    } on DioException catch (e) {
      final inner = e.error;
      if (inner is ApiException) return Left(inner.toFailure());
      if (inner is NetworkException) return Left(NetworkFailure(inner.message));
      if (inner is TimeoutException) return Left(TimeoutFailure(inner.message));
      return Left(UnknownFailure(e.message ?? 'So\'rov bajarilmadi'));
    } on ApiException catch (e) {
      return Left(e.toFailure());
    } catch (e) {
      return Left(UnknownFailure('Kutilmagan xatolik: $e'));
    }
  }
}
