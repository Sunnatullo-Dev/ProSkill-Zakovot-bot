import 'package:equatable/equatable.dart';

/// Javob holati — backend `scoring.py` bilan bir xil.
enum AnswerStatus {
  correct,
  partial,
  incorrect;

  static AnswerStatus fromRaw(String? raw) => switch (raw) {
        'correct' => AnswerStatus.correct,
        'partial' => AnswerStatus.partial,
        _ => AnswerStatus.incorrect,
      };
}

/// `POST /api/answer` natijasi.
class AnswerOutcome extends Equatable {
  const AnswerOutcome({
    required this.status,
    required this.isCorrect,
    required this.explanation,
    required this.correctAnswer,
    required this.pointsEarned,
    required this.streak,
    required this.betAmount,
    required this.betWon,
    this.wasTimeout = false,
  });

  final AnswerStatus status;

  /// Backend `correct` VA `partial` uchun ham `true` qaytaradi.
  final bool isCorrect;

  final String explanation;
  final String correctAnswer;

  /// Server tomonidan cheklangan ball (maksimum 3).
  final int pointsEarned;

  /// Javobdan keyingi ketma-ketlik.
  final int streak;

  final int betAmount;

  /// Sof natija: to'g'ri bo'lsa `+betAmount`, aks holda `-betAmount`.
  final int betWon;

  /// Vaqt tugagani sababli yuborilganmi (kliyent belgilaydi).
  final bool wasTimeout;

  /// Shu savoldan olingan umumiy ball o'zgarishi (garov bilan).
  int get totalDelta => pointsEarned + betWon;

  AnswerOutcome copyWith({bool? wasTimeout}) => AnswerOutcome(
        status: status,
        isCorrect: isCorrect,
        explanation: explanation,
        correctAnswer: correctAnswer,
        pointsEarned: pointsEarned,
        streak: streak,
        betAmount: betAmount,
        betWon: betWon,
        wasTimeout: wasTimeout ?? this.wasTimeout,
      );

  @override
  List<Object?> get props => [
        status,
        isCorrect,
        explanation,
        correctAnswer,
        pointsEarned,
        streak,
        betAmount,
        betWon,
        wasTimeout,
      ];
}

/// "Javobni bilmayman" natijasi (`POST /api/answer/reveal`).
class RevealedAnswer extends Equatable {
  const RevealedAnswer({required this.correctAnswer, required this.explanation});

  final String correctAnswer;
  final String explanation;

  @override
  List<Object?> get props => [correctAnswer, explanation];
}

/// Ochilgan yutuq (`POST /api/users/me/check-achievements`).
class UnlockedAchievement extends Equatable {
  const UnlockedAchievement({
    required this.id,
    required this.label,
    required this.bonus,
  });

  final String id;
  final String label;
  final int bonus;

  @override
  List<Object?> get props => [id, label, bonus];
}
