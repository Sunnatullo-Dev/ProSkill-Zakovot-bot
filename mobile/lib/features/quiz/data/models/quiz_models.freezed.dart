// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'quiz_models.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$RoundResponseModel {

 List<QuizQuestionModel> get questions;
/// Create a copy of RoundResponseModel
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$RoundResponseModelCopyWith<RoundResponseModel> get copyWith => _$RoundResponseModelCopyWithImpl<RoundResponseModel>(this as RoundResponseModel, _$identity);

  /// Serializes this RoundResponseModel to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is RoundResponseModel&&const DeepCollectionEquality().equals(other.questions, questions));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,const DeepCollectionEquality().hash(questions));

@override
String toString() {
  return 'RoundResponseModel(questions: $questions)';
}


}

/// @nodoc
abstract mixin class $RoundResponseModelCopyWith<$Res>  {
  factory $RoundResponseModelCopyWith(RoundResponseModel value, $Res Function(RoundResponseModel) _then) = _$RoundResponseModelCopyWithImpl;
@useResult
$Res call({
 List<QuizQuestionModel> questions
});




}
/// @nodoc
class _$RoundResponseModelCopyWithImpl<$Res>
    implements $RoundResponseModelCopyWith<$Res> {
  _$RoundResponseModelCopyWithImpl(this._self, this._then);

  final RoundResponseModel _self;
  final $Res Function(RoundResponseModel) _then;

/// Create a copy of RoundResponseModel
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? questions = null,}) {
  return _then(_self.copyWith(
questions: null == questions ? _self.questions : questions // ignore: cast_nullable_to_non_nullable
as List<QuizQuestionModel>,
  ));
}

}


/// Adds pattern-matching-related methods to [RoundResponseModel].
extension RoundResponseModelPatterns on RoundResponseModel {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _RoundResponseModel value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _RoundResponseModel() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _RoundResponseModel value)  $default,){
final _that = this;
switch (_that) {
case _RoundResponseModel():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _RoundResponseModel value)?  $default,){
final _that = this;
switch (_that) {
case _RoundResponseModel() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( List<QuizQuestionModel> questions)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _RoundResponseModel() when $default != null:
return $default(_that.questions);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( List<QuizQuestionModel> questions)  $default,) {final _that = this;
switch (_that) {
case _RoundResponseModel():
return $default(_that.questions);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( List<QuizQuestionModel> questions)?  $default,) {final _that = this;
switch (_that) {
case _RoundResponseModel() when $default != null:
return $default(_that.questions);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _RoundResponseModel implements RoundResponseModel {
  const _RoundResponseModel({final  List<QuizQuestionModel> questions = const <QuizQuestionModel>[]}): _questions = questions;
  factory _RoundResponseModel.fromJson(Map<String, dynamic> json) => _$RoundResponseModelFromJson(json);

 final  List<QuizQuestionModel> _questions;
@override@JsonKey() List<QuizQuestionModel> get questions {
  if (_questions is EqualUnmodifiableListView) return _questions;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_questions);
}


/// Create a copy of RoundResponseModel
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$RoundResponseModelCopyWith<_RoundResponseModel> get copyWith => __$RoundResponseModelCopyWithImpl<_RoundResponseModel>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$RoundResponseModelToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _RoundResponseModel&&const DeepCollectionEquality().equals(other._questions, _questions));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,const DeepCollectionEquality().hash(_questions));

@override
String toString() {
  return 'RoundResponseModel(questions: $questions)';
}


}

/// @nodoc
abstract mixin class _$RoundResponseModelCopyWith<$Res> implements $RoundResponseModelCopyWith<$Res> {
  factory _$RoundResponseModelCopyWith(_RoundResponseModel value, $Res Function(_RoundResponseModel) _then) = __$RoundResponseModelCopyWithImpl;
@override @useResult
$Res call({
 List<QuizQuestionModel> questions
});




}
/// @nodoc
class __$RoundResponseModelCopyWithImpl<$Res>
    implements _$RoundResponseModelCopyWith<$Res> {
  __$RoundResponseModelCopyWithImpl(this._self, this._then);

  final _RoundResponseModel _self;
  final $Res Function(_RoundResponseModel) _then;

/// Create a copy of RoundResponseModel
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? questions = null,}) {
  return _then(_RoundResponseModel(
questions: null == questions ? _self._questions : questions // ignore: cast_nullable_to_non_nullable
as List<QuizQuestionModel>,
  ));
}


}


