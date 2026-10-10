import 'package:bloc/bloc.dart';
import 'package:equatable/equatable.dart';

import '../../../auth/domain/repositories/auth_repository.dart';
import '../../domain/entities/game_stats.dart';
import '../../domain/repositories/profile_repository.dart';

part 'profile_state.dart';

/// Profil boshqaruvchisi.
///
/// Sessiya ma'lumoti (ism, ball, premium) `AuthBloc` da yashaydi —
/// bu cubit uni **takrorlamaydi**. Bu yerda faqat profilga xos
/// qo'shimchalar: statistika va til o'zgartirish.
class ProfileCubit extends Cubit<ProfileState> {
  ProfileCubit({
    required ProfileRepository profileRepository,
    required AuthRepository authRepository,
  })  : _profile = profileRepository,
        _auth = authRepository,
        super(const ProfileState());

  final ProfileRepository _profile;
  final AuthRepository _auth;

  Future<void> load() async {
    emit(state.copyWith(status: ProfileStatus.loading, clearError: true));

    final result = await _profile.getStats();
    if (isClosed) return;

    result.fold(
      (failure) => emit(state.copyWith(
        status: ProfileStatus.failure,
        errorMessage: failure.message,
      )),
      (stats) => emit(state.copyWith(
        status: ProfileStatus.success,
        stats: stats,
      )),
    );
  }

  Future<void> refresh() => load();

  /// Interfeys tilini o'zgartiradi.
  ///
  /// Optimistik yangilash: UI darhol o'zgaradi, server bilan sinxronlash
  /// fonda ketadi. Xato bo'lsa eski qiymatga qaytariladi va xabar beriladi.
  Future<void> changeLanguage(String language) async {
    if (state.isSavingLanguage) return;

    final previous = state.pendingLanguage;
    emit(state.copyWith(
      pendingLanguage: language,
      isSavingLanguage: true,
      clearError: true,
    ));

    final result = await _auth.updateLanguage(language);
    if (isClosed) return;

    result.fold(
      // ⚠️ `copyWith` odatda `null` ni "o'zgartirma" deb tushunadi, shuning
      // uchun eski qiymat `null` bo'lsa maxsus bayroq kerak — aks holda
      // muvaffaqiyatsiz o'zgartirish UI'da saqlanib qolardi.
      (failure) => emit(state.copyWith(
        pendingLanguage: previous,
        clearPendingLanguage: previous == null,
        isSavingLanguage: false,
        errorMessage: failure.message,
      )),
      (_) => emit(state.copyWith(
        isSavingLanguage: false,
        languageSaved: true,
      )),
    );
  }

  void acknowledgeLanguageSaved() =>
      emit(state.copyWith(languageSaved: false));
}
