import 'dart:isolate';

import 'package:flutter/foundation.dart';
import 'package:sherpa_onnx/sherpa_onnx.dart' as sherpa;

/// 백그라운드 isolate에서 sherpa-onnx 인식기를 돌리는 작업자.
///
/// 메인 → 작업자 (`SendPort`로 보내는 리스트):
///   `['audio', TransferableTypedData]`  Float32 16kHz 샘플
///   `['reset']`                         스트림 초기화(인식 구간 버리기)
///   `['dispose']`                       자원 해제 후 종료
/// 작업자 → 메인:
///   `['port', SendPort]`                작업자의 명령 포트(가장 먼저 온다)
///   `['ready', String decodingMethod, bool hotwords, String fallbackReason]`  모델 로드 완료
///   `['partial', String text]`          부분 결과(바뀔 때만)
///   `['endpoint', String text]`         endpoint 감지(직후 스트림을 리셋함)
///   `['error', String message]`
///   `['disposed']`
class RecognizerParams {
  const RecognizerParams({
    required this.modelDir,
    required this.encoder,
    required this.decoder,
    required this.joiner,
    required this.tokens,
    required this.decodingMethod,
    required this.hotwordsFile,
    required this.hotwordsScore,
    required this.maxActivePaths,
    required this.modelingUnit,
    required this.bpeVocab,
    required this.rule1,
    required this.rule2,
    required this.rule3,
    required this.numThreads,
  });

  final String modelDir;
  final String encoder;
  final String decoder;
  final String joiner;
  final String tokens;
  final String decodingMethod;

  /// 빈 문자열이면 핫워드를 쓰지 않는다.
  final String hotwordsFile;
  final double hotwordsScore;
  final int maxActivePaths;
  final String modelingUnit;
  final String bpeVocab;
  final double rule1;
  final double rule2;
  final double rule3;
  final int numThreads;

  List<Object> toMessage() => [
    modelDir,
    encoder,
    decoder,
    joiner,
    tokens,
    decodingMethod,
    hotwordsFile,
    hotwordsScore,
    maxActivePaths,
    modelingUnit,
    bpeVocab,
    rule1,
    rule2,
    rule3,
    numThreads,
  ];

  factory RecognizerParams.fromMessage(List<Object?> m) => RecognizerParams(
    modelDir: m[0] as String,
    encoder: m[1] as String,
    decoder: m[2] as String,
    joiner: m[3] as String,
    tokens: m[4] as String,
    decodingMethod: m[5] as String,
    hotwordsFile: m[6] as String,
    hotwordsScore: m[7] as double,
    maxActivePaths: m[8] as int,
    modelingUnit: m[9] as String,
    bpeVocab: m[10] as String,
    rule1: m[11] as double,
    rule2: m[12] as double,
    rule3: m[13] as double,
    numThreads: m[14] as int,
  );
}

/// `Isolate.spawn`의 진입점. [message]는 `[SendPort toMain, List params]`.
void recognizerWorkerMain(List<Object> message) {
  final toMain = message[0] as SendPort;
  final params = RecognizerParams.fromMessage(
    (message[1] as List).cast<Object?>(),
  );
  final inbox = ReceivePort();
  toMain.send(['port', inbox.sendPort]);

  sherpa.OnlineRecognizer? recognizer;
  sherpa.OnlineStream? stream;
  var method = params.decodingMethod;
  var withHotwords = params.hotwordsFile.isNotEmpty;
  var fallbackReason = '';

  try {
    // 각 isolate는 네이티브 바인딩을 따로 초기화해야 한다.
    sherpa.initBindings();

    sherpa.OnlineRecognizer build(String decoding, bool hotwords) {
      return sherpa.OnlineRecognizer(
        sherpa.OnlineRecognizerConfig(
          feat: const sherpa.FeatureConfig(sampleRate: 16000, featureDim: 80),
          model: sherpa.OnlineModelConfig(
            transducer: sherpa.OnlineTransducerModelConfig(
              encoder: params.encoder,
              decoder: params.decoder,
              joiner: params.joiner,
            ),
            tokens: params.tokens,
            modelType: 'zipformer',
            numThreads: params.numThreads,
            debug: false,
            modelingUnit: hotwords ? params.modelingUnit : '',
            bpeVocab: hotwords ? params.bpeVocab : '',
          ),
          decodingMethod: decoding,
          maxActivePaths: params.maxActivePaths,
          enableEndpoint: true,
          rule1MinTrailingSilence: params.rule1,
          rule2MinTrailingSilence: params.rule2,
          rule3MinUtteranceLength: params.rule3,
          hotwordsFile: hotwords ? params.hotwordsFile : '',
          hotwordsScore: params.hotwordsScore,
        ),
      );
    }

    try {
      recognizer = build(method, withHotwords);
    } catch (e) {
      if (method == 'greedy_search') rethrow;
      // modified_beam_search(핫워드 포함) 생성 실패 → 핫워드 없는 greedy로 대체.
      debugPrint('[amen] worker: $method init failed ($e); fallback greedy');
      fallbackReason = '$e';
      method = 'greedy_search';
      withHotwords = false;
      recognizer = build(method, false);
    }
    stream = recognizer.createStream();
    toMain.send(['ready', method, withHotwords, fallbackReason]);
  } catch (e) {
    toMain.send(['error', 'recognizer init failed: $e']);
    recognizer?.free();
    inbox.close();
    return;
  }

  final rec = recognizer;
  final st = stream;
  var lastText = '';

  inbox.listen((dynamic raw) {
    final msg = raw as List;
    try {
      switch (msg[0] as String) {
        case 'audio':
          final samples = (msg[1] as TransferableTypedData)
              .materialize()
              .asFloat32List();
          st.acceptWaveform(samples: samples, sampleRate: 16000);
          while (rec.isReady(st)) {
            rec.decode(st);
          }
          final text = rec.getResult(st).text;
          if (text != lastText) {
            lastText = text;
            toMain.send(['partial', text]);
          }
          if (rec.isEndpoint(st)) {
            toMain.send(['endpoint', text]);
            rec.reset(st);
            lastText = '';
          }
        case 'reset':
          rec.reset(st);
          lastText = '';
        case 'dispose':
          st.free();
          rec.free();
          inbox.close();
          toMain.send(['disposed']);
      }
    } catch (e) {
      toMain.send(['error', e.toString()]);
    }
  });
}

/// 메인 쪽에서 오디오를 보낼 때 쓰는 포장.
TransferableTypedData packSamples(Float32List samples) =>
    TransferableTypedData.fromList([samples]);
