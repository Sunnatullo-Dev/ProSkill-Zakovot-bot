import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/app_routes.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/zakovat_logo.dart';
import '../../../auth/presentation/bloc/auth_bloc.dart';

/// Bosh sahifa — o'yin rejimlariga kirish nuqtasi.
///
/// Web ilovadagi `HomeScreen.tsx` tuzilmasini takrorlaydi:
/// header (avatar + ball) → logotip → qiyinlik tanlash → qo'shimcha rejimlar.
class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return BlocBuilder<AuthBloc, AuthState>(
      builder: (context, state) {
        final user = state.user;

        return Scaffold(
          body: Stack(
            children: [
              const Positioned(
                top: 0,
                left: 0,
                right: 0,
                height: 300,
                child: DecoratedBox(
                  decoration: BoxDecoration(gradient: AppColors.heroGlow),
                ),
              ),
              SafeArea(
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 110),
                  children: [
                    _Header(
                      initial: user?.initial ?? 'Z',
                      name: user?.visibleName ?? 'Foydalanuvchi',
                      score: user?.score ?? 0,
                      isPremium: user?.isPremium ?? false,
                    ),
                    const SizedBox(height: 24),
                    const Center(child: ZakovatLogo(size: 76)),
                    const SizedBox(height: 14),
                    const Center(child: ZakovatWordmark(fontSize: 25)),
                    const SizedBox(height: 8),
                    Center(
                      child: Text(
                        'Bilimingizni sinab ko\'ring',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                          fontStyle: FontStyle.italic,
                        ),
                      ),
                    ),
                    const SizedBox(height: 28),

                    _SectionLabel('Qiyinlik darajasi'),
                    const SizedBox(height: 10),
                    const _DifficultyGrid(),

                    const SizedBox(height: 26),
                    _SectionLabel('Qo\'shimcha rejimlar'),
                    const SizedBox(height: 4),
                    const Divider(),

                    _ModeTile(
                      emoji: '📅',
                      title: 'Kunlik topshiriq',
                      subtitle: 'Har kuni 5 ta savol va streak bonusi',
                      gradient: const [Color(0xFF2563EB), Color(0xFF1D4ED8)],
                      onTap: () => context.push(AppRoutes.daily),
                    ),
                    _ModeTile(
                      emoji: '🎮',
                      title: 'Online O\'yin Xonasi',
                      subtitle: 'Do\'stlar bilan real-vaqt o\'yini',
                      gradient: const [Color(0xFF7C3AED), Color(0xFF6D28D9)],
                      onTap: () => context.push(AppRoutes.gameRoomJoin),
                    ),
                    _ModeTile(
                      emoji: '👁',
                      title: 'Zakovat Stoli',
                      subtitle: 'Jonli guruh o\'yinini kuzating',
                      gradient: const [Color(0xFFDC2626), Color(0xFFB91C1C)],
                      onTap: () => context.push(AppRoutes.zakovatTable),
                    ),
                    _ModeTile(
                      emoji: '⭐',
                      title: 'Zakovat Premium',
                      subtitle: 'Cheksiz o\'yin, barcha bo\'limlar',
                      gradient: const [Color(0xFFD97706), Color(0xFFB45309)],
                      badge: 'PRO',
                      onTap: () => context.push(AppRoutes.premium),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({
    required this.initial,
    required this.name,
    required this.score,
    required this.isPremium,
  });

  final String initial;
  final String name;
  final int score;
  final bool isPremium;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Row(
      children: [
        Container(
          height: 46,
          width: 46,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(color: AppColors.gold, width: 2),
            color: theme.colorScheme.surfaceContainerHighest,
          ),
          alignment: Alignment.center,
          child: Text(
            initial,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w900,
              color: AppColors.gold,
            ),
          ),
        ),
        const SizedBox(width: 11),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Flexible(
                    child: Text(
                      name,
                      style: theme.textTheme.titleSmall
                          ?.copyWith(fontWeight: FontWeight.w700),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  if (isPremium) ...[
                    const SizedBox(width: 5),
                    const Text('⭐', style: TextStyle(fontSize: 13)),
                  ],
                ],
              ),
              Text(
                'Zakovat o\'yinchisi',
                style: theme.textTheme.bodySmall?.copyWith(
                  fontSize: 11,
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 6),
          decoration: BoxDecoration(
            color: AppColors.gold.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: AppColors.gold.withValues(alpha: 0.3)),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('🏆', style: TextStyle(fontSize: 13)),
              const SizedBox(width: 6),
              Text(
                '$score',
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w800,
                  color: AppColors.gold,
                ),
              ),
              const SizedBox(width: 4),
              Text(
                'ball',
                style: theme.textTheme.bodySmall?.copyWith(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.text);
  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text.toUpperCase(),
      style: Theme.of(context).textTheme.labelSmall?.copyWith(
            fontSize: 10,
            fontWeight: FontWeight.w700,
            letterSpacing: 2,
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
    );
  }
}

/// Qiyinlik tanlash — bosilganda yakka o'yin boshlanadi.
class _DifficultyGrid extends StatelessWidget {
  const _DifficultyGrid();

  static const _options = [
    (value: 'easy', emoji: '🟢', label: 'Oson', desc: 'Boshlang\'ich'),
    (value: 'medium', emoji: '🟡', label: 'O\'rtacha', desc: 'O\'rtacha'),
    (value: 'hard', emoji: '🔴', label: 'Qiyin', desc: 'Murakkab'),
    (value: null, emoji: '🎲', label: 'Aralash', desc: 'Barchasi'),
  ];

  @override
  Widget build(BuildContext context) {
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 10,
      crossAxisSpacing: 10,
      childAspectRatio: 1.55,
      children: [
        for (final opt in _options)
          _DifficultyCard(
            emoji: opt.emoji,
            label: opt.label,
            description: opt.desc,
            color: AppColors.forDifficulty(opt.value),
            onTap: () => context.push(
              opt.value == null
                  ? AppRoutes.quiz
                  : '${AppRoutes.quiz}?difficulty=${opt.value}',
            ),
          ),
      ],
    );
  }
}

class _DifficultyCard extends StatelessWidget {
  const _DifficultyCard({
    required this.emoji,
    required this.label,
    required this.description,
    required this.color,
    required this.onTap,
  });

  final String emoji;
  final String label;
  final String description;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Material(
      color: theme.colorScheme.surface,
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: color.withValues(alpha: 0.25)),
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [color.withValues(alpha: 0.10), Colors.transparent],
            ),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(emoji, style: const TextStyle(fontSize: 26)),
              const SizedBox(height: 6),
              Text(
                label,
                style: theme.textTheme.titleSmall
                    ?.copyWith(fontWeight: FontWeight.w800),
              ),
              Text(
                description,
                style: theme.textTheme.bodySmall?.copyWith(
                  fontSize: 10,
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

class _ModeTile extends StatelessWidget {
  const _ModeTile({
    required this.emoji,
    required this.title,
    required this.subtitle,
    required this.gradient,
    required this.onTap,
    this.badge,
  });

  final String emoji;
  final String title;
  final String subtitle;
  final List<Color> gradient;
  final VoidCallback onTap;
  final String? badge;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 11, horizontal: 4),
        child: Row(
          children: [
            Container(
              height: 46,
              width: 46,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(14),
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: gradient,
                ),
                boxShadow: [
                  BoxShadow(
                    color: gradient.first.withValues(alpha: 0.35),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              alignment: Alignment.center,
              child: Text(emoji, style: const TextStyle(fontSize: 21)),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: theme.textTheme.titleSmall
                        ?.copyWith(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: theme.textTheme.bodySmall?.copyWith(
                      fontSize: 12,
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
            if (badge != null)
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
                decoration: BoxDecoration(
                  gradient: AppColors.goldGradient,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  badge!,
                  style: const TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF1A0A00),
                  ),
                ),
              )
            else
              Icon(
                Icons.chevron_right_rounded,
                color: theme.colorScheme.onSurfaceVariant,
              ),
          ],
        ),
      ),
    );
  }
}
