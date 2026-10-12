// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'daily_models.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$DailyTodayModel {

 String get date; List<QuizQuestionModel> get questions; bool get completed; DailyStreakModel get streak; int get bonusPreview;
/// Create a copy of DailyTodayModel
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$DailyTodayModelCopyWith<DailyTodayModel> get copyWith => _$DailyTodayModelCopyWithImpl<DailyTodayModel>(this as DailyTodayModel, _$identity);

  /// Serializes this DailyTodayModel to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is DailyTodayModel&&(identical(other.date, date) || other.date == date)&&const DeepCollectionEquality().equals(other.questions, questions)&&(identical(other.completed, completed) || other.completed == completed)&&(identical(other.streak, streak) || other.streak == streak)&&(identical(other.bonusPreview, bonusPreview) || other.bonusPreview == bonusPreview));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,date,const DeepCollectionEquality().hash(questions),completed,streak,bonusPreview);

@override
String toString() {
  return 'DailyTodayModel(date: $date, questions: $questions, completed: $completed, streak: $streak, bonusPreview: $bonusPreview)';
}


}

/// @nodoc
abstract mixin class $DailyTodayModelCopyWith<$Res>  {
  factory $DailyTodayModelCopyWith(DailyTodayModel value, $Res Function(DailyTodayModel) _then) = _$DailyTodayModelCopyWithImpl;
@useResult
$Res call({
 String date, List<QuizQuestionModel> questions, bool completed, DailyStreakModel streak, int bonusPreview
});


$DailyStreakModelCopyWith<$Res> get streak;

}
/// @nodoc
class _$DailyTodayModelCopyWithImpl<$Res>
    implements $DailyTodayModelCopyWith<$Res> {
  _$DailyTodayModelCopyWithImpl(this._self, this._then);

  final DailyTodayModel _self;
  final $Res Function(DailyTodayModel) _then;

/// Create a copy of DailyTodayModel
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? date = null,Object? questions = null,Object? completed = null,Object? streak = null,Object? bonusPreview = null,}) {
  return _then(_self.copyWith(
date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as String,questions: null == questions ? _self.questions : questions // ignore: cast_nullable_to_non_nullable
as List<QuizQuestionModel>,completed: null == completed ? _self.completed : completed // ignore: cast_nullable_to_non_nullable
as bool,streak: null == streak ? _self.streak : streak // ignore: cast_nullable_to_non_nullable
as DailyStreakModel,bonusPreview: null == bonusPreview ? _self.bonusPreview : bonusPreview // ignore: cast_nullable_to_non_nullable
as int,
  ));
}
/// Create a copy of DailyTodayModel
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$DailyStreakModelCopyWith<$Res> get streak {
  
  return $DailyStreakModelCopyWith<$Res>(_self.streak, (value) {
    return _then(_self.copyWith(streak: value));
  });
}
}


/// Adds pattern-matching-related methods to [DailyTodayModel].
extension DailyTodayModelPatterns on DailyTodayModel {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _DailyTodayModel value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _DailyTodayModel() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _DailyTodayModel value)  $default,){
final _that = this;
switch (_that) {
case _DailyTodayModel():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _DailyTodayModel value)?  $default,){
final _that = this;
switch (_that) {
case _DailyTodayModel() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String date,  List<QuizQuestionModel> questions,  bool completed,  DailyStreakModel streak,  int bonusPreview)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _DailyTodayModel() when $default != null:
return $default(_that.date,_that.questions,_that.completed,_that.streak,_that.bonusPreview);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String date,  List<QuizQuestionModel> questions,  bool completed,  DailyStreakModel streak,  int bonusPreview)  $default,) {final _that = this;
switch (_that) {
case _DailyTodayModel():
return $default(_that.date,_that.questions,_that.completed,_that.streak,_that.bonusPreview);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String date,  List<QuizQuestionModel> questions,  bool completed,  DailyStreakModel streak,  int bonusPreview)?  $default,) {final _that = this;
switch (_that) {
case _DailyTodayModel() when $default != null:
return $default(_that.date,_that.questions,_that.completed,_that.streak,_that.bonusPreview);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _DailyTodayModel extends DailyTodayModel {
  const _DailyTodayModel({this.date = '', final  List<QuizQuestionModel> questions = const <QuizQuestionModel>[], this.completed = false, this.streak = const DailyStreakModel(), this.bonusPreview = 0}): _questions = questions,super._();
  factory _DailyTodayModel.fromJson(Map<String, dynamic> json) => _$DailyTodayModelFromJson(json);

@override@JsonKey() final  String date;
 final  List<QuizQuestionModel> _questions;
@override@JsonKey() List<QuizQuestionModel> get questions {
  if (_questions is EqualUnmodifiableListView) return _questions;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_questions);
}

@override@JsonKey() final  bool completed;
@override@JsonKey() final  DailyStreakModel streak;
@override@JsonKey() final  int bonusPreview;

/// Create a copy of DailyTodayModel
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$DailyTodayModelCopyWith<_DailyTodayModel> get copyWith => __$DailyTodayModelCopyWithImpl<_DailyTodayModel>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$DailyTodayModelToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _DailyTodayModel&&(identical(other.date, date) || other.date == date)&&const DeepCollectionEquality().equals(other._questions, _questions)&&(identical(other.completed, completed) || other.completed == completed)&&(identical(other.streak, streak) || other.streak == streak)&&(identical(other.bonusPreview, bonusPreview) || other.bonusPreview == bonusPreview));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,date,const DeepCollectionEquality().hash(_questions),completed,streak,bonusPreview);

