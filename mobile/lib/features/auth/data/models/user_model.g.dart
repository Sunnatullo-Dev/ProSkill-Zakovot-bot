// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'user_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_UserModel _$UserModelFromJson(Map<String, dynamic> json) => _UserModel(
  id: json['id'] as String,
  telegramId: (json['telegramId'] as num).toInt(),
  phone: json['phone'] as String?,
  email: json['email'] as String?,
  firstName: json['firstName'] as String?,
  lastName: json['lastName'] as String?,
  username: json['username'] as String?,
  displayName: json['displayName'] as String?,
  score: (json['score'] as num?)?.toInt() ?? 0,
  language: json['language'] as String? ?? 'uz-latn',
  currentStreak: (json['currentStreak'] as num?)?.toInt() ?? 0,
  authProvider: json['authProvider'] as String? ?? 'telegram',
  isAppAccount: json['isAppAccount'] as bool? ?? false,
  hasPassword: json['hasPassword'] as bool? ?? false,
  unlockedAchievements:
      (json['unlockedAchievements'] as List<dynamic>?)
          ?.map((e) => e as String)
          .toList() ??
      const <String>[],
  isPremium: json['isPremium'] as bool? ?? false,
  premiumUntil: json['premiumUntil'] as String?,
  createdAt: json['createdAt'] as String?,
);

Map<String, dynamic> _$UserModelToJson(_UserModel instance) =>
    <String, dynamic>{
      'id': instance.id,
      'telegramId': instance.telegramId,
      'phone': instance.phone,
      'email': instance.email,
      'firstName': instance.firstName,
      'lastName': instance.lastName,
      'username': instance.username,
      'displayName': instance.displayName,
      'score': instance.score,
      'language': instance.language,
      'currentStreak': instance.currentStreak,
      'authProvider': instance.authProvider,
      'isAppAccount': instance.isAppAccount,
      'hasPassword': instance.hasPassword,
      'unlockedAchievements': instance.unlockedAchievements,
      'isPremium': instance.isPremium,
      'premiumUntil': instance.premiumUntil,
      'createdAt': instance.createdAt,
    };
