// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'quiz_models.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_RoundResponseModel _$RoundResponseModelFromJson(Map<String, dynamic> json) =>
    _RoundResponseModel(
      questions:
          (json['questions'] as List<dynamic>?)
              ?.map(
                (e) => QuizQuestionModel.fromJson(e as Map<String, dynamic>),
              )
              .toList() ??
          const <QuizQuestionModel>[],
    );

Map<String, dynamic> _$RoundResponseModelToJson(_RoundResponseModel instance) =>
    <String, dynamic>{'questions': instance.questions};

_QuizQuestionModel _$QuizQuestionModelFromJson(Map<String, dynamic> json) =>
    _QuizQuestionModel(
      id: json['id'] as String,
      text: json['text'] as String,
      options:
          (json['options'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          const <String>[],
      category: json['category'] as String?,
      difficulty: json['difficulty'] as String?,
      timeLimitSeconds: (json['timeLimitSeconds'] as num?)?.toInt(),
    );

Map<String, dynamic> _$QuizQuestionModelToJson(_QuizQuestionModel instance) =>
    <String, dynamic>{
      'id': instance.id,
      'text': instance.text,
      'options': instance.options,
      'category': instance.category,
      'difficulty': instance.difficulty,
      'timeLimitSeconds': instance.timeLimitSeconds,
    };

_TicketResponseModel _$TicketResponseModelFromJson(Map<String, dynamic> json) =>
    _TicketResponseModel(ticket: json['ticket'] as String);

Map<String, dynamic> _$TicketResponseModelToJson(
  _TicketResponseModel instance,
) => <String, dynamic>{'ticket': instance.ticket};

_AnswerResultModel _$AnswerResultModelFromJson(Map<String, dynamic> json) =>
    _AnswerResultModel(
      status: json['status'] as String? ?? 'incorrect',
      isCorrect: json['isCorrect'] as bool? ?? false,
      explanation: json['explanation'] as String? ?? '',
      correctAnswer: json['correctAnswer'] as String? ?? '',
      pointsEarned: (json['pointsEarned'] as num?)?.toInt() ?? 0,
      streak: (json['streak'] as num?)?.toInt() ?? 0,
      betAmount: (json['betAmount'] as num?)?.toInt() ?? 0,
      betWon: (json['betWon'] as num?)?.toInt() ?? 0,
    );

Map<String, dynamic> _$AnswerResultModelToJson(_AnswerResultModel instance) =>
    <String, dynamic>{
      'status': instance.status,
      'isCorrect': instance.isCorrect,
      'explanation': instance.explanation,
      'correctAnswer': instance.correctAnswer,
      'pointsEarned': instance.pointsEarned,
      'streak': instance.streak,
      'betAmount': instance.betAmount,
      'betWon': instance.betWon,
    };

_RevealResponseModel _$RevealResponseModelFromJson(Map<String, dynamic> json) =>
    _RevealResponseModel(
      correctAnswer: json['correctAnswer'] as String? ?? '',
      explanation: json['explanation'] as String? ?? '',
    );

Map<String, dynamic> _$RevealResponseModelToJson(
  _RevealResponseModel instance,
) => <String, dynamic>{
  'correctAnswer': instance.correctAnswer,
  'explanation': instance.explanation,
};

_AchievementsResponseModel _$AchievementsResponseModelFromJson(
  Map<String, dynamic> json,
) => _AchievementsResponseModel(
  newlyUnlocked:
      (json['newlyUnlocked'] as List<dynamic>?)
          ?.map((e) => AchievementModel.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const <AchievementModel>[],
  totalBonus: (json['totalBonus'] as num?)?.toInt() ?? 0,
  user: json['user'] == null
      ? null
      : UserModel.fromJson(json['user'] as Map<String, dynamic>),
);

Map<String, dynamic> _$AchievementsResponseModelToJson(
  _AchievementsResponseModel instance,
) => <String, dynamic>{
  'newlyUnlocked': instance.newlyUnlocked,
  'totalBonus': instance.totalBonus,
  'user': instance.user,
};

_AchievementModel _$AchievementModelFromJson(Map<String, dynamic> json) =>
    _AchievementModel(
      id: json['id'] as String,
      label: json['label'] as String? ?? '',
      bonus: (json['bonus'] as num?)?.toInt() ?? 0,
    );

Map<String, dynamic> _$AchievementModelToJson(_AchievementModel instance) =>
    <String, dynamic>{
      'id': instance.id,
      'label': instance.label,
      'bonus': instance.bonus,
    };
