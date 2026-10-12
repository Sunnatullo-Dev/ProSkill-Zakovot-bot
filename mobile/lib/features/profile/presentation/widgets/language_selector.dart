import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../cubit/profile_cubit.dart';

/// Til tanlagich — 3 ta variant, segment ko'rinishida.
///
/// Tanlangach `PATCH /api/users/me/language` chaqiriladi va tanlov
/// qurilmalararo sinxronlanadi.
class LanguageSelector extends StatelessWidget {
  const LanguageSelector({
    super.key,
    required this.current,
    required this.isSaving,
    required this.onChanged,
  });

  final AppLanguage current;
  final bool isSaving;
  final ValueChanged<AppLanguage> onChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: theme.colorScheme.outline),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.language_rounded,
                  size: 18, color: theme.colorScheme.onSurfaceVariant),
              const SizedBox(width: 8),
              Text(
                'Interfeys tili',
                style: theme.textTheme.titleSmall
                    ?.copyWith(fontWeight: FontWeight.w700),
              ),
              const Spacer(),
              if (isSaving)
                const SizedBox(
                  height: 14,
                  width: 14,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: AppColors.gold,
                  ),
                ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              for (final lang in AppLanguage.values) ...[
                Expanded(
                  child: _LanguageChip(
                    language: lang,
                    isSelected: lang == current,
                    isEnabled: !isSaving,
                    onTap: () => onChanged(lang),
                  ),
                ),
                if (lang != AppLanguage.values.last) const SizedBox(width: 8),
              ],
            ],
          ),
        ],
      ),
    );
  }
}

class _LanguageChip extends StatelessWidget {
  const _LanguageChip({
    required this.language,
    required this.isSelected,
    required this.isEnabled,
    required this.onTap,
  });

  final AppLanguage language;
  final bool isSelected;
  final bool isEnabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Opacity(
      opacity: isEnabled ? 1 : 0.55,
      child: GestureDetector(
        onTap: isEnabled ? onTap : null,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(vertical: 11, horizontal: 6),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            color: isSelected
                ? AppColors.gold.withValues(alpha: 0.14)
                : theme.colorScheme.surfaceContainerHighest,
            border: Border.all(
              color: isSelected ? AppColors.gold : theme.colorScheme.outline,
              width: isSelected ? 1.6 : 1,
            ),
          ),
          child: Column(
            children: [
              Text(language.flag, style: const TextStyle(fontSize: 17)),
              const SizedBox(height: 4),
              Text(
                language.label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 11.5,
                  fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                  color: isSelected
                      ? AppColors.gold
                      : theme.colorScheme.onSurface,
                ),
              ),
              if (language.sublabel.isNotEmpty)
                Text(
                  language.sublabel,
                  style: theme.textTheme.bodySmall?.copyWith(
                    fontSize: 9,
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
