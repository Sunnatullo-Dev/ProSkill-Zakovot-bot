import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../../../core/theme/app_colors.dart';
import '../../domain/entities/answer_outcome.dart';

/// Javob natijasi paneli — savol ostida chiqadi.
class AnswerFeedback extends StatelessWidget {
  const AnswerFeedback({
    super.key,
    this.outcome,
    this.revealed,
    required this.onNext,
    required this.isLastQuestion,
  });

  final AnswerOutcome? outcome;
  final RevealedAnswer? revealed;
  final VoidCallback onNext;
  final bool isLastQuestion;

  ({Color color, IconData icon, String title}) get _visual {
    if (revealed != null) {
      return (
        color: AppColors.info,
        icon: Icons.lightbulb_outline_rounded,
        title: 'To\'g\'ri javob',
      );
    }
    final o = outcome;
    if (o == null) {
      return (
        color: AppColors.warning,
        icon: Icons.info_outline_rounded,
        title: 'Savol yopildi',
      );
    }
    if (o.wasTimeout) {
      return (
        color: AppColors.warning,
        icon: Icons.timer_off_outlined,
        title: 'Vaqt tugadi',
      );
    }
    return switch (o.status) {
      AnswerStatus.correct => (
          color: AppColors.success,
          icon: Icons.check_circle_rounded,
          title: 'To\'g\'ri!',
        ),
      AnswerStatus.partial => (
          color: AppColors.warning,
          icon: Icons.adjust_rounded,
          title: 'Qisman to\'g\'ri',
        ),
      AnswerStatus.incorrect => (
          color: AppColors.error,
          icon: Icons.cancel_rounded,
          title: 'Noto\'g\'ri',
        ),
    };
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final v = _visual;

    final correctAnswer = revealed?.correctAnswer ?? outcome?.correctAnswer;
    final explanation = revealed?.explanation ?? outcome?.explanation;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: v.color.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: v.color.withValues(alpha: 0.4)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(v.icon, color: v.color, size: 22),
              const SizedBox(width: 9),
              Text(
                v.title,
                style: theme.textTheme.titleMedium?.copyWith(
                  color: v.color,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const Spacer(),
              if (outcome != null) _PointsBadge(outcome: outcome!),
            ],
          ),

          if (correctAnswer != null && correctAnswer.isNotEmpty) ...[
            const SizedBox(height: 12),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Javob: ',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
                Expanded(
                  child: Text(
                    correctAnswer,
                    style: theme.textTheme.bodyMedium
                        ?.copyWith(fontWeight: FontWeight.w800),
                  ),
                ),
              ],
            ),
          ],

          if (explanation != null && explanation.trim().isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              explanation.trim(),
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
                height: 1.45,
              ),
            ),
          ],

          if (outcome != null && outcome!.streak >= 3) ...[
            const SizedBox(height: 10),
            Row(
              children: [
                const Text('🔥', style: TextStyle(fontSize: 14)),
                const SizedBox(width: 6),
                Text(
                  '${outcome!.streak} ta ketma-ket · streak bonusi',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: AppColors.warning,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ],

          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              onPressed: onNext,
              style: OutlinedButton.styleFrom(
                minimumSize: const Size.fromHeight(46),
                side: BorderSide(color: v.color.withValues(alpha: 0.5)),
                foregroundColor: v.color,
              ),
              child: Text(isLastQuestion ? 'Natijani ko\'rish' : 'Keyingi savol'),
            ),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 250.ms).moveY(begin: 16, end: 0);
  }
}

class _PointsBadge extends StatelessWidget {
  const _PointsBadge({required this.outcome});

  final AnswerOutcome outcome;

  @override
  Widget build(BuildContext context) {
    final delta = outcome.totalDelta;
    final isPositive = delta > 0;
    final color = isPositive
        ? AppColors.success
        : (delta < 0 ? AppColors.error : AppColors.darkMuted);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.16),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        delta == 0 ? '0 ball' : '${isPositive ? '+' : ''}$delta ball',
        style: TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.w800,
          color: color,
        ),
      ),
    );
  }
}
