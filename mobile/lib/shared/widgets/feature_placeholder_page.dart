import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_colors.dart';

/// Hali qurilmagan modul uchun vaqtinchalik ekran.
///
/// NEGA KERAK: router BUGUN to'liq bo'lishi kerak — barcha yo'llar,
/// deep-link va tab tuzilmasi hozirdanoq ishlasin. Har bir modul
/// tayyor bo'lganda `app_router.dart` da faqat `builder` almashtiriladi,
/// navigatsiya tuzilmasiga tegilmaydi.
class FeaturePlaceholderPage extends StatelessWidget {
  const FeaturePlaceholderPage({
    super.key,
    required this.title,
    required this.emoji,
    required this.description,
    this.stage,
    this.showAppBar = true,
  });

  final String title;
  final String emoji;
  final String description;

  /// Qaysi bosqichda tayyor bo'ladi (masalan "Bosqich 2").
  final String? stage;

  final bool showAppBar;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    final body = Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              height: 108,
              width: 108,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    AppColors.gold.withValues(alpha: 0.22),
                    AppColors.gold.withValues(alpha: 0.02),
                  ],
                ),
              ),
              alignment: Alignment.center,
              child: Text(emoji, style: const TextStyle(fontSize: 50)),
            ),
            const SizedBox(height: 26),
            Text(
              title,
              textAlign: TextAlign.center,
              style: theme.textTheme.headlineSmall
                  ?.copyWith(fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 10),
            Text(
              description,
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
                height: 1.5,
              ),
            ),
            if (stage != null) ...[
              const SizedBox(height: 22),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                decoration: BoxDecoration(
                  color: theme.colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: theme.colorScheme.outline),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.construction_rounded, size: 15),
                    const SizedBox(width: 7),
                    Text(
                      stage!,
                      style: theme.textTheme.labelMedium
                          ?.copyWith(fontWeight: FontWeight.w700),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );

    if (!showAppBar) return body;

    return Scaffold(
      appBar: AppBar(
        leading: context.canPop()
            ? IconButton(
                icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
                onPressed: () => context.pop(),
              )
            : null,
        title: Text(title),
      ),
      body: body,
    );
  }
}
