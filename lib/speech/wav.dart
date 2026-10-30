import 'dart:math' as math;
import 'dart:typed_data';

/// Float32 샘플([-1, 1])을 16 kHz(기본) mono PCM16 WAV 바이트로 만든다.
Uint8List encodeWavPcm16(Float32List samples, {int sampleRate = 16000}) {
  final dataBytes = samples.length * 2;
  final out = ByteData(44 + dataBytes);
  void tag(int offset, String s) {
    for (var i = 0; i < s.length; i++) {
      out.setUint8(offset + i, s.codeUnitAt(i));
    }
  }

  tag(0, 'RIFF');
  out.setUint32(4, 36 + dataBytes, Endian.little);
  tag(8, 'WAVE');
  tag(12, 'fmt ');
  out.setUint32(16, 16, Endian.little); // fmt 청크 크기
  out.setUint16(20, 1, Endian.little); // PCM
  out.setUint16(22, 1, Endian.little); // mono
  out.setUint32(24, sampleRate, Endian.little);
  out.setUint32(28, sampleRate * 2, Endian.little); // 바이트/초
  out.setUint16(32, 2, Endian.little); // 블록 크기
  out.setUint16(34, 16, Endian.little); // 비트 수
  tag(36, 'data');
  out.setUint32(40, dataBytes, Endian.little);
  for (var i = 0; i < samples.length; i++) {
    final v = (samples[i] * 32768.0).round();
    out.setInt16(
      44 + i * 2,
      math.max(-32768, math.min(32767, v)),
      Endian.little,
    );
  }
  return out.buffer.asUint8List();
}
