// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'leaderboard_models.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$LeaderboardResponseModel {

 List<LeaderboardUserModel> get users; int get rank; int get limit;/// Faqat `period=monthly` da keladi.
 int get myMonthlyScore;
/// Create a copy of LeaderboardResponseModel
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$LeaderboardResponseModelCopyWith<LeaderboardResponseModel> get copyWith => _$LeaderboardResponseModelCopyWithImpl<LeaderboardResponseModel>(this as LeaderboardResponseModel, _$identity);

  /// Serializes this LeaderboardResponseModel to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is LeaderboardResponseModel&&const DeepCollectionEquality().equals(other.users, users)&&(identical(other.rank, rank) || other.rank == rank)&&(identical(other.limit, limit) || other.limit == limit)&&(identical(other.myMonthlyScore, myMonthlyScore) || other.myMonthlyScore == myMonthlyScore));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,const DeepCollectionEquality().hash(users),rank,limit,myMonthlyScore);

@override
String toString() {
  return 'LeaderboardResponseModel(users: $users, rank: $rank, limit: $limit, myMonthlyScore: $myMonthlyScore)';
}


}

/// @nodoc
abstract mixin class $LeaderboardResponseModelCopyWith<$Res>  {
  factory $LeaderboardResponseModelCopyWith(LeaderboardResponseModel value, $Res Function(LeaderboardResponseModel) _then) = _$LeaderboardResponseModelCopyWithImpl;
@useResult
$Res call({
 List<LeaderboardUserModel> users, int rank, int limit, int myMonthlyScore
});




}
/// @nodoc
class _$LeaderboardResponseModelCopyWithImpl<$Res>
    implements $LeaderboardResponseModelCopyWith<$Res> {
  _$LeaderboardResponseModelCopyWithImpl(this._self, this._then);

  final LeaderboardResponseModel _self;
  final $Res Function(LeaderboardResponseModel) _then;

/// Create a copy of LeaderboardResponseModel
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? users = null,Object? rank = null,Object? limit = null,Object? myMonthlyScore = null,}) {
  return _then(_self.copyWith(
users: null == users ? _self.users : users // ignore: cast_nullable_to_non_nullable
as List<LeaderboardUserModel>,rank: null == rank ? _self.rank : rank // ignore: cast_nullable_to_non_nullable
as int,limit: null == limit ? _self.limit : limit // ignore: cast_nullable_to_non_nullable
as int,myMonthlyScore: null == myMonthlyScore ? _self.myMonthlyScore : myMonthlyScore // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [LeaderboardResponseModel].
extension LeaderboardResponseModelPatterns on LeaderboardResponseModel {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _LeaderboardResponseModel value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _LeaderboardResponseModel() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _LeaderboardResponseModel value)  $default,){
final _that = this;
switch (_that) {
case _LeaderboardResponseModel():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _LeaderboardResponseModel value)?  $default,){
final _that = this;
switch (_that) {
case _LeaderboardResponseModel() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( List<LeaderboardUserModel> users,  int rank,  int limit,  int myMonthlyScore)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _LeaderboardResponseModel() when $default != null:
return $default(_that.users,_that.rank,_that.limit,_that.myMonthlyScore);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( List<LeaderboardUserModel> users,  int rank,  int limit,  int myMonthlyScore)  $default,) {final _that = this;
switch (_that) {
case _LeaderboardResponseModel():
return $default(_that.users,_that.rank,_that.limit,_that.myMonthlyScore);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( List<LeaderboardUserModel> users,  int rank,  int limit,  int myMonthlyScore)?  $default,) {final _that = this;
switch (_that) {
case _LeaderboardResponseModel() when $default != null:
return $default(_that.users,_that.rank,_that.limit,_that.myMonthlyScore);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _LeaderboardResponseModel implements LeaderboardResponseModel {
  const _LeaderboardResponseModel({final  List<LeaderboardUserModel> users = const <LeaderboardUserModel>[], this.rank = 0, this.limit = 20, this.myMonthlyScore = 0}): _users = users;
  factory _LeaderboardResponseModel.fromJson(Map<String, dynamic> json) => _$LeaderboardResponseModelFromJson(json);

 final  List<LeaderboardUserModel> _users;
@override@JsonKey() List<LeaderboardUserModel> get users {
  if (_users is EqualUnmodifiableListView) return _users;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_users);
}

@override@JsonKey() final  int rank;
@override@JsonKey() final  int limit;
/// Faqat `period=monthly` da keladi.
@override@JsonKey() final  int myMonthlyScore;

/// Create a copy of LeaderboardResponseModel
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$LeaderboardResponseModelCopyWith<_LeaderboardResponseModel> get copyWith => __$LeaderboardResponseModelCopyWithImpl<_LeaderboardResponseModel>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$LeaderboardResponseModelToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _LeaderboardResponseModel&&const DeepCollectionEquality().equals(other._users, _users)&&(identical(other.rank, rank) || other.rank == rank)&&(identical(other.limit, limit) || other.limit == limit)&&(identical(other.myMonthlyScore, myMonthlyScore) || other.myMonthlyScore == myMonthlyScore));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,const DeepCollectionEquality().hash(_users),rank,limit,myMonthlyScore);

@override
String toString() {
  return 'LeaderboardResponseModel(users: $users, rank: $rank, limit: $limit, myMonthlyScore: $myMonthlyScore)';
}


}

/// @nodoc
abstract mixin class _$LeaderboardResponseModelCopyWith<$Res> implements $LeaderboardResponseModelCopyWith<$Res> {
  factory _$LeaderboardResponseModelCopyWith(_LeaderboardResponseModel value, $Res Function(_LeaderboardResponseModel) _then) = __$LeaderboardResponseModelCopyWithImpl;
@override @useResult
$Res call({
 List<LeaderboardUserModel> users, int rank, int limit, int myMonthlyScore
});




}
/// @nodoc
class __$LeaderboardResponseModelCopyWithImpl<$Res>
    implements _$LeaderboardResponseModelCopyWith<$Res> {
  __$LeaderboardResponseModelCopyWithImpl(this._self, this._then);

  final _LeaderboardResponseModel _self;
  final $Res Function(_LeaderboardResponseModel) _then;

/// Create a copy of LeaderboardResponseModel
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? users = null,Object? rank = null,Object? limit = null,Object? myMonthlyScore = null,}) {
  return _then(_LeaderboardResponseModel(
users: null == users ? _self._users : users // ignore: cast_nullable_to_non_nullable
as List<LeaderboardUserModel>,rank: null == rank ? _self.rank : rank // ignore: cast_nullable_to_non_nullable
as int,limit: null == limit ? _self.limit : limit // ignore: cast_nullable_to_non_nullable
as int,myMonthlyScore: null == myMonthlyScore ? _self.myMonthlyScore : myMonthlyScore // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}


/// @nodoc
mixin _$LeaderboardUserModel {

 String get id; int get telegramId; String? get firstName; String? get lastName; String? get username; String? get displayName; int get score;
/// Create a copy of LeaderboardUserModel
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$LeaderboardUserModelCopyWith<LeaderboardUserModel> get copyWith => _$LeaderboardUserModelCopyWithImpl<LeaderboardUserModel>(this as LeaderboardUserModel, _$identity);

  /// Serializes this LeaderboardUserModel to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is LeaderboardUserModel&&(identical(other.id, id) || other.id == id)&&(identical(other.telegramId, telegramId) || other.telegramId == telegramId)&&(identical(other.firstName, firstName) || other.firstName == firstName)&&(identical(other.lastName, lastName) || other.lastName == lastName)&&(identical(other.username, username) || other.username == username)&&(identical(other.displayName, displayName) || other.displayName == displayName)&&(identical(other.score, score) || other.score == score));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,telegramId,firstName,lastName,username,displayName,score);

@override
String toString() {
  return 'LeaderboardUserModel(id: $id, telegramId: $telegramId, firstName: $firstName, lastName: $lastName, username: $username, displayName: $displayName, score: $score)';
}


}

/// @nodoc
abstract mixin class $LeaderboardUserModelCopyWith<$Res>  {
  factory $LeaderboardUserModelCopyWith(LeaderboardUserModel value, $Res Function(LeaderboardUserModel) _then) = _$LeaderboardUserModelCopyWithImpl;
@useResult
$Res call({
 String id, int telegramId, String? firstName, String? lastName, String? username, String? displayName, int score
});




}
/// @nodoc
class _$LeaderboardUserModelCopyWithImpl<$Res>
    implements $LeaderboardUserModelCopyWith<$Res> {
  _$LeaderboardUserModelCopyWithImpl(this._self, this._then);

  final LeaderboardUserModel _self;
  final $Res Function(LeaderboardUserModel) _then;

/// Create a copy of LeaderboardUserModel
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? telegramId = null,Object? firstName = freezed,Object? lastName = freezed,Object? username = freezed,Object? displayName = freezed,Object? score = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,telegramId: null == telegramId ? _self.telegramId : telegramId // ignore: cast_nullable_to_non_nullable
as int,firstName: freezed == firstName ? _self.firstName : firstName // ignore: cast_nullable_to_non_nullable
as String?,lastName: freezed == lastName ? _self.lastName : lastName // ignore: cast_nullable_to_non_nullable
as String?,username: freezed == username ? _self.username : username // ignore: cast_nullable_to_non_nullable
as String?,displayName: freezed == displayName ? _self.displayName : displayName // ignore: cast_nullable_to_non_nullable
as String?,score: null == score ? _self.score : score // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [LeaderboardUserModel].
extension LeaderboardUserModelPatterns on LeaderboardUserModel {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _LeaderboardUserModel value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _LeaderboardUserModel() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _LeaderboardUserModel value)  $default,){
final _that = this;
switch (_that) {
case _LeaderboardUserModel():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _LeaderboardUserModel value)?  $default,){
final _that = this;
switch (_that) {
case _LeaderboardUserModel() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  int telegramId,  String? firstName,  String? lastName,  String? username,  String? displayName,  int score)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _LeaderboardUserModel() when $default != null:
return $default(_that.id,_that.telegramId,_that.firstName,_that.lastName,_that.username,_that.displayName,_that.score);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  int telegramId,  String? firstName,  String? lastName,  String? username,  String? displayName,  int score)  $default,) {final _that = this;
switch (_that) {
case _LeaderboardUserModel():
return $default(_that.id,_that.telegramId,_that.firstName,_that.lastName,_that.username,_that.displayName,_that.score);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  int telegramId,  String? firstName,  String? lastName,  String? username,  String? displayName,  int score)?  $default,) {final _that = this;
switch (_that) {
case _LeaderboardUserModel() when $default != null:
return $default(_that.id,_that.telegramId,_that.firstName,_that.lastName,_that.username,_that.displayName,_that.score);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _LeaderboardUserModel extends LeaderboardUserModel {
  const _LeaderboardUserModel({this.id = '', this.telegramId = 0, this.firstName, this.lastName, this.username, this.displayName, this.score = 0}): super._();
  factory _LeaderboardUserModel.fromJson(Map<String, dynamic> json) => _$LeaderboardUserModelFromJson(json);

@override@JsonKey() final  String id;
@override@JsonKey() final  int telegramId;
@override final  String? firstName;
@override final  String? lastName;
@override final  String? username;
@override final  String? displayName;
@override@JsonKey() final  int score;

/// Create a copy of LeaderboardUserModel
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$LeaderboardUserModelCopyWith<_LeaderboardUserModel> get copyWith => __$LeaderboardUserModelCopyWithImpl<_LeaderboardUserModel>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$LeaderboardUserModelToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _LeaderboardUserModel&&(identical(other.id, id) || other.id == id)&&(identical(other.telegramId, telegramId) || other.telegramId == telegramId)&&(identical(other.firstName, firstName) || other.firstName == firstName)&&(identical(other.lastName, lastName) || other.lastName == lastName)&&(identical(other.username, username) || other.username == username)&&(identical(other.displayName, displayName) || other.displayName == displayName)&&(identical(other.score, score) || other.score == score));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,telegramId,firstName,lastName,username,displayName,score);

@override
String toString() {
  return 'LeaderboardUserModel(id: $id, telegramId: $telegramId, firstName: $firstName, lastName: $lastName, username: $username, displayName: $displayName, score: $score)';
}


}

/// @nodoc
abstract mixin class _$LeaderboardUserModelCopyWith<$Res> implements $LeaderboardUserModelCopyWith<$Res> {
  factory _$LeaderboardUserModelCopyWith(_LeaderboardUserModel value, $Res Function(_LeaderboardUserModel) _then) = __$LeaderboardUserModelCopyWithImpl;
@override @useResult
$Res call({
 String id, int telegramId, String? firstName, String? lastName, String? username, String? displayName, int score
});




}
/// @nodoc
class __$LeaderboardUserModelCopyWithImpl<$Res>
    implements _$LeaderboardUserModelCopyWith<$Res> {
  __$LeaderboardUserModelCopyWithImpl(this._self, this._then);

  final _LeaderboardUserModel _self;
  final $Res Function(_LeaderboardUserModel) _then;

/// Create a copy of LeaderboardUserModel
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? telegramId = null,Object? firstName = freezed,Object? lastName = freezed,Object? username = freezed,Object? displayName = freezed,Object? score = null,}) {
  return _then(_LeaderboardUserModel(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,telegramId: null == telegramId ? _self.telegramId : telegramId // ignore: cast_nullable_to_non_nullable
as int,firstName: freezed == firstName ? _self.firstName : firstName // ignore: cast_nullable_to_non_nullable
as String?,lastName: freezed == lastName ? _self.lastName : lastName // ignore: cast_nullable_to_non_nullable
as String?,username: freezed == username ? _self.username : username // ignore: cast_nullable_to_non_nullable
as String?,displayName: freezed == displayName ? _self.displayName : displayName // ignore: cast_nullable_to_non_nullable
as String?,score: null == score ? _self.score : score // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}


/// @nodoc
mixin _$ReferralsResponseModel {

 List<ReferrerModel> get referrers; int get myCount;
/// Create a copy of ReferralsResponseModel
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ReferralsResponseModelCopyWith<ReferralsResponseModel> get copyWith => _$ReferralsResponseModelCopyWithImpl<ReferralsResponseModel>(this as ReferralsResponseModel, _$identity);

  /// Serializes this ReferralsResponseModel to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ReferralsResponseModel&&const DeepCollectionEquality().equals(other.referrers, referrers)&&(identical(other.myCount, myCount) || other.myCount == myCount));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,const DeepCollectionEquality().hash(referrers),myCount);

@override
String toString() {
  return 'ReferralsResponseModel(referrers: $referrers, myCount: $myCount)';
}


}

/// @nodoc
abstract mixin class $ReferralsResponseModelCopyWith<$Res>  {
  factory $ReferralsResponseModelCopyWith(ReferralsResponseModel value, $Res Function(ReferralsResponseModel) _then) = _$ReferralsResponseModelCopyWithImpl;
@useResult
$Res call({
 List<ReferrerModel> referrers, int myCount
});




}
/// @nodoc
class _$ReferralsResponseModelCopyWithImpl<$Res>
    implements $ReferralsResponseModelCopyWith<$Res> {
  _$ReferralsResponseModelCopyWithImpl(this._self, this._then);

  final ReferralsResponseModel _self;
  final $Res Function(ReferralsResponseModel) _then;

/// Create a copy of ReferralsResponseModel
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? referrers = null,Object? myCount = null,}) {
  return _then(_self.copyWith(
referrers: null == referrers ? _self.referrers : referrers // ignore: cast_nullable_to_non_nullable
as List<ReferrerModel>,myCount: null == myCount ? _self.myCount : myCount // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [ReferralsResponseModel].
extension ReferralsResponseModelPatterns on ReferralsResponseModel {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ReferralsResponseModel value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ReferralsResponseModel() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ReferralsResponseModel value)  $default,){
final _that = this;
switch (_that) {
case _ReferralsResponseModel():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ReferralsResponseModel value)?  $default,){
final _that = this;
switch (_that) {
case _ReferralsResponseModel() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( List<ReferrerModel> referrers,  int myCount)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ReferralsResponseModel() when $default != null:
return $default(_that.referrers,_that.myCount);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( List<ReferrerModel> referrers,  int myCount)  $default,) {final _that = this;
switch (_that) {
case _ReferralsResponseModel():
return $default(_that.referrers,_that.myCount);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( List<ReferrerModel> referrers,  int myCount)?  $default,) {final _that = this;
switch (_that) {
case _ReferralsResponseModel() when $default != null:
return $default(_that.referrers,_that.myCount);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ReferralsResponseModel implements ReferralsResponseModel {
  const _ReferralsResponseModel({final  List<ReferrerModel> referrers = const <ReferrerModel>[], this.myCount = 0}): _referrers = referrers;
  factory _ReferralsResponseModel.fromJson(Map<String, dynamic> json) => _$ReferralsResponseModelFromJson(json);

 final  List<ReferrerModel> _referrers;
@override@JsonKey() List<ReferrerModel> get referrers {
  if (_referrers is EqualUnmodifiableListView) return _referrers;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_referrers);
}

@override@JsonKey() final  int myCount;

/// Create a copy of ReferralsResponseModel
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ReferralsResponseModelCopyWith<_ReferralsResponseModel> get copyWith => __$ReferralsResponseModelCopyWithImpl<_ReferralsResponseModel>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ReferralsResponseModelToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _ReferralsResponseModel&&const DeepCollectionEquality().equals(other._referrers, _referrers)&&(identical(other.myCount, myCount) || other.myCount == myCount));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,const DeepCollectionEquality().hash(_referrers),myCount);

@override
String toString() {
  return 'ReferralsResponseModel(referrers: $referrers, myCount: $myCount)';
}


}

/// @nodoc
abstract mixin class _$ReferralsResponseModelCopyWith<$Res> implements $ReferralsResponseModelCopyWith<$Res> {
  factory _$ReferralsResponseModelCopyWith(_ReferralsResponseModel value, $Res Function(_ReferralsResponseModel) _then) = __$ReferralsResponseModelCopyWithImpl;
@override @useResult
$Res call({
 List<ReferrerModel> referrers, int myCount
});




}
/// @nodoc
class __$ReferralsResponseModelCopyWithImpl<$Res>
    implements _$ReferralsResponseModelCopyWith<$Res> {
  __$ReferralsResponseModelCopyWithImpl(this._self, this._then);

  final _ReferralsResponseModel _self;
  final $Res Function(_ReferralsResponseModel) _then;

/// Create a copy of ReferralsResponseModel
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? referrers = null,Object? myCount = null,}) {
  return _then(_ReferralsResponseModel(
referrers: null == referrers ? _self._referrers : referrers // ignore: cast_nullable_to_non_nullable
as List<ReferrerModel>,myCount: null == myCount ? _self.myCount : myCount // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}


/// @nodoc
mixin _$ReferrerModel {

 LeaderboardUserModel get user; int get count;
/// Create a copy of ReferrerModel
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ReferrerModelCopyWith<ReferrerModel> get copyWith => _$ReferrerModelCopyWithImpl<ReferrerModel>(this as ReferrerModel, _$identity);

  /// Serializes this ReferrerModel to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ReferrerModel&&(identical(other.user, user) || other.user == user)&&(identical(other.count, count) || other.count == count));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,user,count);

@override
String toString() {
  return 'ReferrerModel(user: $user, count: $count)';
}


}

/// @nodoc
abstract mixin class $ReferrerModelCopyWith<$Res>  {
  factory $ReferrerModelCopyWith(ReferrerModel value, $Res Function(ReferrerModel) _then) = _$ReferrerModelCopyWithImpl;
@useResult
$Res call({
 LeaderboardUserModel user, int count
});


$LeaderboardUserModelCopyWith<$Res> get user;

}
/// @nodoc
class _$ReferrerModelCopyWithImpl<$Res>
    implements $ReferrerModelCopyWith<$Res> {
  _$ReferrerModelCopyWithImpl(this._self, this._then);

  final ReferrerModel _self;
  final $Res Function(ReferrerModel) _then;

/// Create a copy of ReferrerModel
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? user = null,Object? count = null,}) {
  return _then(_self.copyWith(
user: null == user ? _self.user : user // ignore: cast_nullable_to_non_nullable
as LeaderboardUserModel,count: null == count ? _self.count : count // ignore: cast_nullable_to_non_nullable
as int,
  ));
}
/// Create a copy of ReferrerModel
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$LeaderboardUserModelCopyWith<$Res> get user {
  
  return $LeaderboardUserModelCopyWith<$Res>(_self.user, (value) {
    return _then(_self.copyWith(user: value));
  });
}
}


/// Adds pattern-matching-related methods to [ReferrerModel].
extension ReferrerModelPatterns on ReferrerModel {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ReferrerModel value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ReferrerModel() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ReferrerModel value)  $default,){
final _that = this;
switch (_that) {
case _ReferrerModel():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ReferrerModel value)?  $default,){
final _that = this;
switch (_that) {
case _ReferrerModel() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( LeaderboardUserModel user,  int count)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ReferrerModel() when $default != null:
return $default(_that.user,_that.count);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( LeaderboardUserModel user,  int count)  $default,) {final _that = this;
switch (_that) {
case _ReferrerModel():
return $default(_that.user,_that.count);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( LeaderboardUserModel user,  int count)?  $default,) {final _that = this;
switch (_that) {
case _ReferrerModel() when $default != null:
return $default(_that.user,_that.count);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ReferrerModel implements ReferrerModel {
  const _ReferrerModel({required this.user, this.count = 0});
  factory _ReferrerModel.fromJson(Map<String, dynamic> json) => _$ReferrerModelFromJson(json);

@override final  LeaderboardUserModel user;
@override@JsonKey() final  int count;

/// Create a copy of ReferrerModel
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ReferrerModelCopyWith<_ReferrerModel> get copyWith => __$ReferrerModelCopyWithImpl<_ReferrerModel>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ReferrerModelToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _ReferrerModel&&(identical(other.user, user) || other.user == user)&&(identical(other.count, count) || other.count == count));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,user,count);

@override
String toString() {
  return 'ReferrerModel(user: $user, count: $count)';
}


}

/// @nodoc
abstract mixin class _$ReferrerModelCopyWith<$Res> implements $ReferrerModelCopyWith<$Res> {
  factory _$ReferrerModelCopyWith(_ReferrerModel value, $Res Function(_ReferrerModel) _then) = __$ReferrerModelCopyWithImpl;
@override @useResult
$Res call({
 LeaderboardUserModel user, int count
});


@override $LeaderboardUserModelCopyWith<$Res> get user;

}
/// @nodoc
class __$ReferrerModelCopyWithImpl<$Res>
    implements _$ReferrerModelCopyWith<$Res> {
  __$ReferrerModelCopyWithImpl(this._self, this._then);

  final _ReferrerModel _self;
  final $Res Function(_ReferrerModel) _then;

/// Create a copy of ReferrerModel
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? user = null,Object? count = null,}) {
  return _then(_ReferrerModel(
user: null == user ? _self.user : user // ignore: cast_nullable_to_non_nullable
as LeaderboardUserModel,count: null == count ? _self.count : count // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

/// Create a copy of ReferrerModel
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$LeaderboardUserModelCopyWith<$Res> get user {
  
  return $LeaderboardUserModelCopyWith<$Res>(_self.user, (value) {
    return _then(_self.copyWith(user: value));
  });
}
}

// dart format on
