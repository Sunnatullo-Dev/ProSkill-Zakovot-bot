// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'auth_response_model.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$AuthResponseModel {

 UserModel get user; bool get isAdmin; TokensModel get tokens;
/// Create a copy of AuthResponseModel
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$AuthResponseModelCopyWith<AuthResponseModel> get copyWith => _$AuthResponseModelCopyWithImpl<AuthResponseModel>(this as AuthResponseModel, _$identity);

  /// Serializes this AuthResponseModel to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is AuthResponseModel&&(identical(other.user, user) || other.user == user)&&(identical(other.isAdmin, isAdmin) || other.isAdmin == isAdmin)&&(identical(other.tokens, tokens) || other.tokens == tokens));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,user,isAdmin,tokens);

@override
String toString() {
  return 'AuthResponseModel(user: $user, isAdmin: $isAdmin, tokens: $tokens)';
}


}

/// @nodoc
abstract mixin class $AuthResponseModelCopyWith<$Res>  {
  factory $AuthResponseModelCopyWith(AuthResponseModel value, $Res Function(AuthResponseModel) _then) = _$AuthResponseModelCopyWithImpl;
@useResult
$Res call({
 UserModel user, bool isAdmin, TokensModel tokens
});


$UserModelCopyWith<$Res> get user;$TokensModelCopyWith<$Res> get tokens;

}
/// @nodoc
class _$AuthResponseModelCopyWithImpl<$Res>
    implements $AuthResponseModelCopyWith<$Res> {
  _$AuthResponseModelCopyWithImpl(this._self, this._then);

  final AuthResponseModel _self;
  final $Res Function(AuthResponseModel) _then;

/// Create a copy of AuthResponseModel
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? user = null,Object? isAdmin = null,Object? tokens = null,}) {
  return _then(_self.copyWith(
user: null == user ? _self.user : user // ignore: cast_nullable_to_non_nullable
as UserModel,isAdmin: null == isAdmin ? _self.isAdmin : isAdmin // ignore: cast_nullable_to_non_nullable
as bool,tokens: null == tokens ? _self.tokens : tokens // ignore: cast_nullable_to_non_nullable
as TokensModel,
  ));
}
/// Create a copy of AuthResponseModel
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$UserModelCopyWith<$Res> get user {
  
  return $UserModelCopyWith<$Res>(_self.user, (value) {
    return _then(_self.copyWith(user: value));
  });
}/// Create a copy of AuthResponseModel
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$TokensModelCopyWith<$Res> get tokens {
  
  return $TokensModelCopyWith<$Res>(_self.tokens, (value) {
    return _then(_self.copyWith(tokens: value));
  });
}
}


