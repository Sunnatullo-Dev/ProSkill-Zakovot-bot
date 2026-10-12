// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'user_model.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$UserModel {

 String get id; int get telegramId; String? get phone; String? get email; String? get firstName; String? get lastName; String? get username; String? get displayName; int get score; String get language; int get currentStreak; String get authProvider; bool get isAppAccount; bool get hasPassword; List<String> get unlockedAchievements; bool get isPremium; String? get premiumUntil; String? get createdAt;
/// Create a copy of UserModel
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$UserModelCopyWith<UserModel> get copyWith => _$UserModelCopyWithImpl<UserModel>(this as UserModel, _$identity);

  /// Serializes this UserModel to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is UserModel&&(identical(other.id, id) || other.id == id)&&(identical(other.telegramId, telegramId) || other.telegramId == telegramId)&&(identical(other.phone, phone) || other.phone == phone)&&(identical(other.email, email) || other.email == email)&&(identical(other.firstName, firstName) || other.firstName == firstName)&&(identical(other.lastName, lastName) || other.lastName == lastName)&&(identical(other.username, username) || other.username == username)&&(identical(other.displayName, displayName) || other.displayName == displayName)&&(identical(other.score, score) || other.score == score)&&(identical(other.language, language) || other.language == language)&&(identical(other.currentStreak, currentStreak) || other.currentStreak == currentStreak)&&(identical(other.authProvider, authProvider) || other.authProvider == authProvider)&&(identical(other.isAppAccount, isAppAccount) || other.isAppAccount == isAppAccount)&&(identical(other.hasPassword, hasPassword) || other.hasPassword == hasPassword)&&const DeepCollectionEquality().equals(other.unlockedAchievements, unlockedAchievements)&&(identical(other.isPremium, isPremium) || other.isPremium == isPremium)&&(identical(other.premiumUntil, premiumUntil) || other.premiumUntil == premiumUntil)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,telegramId,phone,email,firstName,lastName,username,displayName,score,language,currentStreak,authProvider,isAppAccount,hasPassword,const DeepCollectionEquality().hash(unlockedAchievements),isPremium,premiumUntil,createdAt);

@override
String toString() {
  return 'UserModel(id: $id, telegramId: $telegramId, phone: $phone, email: $email, firstName: $firstName, lastName: $lastName, username: $username, displayName: $displayName, score: $score, language: $language, currentStreak: $currentStreak, authProvider: $authProvider, isAppAccount: $isAppAccount, hasPassword: $hasPassword, unlockedAchievements: $unlockedAchievements, isPremium: $isPremium, premiumUntil: $premiumUntil, createdAt: $createdAt)';
}


}

