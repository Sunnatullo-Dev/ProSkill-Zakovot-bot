import 'package:equatable/equatable.dart';

import 'game_stats.dart';

/// Yutuq ta'rifi.
///
/// ⚠️ Bu ro'yxat backend `apps/users/achievements.py::ACHIEVEMENTS` bilan
/// **aynan bir xil bo'lishi shart** — id, shart va bonus. Ajralib ketsa
/// foydalanuvchi UI'da "ochilgan" ko'radi, lekin bonus olmaydi.
class Achievement extends Equatable {
  const Achievement({
    required this.id,
    required this.label,
    required this.icon,
    required this.description,
    required this.bonus,
    required this.target,
    required this.progressOf,
  });

  final String id;
  final String label;
  final String icon;
  final String description;
  final int bonus;

  /// Ochilishi uchun kerakli qiymat.
  final int target;

  /// Statistikadan joriy qiymatni oladi (progress ko'rsatish uchun).
  final int Function(GameStats stats, int totalScore) progressOf;

  int progress(GameStats stats, int totalScore) =>
      progressOf(stats, totalScore).clamp(0, target);

  double ratio(GameStats stats, int totalScore) =>
      target == 0 ? 1 : progress(stats, totalScore) / target;

  static final all = <Achievement>[
    Achievement(
      id: 'first-game',
      label: 'Birinchi qadam',
      icon: '🎯',
      description: '1 ta o\'yin o\'ynang',
      bonus: 5,
      target: 1,
      progressOf: (s, _) => s.gamesPlayed,
    ),
    Achievement(
      id: 'ten-games',
      label: 'Tajribali',
      icon: '🎮',
      description: '10 ta o\'yin o\'ynang',
      bonus: 15,
      target: 10,
      progressOf: (s, _) => s.gamesPlayed,
    ),
    Achievement(
      id: 'score-100',
      label: 'Zukko',
      icon: '🧠',
      description: '100 ball to\'plang',
      bonus: 20,
      target: 100,
      progressOf: (_, score) => score,
    ),
    Achievement(
      id: 'score-500',
      label: 'Daho',
      icon: '🌟',
      description: '500 ball to\'plang',
      bonus: 50,
      target: 500,
      progressOf: (_, score) => score,
    ),
    Achievement(
      id: 'best-round',
      label: 'Rekordchi',
      icon: '🏆',
      description: 'Bir raundda 20+ ball',
      bonus: 25,
      target: 20,
      progressOf: (s, _) => s.bestRoundScore,
    ),
  ];

  @override
  List<Object?> get props => [id, label, bonus, target];
}
