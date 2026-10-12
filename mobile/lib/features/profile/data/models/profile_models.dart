import 'package:freezed_annotation/freezed_annotation.dart';

import '../../domain/entities/game_stats.dart';

part 'profile_models.freezed.dart';
part 'profile_models.g.dart';

/// `GET /api/game-results/stats` javobi.
@freezed
abstract class StatsResponseModel with _$StatsResponseModel {
  const StatsResponseModel._();

  const factory StatsResponseModel({
    @Default(GameStatsModel()) GameStatsModel stats,
  }) = _StatsResponseModel;

  factory StatsResponseModel.fromJson(Map<String, dynamic> json) =>
      _$StatsResponseModelFromJson(json);

  GameStats toEntity() => GameStats(
        gamesPlayed: stats.gamesPlayed,
        accuracy: stats.accuracy,
        bestRoundScore: stats.bestRoundScore,
        totalCorrect: stats.totalCorrect,
      );
}

@freezed
abstract class GameStatsModel with _$GameStatsModel {
  const factory GameStatsModel({
    @Default(0) int gamesPlayed,
    @Default(0) int accuracy,
    @Default(0) int bestRoundScore,
    @Default(0) int totalCorrect,
  }) = _GameStatsModel;

  factory GameStatsModel.fromJson(Map<String, dynamic> json) =>
      _$GameStatsModelFromJson(json);
}