@override
String toString() {
  return 'DailyTodayModel(date: $date, questions: $questions, completed: $completed, streak: $streak, bonusPreview: $bonusPreview)';
}


}

/// @nodoc
abstract mixin class _$DailyTodayModelCopyWith<$Res> implements $DailyTodayModelCopyWith<$Res> {
  factory _$DailyTodayModelCopyWith(_DailyTodayModel value, $Res Function(_DailyTodayModel) _then) = __$DailyTodayModelCopyWithImpl;
@override @useResult
$Res call({
 String date, List<QuizQuestionModel> questions, bool completed, DailyStreakModel streak, int bonusPreview
});


@override $DailyStreakModelCopyWith<$Res> get streak;

}
/// @nodoc
class __$DailyTodayModelCopyWithImpl<$Res>
    implements _$DailyTodayModelCopyWith<$Res> {
  __$DailyTodayModelCopyWithImpl(this._self, this._then);

  final _DailyTodayModel _self;
  final $Res Function(_DailyTodayModel) _then;

/// Create a copy of DailyTodayModel
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? date = null,Object? questions = null,Object? completed = null,Object? streak = null,Object? bonusPreview = null,}) {
  return _then(_DailyTodayModel(
date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as String,questions: null == questions ? _self._questions : questions // ignore: cast_nullable_to_non_nullable
as List<QuizQuestionModel>,completed: null == completed ? _self.completed : completed // ignore: cast_nullable_to_non_nullable
as bool,streak: null == streak ? _self.streak : streak // ignore: cast_nullable_to_non_nullable
as DailyStreakModel,bonusPreview: null == bonusPreview ? _self.bonusPreview : bonusPreview // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

/// Create a copy of DailyTodayModel
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$DailyStreakModelCopyWith<$Res> get streak {
  
  return $DailyStreakModelCopyWith<$Res>(_self.streak, (value) {
    return _then(_self.copyWith(streak: value));
  });
}
}


/// @nodoc
mixin _$DailyStreakModel {

 int get current; int get longest;
/// Create a copy of DailyStreakModel
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$DailyStreakModelCopyWith<DailyStreakModel> get copyWith => _$DailyStreakModelCopyWithImpl<DailyStreakModel>(this as DailyStreakModel, _$identity);

  /// Serializes this DailyStreakModel to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is DailyStreakModel&&(identical(other.current, current) || other.current == current)&&(identical(other.longest, longest) || other.longest == longest));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,current,longest);

@override
String toString() {
  return 'DailyStreakModel(current: $current, longest: $longest)';
}


}

/// @nodoc
abstract mixin class $DailyStreakModelCopyWith<$Res>  {
  factory $DailyStreakModelCopyWith(DailyStreakModel value, $Res Function(DailyStreakModel) _then) = _$DailyStreakModelCopyWithImpl;
@useResult
$Res call({
 int current, int longest
});




}
/// @nodoc
class _$DailyStreakModelCopyWithImpl<$Res>
    implements $DailyStreakModelCopyWith<$Res> {
  _$DailyStreakModelCopyWithImpl(this._self, this._then);

  final DailyStreakModel _self;
  final $Res Function(DailyStreakModel) _then;

/// Create a copy of DailyStreakModel
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? current = null,Object? longest = null,}) {
  return _then(_self.copyWith(
current: null == current ? _self.current : current // ignore: cast_nullable_to_non_nullable
as int,longest: null == longest ? _self.longest : longest // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [DailyStreakModel].
extension DailyStreakModelPatterns on DailyStreakModel {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _DailyStreakModel value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _DailyStreakModel() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _DailyStreakModel value)  $default,){
final _that = this;
switch (_that) {
case _DailyStreakModel():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _DailyStreakModel value)?  $default,){
final _that = this;
switch (_that) {
case _DailyStreakModel() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( int current,  int longest)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _DailyStreakModel() when $default != null:
return $default(_that.current,_that.longest);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( int current,  int longest)  $default,) {final _that = this;
switch (_that) {
case _DailyStreakModel():
return $default(_that.current,_that.longest);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( int current,  int longest)?  $default,) {final _that = this;
switch (_that) {
case _DailyStreakModel() when $default != null:
return $default(_that.current,_that.longest);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _DailyStreakModel implements DailyStreakModel {
  const _DailyStreakModel({this.current = 0, this.longest = 0});
  factory _DailyStreakModel.fromJson(Map<String, dynamic> json) => _$DailyStreakModelFromJson(json);

@override@JsonKey() final  int current;
@override@JsonKey() final  int longest;

/// Create a copy of DailyStreakModel
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$DailyStreakModelCopyWith<_DailyStreakModel> get copyWith => __$DailyStreakModelCopyWithImpl<_DailyStreakModel>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$DailyStreakModelToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _DailyStreakModel&&(identical(other.current, current) || other.current == current)&&(identical(other.longest, longest) || other.longest == longest));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,current,longest);

@override
String toString() {
  return 'DailyStreakModel(current: $current, longest: $longest)';
}


}

/// @nodoc
abstract mixin class _$DailyStreakModelCopyWith<$Res> implements $DailyStreakModelCopyWith<$Res> {
  factory _$DailyStreakModelCopyWith(_DailyStreakModel value, $Res Function(_DailyStreakModel) _then) = __$DailyStreakModelCopyWithImpl;
@override @useResult
$Res call({
 int current, int longest
});




}
/// @nodoc
class __$DailyStreakModelCopyWithImpl<$Res>
    implements _$DailyStreakModelCopyWith<$Res> {
  __$DailyStreakModelCopyWithImpl(this._self, this._then);

  final _DailyStreakModel _self;
  final $Res Function(_DailyStreakModel) _then;

/// Create a copy of DailyStreakModel
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? current = null,Object? longest = null,}) {
  return _then(_DailyStreakModel(
current: null == current ? _self.current : current // ignore: cast_nullable_to_non_nullable
as int,longest: null == longest ? _self.longest : longest // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}


/// @nodoc
mixin _$DailyCompleteModel {

 int get newStreak; int get longestStreak; int get streakBonus;
/// Create a copy of DailyCompleteModel
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$DailyCompleteModelCopyWith<DailyCompleteModel> get copyWith => _$DailyCompleteModelCopyWithImpl<DailyCompleteModel>(this as DailyCompleteModel, _$identity);

  /// Serializes this DailyCompleteModel to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is DailyCompleteModel&&(identical(other.newStreak, newStreak) || other.newStreak == newStreak)&&(identical(other.longestStreak, longestStreak) || other.longestStreak == longestStreak)&&(identical(other.streakBonus, streakBonus) || other.streakBonus == streakBonus));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,newStreak,longestStreak,streakBonus);

@override
String toString() {
  return 'DailyCompleteModel(newStreak: $newStreak, longestStreak: $longestStreak, streakBonus: $streakBonus)';
}


}

/// @nodoc
abstract mixin class $DailyCompleteModelCopyWith<$Res>  {
  factory $DailyCompleteModelCopyWith(DailyCompleteModel value, $Res Function(DailyCompleteModel) _then) = _$DailyCompleteModelCopyWithImpl;
@useResult
$Res call({
 int newStreak, int longestStreak, int streakBonus
});




}
/// @nodoc
class _$DailyCompleteModelCopyWithImpl<$Res>
    implements $DailyCompleteModelCopyWith<$Res> {
  _$DailyCompleteModelCopyWithImpl(this._self, this._then);

  final DailyCompleteModel _self;
  final $Res Function(DailyCompleteModel) _then;

/// Create a copy of DailyCompleteModel
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? newStreak = null,Object? longestStreak = null,Object? streakBonus = null,}) {
  return _then(_self.copyWith(
newStreak: null == newStreak ? _self.newStreak : newStreak // ignore: cast_nullable_to_non_nullable
as int,longestStreak: null == longestStreak ? _self.longestStreak : longestStreak // ignore: cast_nullable_to_non_nullable
as int,streakBonus: null == streakBonus ? _self.streakBonus : streakBonus // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [DailyCompleteModel].
extension DailyCompleteModelPatterns on DailyCompleteModel {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _DailyCompleteModel value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _DailyCompleteModel() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _DailyCompleteModel value)  $default,){
final _that = this;
switch (_that) {
case _DailyCompleteModel():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _DailyCompleteModel value)?  $default,){
final _that = this;
switch (_that) {
case _DailyCompleteModel() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( int newStreak,  int longestStreak,  int streakBonus)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _DailyCompleteModel() when $default != null:
return $default(_that.newStreak,_that.longestStreak,_that.streakBonus);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( int newStreak,  int longestStreak,  int streakBonus)  $default,) {final _that = this;
switch (_that) {
case _DailyCompleteModel():
return $default(_that.newStreak,_that.longestStreak,_that.streakBonus);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( int newStreak,  int longestStreak,  int streakBonus)?  $default,) {final _that = this;
switch (_that) {
case _DailyCompleteModel() when $default != null:
return $default(_that.newStreak,_that.longestStreak,_that.streakBonus);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _DailyCompleteModel extends DailyCompleteModel {
  const _DailyCompleteModel({this.newStreak = 0, this.longestStreak = 0, this.streakBonus = 0}): super._();
  factory _DailyCompleteModel.fromJson(Map<String, dynamic> json) => _$DailyCompleteModelFromJson(json);

@override@JsonKey() final  int newStreak;
@override@JsonKey() final  int longestStreak;
@override@JsonKey() final  int streakBonus;

/// Create a copy of DailyCompleteModel
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$DailyCompleteModelCopyWith<_DailyCompleteModel> get copyWith => __$DailyCompleteModelCopyWithImpl<_DailyCompleteModel>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$DailyCompleteModelToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _DailyCompleteModel&&(identical(other.newStreak, newStreak) || other.newStreak == newStreak)&&(identical(other.longestStreak, longestStreak) || other.longestStreak == longestStreak)&&(identical(other.streakBonus, streakBonus) || other.streakBonus == streakBonus));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,newStreak,longestStreak,streakBonus);

@override
String toString() {
  return 'DailyCompleteModel(newStreak: $newStreak, longestStreak: $longestStreak, streakBonus: $streakBonus)';
}


}

/// @nodoc
abstract mixin class _$DailyCompleteModelCopyWith<$Res> implements $DailyCompleteModelCopyWith<$Res> {
  factory _$DailyCompleteModelCopyWith(_DailyCompleteModel value, $Res Function(_DailyCompleteModel) _then) = __$DailyCompleteModelCopyWithImpl;
@override @useResult
$Res call({
 int newStreak, int longestStreak, int streakBonus
});




}
/// @nodoc
class __$DailyCompleteModelCopyWithImpl<$Res>
    implements _$DailyCompleteModelCopyWith<$Res> {
  __$DailyCompleteModelCopyWithImpl(this._self, this._then);

  final _DailyCompleteModel _self;
  final $Res Function(_DailyCompleteModel) _then;

/// Create a copy of DailyCompleteModel
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? newStreak = null,Object? longestStreak = null,Object? streakBonus = null,}) {
  return _then(_DailyCompleteModel(
newStreak: null == newStreak ? _self.newStreak : newStreak // ignore: cast_nullable_to_non_nullable
as int,longestStreak: null == longestStreak ? _self.longestStreak : longestStreak // ignore: cast_nullable_to_non_nullable
as int,streakBonus: null == streakBonus ? _self.streakBonus : streakBonus // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}

// dart format on
