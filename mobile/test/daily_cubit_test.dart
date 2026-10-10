import 'package:dartz/dartz.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:zakovat/core/error/failure.dart';
import 'package:zakovat/core/time/server_clock.dart';
import 'package:zakovat/features/daily/domain/entities/daily_challenge.dart';
import 'package:zakovat/features/daily/domain/repositories/daily_repository.dart';
import 'package:zakovat/features/daily/presentation/cubit/daily_cubit.dart';
import 'package:zakovat/features/quiz/domain/entities/answer_outcome.dart';
import 'package:zakovat/features/quiz/domain/entities/quiz_question.dart';
import 'package:zakovat/features/quiz/domain/repositories/quiz_repository.dart';

class _MockDaily extends Mock implements DailyRepository {}

class _MockQuiz extends Mock implements QuizRepository {}

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

QuizQuestion _q(String id, {int? t}) => QuizQuestion(
      id: id,
      text: 'Savol $id',
      options: const ['A', 'B', 'C', 'D'],
      timeLimitSeconds: t,
    );

DailyChallenge _challenge({
  bool completed = false,
  int current = 2,
  int bonusPreview = 3,
  int questionCount = 2,
}) =>
    DailyChallenge(
      date: '2026-09-07',
      questions: List.generate(questionCount, (i) => _q('q$i')),
      completed: completed,
      streak: DailyStreak(current: current, longest: 5),
      bonusPreview: bonusPreview,
    );

AnswerOutcome _outcome({bool correct = true, int points = 1}) => AnswerOutcome(
      status: correct ? AnswerStatus.correct : AnswerStatus.incorrect,
      isCorrect: correct,
      explanation: '',
      correctAnswer: 'A',
      pointsEarned: points,
      streak: 1,
      betAmount: 0,
      betWon: 0,
    );

