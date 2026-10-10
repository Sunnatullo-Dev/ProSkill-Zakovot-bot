// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'profile_models.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$StatsResponseModel {

 GameStatsModel get stats;
/// Create a copy of StatsResponseModel
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$StatsResponseModelCopyWith<StatsResponseModel> get copyWith => _$StatsResponseModelCopyWithImpl<StatsResponseModel>(this as StatsResponseModel, _$identity);

  /// Serializes this StatsResponseModel to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is StatsResponseModel&&(identical(other.stats, stats) || other.stats == stats));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,stats);

@override
String toString() {
  return 'StatsResponseModel(stats: $stats)';
}


}

/// @nodoc
abstract mixin class $StatsResponseModelCopyWith<$Res>  {
  factory $StatsResponseModelCopyWith(StatsResponseModel value, $Res Function(StatsResponseModel) _then) = _$StatsResponseModelCopyWithImpl;
@useResult
$Res call({
 GameStatsModel stats
});


$GameStatsModelCopyWith<$Res> get stats;

}
/// @nodoc
class _$StatsResponseModelCopyWithImpl<$Res>
    implements $StatsResponseModelCopyWith<$Res> {
  _$StatsResponseModelCopyWithImpl(this._self, this._then);

  final StatsResponseModel _self;
  final $Res Function(StatsResponseModel) _then;

/// Create a copy of StatsResponseModel
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? stats = null,}) {
  return _then(_self.copyWith(
stats: null == stats ? _self.stats : stats // ignore: cast_nullable_to_non_nullable
as GameStatsModel,
  ));
}
/// Create a copy of StatsResponseModel
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$GameStatsModelCopyWith<$Res> get stats {
  
  return $GameStatsModelCopyWith<$Res>(_self.stats, (value) {
    return _then(_self.copyWith(stats: value));
  });
}
}


/// Adds pattern-matching-related methods to [StatsResponseModel].
extension StatsResponseModelPatterns on StatsResponseModel {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _StatsResponseModel value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _StatsResponseModel() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _StatsResponseModel value)  $default,){
final _that = this;
switch (_that) {
case _StatsResponseModel():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _StatsResponseModel value)?  $default,){
final _that = this;
switch (_that) {
case _StatsResponseModel() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( GameStatsModel stats)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _StatsResponseModel() when $default != null:
return $default(_that.stats);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( GameStatsModel stats)  $default,) {final _that = this;
switch (_that) {
case _StatsResponseModel():
return $default(_that.stats);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( GameStatsModel stats)?  $default,) {final _that = this;
switch (_that) {
case _StatsResponseModel() when $default != null:
return $default(_that.stats);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _StatsResponseModel extends StatsResponseModel {
  const _StatsResponseModel({this.stats = const GameStatsModel()}): super._();
  factory _StatsResponseModel.fromJson(Map<String, dynamic> json) => _$StatsResponseModelFromJson(json);

@override@JsonKey() final  GameStatsModel stats;

/// Create a copy of StatsResponseModel
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$StatsResponseModelCopyWith<_StatsResponseModel> get copyWith => __$StatsResponseModelCopyWithImpl<_StatsResponseModel>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$StatsResponseModelToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _StatsResponseModel&&(identical(other.stats, stats) || other.stats == stats));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,stats);

@override
String toString() {
  return 'StatsResponseModel(stats: $stats)';
}


}

/// @nodoc
abstract mixin class _$StatsResponseModelCopyWith<$Res> implements $StatsResponseModelCopyWith<$Res> {
  factory _$StatsResponseModelCopyWith(_StatsResponseModel value, $Res Function(_StatsResponseModel) _then) = __$StatsResponseModelCopyWithImpl;
@override @useResult
$Res call({
 GameStatsModel stats
});


@override $GameStatsModelCopyWith<$Res> get stats;

}
/// @nodoc
class __$StatsResponseModelCopyWithImpl<$Res>
    implements _$StatsResponseModelCopyWith<$Res> {
  __$StatsResponseModelCopyWithImpl(this._self, this._then);

  final _StatsResponseModel _self;
  final $Res Function(_StatsResponseModel) _then;

/// Create a copy of StatsResponseModel
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? stats = null,}) {
  return _then(_StatsResponseModel(
stats: null == stats ? _self.stats : stats // ignore: cast_nullable_to_non_nullable
as GameStatsModel,
  ));
}

/// Create a copy of StatsResponseModel
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$GameStatsModelCopyWith<$Res> get stats {
  
  return $GameStatsModelCopyWith<$Res>(_self.stats, (value) {
    return _then(_self.copyWith(stats: value));
  });
}
}


/// @nodoc
mixin _$GameStatsModel {

 int get gamesPlayed; int get accuracy; int get bestRoundScore; int get totalCorrect;
/// Create a copy of GameStatsModel
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$GameStatsModelCopyWith<GameStatsModel> get copyWith => _$GameStatsModelCopyWithImpl<GameStatsModel>(this as GameStatsModel, _$identity);

  /// Serializes this GameStatsModel to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is GameStatsModel&&(identical(other.gamesPlayed, gamesPlayed) || other.gamesPlayed == gamesPlayed)&&(identical(other.accuracy, accuracy) || other.accuracy == accuracy)&&(identical(other.bestRoundScore, bestRoundScore) || other.bestRoundScore == bestRoundScore)&&(identical(other.totalCorrect, totalCorrect) || other.totalCorrect == totalCorrect));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,gamesPlayed,accuracy,bestRoundScore,totalCorrect);

@override
String toString() {
  return 'GameStatsModel(gamesPlayed: $gamesPlayed, accuracy: $accuracy, bestRoundScore: $bestRoundScore, totalCorrect: $totalCorrect)';
}


}

