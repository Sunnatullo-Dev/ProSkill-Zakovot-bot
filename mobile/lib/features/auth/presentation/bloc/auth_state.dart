part of 'auth_bloc.dart';

enum AuthStatus {
  /// Hali aniqlanmagan (ilova endi ochildi).
  unknown,

  /// Saqlangan sessiya tekshirilmoqda.
  checking,

  /// Kirilgan.
  authenticated,

  /// Kirilmagan.
  unauthenticated,
}

class AuthState extends Equatable {
  const AuthState({
    required this.status,
    this.user,
    this.isAdmin = false,
    this.onboardingDone = false,
    this.message,
  });

  const AuthState.unknown() : this(status: AuthStatus.unknown);

  const AuthState.checking() : this(status: AuthStatus.checking);

  const AuthState.authenticated({
    required AppUser user,
    bool isAdmin = false,
  }) : this(
          status: AuthStatus.authenticated,
          user: user,
          isAdmin: isAdmin,
          onboardingDone: true,
        );

  const AuthState.unauthenticated({
    bool onboardingDone = false,
    String? message,
  }) : this(
          status: AuthStatus.unauthenticated,
          onboardingDone: onboardingDone,
          message: message,
        );

  final AuthStatus status;
  final AppUser? user;
  final bool isAdmin;

  /// Onboarding ko'rilganmi — router shu bo'yicha yo'naltiradi.
  final bool onboardingDone;

  /// Ko'rsatiladigan bir martalik xabar (masalan "Sessiya tugadi").
  final String? message;

  bool get isAuthenticated => status == AuthStatus.authenticated;
  bool get isResolved =>
      status == AuthStatus.authenticated || status == AuthStatus.unauthenticated;

  AuthState copyWith({
    AuthStatus? status,
    AppUser? user,
    bool? isAdmin,
    bool? onboardingDone,
    String? message,
    bool clearMessage = false,
  }) {
    return AuthState(
      status: status ?? this.status,
      user: user ?? this.user,
      isAdmin: isAdmin ?? this.isAdmin,
      onboardingDone: onboardingDone ?? this.onboardingDone,
      message: clearMessage ? null : (message ?? this.message),
    );
  }

  @override
  List<Object?> get props => [status, user, isAdmin, onboardingDone, message];
}
