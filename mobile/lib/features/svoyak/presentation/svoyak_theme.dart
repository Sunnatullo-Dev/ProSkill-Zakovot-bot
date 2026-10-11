import 'package:flutter/material.dart';

/// Svoyak o'yinining rang va stil konstantalari.
///
/// Telegram Mini App (`frontend/src/svoyak/`) bilan 100% bir xil:
///   --svoyak-bg: #0a1428
///   --svoyak-surface: #0f1f3a
///   --svoyak-border: #1f3a6e
///   --svoyak-gold: #f5c842
///   --svoyak-orange: #ff8a4c
///   --svoyak-neon-green: #22e07f
///   --svoyak-neon-red: #ef4444
///   --svoyak-blue: #4da6ff
///   --text: #ffffff
///   --muted: #8892a4
class SvoyakTheme {
  const SvoyakTheme._();

  static const bg = Color(0xFF0A1428);
  static const surface = Color(0xFF0F1F3A);
  static const border = Color(0xFF1F3A6E);
  static const gold = Color(0xFFF5C842);
  static const orange = Color(0xFFFF8A4C);
  static const neonGreen = Color(0xFF22E07F);
  static const neonRed = Color(0xFFEF4444);
  static const blue = Color(0xFF4DA6FF);
  static const text = Color(0xFFFFFFFF);
  static const muted = Color(0xFF8892A4);

  // Background radial gradients matching Svoyak PAGE style
  static const backgroundDecoration = BoxDecoration(
    color: bg,
    gradient: RadialGradient(
      center: Alignment(0.0, -0.9),
      radius: 1.4,
      colors: [
        Color(0x1EF5C842), // 12% gold
        Color(0x000A1428),
      ],
      stops: [0.0, 0.6],
    ),
  );

  static const goldGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [gold, orange],
  );

  static const blueGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF4DA6FF), Color(0xFF2C6FCC)],
  );

  static const cardDecoration = BoxDecoration(
    color: surface,
    borderRadius: BorderRadius.all(Radius.circular(16)),
    border: Border.fromBorderSide(BorderSide(color: border, width: 1)),
  );
}
