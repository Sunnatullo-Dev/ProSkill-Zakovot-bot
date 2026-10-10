import 'package:equatable/equatable.dart';

class TelegramChallenge extends Equatable {
  const TelegramChallenge({
    required this.sessionToken,
    required this.botUsername,
    required this.deepLink,
    required this.expiresInSeconds,
    this.message,
  });

  final String sessionToken;
  final String botUsername;
  final String deepLink;
  final int expiresInSeconds;
  final String? message;

  factory TelegramChallenge.fromJson(Map<String, dynamic> json) {
    return TelegramChallenge(
      sessionToken: json['sessionToken'] as String? ?? '',
      botUsername: json['botUsername'] as String? ?? 'ZakovatApp_bot',
      deepLink: json['deepLink'] as String? ?? '',
      expiresInSeconds: (json['expiresInSeconds'] as num?)?.toInt() ?? 300,
      message: json['message'] as String?,
    );
  }

  @override
  List<Object?> get props => [
        sessionToken,
        botUsername,
        deepLink,
        expiresInSeconds,
        message,
      ];
}