/// @nodoc
abstract mixin class $UserModelCopyWith<$Res>  {
  factory $UserModelCopyWith(UserModel value, $Res Function(UserModel) _then) = _$UserModelCopyWithImpl;
@useResult
$Res call({
 String id, int telegramId, String? phone, String? email, String? firstName, String? lastName, String? username, String? displayName, int score, String language, int currentStreak, String authProvider, bool isAppAccount, bool hasPassword, List<String> unlockedAchievements, bool isPremium, String? premiumUntil, String? createdAt
});




}
/// @nodoc
class _$UserModelCopyWithImpl<$Res>
    implements $UserModelCopyWith<$Res> {
  _$UserModelCopyWithImpl(this._self, this._then);

  final UserModel _self;
  final $Res Function(UserModel) _then;

/// Create a copy of UserModel
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? telegramId = null,Object? phone = freezed,Object? email = freezed,Object? firstName = freezed,Object? lastName = freezed,Object? username = freezed,Object? displayName = freezed,Object? score = null,Object? language = null,Object? currentStreak = null,Object? authProvider = null,Object? isAppAccount = null,Object? hasPassword = null,Object? unlockedAchievements = null,Object? isPremium = null,Object? premiumUntil = freezed,Object? createdAt = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,telegramId: null == telegramId ? _self.telegramId : telegramId // ignore: cast_nullable_to_non_nullable
as int,phone: freezed == phone ? _self.phone : phone // ignore: cast_nullable_to_non_nullable
as String?,email: freezed == email ? _self.email : email // ignore: cast_nullable_to_non_nullable
as String?,firstName: freezed == firstName ? _self.firstName : firstName // ignore: cast_nullable_to_non_nullable
as String?,lastName: freezed == lastName ? _self.lastName : lastName // ignore: cast_nullable_to_non_nullable
as String?,username: freezed == username ? _self.username : username // ignore: cast_nullable_to_non_nullable
as String?,displayName: freezed == displayName ? _self.displayName : displayName // ignore: cast_nullable_to_non_nullable
as String?,score: null == score ? _self.score : score // ignore: cast_nullable_to_non_nullable
as int,language: null == language ? _self.language : language // ignore: cast_nullable_to_non_nullable
as String,currentStreak: null == currentStreak ? _self.currentStreak : currentStreak // ignore: cast_nullable_to_non_nullable
as int,authProvider: null == authProvider ? _self.authProvider : authProvider // ignore: cast_nullable_to_non_nullable
as String,isAppAccount: null == isAppAccount ? _self.isAppAccount : isAppAccount // ignore: cast_nullable_to_non_nullable
as bool,hasPassword: null == hasPassword ? _self.hasPassword : hasPassword // ignore: cast_nullable_to_non_nullable
as bool,unlockedAchievements: null == unlockedAchievements ? _self.unlockedAchievements : unlockedAchievements // ignore: cast_nullable_to_non_nullable
as List<String>,isPremium: null == isPremium ? _self.isPremium : isPremium // ignore: cast_nullable_to_non_nullable
as bool,premiumUntil: freezed == premiumUntil ? _self.premiumUntil : premiumUntil // ignore: cast_nullable_to_non_nullable
as String?,createdAt: freezed == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [UserModel].
extension UserModelPatterns on UserModel {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _UserModel value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _UserModel() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _UserModel value)  $default,){
final _that = this;
switch (_that) {
case _UserModel():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _UserModel value)?  $default,){
final _that = this;
switch (_that) {
case _UserModel() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  int telegramId,  String? phone,  String? email,  String? firstName,  String? lastName,  String? username,  String? displayName,  int score,  String language,  int currentStreak,  String authProvider,  bool isAppAccount,  bool hasPassword,  List<String> unlockedAchievements,  bool isPremium,  String? premiumUntil,  String? createdAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _UserModel() when $default != null:
return $default(_that.id,_that.telegramId,_that.phone,_that.email,_that.firstName,_that.lastName,_that.username,_that.displayName,_that.score,_that.language,_that.currentStreak,_that.authProvider,_that.isAppAccount,_that.hasPassword,_that.unlockedAchievements,_that.isPremium,_that.premiumUntil,_that.createdAt);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  int telegramId,  String? phone,  String? email,  String? firstName,  String? lastName,  String? username,  String? displayName,  int score,  String language,  int currentStreak,  String authProvider,  bool isAppAccount,  bool hasPassword,  List<String> unlockedAchievements,  bool isPremium,  String? premiumUntil,  String? createdAt)  $default,) {final _that = this;
switch (_that) {
case _UserModel():
return $default(_that.id,_that.telegramId,_that.phone,_that.email,_that.firstName,_that.lastName,_that.username,_that.displayName,_that.score,_that.language,_that.currentStreak,_that.authProvider,_that.isAppAccount,_that.hasPassword,_that.unlockedAchievements,_that.isPremium,_that.premiumUntil,_that.createdAt);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  int telegramId,  String? phone,  String? email,  String? firstName,  String? lastName,  String? username,  String? displayName,  int score,  String language,  int currentStreak,  String authProvider,  bool isAppAccount,  bool hasPassword,  List<String> unlockedAchievements,  bool isPremium,  String? premiumUntil,  String? createdAt)?  $default,) {final _that = this;
switch (_that) {
case _UserModel() when $default != null:
return $default(_that.id,_that.telegramId,_that.phone,_that.email,_that.firstName,_that.lastName,_that.username,_that.displayName,_that.score,_that.language,_that.currentStreak,_that.authProvider,_that.isAppAccount,_that.hasPassword,_that.unlockedAchievements,_that.isPremium,_that.premiumUntil,_that.createdAt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _UserModel extends UserModel {
  const _UserModel({required this.id, required this.telegramId, this.phone, this.email, this.firstName, this.lastName, this.username, this.displayName, this.score = 0, this.language = 'uz-latn', this.currentStreak = 0, this.authProvider = 'telegram', this.isAppAccount = false, this.hasPassword = false, final  List<String> unlockedAchievements = const <String>[], this.isPremium = false, this.premiumUntil, this.createdAt}): _unlockedAchievements = unlockedAchievements,super._();
  factory _UserModel.fromJson(Map<String, dynamic> json) => _$UserModelFromJson(json);

@override final  String id;
@override final  int telegramId;
@override final  String? phone;
@override final  String? email;
@override final  String? firstName;
@override final  String? lastName;
@override final  String? username;
@override final  String? displayName;
@override@JsonKey() final  int score;
@override@JsonKey() final  String language;
@override@JsonKey() final  int currentStreak;
@override@JsonKey() final  String authProvider;
@override@JsonKey() final  bool isAppAccount;
@override@JsonKey() final  bool hasPassword;
 final  List<String> _unlockedAchievements;
@override@JsonKey() List<String> get unlockedAchievements {
  if (_unlockedAchievements is EqualUnmodifiableListView) return _unlockedAchievements;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_unlockedAchievements);
}

@override@JsonKey() final  bool isPremium;
@override final  String? premiumUntil;
@override final  String? createdAt;

/// Create a copy of UserModel
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$UserModelCopyWith<_UserModel> get copyWith => __$UserModelCopyWithImpl<_UserModel>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$UserModelToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _UserModel&&(identical(other.id, id) || other.id == id)&&(identical(other.telegramId, telegramId) || other.telegramId == telegramId)&&(identical(other.phone, phone) || other.phone == phone)&&(identical(other.email, email) || other.email == email)&&(identical(other.firstName, firstName) || other.firstName == firstName)&&(identical(other.lastName, lastName) || other.lastName == lastName)&&(identical(other.username, username) || other.username == username)&&(identical(other.displayName, displayName) || other.displayName == displayName)&&(identical(other.score, score) || other.score == score)&&(identical(other.language, language) || other.language == language)&&(identical(other.currentStreak, currentStreak) || other.currentStreak == currentStreak)&&(identical(other.authProvider, authProvider) || other.authProvider == authProvider)&&(identical(other.isAppAccount, isAppAccount) || other.isAppAccount == isAppAccount)&&(identical(other.hasPassword, hasPassword) || other.hasPassword == hasPassword)&&const DeepCollectionEquality().equals(other._unlockedAchievements, _unlockedAchievements)&&(identical(other.isPremium, isPremium) || other.isPremium == isPremium)&&(identical(other.premiumUntil, premiumUntil) || other.premiumUntil == premiumUntil)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,telegramId,phone,email,firstName,lastName,username,displayName,score,language,currentStreak,authProvider,isAppAccount,hasPassword,const DeepCollectionEquality().hash(_unlockedAchievements),isPremium,premiumUntil,createdAt);

@override
String toString() {
  return 'UserModel(id: $id, telegramId: $telegramId, phone: $phone, email: $email, firstName: $firstName, lastName: $lastName, username: $username, displayName: $displayName, score: $score, language: $language, currentStreak: $currentStreak, authProvider: $authProvider, isAppAccount: $isAppAccount, hasPassword: $hasPassword, unlockedAchievements: $unlockedAchievements, isPremium: $isPremium, premiumUntil: $premiumUntil, createdAt: $createdAt)';
}


}

/// @nodoc
abstract mixin class _$UserModelCopyWith<$Res> implements $UserModelCopyWith<$Res> {
  factory _$UserModelCopyWith(_UserModel value, $Res Function(_UserModel) _then) = __$UserModelCopyWithImpl;
@override @useResult
$Res call({
 String id, int telegramId, String? phone, String? email, String? firstName, String? lastName, String? username, String? displayName, int score, String language, int currentStreak, String authProvider, bool isAppAccount, bool hasPassword, List<String> unlockedAchievements, bool isPremium, String? premiumUntil, String? createdAt
});




}
/// @nodoc
class __$UserModelCopyWithImpl<$Res>
    implements _$UserModelCopyWith<$Res> {
  __$UserModelCopyWithImpl(this._self, this._then);

  final _UserModel _self;
  final $Res Function(_UserModel) _then;

/// Create a copy of UserModel
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? telegramId = null,Object? phone = freezed,Object? email = freezed,Object? firstName = freezed,Object? lastName = freezed,Object? username = freezed,Object? displayName = freezed,Object? score = null,Object? language = null,Object? currentStreak = null,Object? authProvider = null,Object? isAppAccount = null,Object? hasPassword = null,Object? unlockedAchievements = null,Object? isPremium = null,Object? premiumUntil = freezed,Object? createdAt = freezed,}) {
  return _then(_UserModel(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,telegramId: null == telegramId ? _self.telegramId : telegramId // ignore: cast_nullable_to_non_nullable
as int,phone: freezed == phone ? _self.phone : phone // ignore: cast_nullable_to_non_nullable
as String?,email: freezed == email ? _self.email : email // ignore: cast_nullable_to_non_nullable
as String?,firstName: freezed == firstName ? _self.firstName : firstName // ignore: cast_nullable_to_non_nullable
as String?,lastName: freezed == lastName ? _self.lastName : lastName // ignore: cast_nullable_to_non_nullable
as String?,username: freezed == username ? _self.username : username // ignore: cast_nullable_to_non_nullable
as String?,displayName: freezed == displayName ? _self.displayName : displayName // ignore: cast_nullable_to_non_nullable
as String?,score: null == score ? _self.score : score // ignore: cast_nullable_to_non_nullable
as int,language: null == language ? _self.language : language // ignore: cast_nullable_to_non_nullable
as String,currentStreak: null == currentStreak ? _self.currentStreak : currentStreak // ignore: cast_nullable_to_non_nullable
as int,authProvider: null == authProvider ? _self.authProvider : authProvider // ignore: cast_nullable_to_non_nullable
as String,isAppAccount: null == isAppAccount ? _self.isAppAccount : isAppAccount // ignore: cast_nullable_to_non_nullable
as bool,hasPassword: null == hasPassword ? _self.hasPassword : hasPassword // ignore: cast_nullable_to_non_nullable
as bool,unlockedAchievements: null == unlockedAchievements ? _self._unlockedAchievements : unlockedAchievements // ignore: cast_nullable_to_non_nullable
as List<String>,isPremium: null == isPremium ? _self.isPremium : isPremium // ignore: cast_nullable_to_non_nullable
as bool,premiumUntil: freezed == premiumUntil ? _self.premiumUntil : premiumUntil // ignore: cast_nullable_to_non_nullable
as String?,createdAt: freezed == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}

// dart format on