/// @nodoc
mixin _$QuizQuestionModel {

 String get id; String get text; List<String> get options; String? get category; String? get difficulty; int? get timeLimitSeconds;
/// Create a copy of QuizQuestionModel
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$QuizQuestionModelCopyWith<QuizQuestionModel> get copyWith => _$QuizQuestionModelCopyWithImpl<QuizQuestionModel>(this as QuizQuestionModel, _$identity);

  /// Serializes this QuizQuestionModel to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is QuizQuestionModel&&(identical(other.id, id) || other.id == id)&&(identical(other.text, text) || other.text == text)&&const DeepCollectionEquality().equals(other.options, options)&&(identical(other.category, category) || other.category == category)&&(identical(other.difficulty, difficulty) || other.difficulty == difficulty)&&(identical(other.timeLimitSeconds, timeLimitSeconds) || other.timeLimitSeconds == timeLimitSeconds));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,text,const DeepCollectionEquality().hash(options),category,difficulty,timeLimitSeconds);

@override
String toString() {
  return 'QuizQuestionModel(id: $id, text: $text, options: $options, category: $category, difficulty: $difficulty, timeLimitSeconds: $timeLimitSeconds)';
}


}

/// @nodoc
abstract mixin class $QuizQuestionModelCopyWith<$Res>  {
  factory $QuizQuestionModelCopyWith(QuizQuestionModel value, $Res Function(QuizQuestionModel) _then) = _$QuizQuestionModelCopyWithImpl;
@useResult
$Res call({
 String id, String text, List<String> options, String? category, String? difficulty, int? timeLimitSeconds
});




}
/// @nodoc
class _$QuizQuestionModelCopyWithImpl<$Res>
    implements $QuizQuestionModelCopyWith<$Res> {
  _$QuizQuestionModelCopyWithImpl(this._self, this._then);

  final QuizQuestionModel _self;
  final $Res Function(QuizQuestionModel) _then;

/// Create a copy of QuizQuestionModel
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? text = null,Object? options = null,Object? category = freezed,Object? difficulty = freezed,Object? timeLimitSeconds = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,text: null == text ? _self.text : text // ignore: cast_nullable_to_non_nullable
as String,options: null == options ? _self.options : options // ignore: cast_nullable_to_non_nullable
as List<String>,category: freezed == category ? _self.category : category // ignore: cast_nullable_to_non_nullable
as String?,difficulty: freezed == difficulty ? _self.difficulty : difficulty // ignore: cast_nullable_to_non_nullable
as String?,timeLimitSeconds: freezed == timeLimitSeconds ? _self.timeLimitSeconds : timeLimitSeconds // ignore: cast_nullable_to_non_nullable
as int?,
  ));
}

}


/// Adds pattern-matching-related methods to [QuizQuestionModel].
extension QuizQuestionModelPatterns on QuizQuestionModel {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _QuizQuestionModel value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _QuizQuestionModel() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _QuizQuestionModel value)  $default,){
final _that = this;
switch (_that) {
case _QuizQuestionModel():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _QuizQuestionModel value)?  $default,){
final _that = this;
switch (_that) {
case _QuizQuestionModel() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String text,  List<String> options,  String? category,  String? difficulty,  int? timeLimitSeconds)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _QuizQuestionModel() when $default != null:
return $default(_that.id,_that.text,_that.options,_that.category,_that.difficulty,_that.timeLimitSeconds);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String text,  List<String> options,  String? category,  String? difficulty,  int? timeLimitSeconds)  $default,) {final _that = this;
switch (_that) {
case _QuizQuestionModel():
return $default(_that.id,_that.text,_that.options,_that.category,_that.difficulty,_that.timeLimitSeconds);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String text,  List<String> options,  String? category,  String? difficulty,  int? timeLimitSeconds)?  $default,) {final _that = this;
switch (_that) {
case _QuizQuestionModel() when $default != null:
return $default(_that.id,_that.text,_that.options,_that.category,_that.difficulty,_that.timeLimitSeconds);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _QuizQuestionModel extends QuizQuestionModel {
  const _QuizQuestionModel({required this.id, required this.text, final  List<String> options = const <String>[], this.category, this.difficulty, this.timeLimitSeconds}): _options = options,super._();
  factory _QuizQuestionModel.fromJson(Map<String, dynamic> json) => _$QuizQuestionModelFromJson(json);

@override final  String id;
@override final  String text;
 final  List<String> _options;
@override@JsonKey() List<String> get options {
  if (_options is EqualUnmodifiableListView) return _options;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_options);
}

@override final  String? category;
@override final  String? difficulty;
@override final  int? timeLimitSeconds;

/// Create a copy of QuizQuestionModel
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$QuizQuestionModelCopyWith<_QuizQuestionModel> get copyWith => __$QuizQuestionModelCopyWithImpl<_QuizQuestionModel>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$QuizQuestionModelToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _QuizQuestionModel&&(identical(other.id, id) || other.id == id)&&(identical(other.text, text) || other.text == text)&&const DeepCollectionEquality().equals(other._options, _options)&&(identical(other.category, category) || other.category == category)&&(identical(other.difficulty, difficulty) || other.difficulty == difficulty)&&(identical(other.timeLimitSeconds, timeLimitSeconds) || other.timeLimitSeconds == timeLimitSeconds));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,text,const DeepCollectionEquality().hash(_options),category,difficulty,timeLimitSeconds);

