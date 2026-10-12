import 'package:dartz/dartz.dart';

import '../../../../core/error/failure.dart';
import '../../../auth/domain/entities/app_user.dart';
import '../entities/answer_outcome.dart';
import '../entities/quiz_question.dart';

/// Yakka o'yin uchun domen shartnomasi.
abstract class QuizRepository {
  /// Raund savollarini oladi.
  ///
  /// [difficulty] — `easy` | `medium` | `hard` yoki `null` (aralash).
  /// Premium limiti tugagan bo'lsa `ForbiddenFailure` qaytadi.
  Future<Either<Failure, List<QuizQuestion>>> getRound({
    int count = 10,
    String? category,
    String? difficulty,
  });

  /// Savol uchun bir martalik imzolangan bilet oladi.
  ///
  /// ⚠️ Server javob berish vaqtini **shu bilet chiqarilgan paytdan**
  /// hisoblaydi. Shuning uchun bilet savol ko'rsatilishidan darhol oldin
  /// olinishi kerak — oldindan hammasini olib qo'yish taymerni buzadi.
  Future<Either<Failure, String>> issueTicket(String questionId);

  /// Javobni yuboradi va baholanadi.
  ///
  /// [betAmount] faqat 0, 5, 10, 20, 50 bo'lishi mumkin.
  /// Bilet bir martalik: takror yuborishda `ConflictFailure` (409) qaytadi.
  Future<Either<Failure, AnswerOutcome>> submitAnswer({
    required String ticket,
    required String userAnswer,
    int betAmount = 0,
  });

  /// "Javobni bilmayman" — to'g'ri javob va izohni oladi.
  ///
  /// ⚠️ Bu ham biletni sarflaydi: shundan keyin `submitAnswer` 409 beradi.
  Future<Either<Failure, RevealedAnswer>> revealAnswer(String ticket);

  /// Raund natijasini saqlaydi.
  ///
  /// Server tekshiruvlari: `1 <= totalCount <= 20`,
  /// `correctCount <= totalCount`, `roundScore <= totalCount * 3`.
  Future<Either<Failure, Unit>> saveResult({
    required int correctCount,
    required int totalCount,
    required int roundScore,
  });

  /// Yutuqlarni tekshiradi va yangilarini qaytaradi (bonus ball bilan).
  ///
  /// Yangilangan foydalanuvchi ham qaytadi — sessiyani yangilash uchun.
  Future<Either<Failure, (List<UnlockedAchievement>, int, AppUser?)>>
      checkAchievements();
}
