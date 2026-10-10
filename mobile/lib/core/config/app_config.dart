/// Ilova konfiguratsiyasi — build vaqtida `--dart-define` orqali beriladi.
///
/// Ishga tushirish:
/// ```bash
/// flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000
/// flutter build apk --release \
///   --dart-define=API_BASE_URL=https://zakovat-backend-euc8.onrender.com \
///   --dart-define=FLAVOR=prod
/// ```
///
/// NEGA `.env` FAYL EMAS: `.env` APK ichiga assets sifatida tushadi va uni
/// ochish juda oson. `--dart-define` esa kompilyatsiya vaqtida konstantaga
/// aylanadi. Baribir mijoz tomonidagi hech narsa maxfiy emas — shuning uchun
/// bu yerda faqat MAXFIY BO'LMAGAN qiymatlar bo'lishi kerak.
library;

import 'package:flutter/foundation.dart';


enum AppFlavor { dev, staging, prod }

class AppConfig {
  const AppConfig._();

  /// Backend manzili (oxirida `/` bo'lmasin).
  ///
  /// Android emulyatorda `10.0.2.2`, iOS simulyatorda va boshqalarda `http://127.0.0.1:3000` ishlatiladi.
  static String get apiBaseUrl {
    const envUrl = String.fromEnvironment('API_BASE_URL');
    if (envUrl.isNotEmpty) return envUrl;
    if (isProduction) {
      return 'https://zakovat-backend-euc8.onrender.com';
    }
    if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
      return 'http://10.0.2.2:3000';
    }
    return 'http://127.0.0.1:3000';
  }

  static const String _flavorRaw = String.fromEnvironment(
    'FLAVOR',
    defaultValue: 'dev',
  );

  static AppFlavor get flavor => switch (_flavorRaw) {
        'prod' => AppFlavor.prod,
        'staging' => AppFlavor.staging,
        _ => AppFlavor.dev,
      };

  static bool get isProduction => flavor == AppFlavor.prod;
  static bool get isDev => flavor == AppFlavor.dev;

  /// Tarmoq loglari faqat prod bo'lmaganda yoqiladi.
  static bool get enableNetworkLogs => !isProduction;

  /// Telegram bot username — taklif havolalari uchun.
  static const String botUsername = String.fromEnvironment(
    'BOT_USERNAME',
    defaultValue: 'zakovot_robot',
  );

  /// So'rov taymautlari.
  static const Duration connectTimeout = Duration(seconds: 15);
  static const Duration receiveTimeout = Duration(seconds: 30);
  static const Duration sendTimeout = Duration(seconds: 30);
}
