import 'package:freezed_annotation/freezed_annotation.dart';

part 'leaderboard_models.freezed.dart';
part 'leaderboard_models.g.dart';

/// `GET /api/users/leaderboard` javobi.
@freezed
abstract class LeaderboardResponseModel with _$LeaderboardResponseModel {
  const factory LeaderboardResponseModel({
    @Default(<LeaderboardUserModel>[]) List<LeaderboardUserModel> users,
    @Default(0) int rank,
    @Default(20) int limit,
    /// Faqat `period=monthly` da keladi.
    @Default(0) int myMonthlyScore,
  }) = _LeaderboardResponseModel;

  factory LeaderboardResponseModel.fromJson(Map<String, dynamic> json) =>
      _$LeaderboardResponseModelFromJson(json);
}

/// Backend `_map_user` natijasi.
@freezed
abstract class LeaderboardUserModel with _$LeaderboardUserModel {
  const LeaderboardUserModel._();

  const factory LeaderboardUserModel({
    @Default('') String id,
    @Default(0) int telegramId,
    String? firstName,
    String? lastName,
    String? username,
    String? displayName,
    @Default(0) int score,
  }) = _LeaderboardUserModel;

  factory LeaderboardUserModel.fromJson(Map<String, dynamic> json) =>
      _$LeaderboardUserModelFromJson(json);

  /// Web ilovadagi `pickDisplayName` bilan bir xil prioritet.
  String get visibleName {
    final display = displayName?.trim();
    if (display != null && display.isNotEmpty) return display;
    final full = [firstName, lastName]
        .where((p) => p != null && p.trim().isNotEmpty)
        .map((p) => p!.trim())
        .join(' ');
    if (full.isNotEmpty) return full;
    final handle = username?.trim();
    if (handle != null && handle.isNotEmpty) return handle;
    return 'Foydalanuvchi';
  }
}

/// `GET /api/users/referrals` javobi.
@freezed
abstract class ReferralsResponseModel with _$ReferralsResponseModel {
  const factory ReferralsResponseModel({
    @Default(<ReferrerModel>[]) List<ReferrerModel> referrers,
    @Default(0) int myCount,
  }) = _ReferralsResponseModel;

  factory ReferralsResponseModel.fromJson(Map<String, dynamic> json) =>
      _$ReferralsResponseModelFromJson(json);
}

@freezed
abstract class ReferrerModel with _$ReferrerModel {
  const factory ReferrerModel({
    required LeaderboardUserModel user,
    @Default(0) int count,
  }) = _ReferrerModel;

  factory ReferrerModel.fromJson(Map<String, dynamic> json) =>
      _$ReferrerModelFromJson(json);
}
