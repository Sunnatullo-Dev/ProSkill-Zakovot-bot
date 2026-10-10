import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'app/app.dart';
import 'core/di/injector.dart';
import 'core/time/server_clock.dart';

void main() {
  // Barcha xatolarni bitta zonada ushlaymiz — kelajakda bu yerga
  // Sentry/Crashlytics ulanadi.
  runZonedGuarded(
    () async {
      WidgetsFlutterBinding.ensureInitialized();

      FlutterError.onError = (details) {
        FlutterError.presentError(details);
        _reportError(details.exception, details.stack);
      };

      PlatformDispatcher.instance.onError = (error, stack) {
        _reportError(error, stack);
        return true;
      };

      await SystemChrome.setPreferredOrientations([
        DeviceOrientation.portraitUp,
        DeviceOrientation.portraitDown,
      ]);

      SystemChrome.setSystemUIOverlayStyle(
        const SystemUiOverlayStyle(
          statusBarColor: Colors.transparent,
          systemNavigationBarColor: Colors.transparent,
        ),
      );
      SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);

      await configureDependencies();

      // Server soatini fonda sinxronlaymiz — ilova ochilishini kutdirmaydi.
      // O'yin boshlanishidan oldin `ServerClock.isSynced` tekshiriladi.
      unawaited(sl<ServerClock>().sync());

      runApp(const ZakovatApp());
    },
    (error, stack) => _reportError(error, stack),
  );
}

void _reportError(Object error, StackTrace? stack) {
  if (kDebugMode) {
    debugPrint('╔══ XATO ═══════════════════════════════════');
    debugPrint('║ $error');
    if (stack != null) debugPrint('║ $stack');
    debugPrint('╚═══════════════════════════════════════════');
  }
  // TODO(prod): Sentry.captureException(error, stackTrace: stack);
}
