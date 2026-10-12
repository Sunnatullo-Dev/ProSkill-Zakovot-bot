import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../../core/di/injector.dart';
import '../../../../core/router/app_routes.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/app_widgets.dart';
import '../../../auth/domain/entities/app_user.dart';
import '../../../auth/presentation/bloc/auth_bloc.dart';
import '../../domain/entities/achievement.dart';
import '../cubit/profile_cubit.dart';
import '../widgets/achievement_card.dart';
import '../widgets/language_selector.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => ProfileCubit(
        profileRepository: sl(),
        authRepository: sl(),
      )..load(),
      child: const _ProfileView(),
    );
  }
}

class _ProfileView extends StatelessWidget {
  const _ProfileView();

  @override
  Widget build(BuildContext context) {
    return BlocListener<ProfileCubit, ProfileState>(
      listenWhen: (p, c) =>
          p.languageSaved != c.languageSaved ||
          (c.errorMessage != null && p.errorMessage != c.errorMessage),
      listener: (context, state) {
        if (state.languageSaved) {
          context.showSnack('Til saqlandi');
          context.read<ProfileCubit>().acknowledgeLanguageSaved();
        } else if (state.errorMessage != null) {
          context.showSnack(state.errorMessage!, isError: true);
        }
      },
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Profil'),
          automaticallyImplyLeading: false,
        ),
        body: SafeArea(
          top: false,
          child: BlocBuilder<AuthBloc, AuthState>(
            builder: (context, authState) {
              final user = authState.user;
              if (user == null) {
                return const Center(child: AdaptiveLoader());
              }

              return BlocBuilder<ProfileCubit, ProfileState>(
                builder: (context, state) {
                  return RefreshIndicator(
                    color: AppColors.gold,
                    onRefresh: () => context.read<ProfileCubit>().refresh(),
                    child: ListView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
                      children: [
                        _ProfileHeader(user: user),
                        const SizedBox(height: 18),

                        if (user.isPremium) ...[
                          _PremiumBadge(user: user),
                          const SizedBox(height: 18),
                        ],

                        _StatsGrid(state: state, user: user),
                        const SizedBox(height: 26),

                        _SectionLabel('Yutuqlar'),
                        const SizedBox(height: 10),
                        for (final achievement in Achievement.all)
                          AchievementCard(
                            achievement: achievement,
                            isUnlocked: user.unlockedAchievements
                                .contains(achievement.id),
                            stats: state.stats,
                            totalScore: user.score,
                          ),

                        const SizedBox(height: 26),
                        _SectionLabel('Sozlamalar'),
                        const SizedBox(height: 10),
                        LanguageSelector(
                          current: AppLanguage.fromCode(
                            state.pendingLanguage ?? user.language,
                          ),
                          isSaving: state.isSavingLanguage,
                          onChanged: (lang) {
                            HapticFeedback.selectionClick();
                            context
                                .read<ProfileCubit>()
                                .changeLanguage(lang.code);
                          },
                        ),

                        const SizedBox(height: 26),
                        _SectionLabel('Boshqaruv va Sozlamalar'),
                        const SizedBox(height: 10),
                        _ProfileNavTile(
                          icon: Icons.history_rounded,
                          title: "O'yin tarixi",
                          subtitle: "Oxirgi o'yin natijalari va statistikasi",
                          onTap: () => context.push(AppRoutes.gameHistory),
                        ),
                        _ProfileNavTile(
                          icon: Icons.military_tech_rounded,
                          title: "Yutuqlar (Achievements)",
                          subtitle: "Ochilgan yutuqlar va mukofotlar",
                          onTap: () => context.push(AppRoutes.achievements),
                        ),
                        _ProfileNavTile(
                          icon: Icons.settings_rounded,
                          title: "Sozlamalar va Xavfsizlik",
                          subtitle: "Parol, ovoz, vibratsiya va parametrlar",
                          onTap: () => context.push(AppRoutes.settings),
                        ),
                        _ProfileNavTile(
                          icon: Icons.workspace_premium_rounded,
                          title: "Zakovat Premium",
                          subtitle: "Tariflar, imtiyozlar va xarid tarixi",
                          onTap: () => context.push(AppRoutes.premium),
                        ),
                        _ProfileNavTile(
                          icon: Icons.admin_panel_settings_rounded,
                          title: "Administrator Paneli",
                          subtitle: "Savollar, foydalanuvchilar va tizim",
                          onTap: () => context.push(AppRoutes.admin),
                        ),

                        const SizedBox(height: 26),
                        _AccountInfo(user: user),

                        const SizedBox(height: 24),
                        OutlinedButton.icon(
                          onPressed: () async {
                            final confirmed = await showAdaptiveConfirm(
                              context,
                              title: 'Chiqish',
                              message: 'Hisobingizdan chiqmoqchimisiz?',
                              confirmLabel: 'Chiqish',
                              isDestructive: true,
                            );
                            if (confirmed && context.mounted) {
                              context
                                  .read<AuthBloc>()
                                  .add(const AuthLogoutRequested());
                            }
                          },
                          icon: const Icon(Icons.logout_rounded, size: 19),
                          label: const Text('Chiqish'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: AppColors.error,
                            side: BorderSide(
                              color: AppColors.error.withValues(alpha: 0.4),
                            ),
                          ),
                        ),
                      ],
                    ),
                  );
                },
              );
            },
          ),
        ),
      ),
    );
  }
}

