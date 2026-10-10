import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/di/injector.dart';
import '../../../../core/security/screen_guard.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/app_widgets.dart';
import '../../../quiz/presentation/widgets/answer_feedback.dart';
import '../../../quiz/presentation/widgets/answer_option_tile.dart';
import '../../../quiz/presentation/widgets/quiz_timer_bar.dart';
import '../../domain/entities/daily_challenge.dart';
import '../cubit/daily_cubit.dart';
import '../widgets/streak_banner.dart';

/// Kunlik topshiriq ekrani.
///
/// Bir ekranda uch holat: intro (streak + boshlash), o'yin, yakun.
class DailyPage extends StatelessWidget {
  const DailyPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => DailyCubit(
        dailyRepository: sl(),
        quizRepository: sl(),
        clock: sl(),
      )..load(),
      child: const _DailyView(),
    );
  }
}

class _DailyView extends StatefulWidget {
  const _DailyView();

  @override
  State<_DailyView> createState() => _DailyViewState();
}

/// Savol ekranida skrinshot bloklanadi — yakka o'yindagi kabi.
class _DailyViewState extends State<_DailyView> with ScreenGuardMixin {
  @override
  Widget build(BuildContext context) {
    return BlocBuilder<DailyCubit, DailyState>(
      builder: (context, state) {
        return Scaffold(
          appBar: AppBar(
            leading: IconButton(
              icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
              onPressed: () => context.pop(),
            ),
            title: state.isPlaying
                ? Text('${state.questionNumber} / ${state.totalQuestions}')
                : const Text('Kunlik topshiriq'),
            bottom: state.isPlaying
                ? PreferredSize(
                    preferredSize: const Size.fromHeight(3),
                    child: LinearProgressIndicator(
                      value: state.progress,
                      minHeight: 3,
                      backgroundColor:
                          Theme.of(context).colorScheme.surfaceContainerHighest,
                      valueColor:
                          const AlwaysStoppedAnimation(AppColors.warning),
                    ),
                  )
                : null,
          ),
          body: SafeArea(
            child: switch (state.phase) {
              DailyPhase.initial || DailyPhase.loading => const Center(
                  child: AdaptiveLoader(size: 32),
                ),
              DailyPhase.failure => _ErrorState(
                  message: state.errorMessage ?? 'Xatolik',
                  onRetry: context.read<DailyCubit>().retry,
                ),
              DailyPhase.intro => _IntroView(state: state),
              DailyPhase.alreadyCompleted => _CompletedTodayView(state: state),
              DailyPhase.finished => _FinishedView(state: state),
              _ => _PlayView(state: state),
            },
          ),
        );
      },
    );
  }
}

// ═══ Intro ══════════════════════════════════════════════════════════════════

class _IntroView extends StatelessWidget {
  const _IntroView({required this.state});

  final DailyState state;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final challenge = state.challenge!;

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
      children: [
        StreakBanner(
          streak: challenge.streak,
          bonusPreview: challenge.bonusPreview,
        ).animate().fadeIn(duration: 350.ms).moveY(begin: -10, end: 0),

        const SizedBox(height: 26),
        Center(
          child: Column(
            children: [
              const Text('📅', style: TextStyle(fontSize: 56)),
              const SizedBox(height: 14),
              Text(
                'Bugungi topshiriq',
                style: theme.textTheme.headlineSmall
                    ?.copyWith(fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 6),
              Text(
                '${challenge.questions.length} ta savol · barcha o\'yinchilar uchun bir xil',
                textAlign: TextAlign.center,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                challenge.date,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 30),
        const _RuleRow(
          emoji: '⏱',
          text: 'Har savolga 90 soniya',
        ),
        const _RuleRow(
          emoji: '🔥',
          text: 'Har kuni o\'ynasangiz ketma-ketlik oshadi',
        ),
        const _RuleRow(
          emoji: '🎯',
          text: 'Kuniga faqat bir marta topshirish mumkin',
        ),

        const SizedBox(height: 30),
        LoadingButton(
          label: 'Boshlash',
          icon: Icons.play_arrow_rounded,
          onPressed: () {
            HapticFeedback.mediumImpact();
            context.read<DailyCubit>().start();
          },
        ),
      ],
    );
  }
}

class _RuleRow extends StatelessWidget {
  const _RuleRow({required this.emoji, required this.text});

  final String emoji;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 7),
      child: Row(
        children: [
          Text(emoji, style: const TextStyle(fontSize: 17)),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              text,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ),
        ],
      ),
    );
  }
}

// ═══ O'yin ══════════════════════════════════════════════════════════════════

class _PlayView extends StatelessWidget {
  const _PlayView({required this.state});

  final DailyState state;

  static const _letters = ['A', 'B', 'C', 'D'];

