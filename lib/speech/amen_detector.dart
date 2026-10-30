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

/// 진단 화면(마이크 테스트, 인식 내용 패널)에 필요한 추가 정보를 가진 감지기.
/// [AmenDetector]를 직접 구현한 가짜 감지기는 이 정보가 없어도 된다.
abstract class DiagnosticAmenDetector implements AmenDetector {
  /// 마이크 입력 음량(0..1).
  ValueListenable<double> get inputLevel;

  /// 마이크 입력의 실제 크기(AGC 적용 전 청크 RMS, dBFS). 무음이면 -90.
  ValueListenable<double> get inputDbfs;

  /// 현재 AGC 이득(dB).
  ValueListenable<double> get currentGainDb;

  /// 가장 최근 인식 텍스트(부분 결과). 바뀔 때마다 알림.
  ValueListenable<String> get transcript;

  /// 이번 세션에서 감지된 트리거 문구 수('아멘'+'돌보소서' 등).
  ValueListenable<int> get phraseCount;

  /// 이번 세션에서 감지된 '아멘' 수.
  ValueListenable<int> get amenCount;

  /// 가장 최근 오류 메시지.
  String? get lastError;
}

/// 진단용 원본 오디오 녹음과 입력 속도 측정을 지원하는 감지기(마이크 테스트 화면용).
abstract class CapturableAmenDetector implements DiagnosticAmenDetector {
  /// 인식기 종류. 예: 'beam+hotword', 'beam', 'greedy', 'greedy(fallback)'. 준비 전엔 빈 문자열.
  ValueListenable<String> get recognizerInfo;

  /// 마이크에서 실제로 들어오는 PCM 바이트 속도(바이트/초, 1초 창). 16 kHz mono PCM16이면 약 32000.
  ValueListenable<double> get bytesPerSecond;

  /// AGC 이전의 원본 샘플 녹음을 시작한다(최대 [maxCaptureSeconds]초).
  void startCapture();

  /// 녹음을 끝내고 WAV(16 kHz mono PCM16)로 저장한 경로를 반환한다. 샘플이 없으면 null.
  Future<String?> stopCapture();

  static const maxCaptureSeconds = 8;
}
