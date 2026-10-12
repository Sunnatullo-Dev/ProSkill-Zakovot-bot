import 'package:equatable/equatable.dart';

import '../../../quiz/domain/entities/quiz_question.dart';

/// Ketma-ketlik (streak) holati.
class DailyStreak extends Equatable {
  const DailyStreak({required this.current, required this.longest});

  final int current;
  final int longest;

  @override
  List<Object?> get props => [current, longest];
}

/// Streak bonus chegaralari.
///
/// ⚠️ Backend `apps/daily/repositories.py::STREAK_BONUS_TIERS` bilan
/// **bir xil bo'lishi shart**. Ajralib ketsa foydalanuvchi UI'da bir xil,
/// hisobda boshqa bonus ko'radi.
class StreakTier extends Equatable {
  const StreakTier({required this.days, required this.bonus});

  final int days;
  final int bonus;

  static const all = <StreakTier>[
    StreakTier(days: 3, bonus: 3),
    StreakTier(days: 7, bonus: 7),
    StreakTier(days: 14, bonus: 14),
    StreakTier(days: 30, bonus: 20),
  ];

  /// Berilgan streak uchun bonus (kamayish tartibida tekshiriladi).
  static int bonusFor(int streak) {
    for (final tier in all.reversed) {
      if (streak >= tier.days) return tier.bonus;
    }
    return 0;
  }

  /// Keyingi erishilmagan chegara. Hammasi olingan bo'lsa `null`.
  static StreakTier? nextAfter(int streak) {
    for (final tier in all) {
      if (streak < tier.days) return tier;
    }
    return null;
  }

  @override
  List<Object?> get props => [days, bonus];
}

/// `GET /api/daily/today` javobi.
class DailyChallenge extends Equatable {
  const DailyChallenge({
    required this.date,
    required this.questions,
    required this.completed,
    required this.streak,
    required this.bonusPreview,
  });

  /// `YYYY-MM-DD` (Asia/Tashkent bo'yicha).
  final String date;

  /// Bugungi 5 ta savol — barcha foydalanuvchilar uchun bir xil.
  final List<QuizQuestion> questions;

  /// Bugun allaqachon yakunlanganmi.
  final bool completed;

  final DailyStreak streak;

  /// Bugun yakunlansa beriladigan bonus (server hisoblagan).
  final int bonusPreview;

  @override
  List<Object?> get props =>
      [date, questions, completed, streak, bonusPreview];
}

/// `POST /api/daily/complete` javobi.
class DailyCompletion extends Equatable {
  const DailyCompletion({
    required this.newStreak,
    required this.longestStreak,
    required this.streakBonus,
  });

  final int newStreak;
  final int longestStreak;
  final int streakBonus;

  @override
  List<Object?> get props => [newStreak, longestStreak, streakBonus];
}
