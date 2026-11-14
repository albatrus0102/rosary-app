import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

/// 성당 진단 설정(앱 전역). `AppSettings`가 값을 맞추고, 장면 컨트롤러는
/// 바뀔 때마다 웹에 `setPerfHud`를 보낸다(성당 화면 코드와 독립).
abstract final class ChurchDiagnostics {
  /// 성능 표시(fps·프레임 ms·해상도·화질 단계·draw call) 켜기. 기본 꺼짐.
  static final ValueNotifier<bool> perfHud = ValueNotifier(false);

  /// 성능 표시의 '10초 기록' 요약(`{e:'perfReport', text}`)을 클립보드에 복사한다(분석 전송 없음).
  /// 화면 이벤트(`SceneEvent`)로 만들지 않고 채널에서 바로 처리한다. 처리했으면 true.
  static bool handleRaw(String raw) {
    if (!raw.contains('"perfReport"')) return false;
    try {
      final j = jsonDecode(raw);
      if (j is! Map || j['e'] != 'perfReport') return false;
      final text = j['text'];
      if (text is String && text.isNotEmpty && text.length <= 2000) {
        unawaited(
          Clipboard.setData(ClipboardData(text: text))
              .catchError((Object err) => debugPrint('perf report copy: $err')),
        );
      }
      return true;
    } catch (_) {
      return false;
    }
  }
}
