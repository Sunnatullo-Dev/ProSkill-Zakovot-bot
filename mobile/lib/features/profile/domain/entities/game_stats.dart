import 'package:equatable/equatable.dart';

/// `GET /api/game-results/stats` natijasi.
class GameStats extends Equatable {
  const GameStats({
    required this.gamesPlayed,
    required this.accuracy,
    required this.bestRoundScore,
    required this.totalCorrect,
  });

  const GameStats.empty()
      : gamesPlayed = 0,
        accuracy = 0,
        bestRoundScore = 0,
        totalCorrect = 0;

  final int gamesPlayed;

  /// Foizda (0–100), server hisoblagan.
  final int accuracy;

  final int bestRoundScore;
  final int totalCorrect;

  @override
  List<Object?> get props =>
      [gamesPlayed, accuracy, bestRoundScore, totalCorrect];
}
