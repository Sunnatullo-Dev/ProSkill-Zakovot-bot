import 'dart:async';

import 'package:dio/dio.dart';

import '../network/api_paths.dart';

/// Server vaqti bilan sinxronlangan soat.
///
/// ## Nega kerak
///
/// O'yin taymerlari qurilma soatiga ASOSLANMASLIGI kerak: foydalanuvchi
/// sozlamalardan vaqtni orqaga surib, "vaqt tugamadi" holatini yaratishi
/// mumkin. Backend baribir o'z tekshiruvini qiladi (bilet `issued_at_ms`,
/// savol `deadline`), lekin UI taymeri server bilan mos bo'lmasa foydalanuvchi
/// "menda 10 soniya bor edi-ku" deb noto'g'ri tajriba oladi.
///
/// ## Qanday ishlaydi
///
/// 1. `/api/time` chaqiriladi, RTT (borib-kelish vaqti) o'lchanadi.
/// 2. Server vaqtiga RTT/2 qo'shiladi (javob kelguncha o'tgan vaqt).
/// 3. Shu payt **monotonik** soat (`Stopwatch`) qiymati eslab qolinadi.
/// 4. Keyingi har bir `now()` chaqiruvi = tuzatilgan server vaqti +
///    monotonik soat o'tgan vaqti.
///
/// Monotonik soat ishlatilishining sababi: `DateTime.now()` foydalanuvchi
/// qurilma vaqtini o'zgartirsa sakraydi, `Stopwatch` esa sakramaydi.
class ServerClock {
  ServerClock(this._dio);

  final Dio _dio;

  final Stopwatch _monotonic = Stopwatch();

  /// Oxirgi sinxronizatsiyadagi server vaqti (unix ms).
  int? _serverEpochMsAtSync;

  /// Sinxronizatsiya sifati — RTT qancha kichik bo'lsa shuncha aniq.
  Duration? _lastRoundTrip;

  bool get isSynced => _serverEpochMsAtSync != null && _monotonic.isRunning;
  Duration? get lastRoundTrip => _lastRoundTrip;

  /// Serverdan vaqtni oladi. Xato bo'lsa `false` qaytaradi (istisno ko'tarmaydi).
  Future<bool> sync() async {
    final stopwatch = Stopwatch()..start();
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        ApiPaths.serverTime,
        options: Options(
          // Sinxronizatsiya tez bo'lishi kerak — uzoq kutmaymiz.
          receiveTimeout: const Duration(seconds: 8),
          sendTimeout: const Duration(seconds: 8),
        ),
      );
      stopwatch.stop();

      final raw = response.data?['epochMs'];
      final epochMs = raw is int ? raw : int.tryParse('$raw');
      if (epochMs == null) return false;

      _lastRoundTrip = stopwatch.elapsed;
      // Javob yo'lda bo'lgan vaqtning yarmini qo'shamiz.
      _serverEpochMsAtSync = epochMs + (stopwatch.elapsedMilliseconds ~/ 2);
      _monotonic
        ..reset()
        ..start();
      return true;
    } catch (_) {
      stopwatch.stop();
      return false;
    }
  }

  /// Joriy server vaqti (unix ms).
  ///
  /// Sinxronizatsiya bo'lmagan bo'lsa qurilma vaqtiga qaytadi —
  /// bu holda UI baribir ishlaydi, faqat aniqlik pastroq.
  int nowEpochMs() {
    final base = _serverEpochMsAtSync;
    if (base == null || !_monotonic.isRunning) {
      return DateTime.now().millisecondsSinceEpoch;
    }
    return base + _monotonic.elapsedMilliseconds;
  }

  DateTime now() => DateTime.fromMillisecondsSinceEpoch(nowEpochMs());

  /// Berilgan deadline'gacha qolgan vaqt (manfiy bo'lmaydi).
  Duration remainingUntil(int deadlineEpochMs) {
    final diff = deadlineEpochMs - nowEpochMs();
    return diff <= 0 ? Duration.zero : Duration(milliseconds: diff);
  }

  /// Server bergan "qolgan ms" ni mutlaq deadline'ga aylantiradi.
  ///
  /// Backend ko'p joyda `timeRemainingMs` qaytaradi (`/battles/<id>/state`,
  /// gameroom `state`). Uni bir marta deadline'ga aylantirib qo'ysak,
  /// keyingi kadrlarda qayta so'rov kerak bo'lmaydi.
  int deadlineFromRemaining(int remainingMs) => nowEpochMs() + remainingMs;

  void dispose() => _monotonic.stop();
}
