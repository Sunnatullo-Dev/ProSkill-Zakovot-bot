import 'package:flutter_test/flutter_test.dart';
import 'package:zakovat/core/router/app_routes.dart';

void main() {
  group('yo\'l qurish (path builders)', () {
    test('Svoyak xonasi', () {
      expect(AppRoutes.svoyakRoom('ABC234'), '/svoyak/room/ABC234');
      expect(AppRoutes.svoyakAuto('XY9Z2K'), '/svoyak/auto/XY9Z2K');
    });

    test('bellashuv', () {
      expect(
        AppRoutes.battle('7f3a1b2c-0000-4000-8000-000000000000'),
        '/battle/7f3a1b2c-0000-4000-8000-000000000000',
      );
    });

    test('o\'yin xonasi va Zakovat stoli', () {
      expect(AppRoutes.gameRoom('QW3RTY'), '/gameroom/QW3RTY');
      expect(AppRoutes.zakovatTableRoom('7845'), '/zakovat-table/7845');
    });

    test('pattern va builder bir xil tuzilmada', () {
      expect(AppRoutes.svoyakRoomPattern, '/svoyak/room/:code');
      expect(AppRoutes.battlePattern, '/battle/:battleId');
      expect(AppRoutes.gameRoomPattern, '/gameroom/:code');
      expect(AppRoutes.zakovatTablePattern, '/zakovat-table/:code');
    });
  });

  group('isPublic', () {
    test('auth yo\'llari ochiq', () {
      for (final route in [
        AppRoutes.splash,
        AppRoutes.onboarding,
        AppRoutes.login,
        AppRoutes.register,
      ]) {
        expect(AppRoutes.isPublic(route), isTrue, reason: route);
      }
    });

    test('o\'yin yo\'llari yopiq', () {
      for (final route in [
        AppRoutes.home,
        AppRoutes.quiz,
        AppRoutes.daily,
        AppRoutes.premium,
        AppRoutes.svoyakRoom('ABC234'),
        AppRoutes.battle('x'),
      ]) {
        expect(AppRoutes.isPublic(route), isFalse, reason: route);
      }
    });
  });

  group('branchIndexFor', () {
    test('tab ildizlarini to\'g\'ri topadi', () {
      expect(AppRoutes.branchIndexFor(AppRoutes.home), 0);
      expect(AppRoutes.branchIndexFor(AppRoutes.leaderboard), 1);
      expect(AppRoutes.branchIndexFor(AppRoutes.svoyak), 2);
      expect(AppRoutes.branchIndexFor(AppRoutes.team), 3);
      expect(AppRoutes.branchIndexFor(AppRoutes.profile), 4);
    });

    test('ichki yo\'llar ham o\'z tabiga tegishli', () {
      expect(AppRoutes.branchIndexFor(AppRoutes.svoyakLobby), 2);
      expect(AppRoutes.branchIndexFor(AppRoutes.gameHistory), 4);
      expect(AppRoutes.branchIndexFor(AppRoutes.achievements), 4);
    });

    test('qobiqdan tashqaridagi yo\'l uchun -1', () {
      expect(AppRoutes.branchIndexFor(AppRoutes.quiz), -1);
      expect(AppRoutes.branchIndexFor(AppRoutes.login), -1);
      expect(AppRoutes.branchIndexFor(AppRoutes.zakovatTable), -1);
    });

    test('branch tartibi pastki navigatsiya bilan mos', () {
      // MainShell markazdagi Svoyak tugmasi uchun indeks 2 dan foydalanadi.
      expect(AppRoutes.shellBranches.length, 5);
      expect(AppRoutes.shellBranches[2], AppRoutes.svoyak);
    });
  });
}
