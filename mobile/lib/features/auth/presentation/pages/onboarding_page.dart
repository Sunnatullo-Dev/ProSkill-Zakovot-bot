import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/app_widgets.dart';
import '../../../../shared/widgets/zakovat_logo.dart';
import '../bloc/auth_bloc.dart';

class _Slide {
  const _Slide({
    required this.emoji,
    required this.title,
    required this.body,
    required this.accent,
  });

  final String emoji;
  final String title;
  final String body;
  final Color accent;
}

const _slides = <_Slide>[
  _Slide(
    emoji: '🧠',
    title: 'Bilimingizni sinang',
    body: 'Turli mavzulardagi savollarga javob bering, ball to\'plang '
        'va o\'z rekordingizni yangilang.',
    accent: AppColors.gold,
  ),
  _Slide(
    emoji: '⚔️',
    title: 'Do\'stlar bilan bellashing',
    body: 'Jamoa tuzing, boshqa jamoalarni bellashuvga chaqiring '
        'va kim ko\'proq bilishini aniqlang.',
    accent: AppColors.purple,
  ),
  _Slide(
    emoji: '🏆',
    title: 'Reytingda yuqoriga chiqing',
    body: 'Har kuni yangi topshiriq, ketma-ketlik bonuslari '
        'va umumiy reyting sizni kutmoqda.',
    accent: AppColors.blue,
  ),
];

class OnboardingPage extends StatefulWidget {
  const OnboardingPage({super.key});

  @override
  State<OnboardingPage> createState() => _OnboardingPageState();
}

class _OnboardingPageState extends State<OnboardingPage> {
  final _controller = PageController();
  int _index = 0;

  bool get _isLast => _index == _slides.length - 1;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _next() {
    if (_isLast) {
      context.read<AuthBloc>().add(const AuthOnboardingCompleted());
      return;
    }
    _controller.nextPage(
      duration: const Duration(milliseconds: 320),
      curve: Curves.easeOutCubic,
    );
  }

  void _skip() => context.read<AuthBloc>().add(const AuthOnboardingCompleted());

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 12, 0),
              child: Row(
                children: [
                  const ZakovatLogo(size: 30, withGlow: false),
                  const SizedBox(width: 10),
                  const ZakovatWordmark(fontSize: 15),
                  const Spacer(),
                  TextButton(
                    onPressed: _skip,
                    child: const Text('O\'tkazish'),
                  ),
                ],
              ),
            ),
            Expanded(
              child: PageView.builder(
                controller: _controller,
                itemCount: _slides.length,
                onPageChanged: (i) => setState(() => _index = i),
                itemBuilder: (context, i) {
                  final slide = _slides[i];
                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 28),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          height: 132,
                          width: 132,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            gradient: RadialGradient(
                              colors: [
                                slide.accent.withValues(alpha: 0.28),
                                slide.accent.withValues(alpha: 0.02),
                              ],
                            ),
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            slide.emoji,
                            style: const TextStyle(fontSize: 62),
                          ),
                        )
                            .animate(key: ValueKey(i))
                            .fadeIn(duration: 400.ms)
                            .scale(begin: const Offset(0.8, 0.8)),
                        const SizedBox(height: 36),
                        Text(
                          slide.title,
                          textAlign: TextAlign.center,
                          style: theme.textTheme.headlineSmall?.copyWith(
                            fontWeight: FontWeight.w900,
                          ),
                        )
                            .animate(key: ValueKey('t$i'))
                            .fadeIn(delay: 120.ms)
                            .moveY(begin: 14, end: 0),
                        const SizedBox(height: 14),
                        Text(
                          slide.body,
                          textAlign: TextAlign.center,
                          style: theme.textTheme.bodyLarge?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant,
                            height: 1.5,
                          ),
                        )
                            .animate(key: ValueKey('b$i'))
                            .fadeIn(delay: 220.ms)
                            .moveY(begin: 14, end: 0),
                      ],
                    ),
                  );
                },
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 28),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(_slides.length, (i) {
                      final active = i == _index;
                      return AnimatedContainer(
                        duration: const Duration(milliseconds: 250),
                        margin: const EdgeInsets.symmetric(horizontal: 4),
                        height: 7,
                        width: active ? 26 : 7,
                        decoration: BoxDecoration(
                          color: active
                              ? AppColors.gold
                              : theme.colorScheme.outline,
                          borderRadius: BorderRadius.circular(4),
                        ),
                      );
                    }),
                  ),
                  const SizedBox(height: 26),
                  LoadingButton(
                    label: _isLast ? 'Boshlash' : 'Keyingisi',
                    icon: _isLast ? Icons.rocket_launch_rounded : null,
                    onPressed: _next,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
