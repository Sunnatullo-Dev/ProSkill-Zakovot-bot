import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/di/injector.dart';
import '../../../../core/router/app_routes.dart';
import '../../../../core/security/screen_guard.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/app_widgets.dart';
import '../../../auth/presentation/bloc/auth_bloc.dart';
import '../../domain/entities/quiz_question.dart';
import '../cubit/quiz_cubit.dart';
import '../widgets/answer_feedback.dart';
import '../widgets/answer_option_tile.dart';
import '../widgets/bet_selector.dart';
import '../widgets/quiz_timer_bar.dart';

/// Yakka o'yin ekrani.
class QuizPage extends StatelessWidget {
  const QuizPage({super.key, this.difficulty});

  final String? difficulty;

  @override
  Widget build(BuildContext context) {
    final startingScore = context.read<AuthBloc>().state.user?.score ?? 0;

    return BlocProvider(
      create: (_) => QuizCubit(repository: sl(), clock: sl())
        ..startRound(difficulty: difficulty, startingScore: startingScore),
      child: const _QuizView(),
    );
  }
}

class _QuizView extends StatefulWidget {
  const _QuizView();

  @override
  State<_QuizView> createState() => _QuizViewState();
}

/// `ScreenGuardMixin` — savol ekranida skrinshot va ekran yozuvini bloklaydi
/// (Android'da to'liq, iOS'da platforma imkoni doirasida).
class _QuizViewState extends State<_QuizView> with ScreenGuardMixin {
  final _answerController = TextEditingController();

  @override
  void dispose() {
    _answerController.dispose();
    super.dispose();
  }

  Future<bool> _confirmExit() async {
    final state = context.read<QuizCubit>().state;
    // O'yin tugagan yoki hali boshlanmagan bo'lsa so'ramaymiz.
    if (state.phase == QuizPhase.finished ||
        state.phase == QuizPhase.initial ||
        state.phase == QuizPhase.failure) {
      return true;
    }
    return showAdaptiveConfirm(
      context,
      title: 'O\'yinni tark etasizmi?',
      message: 'Joriy raund natijasi saqlanmaydi.',
      confirmLabel: 'Chiqish',
      cancelLabel: 'Davom etish',
      isDestructive: true,
    );
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<QuizCubit, QuizState>(
      listenWhen: (prev, curr) => prev.phase != curr.phase,
      listener: (context, state) {
        if (state.phase == QuizPhase.feedback) {
          final outcome = state.outcome;
          if (outcome != null) {
            HapticFeedback.mediumImpact();
          }
          _answerController.clear();
        }

        if (state.phase == QuizPhase.finished && state.summary != null) {
          // Profil ballari yangilangan bo'lsa sessiyaga uzatamiz.
          final updated = context.read<QuizCubit>().updatedUser;
          if (updated != null) {
            context.read<AuthBloc>().add(AuthUserUpdated(updated));
          }
          context.pushReplacement(
            AppRoutes.quizResult,
            extra: state.summary,
          );
        }
      },
      builder: (context, state) {
        return PopScope(
          canPop: false,
          onPopInvokedWithResult: (didPop, _) async {
            if (didPop) return;
            if (await _confirmExit() && context.mounted) {
              context.pop();
            }
          },
          child: Scaffold(
            appBar: _buildAppBar(context, state),
            body: SafeArea(
              child: switch (state.phase) {
                QuizPhase.initial ||
                QuizPhase.loading =>
                  const _LoadingView(),
                QuizPhase.failure => _ErrorView(
                    message: state.errorMessage ?? 'Xatolik yuz berdi',
                    onRetry: () => context.read<QuizCubit>().retry(),
                    onExit: () => context.pop(),
                  ),
                _ => _QuestionView(
                    state: state,
                    answerController: _answerController,
                  ),
              },
            ),
          ),
        );
      },
    );
  }

