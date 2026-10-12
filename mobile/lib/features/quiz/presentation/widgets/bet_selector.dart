import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../core/theme/app_colors.dart';
import '../cubit/quiz_cubit.dart' show QuizRepositoryBets;

/// Garov tanlagich — 0 / 5 / 10 / 20 / 50 ball.
///
/// Qoidalar (backend `answers/views.py` bilan bir xil):
///   * to'g'ri javob → tikilgan ball **qaytadi va ustiga shuncha qo'shiladi**
///   * noto'g'ri javob → tikilgan ball **yo'qoladi**
///   * vaqt tugasa → garov umuman yechilmaydi
///
/// Balansdan katta qiymatlar o'chirilgan holatda ko'rsatiladi.
class BetSelector extends StatelessWidget {
  const BetSelector({
    super.key,
    required this.selected,
    required this.availableScore,
    required this.enabled,
    required this.onChanged,
  });

  final int selected;
  final int availableScore;
  final bool enabled;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Text('🎲', style: TextStyle(fontSize: 13)),
            const SizedBox(width: 6),
            Text(
              'GAROV',
              style: theme.textTheme.labelSmall?.copyWith(
                fontSize: 10,
                letterSpacing: 1.6,
                fontWeight: FontWeight.w700,
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const Spacer(),
            if (selected > 0)
              Text(
                'Yutuq: +$selected · Yo\'qotish: −$selected',
                style: theme.textTheme.bodySmall?.copyWith(
                  fontSize: 10.5,
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
          ],
        ),
        const SizedBox(height: 8),
        SizedBox(
          height: 38,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: QuizRepositoryBets.options.length,
            separatorBuilder: (_, _) => const SizedBox(width: 8),
            itemBuilder: (context, i) {
              final value = QuizRepositoryBets.options[i];
              final affordable = value <= availableScore;
              final isSelected = value == selected;
              final isEnabled = enabled && affordable;

              return _BetChip(
                label: value == 0 ? 'Yo\'q' : '$value',
                isSelected: isSelected,
                isEnabled: isEnabled,
                onTap: () {
                  HapticFeedback.selectionClick();
                  onChanged(value);
                },
              );
            },
          ),
        ),
      ],
    );
  }
}

class _BetChip extends StatelessWidget {
  const _BetChip({
    required this.label,
    required this.isSelected,
    required this.isEnabled,
    required this.onTap,
  });

  final String label;
  final bool isSelected;
  final bool isEnabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Opacity(
      opacity: isEnabled ? 1 : 0.35,
      child: GestureDetector(
        onTap: isEnabled ? onTap : null,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.symmetric(horizontal: 16),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            gradient: isSelected ? AppColors.goldGradient : null,
            color: isSelected ? null : theme.colorScheme.surfaceContainerHighest,
            border: Border.all(
              color: isSelected ? AppColors.gold : theme.colorScheme.outline,
            ),
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w800,
              color: isSelected
                  ? const Color(0xFF1A0A00)
                  : theme.colorScheme.onSurface,
            ),
          ),
        ),
      ),
    );
  }
}
