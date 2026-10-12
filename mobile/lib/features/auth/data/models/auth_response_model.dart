import 'package:freezed_annotation/freezed_annotation.dart';

import '../../domain/entities/auth_session.dart';
import 'user_model.dart';

part 'auth_response_model.freezed.dart';
part 'auth_response_model.g.dart';

/// `/api/auth/register`, `/login/password`, `/password` javoblari.
@freezed
abstract class AuthResponseModel with _$AuthResponseModel {
  const AuthResponseModel._();

  const factory AuthResponseModel({
    required UserModel user,
    @Default(false) bool isAdmin,
    required TokensModel tokens,
  }) = _AuthResponseModel;

  factory AuthResponseModel.fromJson(Map<String, dynamic> json) =>
      _$AuthResponseModelFromJson(json);

  AuthSession toEntity() => AuthSession(
        user: user.toEntity(),
        isAdmin: isAdmin,
        tokens: tokens.toEntity(),
      );
}

/// JWT juftligi — backend `TokenPair.to_dict()`.
@freezed
abstract class TokensModel with _$TokensModel {
  const TokensModel._();

  const factory TokensModel({
    required String accessToken,
    required String refreshToken,
    @Default('Bearer') String tokenType,
    @Default(1800) int accessExpiresIn,
    @Default(5184000) int refreshExpiresIn,
  }) = _TokensModel;

  factory TokensModel.fromJson(Map<String, dynamic> json) =>
      _$TokensModelFromJson(json);

  AuthTokens toEntity() => AuthTokens(
        accessToken: accessToken,
        refreshToken: refreshToken,
        accessExpiresIn: accessExpiresIn,
        refreshExpiresIn: refreshExpiresIn,
      );
}

/// `/api/auth/me` javobi.
@freezed
abstract class MeResponseModel with _$MeResponseModel {
  const MeResponseModel._();

  const factory MeResponseModel({
    required UserModel user,
    @Default(false) bool isAdmin,
  }) = _MeResponseModel;

  factory MeResponseModel.fromJson(Map<String, dynamic> json) =>
      _$MeResponseModelFromJson(json);
}

/// `/api/users/me` (PATCH) javobi — eski, Telegram davridan qolgan format.
@freezed
abstract class UpdateUserResponseModel with _$UpdateUserResponseModel {
  const factory UpdateUserResponseModel({
    required UserModel user,
  }) = _UpdateUserResponseModel;

  factory UpdateUserResponseModel.fromJson(Map<String, dynamic> json) =>
      _$UpdateUserResponseModelFromJson(json);
}
