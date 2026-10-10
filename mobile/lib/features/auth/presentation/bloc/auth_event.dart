part of 'auth_bloc.dart';

sealed class AuthEvent extends Equatable {
  const AuthEvent();

  @override
  List<Object?> get props => const [];
}

/// Ilova ishga tushdi — saqlangan sessiyani tekshirish.
class AuthStarted extends AuthEvent {
  const AuthStarted();
}

/// Login/register muvaffaqiyatli tugadi.
class AuthSessionGranted extends AuthEvent {
  const AuthSessionGranted(this.session);
  final AuthSession session;

  @override
  List<Object?> get props => [session];
}

/// Profil ma'lumoti yangilandi (ism o'zgardi, ball qo'shildi va h.k.).
class AuthUserUpdated extends AuthEvent {
  const AuthUserUpdated(this.user);
  final AppUser user;

  @override
  List<Object?> get props => [user];
}

/// Foydalanuvchi "Chiqish" tugmasini bosdi.
class AuthLogoutRequested extends AuthEvent {
  const AuthLogoutRequested();
}

/// Token yangilanmadi — majburiy chiqish (interceptor chaqiradi).
class AuthSessionExpired extends AuthEvent {
  const AuthSessionExpired();
}

/// Onboarding ko'rildi.
class AuthOnboardingCompleted extends AuthEvent {
  const AuthOnboardingCompleted();
}
