import 'package:bloc_test/bloc_test.dart';
import 'package:dartz/dartz.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:zakovat/core/error/failure.dart';
import 'package:zakovat/core/time/server_clock.dart';
import 'package:zakovat/features/auth/domain/entities/app_user.dart';
import 'package:zakovat/features/quiz/domain/entities/answer_outcome.dart';
import 'package:zakovat/features/quiz/domain/entities/quiz_question.dart';
import 'package:zakovat/features/quiz/domain/repositories/quiz_repository.dart';
import 'package:zakovat/features/quiz/presentation/cubit/quiz_cubit.dart';

class _MockRepository extends Mock implements QuizRepository {}

class _FakeClock extends Fake implements ServerClock {
  int _now = 1700000000000;

  @override
  bool get isSynced => true;

  @override
  Future<bool> sync() async => true;

  @override
  int nowEpochMs() => _now;

  void advance(Duration d) => _now += d.inMilliseconds;
}

QuizQuestion _question(String id, {int? timeLimit}) => QuizQuestion(
      id: id,
      text: 'Savol $id',
      options: const ['A javob', 'B javob', 'C javob', 'D javob'],
      timeLimitSeconds: timeLimit,
    );

AnswerOutcome _outcome({
  AnswerStatus status = AnswerStatus.correct,
  int points = 2,
  int streak = 1,
  int betAmount = 0,
  int betWon = 0,
}) =>
    AnswerOutcome(
      status: status,
      isCorrect: status != AnswerStatus.incorrect,
      explanation: 'izoh',
      correctAnswer: 'A javob',
      pointsEarned: points,
      streak: streak,
      betAmount: betAmount,
      betWon: betWon,
    );

