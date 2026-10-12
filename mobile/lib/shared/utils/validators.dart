/// Forma validatorlari.
///
/// MUHIM: bu yerdagi qoidalar backend'dagi
/// `backend-django/apps/auth_api/credentials.py` bilan **bir xil** bo'lishi
/// shart. Kliyent validatsiyasi — faqat qulaylik uchun (tez javob), haqiqiy
/// himoya serverda. Ikkalasi ajralib ketsa foydalanuvchi tushunarsiz
/// server xatolarini ko'radi.
class Validators {
  const Validators._();

  static const phoneDigitsLength = 9; // 90 123 45 67
  static const passwordMinLength = 8;
  static const passwordMaxLength = 128;
  static const nameMaxLength = 30;

  /// `+998 90 123 45 67` → `+998901234567`
  static String normalizePhone(String raw) {
    final digits = raw.replaceAll(RegExp(r'\D'), '');
    if (digits.isEmpty) return '';
    if (digits.startsWith('998')) return '+$digits';
    if (digits.length == phoneDigitsLength) return '+998$digits';
    if (digits.length == phoneDigitsLength + 1 && digits.startsWith('0')) {
      return '+998${digits.substring(1)}';
    }
    return '+$digits';
  }

  /// Faqat milliy qismi (maska uchun): `901234567`
  static String nationalDigits(String raw) {
    var digits = raw.replaceAll(RegExp(r'\D'), '');
    if (digits.startsWith('998')) digits = digits.substring(3);
    if (digits.length > phoneDigitsLength) {
      digits = digits.substring(0, phoneDigitsLength);
    }
    return digits;
  }

  static String? phone(String? value) {
    final digits = nationalDigits(value ?? '');
    if (digits.isEmpty) return 'Telefon raqamini kiriting';
    if (digits.length < phoneDigitsLength) return 'Raqam to\'liq emas';
    return null;
  }

  static String? password(String? value) {
    final v = value ?? '';
    if (v.isEmpty) return 'Parolni kiriting';
    if (v.length < passwordMinLength) {
      return 'Parol kamida $passwordMinLength ta belgi bo\'lsin';
    }
    if (v.length > passwordMaxLength) {
      return 'Parol $passwordMaxLength belgidan oshmasin';
    }
    if (!RegExp(r'[A-Za-zЀ-ӿ]').hasMatch(v)) {
      return 'Parolda kamida bitta harf bo\'lsin';
    }
    if (!RegExp(r'\d').hasMatch(v)) {
      return 'Parolda kamida bitta raqam bo\'lsin';
    }
    return null;
  }

  static String? confirmPassword(String? value, String original) {
    if ((value ?? '').isEmpty) return 'Parolni takrorlang';
    if (value != original) return 'Parollar mos kelmadi';
    return null;
  }

  static String? name(String? value, {String field = 'Ism'}) {
    final v = (value ?? '').trim();
    if (v.isEmpty) return '${field}ni kiriting';
    if (v.length < 2) return '$field juda qisqa';
    if (v.length > nameMaxLength) return '$field $nameMaxLength belgidan oshmasin';
    return null;
  }

  /// Parol kuchi: 0.0 – 1.0 (UI indikatori uchun).
  static double passwordStrength(String value) {
    if (value.isEmpty) return 0;
    var score = 0;
    if (value.length >= 8) score++;
    if (value.length >= 12) score++;
    if (RegExp(r'[a-zа-я]').hasMatch(value) &&
        RegExp(r'[A-ZА-Я]').hasMatch(value)) {
      score++;
    }
    if (RegExp(r'\d').hasMatch(value)) score++;
    if (RegExp(r'[^A-Za-z0-9]').hasMatch(value)) score++;
    return (score / 5).clamp(0.0, 1.0);
  }

  static String passwordStrengthLabel(double strength) {
    if (strength < 0.35) return 'Zaif';
    if (strength < 0.7) return 'O\'rtacha';
    return 'Kuchli';
  }
}
