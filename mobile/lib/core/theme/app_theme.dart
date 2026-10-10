import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

import 'app_colors.dart';

/// Material 3 + Cupertino gibrid mavzu.
///
/// ## Gibrid yondashuv nima demak
///
/// Ilova **Material 3** komponentlariga asoslanadi (bitta kod bazasi,
/// bir xil xatti-harakat), lekin iOS'da tabiiy his berish uchun:
///   * sahifa o'tishlari — `CupertinoPageTransitionsBuilder` (chapdan surish
///     + orqaga svayp);
///   * dialoglar — platformaga qarab `CupertinoAlertDialog` yoki `AlertDialog`
///     (`shared/widgets/adaptive_dialog.dart`);
///   * yuklanish indikatorlari — iOS'da `CupertinoActivityIndicator`.
///
/// Bu "hammasini ikki marta yozish" emas — faqat foydalanuvchi eng ko'p
/// sezadigan 3 ta nuqtada moslashamiz.
class AppTheme {
  const AppTheme._();

  static const _radius = 18.0;
  static const _radiusSmall = 14.0;

  static ThemeData get dark => _build(Brightness.dark);
  static ThemeData get light => _build(Brightness.light);

  static ThemeData _build(Brightness brightness) {
    final isDark = brightness == Brightness.dark;

    final bg = isDark ? AppColors.darkBg : AppColors.lightBg;
    final surface = isDark ? AppColors.darkSurface : AppColors.lightSurface;
    final surfaceHigh =
        isDark ? AppColors.darkSurfaceElevated : AppColors.lightSurfaceElevated;
    final border = isDark ? AppColors.darkBorder : AppColors.lightBorder;
    final text = isDark ? AppColors.darkText : AppColors.lightText;
    final textSub = isDark ? AppColors.darkTextSub : AppColors.lightTextSub;

    final scheme = ColorScheme(
      brightness: brightness,
      primary: AppColors.gold,
      onPrimary: const Color(0xFF1A0A00),
      primaryContainer: AppColors.goldDark,
      onPrimaryContainer: Colors.white,
      secondary: AppColors.purple,
      onSecondary: Colors.white,
      secondaryContainer: AppColors.purple.withValues(alpha: 0.20),
      onSecondaryContainer: text,
      tertiary: AppColors.blue,
      onTertiary: Colors.white,
      error: AppColors.error,
      onError: Colors.white,
      errorContainer: AppColors.error.withValues(alpha: 0.15),
      onErrorContainer: AppColors.error,
      surface: surface,
      onSurface: text,
      onSurfaceVariant: textSub,
      surfaceContainerHighest: surfaceHigh,
      outline: border,
      outlineVariant: border.withValues(alpha: 0.5),
      shadow: Colors.black,
      scrim: Colors.black54,
      inverseSurface: text,
      onInverseSurface: bg,
      inversePrimary: AppColors.goldDark,
    );

    final baseTextTheme = GoogleFonts.interTextTheme(
      isDark ? ThemeData.dark().textTheme : ThemeData.light().textTheme,
    );

    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      colorScheme: scheme,
      scaffoldBackgroundColor: bg,
      canvasColor: bg,
      splashFactory: InkSparkle.splashFactory,

      // iOS'da tabiiy orqaga svayp uchun.
      pageTransitionsTheme: const PageTransitionsTheme(
        builders: {
          TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
          TargetPlatform.macOS: CupertinoPageTransitionsBuilder(),
          TargetPlatform.android: FadeUpwardsPageTransitionsBuilder(),
        },
      ),

      textTheme: baseTextTheme.apply(
        bodyColor: text,
        displayColor: text,
      ).copyWith(
        displayLarge: baseTextTheme.displayLarge?.copyWith(
          fontWeight: FontWeight.w900,
          letterSpacing: -0.5,
        ),
        headlineMedium: baseTextTheme.headlineMedium?.copyWith(
          fontWeight: FontWeight.w800,
        ),
        titleLarge: baseTextTheme.titleLarge?.copyWith(
          fontWeight: FontWeight.w800,
        ),
        titleMedium: baseTextTheme.titleMedium?.copyWith(
          fontWeight: FontWeight.w700,
        ),
        bodyMedium: baseTextTheme.bodyMedium?.copyWith(height: 1.45),
        labelLarge: baseTextTheme.labelLarge?.copyWith(
          fontWeight: FontWeight.w700,
          letterSpacing: 0.2,
        ),
      ),

      appBarTheme: AppBarTheme(
        backgroundColor: bg,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: true,
        foregroundColor: text,
        systemOverlayStyle:
            isDark ? SystemUiOverlayStyle.light : SystemUiOverlayStyle.dark,
        titleTextStyle: baseTextTheme.titleMedium?.copyWith(
          color: text,
          fontWeight: FontWeight.w800,
          fontSize: 17,
        ),
      ),

      cardTheme: CardThemeData(
        color: surface,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(_radius),
          side: BorderSide(color: border),
        ),
      ),

      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size(64, 52),
          backgroundColor: AppColors.gold,
          foregroundColor: const Color(0xFF1A0A00),
          disabledBackgroundColor: AppColors.gold.withValues(alpha: 0.35),
          disabledForegroundColor: const Color(0x661A0A00),
          textStyle: const TextStyle(
            fontWeight: FontWeight.w800,
            fontSize: 16,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(_radiusSmall),
          ),
        ),
      ),

      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          minimumSize: const Size(64, 52),
          foregroundColor: text,
          side: BorderSide(color: border, width: 1.5),
          textStyle: const TextStyle(
            fontWeight: FontWeight.w700,
            fontSize: 16,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(_radiusSmall),
          ),
        ),
      ),

      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: AppColors.gold,
          textStyle: const TextStyle(fontWeight: FontWeight.w700),
        ),
      ),

      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: surfaceHigh,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
        hintStyle: TextStyle(color: textSub.withValues(alpha: 0.8)),
        labelStyle: TextStyle(color: textSub),
        floatingLabelStyle: const TextStyle(color: AppColors.gold),
        prefixIconColor: textSub,
        suffixIconColor: textSub,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(_radiusSmall),
          borderSide: BorderSide(color: border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(_radiusSmall),
          borderSide: BorderSide(color: border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(_radiusSmall),
          borderSide: const BorderSide(color: AppColors.gold, width: 1.8),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(_radiusSmall),
          borderSide: const BorderSide(color: AppColors.error, width: 1.5),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(_radiusSmall),
          borderSide: const BorderSide(color: AppColors.error, width: 1.8),
        ),
      ),

      dividerTheme: DividerThemeData(color: border, thickness: 1, space: 1),

      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        backgroundColor: surface,
        selectedItemColor: AppColors.gold,
        unselectedItemColor: isDark ? AppColors.darkMuted : AppColors.lightMuted,
        type: BottomNavigationBarType.fixed,
        elevation: 0,
      ),

      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: surface,
        indicatorColor: AppColors.gold.withValues(alpha: 0.18),
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        height: 68,
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return TextStyle(
            fontSize: 11,
            fontWeight: selected ? FontWeight.w800 : FontWeight.w600,
            color: selected
                ? AppColors.gold
                : (isDark ? AppColors.darkMuted : AppColors.lightMuted),
          );
        }),
      ),

      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: surfaceHigh,
        contentTextStyle: TextStyle(color: text, fontWeight: FontWeight.w600),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(_radiusSmall),
        ),
        insetPadding: const EdgeInsets.all(16),
      ),

      dialogTheme: DialogThemeData(
        backgroundColor: surface,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(_radius),
        ),
      ),

      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: surface,
        surfaceTintColor: Colors.transparent,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
      ),

      chipTheme: ChipThemeData(
        backgroundColor: surfaceHigh,
        side: BorderSide(color: border),
        labelStyle: TextStyle(color: text, fontWeight: FontWeight.w600),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(10),
        ),
      ),

      progressIndicatorTheme: const ProgressIndicatorThemeData(
        color: AppColors.gold,
        linearTrackColor: Color(0x22FFFFFF),
      ),

      listTileTheme: ListTileThemeData(
        iconColor: textSub,
        textColor: text,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(_radiusSmall),
        ),
      ),
    );
  }
}
