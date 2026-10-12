import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import '../core/di/injector.dart';
import '../core/router/app_router.dart';
import '../core/storage/prefs_store.dart';
import '../core/theme/app_theme.dart';
import '../features/auth/presentation/bloc/auth_bloc.dart';

class ZakovatApp extends StatefulWidget {
  const ZakovatApp({super.key});

  @override
  State<ZakovatApp> createState() => _ZakovatAppState();
}

class _ZakovatAppState extends State<ZakovatApp> {
  late final AuthBloc _authBloc;
  late final AppRouter _appRouter;

  @override
  void initState() {
    super.initState();
    _authBloc = sl<AuthBloc>();
    _appRouter = AppRouter(_authBloc);

    // Saqlangan sessiyani tekshirishni boshlaymiz.
    _authBloc.add(const AuthStarted());
  }

  @override
  void dispose() {
    _appRouter.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final prefs = sl<PrefsStore>();

    return BlocProvider.value(
      value: _authBloc,
      child: BlocListener<AuthBloc, AuthState>(
        listenWhen: (prev, curr) =>
            curr.message != null && prev.message != curr.message,
        listener: (context, state) {
          final message = state.message;
          if (message == null) return;
          final messenger = scaffoldMessengerKey.currentState;
          messenger
            ?..hideCurrentSnackBar()
            ..showSnackBar(SnackBar(content: Text(message)));
        },
        child: MaterialApp.router(
          title: 'Zakovat App',
          debugShowCheckedModeBanner: false,
          scaffoldMessengerKey: scaffoldMessengerKey,
          routerConfig: _appRouter.router,

          theme: AppTheme.light,
          darkTheme: AppTheme.dark,
          themeMode: switch (prefs.themeMode) {
            'light' => ThemeMode.light,
            'system' => ThemeMode.system,
            _ => ThemeMode.dark,
          },

          locale: switch (prefs.language) {
            'ru' => const Locale('ru'),
            _ => const Locale('uz'),
          },
          supportedLocales: const [
            Locale('uz'),
            Locale('ru'),
            Locale('en'),
          ],
          localizationsDelegates: const [
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],

          builder: (context, child) {
            // Tizim shrift o'lchamini cheklaymiz — juda katta shriftda
            // o'yin taymerlari va tugmalar buzilib ketmasin.
            final mq = MediaQuery.of(context);
            return MediaQuery(
              data: mq.copyWith(
                textScaler: mq.textScaler.clamp(
                  minScaleFactor: 0.85,
                  maxScaleFactor: 1.25,
                ),
              ),
              child: AnnotatedRegion<SystemUiOverlayStyle>(
                value: const SystemUiOverlayStyle(
                  statusBarColor: Colors.transparent,
                  statusBarIconBrightness: Brightness.light,
                  statusBarBrightness: Brightness.dark,
                ),
                child: child ?? const SizedBox.shrink(),
              ),
            );
          },
        ),
      ),
    );
  }
}

/// Global messenger — router tashqarisidan snackbar ko'rsatish uchun.
final GlobalKey<ScaffoldMessengerState> scaffoldMessengerKey =
    GlobalKey<ScaffoldMessengerState>();
