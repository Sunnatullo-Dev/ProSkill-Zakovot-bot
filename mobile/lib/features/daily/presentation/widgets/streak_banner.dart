import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../domain/entities/daily_challenge.dart';

/// Ketma-ketlik holati va bonus chegaralari.
///
/// Chegaralar 3 → 7 → 14 → 30 kun. Har biri erishilgan/erishilmagan
/// holatda ko'rsatiladi, oralarida progress chizig'i bor.
class StreakBanner extends StatelessWidget {
  const StreakBanner({
    super.key,
    required this.streak,
    required this.bonusPreview,
  });

  final DailyStreak streak;

  /// Bugun yakunlansa beriladigan bonus (server hisoblagan).
  final int bonusPreview;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final next = StreakTier.nextAfter(streak.current);

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            AppColors.warning.withValues(alpha: 0.16),
            AppColors.gold.withValues(alpha: 0.05),
          ],
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.warning.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                streak.current > 0 ? '🔥' : '📅',
                style: const TextStyle(fontSize: 26),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      streak.current > 0
                          ? '${streak.current} kunlik ketma-ketlik'
                          : 'Ketma-ketlikni boshlang',
                      style: theme.textTheme.titleMedium
                          ?.copyWith(fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      streak.longest > 0
                          ? 'Eng uzun: ${streak.longest} kun'
                          : 'Har kuni o\'ynab bonus to\'plang',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
              if (bonusPreview > 0)
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 11, vertical: 6),
                  decoration: BoxDecoration(
                    gradient: AppColors.goldGradient,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    '+$bonusPreview',
                    style: const TextStyle(
                      fontWeight: FontWeight.w900,
                      color: Color(0xFF1A0A00),
                      fontSize: 14,
                    ),
                  ),
                ),
            ],
          ),

          const SizedBox(height: 18),
          _TierTrack(currentStreak: streak.current),

          if (next != null) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                Icon(
                  Icons.arrow_forward_rounded,
                  size: 14,
                  color: theme.colorScheme.onSurfaceVariant,
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    'Yana ${next.days - streak.current} kun → +${next.bonus} bonus ball',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

/// 3 → 7 → 14 → 30 chegaralari chizig'i.
class _TierTrack extends StatelessWidget {
  const _TierTrack({required this.currentStreak});

  final int currentStreak;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final tiers = StreakTier.all;

    return Row(
      children: [
        for (var i = 0; i < tiers.length; i++) ...[
          if (i > 0)
            Expanded(
              child: Container(
                height: 2.5,
                margin: const EdgeInsets.symmetric(horizontal: 4),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(2),
                  color: currentStreak >= tiers[i].days
                      ? AppColors.warning
                      : theme.colorScheme.outline,
                ),
              ),
            ),
          _TierDot(
            tier: tiers[i],
            reached: currentStreak >= tiers[i].days,
          ),
        ],
      ],
    );
  }
}

class _TierDot extends StatelessWidget {
  const _TierDot({required this.tier, required this.reached});

  final StreakTier tier;
  final bool reached;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        AnimatedContainer(
          duration: const Duration(milliseconds: 300),
          height: 30,
          width: 30,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: reached
                ? AppColors.warning
                : theme.colorScheme.surfaceContainerHighest,
            border: Border.all(
              color: reached ? AppColors.warning : theme.colorScheme.outline,
              width: 1.5,
            ),
          ),
          alignment: Alignment.center,
          child: reached
              ? const Icon(Icons.check_rounded, size: 16, color: Colors.white)
              : Text(
                  '${tier.days}',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
        ),
        const SizedBox(height: 5),
        Text(
          '+${tier.bonus}',
          style: TextStyle(
            fontSize: 10,
            fontWeight: FontWeight.w700,
            color: reached
                ? AppColors.warning
                : theme.colorScheme.onSurfaceVariant,
          ),
        ),
      ],
    );
  }
}
