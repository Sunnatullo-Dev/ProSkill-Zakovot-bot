import 'package:equatable/equatable.dart';

/// Reyting davri.
enum LeaderboardPeriod {
  all('all', 'Umumiy'),
  monthly('monthly', 'Shu oy');

  const LeaderboardPeriod(this.apiValue, this.label);

  final String apiValue;
  final String label;
}

/// Reyting qatoridagi foydalanuvchi.
class LeaderboardEntry extends Equatable {
  const LeaderboardEntry({
    required this.rank,
    required this.telegramId,
    required this.name,
    required this.score,
  });

  final int rank;
  final int telegramId;
  final String name;

  /// Umumiy reytingda — jami ball; oylikda — shu oy to'plangan ball;
  /// takliflarda — taklif qilinganlar soni.
  final int score;

  @override
  List<Object?> get props => [rank, telegramId, name, score];
}

/// Ball reytingi (`GET /api/users/leaderboard`).
class LeaderboardPage extends Equatable {
  const LeaderboardPage({
    required this.entries,
    required this.myRank,
    required this.myScore,
  });

  final List<LeaderboardEntry> entries;

  /// Joriy foydalanuvchi o'rni. `0` — reytingda yo'q (ball to'plamagan).
  final int myRank;

  final int myScore;

  /// O'z o'rni ro'yxatda ko'rinib turibdimi?
  bool containsMe(int telegramId) =>
      entries.any((e) => e.telegramId == telegramId);

  @override
  List<Object?> get props => [entries, myRank, myScore];
}
