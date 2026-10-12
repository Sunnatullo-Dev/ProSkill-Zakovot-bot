import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:share_plus/share_plus.dart';

import '../../../../core/config/app_config.dart';
import '../../../../core/router/app_routes.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/app_widgets.dart';
import '../../domain/entities/answer_outcome.dart';
import '../../domain/entities/round_summary.dart';

/// Raund yakuni.
class QuizResultPage extends StatelessWidget {
  const QuizResultPage({super.key, required this.summary});

  final RoundSummary summary;

  ({String emoji, String title, Color color}) get _verdict {
    final accuracy = summary.accuracyPercent;
    if (accuracy >= 80) {
      return (emoji: '🏆', title: 'Ajoyib natija!', color: AppColors.gold);
    }
    if (accuracy >= 50) {
      return (emoji: '👏', title: 'Yaxshi ish!', color: AppColors.success);
    }
    if (accuracy >= 30) {
      return (emoji: '💪', title: 'Yaxshi urinish', color: AppColors.warning);
    }
    return (emoji: '📚', title: 'Mashq qilishda davom eting', color: AppColors.info);
  }

  Future<void> _share() async {
    final text = '🧠 Zakovat o\'yinida ${summary.roundScore} ball to\'pladim — '
        '${summary.correctCount}/${summary.totalCount} to\'g\'ri javob! '
        'Sen ham sinab ko\'r:\n'
        'https://t.me/${AppConfig.botUsername}';
    await SharePlus.instance.share(ShareParams(text: text));
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final v = _verdict;

    return PopScope(
      // Orqaga qaytish o'yin ekraniga emas, bosh sahifaga olib borishi kerak.
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) context.go(AppRoutes.home);
      },
      child: Scaffold(
        body: SafeArea(
          child: Column(
            children: [
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(20, 24, 20, 16),
                  children: [
                    // ── Sarlavha ────────────────────────────────────────────
                    Center(
                      child: Column(
                        children: [
                          Text(v.emoji, style: const TextStyle(fontSize: 64))
                              .animate()
                              .scale(
                                duration: 500.ms,
                                curve: Curves.elasticOut,
                                begin: const Offset(0.4, 0.4),
                              ),
                          const SizedBox(height: 12),
                          Text(
                            v.title,
                            style: theme.textTheme.headlineSmall?.copyWith(
                              fontWeight: FontWeight.w900,
                              color: v.color,
                            ),
                          ).animate().fadeIn(delay: 200.ms),
                        ],
                      ),
                    ),
                    const SizedBox(height: 28),

                    // ── Asosiy ko'rsatkichlar ───────────────────────────────
                    Row(
                      children: [
                        Expanded(
                          child: _StatCard(
                            value: '${summary.roundScore}',
                            label: 'Ball',
                            color: AppColors.gold,
                            emoji: '🏆',
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _StatCard(
                            value:
                                '${summary.correctCount}/${summary.totalCount}',
                            label: 'To\'g\'ri',
                            color: AppColors.success,
                            emoji: '✅',
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _StatCard(
                            value: '${summary.accuracyPercent}%',
                            label: 'Aniqlik',
                            color: AppColors.info,
                            emoji: '🎯',
                          ),
                        ),
                      ],
                    ).animate().fadeIn(delay: 300.ms).moveY(begin: 16, end: 0),

                    // ── Qo'shimcha satrlar ──────────────────────────────────
                    const SizedBox(height: 14),
                    if (summary.bestStreak >= 3)
                      _InfoRow(
                        emoji: '🔥',
                        label: 'Eng uzun ketma-ketlik',
                        value: '${summary.bestStreak} ta',
                        color: AppColors.warning,
                      ),
                    if (summary.betNet != 0)
                      _InfoRow(
                        emoji: '🎲',
                        label: 'Garovlardan',
                        value:
                            '${summary.betNet > 0 ? '+' : ''}${summary.betNet} ball',
                        color: summary.betNet > 0
                            ? AppColors.success
                            : AppColors.error,
                      ),
                    if (summary.achievementBonus > 0)
                      _InfoRow(
                        emoji: '🎖',
                        label: 'Yutuq bonusi',
                        value: '+${summary.achievementBonus} ball',
                        color: AppColors.gold,
                      ),

                    // ── Yangi yutuqlar ──────────────────────────────────────
                    if (summary.newlyUnlocked.isNotEmpty) ...[
                      const SizedBox(height: 20),
                      _SectionTitle('Yangi yutuqlar'),
                      const SizedBox(height: 10),
                      for (final a in summary.newlyUnlocked)
                        _AchievementTile(achievement: a)
                            .animate()
                            .fadeIn(delay: 400.ms)
                            .shimmer(duration: 1200.ms, color: AppColors.gold),
                    ],

                    // ── Savollar bo'yicha tafsilot ──────────────────────────
                    const SizedBox(height: 22),
                    _SectionTitle('Savollar'),
                    const SizedBox(height: 8),
                    for (var i = 0; i < summary.entries.length; i++)
                      _EntryTile(index: i + 1, entry: summary.entries[i]),
                  ],
                ),
              ),

              // ── Amallar ────────────────────────────────────────────────────
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
                child: Column(
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () {
                              HapticFeedback.lightImpact();
                              _share();
                            },
                            icon: const Icon(Icons.share_outlined, size: 19),
                            label: const Text('Ulashish'),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: LoadingButton(
                            label: 'Yana o\'ynash',
                            onPressed: () =>
                                context.pushReplacement(AppRoutes.quiz),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    TextButton(
                      onPressed: () => context.go(AppRoutes.home),
                      child: const Text('Bosh sahifaga'),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ═══ Yordamchi vidjetlar ════════════════════════════════════════════════════

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.value,
    required this.label,
    required this.color,
    required this.emoji,
  });

  final String value;
  final String label;
  final Color color;
  final String emoji;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.28)),
      ),
      child: Column(
        children: [
          Text(emoji, style: const TextStyle(fontSize: 18)),
          const SizedBox(height: 6),
          FittedBox(
            child: Text(
              value,
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w900,
                color: color,
              ),
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: theme.textTheme.bodySmall?.copyWith(
              fontSize: 11,
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({
    required this.emoji,
    required this.label,
    required this.value,
    required this.color,
  });

  final String emoji;
  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        children: [
          Text(emoji, style: const TextStyle(fontSize: 14)),
          const SizedBox(width: 9),
          Text(
            label,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
          const Spacer(),
          Text(
            value,
            style: theme.textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.w800,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.text);
  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text.toUpperCase(),
      style: Theme.of(context).textTheme.labelSmall?.copyWith(
            fontSize: 10,
            letterSpacing: 1.8,
            fontWeight: FontWeight.w700,
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
    );
  }
}

class _AchievementTile extends StatelessWidget {
  const _AchievementTile({required this.achievement});

  final UnlockedAchievement achievement;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(13),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppColors.gold.withValues(alpha: 0.18),
            AppColors.gold.withValues(alpha: 0.04),
          ],
        ),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.gold.withValues(alpha: 0.4)),
      ),
      child: Row(
        children: [
          const Text('🎖', style: TextStyle(fontSize: 22)),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              achievement.label,
              style: theme.textTheme.titleSmall
                  ?.copyWith(fontWeight: FontWeight.w800),
            ),
          ),
          Text(
            '+${achievement.bonus}',
            style: const TextStyle(
              fontWeight: FontWeight.w900,
              color: AppColors.gold,
              fontSize: 15,
            ),
          ),
        ],
      ),
    );
  }
}

class _EntryTile extends StatelessWidget {
  const _EntryTile({required this.index, required this.entry});

  final int index;
  final RoundEntry entry;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    final (icon, color) = switch (entry) {
      _ when entry.skipped => (Icons.remove_circle_outline, AppColors.darkMuted),
      _ when entry.outcome?.wasTimeout ?? false => (
          Icons.timer_off_outlined,
          AppColors.warning
        ),
      _ when entry.isCorrect => (Icons.check_circle_rounded, AppColors.success),
      _ => (Icons.cancel_rounded, AppColors.error),
    };

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 22,
            child: Text(
              '$index.',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          Icon(icon, size: 17, color: color),
          const SizedBox(width: 9),
          Expanded(
            child: Text(
              entry.questionText,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: theme.textTheme.bodySmall?.copyWith(height: 1.35),
            ),
          ),
          const SizedBox(width: 8),
          Text(
            entry.points > 0 ? '+${entry.points}' : '—',
            style: theme.textTheme.bodySmall?.copyWith(
              fontWeight: FontWeight.w800,
              color: entry.points > 0
                  ? AppColors.success
                  : theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }
}
