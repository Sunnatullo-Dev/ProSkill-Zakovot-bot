import 'package:freezed_annotation/freezed_annotation.dart';

import '../../../quiz/data/models/quiz_models.dart';
import '../../domain/entities/daily_challenge.dart';

part 'daily_models.freezed.dart';
part 'daily_models.g.dart';

/// `GET /api/daily/today` javobi.
@freezed
abstract class DailyTodayModel with _$DailyTodayModel {
  const DailyTodayModel._();

  const factory DailyTodayModel({
    @Default('') String date,
    @Default(<QuizQuestionModel>[]) List<QuizQuestionModel> questions,
    @Default(false) bool completed,
    @Default(DailyStreakModel()) DailyStreakModel streak,
    @Default(0) int bonusPreview,
  }) = _DailyTodayModel;

  factory DailyTodayModel.fromJson(Map<String, dynamic> json) =>
      _$DailyTodayModelFromJson(json);

  DailyChallenge toEntity() => DailyChallenge(
        date: date,
        questions: questions.map((q) => q.toEntity()).toList(growable: false),
        completed: completed,
        streak: DailyStreak(
          current: streak.current,
          longest: streak.longest,
        ),
        bonusPreview: bonusPreview,
      );
}

@freezed
abstract class DailyStreakModel with _$DailyStreakModel {
  const factory DailyStreakModel({
    @Default(0) int current,
    @Default(0) int longest,
  }) = _DailyStreakModel;

  factory DailyStreakModel.fromJson(Map<String, dynamic> json) =>
      _$DailyStreakModelFromJson(json);
}

/// `POST /api/daily/complete` javobi.
@freezed
abstract class DailyCompleteModel with _$DailyCompleteModel {
  const DailyCompleteModel._();

  const factory DailyCompleteModel({
    @Default(0) int newStreak,
    @Default(0) int longestStreak,
    @Default(0) int streakBonus,
  }) = _DailyCompleteModel;

  factory DailyCompleteModel.fromJson(Map<String, dynamic> json) =>
      _$DailyCompleteModelFromJson(json);

  DailyCompletion toEntity() => DailyCompletion(
        newStreak: newStreak,
        longestStreak: longestStreak,
        streakBonus: streakBonus,
      );
}
