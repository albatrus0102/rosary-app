import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:sherpa_onnx/sherpa_onnx.dart' as sherpa;

import 'amen_detector.dart';
import 'amen_matcher.dart';
import 'mic_capture.dart';
import 'model_assets.dart';

/// sherpa_onnx 스트리밍 한국어 인식기로 "아멘"을 감지한다.
class SherpaAmenDetector implements AmenDetector {
  SherpaAmenDetector({MicCapture? mic, AmenMatcher? matcher})
    : _mic = mic ?? MicCapture(),
      _matcher = matcher ?? AmenMatcher();

  static bool _bindingsReady = false;
  static const int _sampleRate = 16000;

  final MicCapture _mic;
  final AmenMatcher _matcher;
  final StreamController<int> _amenController =
      StreamController<int>.broadcast();
  final StreamController<String> _phraseController =
      StreamController<String>.broadcast();
  final ValueNotifier<DetectorState> _state = ValueNotifier(DetectorState.idle);

  sherpa.OnlineRecognizer? _recognizer;
  sherpa.OnlineStream? _stream;
  StreamSubscription<Float32List>? _micSub;
  Future<void>? _starting;
  bool _disposed = false;

  String? _lastTranscript;
  String? _lastError;

  @override
  Stream<int> get amenEvents => _amenController.stream;

  @override
  Stream<String> get phraseEvents => _phraseController.stream;

  @override
  ValueListenable<DetectorState> get state => _state;

  @override
  String? get lastTranscript => _lastTranscript;

  /// state가 [DetectorState.error]일 때의 오류 메시지.
  String? get lastError => _lastError;

  @override
  Future<void> start() {
    if (_disposed) return Future.value();
    if (_state.value == DetectorState.listening) return Future.value();
    // 시작 중 중복 호출은 진행 중인 시작에 합류한다.
    return _starting ??= _doStart().whenComplete(() => _starting = null);
  }

  Future<void> _doStart() async {
    try {
      _lastError = null;
      _state.value = DetectorState.preparingModel;

      if (!_bindingsReady) {
        sherpa.initBindings();
        _bindingsReady = true;
      }

      if (_recognizer == null) {
        final dir = await ModelAssets.ensureCopied();
        final config = sherpa.OnlineRecognizerConfig(
          feat: const sherpa.FeatureConfig(
            sampleRate: _sampleRate,
            featureDim: 80,
          ),
          model: sherpa.OnlineModelConfig(
            transducer: sherpa.OnlineTransducerModelConfig(
              encoder: '$dir/${ModelAssets.encoderFile}',
              decoder: '$dir/${ModelAssets.decoderFile}',
              joiner: '$dir/${ModelAssets.joinerFile}',
            ),
            tokens: '$dir/${ModelAssets.tokensFile}',
            modelType: 'zipformer',
            numThreads: 2,
            debug: false,
          ),
          decodingMethod: 'greedy_search',
          enableEndpoint: true,
          rule1MinTrailingSilence: 1.5,
          rule2MinTrailingSilence: 0.8,
          rule3MinUtteranceLength: 20,
        );
        _recognizer = sherpa.OnlineRecognizer(config);
      }
      _stream ??= _recognizer!.createStream();
      if (_disposed) return;

      if (!await _mic.hasPermission()) {
        _state.value = DetectorState.permissionDenied;
        return;
      }

      _matcher.onEndpoint();
      final samples = await _mic.start();
      if (_disposed) {
        await _mic.stop();
        return;
      }
      await _micSub?.cancel();
      _micSub = samples.listen(
        _onSamples,
        onError: (Object e, StackTrace st) => _fail(e),
      );
      _state.value = DetectorState.listening;
    } catch (e) {
      await _fail(e);
    }
  }

  void _onSamples(Float32List samples) {
    final recognizer = _recognizer;
    final stream = _stream;
    if (recognizer == null || stream == null || _disposed) return;
    try {
      stream.acceptWaveform(samples: samples, sampleRate: _sampleRate);
      while (recognizer.isReady(stream)) {
        recognizer.decode(stream);
      }
      final text = recognizer.getResult(stream).text;
      _lastTranscript = text;
      final phrases = _matcher.onPartial(text);
      if (phrases.isNotEmpty) {
        for (final p in phrases) {
          if (!_phraseController.isClosed) _phraseController.add(p);
        }
        final n = phrases.where((p) => p == '아멘').length;
        if (n > 0 && !_amenController.isClosed) _amenController.add(n);
      }
      if (recognizer.isEndpoint(stream)) {
        _matcher.onEndpoint();
        recognizer.reset(stream);
      }
    } catch (e) {
      _fail(e);
    }
  }

  Future<void> _fail(Object e) async {
    _lastError = e is ModelMissingException ? e.message : e.toString();
    try {
      await _micSub?.cancel();
      _micSub = null;
      await _mic.stop();
    } catch (_) {
      // 정리 중 오류는 무시한다.
    }
    if (!_disposed) _state.value = DetectorState.error;
  }

  @override
  Future<void> stop() async {
    if (_disposed) return;
    final pending = _starting;
    if (pending != null) {
      try {
        await pending;
      } catch (_) {}
    }
    await _micSub?.cancel();
    _micSub = null;
    await _mic.stop();
    // await 사이에 dispose()가 끝났으면 해제된 인식기/상태를 건드리지 않는다.
    if (_disposed) return;
    _matcher.onEndpoint();
    final stream = _stream;
    if (stream != null) _recognizer?.reset(stream);
    _state.value = DetectorState.stopped;
  }

  @override
  Future<void> dispose() async {
    if (_disposed) return;
    final pending = _starting;
    if (pending != null) {
      try {
        await pending;
      } catch (_) {}
    }
    _disposed = true;
    await _micSub?.cancel();
    _micSub = null;
    try {
      await _mic.dispose();
    } catch (_) {}
    _stream?.free();
    _stream = null;
    _recognizer?.free();
    _recognizer = null;
    await _amenController.close();
    await _phraseController.close();
    _state.dispose();
  }
}
