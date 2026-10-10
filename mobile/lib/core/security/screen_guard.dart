import 'dart:io';

import 'package:flutter/widgets.dart';
import 'package:no_screenshot/no_screenshot.dart';

/// Skrinshot va ekranni yozib olishdan himoya.
///
/// ## Platformalar
///
/// * **Android** — `FLAG_SECURE`. Skrinshotni butunlay bloklaydi, ekran
///   yozuvida oyna qora bo'lib chiqadi, "so'nggi ilovalar" ro'yxatida ham
///   ko'rinmaydi. Ishonchli.
/// * **iOS** — Apple `FLAG_SECURE` ekvivalentini bermaydi. Plagin skrinshot
///   olinganini ANIQLAY oladi va ekran yozuvi paytida kontentni yashira oladi,
///   lekin **skrinshotni to'liq to'sib bo'lmaydi**. Bu platforma cheklovi.
///
/// ## Foydalanish
///
/// Faqat maxfiy ekranlarda yoqiladi (savol ekrani), qolgan joyda o'chiriladi —
/// aks holda foydalanuvchi natijasini do'stiga ulasha olmaydi va bu salbiy
/// tajriba beradi.
///
/// ```dart
/// @override
/// void initState() {
///   super.initState();
///   ScreenGuard.enable();
/// }
///
/// @override
/// void dispose() {
///   ScreenGuard.disable();
///   super.dispose();
/// }
/// ```
class ScreenGuard {
  const ScreenGuard._();

  static final _plugin = NoScreenshot.instance;
  static bool _enabled = false;

  static bool get isEnabled => _enabled;

  /// Himoyani yoqadi. Xato bo'lsa jim o'tadi — himoya ishlamagani
  /// ilovani ishdan chiqarmasligi kerak.
  static Future<void> enable() async {
    if (_enabled) return;
    try {
      await _plugin.screenshotOff();
      _enabled = true;
    } catch (e) {
      debugPrint('[ScreenGuard] yoqib bo\'lmadi: $e');
    }
  }

  static Future<void> disable() async {
    if (!_enabled) return;
    try {
      await _plugin.screenshotOn();
      _enabled = false;
    } catch (e) {
      debugPrint('[ScreenGuard] o\'chirib bo\'lmadi: $e');
    }
  }

  /// iOS'da skrinshot olinganini kuzatish mumkin (bloklash emas).
  /// Analitika yoki ogohlantirish ko'rsatish uchun ishlatiladi.
  static bool get canOnlyDetectNotBlock => Platform.isIOS;
}

/// Maxfiy ekranlarda ishlatiladigan qulay mixin.
///
/// ```dart
/// class _QuestionPageState extends State<QuestionPage> with ScreenGuardMixin {
///   ...
/// }
/// ```
mixin ScreenGuardMixin<T extends StatefulWidget> on State<T> {
  @override
  void initState() {
    super.initState();
    ScreenGuard.enable();
  }

  @override
  void dispose() {
    ScreenGuard.disable();
    super.dispose();
  }
}
