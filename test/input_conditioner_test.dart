import 'dart:math' as math;
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/speech/input_conditioner.dart';

const _sr = 16000;
const _chunk = 1600; // 100 ms

double _dbOf(Float32List x) => InputConditioner.dbfsOf(x);

/// 위상이 이어지는 100 ms 청크로 [seconds]초짜리 사인파를 만든다(RMS = [rmsDbfs]).
List<Float32List> _sine(double rmsDbfs, double seconds, {double hz = 220}) {
  final amp = math.pow(10, rmsDbfs / 20) * math.sqrt2;
  final chunks = <Float32List>[];
  var n = 0;
  for (var c = 0; c < (seconds * 10).round(); c++) {
    final x = Float32List(_chunk);
    for (var i = 0; i < _chunk; i++, n++) {
      x[i] = (amp * math.sin(2 * math.pi * hz * n / _sr)).toDouble();
    }
    chunks.add(x);
  }
  return chunks;
}

void main() {
  test('starts at +20 dB', () {
    expect(InputConditioner().gainDb, closeTo(20, 1e-9));
  });

  test('dbfsOf measures RMS', () {
    final x = _sine(-30, 0.1).first;
    expect(_dbOf(x), closeTo(-30, 0.1));
    expect(_dbOf(Float32List(_chunk)), InputConditioner.dbfsFloor);
    expect(_dbOf(Float32List(0)), InputConditioner.dbfsFloor);
  });

  test('quiet -45 dBFS sine is amplified toward -20 dBFS within 2 s', () {
    final c = InputConditioner();
    Float32List? last;
    for (final x in _sine(-45, 2)) {
      last = c.process(x);
    }
    expect(c.inputDbfs, closeTo(-45, 0.1));
    // +20 dB 시작 이득만으로 -25 dBFS, 목표 대비 6 dB 이내.
    expect(_dbOf(last!), greaterThan(-26.5));
    expect(_dbOf(last), lessThanOrEqualTo(-19));
    expect(c.gainDb, greaterThanOrEqualTo(19.9));
  });

  test('very quiet -55 dBFS sine climbs 0.5 dB per chunk up to the target', () {
    final c = InputConditioner();
    final gains = <double>[];
    Float32List? last;
    for (final x in _sine(-55, 2)) {
      last = c.process(x);
      gains.add(c.gainDb);
    }
    expect(gains.first, closeTo(20.5, 0.05));
    expect(gains[1] - gains[0], closeTo(0.5, 0.05));
    expect(c.gainDb, closeTo(29, 0.5)); // -55 + 29 = -26 dBFS에서 멈춘다.
    expect(_dbOf(last!), inInclusiveRange(-27, -24));
    expect(c.gainDb, lessThanOrEqualTo(30.0001));
  });

  test('gain never exceeds +30 dB', () {
    final c = InputConditioner();
    // 말소리로 보이는 -70 dBFS 입력을 오래 넣어도 상한을 넘지 않는다.
    for (final x in _sine(-70, 5)) {
      c.process(x);
    }
    expect(c.gainDb, lessThanOrEqualTo(30.0001));
  });

  test('loud -6 dBFS input is cut immediately and not boosted', () {
    final c = InputConditioner();
    final first = c.process(_sine(-6, 0.1).first);
    // 첫 청크부터 목표+6 dB(-14 dBFS)로 내려온다.
    expect(c.gainDb, lessThan(0));
    expect(_dbOf(first), lessThanOrEqualTo(-13.9));
    Float32List? last;
    for (final x in _sine(-6, 2)) {
      last = c.process(x);
    }
    expect(c.gainDb, lessThan(0));
    expect(_dbOf(last!), lessThanOrEqualTo(-13.9));
    expect(_dbOf(last), lessThan(-6));
  });

  test('gain recovers after a loud burst', () {
    final c = InputConditioner();
    c.process(_sine(-6, 0.1).first);
    final cut = c.gainDb;
    for (final x in _sine(-45, 3)) {
      c.process(x);
    }
    expect(c.gainDb, greaterThan(cut));
  });

  test('silence stays silent and gain stays put', () {
    final c = InputConditioner();
    for (var i = 0; i < 50; i++) {
      final out = c.process(Float32List(_chunk));
      expect(out.every((v) => v == 0), isTrue);
    }
    expect(c.inputDbfs, InputConditioner.dbfsFloor);
    expect(c.gainDb, closeTo(20, 1e-9));
  });

  test('low-level noise is not pumped up like speech', () {
    final c = InputConditioner();
    final rnd = math.Random(1);
    Float32List? last;
    for (var k = 0; k < 50; k++) {
      final x = Float32List(_chunk);
      for (var i = 0; i < _chunk; i++) {
        x[i] = (rnd.nextDouble() * 2 - 1) * 3e-4;
      }
      last = c.process(x);
    }
    expect(c.gainDb, closeTo(20, 0.6)); // 잡음 바닥보다 10 dB 높지 않으면 올리지 않는다.
    expect(_dbOf(last!), lessThan(-30));
  });

  test('noise floor recovers after digital silence (no endless pumping)', () {
    // 녹음 시작 직후의 완전 무음 버퍼가 잡음 바닥 추정을 0에 묶어 두면 이후 모든
    // 잡음이 말소리로 판정되어 이득이 계속 오른다.
    final c = InputConditioner();
    final rnd = math.Random(2);
    Float32List noise() {
      final x = Float32List(_chunk);
      for (var i = 0; i < _chunk; i++) {
        x[i] = (rnd.nextDouble() * 2 - 1) * 3e-4; // ≈ -75 dBFS
      }
      return x;
    }

    for (var i = 0; i < 3; i++) {
      c.process(Float32List(_chunk));
    }
    for (var i = 0; i < 300; i++) {
      c.process(noise()); // 30 s: 잡음 바닥 추정이 다시 따라 올라온다.
    }
    for (final x in _sine(-6, 0.1)) {
      c.process(x); // 큰 소리로 이득을 깎는다.
    }
    final cut = c.gainDb;
    for (var i = 0; i < 50; i++) {
      c.process(noise());
    }
    expect(c.gainDb, closeTo(cut, 1e-9));
  });

  test('output never exceeds +/-1, even for full-scale and clipped input', () {
    final c = InputConditioner();
    for (final level in [0.0, -3.0, -6.0, -20.0, -45.0]) {
      for (final x in _sine(level, 0.5)) {
        final out = c.process(x);
        expect(out.every((v) => v.abs() <= 1.0), isTrue);
      }
    }
    // 사각파(±1)
    final square = Float32List.fromList([
      for (var i = 0; i < _chunk; i++) i.isEven ? 1.0 : -1.0,
    ]);
    final out = InputConditioner().process(square);
    expect(out.every((v) => v.abs() <= 0.99 + 1e-9), isTrue);
  });

  test('limiter is linear below 0.5 and does not alter the input buffer', () {
    final c = InputConditioner(initialGainDb: 0);
    // RMS ≈ -23 dBFS: 목표±6 dB 안이라 이득이 그대로(0 dB)이고, 0.5 이하라 리미터도 선형이다.
    final x = Float32List.fromList([0.07, -0.07, 0.07, -0.07]);
    final copy = Float32List.fromList(x);
    final out = c.process(x);
    expect(x, copy);
    expect(out.length, x.length);
    for (var i = 0; i < x.length; i++) {
      expect(out[i], closeTo(x[i], 1e-6));
    }
  });

  test('reset restores the initial state', () {
    final c = InputConditioner();
    c.process(_sine(-6, 0.1).first);
    expect(c.gainDb, lessThan(0));
    c.reset();
    expect(c.gainDb, closeTo(20, 1e-9));
    expect(c.inputDbfs, InputConditioner.dbfsFloor);
  });
}
