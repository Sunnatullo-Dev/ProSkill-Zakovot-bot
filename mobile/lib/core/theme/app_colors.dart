import 'package:flutter/material.dart';

/// Zakovat brend ranglari.
///
/// Manba — mavjud web ilova (`frontend/src/styles/globals.css` va
/// komponentlardagi inline qiymatlar). Mobil ilova xuddi shu vizual
/// tilni saqlaydi, shunda foydalanuvchi web'dan mobilga o'tganda
/// boshqa mahsulotga tushib qolgandek his qilmaydi.
class AppColors {
  const AppColors._();

  // ── Brend ─────────────────────────────────────────────────────────────────
  /// Asosiy urg'u — "Zakovat oltini".
  static const gold = Color(0xFFF5C842);
  static const goldLight = Color(0xFFFFE580);
  static const goldDark = Color(0xFFD4960A);

  static const purple = Color(0xFFA78BFA);
  static const blue = Color(0xFF4DA6FF);

  // ── Semantik ──────────────────────────────────────────────────────────────
  static const success = Color(0xFF22C55E);
  static const warning = Color(0xFFF59E0B);
  static const error = Color(0xFFEF4444);
  static const info = Color(0xFF4DA6FF);

  // ── Qiyinlik darajalari (web bilan bir xil) ───────────────────────────────
  static const difficultyEasy = Color(0xFF22C55E);
  static const difficultyMedium = Color(0xFFF59E0B);
  static const difficultyHard = Color(0xFFEF4444);
  static const difficultyAny = Color(0xFFA78BFA);

  // ── Qorong'i mavzu (asosiy) ───────────────────────────────────────────────
  static const darkBg = Color(0xFF080F1E);
  static const darkSurface = Color(0xFF111A2E);
  static const darkSurfaceElevated = Color(0xFF17233C);
  static const darkBorder = Color(0xFF243250);
  static const darkText = Color(0xFFF1F5F9);
  static const darkTextSub = Color(0xFF94A3B8);
  static const darkMuted = Color(0xFF64748B);

  // ── Yorug' mavzu ──────────────────────────────────────────────────────────
  static const lightBg = Color(0xFFF7F8FC);
  static const lightSurface = Color(0xFFFFFFFF);
  static const lightSurfaceElevated = Color(0xFFF1F3F9);
  static const lightBorder = Color(0xFFE2E8F0);
  static const lightText = Color(0xFF0F172A);
  static const lightTextSub = Color(0xFF475569);
  static const lightMuted = Color(0xFF94A3B8);

  // ── Gradientlar ───────────────────────────────────────────────────────────
  static const goldGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [goldLight, gold, goldDark],
  );

  static const purpleBlueGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFFA78BFA), Color(0xFF4DA6FF)],
  );

  /// Bosh ekran orqa fonidagi yumshoq yorug'lik.
  static const heroGlow = RadialGradient(
    center: Alignment.topCenter,
    radius: 1.1,
    colors: [Color(0x1FF5C842), Color(0x00000000)],
  );

  /// Qiyinlik darajasiga mos rang.
  static Color forDifficulty(String? difficulty) => switch (difficulty) {
        'easy' => difficultyEasy,
        'medium' => difficultyMedium,
        'hard' => difficultyHard,
        _ => difficultyAny,
      };
}
