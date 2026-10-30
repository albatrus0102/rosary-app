import 'dart:async';
import 'dart:io';
import 'dart:isolate';
import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';

import 'amen_detector.dart';
import 'amen_matcher.dart';
import 'input_conditioner.dart';
import 'mic_capture.dart';
import 'model_assets.dart';
import 'recognizer_worker.dart';
import 'speech_config.dart';
import 'wav.dart';

/// sherpa_onnx 스트리밍 한국어 인식기로 "아멘"을 감지한다.
///
/// 인식(모델 로드, 디코딩)은 백그라운드 isolate에서 돌고, 이 클래스는 마이크 샘플을
/// 전달하고 부분 결과를 받아 [AmenMatcher]로 판정한다.
class SherpaAmenDetector implements CapturableAmenDetector {
  SherpaAmenDetector({
    MicCapture? mic,
    AmenMatcher? matcher,
    InputConditioner? conditioner,
    this.config = const SpeechConfig(),
    bool highSensitivity = false,
  }) : _mic = mic ?? MicCapture(),
       _matcher = matcher ?? AmenMatcher(),
       _conditioner = conditioner ?? InputConditioner() {
    _matcher.highSensitivity = highSensitivity;
  }

  /// 민감도 높임("아"로만 끝나도 아멘). 실행 중에 바꿀 수 있다.
  bool get highSensitivity => _matcher.highSensitivity;
  set highSensitivity(bool v) => _matcher.highSensitivity = v;

  /// 'ready' 응답의 방식 정보를 사람이 읽는 이름으로 바꾼다.
  /// [requestedMethod]는 설정에 적은 디코딩 방식, [method]/[hotwords]는 실제로 만들어진 것.
  @visibleForTesting
  static String describeRecognizer({
    required String requestedMethod,
    required String method,
    required bool hotwords,
  }) {
    if (method == 'greedy_search') {
      return requestedMethod == 'greedy_search' ? 'greedy' : 'greedy(fallback)';
    }
    return hotwords ? 'beam+hotword' : 'beam';
  }

  final SpeechConfig config;

  final MicCapture _mic;
  final AmenMatcher _matcher;
  final InputConditioner _conditioner;

  /// AGC와 인식기에 넘기는 청크 크기(100 ms). 실험실 Conditioner의 시정수(이득 +0.5 dB/청크,
  /// 잡음 바닥 +2%/청크)는 100 ms 청크로 검증됐는데, 플랫폼이 주는 청크는 iOS 약 21 ms,
  /// 안드로이드는 기기마다 다르다. 그래서 크기를 여기서 맞춘다.
  static const chunkSamples = 1600;

  final Float32List _pending = Float32List(chunkSamples);
  int _pendingLen = 0;

  final StreamController<int> _amenController =
      StreamController<int>.broadcast();
  final StreamController<String> _phraseController =
      StreamController<String>.broadcast();
  final ValueNotifier<DetectorState> _state = ValueNotifier(DetectorState.idle);
  final ValueNotifier<String> _transcript = ValueNotifier('');
  final ValueNotifier<int> _phraseCount = ValueNotifier(0);
  final ValueNotifier<int> _amenCount = ValueNotifier(0);
  final ValueNotifier<double> _inputDbfs = ValueNotifier(
    InputConditioner.dbfsFloor,
  );
  late final ValueNotifier<double> _gainDb = ValueNotifier(_conditioner.gainDb);
  final ValueNotifier<String> _recognizerInfo = ValueNotifier('');

  // 원본(AGC 이전) 샘플 녹음.
  Float32List? _captureBuf;
  int _captureLen = 0;

  Isolate? _isolate;

  /// 종료 중인 작업자의 수신 포트 → 마무리 콜백('disposed' 응답 또는 시간 제한).
  final Map<ReceivePort, void Function()> _retiring = {};
  ReceivePort? _fromWorker;
  SendPort? _toWorker;
  Completer<void>? _ready;
  StreamSubscription<Float32List>? _micSub;
  Future<void>? _starting;
  bool _disposed = false;

  String? _lastTranscript;
  String? _lastError;

  DateTime _lastPartialLog = DateTime.fromMillisecondsSinceEpoch(0);
  DateTime _lastLevelLog = DateTime.fromMillisecondsSinceEpoch(0);
  int _chunks = 0;

  @override
  Stream<int> get amenEvents => _amenController.stream;

  @override
  Stream<String> get phraseEvents => _phraseController.stream;

  @override
  ValueListenable<DetectorState> get state => _state;

