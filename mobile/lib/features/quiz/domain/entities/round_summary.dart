import 'package:equatable/equatable.dart';

import 'answer_outcome.dart';

/// Bitta savol bo'yicha yakuniy yozuv — natija ekrani uchun.
class RoundEntry extends Equatable {
  const RoundEntry({
    required this.questionText,
    required this.userAnswer,
    required this.outcome,
    this.skipped = false,
  });

  final String questionText;
  final String userAnswer;
  final AnswerOutcome? outcome;

  /// "Javobni bilmayman" bosilgan (bilet reveal'ga sarflangan).
  final bool skipped;

  bool get isCorrect => outcome?.isCorrect ?? false;
  int get points => outcome?.pointsEarned ?? 0;

  @override
  List<Object?> get props => [questionText, userAnswer, outcome, skipped];
}

/// Raund yakuni.
class RoundSummary extends Equatable {
  const RoundSummary({
    required this.entries,
    required this.correctCount,
    required this.totalCount,
    required this.roundScore,
    required this.betNet,
    required this.bestStreak,
    this.newlyUnlocked = const [],
    this.achievementBonus = 0,
  });

  final List<RoundEntry> entries;
  final int correctCount;
  final int totalCount;

  /// Faqat savol ballari (garovsiz) — `POST /api/game-results` ga shu ketadi.
  ///
  /// ⚠️ Garov shu yerga QO'SHILMAYDI: backend `roundScore <= totalCount * 3`
  /// tekshiruvini o'tkazadi (`game_results/views.py`), garov esa bu chegaradan
  /// oshirib yuborishi mumkin.
  final int roundScore;

  /// Garovlardan sof natija (musbat yoki manfiy).
  final int betNet;

  final int bestStreak;

  final List<UnlockedAchievement> newlyUnlocked;
  final int achievementBonus;

  int get accuracyPercent =>
      totalCount == 0 ? 0 : ((correctCount / totalCount) * 100).round();

  /// Foydalanuvchi balansiga qo'shilgan umumiy o'zgarish.
  int get totalScoreDelta => roundScore + betNet + achievementBonus;

  @override
  List<Object?> get props => [
        entries,
        correctCount,
        totalCount,
        roundScore,
        betNet,
        bestStreak,
        newlyUnlocked,
        achievementBonus,
      ];
}
