import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'app/app.dart';
import 'app/licenses.dart';
import 'app/settings.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Android 15부터 edge-to-edge가 기본/강제다. 모든 버전에서 같게 동작하도록
  // 명시하고, 시스템 바 색은 앱(AnnotatedRegion/AppBar)이 정한다.
  await SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
  final settings = await AppSettings.load();
  registerFontLicenses();
  runApp(RosaryApp(settings));
}
