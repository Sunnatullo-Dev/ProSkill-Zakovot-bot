import 'dart:async';

import 'package:bloc/bloc.dart';
import 'package:equatable/equatable.dart';

import '../../../../core/time/question_timer.dart';
import '../../../../core/time/server_clock.dart';
import '../../../auth/domain/entities/app_user.dart';
import '../../domain/entities/answer_outcome.dart';
import '../../domain/entities/quiz_question.dart';
import '../../domain/entities/round_summary.dart';
import '../../domain/repositories/quiz_repository.dart';

part 'quiz_state.dart';

/// Yakka o'yin boshqaruvchisi.
///
/// ## Bilet oqimi (eng muhim qism)
///
/// Backend javob berish vaqtini **bilet chiqarilgan paytdan** o'lchaydi
/// (`answers/tickets.py` → `issued_at_ms`). Shundan kelib chiqadigan
/// qat'iy qoidalar:
///
/// 1. **Biletlar oldindan olinmaydi.** Har savol ko'rsatilishidan darhol
///    oldin bittadan olinadi. Aks holda 10-savolning bileti 1-savol
///    paytida chiqarilgan bo'lardi va foydalanuvchining vaqti allaqachon
///    tugagan bo'lardi.
/// 2. **Bilet bir martalik.** `submitAnswer` ham, `revealAnswer` ham uni
///    sarflaydi — ikkinchi urinish 409 qaytaradi.
/// 3. **Taymer bilet kelgan paytdan boshlanadi**, savol ekranga
///    chizilgan paytdan emas.
///
/// ## Vaqt tugaganda nima bo'ladi
///
/// Bo'sh javob yuboriladi, **lekin `betAmount: 0` bilan**.
/// Sabab: backend'ning o'z timeout tarmog'i (`_timeout_response`) ham
/// garovni yechmaydi va `betWon: 0` qaytaradi. Agar biz garovni yuborsak
/// va so'rov backend'ning 10 soniyalik grace oynasiga tushib qolsa, u
/// javobni "haqiqiy" deb qabul qilib garovni yechib yuborardi — bu
/// foydalanuvchini adolatsiz jazolash bo'lardi.
///
/// ## Server soati
///
/// Taymer `ServerClock` ga tayanadi — qurilma soatiga emas. Foydalanuvchi
/// telefon vaqtini o'zgartirib taymerni to'xtata olmaydi.
class QuizCubit extends Cubit<QuizState> {
  QuizCubit({
    required QuizRepository repository,
    required ServerClock clock,
  })  : _repository = repository,
        _clock = clock,
        _timer = QuestionTimer(clock),
        super(const QuizState());

  final QuizRepository _repository;
  final ServerClock _clock;

  /// Taymer mantig'i `core/time/question_timer.dart` da — Kunlik topshiriq
  /// ham xuddi shu klassni ishlatadi.
  final QuestionTimer _timer;
  Timer? _advanceTimer;

  /// Savol uchun standart vaqt — savolda `timeLimitSeconds` bo'lmasa.
  ///
  /// Backend ham aynan shu qiymatga qaytadi (`answers/views.py`:
  /// `question.get("timeLimitSeconds") or 90`).
  static const defaultQuestionSeconds = 90;

  /// Natijani ko'rsatib turish vaqti.
  static const _feedbackDelay = Duration(milliseconds: 2000);
  static const _partialFeedbackDelay = Duration(milliseconds: 2500);

  /// Foydalanuvchi natijadan oldin yangilangan profilni oladi.
  AppUser? updatedUser;

  // ═══ Raundni boshlash ═══════════════════════════════════════════════════

  Future<void> startRound({String? difficulty, int startingScore = 0}) async {
    _cancelTimers();
    emit(QuizState(
      phase: QuizPhase.loading,
      difficulty: difficulty,
      liveScore: startingScore,
    ));

    // Taymer aniq bo'lishi uchun server soatini tekshiramiz.
    if (!_clock.isSynced) {
      await _clock.sync();
    }

    final result = await _repository.getRound(
      count: 10,
      difficulty: difficulty,
    );

    if (isClosed) return;

    await result.fold(
      (failure) async {
        emit(state.copyWith(
          phase: QuizPhase.failure,
          errorMessage: failure.message,
        ));
      },
      (questions) async {
        if (questions.isEmpty) {
          emit(state.copyWith(
            phase: QuizPhase.failure,
            errorMessage: 'Savollar topilmadi. Keyinroq urinib ko\'ring.',
          ));
          return;
        }
        emit(state.copyWith(questions: questions, currentIndex: 0));
        await _prepareQuestion(0);
      },
    );
  }

