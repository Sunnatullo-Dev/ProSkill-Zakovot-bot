import 'package:freezed_annotation/freezed_annotation.dart';

import '../../domain/entities/app_user.dart';

part 'user_model.freezed.dart';
part 'user_model.g.dart';

/// Backend `serialize_user()` javobiga mos DTO.
///
/// Manba: `backend-django/apps/auth_api/services.py::serialize_user`.
@freezed
abstract class UserModel with _$UserModel {
  const UserModel._();

  const factory UserModel({
    required String id,
    required int telegramId,
    String? phone,
    String? email,
    String? firstName,
    String? lastName,
    String? username,
    String? displayName,
    @Default(0) int score,
    @Default('uz-latn') String language,
    @Default(0) int currentStreak,
    @Default('telegram') String authProvider,
    @Default(false) bool isAppAccount,
    @Default(false) bool hasPassword,
    @Default(<String>[]) List<String> unlockedAchievements,
    @Default(false) bool isPremium,
    String? premiumUntil,
    String? createdAt,
  }) = _UserModel;

  factory UserModel.fromJson(Map<String, dynamic> json) =>
      _$UserModelFromJson(json);

  AppUser toEntity() => AppUser(
        id: id,
        telegramId: telegramId,
        phone: phone,
        email: email,
        firstName: firstName,
        lastName: lastName,
        username: username,
        displayName: displayName,
        score: score,
        language: language,
        currentStreak: currentStreak,
        authProvider: authProvider,
        isAppAccount: isAppAccount,
        hasPassword: hasPassword,
        unlockedAchievements: unlockedAchievements,
        isPremium: isPremium,
        premiumUntil:
            premiumUntil == null ? null : DateTime.tryParse(premiumUntil!),
        createdAt: createdAt == null ? null : DateTime.tryParse(createdAt!),
      );
}