void main() {
  late _MockDaily daily;
  late _MockQuiz quiz;
  late _FakeClock clock;

  setUp(() {
    daily = _MockDaily();
    quiz = _MockQuiz();
    clock = _FakeClock();

    when(() => quiz.issueTicket(any()))
        .thenAnswer((inv) async => Right('t-${inv.positionalArguments[0]}'));
    when(() => quiz.submitAnswer(
          ticket: any(named: 'ticket'),
          userAnswer: any(named: 'userAnswer'),
          betAmount: any(named: 'betAmount'),
        )).thenAnswer((_) async => Right(_outcome()));
    when(() => daily.complete()).thenAnswer(
      (_) async => const Right(
        DailyCompletion(newStreak: 3, longestStreak: 5, streakBonus: 3),
      ),
    );
  });

  DailyCubit build() => DailyCubit(
        dailyRepository: daily,
        quizRepository: quiz,
        clock: clock,
      );

  group('yuklash', () {
    test('bugun bajarilmagan — intro ko\'rsatiladi', () async {
      when(() => daily.getToday())
          .thenAnswer((_) async => Right(_challenge()));

      final cubit = build();
      await cubit.load();

      expect(cubit.state.phase, DailyPhase.intro);
      expect(cubit.state.streak.current, 2);
      expect(cubit.state.challenge!.bonusPreview, 3);
      // Intro'da bilet OLINMAYDI — foydalanuvchi "Boshlash" bosmaguncha
      // taymer boshlanmasligi kerak.
      verifyNever(() => quiz.issueTicket(any()));

      await cubit.close();
    });

    test('bugun allaqachon bajarilgan — o\'yin boshlanmaydi', () async {
      when(() => daily.getToday())
          .thenAnswer((_) async => Right(_challenge(completed: true)));

      final cubit = build();
      await cubit.load();

      expect(cubit.state.phase, DailyPhase.alreadyCompleted);
      await cubit.start();
      expect(cubit.state.phase, DailyPhase.alreadyCompleted);

      await cubit.close();
    });

    test('premium limiti — xato xabari ko\'rsatiladi', () async {
      when(() => daily.getToday()).thenAnswer(
        (_) async => const Left(ForbiddenFailure('Kunlik limit tugadi')),
      );

      final cubit = build();
      await cubit.load();

      expect(cubit.state.phase, DailyPhase.failure);
      expect(cubit.state.errorMessage, contains('limit'));

      await cubit.close();
    });
  });

  group('o\'yin', () {
    test('start bosilgach birinchi savol uchun bilet olinadi', () async {
      when(() => daily.getToday())
          .thenAnswer((_) async => Right(_challenge()));

      final cubit = build();
      await cubit.load();
      await cubit.start();

      verify(() => quiz.issueTicket('q0')).called(1);
      verifyNever(() => quiz.issueTicket('q1'));
      expect(cubit.state.phase, DailyPhase.answering);

      await cubit.close();
    });

    test('kunlik topshiriqda GAROV yo\'q — har doim 0', () async {
      when(() => daily.getToday())
          .thenAnswer((_) async => Right(_challenge()));

      final cubit = build();
      await cubit.load();
      await cubit.start();
      await cubit.answer('A');

      verify(() => quiz.submitAnswer(
            ticket: 't-q0',
            userAnswer: 'A',
            betAmount: 0,
          )).called(1);

      await cubit.close();
    });

    test('vaqt tugasa bo\'sh javob yuboriladi', () async {
      when(() => daily.getToday()).thenAnswer(
        (_) async => Right(_challenge(questionCount: 1)),
      );

      final cubit = build();
      await cubit.load();
      await cubit.start();

      clock.advance(const Duration(seconds: 91));
      await Future<void>.delayed(const Duration(milliseconds: 250));

      verify(() => quiz.submitAnswer(
            ticket: 't-q0',
            userAnswer: '',
            betAmount: 0,
          )).called(1);

      await cubit.close();
    });
  });

  group('yakunlash', () {
    test('oxirgi savoldan keyin complete chaqiriladi', () async {
      when(() => daily.getToday()).thenAnswer(
        (_) async => Right(_challenge(questionCount: 1)),
      );

      final cubit = build();
      await cubit.load();
      await cubit.start();
      await cubit.answer('A');
      await cubit.next();

      verify(() => daily.complete()).called(1);
      expect(cubit.state.phase, DailyPhase.finished);
      expect(cubit.state.completion!.streakBonus, 3);
      expect(cubit.state.correctCount, 1);

      await cubit.close();
    });

    test('409 (allaqachon yakunlangan) — natija baribir ko\'rsatiladi',
        () async {
      when(() => daily.getToday()).thenAnswer(
        (_) async => Right(_challenge(questionCount: 1)),
      );
      when(() => daily.complete()).thenAnswer(
        (_) async => const Left(ConflictFailure('Bugun allaqachon yakunlangansiz')),
      );

      final cubit = build();
      await cubit.load();
      await cubit.start();
      await cubit.answer('A');
      await cubit.next();

      // Foydalanuvchi xato ekranini emas, natijani ko'rishi kerak.
      expect(cubit.state.phase, DailyPhase.finished);
      expect(cubit.state.completion!.streakBonus, 0);

      await cubit.close();
    });
  });

  group('streak bonus chegaralari', () {
    test('backend STREAK_BONUS_TIERS bilan bir xil', () {
      // Backend: 30→20, 14→14, 7→7, 3→3
      expect(StreakTier.bonusFor(0), 0);
      expect(StreakTier.bonusFor(2), 0);
      expect(StreakTier.bonusFor(3), 3);
      expect(StreakTier.bonusFor(6), 3);
      expect(StreakTier.bonusFor(7), 7);
      expect(StreakTier.bonusFor(13), 7);
      expect(StreakTier.bonusFor(14), 14);
      expect(StreakTier.bonusFor(29), 14);
      expect(StreakTier.bonusFor(30), 20);
      expect(StreakTier.bonusFor(100), 20);
    });

    test('keyingi chegara to\'g\'ri topiladi', () {
      expect(StreakTier.nextAfter(0)?.days, 3);
      expect(StreakTier.nextAfter(3)?.days, 7);
      expect(StreakTier.nextAfter(20)?.days, 30);
      expect(StreakTier.nextAfter(30), isNull);
    });
  });
}
