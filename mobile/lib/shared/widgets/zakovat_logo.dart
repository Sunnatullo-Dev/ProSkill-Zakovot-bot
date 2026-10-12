import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';

/// Zakovat "Z" logotipi — web ilovadagi SVG bilan bir xil geometriya.
///
/// Rasm fayli emas, `CustomPaint` — har qanday o'lchamda aniq chiqadi
/// va assets hajmini oshirmaydi.
class ZakovatLogo extends StatelessWidget {
  const ZakovatLogo({super.key, this.size = 72, this.withGlow = true});

  final double size;
  final bool withGlow;

  @override
  Widget build(BuildContext context) {
    final logo = CustomPaint(
      size: Size(size, size),
      painter: _ZPainter(),
    );

    if (!withGlow) return logo;

    return DecoratedBox(
      decoration: BoxDecoration(
        boxShadow: [
          BoxShadow(
            color: AppColors.gold.withValues(alpha: 0.35),
            blurRadius: size * 0.35,
            spreadRadius: size * 0.02,
          ),
        ],
      ),
      child: logo,
    );
  }
}

class _ZPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final scale = size.width / 72;

    // Web'dagi SVG path: M14 14 L58 14 L58 22 L26 50 L58 50 L58 58 L14 58 L14 50 L46 22 L14 22 Z
    final path = Path()
      ..moveTo(14 * scale, 14 * scale)
      ..lineTo(58 * scale, 14 * scale)
      ..lineTo(58 * scale, 22 * scale)
      ..lineTo(26 * scale, 50 * scale)
      ..lineTo(58 * scale, 50 * scale)
      ..lineTo(58 * scale, 58 * scale)
      ..lineTo(14 * scale, 58 * scale)
      ..lineTo(14 * scale, 50 * scale)
      ..lineTo(46 * scale, 22 * scale)
      ..lineTo(14 * scale, 22 * scale)
      ..close();

    final paint = Paint()
      ..shader = AppColors.goldGradient.createShader(
        Rect.fromLTWH(0, 0, size.width, size.height),
      )
      ..isAntiAlias = true;

    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// "ZAKOVAT" so'zi — gradient bilan.
class ZakovatWordmark extends StatelessWidget {
  const ZakovatWordmark({super.key, this.fontSize = 26});

  final double fontSize;

  @override
  Widget build(BuildContext context) {
    return ShaderMask(
      shaderCallback: (bounds) => const LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [Colors.white, AppColors.gold, AppColors.goldDark],
        stops: [0.0, 0.6, 1.0],
      ).createShader(bounds),
      child: Text(
        'ZAKOVAT',
        style: TextStyle(
          fontSize: fontSize,
          fontWeight: FontWeight.w900,
          letterSpacing: fontSize * 0.23,
          color: Colors.white,
        ),
      ),
    );
  }
}
