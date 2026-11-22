import 'package:flutter/foundation.dart';
import 'package:flutter_tts/flutter_tts.dart';

/// 안내 글을 소리 내어 읽는 엔진. 시험은 [GuideVoice.engine]을 가짜로 바꾼다.
abstract class GuideEngine {
  /// [text]를 읽는다. 이미 읽고 있으면 먼저 끊는다. 끝나기를 기다리지 않는다.
  Future<void> speak(String text);

  Future<void> stop();
}

/// 아무 소리도 내지 않는 엔진(시험 기본값).
class SilentGuideEngine implements GuideEngine {
  @override
  Future<void> speak(String text) async {}

  @override
  Future<void> stop() async {}
}

/// 기기 음성(OS 내장 TTS)으로 한국어를 읽는다. 선창 음성(TtsLeaderVoice)과 같은 언어 설정을 쓰되
/// 안내는 짧아서 끝나기를 기다리지 않고, 읽는 중에 다음 글이 오면 바로 끊고 새로 읽는다.
class DeviceGuideEngine implements GuideEngine {
  static const _language = 'ko-KR';
  static const double _rate = 0.42;

  FlutterTts? _tts;
  Future<void>? _init;

  Future<void> _ensure() => _init ??= () async {
    try {
      final tts = FlutterTts();
      _tts = tts;
      await tts.setLanguage(_language);
      await tts.setSpeechRate(_rate);
    } catch (e) {
      debugPrint('GuideEngine init failed: $e');
    }
  }();

  @override
  Future<void> speak(String text) async {
    try {
      await _ensure();
      final tts = _tts;
      if (tts == null) return;
      await tts.stop();
      await tts.speak(text);
    } catch (e) {
      debugPrint('GuideEngine speak failed: $e');
    }
  }

  @override
  Future<void> stop() async {
    try {
      await _tts?.stop();
    } catch (_) {}
  }
}

/// 첫 사용 안내(앱 소개·성당·묵주기도 화면)가 함께 쓰는 읽어 주기.
///
/// 기도 소리(성가·선창 목소리)가 나는 중에는 읽지 않는다: 부르는 쪽이 `blocked`로 알려 준다.
abstract final class GuideVoice {
  /// 실제로 읽는 엔진. 시험에서 바꾼다.
  @visibleForTesting
  static GuideEngine engine = DeviceGuideEngine();

  /// 지금 읽는 글(없으면 null). 시험이 확인한다.
  static String? current;

  /// [text]를 읽는다. [blocked]가 true 를 주면(기도 소리 중) 읽지 않고 읽던 것도 끊는다.
  static Future<void> speak(String text, {bool Function()? blocked}) async {
    if (blocked != null && blocked()) {
      await stop();
      return;
    }
    current = text;
    try {
      await engine.speak(text);
    } catch (e) {
      debugPrint('GuideVoice.speak failed: $e');
    }
  }

  static Future<void> stop() async {
    current = null;
    try {
      await engine.stop();
    } catch (_) {}
  }
}
