import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../domain/entities/leaderboard.dart';

/// Reyting qatori. Top-3 medal bilan, o'zim oltin ramka bilan ajratiladi.
class LeaderboardTile extends StatelessWidget {
  const LeaderboardTile({
    super.key,
    required this.entry,
    required this.unit,
    required this.isMe,
  });

  final LeaderboardEntry entry;

  /// `ball` yoki `kishi`.
  final String unit;

  final bool isMe;

  static const _medals = {1: '🥇', 2: '🥈', 3: '🥉'};

  Color? _medalColor() => switch (entry.rank) {
        1 => AppColors.gold,
        2 => const Color(0xFFC0C0C0),
        3 => const Color(0xFFCD7F32),
        _ => null,
      };

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final medal = _medals[entry.rank];
    final medalColor = _medalColor();

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 12),
      decoration: BoxDecoration(
        color: isMe
            ? AppColors.gold.withValues(alpha: 0.10)
            : theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(15),
        border: Border.all(
          color: isMe
              ? AppColors.gold.withValues(alpha: 0.55)
              : (medalColor?.withValues(alpha: 0.35) ??
                  theme.colorScheme.outline),
          width: isMe ? 1.6 : 1,
        ),
      ),
      child: Row(
        children: [
          // ── O'rin ─────────────────────────────────────────────────────────
          SizedBox(
            width: 34,
            child: medal != null
                ? Text(medal, style: const TextStyle(fontSize: 20))
                : Text(
                    '${entry.rank}',
                    textAlign: TextAlign.center,
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w800,
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
          ),
          const SizedBox(width: 10),

          // ── Avatar ────────────────────────────────────────────────────────
          Container(
            height: 38,
            width: 38,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: theme.colorScheme.surfaceContainerHighest,
              border: Border.all(
                color: medalColor ?? theme.colorScheme.outline,
                width: 1.5,
              ),
            ),
            alignment: Alignment.center,
            child: Text(
              entry.name.isEmpty ? 'Z' : entry.name[0].toUpperCase(),
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w800,
                color: medalColor ?? theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ),
          const SizedBox(width: 12),

          // ── Ism ───────────────────────────────────────────────────────────
          Expanded(
            child: Row(
              children: [
                Flexible(
                  child: Text(
                    entry.name,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: isMe ? FontWeight.w900 : FontWeight.w700,
                    ),
                  ),
                ),
                if (isMe) ...[
                  const SizedBox(width: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 7, vertical: 2),
                    decoration: BoxDecoration(
                      color: AppColors.gold,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: const Text(
                      'SIZ',
                      style: TextStyle(
                        fontSize: 9,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFF1A0A00),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),

          // ── Ball ──────────────────────────────────────────────────────────
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '${entry.score}',
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w900,
                  color: medalColor ?? AppColors.gold,
                ),
              ),
              Text(
                unit,
                style: theme.textTheme.bodySmall?.copyWith(
                  fontSize: 10,
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