  PreferredSizeWidget _buildAppBar(BuildContext context, QuizState state) {
    final theme = Theme.of(context);
    final hasQuestions = state.questions.isNotEmpty;

    return AppBar(
      leading: IconButton(
        icon: const Icon(Icons.close_rounded),
        onPressed: () async {
          if (await _confirmExit() && context.mounted) context.pop();
        },
      ),
      title: hasQuestions
          ? Text('${state.questionNumber} / ${state.totalQuestions}')
          : const Text('Yakka o\'yin'),
      actions: [
        Container(
          margin: const EdgeInsets.only(right: 14),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: AppColors.gold.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: AppColors.gold.withValues(alpha: 0.3)),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('🏆', style: TextStyle(fontSize: 12)),
              const SizedBox(width: 5),
              Text(
                '${state.liveScore}',
                style: const TextStyle(
                  fontWeight: FontWeight.w800,
                  color: AppColors.gold,
                  fontSize: 14,
                ),
              ),
            ],
          ),
        ),
      ],
      bottom: hasQuestions
          ? PreferredSize(
              preferredSize: const Size.fromHeight(3),
              child: LinearProgressIndicator(
                value: state.progress,
                minHeight: 3,
                backgroundColor: theme.colorScheme.surfaceContainerHighest,
                valueColor: const AlwaysStoppedAnimation(AppColors.gold),
              ),
            )
          : null,
    );
  }
}

// ═══ Savol ko'rinishi ═══════════════════════════════════════════════════════

class _QuestionView extends StatelessWidget {
  const _QuestionView({required this.state, required this.answerController});

  final QuizState state;
  final TextEditingController answerController;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final question = state.currentQuestion;
    final cubit = context.read<QuizCubit>();

    if (question == null) return const _LoadingView();

    final showFeedback = state.phase == QuizPhase.feedback;

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
      children: [
        // ── Taymer ────────────────────────────────────────────────────────
        QuizTimerBar(
          fraction: state.timeFraction,
          remainingSeconds: state.remainingSeconds,
          isPaused: state.phase != QuizPhase.answering,
        ),
        const SizedBox(height: 20),

        // ── Savol ─────────────────────────────────────────────────────────
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: theme.colorScheme.surface,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: theme.colorScheme.outline),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (question.category != null || question.difficulty != null) ...[
                Row(
                  children: [
                    if (question.category != null)
                      _Tag(
                        label: question.category!,
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    if (question.difficulty != null) ...[
                      const SizedBox(width: 6),
                      _Tag(
                        label: switch (question.difficulty) {
                          'easy' => 'Oson',
                          'medium' => 'O\'rtacha',
                          'hard' => 'Qiyin',
                          _ => question.difficulty!,
                        },
                        color: AppColors.forDifficulty(question.difficulty),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 14),
              ],
              // ⚠️ SelectionArea ATAYLAB ishlatilmaydi — savol matnini
              // nusxalab boshqa joyda qidirishning oldini olamiz.
              Text(
                question.text,
                style: theme.textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w700,
                  height: 1.4,
                ),
              ),
            ],
          ),
        ).animate(key: ValueKey(question.id)).fadeIn(duration: 300.ms).moveY(begin: 12, end: 0),

        const SizedBox(height: 18),

        // ── Garov ─────────────────────────────────────────────────────────
        if (!showFeedback) ...[
          BetSelector(
            selected: state.betAmount,
            availableScore: state.liveScore,
            enabled: state.canChangeBet,
            onChanged: cubit.setBet,
          ),
          const SizedBox(height: 20),
        ],

        // ── Javob berish ──────────────────────────────────────────────────
        if (question.isMultipleChoice)
          _OptionList(state: state, question: question)
        else
          _FreeTextAnswer(
            controller: answerController,
            enabled: state.canAnswer,
            onSubmit: (value) => cubit.answer(value),
          ),

        // ── Natija ────────────────────────────────────────────────────────
        if (showFeedback) ...[
          const SizedBox(height: 6),
          AnswerFeedback(
            outcome: state.outcome,
            revealed: state.revealed,
            isLastQuestion: state.questionNumber >= state.totalQuestions,
            onNext: cubit.next,
          ),
        ],

        // ── "Bilmayman" ───────────────────────────────────────────────────
        if (state.canAnswer) ...[
          const SizedBox(height: 14),
          Center(
            child: TextButton.icon(
              onPressed: cubit.giveUp,
              icon: const Icon(Icons.help_outline_rounded, size: 18),
              label: const Text('Javobni bilmayman'),
              style: TextButton.styleFrom(
                foregroundColor: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ),
        ],

        if (state.phase == QuizPhase.preparing ||
            state.phase == QuizPhase.submitting) ...[
          const SizedBox(height: 20),
          const Center(child: AdaptiveLoader()),
        ],
      ],
    );
  }
}

