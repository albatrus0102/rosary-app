import 'dart:async';
import 'dart:typed_data';

import 'package:record/record.dart';

/// `record` 패키지로 16kHz mono PCM16 스트림을 받아 Float32 샘플로 변환한다.
class MicCapture {
  MicCapture() : _recorder = AudioRecorder();

  final AudioRecorder _recorder;
  StreamSubscription<Uint8List>? _sub;
  StreamController<Float32List>? _out;

  /// 마이크 권한 확인(없으면 요청).
  Future<bool> hasPermission() => _recorder.hasPermission();

  /// 녹음을 시작하고 Float32 샘플([-1, 1]) 스트림을 반환한다.
  Future<Stream<Float32List>> start() async {
    await _teardown();

    const config = RecordConfig(
      encoder: AudioEncoder.pcm16bits,
      sampleRate: 16000,
      numChannels: 1,
    );
    final source = await _recorder.startStream(config);

    final out = StreamController<Float32List>();
    _out = out;
    final converter = _Pcm16Converter();
    _sub = source.listen(
      (chunk) {
        final samples = converter.convert(chunk);
        if (samples.isNotEmpty && !out.isClosed) out.add(samples);
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
  }

  Future<void> dispose() async {
    await _teardown();
    await _recorder.dispose();
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