  @override
  String? get lastTranscript => _lastTranscript;

  /// state가 [DetectorState.error]일 때의 오류 메시지.
  @override
  String? get lastError => _lastError;

  @override
  ValueListenable<double> get inputLevel => _mic.level;

  @override
  ValueListenable<double> get inputDbfs => _inputDbfs;

  @override
  ValueListenable<double> get currentGainDb => _gainDb;

  @override
  ValueListenable<String> get recognizerInfo => _recognizerInfo;

  @override
  ValueListenable<double> get bytesPerSecond => _mic.bytesPerSecond;

  @override
  void startCapture() {
    _captureBuf = Float32List(
      CapturableAmenDetector.maxCaptureSeconds * MicCapture.sampleRate,
    );
    _captureLen = 0;
  }

  @override
  Future<String?> stopCapture() async {
    final buf = _captureBuf;
    final len = _captureLen;
    _captureBuf = null;
    _captureLen = 0;
    if (buf == null || len == 0) return null;
    final docs = await getApplicationDocumentsDirectory();
    final dir = Directory('${docs.path}/mic_capture');
    await dir.create(recursive: true);
    final t = DateTime.now();
    String two(int n) => n.toString().padLeft(2, '0');
    final stamp =
        '${t.year}${two(t.month)}${two(t.day)}_'
        '${two(t.hour)}${two(t.minute)}${two(t.second)}';
    final file = File('${dir.path}/capture_$stamp.wav');
    await file.writeAsBytes(
      encodeWavPcm16(Float32List.sublistView(buf, 0, len)),
      flush: true,
    );
    debugPrint('[amen] raw capture saved ${file.path} ($len samples)');
    return file.path;
  }

  @override
  ValueListenable<String> get transcript => _transcript;

  @override
  ValueListenable<int> get phraseCount => _phraseCount;

  @override
  ValueListenable<int> get amenCount => _amenCount;

  void _setState(DetectorState s) {
    if (_disposed || _state.value == s) return;
    debugPrint('[amen] state ${_state.value.name} -> ${s.name}');
    _state.value = s;
  }

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
      _setState(DetectorState.preparingModel);

      if (_isolate == null) await _spawnWorker();
      if (_disposed) return;

      if (!await _mic.hasPermission()) {
        debugPrint('[amen] microphone permission denied');
        _setState(DetectorState.permissionDenied);
        return;
      }

