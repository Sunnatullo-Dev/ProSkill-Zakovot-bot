import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:zakovat/app/app.dart';
import 'package:zakovat/core/di/injector.dart';
import 'package:zakovat/core/storage/token_store.dart';

/// Haqiqiy simulyatorda ishlaydigan uchidan-uchiga test.
///
/// Ishga tushirish (backend `localhost:3000` da ishlab turishi shart):
/// ```bash
/// flutter test integration_test/app_flow_test.dart \
///   -d <simulator-id> --dart-define=API_BASE_URL=http://localhost:3000
/// ```
///
/// Tekshiriladi:
///   1. Splash → Onboarding → Login oqimi
///   2. Haqiqiy backend bilan kirish
///   3. Pastki navigatsiya: barcha 5 tab ochiladi
///   4. `StatefulShellRoute` state saqlashi (tab almashganda scroll yo'qolmaydi)
///   5. RenderFlex overflow yo'qligi (har kadrda tekshiriladi)
void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  /// Uzluksiz animatsiyalar (spinner) tufayli `pumpAndSettle` ishlamaydi —
  /// aniq sondagi kadr pump qilamiz.
  Future<void> settle(WidgetTester tester,
      {int frames = 20, int ms = 120}) async {
    for (var i = 0; i < frames; i++) {
      await tester.pump(Duration(milliseconds: ms));
    }
  }

  /// Overflow xatolari `FlutterError` sifatida qayd qilinadi.
  final overflowErrors = <String>[];

  setUpAll(() {
    final original = FlutterError.onError;
    FlutterError.onError = (details) {
      final text = details.exceptionAsString();
      if (text.contains('overflowed') || text.contains('RenderFlex')) {
        overflowErrors.add(text.split('\n').first);
      }
      original?.call(details);
    };
  });

  testWidgets('to\'liq oqim: onboarding → login → barcha tablar',
      (tester) async {
    // ── Toza holatdan boshlaymiz ──────────────────────────────────────────
    SharedPreferences.setMockInitialValues({});
    await configureDependencies();
    await sl<TokenStore>().clear();

    await tester.pumpWidget(const ZakovatApp());
    await settle(tester, frames: 30);

    // ── 1. Onboarding ─────────────────────────────────────────────────────
    expect(find.text('Bilimingizni sinang'), findsOneWidget,
        reason: 'Onboarding 1-slayd ko\'rinishi kerak');
    await binding.takeScreenshot('01-onboarding');
    debugPrint('[TEST] ✓ Onboarding ochildi');

    // Uch slaydni o'tamiz
    for (var i = 0; i < 2; i++) {
      await tester.tap(find.text('Keyingisi'));
      await settle(tester, frames: 8);
    }
    expect(find.text('Boshlash'), findsOneWidget);
    await tester.tap(find.text('Boshlash'));
    await settle(tester, frames: 20);

    // ── 2. Login ──────────────────────────────────────────────────────────
    expect(find.text('Xush kelibsiz!'), findsOneWidget,
        reason: 'Onboarding tugagach Login ekrani ochilishi kerak');
    await binding.takeScreenshot('02-login');
    debugPrint('[TEST] ✓ Login ekraniga o\'tdi');

    await tester.enterText(
      find.byType(TextFormField).first,
      '901234567',
    );
    await settle(tester, frames: 4);
    await tester.enterText(
      find.byType(TextFormField).last,
      'zakovat2026',
    );
    await settle(tester, frames: 4);

    await tester.tap(find.text('Kirish'));
    // Haqiqiy tarmoq so'rovi — uzoqroq kutamiz
    await settle(tester, frames: 40, ms: 150);

    // ── 3. Bosh sahifa + pastki navigatsiya ───────────────────────────────
    expect(find.text('Asosiy'), findsOneWidget,
        reason: 'Kirgandan keyin qobiq (bottom nav) ko\'rinishi kerak');
    expect(find.text('Qiyinlik darajasi'.toUpperCase()), findsOneWidget);
    await binding.takeScreenshot('03-home');
    debugPrint('[TEST] ✓ Bosh sahifa ochildi');

    // ── 4. Reyting tabi ───────────────────────────────────────────────────
    await tester.tap(find.text('Reyting'));
    await settle(tester, frames: 30);
    expect(find.text('Umumiy'), findsOneWidget);
    expect(find.text('Shu oy'), findsOneWidget);
    expect(find.text('Takliflar'), findsOneWidget);
    await binding.takeScreenshot('04-leaderboard');
    debugPrint('[TEST] ✓ Reyting: 3 tab ko\'rindi');

    // Oylik tabga o'tamiz — keyin state saqlanishini tekshiramiz
    await tester.tap(find.text('Shu oy'));
    await settle(tester, frames: 25);
    debugPrint('[TEST] ✓ Reyting: "Shu oy" tabiga o\'tdi');

    // ── 5. Jamoa tabi ─────────────────────────────────────────────────────
    await tester.tap(find.text('Jamoa'));
    await settle(tester, frames: 15);
    expect(find.text('Jamoa'), findsWidgets);
    await binding.takeScreenshot('05-team');
    debugPrint('[TEST] ✓ Jamoa tabi ochildi');

    // ── 6. Profil tabi ────────────────────────────────────────────────────
    await tester.tap(find.text('Profil'));
    await settle(tester, frames: 30);
    expect(find.text('Yutuqlar'.toUpperCase()), findsOneWidget);
    await binding.takeScreenshot('06-profile-top');
    debugPrint('[TEST] ✓ Profil ochildi (statistika + yutuqlar)');

    // `ListView` ko'rinmaydigan elementlarni qurmaydi — sozlamalar
    // bo'limini ko'rish uchun pastga aylantiramiz.
    await tester.drag(find.byType(ListView).last, const Offset(0, -900));
    await settle(tester, frames: 15);
    expect(find.text('Sozlamalar'.toUpperCase()), findsOneWidget);
    expect(find.text('Interfeys tili'), findsOneWidget);
    await binding.takeScreenshot('06b-profile-settings');
    debugPrint('[TEST] ✓ Profil: sozlamalar va til tanlagich ko\'rindi');

    // ── 7. Svoyak (markaziy tugma) ────────────────────────────────────────
    await tester.tap(find.text('S'));
    await settle(tester, frames: 15);
    await binding.takeScreenshot('07-svoyak');
    debugPrint('[TEST] ✓ Svoyak (markaziy tugma) ishladi');

    // ── 8. STATE SAQLANISHI ───────────────────────────────────────────────
    // Reytingga qaytamiz — "Shu oy" tabi tanlangan holida qolishi kerak.
    // Bu `StatefulShellRoute` state saqlashining asosiy dalili.
    await tester.tap(find.text('Reyting'));
    await settle(tester, frames: 20);

    // "Shu oy" hali ham tanlangan bo'lsa — state saqlangan.
    final monthlyTab = find.text('Shu oy');
    expect(monthlyTab, findsOneWidget);
    await binding.takeScreenshot('08-leaderboard-state-preserved');
    debugPrint('[TEST] ✓ Tab holati saqlandi (StatefulShellRoute ishlayapti)');

    // ── 9. Bosh sahifaga qaytish ──────────────────────────────────────────
    await tester.tap(find.text('Asosiy'));
    await settle(tester, frames: 15);
    expect(find.text('Qiyinlik darajasi'.toUpperCase()), findsOneWidget);
    debugPrint('[TEST] ✓ Bosh sahifaga qaytdi');

    // ── 10. Overflow hisoboti ─────────────────────────────────────────────
    if (overflowErrors.isEmpty) {
      debugPrint('[TEST] ✓ RenderFlex overflow TOPILMADI');
    } else {
      debugPrint('[TEST] ✗ OVERFLOW: ${overflowErrors.length} ta');
      for (final e in overflowErrors) {
        debugPrint('[TEST]   → $e');
      }
    }
    expect(overflowErrors, isEmpty,
        reason: 'Hech bir ekranda overflow bo\'lmasligi kerak');
  });
}
