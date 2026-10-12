import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/app_widgets.dart';
import '../../../../shared/widgets/zakovat_logo.dart';

/// Kirish (splash) ekrani.
///
/// Bu ekran hech qanday navigatsiya QILMAYDI — u faqat ko'rinish.
/// Yo'naltirishni GoRouter `redirect` funksiyasi `AuthBloc` holatiga
/// qarab bajaradi. Shu sababli "ikki joyda navigatsiya" muammosi
/// (splash ham, router ham surib yuborishi) yuzaga kelmaydi.
class SplashPage extends StatelessWidget {
  const SplashPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.darkBg,
      body: Stack(
        children: [
          const Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(gradient: AppColors.heroGlow),
            ),
          ),
          Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const ZakovatLogo(size: 96)
                    .animate()
                    .fadeIn(duration: 500.ms)
                    .scale(begin: const Offset(0.85, 0.85), curve: Curves.easeOutBack)
                    .then(delay: 200.ms)
                    .shimmer(duration: 1200.ms, color: Colors.white24),
                const SizedBox(height: 20),
                const ZakovatWordmark(fontSize: 28)
                    .animate()
                    .fadeIn(delay: 250.ms, duration: 600.ms)
                    .moveY(begin: 12, end: 0, curve: Curves.easeOut),
                const SizedBox(height: 10),
                Text(
                  'Bilimingizni sinab ko\'ring',
                  style: TextStyle(
                    color: AppColors.darkTextSub,
                    fontSize: 13,
                    fontStyle: FontStyle.italic,
                  ),
                ).animate().fadeIn(delay: 500.ms, duration: 600.ms),
              ],
            ),
          ),
          const Positioned(
            left: 0,
            right: 0,
            bottom: 56,
            child: Center(child: AdaptiveLoader(size: 26)),
          ),
        ],
      ),
    );
  }
}
