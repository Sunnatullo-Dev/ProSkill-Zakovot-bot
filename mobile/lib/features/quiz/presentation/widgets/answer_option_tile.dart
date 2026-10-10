import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';

/// Variant holati — natija kelgandan keyin ranglanadi.
enum OptionVisual { idle, selected, correct, wrong, dimmed }

/// A/B/C/D variant tugmasi.
class AnswerOptionTile extends StatelessWidget {
  const AnswerOptionTile({
    super.key,
    required this.letter,
    required this.text,
    required this.visual,
    this.onTap,
  });

  final String letter;
  final String text;
  final OptionVisual visual;
  final VoidCallback? onTap;

  Color _accent(ThemeData theme) => switch (visual) {
        OptionVisual.correct => AppColors.success,
        OptionVisual.wrong => AppColors.error,
        OptionVisual.selected => AppColors.gold,
        _ => theme.colorScheme.outline,
      };

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final accent = _accent(theme);
    final isHighlighted = visual == OptionVisual.correct ||
        visual == OptionVisual.wrong ||
        visual == OptionVisual.selected;

    return AnimatedOpacity(
      duration: const Duration(milliseconds: 220),
      opacity: visual == OptionVisual.dimmed ? 0.45 : 1,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 220),
        margin: const EdgeInsets.only(bottom: 10),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          color: isHighlighted
              ? accent.withValues(alpha: 0.12)
              : theme.colorScheme.surface,
          border: Border.all(
            color: isHighlighted ? accent : theme.colorScheme.outline,
            width: isHighlighted ? 1.8 : 1,
          ),
        ),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(16),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 15),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 220),
                    height: 32,
                    width: 32,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: isHighlighted
                          ? accent
                          : theme.colorScheme.surfaceContainerHighest,
                    ),
                    alignment: Alignment.center,
                    child: switch (visual) {
                      OptionVisual.correct => const Icon(
                          Icons.check_rounded,
                          size: 19,
                          color: Colors.white,
                        ),
                      OptionVisual.wrong => const Icon(
                          Icons.close_rounded,
                          size: 19,
                          color: Colors.white,
                        ),
                      _ => Text(
                          letter,
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w800,
                            color: visual == OptionVisual.selected
                                ? const Color(0xFF1A0A00)
                                : theme.colorScheme.onSurfaceVariant,
                          ),
                        ),
                    },
                  ),
                  const SizedBox(width: 13),
                  Expanded(
                    child: Text(
                      text,
                      style: theme.textTheme.bodyLarge?.copyWith(
                        fontWeight:
                            isHighlighted ? FontWeight.w700 : FontWeight.w500,
                        height: 1.35,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
