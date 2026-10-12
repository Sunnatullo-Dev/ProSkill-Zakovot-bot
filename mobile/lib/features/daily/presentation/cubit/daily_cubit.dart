import 'dart:async';

import 'package:bloc/bloc.dart';
import 'package:equatable/equatable.dart';

import '../../../../core/time/question_timer.dart';
import '../../../../core/time/server_clock.dart';
import '../../../quiz/domain/entities/answer_outcome.dart';
import '../../../quiz/domain/entities/quiz_question.dart';
import '../../../quiz/domain/repositories/quiz_repository.dart';
import '../../domain/entities/daily_challenge.dart';
import '../../domain/repositories/daily_repository.dart';

part 'daily_state.dart';

/// Kunlik topshiriq boshqaruvchisi.
///
/// ## Yakka o'yindan farqlari
///
/// | | Yakka o'yin | Kunlik topshiriq |
/// |---|---|---|
/// | Savollar | 10 ta, tasodifiy | **5 ta, hamma uchun bir xil** |
/// | Garov | bor | **yo'q** |
/// | Yakun | `/game-results` | **`/daily/complete`** (streak bonusi) |
/// | Takrorlash | cheksiz | **kuniga bir marta** |
///
/// Bilet oqimi esa **aynan bir xil**: `/api/answer/ticket` → `/api/answer`.
/// Shu sababli `QuizRepository` qayta ishlatiladi — ikkinchi marta
/// yozilmaydi.
///
/// ⚠️ `complete()` ga to'g'ri javoblar soni yuborilmaydi: backend uni
/// `daily_answers` jadvalidan o'zi hisoblaydi (kliyentga ishonmaydi).
class DailyCubit extends Cubit<DailyState> {
  DailyCubit({
    required DailyRepository dailyRepository,
    required QuizRepository quizRepository,
    required ServerClock clock,
  })  : _daily = dailyRepository,
        _quiz = quizRepository,
        _clock = clock,
        _timer = QuestionTimer(clock),
        super(const DailyState());

  final DailyRepository _daily;
  final QuizRepository _quiz;
  final ServerClock _clock;
  final QuestionTimer _timer;

  Timer? _advanceTimer;

  static const defaultQuestionSeconds = 90;
  static const _feedbackDelay = Duration(milliseconds: 2000);

  // ═══ Yuklash ════════════════════════════════════════════════════════════

  Future<void> load() async {
    _cancelTimers();
    emit(const DailyState(phase: DailyPhase.loading));

    if (!_clock.isSynced) {
      await _clock.sync();
    }

    final result = await _daily.getToday();
    if (isClosed) return;

    result.fold(
      (failure) => emit(state.copyWith(
        phase: DailyPhase.failure,
        errorMessage: failure.message,
      )),
      (challenge) {
        emit(state.copyWith(
          phase: challenge.completed
              ? DailyPhase.alreadyCompleted
              : DailyPhase.intro,
          challenge: challenge,
        ));
      },
    );
  }

  /// "Boshlash" tugmasi — intro ekranidan o'yinga o'tish.
  Future<void> start() async {
    final challenge = state.challenge;
    if (challenge == null || challenge.questions.isEmpty) return;
    if (state.phase != DailyPhase.intro) return;
    await _prepareQuestion(0);
  }

  Future<void> retry() async {
    if (state.challenge == null) {
      await load();
    } else {
      await _prepareQuestion(state.currentIndex);
    }
  }

  // ═══ Savol tayyorlash ═══════════════════════════════════════════════════

  Future<void> _prepareQuestion(int index) async {
    _cancelTimers();
    final questions = state.challenge!.questions;
    final question = questions[index];

    emit(state.copyWith(
      phase: DailyPhase.preparing,
      currentIndex: index,
      clearTicket: true,
      clearOutcome: true,
      clearSelected: true,
      clearError: true,
    ));

    final result = await _quiz.issueTicket(question.id);
    if (isClosed) return;

    result.fold(
      (failure) => emit(state.copyWith(
        phase: DailyPhase.failure,
        errorMessage: failure.message,
      )),
      (ticket) {
        final totalMs =
            (question.timeLimitSeconds ?? defaultQuestionSeconds) * 1000;

        emit(state.copyWith(
          phase: DailyPhase.answering,
          ticket: ticket,
          totalMs: totalMs,
          remainingMs: totalMs,
        ));

        _timer.start(
          durationMs: totalMs,
          onTick: (remaining) {
            if (isClosed) return;
            emit(state.copyWith(remainingMs: remaining));
          },
          onExpired: () {
            if (isClosed) return;
            unawaited(_send(userAnswer: '', timedOut: true));
          },
        );
      },
    );
  }