/// Adds pattern-matching-related methods to [AuthResponseModel].
extension AuthResponseModelPatterns on AuthResponseModel {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _AuthResponseModel value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _AuthResponseModel() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _AuthResponseModel value)  $default,){
final _that = this;
switch (_that) {
case _AuthResponseModel():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _AuthResponseModel value)?  $default,){
final _that = this;
switch (_that) {
case _AuthResponseModel() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( UserModel user,  bool isAdmin,  TokensModel tokens)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _AuthResponseModel() when $default != null:
return $default(_that.user,_that.isAdmin,_that.tokens);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( UserModel user,  bool isAdmin,  TokensModel tokens)  $default,) {final _that = this;
switch (_that) {
case _AuthResponseModel():
return $default(_that.user,_that.isAdmin,_that.tokens);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( UserModel user,  bool isAdmin,  TokensModel tokens)?  $default,) {final _that = this;
switch (_that) {
case _AuthResponseModel() when $default != null:
return $default(_that.user,_that.isAdmin,_that.tokens);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _AuthResponseModel extends AuthResponseModel {
  const _AuthResponseModel({required this.user, this.isAdmin = false, required this.tokens}): super._();
  factory _AuthResponseModel.fromJson(Map<String, dynamic> json) => _$AuthResponseModelFromJson(json);

@override final  UserModel user;
@override@JsonKey() final  bool isAdmin;
@override final  TokensModel tokens;

/// Create a copy of AuthResponseModel
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$AuthResponseModelCopyWith<_AuthResponseModel> get copyWith => __$AuthResponseModelCopyWithImpl<_AuthResponseModel>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$AuthResponseModelToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _AuthResponseModel&&(identical(other.user, user) || other.user == user)&&(identical(other.isAdmin, isAdmin) || other.isAdmin == isAdmin)&&(identical(other.tokens, tokens) || other.tokens == tokens));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,user,isAdmin,tokens);

@override
String toString() {
  return 'AuthResponseModel(user: $user, isAdmin: $isAdmin, tokens: $tokens)';
}


}

/// @nodoc
abstract mixin class _$AuthResponseModelCopyWith<$Res> implements $AuthResponseModelCopyWith<$Res> {
  factory _$AuthResponseModelCopyWith(_AuthResponseModel value, $Res Function(_AuthResponseModel) _then) = __$AuthResponseModelCopyWithImpl;
@override @useResult
$Res call({
 UserModel user, bool isAdmin, TokensModel tokens
});


@override $UserModelCopyWith<$Res> get user;@override $TokensModelCopyWith<$Res> get tokens;

}
/// @nodoc
class __$AuthResponseModelCopyWithImpl<$Res>
    implements _$AuthResponseModelCopyWith<$Res> {
  __$AuthResponseModelCopyWithImpl(this._self, this._then);

  final _AuthResponseModel _self;
  final $Res Function(_AuthResponseModel) _then;

/// Create a copy of AuthResponseModel
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? user = null,Object? isAdmin = null,Object? tokens = null,}) {
  return _then(_AuthResponseModel(
user: null == user ? _self.user : user // ignore: cast_nullable_to_non_nullable
as UserModel,isAdmin: null == isAdmin ? _self.isAdmin : isAdmin // ignore: cast_nullable_to_non_nullable
as bool,tokens: null == tokens ? _self.tokens : tokens // ignore: cast_nullable_to_non_nullable
as TokensModel,
  ));
}

/// Create a copy of AuthResponseModel
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$UserModelCopyWith<$Res> get user {
  
  return $UserModelCopyWith<$Res>(_self.user, (value) {
    return _then(_self.copyWith(user: value));
  });
}/// Create a copy of AuthResponseModel
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$TokensModelCopyWith<$Res> get tokens {
  
  return $TokensModelCopyWith<$Res>(_self.tokens, (value) {
    return _then(_self.copyWith(tokens: value));
  });
}
}


/// @nodoc
mixin _$TokensModel {

 String get accessToken; String get refreshToken; String get tokenType; int get accessExpiresIn; int get refreshExpiresIn;
/// Create a copy of TokensModel
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$TokensModelCopyWith<TokensModel> get copyWith => _$TokensModelCopyWithImpl<TokensModel>(this as TokensModel, _$identity);

  /// Serializes this TokensModel to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is TokensModel&&(identical(other.accessToken, accessToken) || other.accessToken == accessToken)&&(identical(other.refreshToken, refreshToken) || other.refreshToken == refreshToken)&&(identical(other.tokenType, tokenType) || other.tokenType == tokenType)&&(identical(other.accessExpiresIn, accessExpiresIn) || other.accessExpiresIn == accessExpiresIn)&&(identical(other.refreshExpiresIn, refreshExpiresIn) || other.refreshExpiresIn == refreshExpiresIn));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,accessToken,refreshToken,tokenType,accessExpiresIn,refreshExpiresIn);

@override
String toString() {
  return 'TokensModel(accessToken: $accessToken, refreshToken: $refreshToken, tokenType: $tokenType, accessExpiresIn: $accessExpiresIn, refreshExpiresIn: $refreshExpiresIn)';
}


}

