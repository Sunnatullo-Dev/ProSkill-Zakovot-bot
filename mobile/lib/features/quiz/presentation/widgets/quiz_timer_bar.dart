import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';

/// Qolgan vaqtni ko'rsatuvchi chiziq + raqam.
///
/// Rang vaqt kamayishi bilan o'zgaradi: oltin → sariq → qizil.
/// Oxirgi 10 soniyada raqam pulsatsiya qiladi — foydalanuvchi
/// taymerga qaramay turgan bo'lsa ham sezadi.
class QuizTimerBar extends StatelessWidget {
  const QuizTimerBar({
    super.key,
    required this.fraction,
    required this.remainingSeconds,
    this.isPaused = false,
  });

  /// 1.0 → to'liq vaqt bor, 0.0 → tugadi.
  final double fraction;
  final int remainingSeconds;

  /// Javob yuborilayotganda taymer to'xtaydi.
  final bool isPaused;

  Color get _color {
    if (fraction > 0.5) return AppColors.gold;
    if (fraction > 0.2) return AppColors.warning;
    return AppColors.error;
  }

  bool get _isCritical => fraction <= 0.2 && !isPaused;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Icon(
              isPaused ? Icons.pause_circle_outline : Icons.timer_outlined,
              size: 16,
              color: _color,
            ),
            const SizedBox(width: 6),
            AnimatedDefaultTextStyle(
              duration: const Duration(milliseconds: 250),
              style: TextStyle(
                fontSize: _isCritical ? 17 : 15,
                fontWeight: FontWeight.w800,
                color: _color,
                fontFeatures: const [FontFeature.tabularFigures()],
              ),
              child: Text(_format(remainingSeconds)),
            ),
            const Spacer(),
            Text(
              'soniya',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
                fontSize: 11,
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        ClipRRect(
          borderRadius: BorderRadius.circular(6),
          child: TweenAnimationBuilder<double>(
            // Tick 150 ms da keladi — oraliqni animatsiya bilan
            // tekislaymiz, aks holda chiziq sakrab turadi.
            duration: const Duration(milliseconds: 200),
            curve: Curves.linear,
            tween: Tween(begin: fraction, end: fraction),
            builder: (context, value, _) => LinearProgressIndicator(
              value: value,
              minHeight: 7,
              backgroundColor: theme.colorScheme.surfaceContainerHighest,
              valueColor: AlwaysStoppedAnimation(_color),
            ),
          ),
        ),
      ],
    );
  }

  static String _format(int seconds) {
    if (seconds < 0) return '0:00';
    final m = seconds ~/ 60;
    final s = seconds % 60;
    return '$m:${s.toString().padLeft(2, '0')}';
  }
}
