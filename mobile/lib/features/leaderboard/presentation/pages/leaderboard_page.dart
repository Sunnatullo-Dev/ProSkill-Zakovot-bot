import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/di/injector.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/app_widgets.dart';
import '../../../auth/presentation/bloc/auth_bloc.dart';
import '../cubit/leaderboard_cubit.dart';
import '../widgets/leaderboard_tile.dart';

/// Reyting ekrani — 3 tab, pull-to-refresh, pastda qotirilgan o'z o'rni.
class LeaderboardScreen extends StatelessWidget {
  const LeaderboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => LeaderboardCubit(sl())..load(),
      child: const _LeaderboardView(),
    );
  }
}

class _LeaderboardView extends StatelessWidget {
  const _LeaderboardView();

  @override
  Widget build(BuildContext context) {
    final myTelegramId =
        context.select<AuthBloc, int>((b) => b.state.user?.telegramId ?? 0);
    final myName =
        context.select<AuthBloc, String>((b) => b.state.user?.visibleName ?? '');

    return Scaffold(
      appBar: AppBar(
        title: const Text('Reyting'),
        automaticallyImplyLeading: false,
      ),
      body: SafeArea(
        top: false,
        child: BlocBuilder<LeaderboardCubit, LeaderboardState>(
          builder: (context, state) {
            return Column(
              children: [
                _TabBar(
                  current: state.tab,
                  onSelect: (tab) {
                    HapticFeedback.selectionClick();
                    context.read<LeaderboardCubit>().selectTab(tab);
                  },
                ),
                Expanded(child: _Body(state: state, myTelegramId: myTelegramId)),

                // ── Pastda qotirilgan o'z o'rnim ────────────────────────────
                if (state.hasData)
                  _MyRankBar(
                    state: state,
                    myTelegramId: myTelegramId,
                    myName: myName,
                  ),
              ],
            );
          },
        ),
      ),
    );
  }
}

// ═══ Tablar ═════════════════════════════════════════════════════════════════

class _TabBar extends StatelessWidget {
  const _TabBar({required this.current, required this.onSelect});

  final LeaderboardTab current;
  final ValueChanged<LeaderboardTab> onSelect;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 4, 16, 12),
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        children: [
          for (final tab in LeaderboardTab.values)
            Expanded(
              child: GestureDetector(
                onTap: () => onSelect(tab),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 220),
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  decoration: BoxDecoration(
                    color: current == tab
                        ? theme.colorScheme.surface
                        : Colors.transparent,
                    borderRadius: BorderRadius.circular(11),
                    border: current == tab
                        ? Border.all(
                            color: AppColors.gold.withValues(alpha: 0.4),
                          )
                        : null,
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(tab.emoji, style: const TextStyle(fontSize: 13)),
                      const SizedBox(width: 5),
                      Flexible(
                        child: Text(
                          tab.label,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 12.5,
                            fontWeight: current == tab
                                ? FontWeight.w800
                                : FontWeight.w600,
                            color: current == tab
                                ? AppColors.gold
                                : theme.colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

// ═══ Ro'yxat ════════════════════════════════════════════════════════════════

class _Body extends StatelessWidget {
  const _Body({required this.state, required this.myTelegramId});

  final LeaderboardState state;
  final int myTelegramId;

  @override
  Widget build(BuildContext context) {
    // Birinchi yuklash — spinner.
    if (state.isLoading && !state.hasData) {
      return const Center(child: AdaptiveLoader(size: 30));
    }

    // Xato va kesh yo'q.
    if (state.status == LeaderboardStatus.failure && !state.hasData) {
      return _ErrorState(
        message: state.errorMessage ?? 'Xatolik',
        onRetry: () => context.read<LeaderboardCubit>().load(),
      );
    }

    final page = state.currentPage;
    if (page == null || page.entries.isEmpty) {
      return RefreshIndicator(
        onRefresh: () => context.read<LeaderboardCubit>().refresh(),
        color: AppColors.gold,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          children: [
            SizedBox(height: MediaQuery.sizeOf(context).height * 0.22),
            const Center(child: Text('📭', style: TextStyle(fontSize: 46))),
            const SizedBox(height: 14),
            Center(
              child: Text(
                state.tab == LeaderboardTab.referrals
                    ? 'Hali hech kim do\'st taklif qilmagan'
                    : 'Reyting hali bo\'sh',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
              ),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () => context.read<LeaderboardCubit>().refresh(),
      color: AppColors.gold,
      child: ListView.builder(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        itemCount: page.entries.length,
        itemBuilder: (context, i) {
          final entry = page.entries[i];
          return LeaderboardTile(
            entry: entry,
            unit: state.unitLabel,
            isMe: entry.telegramId == myTelegramId,
          )
              .animate()
              .fadeIn(delay: (28 * i).ms, duration: 220.ms)
              .moveY(begin: 8, end: 0);
        },
      ),
    );
  }
}

// ═══ Pastdagi "mening o'rnim" ═══════════════════════════════════════════════

class _MyRankBar extends StatelessWidget {
  const _MyRankBar({
    required this.state,
    required this.myTelegramId,
    required this.myName,
  });

  final LeaderboardState state;
  final int myTelegramId;
  final String myName;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final page = state.currentPage!;

    // Agar o'zim ro'yxatda ko'rinib tursam — pastda takrorlamayman.
    if (page.containsMe(myTelegramId)) return const SizedBox.shrink();

    final hasRank = page.myRank > 0;
    final myScore = page.myScore;

    // Taklif tabida rank yo'q, lekin `myCount` bor.
    final showBar = hasRank || myScore > 0;
    if (!showBar) {
      return _HintBar(
        text: state.tab == LeaderboardTab.referrals
            ? 'Do\'stlaringizni taklif qiling va reytingga chiqing'
            : 'O\'ynab ball to\'plang va reytingga chiqing',
      );
    }

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 14),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        border: Border(top: BorderSide(color: theme.colorScheme.outline)),
      ),
      child: Row(
        children: [
          Container(
            height: 36,
            width: 36,
            decoration: BoxDecoration(
              gradient: AppColors.goldGradient,
              borderRadius: BorderRadius.circular(11),
            ),
            alignment: Alignment.center,
            child: Text(
              hasRank ? '${page.myRank}' : '—',
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w900,
                color: Color(0xFF1A0A00),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Sizning o\'rningiz',
                  style: theme.textTheme.bodySmall?.copyWith(
                    fontSize: 11,
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
                Text(
                  myName.isEmpty ? 'Siz' : myName,
                  style: theme.textTheme.titleSmall
                      ?.copyWith(fontWeight: FontWeight.w700),
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          Text(
            '$myScore',
            style: const TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w900,
              color: AppColors.gold,
            ),
          ),
          const SizedBox(width: 4),
          Text(
            state.unitLabel,
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

class _HintBar extends StatelessWidget {
  const _HintBar({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        border: Border(top: BorderSide(color: theme.colorScheme.outline)),
      ),
      child: Row(
        children: [
          Icon(
            Icons.info_outline_rounded,
            size: 17,
            color: theme.colorScheme.onSurfaceVariant,
          ),
          const SizedBox(width: 9),
          Expanded(
            child: Text(
              text,
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('😕', style: TextStyle(fontSize: 46)),
            const SizedBox(height: 14),
            Text(
              message,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 20),
            OutlinedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh_rounded, size: 18),
              label: const Text('Qayta urinish'),
              style: OutlinedButton.styleFrom(
                minimumSize: const Size(180, 46),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
