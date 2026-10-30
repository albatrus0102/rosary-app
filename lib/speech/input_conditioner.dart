import 'dart:math' as math;
import 'dart:typed_data';

/// 마이크 입력을 인식기에 넣기 전에 음량을 맞추는 AGC(자동 이득 조절, v2).
///
/// 실험실에서 검증된 `Conditioner`(agc2 + 소프트 리미터)를 그대로 옮긴 순수 Dart 클래스다.
/// 100 ms 안팎의 청크마다 [process]를 호출한다.
///
///  - 처음엔 [initialGainDb](+20 dB)에서 시작한다.
///  - 이 청크가 이득을 적용했을 때 목표([targetDbfs], -20 dBFS RMS)보다 [toleranceDb](6 dB)
///    넘게 크면, 이득을 즉시 깎아 목표+6 dB에 맞춘다(그 청크부터 바로 적용).
///  - 청크가 '말소리'(진행 중인 잡음 바닥 추정치보다 10 dB 넘게 큼)이고 목표보다
///    6 dB 넘게 작으면, 청크마다 [stepDb](0.5 dB)씩 이득을 올린다([maxGainDb] +30 dB까지).
///  - 마지막으로 소프트 리미터(0.5 이하는 선형, 그 위는 tanh 무릎, 최대 0.99)를 걸어
///    출력이 ±1을 넘지 않게 한다.
class InputConditioner {
  InputConditioner({
    this.targetDbfs = -20,
    this.initialGainDb = 20,
    this.maxGainDb = 30,
    this.stepDb = 0.5,
    this.toleranceDb = 6,
  }) : _target = _fromDb(targetDbfs),
       _maxGain = _fromDb(maxGainDb),
       _step = _fromDb(stepDb),
       _tolerance = _fromDb(toleranceDb),
       _gain = _fromDb(initialGainDb);

  final double targetDbfs;
  final double initialGainDb;
  final double maxGainDb;
  final double stepDb;
  final double toleranceDb;

  final double _target; // 목표 RMS(선형)
  final double _maxGain;
  final double _step; // 한 번에 올리는 배율
  final double _tolerance; // 허용 편차 배율(+6 dB ≈ 2.0)

  /// 잡음 바닥 추정의 초기값(청크 RMS, -80 dBFS).
  static const _initialNoise = 1e-4;

  /// 말소리로 볼 최소 RMS(-90 dBFS)와, 잡음 바닥 대비 배율(10 dB).
  static const _minSpeechRms = 3e-5;
  static final double _speechRatio = _fromDb(10);

  /// 잡음 바닥 추정의 하한(약 -101 dBFS). 이보다 낮은 값은 말소리 판정에 영향이 없다
  /// (판정 문턱이 이미 [_minSpeechRms]로 막혀 있다).
  static const _minNoise = 9e-6; // × 10 dB < [_minSpeechRms]

  /// 이 값 미만의 RMS는 [dbfsFloor]로 표시한다.
  static const dbfsFloor = -90.0;

  double _gain;
  double _noise = _initialNoise;
  double _lastInputDbfs = dbfsFloor;

  static double _fromDb(double db) => math.pow(10, db / 20).toDouble();

  /// 현재 이득(dB).
  double get gainDb => 20 * math.log(_gain) / math.ln10;

  /// 가장 최근 청크의 AGC 이전 RMS(dBFS). 무음이면 [dbfsFloor].
  double get inputDbfs => _lastInputDbfs;

  /// 상태를 처음으로 되돌린다(새 녹음 세션을 시작할 때).
  void reset() {
    _gain = _fromDb(initialGainDb);
    _noise = _initialNoise;
    _lastInputDbfs = dbfsFloor;
  }

  /// 청크의 RMS를 dBFS로 바꾼다(최소 [dbfsFloor]).
  static double dbfsOf(Float32List samples) {
    final rms = _rms(samples);
    if (rms <= 0) return dbfsFloor;
    return math.max(dbfsFloor, 20 * math.log(rms) / math.ln10);
  }

  static double _rms(Float32List x) {
    if (x.isEmpty) return 0;
    var e = 0.0;
    for (final v in x) {
      e += v * v;
    }
    return math.sqrt(e / x.length);
  }

  /// [x] 한 청크에 이득을 적용해 새 버퍼로 반환한다. 입력은 바꾸지 않는다.
  Float32List process(Float32List x) {
    final rms = _rms(x);
    _lastInputDbfs = rms <= 0
        ? dbfsFloor
        : math.max(dbfsFloor, 20 * math.log(rms) / math.ln10);

    // 잡음 바닥: 아래로는 즉시, 위로는 청크당 2%씩만 따라간다.
    // 완전 무음(안드로이드 녹음 시작 직후의 0 버퍼 등) 뒤에도 다시 올라올 수 있게
    // [_minNoise] 아래로는 내리지 않는다. (0이 되면 곱셈으로는 영영 회복되지 않아
    // 이후 모든 잡음을 말소리로 보고 이득을 +30 dB까지 올려 버린다.)
    _noise = math.max(
      _minNoise,
      rms < _noise ? rms : math.min(_noise * 1.02, rms),
    );
    final isSpeech = rms > math.max(_noise * _speechRatio, _minSpeechRms);

    if (rms * _gain > _target * _tolerance) {
      _gain = _target * _tolerance / rms;
    } else if (isSpeech && rms * _gain < _target / _tolerance) {
      _gain = math.min(_gain * _step, _maxGain);
    }

    final out = Float32List(x.length);
    for (var i = 0; i < x.length; i++) {
      out[i] = _softLimit(x[i] * _gain);
    }
    return out;
  }

  /// 0.5 이하는 선형, 그 위는 0.5 + 0.49·tanh((|v|-0.5)/0.49). 최대 0.99.
  static double _softLimit(double v) {
    final a = v.abs();
    if (a <= 0.5) return v;
    final y = 0.5 + 0.49 * _tanh((a - 0.5) / 0.49);
    return v < 0 ? -y : y;
  }

  static double _tanh(double x) {
    if (x > 20) return 1;
    final e2 = math.exp(2 * x);
    return (e2 - 1) / (e2 + 1);
  }
}