@override
String toString() {
  return 'QuizQuestionModel(id: $id, text: $text, options: $options, category: $category, difficulty: $difficulty, timeLimitSeconds: $timeLimitSeconds)';
}


}

/// @nodoc
abstract mixin class _$QuizQuestionModelCopyWith<$Res> implements $QuizQuestionModelCopyWith<$Res> {
  factory _$QuizQuestionModelCopyWith(_QuizQuestionModel value, $Res Function(_QuizQuestionModel) _then) = __$QuizQuestionModelCopyWithImpl;
@override @useResult
$Res call({
 String id, String text, List<String> options, String? category, String? difficulty, int? timeLimitSeconds
});




}
/// @nodoc
class __$QuizQuestionModelCopyWithImpl<$Res>
    implements _$QuizQuestionModelCopyWith<$Res> {
  __$QuizQuestionModelCopyWithImpl(this._self, this._then);

  final _QuizQuestionModel _self;
  final $Res Function(_QuizQuestionModel) _then;

/// Create a copy of QuizQuestionModel
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? text = null,Object? options = null,Object? category = freezed,Object? difficulty = freezed,Object? timeLimitSeconds = freezed,}) {
  return _then(_QuizQuestionModel(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,text: null == text ? _self.text : text // ignore: cast_nullable_to_non_nullable
as String,options: null == options ? _self._options : options // ignore: cast_nullable_to_non_nullable
as List<String>,category: freezed == category ? _self.category : category // ignore: cast_nullable_to_non_nullable
as String?,difficulty: freezed == difficulty ? _self.difficulty : difficulty // ignore: cast_nullable_to_non_nullable
as String?,timeLimitSeconds: freezed == timeLimitSeconds ? _self.timeLimitSeconds : timeLimitSeconds // ignore: cast_nullable_to_non_nullable
as int?,
  ));
}


}


/// @nodoc
mixin _$TicketResponseModel {

 String get ticket;
/// Create a copy of TicketResponseModel
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$TicketResponseModelCopyWith<TicketResponseModel> get copyWith => _$TicketResponseModelCopyWithImpl<TicketResponseModel>(this as TicketResponseModel, _$identity);

  /// Serializes this TicketResponseModel to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is TicketResponseModel&&(identical(other.ticket, ticket) || other.ticket == ticket));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,ticket);

@override
String toString() {
  return 'TicketResponseModel(ticket: $ticket)';
}


}

