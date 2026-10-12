// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'profile_models.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_StatsResponseModel _$StatsResponseModelFromJson(Map<String, dynamic> json) =>
    _StatsResponseModel(
      stats: json['stats'] == null
          ? const GameStatsModel()
          : GameStatsModel.fromJson(json['stats'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$StatsResponseModelToJson(_StatsResponseModel instance) =>
    <String, dynamic>{'stats': instance.stats};

_GameStatsModel _$GameStatsModelFromJson(Map<String, dynamic> json) =>
    _GameStatsModel(
      gamesPlayed: (json['gamesPlayed'] as num?)?.toInt() ?? 0,
      accuracy: (json['accuracy'] as num?)?.toInt() ?? 0,
      bestRoundScore: (json['bestRoundScore'] as num?)?.toInt() ?? 0,
      totalCorrect: (json['totalCorrect'] as num?)?.toInt() ?? 0,
    );

Map<String, dynamic> _$GameStatsModelToJson(_GameStatsModel instance) =>
    <String, dynamic>{
      'gamesPlayed': instance.gamesPlayed,
      'accuracy': instance.accuracy,
      'bestRoundScore': instance.bestRoundScore,
      'totalCorrect': instance.totalCorrect,
    };
