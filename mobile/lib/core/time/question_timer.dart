import 'dart:async';

import 'server_clock.dart';

/// Savol taymeri — `ServerClock` ga tayanadi, qurilma soatiga emas.
///
/// Yakka o'yin va Kunlik topshiriq bir xil bilet oqimini ishlatadi, shuning
/// uchun taymer mantig'i shu yerda bir marta yozilgan.
///
/// ## Nima uchun alohida klass
///
/// Cubit ichida `Timer.periodic` + deadline hisobi + tozalash takrorlanardi.
/// Bu joyda xato qilish oson: taymerni to'xtatishni unutish → xotira oqishi
/// va yopilgan cubit'ga `emit` (crash).
class QuestionTimer {
  QuestionTimer(this._clock);

  final ServerClock _clock;

  Timer? _ticker;
  int? _deadlineEpochMs;
  int _totalMs = 0;

  /// Tick oralig'i — chiziq silliq harakatlanishi uchun yetarli,
  /// lekin ortiqcha rebuild bermaydi.
  static const tickInterval = Duration(milliseconds: 150);

  bool get isRunning => _ticker?.isActive ?? false;
  int get totalMs => _totalMs;

  /// Qolgan vaqt (ms). To'xtagan bo'lsa 0.
  int get remainingMs {
    final deadline = _deadlineEpochMs;
    if (deadline == null) return 0;
    final left = deadline - _clock.nowEpochMs();
    return left > 0 ? left : 0;
  }

  /// Taymerni boshlaydi.
  ///
  /// [onTick] har 150 ms da qolgan vaqt bilan chaqiriladi.
  /// [onExpired] vaqt tugaganda BIR MARTA chaqiriladi.
  void start({
    required int durationMs,
    required void Function(int remainingMs) onTick,
    required void Function() onExpired,
  }) {
    stop();
    _totalMs = durationMs;
    _deadlineEpochMs = _clock.nowEpochMs() + durationMs;

    _ticker = Timer.periodic(tickInterval, (_) {
      final left = remainingMs;
      if (left <= 0) {
        stop();
        onTick(0);
        onExpired();
        return;
      }
      onTick(left);
    });
  }

  /// Taymerni to'xtatadi (javob yuborilganda).
  void stop() {
    _ticker?.cancel();
    _ticker = null;
  }

  /// Butunlay tozalaydi — cubit `close()` da chaqiriladi.
  void dispose() {
    stop();
    _deadlineEpochMs = null;
    _totalMs = 0;
  }
}
