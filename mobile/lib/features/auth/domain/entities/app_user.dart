import 'package:equatable/equatable.dart';

/// Foydalanuvchi — domen qatlamidagi sof model.
///
/// `data` qatlamidagi `UserModel` dan farqi: bu yerda JSON, Freezed yoki
/// tarmoqqa oid hech narsa yo'q. Backend javob formatini o'zgartirsa,
/// faqat `UserModel.toEntity()` o'zgaradi — UI va biznes mantiq tegilmaydi.
class AppUser extends Equatable {
  const AppUser({
    required this.id,
    required this.telegramId,
    required this.score,
    required this.language,
    required this.currentStreak,
    required this.authProvider,
    required this.isAppAccount,
    required this.hasPassword,
    required this.isPremium,
    this.unlockedAchievements = const [],
    this.phone,
    this.email,
    this.firstName,
    this.lastName,
    this.username,
    this.displayName,
    this.premiumUntil,
    this.createdAt,
  });

  final String id;
  final int telegramId;
  final String? phone;
  final String? email;
  final String? firstName;
  final String? lastName;
  final String? username;
  final String? displayName;
  final int score;
  final String language;
  final int currentStreak;

  /// `telegram` | `phone` | `both`
  final String authProvider;

  /// Telegramsiz, faqat mobil ilova orqali yaratilgan akkauntmi?
  final bool isAppAccount;
  final bool hasPassword;

  /// Ochilgan yutuq ID'lari (backend `unlocked_achievements`).
  final List<String> unlockedAchievements;

  final bool isPremium;
  final DateTime? premiumUntil;
  final DateTime? createdAt;

  /// UI'da ko'rsatiladigan ism — prioritet tartibida.
  ///
  /// Web ilovadagi `pickDisplayName()` bilan bir xil mantiq, shunda
  /// foydalanuvchi ikkala platformada bir xil ism ko'radi.
  String get visibleName {
    final display = displayName?.trim();
    if (display != null && display.isNotEmpty) return display;

    final full = [firstName, lastName]
        .where((p) => p != null && p.trim().isNotEmpty)
        .map((p) => p!.trim())
        .join(' ');
    if (full.isNotEmpty) return full;

    final handle = username?.trim();
    if (handle != null && handle.isNotEmpty) return handle;

    return 'Foydalanuvchi';
  }

  /// Avatar uchun bosh harf.
  String get initial {
    final name = visibleName.trim();
    return name.isEmpty ? 'Z' : name[0].toUpperCase();
  }

  bool get canLinkTelegram => isAppAccount;

  AppUser copyWith({
    String? displayName,
    int? score,
    String? language,
    int? currentStreak,
    bool? isPremium,
    DateTime? premiumUntil,
  }) {
    return AppUser(
      id: id,
      telegramId: telegramId,
      phone: phone,
      email: email,
      firstName: firstName,
      lastName: lastName,
      username: username,
      displayName: displayName ?? this.displayName,
      score: score ?? this.score,
      language: language ?? this.language,
      currentStreak: currentStreak ?? this.currentStreak,
      authProvider: authProvider,
      isAppAccount: isAppAccount,
      hasPassword: hasPassword,
      unlockedAchievements: unlockedAchievements,
      isPremium: isPremium ?? this.isPremium,
      premiumUntil: premiumUntil ?? this.premiumUntil,
      createdAt: createdAt,
    );
  }

  @override
  List<Object?> get props => [
        id,
        telegramId,
        phone,
        email,
        firstName,
        lastName,
        username,
        displayName,
        score,
        language,
        currentStreak,
        authProvider,
        isAppAccount,
        hasPassword,
        unlockedAchievements,
        isPremium,
        premiumUntil,
        createdAt,
      ];
}