  // ═══ Javob ══════════════════════════════════════════════════════════════

  Future<void> answer(String userAnswer) async {
    if (!state.canAnswer) return;
    _timer.stop();
    emit(state.copyWith(
      phase: DailyPhase.submitting,
      selectedAnswer: userAnswer,
    ));
    await _send(userAnswer: userAnswer);
  }

  Future<void> _send({
    required String userAnswer,
    bool timedOut = false,
  }) async {
    final ticket = state.ticket;
    final question = state.currentQuestion;
    if (ticket == null || question == null) return;

    if (state.phase != DailyPhase.submitting) {
      emit(state.copyWith(phase: DailyPhase.submitting));
    }

    // Kunlik topshiriqda garov yo'q — har doim 0.
    final result = await _quiz.submitAnswer(
      ticket: ticket,
      userAnswer: userAnswer,
      betAmount: 0,
    );

    if (isClosed) return;

    result.fold(
      (failure) {
        if (failure.code == 409) {
          // Bilet allaqachon sarflangan — savolni o'tkazib yuboramiz.
          _record(question: question, outcome: null);
          emit(state.copyWith(phase: DailyPhase.feedback));
          _scheduleAdvance();
          return;
        }
        emit(state.copyWith(
          phase: DailyPhase.failure,
          errorMessage: failure.message,
        ));
      },
      (outcome) {
        final marked = outcome.copyWith(wasTimeout: timedOut);
        _record(question: question, outcome: marked);
        emit(state.copyWith(phase: DailyPhase.feedback, outcome: marked));
        _scheduleAdvance();
      },
    );
  }

  void _record({required QuizQuestion question, AnswerOutcome? outcome}) {
    emit(state.copyWith(
      answers: [...state.answers, outcome],
      earnedPoints: state.earnedPoints + (outcome?.pointsEarned ?? 0),
    ));
  }

  void _scheduleAdvance() {
    _advanceTimer?.cancel();
    _advanceTimer = Timer(_feedbackDelay, () {
      if (isClosed) return;
      unawaited(next());
    });
  }

  Future<void> next() async {
    if (state.phase != DailyPhase.feedback) return;
    _advanceTimer?.cancel();

    final nextIndex = state.currentIndex + 1;
    if (nextIndex < state.challenge!.questions.length) {
      await _prepareQuestion(nextIndex);
    } else {
      await _complete();
    }
  }

  // ═══ Yakunlash ══════════════════════════════════════════════════════════

  Future<void> _complete() async {
    _cancelTimers();
    emit(state.copyWith(phase: DailyPhase.submitting));

    final result = await _daily.complete();
    if (isClosed) return;

    result.fold(
      (failure) {
        // 409 — allaqachon yakunlangan. Bu xato emas: foydalanuvchi
        // ikki qurilmada o'ynagan bo'lishi mumkin. Natijani baribir
        // ko'rsatamiz, faqat bonusni 0 deb belgilaymiz.
        if (failure.code == 409) {
          emit(state.copyWith(
            phase: DailyPhase.finished,
            completion: DailyCompletion(
              newStreak: state.challenge?.streak.current ?? 0,
              longestStreak: state.challenge?.streak.longest ?? 0,
              streakBonus: 0,
            ),
          ));
          return;
        }
        emit(state.copyWith(
          phase: DailyPhase.failure,
          errorMessage: failure.message,
        ));
      },
      (completion) => emit(state.copyWith(
        phase: DailyPhase.finished,
        completion: completion,
      )),
    );
  }

  void _cancelTimers() {
    _timer.stop();
    _advanceTimer?.cancel();
    _advanceTimer = null;
  }

  @override
  Future<void> close() {
    _cancelTimers();
    _timer.dispose();
    return super.close();
  }
}
