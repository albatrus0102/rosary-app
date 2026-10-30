import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:record/record.dart';

/// `record` 패키지로 16kHz mono PCM16 스트림을 받아 Float32 샘플로 변환한다.
class MicCapture {
  MicCapture() : _recorder = AudioRecorder();

  /// 녹음 샘플레이트(Hz).
  static const sampleRate = 16000;

  final AudioRecorder _recorder;
  StreamSubscription<Uint8List>? _sub;
  StreamController<Float32List>? _out;

  final ValueNotifier<double> _level = ValueNotifier(0);
  final ValueNotifier<double> _bytesPerSecond = ValueNotifier(0);
  final Stopwatch _rate = Stopwatch();
  int _rateBytes = 0;
  bool _disposed = false;

  /// 플랫폼에서 실제로 들어오는 PCM 바이트 속도(바이트/초), 1초 창으로 측정한다.
  /// 16 kHz mono PCM16이면 32000 근처여야 한다. 멈춰 있으면 0.
  ValueListenable<double> get bytesPerSecond => _bytesPerSecond;

  void _countBytes(int n) {
    if (_disposed) return;
    if (!_rate.isRunning) _rate.start();
    _rateBytes += n;
    final us = _rate.elapsedMicroseconds;
    if (us >= 1000000) {
      _bytesPerSecond.value = _rateBytes * 1000000 / us;
      _rateBytes = 0;
      _rate
        ..reset()
        ..start();
    }
  }

  void _resetRate() {
    _rate
      ..stop()
      ..reset();
    _rateBytes = 0;
    if (!_disposed) _bytesPerSecond.value = 0;
  }

  /// 입력 음량(0..1). 청크마다 갱신된다. dBFS -60..0 구간을 0..1로 편 값이라
  /// 작은 목소리도 눈에 보이고, 완전 무음이면 0에 가깝다.
  ValueListenable<double> get level => _level;

  /// 청크의 RMS를 0..1 눈금으로 바꾼다.
  @visibleForTesting
  static double levelOf(Float32List samples) {
    if (samples.isEmpty) return 0;
    var sum = 0.0;
    for (final v in samples) {
      sum += v * v;
    }
    final rms = math.sqrt(sum / samples.length);
    if (rms <= 0) return 0;
    final db = 20 * math.log(rms) / math.ln10;
    return ((db + 60) / 60).clamp(0.0, 1.0);
  }

  /// 마이크 권한 확인(없으면 요청).
  Future<bool> hasPermission() => _recorder.hasPermission();

  /// 녹음을 시작하고 Float32 샘플([-1, 1]) 스트림을 반환한다.
  Future<Stream<Float32List>> start() async {
    await _teardown();

    // 음성 인식용 설정: 안드로이드는 VOICE_RECOGNITION 소스(기기 제조사의
    // 음성 인식용 전처리), 자동 이득 켬, 에코 제거·잡음 억제는 끔(인식기 입력을
    // 왜곡할 수 있다).
    RecordConfig config(AndroidAudioSource src) => RecordConfig(
      encoder: AudioEncoder.pcm16bits,
      sampleRate: sampleRate,
      numChannels: 1,
      autoGain: true,
      echoCancel: false,
      noiseSuppress: false,
      androidConfig: AndroidRecordConfig(audioSource: src),
      iosConfig: const IosRecordConfig(
        categoryOptions: [
          IosAudioCategoryOption.defaultToSpeaker,
          IosAudioCategoryOption.allowBluetooth,
        ],
      ),
    );

    Stream<Uint8List> source;
    try {
      source = await _recorder.startStream(
        config(AndroidAudioSource.voiceRecognition),
      );
    } catch (e) {
      // 일부 기기는 VOICE_RECOGNITION 소스를 거부한다. 기본 소스로 한 번 더 시도한다.
      debugPrint('[amen] voiceRecognition source failed ($e); using default');
      source = await _recorder.startStream(
        config(AndroidAudioSource.defaultSource),
      );
    }

    final out = StreamController<Float32List>();
    _out = out;
    _resetRate();
    final converter = _Pcm16Converter();
    _sub = source.listen(
      (chunk) {
        _countBytes(chunk.length);
        final samples = converter.convert(chunk);
        if (samples.isEmpty) return;
        if (!_disposed) _level.value = levelOf(samples);
        if (!out.isClosed) out.add(samples);
      },
      onError: (Object e, StackTrace st) {
        if (!out.isClosed) out.addError(e, st);
      },
      onDone: () {
        if (!out.isClosed) out.close();
      },
    );
    return out.stream;
  }

  Future<void> stop() async {
    await _teardown();
    if (await _recorder.isRecording()) {
      await _recorder.stop();
    }
    _resetRate();
    if (!_disposed) _level.value = 0;
  }

  Future<void> dispose() async {
    await _teardown();
    _disposed = true;
    await _recorder.dispose();
    _level.dispose();
    _bytesPerSecond.dispose();
  }

  Future<void> _teardown() async {
    await _sub?.cancel();
    _sub = null;
    final out = _out;
    _out = null;
    if (out != null && !out.isClosed) await out.close();
  }
}

/// 리틀엔디언 Int16 바이트 → Float32 변환기.
/// 청크 끝에 홀수 바이트가 남으면 다음 청크로 이월한다.
class _Pcm16Converter {
  int? _carry;

  Float32List convert(Uint8List chunk) {
    final carry = _carry;
    _carry = null;

    final total = chunk.length + (carry == null ? 0 : 1);
    final pairs = total ~/ 2;
    final out = Float32List(pairs);
    if (pairs == 0) {
      if (total == 1) _carry = carry ?? chunk[0];
      return out;
    }

    var src = 0;
    for (var i = 0; i < pairs; i++) {
      final int lo;
      if (i == 0 && carry != null) {
        lo = carry;
      } else {
        lo = chunk[src++];
      }
      final hi = chunk[src++];
      var v = (hi << 8) | lo;
      if (v >= 0x8000) v -= 0x10000;
      out[i] = v / 32768.0;
    }
    if (src < chunk.length) _carry = chunk[src];
    return out;
  }
}
