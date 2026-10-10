part of 'quiz_cubit.dart';

/// Raundning joriy bosqichi.
enum QuizPhase {
  /// Hali boshlanmagan.
  initial,

  /// Savollar yuklanmoqda.
  loading,

  /// Savol uchun bilet olinmoqda (`POST /api/answer/ticket`).
  preparing,

  /// Bilet tayyor, taymer ishlayapti — foydalanuvchi javob kutilmoqda.
  answering,

  /// Javob serverga yuborilmoqda.
  submitting,

  /// Natija ko'rsatilmoqda (to'g'ri/noto'g'ri + izoh).
  feedback,

  /// Raund tugadi, yakun tayyor.
  finished,

  /// Xatolik.
  failure,
}

class QuizState extends Equatable {
  const QuizState({
    this.phase = QuizPhase.initial,
    this.questions = const [],
    this.currentIndex = 0,
    this.ticket,
    this.deadlineEpochMs,
    this.remainingMs = 0,
    this.totalMs = 1,
    this.selectedAnswer,
    this.betAmount = 0,
    this.outcome,
    this.revealed,
    this.entries = const [],
    this.summary,
    this.errorMessage,
    this.liveScore = 0,
    this.difficulty,
  });

  final QuizPhase phase;
  final List<QuizQuestion> questions;
  final int currentIndex;

  /// Joriy savol uchun bir martalik bilet.
  final String? ticket;

  /// Server vaqti bo'yicha javob berish muddati.
  final int? deadlineEpochMs;

  final int remainingMs;
  final int totalMs;

  /// Foydalanuvchi tanlagan variant (belgilash uchun).
  final String? selectedAnswer;

  /// Joriy savolga tikilgan ball (0 | 5 | 10 | 20 | 50).
  final int betAmount;

  /// Oxirgi javob natijasi.
  final AnswerOutcome? outcome;

  /// "Javobni bilmayman" natijasi.
  final RevealedAnswer? revealed;

  final List<RoundEntry> entries;
  final RoundSummary? summary;
  final String? errorMessage;

  /// Foydalanuvchining joriy balansi — garov chegarasini aniqlash uchun.
  final int liveScore;

  final String? difficulty;

  // ─── Qulay getterlar ──────────────────────────────────────────────────────

  QuizQuestion? get currentQuestion =>
      currentIndex >= 0 && currentIndex < questions.length
          ? questions[currentIndex]
          : null;

  int get totalQuestions => questions.length;
  int get questionNumber => currentIndex + 1;

  double get progress =>
      totalQuestions == 0 ? 0 : (currentIndex + 1) / totalQuestions;

  double get timeFraction =>
      totalMs <= 0 ? 0 : (remainingMs / totalMs).clamp(0.0, 1.0);

  int get remainingSeconds => (remainingMs / 1000).ceil();

  bool get isBusy =>
      phase == QuizPhase.loading ||
      phase == QuizPhase.preparing ||
      phase == QuizPhase.submitting;

  bool get canAnswer => phase == QuizPhase.answering && ticket != null;

  /// Garovni faqat javob berishdan oldin o'zgartirish mumkin.
  bool get canChangeBet => phase == QuizPhase.answering;

  /// Shu paytgacha to'plangan ball (garov bilan).
  int get earnedSoFar => entries.fold(
        0,
        (sum, e) => sum + (e.outcome?.totalDelta ?? 0),
      );

  QuizState copyWith({
    QuizPhase? phase,
    List<QuizQuestion>? questions,
    int? currentIndex,
    String? ticket,
    int? deadlineEpochMs,
    int? remainingMs,
    int? totalMs,
    String? selectedAnswer,
    int? betAmount,
    AnswerOutcome? outcome,
    RevealedAnswer? revealed,
    List<RoundEntry>? entries,
    RoundSummary? summary,
    String? errorMessage,
    int? liveScore,
    String? difficulty,
    bool clearTicket = false,
    bool clearOutcome = false,
    bool clearRevealed = false,
    bool clearSelected = false,
    bool clearError = false,
  }) {
    return QuizState(
      phase: phase ?? this.phase,
      questions: questions ?? this.questions,
      currentIndex: currentIndex ?? this.currentIndex,
      ticket: clearTicket ? null : (ticket ?? this.ticket),
      deadlineEpochMs: deadlineEpochMs ?? this.deadlineEpochMs,
      remainingMs: remainingMs ?? this.remainingMs,
      totalMs: totalMs ?? this.totalMs,
      selectedAnswer:
          clearSelected ? null : (selectedAnswer ?? this.selectedAnswer),
      betAmount: betAmount ?? this.betAmount,
      outcome: clearOutcome ? null : (outcome ?? this.outcome),
      revealed: clearRevealed ? null : (revealed ?? this.revealed),
      entries: entries ?? this.entries,
      summary: summary ?? this.summary,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      liveScore: liveScore ?? this.liveScore,
      difficulty: difficulty ?? this.difficulty,
    );
  }

  @override
  List<Object?> get props => [
        phase,
        questions,
        currentIndex,
        ticket,
        deadlineEpochMs,
        remainingMs,
        totalMs,
        selectedAnswer,
        betAmount,
        outcome,
        revealed,
        entries,
        summary,
        errorMessage,
        liveScore,
        difficulty,
      ];
}