/// A/B/C/D variantlari.
class _OptionList extends StatelessWidget {
  const _OptionList({required this.state, required this.question});

  final QuizState state;
  final QuizQuestion question;

  static const _letters = ['A', 'B', 'C', 'D'];

  OptionVisual _visualFor(String option) {
    final outcome = state.outcome;
    final revealed = state.revealed;
    final correct = outcome?.correctAnswer ?? revealed?.correctAnswer;

    // Natija kelmagan — faqat tanlanganini belgilaymiz.
    if (correct == null || correct.isEmpty) {
      return state.selectedAnswer == option
          ? OptionVisual.selected
          : OptionVisual.idle;
    }

    final isCorrectOption =
        option.trim().toLowerCase() == correct.trim().toLowerCase();
    if (isCorrectOption) return OptionVisual.correct;
    if (state.selectedAnswer == option) return OptionVisual.wrong;
    return OptionVisual.dimmed;
  }

  @override
  Widget build(BuildContext context) {
    final cubit = context.read<QuizCubit>();
    final options = question.options;

    return Column(
      children: [
        for (var i = 0; i < options.length; i++)
          AnswerOptionTile(
            letter: _letters[i % _letters.length],
            text: options[i],
            visual: _visualFor(options[i]),
            onTap: state.canAnswer
                ? () {
                    HapticFeedback.selectionClick();
                    cubit.answer(options[i]);
                  }
                : null,
          )
              .animate(key: ValueKey('${state.currentIndex}-$i'))
              .fadeIn(delay: (60 * i).ms, duration: 250.ms)
              .moveX(begin: 16, end: 0),
      ],
    );
  }
}

/// Erkin matnli javob (Gemini baholaydi).
class _FreeTextAnswer extends StatelessWidget {
  const _FreeTextAnswer({
    required this.controller,
    required this.enabled,
    required this.onSubmit,
  });

  final TextEditingController controller;
  final bool enabled;
  final ValueChanged<String> onSubmit;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        TextField(
          controller: controller,
          enabled: enabled,
          textInputAction: TextInputAction.done,
          maxLength: 300,
          onSubmitted: (v) {
            if (v.trim().isNotEmpty) onSubmit(v.trim());
          },
          decoration: const InputDecoration(
            labelText: 'Javobingiz',
            hintText: 'Javobni yozing...',
            prefixIcon: Icon(Icons.edit_outlined),
          ),
        ),
        const SizedBox(height: 10),
        LoadingButton(
          label: 'Javobni yuborish',
          icon: Icons.send_rounded,
          onPressed: enabled
              ? () {
                  final value = controller.text.trim();
                  if (value.isNotEmpty) onSubmit(value);
                }
              : null,
        ),
      ],
    );
  }
}

// ═══ Yordamchi ko'rinishlar ═════════════════════════════════════════════════

class _Tag extends StatelessWidget {
  const _Tag({required this.label, required this.color});

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.13),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 10.5,
          fontWeight: FontWeight.w700,
          color: color,
        ),
      ),
    );
  }
}

class _LoadingView extends StatelessWidget {
  const _LoadingView();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const AdaptiveLoader(size: 34),
          const SizedBox(height: 16),
          Text(
            'Savollar tayyorlanmoqda...',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
          ),
        ],
      ),
    );
  }
}

class _ErrorView extends StatelessWidget {
  const _ErrorView({
    required this.message,
    required this.onRetry,
    required this.onExit,
  });

  final String message;
  final VoidCallback onRetry;
  final VoidCallback onExit;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('😕', style: TextStyle(fontSize: 52)),
            const SizedBox(height: 18),
            Text(
              message,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyLarge,
            ),
            const SizedBox(height: 26),
            LoadingButton(
              label: 'Qayta urinish',
              icon: Icons.refresh_rounded,
              onPressed: onRetry,
            ),
            const SizedBox(height: 10),
            TextButton(onPressed: onExit, child: const Text('Chiqish')),
          ],
        ),
      ),
    );
  }
}
