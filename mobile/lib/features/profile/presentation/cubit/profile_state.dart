part of 'profile_cubit.dart';

enum ProfileStatus { initial, loading, success, failure }

/// Qo'llab-quvvatlanadigan tillar — backend `users/views.py::SUPPORTED_LANGUAGES`.
enum AppLanguage {
  uzLatn('uz-latn', 'O\'zbek', '🇺🇿', 'Lat'),
  uzCyrl('uz-cyrl', 'Ўзбек', '🇺🇿', 'Кр'),
  ru('ru', 'Русский', '🇷🇺', '');

  const AppLanguage(this.code, this.label, this.flag, this.sublabel);

  final String code;
  final String label;
  final String flag;
  final String sublabel;

  static AppLanguage fromCode(String? code) => switch (code) {
        'uz-cyrl' => AppLanguage.uzCyrl,
        'ru' => AppLanguage.ru,
        _ => AppLanguage.uzLatn,
      };
}

class ProfileState extends Equatable {
  const ProfileState({
    this.status = ProfileStatus.initial,
    this.stats = const GameStats.empty(),
    this.pendingLanguage,
    this.isSavingLanguage = false,
    this.languageSaved = false,
    this.errorMessage,
  });

  final ProfileStatus status;
  final GameStats stats;

  /// Foydalanuvchi tanlagan, lekin hali server tasdiqlamagan til.
  /// `null` — `AuthBloc` dagi qiymat ishlatiladi.
  final String? pendingLanguage;

  final bool isSavingLanguage;

  /// Bir martalik bayroq — snackbar ko'rsatish uchun.
  final bool languageSaved;

  final String? errorMessage;

  bool get isLoading => status == ProfileStatus.loading;

  ProfileState copyWith({
    ProfileStatus? status,
    GameStats? stats,
    String? pendingLanguage,
    bool? isSavingLanguage,
    bool? languageSaved,
    String? errorMessage,
    bool clearError = false,
    bool clearPendingLanguage = false,
  }) {
    return ProfileState(
      status: status ?? this.status,
      stats: stats ?? this.stats,
      pendingLanguage: clearPendingLanguage
          ? null
          : (pendingLanguage ?? this.pendingLanguage),
      isSavingLanguage: isSavingLanguage ?? this.isSavingLanguage,
      languageSaved: languageSaved ?? this.languageSaved,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }

  @override
  List<Object?> get props => [
        status,
        stats,
        pendingLanguage,
        isSavingLanguage,
        languageSaved,
        errorMessage,
      ];
}
