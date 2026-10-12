import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:zakovat/core/network/api_paths.dart';
import 'package:zakovat/core/router/app_routes.dart';
import 'package:zakovat/features/svoyak/presentation/svoyak_theme.dart';

void main() {
  group('Svoyak Theme & Colors parity with Telegram Mini App', () {
    test('rang konstantalari Telegram Mini App bilan bir xil', () {
      // --svoyak-bg: #0a1428
      expect(SvoyakTheme.bg, const Color(0xFF0A1428));
      // --svoyak-surface: #0f1f3a
      expect(SvoyakTheme.surface, const Color(0xFF0F1F3A));
      // --svoyak-border: #1f3a6e
      expect(SvoyakTheme.border, const Color(0xFF1F3A6E));
      // --svoyak-gold: #f5c842
      expect(SvoyakTheme.gold, const Color(0xFFF5C842));
      // --svoyak-orange: #ff8a4c
      expect(SvoyakTheme.orange, const Color(0xFFFF8A4C));
      // --svoyak-neon-green: #22e07f
      expect(SvoyakTheme.neonGreen, const Color(0xFF22E07F));
      // --svoyak-neon-red: #ef4444
      expect(SvoyakTheme.neonRed, const Color(0xFFEF4444));
      // --svoyak-blue: #4da6ff
      expect(SvoyakTheme.blue, const Color(0xFF4DA6FF));
      // --text: #ffffff
      expect(SvoyakTheme.text, const Color(0xFFFFFFFF));
      // --muted: #8892a4
      expect(SvoyakTheme.muted, const Color(0xFF8892A4));
    });

    test('gradient va kartochka bezaklari mavjud', () {
      expect(SvoyakTheme.goldGradient.colors.first, SvoyakTheme.gold);
      expect(SvoyakTheme.goldGradient.colors.last, SvoyakTheme.orange);
      expect(SvoyakTheme.cardDecoration.color, SvoyakTheme.surface);
    });
  });

  group('Svoyak API endpoint yo\'llari', () {
    test('backend bilan to\'liq mos yo\'llar', () {
      expect(ApiPaths.svoyakCategories, '/api/svoyak/categories');
      expect(ApiPaths.svoyakRooms, '/api/svoyak/rooms');
      expect(ApiPaths.svoyakRoomJoin('AB12CD'), '/api/svoyak/rooms/AB12CD/join');
      expect(ApiPaths.svoyakRoomState('AB12CD'), '/api/svoyak/rooms/AB12CD/state');
      expect(ApiPaths.svoyakRoomStart('AB12CD'), '/api/svoyak/rooms/AB12CD/start');
      expect(ApiPaths.svoyakRoomAutoAnswer('AB12CD'), '/api/svoyak/rooms/AB12CD/auto-answer');
      expect(ApiPaths.svoyakRoomLeave('AB12CD'), '/api/svoyak/rooms/AB12CD/leave');
      expect(ApiPaths.svoyakRoomEnd('AB12CD'), '/api/svoyak/rooms/AB12CD/end');
    });
  });

  group('Svoyak Router va Shell integratsiyasi', () {
    test('Svoyak tab Shell index 2 ga tegishli', () {
      expect(AppRoutes.branchIndexFor(AppRoutes.svoyak), 2);
      expect(AppRoutes.branchIndexFor(AppRoutes.svoyakLobby), 2);
    });

    test('Svoyak xona yo\'li to\'g\'ri formatlanadi', () {
      expect(AppRoutes.svoyakRoom('ROOM01'), '/svoyak/room/ROOM01');
      expect(AppRoutes.svoyakAuto('AUTO01'), '/svoyak/auto/AUTO01');
    });
  });
}
