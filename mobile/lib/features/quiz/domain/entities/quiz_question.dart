import 'package:equatable/equatable.dart';

/// Savol — server bergan ko'rinishda.
///
/// ⚠️ **To'g'ri javob bu yerda YO'Q.** Backend uni ataylab yubormaydi
/// (`_map_question_public`) — aks holda ilova xotirasidan yoki tarmoq
/// javobidan ko'rib olish mumkin bo'lardi. To'g'ri javob faqat javob
/// yuborilgandan keyin `AnswerOutcome.correctAnswer` da keladi.
class QuizQuestion extends Equatable {
  const QuizQuestion({
    required this.id,
    required this.text,
    required this.options,
    this.category,
    this.difficulty,
    this.timeLimitSeconds,
  });

  final String id;
  final String text;

  /// 4 ta aralashtirilgan variant (to'g'risi shu ichida).
  ///
  /// **Bo'sh bo'lishi mumkin** — u holda savol "erkin javob" rejimida
  /// va Gemini AI baholaydi. UI matn kiritish maydonini ko'rsatishi kerak.
  final List<String> options;

  final String? category;
  final String? difficulty;

  /// Savolga xos vaqt. `null` — standart ishlatiladi.
  final int? timeLimitSeconds;

  /// A/B/C/D rejimimi yoki erkin matnmi?
  bool get isMultipleChoice => options.length == 4;

  @override
  List<Object?> get props =>
      [id, text, options, category, difficulty, timeLimitSeconds];
}