  /// Xatodan keyin qayta urinish.
  Future<void> retry() async {
    if (state.questions.isEmpty) {
      await startRound(
        difficulty: state.difficulty,
        startingScore: state.liveScore,
      );
    } else {
      await _prepareQuestion(state.currentIndex);
    }
  }

  // ═══ Savolga tayyorgarlik: bilet olish ══════════════════════════════════

  Future<void> _prepareQuestion(int index) async {
    _cancelTimers();

    final question = state.questions[index];

    emit(state.copyWith(
      phase: QuizPhase.preparing,
      currentIndex: index,
      betAmount: 0,
      clearTicket: true,
      clearOutcome: true,
      clearRevealed: true,
      clearSelected: true,
      clearError: true,
    ));

    final result = await _repository.issueTicket(question.id);
    if (isClosed) return;

    result.fold(
      (failure) => emit(state.copyWith(
        phase: QuizPhase.failure,
        errorMessage: failure.message,
      )),
      (ticket) {
        final seconds = question.timeLimitSeconds ?? defaultQuestionSeconds;
        final totalMs = seconds * 1000;

        // Deadline server soati bo'yicha. Bilet biz uni olgunimizcha
        // chiqarilgan bo'ladi, ya'ni bizning deadline servernikidan
        // bir oz kechroq — backend'ning 10 soniyalik grace oynasi buni
        // bemalol qoplaydi.
        final deadline = _clock.nowEpochMs() + totalMs;

        emit(state.copyWith(
          phase: QuizPhase.answering,
          ticket: ticket,
          deadlineEpochMs: deadline,
          totalMs: totalMs,
          remainingMs: totalMs,
        ));

        _startTicker(totalMs);
      },
    );
  }

  // ═══ Taymer ═════════════════════════════════════════════════════════════

  void _startTicker(int durationMs) {
    _timer.start(
      durationMs: durationMs,
      onTick: (remaining) {
        if (isClosed) return;
        emit(state.copyWith(remainingMs: remaining));
      },
      onExpired: () {
        if (isClosed) return;
        unawaited(_handleTimeout());
      },
    );
  }

  void _cancelTimers() {
    _timer.stop();
    _advanceTimer?.cancel();
    _advanceTimer = null;
  }

  // ═══ Garov ══════════════════════════════════════════════════════════════

  /// Garovni o'rnatadi. Faqat `answering` bosqichida ishlaydi.
  void setBet(int amount) {
    if (!state.canChangeBet) return;
    if (!QuizRepositoryBets.isValid(amount)) return;
    // Ballari yetmasa qabul qilmaymiz — server ham 400 qaytaradi.
    if (amount > state.liveScore) return;
    emit(state.copyWith(betAmount: amount));
  }

  // ═══ Javob yuborish ═════════════════════════════════════════════════════

  /// Foydalanuvchi variant tanladi yoki matn kiritdi.
  Future<void> answer(String userAnswer) async {
    if (!state.canAnswer) return;

    _timer.stop();
    emit(state.copyWith(
      phase: QuizPhase.submitting,
      selectedAnswer: userAnswer,
    ));

    await _send(userAnswer: userAnswer, betAmount: state.betAmount);
  }

  /// Vaqt tugadi — bo'sh javob, garovsiz.
  Future<void> _handleTimeout() async {
    if (state.phase != QuizPhase.answering) return;

    emit(state.copyWith(phase: QuizPhase.submitting));
    await _send(userAnswer: '', betAmount: 0, timedOut: true);
  }

  Future<void> _send({
    required String userAnswer,
    required int betAmount,
    bool timedOut = false,
  }) async {
    final ticket = state.ticket;
    final question = state.currentQuestion;
    if (ticket == null || question == null) return;

    final result = await _repository.submitAnswer(
      ticket: ticket,
      userAnswer: userAnswer,
      betAmount: betAmount,
    );

    if (isClosed) return;

    result.fold(
      (failure) {
        // 409 — bilet allaqachon ishlatilgan (masalan tarmoq qayta urindi).
        // Bu holda savolni javobsiz deb yozib, oldinga o'tamiz: aks holda
        // foydalanuvchi shu savolda qotib qoladi.
        if (failure.code == 409) {
          _recordEntry(
            question: question,
            userAnswer: userAnswer,
            outcome: null,
            skipped: true,
          );
          _scheduleAdvance(_feedbackDelay);
          emit(state.copyWith(
            phase: QuizPhase.feedback,
            errorMessage: 'Bu savol allaqachon yopilgan',
          ));
          return;
        }

        emit(state.copyWith(
          phase: QuizPhase.failure,
          errorMessage: failure.message,
        ));
      },
      (outcome) {
        final marked = outcome.copyWith(wasTimeout: timedOut);

        _recordEntry(
          question: question,
          userAnswer: userAnswer,
          outcome: marked,
        );

        emit(state.copyWith(
          phase: QuizPhase.feedback,
          outcome: marked,
          liveScore: (state.liveScore + marked.totalDelta).clamp(0, 1 << 31),
        ));

        _scheduleAdvance(
          marked.status == AnswerStatus.partial
              ? _partialFeedbackDelay
              : _feedbackDelay,
        );
      },
    );
  }

