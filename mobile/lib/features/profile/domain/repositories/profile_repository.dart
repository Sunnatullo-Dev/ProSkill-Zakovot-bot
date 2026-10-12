import 'package:dartz/dartz.dart';

import '../../../../core/error/failure.dart';
import '../entities/game_stats.dart';

abstract class ProfileRepository {
  /// O'yin statistikasi.
  Future<Either<Failure, GameStats>> getStats();
}
