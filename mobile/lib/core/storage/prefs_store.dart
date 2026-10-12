import 'package:shared_preferences/shared_preferences.dart';

/// Maxfiy bo'lmagan lokal sozlamalar (til, onboarding, tovush).
///
/// Maxfiy ma'lumot (token) uchun `TokenStore` ishlatiladi.
class PrefsStore {
  PrefsStore(this._prefs);

  final SharedPreferences _prefs;

  static const _kOnboardingDone = 'zakovat.onboarding_done';
  static const _kLanguage = 'zakovat.language';
  static const _kSoundEnabled = 'zakovat.sound_enabled';
  static const _kHapticsEnabled = 'zakovat.haptics_enabled';
  static const _kThemeMode = 'zakovat.theme_mode';
  static const _kLastPhone = 'zakovat.last_phone';

  // ── Onboarding ────────────────────────────────────────────────────────────
  bool get onboardingDone => _prefs.getBool(_kOnboardingDone) ?? false;
  Future<void> setOnboardingDone(bool value) =>
      _prefs.setBool(_kOnboardingDone, value);

  // ── Til ───────────────────────────────────────────────────────────────────
  /// Backend qo'llab-quvvatlaydigan kodlar: `uz-latn`, `uz-cyrl`, `ru`.
  String get language => _prefs.getString(_kLanguage) ?? 'uz-latn';
  Future<void> setLanguage(String value) => _prefs.setString(_kLanguage, value);

  // ── Tovush / tebranish ────────────────────────────────────────────────────
  bool get soundEnabled => _prefs.getBool(_kSoundEnabled) ?? true;
  Future<void> setSoundEnabled(bool value) =>
      _prefs.setBool(_kSoundEnabled, value);

  bool get hapticsEnabled => _prefs.getBool(_kHapticsEnabled) ?? true;
  Future<void> setHapticsEnabled(bool value) =>
      _prefs.setBool(_kHapticsEnabled, value);

  // ── Mavzu ─────────────────────────────────────────────────────────────────
  /// `system` | `light` | `dark`
  String get themeMode => _prefs.getString(_kThemeMode) ?? 'dark';
  Future<void> setThemeMode(String value) => _prefs.setString(_kThemeMode, value);

  // ── Qulaylik: oxirgi kiritilgan raqam (login formasini oldindan to'ldirish) ─
  String? get lastPhone => _prefs.getString(_kLastPhone);
  Future<void> setLastPhone(String? value) async {
    if (value == null || value.isEmpty) {
      await _prefs.remove(_kLastPhone);
    } else {
      await _prefs.setString(_kLastPhone, value);
    }
  }

  /// Chiqishda foydalanuvchiga oid ma'lumotlarni tozalaydi
  /// (sozlamalar — til, mavzu, tovush — saqlanadi).
  Future<void> clearUserScoped() async {
    await _prefs.remove(_kLastPhone);
  }
}