      _matcher.reset();
      _conditioner.reset();
      _gainDb.value = _conditioner.gainDb;
      _toWorker?.send(['reset']);
      final samples = await _mic.start();
      if (_disposed) {
        await _mic.stop();
        return;
      }
      await _micSub?.cancel();
      _chunks = 0;
      _pendingLen = 0;
      _micSub = samples.listen(
        _onSamples,
        onError: (Object e, StackTrace st) => _fail(e),
      );
      _setState(DetectorState.listening);
    } catch (e) {
      await _fail(e);
    }
  }

  /// 모델 파일/핫워드 파일을 준비하고 인식 isolate를 띄운 뒤 'ready'를 기다린다.
  Future<void> _spawnWorker() async {
    final dir = await ModelAssets.ensureCopied();
    final params = await _buildParams(dir);
    if (_disposed) return;

    final port = ReceivePort();
    final ready = Completer<void>();
    _fromWorker = port;
    _ready = ready;
    port.listen((raw) => _onWorkerMessage(port, raw));

    debugPrint('[amen] spawning recognizer isolate: $config');
    final isolate = await Isolate.spawn<List<Object>>(
      recognizerWorkerMain,
      [port.sendPort, params.toMessage()],
      debugName: 'amen-recognizer',
      onError: port.sendPort, // 처리되지 않은 오류도 ['msg', 'stack'] 리스트로 받는다.
    );
    if (_disposed) {
      isolate.kill(priority: Isolate.immediate);
      return;
    }
    _isolate = isolate;
    // 모델 로드는 오래 걸릴 수 있어 넉넉히 기다린다.
    await ready.future.timeout(
      const Duration(seconds: 90),
      onTimeout: () => throw TimeoutException('음성 인식 모델 로드 시간 초과'),
    );
  }

  Future<RecognizerParams> _buildParams(String dir) async {
    final tokensPath = '$dir/${ModelAssets.tokensFile}';
    var hotwordsFile = '';
    var modelingUnit = '';
    var bpeVocab = '';

    if (config.usesHotwords) {
      List<String> lines;
      if (config.usesBpe) {
        // bpe.vocab이 평문을 알아서 쪼갠다. 토큰 검증은 필요 없다.
        modelingUnit = 'bpe';
        bpeVocab = '$dir/${ModelAssets.bpeVocabFile}';
        lines = [
          for (final h in config.hotwords)
            if (h.trim().isNotEmpty) h.trim(),
        ];
      } else {
        modelingUnit = config.modelingUnit;
        final tokens = SpeechConfig.parseTokens(
          await File(tokensPath).readAsString(),
        );
        lines = SpeechConfig.filterHotwords(
          config.hotwords,
          tokens,
          onSkipped: (line, missing) => debugPrint(
            '[amen] hotword skipped "$line": token "$missing" not in tokens.txt',
          ),
        );
      }
      if (lines.isNotEmpty) {
        final support = await getApplicationSupportDirectory();
        final file = File('${support.path}/hotwords.txt');
        await file.writeAsString('${lines.join('\n')}\n', flush: true);
        hotwordsFile = file.path;
        debugPrint(
          '[amen] hotwords file ${file.path}: $lines '
          '(unit: ${modelingUnit.isEmpty ? 'tokens' : modelingUnit})',
        );
      } else {
        debugPrint('[amen] no usable hotwords; running without');
      }
    }

    return RecognizerParams(
      modelDir: dir,
      encoder: '$dir/${ModelAssets.encoderFile}',
      decoder: '$dir/${ModelAssets.decoderFile}',
      joiner: '$dir/${ModelAssets.joinerFile}',
      tokens: tokensPath,
      decodingMethod: config.decodingMethod,
      hotwordsFile: hotwordsFile,
      hotwordsScore: config.hotwordsScore,
      maxActivePaths: config.maxActivePaths,
      modelingUnit: modelingUnit,
      bpeVocab: bpeVocab,
      rule1: config.rule1,
      rule2: config.rule2,
      rule3: config.rule3,
      numThreads: config.numThreads,
    );
  }

  void _onWorkerMessage(ReceivePort from, dynamic raw) {
    if (raw is! List || raw.isEmpty) return;
    if (!identical(from, _fromWorker)) {
      // 종료 중인 작업자: 네이티브 자원 해제 완료 응답만 받는다.
      if (raw[0] == 'disposed') {
        debugPrint('[amen] worker disposed');
        _retiring.remove(from)?.call();
      }
      return;
    }
    if (_disposed) return;
    switch (raw[0]) {
      case 'port':
        _toWorker = raw[1] as SendPort;
      case 'ready':
        debugPrint(
          '[amen] recognizer ready: method=${raw[1]} hotwords=${raw[2]}',
        );
        _recognizerInfo.value = describeRecognizer(
          requestedMethod: config.decodingMethod,
          method: raw[1] as String,
          hotwords: raw[2] as bool,
        );
        if (_ready?.isCompleted == false) _ready!.complete();
      // stop() 뒤에 도착한 결과(작업자 큐에 남아 있던 오디오)는 버린다. 그렇지 않으면
      // 일시정지 직후에 '아멘'이 발생해 기도가 넘어갈 수 있다.
      case 'partial' when _state.value == DetectorState.listening:
        _onPartial(raw[1] as String);
      case 'endpoint' when _state.value == DetectorState.listening:
        _onEndpoint(raw[1] as String);
      case 'partial' || 'endpoint':
        break;
      case 'error':
        _onWorkerError(raw[1] as String);
      default:
        // Isolate.spawn(onError:)의 ['오류', '스택'] 형태.
        if (raw.length == 2 && raw[0] is String && raw[1] is String?) {
          _onWorkerError('isolate: ${raw[0]}');
        }
    }
  }

  void _onWorkerError(String message) {
    debugPrint('[amen] worker error: $message');
    final ready = _ready;
    if (ready != null && !ready.isCompleted) {
      ready.completeError(StateError(message));
    } else {
      unawaited(_fail(message));
    }
  }

  void _onPartial(String text) {
    _lastTranscript = text;
    _transcript.value = text;

    final now = DateTime.now();
    if (now.difference(_lastPartialLog) >= const Duration(milliseconds: 500)) {
      _lastPartialLog = now;
      debugPrint('[amen] partial "$text"');
    }

    _emit(_matcher.onPartial(text), text);
  }

  void _onEndpoint(String text) {
    debugPrint('[amen] endpoint "$text"');
    _emit(_matcher.onEndpoint(text), text);
  }

  void _emit(List<String> phrases, String text) {
    if (phrases.isEmpty) return;
    debugPrint('[amen] matched $phrases in "$text"');
    for (final p in phrases) {
      if (!_phraseController.isClosed) _phraseController.add(p);
    }
    _phraseCount.value += phrases.length;
    final n = phrases.where((p) => p == AmenMatcher.amen).length;
    if (n > 0) {
      _amenCount.value += n;
      if (!_amenController.isClosed) _amenController.add(n);
    }
  }

  void _onSamples(Float32List samples) {
    final cap = _captureBuf;
    if (cap != null && _captureLen < cap.length) {
      final n = math.min(samples.length, cap.length - _captureLen);
      cap.setRange(_captureLen, _captureLen + n, samples);
      _captureLen += n;
    }
    if (_toWorker == null || _disposed) return;
    var i = 0;
    while (i < samples.length) {
      final n = math.min(chunkSamples - _pendingLen, samples.length - i);
      _pending.setRange(_pendingLen, _pendingLen + n, samples, i);
      _pendingLen += n;
      i += n;
      if (_pendingLen == chunkSamples) {
        _pendingLen = 0;
        _onChunk(_pending);
      }
    }
  }

  /// 100 ms 청크 하나를 AGC에 통과시켜 인식 isolate로 보낸다.
  void _onChunk(Float32List samples) {
    final port = _toWorker;
    if (port == null) return;
    _chunks++;
    // 인식기에는 AGC를 거친 샘플을 보낸다. 표시용 dBFS는 AGC 이전 값이다.
    final conditioned = _conditioner.process(samples);
    _inputDbfs.value = _conditioner.inputDbfs;
    _gainDb.value = _conditioner.gainDb;
    final now = DateTime.now();
    if (now.difference(_lastLevelLog) >= const Duration(seconds: 2)) {
      _lastLevelLog = now;
      debugPrint(
        '[amen] mic level=${_mic.level.value.toStringAsFixed(2)} '
        'dBFS=${_conditioner.inputDbfs.toStringAsFixed(1)} '
        'gain=${_conditioner.gainDb.toStringAsFixed(1)}dB '
        'chunks=$_chunks (${samples.length} samples/chunk)',
      );
    }
    port.send(['audio', packSamples(conditioned)]);
  }

  Future<void> _fail(Object e) async {
    _lastError = e is ModelMissingException ? e.message : e.toString();
    debugPrint('[amen] error: $_lastError');
    try {
      await _micSub?.cancel();
      _micSub = null;
      await _mic.stop();
    } catch (_) {
      // 정리 중 오류는 무시한다.
    }
    _killWorker();
    _setState(DetectorState.error);
  }

  /// 작업자 isolate를 종료한다. 다음 start()에서 새로 띄운다.
  void _killWorker() {
    final isolate = _isolate;
    final port = _fromWorker;
    final toWorker = _toWorker;
    _isolate = null;
    _toWorker = null;
    _fromWorker = null;
    _ready = null;

    var done = false;
    void finish() {
      if (done) return;
      done = true;
      _retiring.remove(port);
      port?.close();
      isolate?.kill(priority: Isolate.immediate);
    }

    if (port == null || toWorker == null) {
      finish();
      return;
    }
    // 작업자가 네이티브 자원(모델)을 풀고 'disposed'를 보내면 isolate를 끝낸다.
    // 'dispose'는 큐에 밀린 오디오 뒤에 처리되므로, 해제 전에 죽여 네이티브 메모리가
    // 새지 않게 응답을 기다리되 응답이 없으면(초기화 실패 등) 시간 제한 뒤 끝낸다.
    _retiring[port] = finish;
    toWorker.send(['dispose']);
    Timer(const Duration(seconds: 10), finish);
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
    // await 사이에 dispose()가 끝났으면 해제된 상태를 건드리지 않는다.
    if (_disposed) return;
    _matcher.reset();
    _inputDbfs.value = InputConditioner.dbfsFloor;
    _toWorker?.send(['reset']);
    _setState(DetectorState.stopped);
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
    debugPrint('[amen] dispose');
    await _micSub?.cancel();
    _micSub = null;
    try {
      await _mic.dispose();
    } catch (_) {}
    _killWorker();
    await _amenController.close();
    await _phraseController.close();
    _state.dispose();
    _transcript.dispose();
    _phraseCount.dispose();
    _amenCount.dispose();
    _inputDbfs.dispose();
    _gainDb.dispose();
    _recognizerInfo.dispose();
  }
}
