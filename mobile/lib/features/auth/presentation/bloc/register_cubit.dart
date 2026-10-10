import 'package:bloc/bloc.dart';
import 'package:equatable/equatable.dart';

import '../../../../core/error/failure.dart';
import '../../domain/entities/auth_session.dart';
import '../../domain/entities/telegram_challenge.dart';
import '../../domain/usecases/auth_usecases.dart';
import 'login_cubit.dart' show FormStatus;

class RegisterState extends Equatable {
  const RegisterState({
    this.status = FormStatus.idle,
    this.session,
    this.challenge,
    this.errorMessage,
    this.fieldErrors = const {},
    this.obscurePassword = true,
    this.acceptedTerms = false,
  });

  final FormStatus status;
  final AuthSession? session;
  final TelegramChallenge? challenge;
  final String? errorMessage;
  final Map<String, String> fieldErrors;
  final bool obscurePassword;
  final bool acceptedTerms;

  bool get isSubmitting => status == FormStatus.submitting;

  RegisterState copyWith({
    FormStatus? status,
    AuthSession? session,
    TelegramChallenge? challenge,
    String? errorMessage,
    Map<String, String>? fieldErrors,
    bool? obscurePassword,
    bool? acceptedTerms,
    bool clearError = false,
  }) {
    return RegisterState(
      status: status ?? this.status,
      session: session ?? this.session,
      challenge: challenge ?? this.challenge,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      fieldErrors: clearError ? const {} : (fieldErrors ?? this.fieldErrors),
      obscurePassword: obscurePassword ?? this.obscurePassword,
      acceptedTerms: acceptedTerms ?? this.acceptedTerms,
    );
  }

  @override
  List<Object?> get props => [
        status,
        session,
        challenge,
        errorMessage,
        fieldErrors,
        obscurePassword,
        acceptedTerms,
      ];
}

class RegisterCubit extends Cubit<RegisterState> {
  RegisterCubit(
    this._register, {
    StartTelegramRegisterUseCase? startTelegramRegister,
    VerifyTelegramRegisterUseCase? verifyTelegramRegister,
    ResendOtpUseCase? resendOtp,
  })  : _startTelegramRegister = startTelegramRegister,
        _verifyTelegramRegister = verifyTelegramRegister,
        _resendOtp = resendOtp,
        super(const RegisterState());

  final RegisterUseCase _register;
  final StartTelegramRegisterUseCase? _startTelegramRegister;
  final VerifyTelegramRegisterUseCase? _verifyTelegramRegister;
  final ResendOtpUseCase? _resendOtp;

  void togglePasswordVisibility() =>
      emit(state.copyWith(obscurePassword: !state.obscurePassword));

  void setAcceptedTerms(bool value) =>
      emit(state.copyWith(acceptedTerms: value));

  void clearError() =>
      emit(state.copyWith(clearError: true, status: FormStatus.idle));

  /// Telegram OTP orqali ro'yxatdan o'tishni boshlaydi
  Future<bool> startRegistration({
    required String phone,
    required String password,
    required String firstName,
    String? lastName,
    String? language,
  }) async {
    if (state.isSubmitting) return false;

    emit(state.copyWith(status: FormStatus.submitting, clearError: true));

    final starter = _startTelegramRegister;
    if (starter == null) {
      // Fallback
      await submit(
        phone: phone,
        password: password,
        firstName: firstName,
        lastName: lastName,
        language: language,
      );
      return state.status == FormStatus.success;
    }

    final result = await starter(RegisterParams(
      phone: phone,
      password: password,
      firstName: firstName,
      lastName: lastName,
      language: language,
    ));

    return result.fold(
      (failure) {
        emit(state.copyWith(
          status: FormStatus.failure,
          errorMessage: failure.message,
          fieldErrors:
              failure is ValidationFailure ? failure.fieldErrors : const {},
        ));
        return false;
      },
      (challenge) {
        emit(state.copyWith(
          status: FormStatus.idle,
          challenge: challenge,
        ));
        return true;
      },
    );
  }

  /// Telegram OTP kodini tekshirish
  Future<bool> verifyOtp({
    required String sessionToken,
    required String otp,
  }) async {
    if (state.isSubmitting) return false;

    final verifier = _verifyTelegramRegister;
    if (verifier == null) return false;

    emit(state.copyWith(status: FormStatus.submitting, clearError: true));

    final result = await verifier(VerifyTelegramRegisterParams(
      sessionToken: sessionToken,
      otp: otp,
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

  /// OTP kodini qayta yuborish
  Future<String?> resendOtpCode({required String sessionToken}) async {
    final sender = _resendOtp;
    if (sender == null) return null;

    final result = await sender(sessionToken);
    return result.fold(
      (failure) {
        emit(state.copyWith(errorMessage: failure.message));
        return null;
      },
      (msg) => msg,
    );
  }

  Future<void> submit({
    required String phone,
    required String password,
    required String firstName,
    String? lastName,
    String? language,
  }) async {
    if (state.isSubmitting) return;

    emit(state.copyWith(status: FormStatus.submitting, clearError: true));

    final result = await _register(RegisterParams(
      phone: phone,
      password: password,
      firstName: firstName,
      lastName: lastName,
      language: language,
    ));

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
