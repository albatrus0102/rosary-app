import 'dart:async';

import 'package:rosary_app/app/guide_voice.dart';
import 'package:rosary_app/app/settings.dart';

/// 모든 테스트 파일 앞에서 돈다. 기존 기도 화면 테스트는 '기도문 중심' 화면을 검증하므로 기본값을 그쪽으로 둔다.
/// 새 묵주 화면(T-81) 테스트는 설정에서 [PrayerView.rosary]를 직접 고른다.
Future<void> testExecutable(FutureOr<void> Function() testMain) async {
  AppSettings.defaultPrayerView = PrayerView.classic;
  // 반복 애니메이션(손가락 안내)과 첫 사용 안내는 기존 시험의 pumpAndSettle 을 막으므로 기본은 '이미 익힘'.
  // 안내를 시험하는 파일은 SharedPreferences 에 값을 직접 넣는다(beadSwipeLearned, prayerScreenTourDone).
  AppSettings.defaultBeadSwipeLearned = AppSettings.beadSwipeGoal;
  AppSettings.defaultPrayerScreenTourDone = true;
  // 첫 실행 앱 소개·성당 첫 안내도 같은 이유로 기본은 '이미 마침'. 시험하는 파일은 값을 직접 넣는다.
  AppSettings.defaultAppIntroDone = true;
  AppSettings.defaultChurchTourDone = true;
  GuideVoice.engine = SilentGuideEngine();
  await testMain();
}
