import 'package:freezed_annotation/freezed_annotation.dart';

import '../../../auth/data/models/user_model.dart';
import '../../domain/entities/answer_outcome.dart';
import '../../domain/entities/quiz_question.dart';

part 'quiz_models.freezed.dart';
part 'quiz_models.g.dart';

/// `GET /api/questions/round` javobi.
@freezed
abstract class RoundResponseModel with _$RoundResponseModel {
  const factory RoundResponseModel({
    @Default(<QuizQuestionModel>[]) List<QuizQuestionModel> questions,
  }) = _RoundResponseModel;

  factory RoundResponseModel.fromJson(Map<String, dynamic> json) =>
      _$RoundResponseModelFromJson(json);
}

/// Backend `_map_question_public` natijasi.
@freezed
abstract class QuizQuestionModel with _$QuizQuestionModel {
  const QuizQuestionModel._();

  const factory QuizQuestionModel({
    required String id,
    required String text,
    @Default(<String>[]) List<String> options,
    String? category,
    String? difficulty,
    int? timeLimitSeconds,
  }) = _QuizQuestionModel;

  factory QuizQuestionModel.fromJson(Map<String, dynamic> json) =>
      _$QuizQuestionModelFromJson(json);

  QuizQuestion toEntity() => QuizQuestion(
        id: id,
        text: text,
        // Himoya: backend buzilgan JSON qaytarsa bo'sh qatorlar tushmasin.
        options: options
            .map((o) => o.trim())
            .where((o) => o.isNotEmpty)
            .toList(growable: false),
        category: category,
        difficulty: difficulty,
        timeLimitSeconds: timeLimitSeconds,
      );
}

/// `POST /api/answer/ticket` javobi.
@freezed
abstract class TicketResponseModel with _$TicketResponseModel {
  const factory TicketResponseModel({required String ticket}) =
      _TicketResponseModel;

  factory TicketResponseModel.fromJson(Map<String, dynamic> json) =>
      _$TicketResponseModelFromJson(json);
}

/// `POST /api/answer` javobi.
@freezed
abstract class AnswerResultModel with _$AnswerResultModel {
  const AnswerResultModel._();

  const factory AnswerResultModel({
    @Default('incorrect') String status,
    @Default(false) bool isCorrect,
    @Default('') String explanation,
    @Default('') String correctAnswer,
    @Default(0) int pointsEarned,
    @Default(0) int streak,
    @Default(0) int betAmount,
    @Default(0) int betWon,
  }) = _AnswerResultModel;

  factory AnswerResultModel.fromJson(Map<String, dynamic> json) =>
      _$AnswerResultModelFromJson(json);

  AnswerOutcome toEntity() => AnswerOutcome(
        status: AnswerStatus.fromRaw(status),
        isCorrect: isCorrect,
        explanation: explanation,
        correctAnswer: correctAnswer,
        pointsEarned: pointsEarned,
        streak: streak,
        betAmount: betAmount,
        betWon: betWon,
      );
}

/// `POST /api/answer/reveal` javobi.
@freezed
abstract class RevealResponseModel with _$RevealResponseModel {
  const RevealResponseModel._();

  const factory RevealResponseModel({
    @Default('') String correctAnswer,
    @Default('') String explanation,
  }) = _RevealResponseModel;

  factory RevealResponseModel.fromJson(Map<String, dynamic> json) =>
      _$RevealResponseModelFromJson(json);

  RevealedAnswer toEntity() =>
      RevealedAnswer(correctAnswer: correctAnswer, explanation: explanation);
}

/// `POST /api/users/me/check-achievements` javobi.
@freezed
abstract class AchievementsResponseModel with _$AchievementsResponseModel {
  const factory AchievementsResponseModel({
    @Default(<AchievementModel>[]) List<AchievementModel> newlyUnlocked,
    @Default(0) int totalBonus,
    UserModel? user,
  }) = _AchievementsResponseModel;

  factory AchievementsResponseModel.fromJson(Map<String, dynamic> json) =>
      _$AchievementsResponseModelFromJson(json);
}

@freezed
abstract class AchievementModel with _$AchievementModel {
  const AchievementModel._();

  const factory AchievementModel({
    required String id,
    @Default('') String label,
    @Default(0) int bonus,
  }) = _AchievementModel;

  factory AchievementModel.fromJson(Map<String, dynamic> json) =>
      _$AchievementModelFromJson(json);

  UnlockedAchievement toEntity() =>
      UnlockedAchievement(id: id, label: label, bonus: bonus);
}
