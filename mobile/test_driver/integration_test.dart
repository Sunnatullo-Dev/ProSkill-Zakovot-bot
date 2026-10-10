import 'dart:io';

import 'package:integration_test/integration_test_driver_extended.dart';

/// `flutter drive` uchun driver — `binding.takeScreenshot(...)` chaqiruvlarini
/// haqiqiy PNG fayllarga yozadi.
///
/// Ishga tushirish:
/// ```bash
/// flutter drive --driver=test_driver/integration_test.dart \
///   --target=integration_test/app_flow_test.dart \
///   -d <simulator-id> --dart-define=API_BASE_URL=http://localhost:3000
/// ```
Future<void> main() async {
  await integrationDriver(
    onScreenshot: (name, bytes, [args]) async {
      final dir = Directory('screenshots')..createSync(recursive: true);
      final file = File('${dir.path}/$name.png')..writeAsBytesSync(bytes);
      stdout.writeln('[SHOT] ${file.path} (${bytes.length} bayt)');
      return true;
    },
  );
}
