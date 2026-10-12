import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../domain/entities/achievement.dart';
import '../../domain/entities/game_stats.dart';

/// Yutuq kartasi — ochilgan/yopiq holati va progress bilan.
class AchievementCard extends StatelessWidget {
  const AchievementCard({
    super.key,
    required this.achievement,
    required this.isUnlocked,
    required this.stats,
    required this.totalScore,
  });

  final Achievement achievement;

  /// Serverdan kelgan haqiqat (`user.unlockedAchievements`).
  ///
  /// Progress esa statistikadan hisoblanadi — shuning uchun "shart bajarilgan,
  /// lekin hali bonus olinmagan" holat ham to'g'ri ko'rinadi.
  final bool isUnlocked;

  final GameStats stats;
  final int totalScore;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final progress = achievement.progress(stats, totalScore);
    final ratio = achievement.ratio(stats, totalScore);
    final isReady = !isUnlocked && ratio >= 1;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isUnlocked
            ? AppColors.gold.withValues(alpha: 0.09)
            : theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isUnlocked
              ? AppColors.gold.withValues(alpha: 0.45)
              : theme.colorScheme.outline,
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Ikonka ────────────────────────────────────────────────────────
          Opacity(
            opacity: isUnlocked ? 1 : 0.4,
            child: Container(
              height: 46,
              width: 46,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(14),
                color: isUnlocked
                    ? AppColors.gold.withValues(alpha: 0.2)
                    : theme.colorScheme.surfaceContainerHighest,
              ),
              alignment: Alignment.center,
              child: Text(
                achievement.icon,
                style: const TextStyle(fontSize: 22),
              ),
            ),
          ),
          const SizedBox(width: 13),

          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        achievement.label,
                        style: theme.textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w800,
                          color: isUnlocked
                              ? null
                              : theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ),
                    const SizedBox(width: 7),
                    if (isUnlocked)
                      const Icon(Icons.verified_rounded,
                          size: 16, color: AppColors.gold)
                    else if (isReady)
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppColors.success.withValues(alpha: 0.18),
                          borderRadius: BorderRadius.circular(5),
                        ),
                        child: const Text(
                          'TAYYOR',
                          style: TextStyle(
                            fontSize: 8.5,
                            fontWeight: FontWeight.w900,
                            color: AppColors.success,
                          ),
                        ),
                      )
                    else
                      Icon(Icons.lock_outline_rounded,
                          size: 14, color: theme.colorScheme.onSurfaceVariant),
                  ],
                ),
                const SizedBox(height: 3),
                Text(
                  achievement.description,
                  style: theme.textTheme.bodySmall?.copyWith(
                    fontSize: 11.5,
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),

                if (!isUnlocked) ...[
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(3),
                          child: LinearProgressIndicator(
                            value: ratio,
                            minHeight: 4,
                            backgroundColor:
                                theme.colorScheme.surfaceContainerHighest,
                            valueColor: AlwaysStoppedAnimation(
                              isReady ? AppColors.success : AppColors.gold,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        '$progress/${achievement.target}',
                        style: theme.textTheme.bodySmall?.copyWith(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),

          const SizedBox(width: 10),
          Text(
            '+${achievement.bonus}',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w900,
              color: isUnlocked
                  ? AppColors.gold
                  : theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }
}
