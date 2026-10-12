// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'daily_models.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_DailyTodayModel _$DailyTodayModelFromJson(Map<String, dynamic> json) =>
    _DailyTodayModel(
      date: json['date'] as String? ?? '',
      questions:
          (json['questions'] as List<dynamic>?)
              ?.map(
                (e) => QuizQuestionModel.fromJson(e as Map<String, dynamic>),
              )
              .toList() ??
          const <QuizQuestionModel>[],
      completed: json['completed'] as bool? ?? false,
      streak: json['streak'] == null
          ? const DailyStreakModel()
          : DailyStreakModel.fromJson(json['streak'] as Map<String, dynamic>),
      bonusPreview: (json['bonusPreview'] as num?)?.toInt() ?? 0,
    );

Map<String, dynamic> _$DailyTodayModelToJson(_DailyTodayModel instance) =>
    <String, dynamic>{
      'date': instance.date,
      'questions': instance.questions,
      'completed': instance.completed,
      'streak': instance.streak,
      'bonusPreview': instance.bonusPreview,
    };

_DailyStreakModel _$DailyStreakModelFromJson(Map<String, dynamic> json) =>
    _DailyStreakModel(
      current: (json['current'] as num?)?.toInt() ?? 0,
      longest: (json['longest'] as num?)?.toInt() ?? 0,
    );

Map<String, dynamic> _$DailyStreakModelToJson(_DailyStreakModel instance) =>
    <String, dynamic>{'current': instance.current, 'longest': instance.longest};

_DailyCompleteModel _$DailyCompleteModelFromJson(Map<String, dynamic> json) =>
    _DailyCompleteModel(
      newStreak: (json['newStreak'] as num?)?.toInt() ?? 0,
      longestStreak: (json['longestStreak'] as num?)?.toInt() ?? 0,
      streakBonus: (json['streakBonus'] as num?)?.toInt() ?? 0,
    );

Map<String, dynamic> _$DailyCompleteModelToJson(_DailyCompleteModel instance) =>
    <String, dynamic>{
      'newStreak': instance.newStreak,
      'longestStreak': instance.longestStreak,
      'streakBonus': instance.streakBonus,
    };