  OptionVisual _visualFor(String option) {
    final correct = state.outcome?.correctAnswer;
    if (correct == null || correct.isEmpty) {
      return state.selectedAnswer == option
          ? OptionVisual.selected
          : OptionVisual.idle;
    }
    if (option.trim().toLowerCase() == correct.trim().toLowerCase()) {
      return OptionVisual.correct;
    }
    if (state.selectedAnswer == option) return OptionVisual.wrong;
    return OptionVisual.dimmed;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cubit = context.read<DailyCubit>();
    final question = state.currentQuestion;
    if (question == null) return const Center(child: AdaptiveLoader());

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
      children: [
        QuizTimerBar(
          fraction: state.timeFraction,
          remainingSeconds: state.remainingSeconds,
          isPaused: state.phase != DailyPhase.answering,
        ),
        const SizedBox(height: 20),

        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: theme.colorScheme.surface,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: theme.colorScheme.outline),
          ),
          child: Text(
            question.text,
            style: theme.textTheme.titleLarge
                ?.copyWith(fontWeight: FontWeight.w700, height: 1.4),
          ),
        )
            .animate(key: ValueKey(question.id))
            .fadeIn(duration: 300.ms)
            .moveY(begin: 12, end: 0),

        const SizedBox(height: 20),

        if (question.isMultipleChoice)
          for (var i = 0; i < question.options.length; i++)
            AnswerOptionTile(
              letter: _letters[i % _letters.length],
              text: question.options[i],
              visual: _visualFor(question.options[i]),
              onTap: state.canAnswer
                  ? () {
                      HapticFeedback.selectionClick();
                      cubit.answer(question.options[i]);
                    }
                  : null,
            ),

        if (state.phase == DailyPhase.feedback) ...[
          const SizedBox(height: 6),
          AnswerFeedback(
            outcome: state.outcome,
            isLastQuestion: state.questionNumber >= state.totalQuestions,
            onNext: cubit.next,
          ),
        ],

        if (state.phase == DailyPhase.preparing ||
            state.phase == DailyPhase.submitting) ...[
          const SizedBox(height: 20),
          const Center(child: AdaptiveLoader()),
        ],
      ],
    );
  }
}

// ═══ Yakun ══════════════════════════════════════════════════════════════════

class _FinishedView extends StatelessWidget {
  const _FinishedView({required this.state});

  final DailyState state;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final completion = state.completion!;

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 28),
      children: [
        Center(
          child: Column(
            children: [
              const Text('🎉', style: TextStyle(fontSize: 64))
                  .animate()
                  .scale(duration: 500.ms, curve: Curves.elasticOut),
              const SizedBox(height: 14),
              Text(
                'Topshiriq bajarildi!',
                style: theme.textTheme.headlineSmall
                    ?.copyWith(fontWeight: FontWeight.w900),
              ).animate().fadeIn(delay: 200.ms),
            ],
          ),
        ),
        const SizedBox(height: 28),

        Row(
          children: [
            Expanded(
              child: _ResultCard(
                emoji: '✅',
                value: '${state.correctCount}/${state.totalQuestions}',
                label: 'To\'g\'ri',
                color: AppColors.success,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _ResultCard(
                emoji: '🏆',
                value: '${state.earnedPoints}',
                label: 'Ball',
                color: AppColors.gold,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _ResultCard(
                emoji: '🔥',
                value: '${completion.newStreak}',
                label: 'Ketma-ket',
                color: AppColors.warning,
              ),
            ),
          ],
        ),

        if (completion.streakBonus > 0) ...[
          const SizedBox(height: 18),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  AppColors.gold.withValues(alpha: 0.2),
                  AppColors.gold.withValues(alpha: 0.05),
                ],
              ),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.gold.withValues(alpha: 0.4)),
            ),
            child: Row(
              children: [
                const Text('🎁', style: TextStyle(fontSize: 26)),
                const SizedBox(width: 13),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Ketma-ketlik bonusi',
                        style: theme.textTheme.titleSmall
                            ?.copyWith(fontWeight: FontWeight.w800),
                      ),
                      Text(
                        '${completion.newStreak} kunlik seriya uchun',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),
                Text(
                  '+${completion.streakBonus}',
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w900,
                    color: AppColors.gold,
                  ),
                ),
              ],
            ),
          ).animate().fadeIn(delay: 400.ms).shimmer(duration: 1400.ms),
        ],

        const SizedBox(height: 20),
        StreakBanner(
          streak: DailyStreak(
            current: completion.newStreak,
            longest: completion.longestStreak,
          ),
          bonusPreview: 0,
        ),

        const SizedBox(height: 26),
        LoadingButton(
          label: 'Yopish',
          onPressed: () => context.pop(),
        ),
      ],
    );
  }
}

// ═══ Bugun allaqachon bajarilgan ════════════════════════════════════════════

class _CompletedTodayView extends StatelessWidget {
  const _CompletedTodayView({required this.state});

  final DailyState state;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
      children: [
        StreakBanner(streak: state.streak, bonusPreview: 0),
        const SizedBox(height: 34),
        Center(
          child: Column(
            children: [
              const Text('✅', style: TextStyle(fontSize: 60)),
              const SizedBox(height: 16),
              Text(
                'Bugungi topshiriq bajarilgan',
                textAlign: TextAlign.center,
                style: theme.textTheme.titleLarge
                    ?.copyWith(fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 8),
              Text(
                'Ertaga yangi savollar bilan qayting —\nketma-ketlikni uzmang!',
                textAlign: TextAlign.center,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                  height: 1.5,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 32),
        LoadingButton(label: 'Yopish', onPressed: () => context.pop()),
      ],
    );
  }
}

// ═══ Yordamchi ══════════════════════════════════════════════════════════════

class _ResultCard extends StatelessWidget {
  const _ResultCard({
    required this.emoji,
    required this.value,
    required this.label,
    required this.color,
  });

  final String emoji;
  final String value;
  final String label;
  final Color color;

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
              style: theme.textTheme.titleLarge
                  ?.copyWith(fontWeight: FontWeight.w900, color: color),
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
            const Text('😕', style: TextStyle(fontSize: 50)),
            const SizedBox(height: 16),
            Text(
              message,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyLarge,
            ),
            const SizedBox(height: 24),
            LoadingButton(
              label: 'Qayta urinish',
              icon: Icons.refresh_rounded,
              onPressed: onRetry,
            ),
          ],
        ),
      ),
    );
  }
}