// ═══ Sarlavha ═══════════════════════════════════════════════════════════════

class _ProfileHeader extends StatelessWidget {
  const _ProfileHeader({required this.user});

  final AppUser user;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      children: [
        Container(
          height: 84,
          width: 84,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: AppColors.goldGradient,
            boxShadow: [
              BoxShadow(
                color: AppColors.gold.withValues(alpha: 0.35),
                blurRadius: 20,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          alignment: Alignment.center,
          child: Text(
            user.initial,
            style: const TextStyle(
              fontSize: 34,
              fontWeight: FontWeight.w900,
              color: Color(0xFF1A0A00),
            ),
          ),
        ).animate().scale(duration: 400.ms, curve: Curves.easeOutBack),
        const SizedBox(height: 14),
        Text(
          user.visibleName,
          style: theme.textTheme.headlineSmall
              ?.copyWith(fontWeight: FontWeight.w900),
        ),
        if (user.phone != null) ...[
          const SizedBox(height: 4),
          Text(
            user.phone!,
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ],
    );
  }
}

// ═══ Premium nishoni ════════════════════════════════════════════════════════

class _PremiumBadge extends StatelessWidget {
  const _PremiumBadge({required this.user});

  final AppUser user;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final until = user.premiumUntil;
    final formatted = until == null
        ? null
        : DateFormat('dd.MM.yyyy').format(until.toLocal());
    final daysLeft = until?.difference(DateTime.now()).inDays;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            AppColors.gold.withValues(alpha: 0.25),
            AppColors.goldDark.withValues(alpha: 0.08),
          ],
        ),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.gold.withValues(alpha: 0.55)),
      ),
      child: Row(
        children: [
          const Text('⭐', style: TextStyle(fontSize: 30)),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      'PREMIUM',
                      style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w900,
                        letterSpacing: 1.6,
                        color: AppColors.gold,
                      ),
                    ),
                    if (daysLeft != null && daysLeft <= 7) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 7, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppColors.warning.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          '$daysLeft kun',
                          style: const TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w800,
                            color: AppColors.warning,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 3),
                Text(
                  formatted != null
                      ? '$formatted gacha amal qiladi'
                      : 'Cheksiz o\'yin va barcha bo\'limlar',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 400.ms).shimmer(
          delay: 300.ms,
          duration: 1600.ms,
          color: AppColors.goldLight.withValues(alpha: 0.3),
        );
  }
}

// ═══ Statistika ═════════════════════════════════════════════════════════════

class _StatsGrid extends StatelessWidget {
  const _StatsGrid({required this.state, required this.user});

