part of 'daily_cubit.dart';

enum DailyPhase {
  initial,
  loading,

  /// Yuklandi — "Boshlash" tugmasi ko'rsatiladi.
  intro,

  /// Bugun allaqachon yakunlangan.
  alreadyCompleted,

  preparing,
  answering,
  submitting,
  feedback,
  finished,
  failure,
}

class DailyState extends Equatable {
  const DailyState({
    this.phase = DailyPhase.initial,
    this.challenge,
    this.currentIndex = 0,
    this.ticket,
    this.remainingMs = 0,
    this.totalMs = 1,
    this.selectedAnswer,
    this.outcome,
    this.answers = const [],
    this.earnedPoints = 0,
    this.completion,
    this.errorMessage,
  });

  final DailyPhase phase;
  final DailyChallenge? challenge;
  final int currentIndex;
  final String? ticket;
  final int remainingMs;
  final int totalMs;
  final String? selectedAnswer;
  final AnswerOutcome? outcome;

  /// Har savol bo'yicha natija (`null` — o'tkazib yuborilgan).
  final List<AnswerOutcome?> answers;

  final int earnedPoints;
  final DailyCompletion? completion;
  final String? errorMessage;

  // ─── Getterlar ────────────────────────────────────────────────────────────

  List<QuizQuestion> get questions => challenge?.questions ?? const [];

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

  bool get canAnswer => phase == DailyPhase.answering && ticket != null;

  int get correctCount => answers.where((a) => a?.isCorrect ?? false).length;

  DailyStreak get streak =>
      challenge?.streak ?? const DailyStreak(current: 0, longest: 0);

  /// O'yin davomida ko'rsatiladigan bosqichlarmi?
  bool get isPlaying =>
      phase == DailyPhase.preparing ||
      phase == DailyPhase.answering ||
      phase == DailyPhase.submitting ||
      phase == DailyPhase.feedback;

  DailyState copyWith({
    DailyPhase? phase,
    DailyChallenge? challenge,
    int? currentIndex,
    String? ticket,
    int? remainingMs,
    int? totalMs,
    String? selectedAnswer,
    AnswerOutcome? outcome,
    List<AnswerOutcome?>? answers,
    int? earnedPoints,
    DailyCompletion? completion,
    String? errorMessage,
    bool clearTicket = false,
    bool clearOutcome = false,
    bool clearSelected = false,
    bool clearError = false,
  }) {
    return DailyState(
      phase: phase ?? this.phase,
      challenge: challenge ?? this.challenge,
      currentIndex: currentIndex ?? this.currentIndex,
      ticket: clearTicket ? null : (ticket ?? this.ticket),
      remainingMs: remainingMs ?? this.remainingMs,
      totalMs: totalMs ?? this.totalMs,
      selectedAnswer:
          clearSelected ? null : (selectedAnswer ?? this.selectedAnswer),
      outcome: clearOutcome ? null : (outcome ?? this.outcome),
      answers: answers ?? this.answers,
      earnedPoints: earnedPoints ?? this.earnedPoints,
      completion: completion ?? this.completion,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }

  @override
  List<Object?> get props => [
        phase,
        challenge,
        currentIndex,
        ticket,
        remainingMs,
        totalMs,
        selectedAnswer,
        outcome,
        answers,
        earnedPoints,
        completion,
        errorMessage,
      ];
}
