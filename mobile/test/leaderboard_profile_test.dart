import 'package:dartz/dartz.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:zakovat/core/error/failure.dart';
import 'package:zakovat/features/auth/domain/repositories/auth_repository.dart';
import 'package:zakovat/features/leaderboard/domain/entities/leaderboard.dart';
import 'package:zakovat/features/leaderboard/domain/repositories/leaderboard_repository.dart';
import 'package:zakovat/features/leaderboard/presentation/cubit/leaderboard_cubit.dart';
import 'package:zakovat/features/profile/domain/entities/achievement.dart';
import 'package:zakovat/features/profile/domain/entities/game_stats.dart';
import 'package:zakovat/features/profile/domain/repositories/profile_repository.dart';
import 'package:zakovat/features/profile/presentation/cubit/profile_cubit.dart';

class _MockLeaderboard extends Mock implements LeaderboardRepository {}

class _MockProfile extends Mock implements ProfileRepository {}

class _MockAuth extends Mock implements AuthRepository {}

LeaderboardPage _page({int myRank = 7, int myScore = 42, int count = 3}) =>
    LeaderboardPage(
      entries: List.generate(
        count,
        (i) => LeaderboardEntry(
          rank: i + 1,
          telegramId: 1000 + i,
          name: 'User $i',
          score: 100 - i * 10,
        ),
      ),
      myRank: myRank,
      myScore: myScore,
    );

