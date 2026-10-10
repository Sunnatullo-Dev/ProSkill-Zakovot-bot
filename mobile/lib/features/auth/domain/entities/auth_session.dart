import 'package:equatable/equatable.dart';

import 'app_user.dart';

/// Muvaffaqiyatli kirish/ro'yxatdan o'tishdan keyingi sessiya.
class AuthSession extends Equatable {
  const AuthSession({
    required this.user,
    required this.isAdmin,
    required this.tokens,
  });

  final AppUser user;
  final bool isAdmin;
  final AuthTokens tokens;

  @override
  List<Object?> get props => [user, isAdmin, tokens];
}

/// JWT juftligi.
class AuthTokens extends Equatable {
  const AuthTokens({
    required this.accessToken,
    required this.refreshToken,
    required this.accessExpiresIn,
    required this.refreshExpiresIn,
  });

  final String accessToken;
  final String refreshToken;

  /// Soniyalarda.
  final int accessExpiresIn;
  final int refreshExpiresIn;

  @override
  List<Object?> get props => [
        accessToken,
        refreshToken,
        accessExpiresIn,
        refreshExpiresIn,
      ];
}
