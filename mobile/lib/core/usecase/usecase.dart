import 'package:dartz/dartz.dart';
import 'package:equatable/equatable.dart';

import '../error/failure.dart';

/// Barcha use-case'lar uchun umumiy shartnoma.
///
/// `Either<Failure, T>` — xato yoki natija. Istisno ko'tarilmaydi:
/// repository barcha istisnolarni `Failure` ga aylantiradi, shuning uchun
/// presentation qatlami `try/catch` yozishi shart emas.
abstract class UseCase<T, Params> {
  Future<Either<Failure, T>> call(Params params);
}

/// Parametrsiz use-case uchun.
class NoParams extends Equatable {
  const NoParams();

  @override
  List<Object?> get props => const [];
}
