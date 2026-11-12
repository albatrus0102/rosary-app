import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'app/app.dart';
import 'app/app_bootstrap.dart';
import 'app/licenses.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Android 15부터 edge-to-edge가 기본/강제다. 모든 버전에서 같게 동작하도록
  // 명시하고, 시스템 바 색은 앱(AnnotatedRegion/AppBar)이 정한다.
  await SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
  registerFontLicenses();
  // Supabase(설정된 경우) → 설정·기록 → 인증/동의 → 분석·동기화. 미설정이면 로그인 없이 열린다.
  final services = await bootstrapServices();
  runApp(RosaryApp(services.settings, services: services));
}