  // ═══ "Javobni bilmayman" ════════════════════════════════════════════════

  /// To'g'ri javobni ko'rsatadi. Ball berilmaydi, bilet sarflanadi.
  Future<void> giveUp() async {
    if (!state.canAnswer) return;

    final ticket = state.ticket!;
    final question = state.currentQuestion!;

    _timer.stop();
    emit(state.copyWith(phase: QuizPhase.submitting));

    final result = await _repository.revealAnswer(ticket);
    if (isClosed) return;

    result.fold(
      (failure) => emit(state.copyWith(
        phase: QuizPhase.failure,
        errorMessage: failure.message,
      )),
      (revealed) {
        _recordEntry(
          question: question,
          userAnswer: '',
          outcome: null,
          skipped: true,
        );
        emit(state.copyWith(phase: QuizPhase.feedback, revealed: revealed));
        _scheduleAdvance(_partialFeedbackDelay);
      },
    );
  }

  // ═══ Keyingi savol ══════════════════════════════════════════════════════

  void _recordEntry({
    required QuizQuestion question,
    required String userAnswer,
    required AnswerOutcome? outcome,
    bool skipped = false,
  }) {
    emit(state.copyWith(
      entries: [
        ...state.entries,
        RoundEntry(
          questionText: question.text,
          userAnswer: userAnswer,
          outcome: outcome,
          skipped: skipped,
        ),
      ],
    ));
  }

  void _scheduleAdvance(Duration delay) {
    _advanceTimer?.cancel();
    _advanceTimer = Timer(delay, () {
      if (isClosed) return;
      unawaited(next());
    });
  }

  /// Keyingi savolga o'tish (foydalanuvchi ham qo'lda chaqira oladi).
  Future<void> next() async {
    if (state.phase != QuizPhase.feedback) return;
    _advanceTimer?.cancel();

    final nextIndex = state.currentIndex + 1;
    if (nextIndex < state.questions.length) {
      await _prepareQuestion(nextIndex);
    } else {
      await _finishRound();
    }
  }

  // ═══ Raund yakuni ═══════════════════════════════════════════════════════

  Future<void> _finishRound() async {
    _cancelTimers();
    emit(state.copyWith(phase: QuizPhase.submitting));

    final entries = state.entries;
    final totalCount = entries.length;
    final correctCount = entries.where((e) => e.isCorrect).length;

    // ⚠️ Faqat savol ballari — garov QO'SHILMAYDI.
    // Backend `roundScore <= totalCount * 3` tekshiradi, garov esa bu
    // chegaradan oshib ketishi mumkin edi.
    final roundScore = entries.fold(0, (sum, e) => sum + e.points);

    final betNet = entries.fold(
      0,
      (sum, e) => sum + (e.outcome?.betWon ?? 0),
    );

    final bestStreak = entries.fold(
      0,
      (best, e) => (e.outcome?.streak ?? 0) > best ? e.outcome!.streak : best,
    );

    // 1. Natijani saqlaymiz. Xato bo'lsa ham raundni yakunlaymiz —
    //    foydalanuvchi natijasini ko'rishi kerak.
    await _repository.saveResult(
      correctCount: correctCount,
      totalCount: totalCount,
      roundScore: roundScore,
    );

    if (isClosed) return;

    // 2. Yutuqlarni tekshiramiz.
    var unlocked = <UnlockedAchievement>[];
    var bonus = 0;

    final achievements = await _repository.checkAchievements();
    if (isClosed) return;

    achievements.fold(
      (_) {}, // yutuq tekshiruvi ixtiyoriy — xatosi raundni buzmasin
      (data) {
        unlocked = data.$1;
        bonus = data.$2;
        updatedUser = data.$3;
      },
    );

    emit(state.copyWith(
      phase: QuizPhase.finished,
      summary: RoundSummary(
        entries: entries,
        correctCount: correctCount,
        totalCount: totalCount,
        roundScore: roundScore,
        betNet: betNet,
        bestStreak: bestStreak,
        newlyUnlocked: unlocked,
        achievementBonus: bonus,
      ),
    ));
  }

  @override
  Future<void> close() {
    _cancelTimers();
    _timer.dispose();
    return super.close();
  }
}

/// Garov qiymatlari — backend `VALID_BETS` bilan bir xil.
class QuizRepositoryBets {
  const QuizRepositoryBets._();

  static const options = <int>[0, 5, 10, 20, 50];

  static bool isValid(int amount) => options.contains(amount);
}
