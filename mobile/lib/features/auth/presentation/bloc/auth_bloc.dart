import 'dart:async';

import 'package:bloc/bloc.dart';
import 'package:equatable/equatable.dart';

import '../../../../core/storage/prefs_store.dart';
import '../../../../core/usecase/usecase.dart';
import '../../domain/entities/app_user.dart';
import '../../domain/entities/auth_session.dart';
import '../../domain/repositories/auth_repository.dart';
import '../../domain/usecases/auth_usecases.dart';

part 'auth_event.dart';
part 'auth_state.dart';

/// Ilova bo'ylab yagona sessiya manbai.
///
/// GoRouter shu bloc'ning holatiga qarab redirect qiladi, shuning uchun
/// "kirilganmi yoki yo'q" savoliga javob beradigan BOSHQA joy bo'lmasligi
/// kerak — aks holda ekranlar bir-biriga zid holatga tushib qoladi.
class AuthBloc extends Bloc<AuthEvent, AuthState> {
  AuthBloc({
    required RestoreSessionUseCase restoreSession,
    required LogoutUseCase logout,
    required AuthRepository repository,
    required PrefsStore prefs,
  })  : _restoreSession = restoreSession,
        _logout = logout,
        _repository = repository,
        _prefs = prefs,
        super(const AuthState.unknown()) {
    on<AuthStarted>(_onStarted);
    on<AuthSessionGranted>(_onSessionGranted);
    on<AuthUserUpdated>(_onUserUpdated);
    on<AuthLogoutRequested>(_onLogoutRequested);
    on<AuthSessionExpired>(_onSessionExpired);
    on<AuthOnboardingCompleted>(_onOnboardingCompleted);
  }

  final RestoreSessionUseCase _restoreSession;
  final LogoutUseCase _logout;
  final AuthRepository _repository;
  final PrefsStore _prefs;

  // ─── Handlerlar ───────────────────────────────────────────────────────────

  Future<void> _onStarted(AuthStarted event, Emitter<AuthState> emit) async {
    // Token umuman yo'q — tarmoqqa chiqmaymiz.
    if (!_repository.hasStoredSession) {
      emit(AuthState.unauthenticated(
        onboardingDone: _prefs.onboardingDone,
      ));
      return;
    }

    emit(const AuthState.checking());

    final result = await _restoreSession(const NoParams());

    result.fold(
      (failure) {
        // 401 — token yaroqsiz, chiqarib yuboramiz.
        // Tarmoq xatosi — sessiyani SAQLAB QOLAMIZ va offline holat
        // ko'rsatamiz, aks holda internetsiz foydalanuvchi har safar
        // qayta login qilishga majbur bo'ladi.
        if (failure.code == 401) {
          emit(AuthState.unauthenticated(onboardingDone: _prefs.onboardingDone));
        } else {
          emit(AuthState.unauthenticated(
            onboardingDone: _prefs.onboardingDone,
            message: failure.message,
          ));
        }
      },
      (user) => emit(AuthState.authenticated(user: user)),
    );
  }

  void _onSessionGranted(AuthSessionGranted event, Emitter<AuthState> emit) {
    emit(AuthState.authenticated(
      user: event.session.user,
      isAdmin: event.session.isAdmin,
    ));
  }

  void _onUserUpdated(AuthUserUpdated event, Emitter<AuthState> emit) {
    final current = state;
    if (current.status != AuthStatus.authenticated) return;
    emit(current.copyWith(user: event.user));
  }

  Future<void> _onLogoutRequested(
    AuthLogoutRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(const AuthState.checking());
    await _logout(const NoParams());
    emit(AuthState.unauthenticated(onboardingDone: _prefs.onboardingDone));
  }

  void _onSessionExpired(AuthSessionExpired event, Emitter<AuthState> emit) {
    emit(AuthState.unauthenticated(
      onboardingDone: _prefs.onboardingDone,
      message: 'Sessiya tugadi. Iltimos, qaytadan kiring.',
    ));
  }

  Future<void> _onOnboardingCompleted(
    AuthOnboardingCompleted event,
    Emitter<AuthState> emit,
  ) async {
    await _prefs.setOnboardingDone(true);
    if (state.status == AuthStatus.unauthenticated) {
      emit(state.copyWith(onboardingDone: true));
    }
  }
}
