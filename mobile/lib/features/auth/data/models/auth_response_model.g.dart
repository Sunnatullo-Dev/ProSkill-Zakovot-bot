// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'auth_response_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_AuthResponseModel _$AuthResponseModelFromJson(Map<String, dynamic> json) =>
    _AuthResponseModel(
      user: UserModel.fromJson(json['user'] as Map<String, dynamic>),
      isAdmin: json['isAdmin'] as bool? ?? false,
      tokens: TokensModel.fromJson(json['tokens'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$AuthResponseModelToJson(_AuthResponseModel instance) =>
    <String, dynamic>{
      'user': instance.user,
      'isAdmin': instance.isAdmin,
      'tokens': instance.tokens,
    };

_TokensModel _$TokensModelFromJson(Map<String, dynamic> json) => _TokensModel(
  accessToken: json['accessToken'] as String,
  refreshToken: json['refreshToken'] as String,
  tokenType: json['tokenType'] as String? ?? 'Bearer',
  accessExpiresIn: (json['accessExpiresIn'] as num?)?.toInt() ?? 1800,
  refreshExpiresIn: (json['refreshExpiresIn'] as num?)?.toInt() ?? 5184000,
);

Map<String, dynamic> _$TokensModelToJson(_TokensModel instance) =>
    <String, dynamic>{
      'accessToken': instance.accessToken,
      'refreshToken': instance.refreshToken,
      'tokenType': instance.tokenType,
      'accessExpiresIn': instance.accessExpiresIn,
      'refreshExpiresIn': instance.refreshExpiresIn,
    };

_MeResponseModel _$MeResponseModelFromJson(Map<String, dynamic> json) =>
    _MeResponseModel(
      user: UserModel.fromJson(json['user'] as Map<String, dynamic>),
      isAdmin: json['isAdmin'] as bool? ?? false,
    );

Map<String, dynamic> _$MeResponseModelToJson(_MeResponseModel instance) =>
    <String, dynamic>{'user': instance.user, 'isAdmin': instance.isAdmin};

_UpdateUserResponseModel _$UpdateUserResponseModelFromJson(
  Map<String, dynamic> json,
) => _UpdateUserResponseModel(
  user: UserModel.fromJson(json['user'] as Map<String, dynamic>),
);

Map<String, dynamic> _$UpdateUserResponseModelToJson(
  _UpdateUserResponseModel instance,
) => <String, dynamic>{'user': instance.user};
