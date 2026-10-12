import 'package:bloc/bloc.dart';
import 'package:equatable/equatable.dart';

import '../../../../core/error/failure.dart';
import '../../domain/entities/auth_session.dart';
import '../../domain/usecases/auth_usecases.dart';

enum FormStatus { idle, submitting, success, failure }

class LoginState extends Equatable {
  const LoginState({
    this.status = FormStatus.idle,
    this.session,
    this.errorMessage,
    this.fieldErrors = const {},
    this.obscurePassword = true,
  });

  final FormStatus status;
  final AuthSession? session;
  final String? errorMessage;
  final Map<String, String> fieldErrors;
  final bool obscurePassword;

  bool get isSubmitting => status == FormStatus.submitting;

  LoginState copyWith({
    FormStatus? status,
    AuthSession? session,
    String? errorMessage,
    Map<String, String>? fieldErrors,
    bool? obscurePassword,
    bool clearError = false,
  }) {
    return LoginState(
      status: status ?? this.status,
      session: session ?? this.session,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      fieldErrors: clearError ? const {} : (fieldErrors ?? this.fieldErrors),
      obscurePassword: obscurePassword ?? this.obscurePassword,
    );
  }

  @override
  List<Object?> get props =>
      [status, session, errorMessage, fieldErrors, obscurePassword];
}

class LoginCubit extends Cubit<LoginState> {
  LoginCubit(this._login) : super(const LoginState());

  final LoginUseCase _login;

  void togglePasswordVisibility() =>
      emit(state.copyWith(obscurePassword: !state.obscurePassword));

  void clearError() => emit(state.copyWith(clearError: true, status: FormStatus.idle));

  Future<void> submit({required String phone, required String password}) async {
    if (state.isSubmitting) return;

    emit(state.copyWith(status: FormStatus.submitting, clearError: true));

    final result = await _login(LoginParams(phone: phone, password: password));

    result.fold(
      (failure) => emit(state.copyWith(
        status: FormStatus.failure,
        errorMessage: failure.message,
        fieldErrors:
            failure is ValidationFailure ? failure.fieldErrors : const {},
      )),
      (session) => emit(state.copyWith(
        status: FormStatus.success,
        session: session,
      )),
    );
  }
}
