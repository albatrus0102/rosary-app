import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/speech/sherpa_amen_detector.dart';
import 'package:rosary_app/speech/wav.dart';

void main() {
  test('encodeWavPcm16 writes a 16 kHz mono PCM16 header and clamps', () {
    final wav = encodeWavPcm16(Float32List.fromList([0, 0.5, -1, 2]));
    final b = ByteData.sublistView(wav);
    expect(String.fromCharCodes(wav.sublist(0, 4)), 'RIFF');
    expect(String.fromCharCodes(wav.sublist(8, 12)), 'WAVE');
    expect(b.getUint32(24, Endian.little), 16000);
    expect(b.getUint16(22, Endian.little), 1);
    expect(b.getUint16(34, Endian.little), 16);
    expect(b.getUint32(40, Endian.little), 8);
    expect(wav.length, 44 + 8);
    expect(b.getInt16(46, Endian.little), 16384);
    expect(b.getInt16(48, Endian.little), -32768);
    expect(b.getInt16(50, Endian.little), 32767);
  });

  test('describeRecognizer names beam, hotword and fallback', () {
    String d(String req, String m, bool h) =>
        SherpaAmenDetector.describeRecognizer(
          requestedMethod: req,
          method: m,
          hotwords: h,
        );
    expect(
      d('modified_beam_search', 'modified_beam_search', true),
      'beam+hotword',
    );
    expect(
      d('modified_beam_search', 'greedy_search', false),
      'greedy(fallback)',
    );
    expect(d('greedy_search', 'greedy_search', false), 'greedy');
  });
}
