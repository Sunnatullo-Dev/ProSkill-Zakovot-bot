import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:get_it/get_it.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../features/auth/data/datasources/auth_remote_data_source.dart';
import '../../features/auth/data/repositories/auth_repository_impl.dart';
import '../../features/auth/domain/repositories/auth_repository.dart';
import '../../features/auth/domain/usecases/auth_usecases.dart';
import '../../features/auth/presentation/bloc/auth_bloc.dart';
import '../../features/daily/data/datasources/daily_remote_data_source.dart';
import '../../features/daily/data/repositories/daily_repository_impl.dart';
import '../../features/daily/domain/repositories/daily_repository.dart';
import '../../features/leaderboard/data/datasources/leaderboard_remote_data_source.dart';
import '../../features/leaderboard/data/repositories/leaderboard_repository_impl.dart';
import '../../features/leaderboard/domain/repositories/leaderboard_repository.dart';
import '../../features/profile/data/datasources/profile_remote_data_source.dart';
import '../../features/profile/data/repositories/profile_repository_impl.dart';
import '../../features/profile/domain/repositories/profile_repository.dart';
import '../../features/quiz/data/datasources/quiz_remote_data_source.dart';
import '../../features/quiz/data/repositories/quiz_repository_impl.dart';
import '../../features/quiz/domain/repositories/quiz_repository.dart';
import '../network/dio_client.dart';
import '../storage/prefs_store.dart';
import '../storage/token_store.dart';
import '../time/server_clock.dart';

/// Global service locator.
final GetIt sl = GetIt.instance;

/// Barcha bog'liqliklarni ro'yxatdan o'tkazadi.
///
/// `main()` da `runApp` dan OLDIN chaqiriladi.
///
/// Tartib muhim: storage → network → data → domain → presentation.
Future<void> configureDependencies() async {
  // ── 1. Tashqi kutubxonalar ────────────────────────────────────────────────
  final prefs = await SharedPreferences.getInstance();
  sl.registerSingleton<SharedPreferences>(prefs);

  sl.registerSingleton<FlutterSecureStorage>(
    const FlutterSecureStorage(
      aOptions: AndroidOptions(encryptedSharedPreferences: true),
      iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
    ),
  );

  // ── 2. Storage ────────────────────────────────────────────────────────────
  sl.registerSingleton<PrefsStore>(PrefsStore(sl()));

  final tokenStore = TokenStore(sl(), sl());
  await tokenStore.load(); // diskdan RAM keshiga
  sl.registerSingleton<TokenStore>(tokenStore);

  // ── 3. Network ────────────────────────────────────────────────────────────
  // Refresh uchun alohida Dio — auth interceptorsiz (rekursiyani oldini oladi).
  final refreshDio = DioFactory.createRefreshDio();
  sl.registerSingleton<Dio>(refreshDio, instanceName: 'refresh');

  // Sessiya tugaganda AuthBloc ga xabar beramiz.
  // `sl.isRegistered` tekshiruvi kerak: interceptor AuthBloc yaratilishidan
  // oldin ham ishga tushishi mumkin (masalan splash paytida).
  Future<void> onSessionExpired() async {
    await sl<TokenStore>().clear();
    if (sl.isRegistered<AuthBloc>()) {
      sl<AuthBloc>().add(const AuthSessionExpired());
    }
  }

  final dio = DioFactory.create(
    tokenStore: tokenStore,
    refreshDio: refreshDio,
    onSessionExpired: onSessionExpired,
  );
  sl.registerSingleton<Dio>(dio);

  sl.registerSingleton<ServerClock>(ServerClock(refreshDio));

  // ── 4. Data sources ───────────────────────────────────────────────────────
  sl.registerLazySingleton<AuthRemoteDataSource>(
    () => AuthRemoteDataSource(sl<Dio>()),
  );
  sl.registerLazySingleton<QuizRemoteDataSource>(
    () => QuizRemoteDataSource(sl<Dio>()),
  );
  sl.registerLazySingleton<DailyRemoteDataSource>(
    () => DailyRemoteDataSource(sl<Dio>()),
  );
  sl.registerLazySingleton<LeaderboardRemoteDataSource>(
    () => LeaderboardRemoteDataSource(sl<Dio>()),
  );
  sl.registerLazySingleton<ProfileRemoteDataSource>(
    () => ProfileRemoteDataSource(sl<Dio>()),
  );

  // ── 5. Repositories ───────────────────────────────────────────────────────
  sl.registerLazySingleton<AuthRepository>(
    () => AuthRepositoryImpl(
      remote: sl(),
      tokenStore: sl(),
      prefs: sl(),
    ),
  );
  sl.registerLazySingleton<QuizRepository>(
    () => QuizRepositoryImpl(sl()),
  );
  sl.registerLazySingleton<DailyRepository>(
    () => DailyRepositoryImpl(sl()),
  );
  sl.registerLazySingleton<LeaderboardRepository>(
    () => LeaderboardRepositoryImpl(sl()),
  );
  sl.registerLazySingleton<ProfileRepository>(
    () => ProfileRepositoryImpl(sl()),
  );

  sl.registerLazySingleton(() => RegisterUseCase(sl()));
  sl.registerLazySingleton(() => StartTelegramRegisterUseCase(sl()));
  sl.registerLazySingleton(() => VerifyTelegramRegisterUseCase(sl()));
  sl.registerLazySingleton(() => ForgotPasswordUseCase(sl()));
  sl.registerLazySingleton(() => ResetPasswordUseCase(sl()));
  sl.registerLazySingleton(() => ResendOtpUseCase(sl()));
  sl.registerLazySingleton(() => LoginUseCase(sl()));
  sl.registerLazySingleton(() => RestoreSessionUseCase(sl()));
  sl.registerLazySingleton(() => LogoutUseCase(sl()));
  sl.registerLazySingleton(() => ChangePasswordUseCase(sl()));
  sl.registerLazySingleton(() => UpdateDisplayNameUseCase(sl()));

  // ── 7. Blocs ──────────────────────────────────────────────────────────────
  // AuthBloc — butun ilova davomida yashaydi (sessiya manbai).
  sl.registerSingleton<AuthBloc>(
    AuthBloc(
      restoreSession: sl(),
      logout: sl(),
      repository: sl(),
      prefs: sl(),
    ),
  );
}

/// Testlarda foydali.
Future<void> resetDependencies() => sl.reset();
