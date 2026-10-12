import 'package:bloc/bloc.dart';
import 'package:equatable/equatable.dart';

import '../../../../core/error/failure.dart';
import '../../domain/entities/auth_session.dart';
import '../../domain/entities/telegram_challenge.dart';
import '../../domain/usecases/auth_usecases.dart';
import 'login_cubit.dart' show FormStatus;

class ForgotPasswordState extends Equatable {
  const ForgotPasswordState({
    this.status = FormStatus.idle,
    this.challenge,
    this.session,
    this.errorMessage,
    this.infoMessage,
    this.obscurePassword = true,
  });

  final FormStatus status;
  final TelegramChallenge? challenge;
  final AuthSession? session;
  final String? errorMessage;
  final String? infoMessage;
  final bool obscurePassword;

  bool get isSubmitting => status == FormStatus.submitting;

  ForgotPasswordState copyWith({
    FormStatus? status,
    TelegramChallenge? challenge,
    AuthSession? session,
    String? errorMessage,
    String? infoMessage,
    bool? obscurePassword,
    bool clearError = false,
  }) {
    return ForgotPasswordState(
      status: status ?? this.status,
      challenge: challenge ?? this.challenge,
      session: session ?? this.session,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      infoMessage: infoMessage ?? this.infoMessage,
      obscurePassword: obscurePassword ?? this.obscurePassword,
    );
  }

  @override
  List<Object?> get props => [
        status,
        challenge,
        session,
        errorMessage,
        infoMessage,
        obscurePassword,
      ];
}

class ForgotPasswordCubit extends Cubit<ForgotPasswordState> {
  ForgotPasswordCubit({
    required ForgotPasswordUseCase forgotPassword,
    required ResetPasswordUseCase resetPassword,
    required ResendOtpUseCase resendOtp,
  })  : _forgotPassword = forgotPassword,
        _resetPassword = resetPassword,
        _resendOtp = resendOtp,
        super(const ForgotPasswordState());

  final ForgotPasswordUseCase _forgotPassword;
  final ResetPasswordUseCase _resetPassword;
  final ResendOtpUseCase _resendOtp;

  void togglePasswordVisibility() =>
      emit(state.copyWith(obscurePassword: !state.obscurePassword));

  void clearError() =>
      emit(state.copyWith(clearError: true, status: FormStatus.idle));

  Future<bool> sendRecoveryRequest(String identifier) async {
    if (state.isSubmitting) return false;

    emit(state.copyWith(status: FormStatus.submitting, clearError: true));

    final result = await _forgotPassword(identifier);

    return result.fold(
      (failure) {
        emit(state.copyWith(
          status: FormStatus.failure,
          errorMessage: failure.message,
        ));
        return false;
      },
      (challenge) {
        emit(state.copyWith(
          status: FormStatus.idle,
          challenge: challenge,
          infoMessage: challenge.message,
        ));
        return true;
      },
    );
  }

  Future<bool> resetPassword({
    required String sessionToken,
    required String otp,
    required String newPassword,
  }) async {
    if (state.isSubmitting) return false;

    emit(state.copyWith(status: FormStatus.submitting, clearError: true));

    final result = await _resetPassword(ResetPasswordParams(
      sessionToken: sessionToken,
      otp: otp,
      newPassword: newPassword,
    ));

    return result.fold(
      (failure) {
        emit(state.copyWith(
          status: FormStatus.failure,
          errorMessage: failure.message,
        ));
        return false;
      },
      (session) {
        emit(state.copyWith(
          status: FormStatus.success,
          session: session,
        ));
        return true;
      },
    );
  }

  Future<String?> resendOtp(String sessionToken) async {
    final result = await _resendOtp(sessionToken);
    return result.fold(
      (failure) {
        emit(state.copyWith(errorMessage: failure.message));
        return null;
      },
      (msg) {
        emit(state.copyWith(infoMessage: msg));
        return msg;
      },
    );
  }
}