/// @nodoc
abstract mixin class $TicketResponseModelCopyWith<$Res>  {
  factory $TicketResponseModelCopyWith(TicketResponseModel value, $Res Function(TicketResponseModel) _then) = _$TicketResponseModelCopyWithImpl;
@useResult
$Res call({
 String ticket
});




}
/// @nodoc
class _$TicketResponseModelCopyWithImpl<$Res>
    implements $TicketResponseModelCopyWith<$Res> {
  _$TicketResponseModelCopyWithImpl(this._self, this._then);

  final TicketResponseModel _self;
  final $Res Function(TicketResponseModel) _then;

/// Create a copy of TicketResponseModel
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? ticket = null,}) {
  return _then(_self.copyWith(
ticket: null == ticket ? _self.ticket : ticket // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [TicketResponseModel].
extension TicketResponseModelPatterns on TicketResponseModel {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _TicketResponseModel value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _TicketResponseModel() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _TicketResponseModel value)  $default,){
final _that = this;
switch (_that) {
case _TicketResponseModel():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _TicketResponseModel value)?  $default,){
final _that = this;
switch (_that) {
case _TicketResponseModel() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String ticket)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _TicketResponseModel() when $default != null:
return $default(_that.ticket);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String ticket)  $default,) {final _that = this;
switch (_that) {
case _TicketResponseModel():
return $default(_that.ticket);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String ticket)?  $default,) {final _that = this;
switch (_that) {
case _TicketResponseModel() when $default != null:
return $default(_that.ticket);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _TicketResponseModel implements TicketResponseModel {
  const _TicketResponseModel({required this.ticket});
  factory _TicketResponseModel.fromJson(Map<String, dynamic> json) => _$TicketResponseModelFromJson(json);

@override final  String ticket;

/// Create a copy of TicketResponseModel
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$TicketResponseModelCopyWith<_TicketResponseModel> get copyWith => __$TicketResponseModelCopyWithImpl<_TicketResponseModel>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$TicketResponseModelToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _TicketResponseModel&&(identical(other.ticket, ticket) || other.ticket == ticket));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,ticket);

@override
String toString() {
  return 'TicketResponseModel(ticket: $ticket)';
}


}

/// @nodoc
abstract mixin class _$TicketResponseModelCopyWith<$Res> implements $TicketResponseModelCopyWith<$Res> {
  factory _$TicketResponseModelCopyWith(_TicketResponseModel value, $Res Function(_TicketResponseModel) _then) = __$TicketResponseModelCopyWithImpl;
@override @useResult
$Res call({
 String ticket
});




}
/// @nodoc
class __$TicketResponseModelCopyWithImpl<$Res>
    implements _$TicketResponseModelCopyWith<$Res> {
  __$TicketResponseModelCopyWithImpl(this._self, this._then);

  final _TicketResponseModel _self;
  final $Res Function(_TicketResponseModel) _then;

/// Create a copy of TicketResponseModel
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? ticket = null,}) {
  return _then(_TicketResponseModel(
ticket: null == ticket ? _self.ticket : ticket // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}


/// @nodoc
mixin _$AnswerResultModel {

 String get status; bool get isCorrect; String get explanation; String get correctAnswer; int get pointsEarned; int get streak; int get betAmount; int get betWon;
/// Create a copy of AnswerResultModel
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$AnswerResultModelCopyWith<AnswerResultModel> get copyWith => _$AnswerResultModelCopyWithImpl<AnswerResultModel>(this as AnswerResultModel, _$identity);

  /// Serializes this AnswerResultModel to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is AnswerResultModel&&(identical(other.status, status) || other.status == status)&&(identical(other.isCorrect, isCorrect) || other.isCorrect == isCorrect)&&(identical(other.explanation, explanation) || other.explanation == explanation)&&(identical(other.correctAnswer, correctAnswer) || other.correctAnswer == correctAnswer)&&(identical(other.pointsEarned, pointsEarned) || other.pointsEarned == pointsEarned)&&(identical(other.streak, streak) || other.streak == streak)&&(identical(other.betAmount, betAmount) || other.betAmount == betAmount)&&(identical(other.betWon, betWon) || other.betWon == betWon));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,status,isCorrect,explanation,correctAnswer,pointsEarned,streak,betAmount,betWon);

@override
String toString() {
  return 'AnswerResultModel(status: $status, isCorrect: $isCorrect, explanation: $explanation, correctAnswer: $correctAnswer, pointsEarned: $pointsEarned, streak: $streak, betAmount: $betAmount, betWon: $betWon)';
}


}

/// @nodoc
abstract mixin class $AnswerResultModelCopyWith<$Res>  {
  factory $AnswerResultModelCopyWith(AnswerResultModel value, $Res Function(AnswerResultModel) _then) = _$AnswerResultModelCopyWithImpl;
@useResult
$Res call({
 String status, bool isCorrect, String explanation, String correctAnswer, int pointsEarned, int streak, int betAmount, int betWon
});




}
/// @nodoc
class _$AnswerResultModelCopyWithImpl<$Res>
    implements $AnswerResultModelCopyWith<$Res> {
  _$AnswerResultModelCopyWithImpl(this._self, this._then);

  final AnswerResultModel _self;
  final $Res Function(AnswerResultModel) _then;

/// Create a copy of AnswerResultModel
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? status = null,Object? isCorrect = null,Object? explanation = null,Object? correctAnswer = null,Object? pointsEarned = null,Object? streak = null,Object? betAmount = null,Object? betWon = null,}) {
  return _then(_self.copyWith(
status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as String,isCorrect: null == isCorrect ? _self.isCorrect : isCorrect // ignore: cast_nullable_to_non_nullable
as bool,explanation: null == explanation ? _self.explanation : explanation // ignore: cast_nullable_to_non_nullable
as String,correctAnswer: null == correctAnswer ? _self.correctAnswer : correctAnswer // ignore: cast_nullable_to_non_nullable
as String,pointsEarned: null == pointsEarned ? _self.pointsEarned : pointsEarned // ignore: cast_nullable_to_non_nullable
as int,streak: null == streak ? _self.streak : streak // ignore: cast_nullable_to_non_nullable
as int,betAmount: null == betAmount ? _self.betAmount : betAmount // ignore: cast_nullable_to_non_nullable
as int,betWon: null == betWon ? _self.betWon : betWon // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [AnswerResultModel].
extension AnswerResultModelPatterns on AnswerResultModel {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _AnswerResultModel value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _AnswerResultModel() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _AnswerResultModel value)  $default,){
final _that = this;
switch (_that) {
case _AnswerResultModel():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _AnswerResultModel value)?  $default,){
final _that = this;
switch (_that) {
case _AnswerResultModel() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String status,  bool isCorrect,  String explanation,  String correctAnswer,  int pointsEarned,  int streak,  int betAmount,  int betWon)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _AnswerResultModel() when $default != null:
return $default(_that.status,_that.isCorrect,_that.explanation,_that.correctAnswer,_that.pointsEarned,_that.streak,_that.betAmount,_that.betWon);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String status,  bool isCorrect,  String explanation,  String correctAnswer,  int pointsEarned,  int streak,  int betAmount,  int betWon)  $default,) {final _that = this;
switch (_that) {
case _AnswerResultModel():
return $default(_that.status,_that.isCorrect,_that.explanation,_that.correctAnswer,_that.pointsEarned,_that.streak,_that.betAmount,_that.betWon);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String status,  bool isCorrect,  String explanation,  String correctAnswer,  int pointsEarned,  int streak,  int betAmount,  int betWon)?  $default,) {final _that = this;
switch (_that) {
case _AnswerResultModel() when $default != null:
return $default(_that.status,_that.isCorrect,_that.explanation,_that.correctAnswer,_that.pointsEarned,_that.streak,_that.betAmount,_that.betWon);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _AnswerResultModel extends AnswerResultModel {
  const _AnswerResultModel({this.status = 'incorrect', this.isCorrect = false, this.explanation = '', this.correctAnswer = '', this.pointsEarned = 0, this.streak = 0, this.betAmount = 0, this.betWon = 0}): super._();
  factory _AnswerResultModel.fromJson(Map<String, dynamic> json) => _$AnswerResultModelFromJson(json);

@override@JsonKey() final  String status;
@override@JsonKey() final  bool isCorrect;
@override@JsonKey() final  String explanation;
@override@JsonKey() final  String correctAnswer;
@override@JsonKey() final  int pointsEarned;
@override@JsonKey() final  int streak;
@override@JsonKey() final  int betAmount;
@override@JsonKey() final  int betWon;

/// Create a copy of AnswerResultModel
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$AnswerResultModelCopyWith<_AnswerResultModel> get copyWith => __$AnswerResultModelCopyWithImpl<_AnswerResultModel>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$AnswerResultModelToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _AnswerResultModel&&(identical(other.status, status) || other.status == status)&&(identical(other.isCorrect, isCorrect) || other.isCorrect == isCorrect)&&(identical(other.explanation, explanation) || other.explanation == explanation)&&(identical(other.correctAnswer, correctAnswer) || other.correctAnswer == correctAnswer)&&(identical(other.pointsEarned, pointsEarned) || other.pointsEarned == pointsEarned)&&(identical(other.streak, streak) || other.streak == streak)&&(identical(other.betAmount, betAmount) || other.betAmount == betAmount)&&(identical(other.betWon, betWon) || other.betWon == betWon));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,status,isCorrect,explanation,correctAnswer,pointsEarned,streak,betAmount,betWon);

@override
String toString() {
  return 'AnswerResultModel(status: $status, isCorrect: $isCorrect, explanation: $explanation, correctAnswer: $correctAnswer, pointsEarned: $pointsEarned, streak: $streak, betAmount: $betAmount, betWon: $betWon)';
}


}

/// @nodoc
abstract mixin class _$AnswerResultModelCopyWith<$Res> implements $AnswerResultModelCopyWith<$Res> {
  factory _$AnswerResultModelCopyWith(_AnswerResultModel value, $Res Function(_AnswerResultModel) _then) = __$AnswerResultModelCopyWithImpl;
@override @useResult
$Res call({
 String status, bool isCorrect, String explanation, String correctAnswer, int pointsEarned, int streak, int betAmount, int betWon
});




}
/// @nodoc
class __$AnswerResultModelCopyWithImpl<$Res>
    implements _$AnswerResultModelCopyWith<$Res> {
  __$AnswerResultModelCopyWithImpl(this._self, this._then);

  final _AnswerResultModel _self;
  final $Res Function(_AnswerResultModel) _then;

/// Create a copy of AnswerResultModel
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? status = null,Object? isCorrect = null,Object? explanation = null,Object? correctAnswer = null,Object? pointsEarned = null,Object? streak = null,Object? betAmount = null,Object? betWon = null,}) {
  return _then(_AnswerResultModel(
status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as String,isCorrect: null == isCorrect ? _self.isCorrect : isCorrect // ignore: cast_nullable_to_non_nullable
as bool,explanation: null == explanation ? _self.explanation : explanation // ignore: cast_nullable_to_non_nullable
as String,correctAnswer: null == correctAnswer ? _self.correctAnswer : correctAnswer // ignore: cast_nullable_to_non_nullable
as String,pointsEarned: null == pointsEarned ? _self.pointsEarned : pointsEarned // ignore: cast_nullable_to_non_nullable
as int,streak: null == streak ? _self.streak : streak // ignore: cast_nullable_to_non_nullable
as int,betAmount: null == betAmount ? _self.betAmount : betAmount // ignore: cast_nullable_to_non_nullable
as int,betWon: null == betWon ? _self.betWon : betWon // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}


/// @nodoc
mixin _$RevealResponseModel {

 String get correctAnswer; String get explanation;
/// Create a copy of RevealResponseModel
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$RevealResponseModelCopyWith<RevealResponseModel> get copyWith => _$RevealResponseModelCopyWithImpl<RevealResponseModel>(this as RevealResponseModel, _$identity);

  /// Serializes this RevealResponseModel to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is RevealResponseModel&&(identical(other.correctAnswer, correctAnswer) || other.correctAnswer == correctAnswer)&&(identical(other.explanation, explanation) || other.explanation == explanation));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,correctAnswer,explanation);

@override
String toString() {
  return 'RevealResponseModel(correctAnswer: $correctAnswer, explanation: $explanation)';
}


}

/// @nodoc
abstract mixin class $RevealResponseModelCopyWith<$Res>  {
  factory $RevealResponseModelCopyWith(RevealResponseModel value, $Res Function(RevealResponseModel) _then) = _$RevealResponseModelCopyWithImpl;
@useResult
$Res call({
 String correctAnswer, String explanation
});




}
/// @nodoc
class _$RevealResponseModelCopyWithImpl<$Res>
    implements $RevealResponseModelCopyWith<$Res> {
  _$RevealResponseModelCopyWithImpl(this._self, this._then);

  final RevealResponseModel _self;
  final $Res Function(RevealResponseModel) _then;

/// Create a copy of RevealResponseModel
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? correctAnswer = null,Object? explanation = null,}) {
  return _then(_self.copyWith(
correctAnswer: null == correctAnswer ? _self.correctAnswer : correctAnswer // ignore: cast_nullable_to_non_nullable
as String,explanation: null == explanation ? _self.explanation : explanation // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [RevealResponseModel].
extension RevealResponseModelPatterns on RevealResponseModel {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _RevealResponseModel value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _RevealResponseModel() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _RevealResponseModel value)  $default,){
final _that = this;
switch (_that) {
case _RevealResponseModel():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _RevealResponseModel value)?  $default,){
final _that = this;
switch (_that) {
case _RevealResponseModel() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String correctAnswer,  String explanation)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _RevealResponseModel() when $default != null:
return $default(_that.correctAnswer,_that.explanation);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String correctAnswer,  String explanation)  $default,) {final _that = this;
switch (_that) {
case _RevealResponseModel():
return $default(_that.correctAnswer,_that.explanation);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String correctAnswer,  String explanation)?  $default,) {final _that = this;
switch (_that) {
case _RevealResponseModel() when $default != null:
return $default(_that.correctAnswer,_that.explanation);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _RevealResponseModel extends RevealResponseModel {
  const _RevealResponseModel({this.correctAnswer = '', this.explanation = ''}): super._();
  factory _RevealResponseModel.fromJson(Map<String, dynamic> json) => _$RevealResponseModelFromJson(json);

@override@JsonKey() final  String correctAnswer;
@override@JsonKey() final  String explanation;

/// Create a copy of RevealResponseModel
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$RevealResponseModelCopyWith<_RevealResponseModel> get copyWith => __$RevealResponseModelCopyWithImpl<_RevealResponseModel>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$RevealResponseModelToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _RevealResponseModel&&(identical(other.correctAnswer, correctAnswer) || other.correctAnswer == correctAnswer)&&(identical(other.explanation, explanation) || other.explanation == explanation));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,correctAnswer,explanation);

@override
String toString() {
  return 'RevealResponseModel(correctAnswer: $correctAnswer, explanation: $explanation)';
}


}

/// @nodoc
abstract mixin class _$RevealResponseModelCopyWith<$Res> implements $RevealResponseModelCopyWith<$Res> {
  factory _$RevealResponseModelCopyWith(_RevealResponseModel value, $Res Function(_RevealResponseModel) _then) = __$RevealResponseModelCopyWithImpl;
@override @useResult
$Res call({
 String correctAnswer, String explanation
});




}
/// @nodoc
class __$RevealResponseModelCopyWithImpl<$Res>
    implements _$RevealResponseModelCopyWith<$Res> {
  __$RevealResponseModelCopyWithImpl(this._self, this._then);

  final _RevealResponseModel _self;
  final $Res Function(_RevealResponseModel) _then;

/// Create a copy of RevealResponseModel
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? correctAnswer = null,Object? explanation = null,}) {
  return _then(_RevealResponseModel(
correctAnswer: null == correctAnswer ? _self.correctAnswer : correctAnswer // ignore: cast_nullable_to_non_nullable
as String,explanation: null == explanation ? _self.explanation : explanation // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}


/// @nodoc
mixin _$AchievementsResponseModel {

 List<AchievementModel> get newlyUnlocked; int get totalBonus; UserModel? get user;
/// Create a copy of AchievementsResponseModel
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$AchievementsResponseModelCopyWith<AchievementsResponseModel> get copyWith => _$AchievementsResponseModelCopyWithImpl<AchievementsResponseModel>(this as AchievementsResponseModel, _$identity);

  /// Serializes this AchievementsResponseModel to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is AchievementsResponseModel&&const DeepCollectionEquality().equals(other.newlyUnlocked, newlyUnlocked)&&(identical(other.totalBonus, totalBonus) || other.totalBonus == totalBonus)&&(identical(other.user, user) || other.user == user));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,const DeepCollectionEquality().hash(newlyUnlocked),totalBonus,user);

@override
String toString() {
  return 'AchievementsResponseModel(newlyUnlocked: $newlyUnlocked, totalBonus: $totalBonus, user: $user)';
}


}

/// @nodoc
abstract mixin class $AchievementsResponseModelCopyWith<$Res>  {
  factory $AchievementsResponseModelCopyWith(AchievementsResponseModel value, $Res Function(AchievementsResponseModel) _then) = _$AchievementsResponseModelCopyWithImpl;
@useResult
$Res call({
 List<AchievementModel> newlyUnlocked, int totalBonus, UserModel? user
});


$UserModelCopyWith<$Res>? get user;

}
/// @nodoc
class _$AchievementsResponseModelCopyWithImpl<$Res>
    implements $AchievementsResponseModelCopyWith<$Res> {
  _$AchievementsResponseModelCopyWithImpl(this._self, this._then);

  final AchievementsResponseModel _self;
  final $Res Function(AchievementsResponseModel) _then;

/// Create a copy of AchievementsResponseModel
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? newlyUnlocked = null,Object? totalBonus = null,Object? user = freezed,}) {
  return _then(_self.copyWith(
newlyUnlocked: null == newlyUnlocked ? _self.newlyUnlocked : newlyUnlocked // ignore: cast_nullable_to_non_nullable
as List<AchievementModel>,totalBonus: null == totalBonus ? _self.totalBonus : totalBonus // ignore: cast_nullable_to_non_nullable
as int,user: freezed == user ? _self.user : user // ignore: cast_nullable_to_non_nullable
as UserModel?,
  ));
}
/// Create a copy of AchievementsResponseModel
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$UserModelCopyWith<$Res>? get user {
    if (_self.user == null) {
    return null;
  }

  return $UserModelCopyWith<$Res>(_self.user!, (value) {
    return _then(_self.copyWith(user: value));
  });
}
}


/// Adds pattern-matching-related methods to [AchievementsResponseModel].
extension AchievementsResponseModelPatterns on AchievementsResponseModel {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _AchievementsResponseModel value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _AchievementsResponseModel() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _AchievementsResponseModel value)  $default,){
final _that = this;
switch (_that) {
case _AchievementsResponseModel():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _AchievementsResponseModel value)?  $default,){
final _that = this;
switch (_that) {
case _AchievementsResponseModel() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( List<AchievementModel> newlyUnlocked,  int totalBonus,  UserModel? user)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _AchievementsResponseModel() when $default != null:
return $default(_that.newlyUnlocked,_that.totalBonus,_that.user);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( List<AchievementModel> newlyUnlocked,  int totalBonus,  UserModel? user)  $default,) {final _that = this;
switch (_that) {
case _AchievementsResponseModel():
return $default(_that.newlyUnlocked,_that.totalBonus,_that.user);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( List<AchievementModel> newlyUnlocked,  int totalBonus,  UserModel? user)?  $default,) {final _that = this;
switch (_that) {
case _AchievementsResponseModel() when $default != null:
return $default(_that.newlyUnlocked,_that.totalBonus,_that.user);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _AchievementsResponseModel implements AchievementsResponseModel {
  const _AchievementsResponseModel({final  List<AchievementModel> newlyUnlocked = const <AchievementModel>[], this.totalBonus = 0, this.user}): _newlyUnlocked = newlyUnlocked;
  factory _AchievementsResponseModel.fromJson(Map<String, dynamic> json) => _$AchievementsResponseModelFromJson(json);

 final  List<AchievementModel> _newlyUnlocked;
@override@JsonKey() List<AchievementModel> get newlyUnlocked {
  if (_newlyUnlocked is EqualUnmodifiableListView) return _newlyUnlocked;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_newlyUnlocked);
}

@override@JsonKey() final  int totalBonus;
@override final  UserModel? user;

/// Create a copy of AchievementsResponseModel
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$AchievementsResponseModelCopyWith<_AchievementsResponseModel> get copyWith => __$AchievementsResponseModelCopyWithImpl<_AchievementsResponseModel>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$AchievementsResponseModelToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _AchievementsResponseModel&&const DeepCollectionEquality().equals(other._newlyUnlocked, _newlyUnlocked)&&(identical(other.totalBonus, totalBonus) || other.totalBonus == totalBonus)&&(identical(other.user, user) || other.user == user));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,const DeepCollectionEquality().hash(_newlyUnlocked),totalBonus,user);

@override
String toString() {
  return 'AchievementsResponseModel(newlyUnlocked: $newlyUnlocked, totalBonus: $totalBonus, user: $user)';
}


}

/// @nodoc
abstract mixin class _$AchievementsResponseModelCopyWith<$Res> implements $AchievementsResponseModelCopyWith<$Res> {
  factory _$AchievementsResponseModelCopyWith(_AchievementsResponseModel value, $Res Function(_AchievementsResponseModel) _then) = __$AchievementsResponseModelCopyWithImpl;
@override @useResult
$Res call({
 List<AchievementModel> newlyUnlocked, int totalBonus, UserModel? user
});


@override $UserModelCopyWith<$Res>? get user;

}
/// @nodoc
class __$AchievementsResponseModelCopyWithImpl<$Res>
    implements _$AchievementsResponseModelCopyWith<$Res> {
  __$AchievementsResponseModelCopyWithImpl(this._self, this._then);

  final _AchievementsResponseModel _self;
  final $Res Function(_AchievementsResponseModel) _then;

/// Create a copy of AchievementsResponseModel
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? newlyUnlocked = null,Object? totalBonus = null,Object? user = freezed,}) {
  return _then(_AchievementsResponseModel(
newlyUnlocked: null == newlyUnlocked ? _self._newlyUnlocked : newlyUnlocked // ignore: cast_nullable_to_non_nullable
as List<AchievementModel>,totalBonus: null == totalBonus ? _self.totalBonus : totalBonus // ignore: cast_nullable_to_non_nullable
as int,user: freezed == user ? _self.user : user // ignore: cast_nullable_to_non_nullable
as UserModel?,
  ));
}

/// Create a copy of AchievementsResponseModel
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$UserModelCopyWith<$Res>? get user {
    if (_self.user == null) {
    return null;
  }

  return $UserModelCopyWith<$Res>(_self.user!, (value) {
    return _then(_self.copyWith(user: value));
  });
}
}


/// @nodoc
mixin _$AchievementModel {

 String get id; String get label; int get bonus;
/// Create a copy of AchievementModel
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$AchievementModelCopyWith<AchievementModel> get copyWith => _$AchievementModelCopyWithImpl<AchievementModel>(this as AchievementModel, _$identity);

  /// Serializes this AchievementModel to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is AchievementModel&&(identical(other.id, id) || other.id == id)&&(identical(other.label, label) || other.label == label)&&(identical(other.bonus, bonus) || other.bonus == bonus));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,label,bonus);

@override
String toString() {
  return 'AchievementModel(id: $id, label: $label, bonus: $bonus)';
}


}

/// @nodoc
abstract mixin class $AchievementModelCopyWith<$Res>  {
  factory $AchievementModelCopyWith(AchievementModel value, $Res Function(AchievementModel) _then) = _$AchievementModelCopyWithImpl;
@useResult
$Res call({
 String id, String label, int bonus
});




}
/// @nodoc
class _$AchievementModelCopyWithImpl<$Res>
    implements $AchievementModelCopyWith<$Res> {
  _$AchievementModelCopyWithImpl(this._self, this._then);

  final AchievementModel _self;
  final $Res Function(AchievementModel) _then;

/// Create a copy of AchievementModel
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? label = null,Object? bonus = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,label: null == label ? _self.label : label // ignore: cast_nullable_to_non_nullable
as String,bonus: null == bonus ? _self.bonus : bonus // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [AchievementModel].
extension AchievementModelPatterns on AchievementModel {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _AchievementModel value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _AchievementModel() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _AchievementModel value)  $default,){
final _that = this;
switch (_that) {
case _AchievementModel():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _AchievementModel value)?  $default,){
final _that = this;
switch (_that) {
case _AchievementModel() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String label,  int bonus)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _AchievementModel() when $default != null:
return $default(_that.id,_that.label,_that.bonus);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String label,  int bonus)  $default,) {final _that = this;
switch (_that) {
case _AchievementModel():
return $default(_that.id,_that.label,_that.bonus);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String label,  int bonus)?  $default,) {final _that = this;
switch (_that) {
case _AchievementModel() when $default != null:
return $default(_that.id,_that.label,_that.bonus);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _AchievementModel extends AchievementModel {
  const _AchievementModel({required this.id, this.label = '', this.bonus = 0}): super._();
  factory _AchievementModel.fromJson(Map<String, dynamic> json) => _$AchievementModelFromJson(json);

@override final  String id;
@override@JsonKey() final  String label;
@override@JsonKey() final  int bonus;

/// Create a copy of AchievementModel
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$AchievementModelCopyWith<_AchievementModel> get copyWith => __$AchievementModelCopyWithImpl<_AchievementModel>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$AchievementModelToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _AchievementModel&&(identical(other.id, id) || other.id == id)&&(identical(other.label, label) || other.label == label)&&(identical(other.bonus, bonus) || other.bonus == bonus));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,label,bonus);

@override
String toString() {
  return 'AchievementModel(id: $id, label: $label, bonus: $bonus)';
}


}

/// @nodoc
abstract mixin class _$AchievementModelCopyWith<$Res> implements $AchievementModelCopyWith<$Res> {
  factory _$AchievementModelCopyWith(_AchievementModel value, $Res Function(_AchievementModel) _then) = __$AchievementModelCopyWithImpl;
@override @useResult
$Res call({
 String id, String label, int bonus
});




}
/// @nodoc
class __$AchievementModelCopyWithImpl<$Res>
    implements _$AchievementModelCopyWith<$Res> {
  __$AchievementModelCopyWithImpl(this._self, this._then);

  final _AchievementModel _self;
  final $Res Function(_AchievementModel) _then;

/// Create a copy of AchievementModel
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? label = null,Object? bonus = null,}) {
  return _then(_AchievementModel(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,label: null == label ? _self.label : label // ignore: cast_nullable_to_non_nullable
as String,bonus: null == bonus ? _self.bonus : bonus // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}

// dart format on