void main() {
  // Mocktail `any(named: ...)` non-nullable maxsus tiplar uchun
  // fallback qiymat talab qiladi.
  setUpAll(() => registerFallbackValue(LeaderboardPeriod.all));

  // ═══ Reyting ═════════════════════════════════════════════════════════════

  group('LeaderboardCubit', () {
    late _MockLeaderboard repo;

    setUp(() {
      repo = _MockLeaderboard();
      when(() => repo.getLeaderboard(
            period: any(named: 'period'),
            limit: any(named: 'limit'),
          )).thenAnswer((_) async => Right(_page()));
      when(() => repo.getReferrals(period: any(named: 'period')))
          .thenAnswer((_) async => Right(_page(myRank: 0, myScore: 4)));
    });

    test('boshlanishida umumiy reyting yuklanadi', () async {
      final cubit = LeaderboardCubit(repo);
      await cubit.load();

      expect(cubit.state.tab, LeaderboardTab.overall);
      expect(cubit.state.status, LeaderboardStatus.success);
      expect(cubit.state.currentPage!.entries.length, 3);
      verify(() => repo.getLeaderboard(
            period: LeaderboardPeriod.all,
            limit: any(named: 'limit'),
          )).called(1);

      await cubit.close();
    });

    test('tab almashganda mos endpoint chaqiriladi', () async {
      final cubit = LeaderboardCubit(repo);
      await cubit.load();

      await cubit.selectTab(LeaderboardTab.monthly);
      verify(() => repo.getLeaderboard(
            period: LeaderboardPeriod.monthly,
            limit: any(named: 'limit'),
          )).called(1);

      await cubit.selectTab(LeaderboardTab.referrals);
      verify(() => repo.getReferrals(period: any(named: 'period'))).called(1);

      await cubit.close();
    });

    test('keshlangan tabga qaytishda qayta so\'rov YUBORILMAYDI', () async {
      final cubit = LeaderboardCubit(repo);
      await cubit.load();
      await cubit.selectTab(LeaderboardTab.monthly);
      await cubit.selectTab(LeaderboardTab.overall);

      // "overall" faqat bir marta yuklangan bo'lishi kerak.
      verify(() => repo.getLeaderboard(
            period: LeaderboardPeriod.all,
            limit: any(named: 'limit'),
          )).called(1);

      await cubit.close();
    });

    test('pull-to-refresh eski ro\'yxatni ekranda qoldiradi', () async {
      final cubit = LeaderboardCubit(repo);
      await cubit.load();

      final states = <LeaderboardStatus>[];
      final sub = cubit.stream.listen((s) => states.add(s.status));

      await cubit.refresh();
      await sub.cancel();

      // refresh loading holatini emit QILMASLIGI kerak — aks holda
      // ro'yxat o'rniga spinner chiqib, ekran "sakraydi".
      expect(states, isNot(contains(LeaderboardStatus.loading)));

      await cubit.close();
    });

    test('xato — kesh yo\'q bo\'lsa failure', () async {
      when(() => repo.getLeaderboard(
            period: any(named: 'period'),
            limit: any(named: 'limit'),
          )).thenAnswer((_) async => const Left(NetworkFailure()));

      final cubit = LeaderboardCubit(repo);
      await cubit.load();

      expect(cubit.state.status, LeaderboardStatus.failure);
      expect(cubit.state.hasData, isFalse);

      await cubit.close();
    });

    test('taklif tabida birlik "kishi"', () async {
      final cubit = LeaderboardCubit(repo);
      await cubit.load();
      expect(cubit.state.unitLabel, 'ball');

      await cubit.selectTab(LeaderboardTab.referrals);
      expect(cubit.state.unitLabel, 'kishi');

      await cubit.close();
    });

    test('o\'zim ro\'yxatda bo\'lsam aniqlanadi', () {
      final page = _page();
      expect(page.containsMe(1000), isTrue);
      expect(page.containsMe(9999), isFalse);
    });
  });

  // ═══ Profil ══════════════════════════════════════════════════════════════

  group('ProfileCubit', () {
    late _MockProfile profile;
    late _MockAuth auth;

    setUp(() {
      profile = _MockProfile();
      auth = _MockAuth();
      when(() => profile.getStats()).thenAnswer(
        (_) async => const Right(GameStats(
          gamesPlayed: 12,
          accuracy: 68,
          bestRoundScore: 22,
          totalCorrect: 80,
        )),
      );
      when(() => auth.updateLanguage(any()))
          .thenAnswer((_) async => const Right(unit));
    });

    ProfileCubit build() =>
        ProfileCubit(profileRepository: profile, authRepository: auth);

    test('statistika yuklanadi', () async {
      final cubit = build();
      await cubit.load();

      expect(cubit.state.status, ProfileStatus.success);
      expect(cubit.state.stats.gamesPlayed, 12);
      expect(cubit.state.stats.accuracy, 68);

      await cubit.close();
    });

    test('til o\'zgartirilganda serverga yuboriladi', () async {
      final cubit = build();
      await cubit.changeLanguage('ru');

      verify(() => auth.updateLanguage('ru')).called(1);
      expect(cubit.state.pendingLanguage, 'ru');
      expect(cubit.state.isSavingLanguage, isFalse);
      expect(cubit.state.languageSaved, isTrue);

      await cubit.close();
    });

    test('til saqlanmasa eski qiymatga qaytadi', () async {
      when(() => auth.updateLanguage(any()))
          .thenAnswer((_) async => const Left(NetworkFailure()));

      final cubit = build();
      await cubit.changeLanguage('ru');

      expect(cubit.state.pendingLanguage, isNull);
      expect(cubit.state.errorMessage, isNotNull);

      await cubit.close();
    });

    test('til kodlari backend qabul qiladigan qiymatlar', () {
      // Backend `users/views.py::SUPPORTED_LANGUAGES`
      const supported = {'uz-latn', 'uz-cyrl', 'ru'};
      for (final lang in AppLanguage.values) {
        expect(supported, contains(lang.code), reason: lang.name);
      }
    });
  });

  // ═══ Yutuqlar ════════════════════════════════════════════════════════════

  group('Achievement', () {
    test('backend achievements.py bilan bir xil id va bonus', () {
      // Manba: apps/users/achievements.py
      const expected = {
        'first-game': 5,
        'ten-games': 15,
        'score-100': 20,
        'score-500': 50,
        'best-round': 25,
      };

      expect(Achievement.all.length, expected.length);
      for (final a in Achievement.all) {
        expect(expected, contains(a.id));
        expect(a.bonus, expected[a.id], reason: a.id);
      }
    });

    test('progress statistikadan to\'g\'ri hisoblanadi', () {
      const stats = GameStats(
        gamesPlayed: 4,
        accuracy: 50,
        bestRoundScore: 12,
        totalCorrect: 20,
      );

      final tenGames = Achievement.all.firstWhere((a) => a.id == 'ten-games');
      expect(tenGames.progress(stats, 0), 4);
      expect(tenGames.ratio(stats, 0), closeTo(0.4, 0.001));

      final score100 = Achievement.all.firstWhere((a) => a.id == 'score-100');
      expect(score100.progress(stats, 250), 100); // target bilan cheklanadi
      expect(score100.ratio(stats, 250), 1.0);

      final bestRound = Achievement.all.firstWhere((a) => a.id == 'best-round');
      expect(bestRound.progress(stats, 0), 12);
    });
  });
}
