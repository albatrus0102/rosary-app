import 'package:flutter/foundation.dart';

/// 음성 감지기의 상태.
enum DetectorState {
  idle,
  preparingModel,
  listening,
  stopped,
  permissionDenied,
  error,
}

/// "아멘" 등 트리거 문구를 듣고 이벤트를 내보내는 감지기 인터페이스.
abstract class AmenDetector {
  /// 새로 감지된 트리거 문구(정규 문구, 예: '아멘', '돌보소서').
  /// 한 번 감지될 때마다 문구 하나가 방출된다.
  Stream<String> get phraseEvents;

  /// 새로 감지된 아멘 개수 (phraseEvents 중 '아멘'만 묶어서 개수로 전달).
  Stream<int> get amenEvents;

  ValueListenable<DetectorState> get state;

  /// 디버그/표시용 부분 결과.
  String? get lastTranscript;

  Future<void> start();
  Future<void> stop();
  Future<void> dispose();
}