/// @nodoc
abstract mixin class $GameStatsModelCopyWith<$Res>  {
  factory $GameStatsModelCopyWith(GameStatsModel value, $Res Function(GameStatsModel) _then) = _$GameStatsModelCopyWithImpl;
@useResult
$Res call({
 int gamesPlayed, int accuracy, int bestRoundScore, int totalCorrect
});




}
/// @nodoc
class _$GameStatsModelCopyWithImpl<$Res>
    implements $GameStatsModelCopyWith<$Res> {
  _$GameStatsModelCopyWithImpl(this._self, this._then);

  final GameStatsModel _self;
  final $Res Function(GameStatsModel) _then;

/// Create a copy of GameStatsModel
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? gamesPlayed = null,Object? accuracy = null,Object? bestRoundScore = null,Object? totalCorrect = null,}) {
  return _then(_self.copyWith(
gamesPlayed: null == gamesPlayed ? _self.gamesPlayed : gamesPlayed // ignore: cast_nullable_to_non_nullable
as int,accuracy: null == accuracy ? _self.accuracy : accuracy // ignore: cast_nullable_to_non_nullable
as int,bestRoundScore: null == bestRoundScore ? _self.bestRoundScore : bestRoundScore // ignore: cast_nullable_to_non_nullable
as int,totalCorrect: null == totalCorrect ? _self.totalCorrect : totalCorrect // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [GameStatsModel].
extension GameStatsModelPatterns on GameStatsModel {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _GameStatsModel value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _GameStatsModel() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _GameStatsModel value)  $default,){
final _that = this;
switch (_that) {
case _GameStatsModel():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _GameStatsModel value)?  $default,){
final _that = this;
switch (_that) {
case _GameStatsModel() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( int gamesPlayed,  int accuracy,  int bestRoundScore,  int totalCorrect)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _GameStatsModel() when $default != null:
return $default(_that.gamesPlayed,_that.accuracy,_that.bestRoundScore,_that.totalCorrect);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( int gamesPlayed,  int accuracy,  int bestRoundScore,  int totalCorrect)  $default,) {final _that = this;
switch (_that) {
case _GameStatsModel():
return $default(_that.gamesPlayed,_that.accuracy,_that.bestRoundScore,_that.totalCorrect);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( int gamesPlayed,  int accuracy,  int bestRoundScore,  int totalCorrect)?  $default,) {final _that = this;
switch (_that) {
case _GameStatsModel() when $default != null:
return $default(_that.gamesPlayed,_that.accuracy,_that.bestRoundScore,_that.totalCorrect);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _GameStatsModel implements GameStatsModel {
  const _GameStatsModel({this.gamesPlayed = 0, this.accuracy = 0, this.bestRoundScore = 0, this.totalCorrect = 0});
  factory _GameStatsModel.fromJson(Map<String, dynamic> json) => _$GameStatsModelFromJson(json);

@override@JsonKey() final  int gamesPlayed;
@override@JsonKey() final  int accuracy;
@override@JsonKey() final  int bestRoundScore;
@override@JsonKey() final  int totalCorrect;

/// Create a copy of GameStatsModel
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$GameStatsModelCopyWith<_GameStatsModel> get copyWith => __$GameStatsModelCopyWithImpl<_GameStatsModel>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$GameStatsModelToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _GameStatsModel&&(identical(other.gamesPlayed, gamesPlayed) || other.gamesPlayed == gamesPlayed)&&(identical(other.accuracy, accuracy) || other.accuracy == accuracy)&&(identical(other.bestRoundScore, bestRoundScore) || other.bestRoundScore == bestRoundScore)&&(identical(other.totalCorrect, totalCorrect) || other.totalCorrect == totalCorrect));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,gamesPlayed,accuracy,bestRoundScore,totalCorrect);

@override
String toString() {
  return 'GameStatsModel(gamesPlayed: $gamesPlayed, accuracy: $accuracy, bestRoundScore: $bestRoundScore, totalCorrect: $totalCorrect)';
}


}

/// @nodoc
abstract mixin class _$GameStatsModelCopyWith<$Res> implements $GameStatsModelCopyWith<$Res> {
  factory _$GameStatsModelCopyWith(_GameStatsModel value, $Res Function(_GameStatsModel) _then) = __$GameStatsModelCopyWithImpl;
@override @useResult
$Res call({
 int gamesPlayed, int accuracy, int bestRoundScore, int totalCorrect
});




}
/// @nodoc
class __$GameStatsModelCopyWithImpl<$Res>
    implements _$GameStatsModelCopyWith<$Res> {
  __$GameStatsModelCopyWithImpl(this._self, this._then);

  final _GameStatsModel _self;
  final $Res Function(_GameStatsModel) _then;

/// Create a copy of GameStatsModel
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? gamesPlayed = null,Object? accuracy = null,Object? bestRoundScore = null,Object? totalCorrect = null,}) {
  return _then(_GameStatsModel(
gamesPlayed: null == gamesPlayed ? _self.gamesPlayed : gamesPlayed // ignore: cast_nullable_to_non_nullable
as int,accuracy: null == accuracy ? _self.accuracy : accuracy // ignore: cast_nullable_to_non_nullable
as int,bestRoundScore: null == bestRoundScore ? _self.bestRoundScore : bestRoundScore // ignore: cast_nullable_to_non_nullable
as int,totalCorrect: null == totalCorrect ? _self.totalCorrect : totalCorrect // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}

// dart format on