void main() {
  late _MockRepository repository;
  late _FakeClock clock;

  setUp(() {
    repository = _MockRepository();
    clock = _FakeClock();

    // Standart baxtli yo'l.
    when(() => repository.issueTicket(any()))
        .thenAnswer((inv) async => Right('ticket-${inv.positionalArguments[0]}'));
    when(() => repository.saveResult(
          correctCount: any(named: 'correctCount'),
          totalCount: any(named: 'totalCount'),
          roundScore: any(named: 'roundScore'),
        )).thenAnswer((_) async => const Right(unit));
    when(() => repository.checkAchievements()).thenAnswer(
      (_) async => const Right((<UnlockedAchievement>[], 0, null)),
    );
  });

  void stubRound(List<QuizQuestion> questions) {
    when(() => repository.getRound(
          count: any(named: 'count'),
          category: any(named: 'category'),
          difficulty: any(named: 'difficulty'),
        )).thenAnswer((_) async => Right(questions));
  }

  QuizCubit build() => QuizCubit(repository: repository, clock: clock);

  // ═══ Bilet oqimi ═════════════════════════════════════════════════════════

  group('bilet oqimi', () {
    test('bilet HAR savol uchun alohida va o\'z vaqtida olinadi', () async {
      stubRound([_question('q1'), _question('q2')]);
      when(() => repository.submitAnswer(
            ticket: any(named: 'ticket'),
            userAnswer: any(named: 'userAnswer'),
            betAmount: any(named: 'betAmount'),
          )).thenAnswer((_) async => Right(_outcome()));

      final cubit = build();
      await cubit.startRound();

      // Raund boshida FAQAT birinchi savolning bileti olinishi kerak —
      // oldindan hammasini olish taymerni buzardi.
      verify(() => repository.issueTicket('q1')).called(1);
      verifyNever(() => repository.issueTicket('q2'));

      await cubit.answer('A javob');
      await cubit.next();

      // Endi ikkinchisi olinadi.
      verify(() => repository.issueTicket('q2')).called(1);

      await cubit.close();
    });

    test('olingan bilet javob bilan birga yuboriladi', () async {
      stubRound([_question('q1')]);
      when(() => repository.submitAnswer(
            ticket: any(named: 'ticket'),
            userAnswer: any(named: 'userAnswer'),
            betAmount: any(named: 'betAmount'),
          )).thenAnswer((_) async => Right(_outcome()));

      final cubit = build();
      await cubit.startRound();
      await cubit.answer('A javob');

      verify(() => repository.submitAnswer(
            ticket: 'ticket-q1',
            userAnswer: 'A javob',
            betAmount: 0,
          )).called(1);

      await cubit.close();
    });

    test('bilet olishda xato — failure holatiga o\'tadi', () async {
      stubRound([_question('q1')]);
      when(() => repository.issueTicket(any()))
          .thenAnswer((_) async => const Left(RateLimitFailure()));

      final cubit = build();
      await cubit.startRound();

      expect(cubit.state.phase, QuizPhase.failure);
      expect(cubit.state.ticket, isNull);

      await cubit.close();
    });

    test('409 (bilet ishlatilgan) — savol o\'tkazib yuboriladi, qotib qolmaydi',
        () async {
      stubRound([_question('q1'), _question('q2')]);
      when(() => repository.submitAnswer(
            ticket: any(named: 'ticket'),
            userAnswer: any(named: 'userAnswer'),
            betAmount: any(named: 'betAmount'),
          )).thenAnswer(
        (_) async => const Left(ConflictFailure('Bu bilet allaqachon ishlatilgan')),
      );

      final cubit = build();
      await cubit.startRound();
      await cubit.answer('A javob');

      expect(cubit.state.phase, QuizPhase.feedback);
      expect(cubit.state.entries.single.skipped, isTrue);

      await cubit.close();
    });
  });

  // ═══ Vaqt tugashi ════════════════════════════════════════════════════════

  group('vaqt tugashi', () {
    test('timeout bo\'sh javob va GAROVSIZ yuboriladi', () async {
      stubRound([_question('q1', timeLimit: 1)]);
      when(() => repository.submitAnswer(
            ticket: any(named: 'ticket'),
            userAnswer: any(named: 'userAnswer'),
            betAmount: any(named: 'betAmount'),
          )).thenAnswer(
        (_) async => Right(_outcome(
          status: AnswerStatus.incorrect,
          points: 0,
          streak: 0,
        )),
      );

      final cubit = build();
      await cubit.startRound(startingScore: 100);

      // Foydalanuvchi 20 ball tikdi
      cubit.setBet(20);
      expect(cubit.state.betAmount, 20);

      // Vaqt tugadi
      clock.advance(const Duration(seconds: 2));
      await Future<void>.delayed(const Duration(milliseconds: 250));

      // ⚠️ Eng muhim tekshiruv: garov 0 bo'lishi SHART.
      // Aks holda backend'ning grace oynasida garov yechilib ketardi.
      verify(() => repository.submitAnswer(
            ticket: 'ticket-q1',
            userAnswer: '',
            betAmount: 0,
          )).called(1);

      await cubit.close();
    });
  });

  // ═══ Garov ═══════════════════════════════════════════════════════════════

  group('garov', () {
    test('balansdan katta garov rad etiladi', () async {
      stubRound([_question('q1')]);
      final cubit = build();
      await cubit.startRound(startingScore: 10);

      cubit.setBet(50); // balans 10 — qabul qilinmasligi kerak
      expect(cubit.state.betAmount, 0);

      cubit.setBet(10); // aynan balans — mumkin
      expect(cubit.state.betAmount, 10);

      await cubit.close();
    });

    test('noto\'g\'ri qiymat rad etiladi', () async {
      stubRound([_question('q1')]);
      final cubit = build();
      await cubit.startRound(startingScore: 1000);

      cubit.setBet(7); // VALID_BETS da yo'q
      expect(cubit.state.betAmount, 0);

      await cubit.close();
    });

    test('garov yutug\'i balansda aks etadi', () async {
      stubRound([_question('q1')]);
      when(() => repository.submitAnswer(
            ticket: any(named: 'ticket'),
            userAnswer: any(named: 'userAnswer'),
            betAmount: any(named: 'betAmount'),
          )).thenAnswer(
        (_) async => Right(_outcome(points: 2, betAmount: 10, betWon: 10)),
      );

      final cubit = build();
      await cubit.startRound(startingScore: 100);
      cubit.setBet(10);
      await cubit.answer('A javob');

      // 100 + 2 (ball) + 10 (garov) = 112
      expect(cubit.state.liveScore, 112);

      await cubit.close();
    });
  });

  // ═══ "Javobni bilmayman" ═════════════════════════════════════════════════

  group('giveUp', () {
    test('reveal chaqiriladi va savol skipped deb yoziladi', () async {
      stubRound([_question('q1')]);
      when(() => repository.revealAnswer(any())).thenAnswer(
        (_) async => const Right(
          RevealedAnswer(correctAnswer: 'A javob', explanation: 'izoh'),
        ),
      );

      final cubit = build();
      await cubit.startRound();
      await cubit.giveUp();

      verify(() => repository.revealAnswer('ticket-q1')).called(1);
      expect(cubit.state.phase, QuizPhase.feedback);
      expect(cubit.state.revealed, isNotNull);
      expect(cubit.state.entries.single.skipped, isTrue);
      expect(cubit.state.entries.single.points, 0);

      // Submit CHAQIRILMASLIGI kerak — bilet allaqachon sarflangan.
      verifyNever(() => repository.submitAnswer(
            ticket: any(named: 'ticket'),
            userAnswer: any(named: 'userAnswer'),
            betAmount: any(named: 'betAmount'),
          ));

      await cubit.close();
    });
  });

  // ═══ Raund yakuni ════════════════════════════════════════════════════════

  group('raund yakuni', () {
    test('roundScore ga garov QO\'SHILMAYDI (backend cheklovi)', () async {
      stubRound([_question('q1')]);
      when(() => repository.submitAnswer(
            ticket: any(named: 'ticket'),
            userAnswer: any(named: 'userAnswer'),
            betAmount: any(named: 'betAmount'),
          )).thenAnswer(
        (_) async => Right(_outcome(points: 3, betAmount: 50, betWon: 50)),
      );

      final cubit = build();
      await cubit.startRound(startingScore: 100);
      cubit.setBet(50);
      await cubit.answer('A javob');
      await cubit.next();

      // Backend `roundScore <= totalCount * 3` tekshiradi.
      // 1 ta savol → maksimum 3. Garov (50) qo'shilsa 53 bo'lib 400 xato bo'lardi.
      verify(() => repository.saveResult(
            correctCount: 1,
            totalCount: 1,
            roundScore: 3,
          )).called(1);

      // Garov esa yakunda alohida ko'rsatiladi.
      expect(cubit.state.summary!.betNet, 50);

      await cubit.close();
    });

    test('natija saqlangach yutuqlar tekshiriladi', () async {
      stubRound([_question('q1')]);
      when(() => repository.submitAnswer(
            ticket: any(named: 'ticket'),
            userAnswer: any(named: 'userAnswer'),
            betAmount: any(named: 'betAmount'),
          )).thenAnswer((_) async => Right(_outcome()));
      when(() => repository.checkAchievements()).thenAnswer(
        (_) async => const Right((
          [UnlockedAchievement(id: 'first-game', label: 'Birinchi qadam', bonus: 5)],
          5,
          AppUser(
            id: '1',
            telegramId: 2000000000001,
            score: 107,
            language: 'uz-latn',
            currentStreak: 1,
            authProvider: 'phone',
            isAppAccount: true,
            hasPassword: true,
            isPremium: false,
          ),
        )),
      );

      final cubit = build();
      await cubit.startRound();
      await cubit.answer('A javob');
      await cubit.next();

      verify(() => repository.checkAchievements()).called(1);
      expect(cubit.state.phase, QuizPhase.finished);
      expect(cubit.state.summary!.newlyUnlocked.single.id, 'first-game');
      expect(cubit.state.summary!.achievementBonus, 5);
      expect(cubit.updatedUser?.score, 107);

      await cubit.close();
    });

    test('yutuq tekshiruvi xatosi raundni buzmaydi', () async {
      stubRound([_question('q1')]);
      when(() => repository.submitAnswer(
            ticket: any(named: 'ticket'),
            userAnswer: any(named: 'userAnswer'),
            betAmount: any(named: 'betAmount'),
          )).thenAnswer((_) async => Right(_outcome()));
      when(() => repository.checkAchievements())
          .thenAnswer((_) async => const Left(NetworkFailure()));

      final cubit = build();
      await cubit.startRound();
      await cubit.answer('A javob');
      await cubit.next();

      expect(cubit.state.phase, QuizPhase.finished);
      expect(cubit.state.summary, isNotNull);

      await cubit.close();
    });

    test('aniqlik va eng uzun streak to\'g\'ri hisoblanadi', () async {
      stubRound([_question('q1'), _question('q2')]);
      var call = 0;
      when(() => repository.submitAnswer(
            ticket: any(named: 'ticket'),
            userAnswer: any(named: 'userAnswer'),
            betAmount: any(named: 'betAmount'),
          )).thenAnswer((_) async {
        call++;
        return Right(
          call == 1
              ? _outcome(streak: 4)
              : _outcome(status: AnswerStatus.incorrect, points: 0, streak: 0),
        );
      });

      final cubit = build();
      await cubit.startRound();
      await cubit.answer('A javob');
      await cubit.next();
      await cubit.answer('B javob');
      await cubit.next();

      final summary = cubit.state.summary!;
      expect(summary.totalCount, 2);
      expect(summary.correctCount, 1);
      expect(summary.accuracyPercent, 50);
      expect(summary.bestStreak, 4);

      await cubit.close();
    });
  });

  // ═══ Xatolar ═════════════════════════════════════════════════════════════

  group('xatolar', () {
    blocTest<QuizCubit, QuizState>(
      'savollar bo\'sh kelsa tushunarli xabar',
      setUp: () => stubRound([]),
      build: build,
      act: (cubit) => cubit.startRound(),
      expect: () => [
        isA<QuizState>().having((s) => s.phase, 'phase', QuizPhase.loading),
        isA<QuizState>()
            .having((s) => s.phase, 'phase', QuizPhase.failure)
            .having((s) => s.errorMessage, 'xabar', contains('topilmadi')),
      ],
    );

    test('premium limiti (403) foydalanuvchiga ko\'rsatiladi', () async {
      when(() => repository.getRound(
            count: any(named: 'count'),
            category: any(named: 'category'),
            difficulty: any(named: 'difficulty'),
          )).thenAnswer(
        (_) async => const Left(
          ForbiddenFailure('O\'yin uchun bugungi bepul limit tugadi (5/5). Premium oling.'),
        ),
      );

      final cubit = build();
      await cubit.startRound();

      expect(cubit.state.phase, QuizPhase.failure);
      expect(cubit.state.errorMessage, contains('Premium'));

      await cubit.close();
    });
  });
}