  final ProfileState state;
  final AppUser user;

  @override
  Widget build(BuildContext context) {
    final stats = state.stats;

    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: _StatBox(
                emoji: '🏆',
                value: '${user.score}',
                label: 'Umumiy ball',
                color: AppColors.gold,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _StatBox(
                emoji: '🔥',
                value: '${user.currentStreak}',
                label: 'Ketma-ketlik',
                color: AppColors.warning,
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: _StatBox(
                emoji: '🎮',
                value: '${stats.gamesPlayed}',
                label: 'O\'yinlar',
                color: AppColors.purple,
                isLoading: state.isLoading,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _StatBox(
                emoji: '🎯',
                value: '${stats.accuracy}%',
                label: 'Aniqlik',
                color: AppColors.info,
                isLoading: state.isLoading,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _StatBox(
                emoji: '⚡',
                value: '${stats.bestRoundScore}',
                label: 'Rekord',
                color: AppColors.success,
                isLoading: state.isLoading,
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _StatBox extends StatelessWidget {
  const _StatBox({
    required this.emoji,
    required this.value,
    required this.label,
    required this.color,
    this.isLoading = false,
  });

  final String emoji;
  final String value;
  final String label;
  final Color color;
  final bool isLoading;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.25)),
      ),
      child: Column(
        children: [
          Text(emoji, style: const TextStyle(fontSize: 17)),
          const SizedBox(height: 6),
          if (isLoading)
            SizedBox(
              height: 24,
              child: Center(
                child: SizedBox(
                  height: 14,
                  width: 14,
                  child: CircularProgressIndicator(strokeWidth: 2, color: color),
                ),
              ),
            )
          else
            FittedBox(
              child: Text(
                value,
                style: theme.textTheme.titleLarge
                    ?.copyWith(fontWeight: FontWeight.w900, color: color),
              ),
            ),
          const SizedBox(height: 2),
          Text(
            label,
            textAlign: TextAlign.center,
            style: theme.textTheme.bodySmall?.copyWith(
              fontSize: 10.5,
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }
}

// ═══ Akkaunt ma'lumoti ══════════════════════════════════════════════════════

class _AccountInfo extends StatelessWidget {
  const _AccountInfo({required this.user});

  final AppUser user;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: theme.colorScheme.outline),
      ),
      child: Column(
        children: [
          _InfoRow(
            label: 'Hisob turi',
            value: switch (user.authProvider) {
              'phone' => 'Telefon + parol',
              'both' => 'Telefon + Telegram',
              _ => 'Telegram',
            },
          ),
          if (user.createdAt != null)
            _InfoRow(
              label: 'Ro\'yxatdan o\'tgan',
              value: DateFormat('dd.MM.yyyy').format(user.createdAt!.toLocal()),
            ),
          _InfoRow(label: 'ID', value: '${user.telegramId}'),
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Text(
            label,
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
          const Spacer(),
          Flexible(
            child: Text(
              value,
              overflow: TextOverflow.ellipsis,
              style: theme.textTheme.bodyMedium
                  ?.copyWith(fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
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
            letterSpacing: 1.8,
            fontWeight: FontWeight.w700,
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
    );
  }
}

class _ProfileNavTile extends StatelessWidget {
  const _ProfileNavTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(
          color: theme.colorScheme.outlineVariant.withValues(alpha: 0.3),
        ),
      ),
      child: ListTile(
        onTap: () {
          HapticFeedback.selectionClick();
          onTap();
        },
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: AppColors.gold.withValues(alpha: 0.15),
            shape: BoxShape.circle,
          ),
          child: Icon(icon, color: AppColors.gold, size: 20),
        ),
        title: Text(
          title,
          style: theme.textTheme.bodyMedium?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        subtitle: Text(
          subtitle,
          style: theme.textTheme.bodySmall?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
        trailing: Icon(
          Icons.chevron_right_rounded,
          color: theme.colorScheme.onSurfaceVariant,
        ),
      ),
    );
  }
}

