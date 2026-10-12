// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'leaderboard_models.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_LeaderboardResponseModel _$LeaderboardResponseModelFromJson(
  Map<String, dynamic> json,
) => _LeaderboardResponseModel(
  users:
      (json['users'] as List<dynamic>?)
          ?.map((e) => LeaderboardUserModel.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const <LeaderboardUserModel>[],
  rank: (json['rank'] as num?)?.toInt() ?? 0,
  limit: (json['limit'] as num?)?.toInt() ?? 20,
  myMonthlyScore: (json['myMonthlyScore'] as num?)?.toInt() ?? 0,
);

Map<String, dynamic> _$LeaderboardResponseModelToJson(
  _LeaderboardResponseModel instance,
) => <String, dynamic>{
  'users': instance.users,
  'rank': instance.rank,
  'limit': instance.limit,
  'myMonthlyScore': instance.myMonthlyScore,
};

_LeaderboardUserModel _$LeaderboardUserModelFromJson(
  Map<String, dynamic> json,
) => _LeaderboardUserModel(
  id: json['id'] as String? ?? '',
  telegramId: (json['telegramId'] as num?)?.toInt() ?? 0,
  firstName: json['firstName'] as String?,
  lastName: json['lastName'] as String?,
  username: json['username'] as String?,
  displayName: json['displayName'] as String?,
  score: (json['score'] as num?)?.toInt() ?? 0,
);

Map<String, dynamic> _$LeaderboardUserModelToJson(
  _LeaderboardUserModel instance,
) => <String, dynamic>{
  'id': instance.id,
  'telegramId': instance.telegramId,
  'firstName': instance.firstName,
  'lastName': instance.lastName,
  'username': instance.username,
  'displayName': instance.displayName,
  'score': instance.score,
};

_ReferralsResponseModel _$ReferralsResponseModelFromJson(
  Map<String, dynamic> json,
) => _ReferralsResponseModel(
  referrers:
      (json['referrers'] as List<dynamic>?)
          ?.map((e) => ReferrerModel.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const <ReferrerModel>[],
  myCount: (json['myCount'] as num?)?.toInt() ?? 0,
);

Map<String, dynamic> _$ReferralsResponseModelToJson(
  _ReferralsResponseModel instance,
) => <String, dynamic>{
  'referrers': instance.referrers,
  'myCount': instance.myCount,
};

_ReferrerModel _$ReferrerModelFromJson(Map<String, dynamic> json) =>
    _ReferrerModel(
      user: LeaderboardUserModel.fromJson(json['user'] as Map<String, dynamic>),
      count: (json['count'] as num?)?.toInt() ?? 0,
    );

Map<String, dynamic> _$ReferrerModelToJson(_ReferrerModel instance) =>
    <String, dynamic>{'user': instance.user, 'count': instance.count};
