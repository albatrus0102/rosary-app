import 'dart:async';

import 'package:rosary_app/app/settings.dart';

/// 모든 테스트 파일 앞에서 돈다. 기존 기도 화면 테스트는 '기도문 중심' 화면을 검증하므로 기본값을 그쪽으로 둔다.
/// 새 묵주 화면(T-81) 테스트는 설정에서 [PrayerView.rosary]를 직접 고른다.
Future<void> testExecutable(FutureOr<void> Function() testMain) async {
  AppSettings.defaultPrayerView = PrayerView.classic;
  await testMain();
}