/// @nodoc
abstract mixin class $TokensModelCopyWith<$Res>  {
  factory $TokensModelCopyWith(TokensModel value, $Res Function(TokensModel) _then) = _$TokensModelCopyWithImpl;
@useResult
$Res call({
 String accessToken, String refreshToken, String tokenType, int accessExpiresIn, int refreshExpiresIn
});




}
/// @nodoc
class _$TokensModelCopyWithImpl<$Res>
    implements $TokensModelCopyWith<$Res> {
  _$TokensModelCopyWithImpl(this._self, this._then);

  final TokensModel _self;
  final $Res Function(TokensModel) _then;

/// Create a copy of TokensModel
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? accessToken = null,Object? refreshToken = null,Object? tokenType = null,Object? accessExpiresIn = null,Object? refreshExpiresIn = null,}) {
  return _then(_self.copyWith(
accessToken: null == accessToken ? _self.accessToken : accessToken // ignore: cast_nullable_to_non_nullable
as String,refreshToken: null == refreshToken ? _self.refreshToken : refreshToken // ignore: cast_nullable_to_non_nullable
as String,tokenType: null == tokenType ? _self.tokenType : tokenType // ignore: cast_nullable_to_non_nullable
as String,accessExpiresIn: null == accessExpiresIn ? _self.accessExpiresIn : accessExpiresIn // ignore: cast_nullable_to_non_nullable
as int,refreshExpiresIn: null == refreshExpiresIn ? _self.refreshExpiresIn : refreshExpiresIn // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [TokensModel].
extension TokensModelPatterns on TokensModel {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _TokensModel value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _TokensModel() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _TokensModel value)  $default,){
final _that = this;
switch (_that) {
case _TokensModel():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _TokensModel value)?  $default,){
final _that = this;
switch (_that) {
case _TokensModel() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String accessToken,  String refreshToken,  String tokenType,  int accessExpiresIn,  int refreshExpiresIn)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _TokensModel() when $default != null:
return $default(_that.accessToken,_that.refreshToken,_that.tokenType,_that.accessExpiresIn,_that.refreshExpiresIn);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String accessToken,  String refreshToken,  String tokenType,  int accessExpiresIn,  int refreshExpiresIn)  $default,) {final _that = this;
switch (_that) {
case _TokensModel():
return $default(_that.accessToken,_that.refreshToken,_that.tokenType,_that.accessExpiresIn,_that.refreshExpiresIn);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String accessToken,  String refreshToken,  String tokenType,  int accessExpiresIn,  int refreshExpiresIn)?  $default,) {final _that = this;
switch (_that) {
case _TokensModel() when $default != null:
return $default(_that.accessToken,_that.refreshToken,_that.tokenType,_that.accessExpiresIn,_that.refreshExpiresIn);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _TokensModel extends TokensModel {
  const _TokensModel({required this.accessToken, required this.refreshToken, this.tokenType = 'Bearer', this.accessExpiresIn = 1800, this.refreshExpiresIn = 5184000}): super._();
  factory _TokensModel.fromJson(Map<String, dynamic> json) => _$TokensModelFromJson(json);

@override final  String accessToken;
@override final  String refreshToken;
@override@JsonKey() final  String tokenType;
@override@JsonKey() final  int accessExpiresIn;
@override@JsonKey() final  int refreshExpiresIn;

/// Create a copy of TokensModel
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$TokensModelCopyWith<_TokensModel> get copyWith => __$TokensModelCopyWithImpl<_TokensModel>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$TokensModelToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _TokensModel&&(identical(other.accessToken, accessToken) || other.accessToken == accessToken)&&(identical(other.refreshToken, refreshToken) || other.refreshToken == refreshToken)&&(identical(other.tokenType, tokenType) || other.tokenType == tokenType)&&(identical(other.accessExpiresIn, accessExpiresIn) || other.accessExpiresIn == accessExpiresIn)&&(identical(other.refreshExpiresIn, refreshExpiresIn) || other.refreshExpiresIn == refreshExpiresIn));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,accessToken,refreshToken,tokenType,accessExpiresIn,refreshExpiresIn);

@override
String toString() {
  return 'TokensModel(accessToken: $accessToken, refreshToken: $refreshToken, tokenType: $tokenType, accessExpiresIn: $accessExpiresIn, refreshExpiresIn: $refreshExpiresIn)';
}


}

/// @nodoc
abstract mixin class _$TokensModelCopyWith<$Res> implements $TokensModelCopyWith<$Res> {
  factory _$TokensModelCopyWith(_TokensModel value, $Res Function(_TokensModel) _then) = __$TokensModelCopyWithImpl;
@override @useResult
$Res call({
 String accessToken, String refreshToken, String tokenType, int accessExpiresIn, int refreshExpiresIn
});




}
/// @nodoc
class __$TokensModelCopyWithImpl<$Res>
    implements _$TokensModelCopyWith<$Res> {
  __$TokensModelCopyWithImpl(this._self, this._then);

  final _TokensModel _self;
  final $Res Function(_TokensModel) _then;

/// Create a copy of TokensModel
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? accessToken = null,Object? refreshToken = null,Object? tokenType = null,Object? accessExpiresIn = null,Object? refreshExpiresIn = null,}) {
  return _then(_TokensModel(
accessToken: null == accessToken ? _self.accessToken : accessToken // ignore: cast_nullable_to_non_nullable
as String,refreshToken: null == refreshToken ? _self.refreshToken : refreshToken // ignore: cast_nullable_to_non_nullable
as String,tokenType: null == tokenType ? _self.tokenType : tokenType // ignore: cast_nullable_to_non_nullable
as String,accessExpiresIn: null == accessExpiresIn ? _self.accessExpiresIn : accessExpiresIn // ignore: cast_nullable_to_non_nullable
as int,refreshExpiresIn: null == refreshExpiresIn ? _self.refreshExpiresIn : refreshExpiresIn // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}


/// @nodoc
mixin _$MeResponseModel {

 UserModel get user; bool get isAdmin;
/// Create a copy of MeResponseModel
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$MeResponseModelCopyWith<MeResponseModel> get copyWith => _$MeResponseModelCopyWithImpl<MeResponseModel>(this as MeResponseModel, _$identity);

  /// Serializes this MeResponseModel to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is MeResponseModel&&(identical(other.user, user) || other.user == user)&&(identical(other.isAdmin, isAdmin) || other.isAdmin == isAdmin));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,user,isAdmin);

@override
String toString() {
  return 'MeResponseModel(user: $user, isAdmin: $isAdmin)';
}


}

/// @nodoc
abstract mixin class $MeResponseModelCopyWith<$Res>  {
  factory $MeResponseModelCopyWith(MeResponseModel value, $Res Function(MeResponseModel) _then) = _$MeResponseModelCopyWithImpl;
@useResult
$Res call({
 UserModel user, bool isAdmin
});


$UserModelCopyWith<$Res> get user;

}
/// @nodoc
class _$MeResponseModelCopyWithImpl<$Res>
    implements $MeResponseModelCopyWith<$Res> {
  _$MeResponseModelCopyWithImpl(this._self, this._then);

  final MeResponseModel _self;
  final $Res Function(MeResponseModel) _then;

/// Create a copy of MeResponseModel
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? user = null,Object? isAdmin = null,}) {
  return _then(_self.copyWith(
user: null == user ? _self.user : user // ignore: cast_nullable_to_non_nullable
as UserModel,isAdmin: null == isAdmin ? _self.isAdmin : isAdmin // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}
/// Create a copy of MeResponseModel
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$UserModelCopyWith<$Res> get user {
  
  return $UserModelCopyWith<$Res>(_self.user, (value) {
    return _then(_self.copyWith(user: value));
  });
}
}


/// Adds pattern-matching-related methods to [MeResponseModel].
extension MeResponseModelPatterns on MeResponseModel {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _MeResponseModel value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _MeResponseModel() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _MeResponseModel value)  $default,){
final _that = this;
switch (_that) {
case _MeResponseModel():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _MeResponseModel value)?  $default,){
final _that = this;
switch (_that) {
case _MeResponseModel() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( UserModel user,  bool isAdmin)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _MeResponseModel() when $default != null:
return $default(_that.user,_that.isAdmin);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( UserModel user,  bool isAdmin)  $default,) {final _that = this;
switch (_that) {
case _MeResponseModel():
return $default(_that.user,_that.isAdmin);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( UserModel user,  bool isAdmin)?  $default,) {final _that = this;
switch (_that) {
case _MeResponseModel() when $default != null:
return $default(_that.user,_that.isAdmin);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _MeResponseModel extends MeResponseModel {
  const _MeResponseModel({required this.user, this.isAdmin = false}): super._();
  factory _MeResponseModel.fromJson(Map<String, dynamic> json) => _$MeResponseModelFromJson(json);

@override final  UserModel user;
@override@JsonKey() final  bool isAdmin;

/// Create a copy of MeResponseModel
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$MeResponseModelCopyWith<_MeResponseModel> get copyWith => __$MeResponseModelCopyWithImpl<_MeResponseModel>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$MeResponseModelToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _MeResponseModel&&(identical(other.user, user) || other.user == user)&&(identical(other.isAdmin, isAdmin) || other.isAdmin == isAdmin));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,user,isAdmin);

@override
String toString() {
  return 'MeResponseModel(user: $user, isAdmin: $isAdmin)';
}


}

/// @nodoc
abstract mixin class _$MeResponseModelCopyWith<$Res> implements $MeResponseModelCopyWith<$Res> {
  factory _$MeResponseModelCopyWith(_MeResponseModel value, $Res Function(_MeResponseModel) _then) = __$MeResponseModelCopyWithImpl;
@override @useResult
$Res call({
 UserModel user, bool isAdmin
});


@override $UserModelCopyWith<$Res> get user;

}
/// @nodoc
class __$MeResponseModelCopyWithImpl<$Res>
    implements _$MeResponseModelCopyWith<$Res> {
  __$MeResponseModelCopyWithImpl(this._self, this._then);

  final _MeResponseModel _self;
  final $Res Function(_MeResponseModel) _then;

/// Create a copy of MeResponseModel
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? user = null,Object? isAdmin = null,}) {
  return _then(_MeResponseModel(
user: null == user ? _self.user : user // ignore: cast_nullable_to_non_nullable
as UserModel,isAdmin: null == isAdmin ? _self.isAdmin : isAdmin // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}

/// Create a copy of MeResponseModel
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$UserModelCopyWith<$Res> get user {
  
  return $UserModelCopyWith<$Res>(_self.user, (value) {
    return _then(_self.copyWith(user: value));
  });
}
}


/// @nodoc
mixin _$UpdateUserResponseModel {

 UserModel get user;
/// Create a copy of UpdateUserResponseModel
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$UpdateUserResponseModelCopyWith<UpdateUserResponseModel> get copyWith => _$UpdateUserResponseModelCopyWithImpl<UpdateUserResponseModel>(this as UpdateUserResponseModel, _$identity);

  /// Serializes this UpdateUserResponseModel to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is UpdateUserResponseModel&&(identical(other.user, user) || other.user == user));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,user);

@override
String toString() {
  return 'UpdateUserResponseModel(user: $user)';
}


}

/// @nodoc
abstract mixin class $UpdateUserResponseModelCopyWith<$Res>  {
  factory $UpdateUserResponseModelCopyWith(UpdateUserResponseModel value, $Res Function(UpdateUserResponseModel) _then) = _$UpdateUserResponseModelCopyWithImpl;
@useResult
$Res call({
 UserModel user
});


$UserModelCopyWith<$Res> get user;

}
/// @nodoc
class _$UpdateUserResponseModelCopyWithImpl<$Res>
    implements $UpdateUserResponseModelCopyWith<$Res> {
  _$UpdateUserResponseModelCopyWithImpl(this._self, this._then);

  final UpdateUserResponseModel _self;
  final $Res Function(UpdateUserResponseModel) _then;

/// Create a copy of UpdateUserResponseModel
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? user = null,}) {
  return _then(_self.copyWith(
user: null == user ? _self.user : user // ignore: cast_nullable_to_non_nullable
as UserModel,
  ));
}
/// Create a copy of UpdateUserResponseModel
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$UserModelCopyWith<$Res> get user {
  
  return $UserModelCopyWith<$Res>(_self.user, (value) {
    return _then(_self.copyWith(user: value));
  });
}
}


/// Adds pattern-matching-related methods to [UpdateUserResponseModel].
extension UpdateUserResponseModelPatterns on UpdateUserResponseModel {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _UpdateUserResponseModel value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _UpdateUserResponseModel() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _UpdateUserResponseModel value)  $default,){
final _that = this;
switch (_that) {
case _UpdateUserResponseModel():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _UpdateUserResponseModel value)?  $default,){
final _that = this;
switch (_that) {
case _UpdateUserResponseModel() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( UserModel user)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _UpdateUserResponseModel() when $default != null:
return $default(_that.user);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( UserModel user)  $default,) {final _that = this;
switch (_that) {
case _UpdateUserResponseModel():
return $default(_that.user);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( UserModel user)?  $default,) {final _that = this;
switch (_that) {
case _UpdateUserResponseModel() when $default != null:
return $default(_that.user);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _UpdateUserResponseModel implements UpdateUserResponseModel {
  const _UpdateUserResponseModel({required this.user});
  factory _UpdateUserResponseModel.fromJson(Map<String, dynamic> json) => _$UpdateUserResponseModelFromJson(json);

@override final  UserModel user;

/// Create a copy of UpdateUserResponseModel
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$UpdateUserResponseModelCopyWith<_UpdateUserResponseModel> get copyWith => __$UpdateUserResponseModelCopyWithImpl<_UpdateUserResponseModel>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$UpdateUserResponseModelToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _UpdateUserResponseModel&&(identical(other.user, user) || other.user == user));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,user);

@override
String toString() {
  return 'UpdateUserResponseModel(user: $user)';
}


}

/// @nodoc
abstract mixin class _$UpdateUserResponseModelCopyWith<$Res> implements $UpdateUserResponseModelCopyWith<$Res> {
  factory _$UpdateUserResponseModelCopyWith(_UpdateUserResponseModel value, $Res Function(_UpdateUserResponseModel) _then) = __$UpdateUserResponseModelCopyWithImpl;
@override @useResult
$Res call({
 UserModel user
});


@override $UserModelCopyWith<$Res> get user;

}
/// @nodoc
class __$UpdateUserResponseModelCopyWithImpl<$Res>
    implements _$UpdateUserResponseModelCopyWith<$Res> {
  __$UpdateUserResponseModelCopyWithImpl(this._self, this._then);

  final _UpdateUserResponseModel _self;
  final $Res Function(_UpdateUserResponseModel) _then;

/// Create a copy of UpdateUserResponseModel
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? user = null,}) {
  return _then(_UpdateUserResponseModel(
user: null == user ? _self.user : user // ignore: cast_nullable_to_non_nullable
as UserModel,
  ));
}

/// Create a copy of UpdateUserResponseModel
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$UserModelCopyWith<$Res> get user {
  
  return $UserModelCopyWith<$Res>(_self.user, (value) {
    return _then(_self.copyWith(user: value));
  });
}
}

// dart format on
