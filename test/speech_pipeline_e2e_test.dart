// 음성 파이프라인 종단 간 테스트(리눅스 데스크톱 전용).
//
// 실제 sherpa-onnx 네이티브 라이브러리와 번들 모델로, 앱과 똑같은 경로
//   record 바이트 스트림(모킹) → MicCapture(PCM16→Float32) → SherpaAmenDetector
//   (100 ms 청크 → InputConditioner AGC → 인식 isolate) → AmenMatcher → phraseEvents
// 를 돌린다. 녹음 파일(실험실 wav)이나 리눅스 네이티브 라이브러리가 없으면 건너뛴다.
//
// 실험실 wav 위치는 환경 변수 ROSARY_LAB_DIR(그 아래 wavs_phone/, wavs_neg/)로 바꿀 수 있다.
import 'dart:async';
import 'dart:ffi';
import 'dart:io';
import 'dart:isolate';
import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/speech/amen_detector.dart';
import 'package:rosary_app/speech/model_assets.dart';
import 'package:rosary_app/speech/recognizer_worker.dart';
import 'package:rosary_app/speech/sherpa_amen_detector.dart';

const _defaultLabDir =
    '/tmp/claude-0/-home-user/127c52ad-6e6f-576e-8168-2e8eda5aa1ed/lab';

String get _labDir => Platform.environment['ROSARY_LAB_DIR'] ?? _defaultLabDir;

/// 리눅스 x64용 sherpa-onnx C API 라이브러리 경로(pub 캐시). 없으면 null.
String? _findSherpaLib() {
  if (!Platform.isLinux) return null;
  final home = Platform.environment['HOME'] ?? '';
  final cache = Platform.environment['PUB_CACHE'] ?? '$home/.pub-cache';
  final hosted = Directory('$cache/hosted/pub.dev');
  if (!hosted.existsSync()) return null;
  final arch = Platform.version.contains('arm64') ? 'aarch64' : 'x64';
  for (final d in hosted.listSync().whereType<Directory>()) {
    if (!d.path.split('/').last.startsWith('sherpa_onnx_linux-')) continue;
    final lib = File('${d.path}/linux/$arch/libsherpa-onnx-c-api.so');
    if (lib.existsSync()) return lib.path;
  }
  return null;
}

String? _skipReason() {
  if (!Platform.isLinux) return 'Linux desktop only';
  if (_findSherpaLib() == null) {
    return 'sherpa_onnx_linux native library missing';
  }
  for (final f in ModelAssets.files) {
    if (!File('${ModelAssets.dir}/$f').existsSync()) {
      return 'model asset ${ModelAssets.dir}/$f missing';
    }
  }
  for (final d in ['wavs_phone', 'wavs_neg']) {
    if (!Directory('$_labDir/$d').existsSync()) return 'lab wavs missing ($d)';
  }
  if (!File('$_labDir/wavs_phone/amen__rms-55.wav').existsSync()) {
    return 'lab wav amen__rms-55.wav missing';
  }
  return null;
}

/// 16 kHz mono PCM16 wav의 data 청크(리틀엔디언 바이트)를 그대로 돌려준다.
Uint8List _pcm16Bytes(String path) {
  final b = File(path).readAsBytesSync();
  final bd = ByteData.sublistView(b);
  var off = 12;
  int? rate, channels, bits;
  while (off + 8 <= b.length) {
    final id = String.fromCharCodes(b.sublist(off, off + 4));
    final size = bd.getUint32(off + 4, Endian.little);
    final body = off + 8;
    if (id == 'fmt ') {
      channels = bd.getUint16(body + 2, Endian.little);
      rate = bd.getUint32(body + 4, Endian.little);
      bits = bd.getUint16(body + 14, Endian.little);
    } else if (id == 'data') {
      if (rate != 16000 || channels != 1 || bits != 16) {
        throw StateError(
          '$path: need 16 kHz mono PCM16, got $rate/$channels/$bits',
        );
      }
      return Uint8List.sublistView(b, body, math.min(b.length, body + size));
    }
    off = body + size + (size & 1);
  }
  throw StateError('$path: no data chunk');
}

/// 마이크가 계속 도는 동안의 낮은 잡음(±10 LSB ≈ -73 dBFS RMS), 실험실 꼬리와 같은 수준.
Uint8List _noise(double seconds, math.Random rnd) {
  final n = (seconds * 16000).round();
  final out = ByteData(n * 2);
  for (var i = 0; i < n; i++) {
    out.setInt16(i * 2, rnd.nextInt(21) - 10, Endian.little);
  }
  return out.buffer.asUint8List();
}

Future<void> _waitFor(
  bool Function() cond, {
  Duration timeout = const Duration(seconds: 90),
  required String Function() what,
}) async {
  final sw = Stopwatch()..start();
  while (!cond()) {
    if (sw.elapsed > timeout) throw TimeoutException('waiting for ${what()}');
    await Future<void>.delayed(const Duration(milliseconds: 20));
  }
}

void main() {
  final skip = _skipReason();

  group('speech pipeline end-to-end (Linux, real model)', () {
    late Directory tmp;
    final logs = <String>[];
    final configs = <Map<Object?, Object?>>[];
    MockStreamHandlerEventSink? micSink;
    var failNextStartStream = false;
    final messenger =
        TestWidgetsFlutterBinding.ensureInitialized().defaultBinaryMessenger;
    final origDebugPrint = debugPrint;

    setUpAll(() async {
      // 인식 isolate의 initBindings()가 'libsherpa-onnx-c-api.so'를 이름으로 찾을 수 있게
      // 절대 경로로 먼저 올려 둔다(LD_LIBRARY_PATH 없이도 동작).
      DynamicLibrary.open(_findSherpaLib()!);

      tmp = await Directory.systemTemp.createTemp('rosary_e2e_');
      // ModelAssets.ensureCopied가 크기를 보고 복사를 건너뛰도록 모델을 심볼릭 링크로 둔다.
      final modelDir = Directory(
        '${tmp.path}/${ModelAssets.dir.split('/').last}',
      )..createSync(recursive: true);
      for (final f in ModelAssets.files) {
        Link('${modelDir.path}/$f')
            .createSync(File('${ModelAssets.dir}/$f').absolute.path);
      }

      messenger.setMockMethodCallHandler(
        const MethodChannel('plugins.flutter.io/path_provider'),
        (call) async => tmp.path,
      );
      messenger.setMockMethodCallHandler(
        const MethodChannel('com.llfbandit.record/messages'),
        (call) async {
          final args = (call.arguments as Map?) ?? const {};
          final id = args['recorderId'];
          switch (call.method) {
            case 'create':
              messenger.setMockStreamHandler(
                EventChannel('com.llfbandit.record/events/$id'),
                MockStreamHandler.inline(onListen: (_, _) {}),
              );
              messenger.setMockStreamHandler(
                EventChannel('com.llfbandit.record/eventsRecord/$id'),
                MockStreamHandler.inline(
                  onListen: (_, sink) => micSink = sink,
                  onCancel: (_) => micSink = null,
                ),
              );
              return null;
            case 'hasPermission':
              return true;
            case 'startStream':
              configs.add(Map.of(args));
              if (failNextStartStream) {
                failNextStartStream = false;
                throw PlatformException(
                  code: 'record',
                  message: 'no VR source',
                );
              }
              return null;
            case 'isRecording':
              return micSink != null;
            default:
              return null;
          }
        },
      );
      debugPrint = (String? m, {int? wrapWidth}) {
        if (m != null) logs.add(m);
      };
    });

    tearDownAll(() async {
      debugPrint = origDebugPrint;
      messenger.setMockMethodCallHandler(
        const MethodChannel('plugins.flutter.io/path_provider'),
        null,
      );
      messenger.setMockMethodCallHandler(
        const MethodChannel('com.llfbandit.record/messages'),
        null,
      );
      try {
        await tmp.delete(recursive: true);
      } catch (_) {}
    });

    /// 바이트를 홀수 크기 청크(1365 B ≈ 43 ms)로 잘라 '마이크'에 흘린다.
    Future<void> feed(Uint8List bytes) async {
      const chunk = 1365;
      for (var off = 0; off < bytes.length; off += chunk) {
        final sink = micSink;
        if (sink == null) throw StateError('mic stream not listening');
        sink.success(
          Uint8List.fromList(
            bytes.sublist(off, math.min(off + chunk, bytes.length)),
          ),
        );
        // 플랫폼 메시지가 흘러가도록 이벤트 루프를 가끔 돌린다.
        if ((off ~/ chunk) % 8 == 0) await Future<void>.delayed(Duration.zero);
      }
    }

    test(
      '아멘 clips are detected, prayer negatives are not, across stop/start',
      () async {
        final rnd = math.Random(1);
        final detector = SherpaAmenDetector();
        final phrases = <String>[];
        var maxLevel = 0.0;
        // 청크마다의 이득(dB) 기록. 클립별 범위를 보고하는 데 쓴다.
        final gains = <double>[];
        detector.phraseEvents.listen(phrases.add);
        detector.currentGainDb.addListener(
          () => gains.add(detector.currentGainDb.value),
        );
        detector.inputLevel.addListener(
          () => maxLevel = math.max(maxLevel, detector.inputLevel.value),
        );
        // endpoint 로그는 줄이지 않고 남으므로 구간별 인식 텍스트로 쓴다.
        List<String> segments() => [
          for (final l in logs)
            if (l.startsWith('[amen] endpoint "') && l != '[amen] endpoint ""')
              l.substring('[amen] endpoint "'.length, l.length - 1),
        ];
        String gainRange(int from) {
          final g = gains.skip(from);
          if (g.isEmpty) {
            final now = detector.currentGainDb.value.toStringAsFixed(1);
            return 'gain $now dB (unchanged)';
          }
          return 'gain ${g.reduce(math.min).toStringAsFixed(1)}..'
              '${g.reduce(math.max).toStringAsFixed(1)} dB';
        }

        // ---- 세션 1: 아멘, 큰 것부터 아주 작은 것(-55 dBFS)까지 ----
        await detector.start();
        expect(
          detector.state.value,
          DetectorState.listening,
          reason: 'lastError=${detector.lastError}\n${logs.join('\n')}',
        );
        expect(
          logs.any(
            (l) => l.contains('method=modified_beam_search hotwords=true'),
          ),
          isTrue,
          reason:
              'recognizer must run beam search with the bpe hotword\n'
              '${logs.join('\n')}',
        );
        final cfg = configs.single;
        expect(cfg['encoder'], 'pcm16bits');
        expect(cfg['sampleRate'], 16000);
        expect(cfg['numChannels'], 1);
        expect(cfg['autoGain'], isTrue);
        expect(cfg['echoCancel'], isFalse);
        expect(cfg['noiseSuppress'], isFalse);
        expect(
          (cfg['androidConfig'] as Map)['audioSource'],
          'voiceRecognition',
        );

        // 안드로이드 AudioRecord가 시작 직후 내보내곤 하는 완전 무음 0.3 s.
        await feed(Uint8List(9600));
        // 순서에 주의: 한 세션에서 -35 → -25 순으로 이어지면 모델이 -25 클립을 '맘엔'으로
        // 적어(규칙 A/T 모두 불일치) 놓친다. 파이프라인 문제가 아니라 모델의 문맥 의존성이다.
        const positives = [
          'amen__rms-25',
          'amen__rms-35',
          'amen__rms-45',
          'amen__rms-55',
        ];
        final report = <String>[];
        for (var i = 0; i < positives.length; i++) {
          final g0 = gains.length;
          final s0 = segments().length;
          await feed(_pcm16Bytes('$_labDir/wavs_phone/${positives[i]}.wav'));
          await feed(_noise(2.5, rnd));
          await _waitFor(
            () => phrases.length > i && segments().length > s0,
            what: () =>
                '아멘 from ${positives[i]}: phrases=$phrases '
                'segments=${segments().skip(s0).toList()} ${gainRange(g0)}\n'
                '${logs.join('\n')}',
          );
          report.add(
            '${positives[i]}: ${segments().skip(s0).toList()} ${gainRange(g0)}',
          );
        }
        expect(phrases, List.filled(positives.length, '아멘'));
        expect(detector.amenCount.value, positives.length);
        expect(maxLevel, greaterThan(0));
        // -55 dBFS 입력은 AGC가 +20 dB 시작값보다 더 올려야 한다.
        expect(gains.reduce(math.max), greaterThan(20));

        // ---- 정지 → 재시작(같은 isolate 재사용), VOICE_RECOGNITION 실패 → 기본 소스 ----
        await detector.stop();
        expect(detector.state.value, DetectorState.stopped);
        phrases.clear();
        failNextStartStream = true;
        await detector.start();
        expect(detector.state.value, DetectorState.listening);
        expect(configs.length, 3);
        expect(
          (configs[1]['androidConfig'] as Map)['audioSource'],
          'voiceRecognition',
        );
        expect(
          (configs[2]['androidConfig'] as Map)['audioSource'],
          'defaultSource',
        );
        expect(
          logs.where((l) => l.contains('spawning recognizer isolate')).length,
          1,
          reason: 'stop/start should reuse the worker isolate',
        );

        // ---- 세션 2: 기도문 부정 예시 → 마지막에 기준 아멘 ----
        final negs =
            Directory('$_labDir/wavs_neg')
                .listSync()
                .whereType<File>()
                .where((f) => f.path.endsWith('.wav'))
                .map((f) => f.path)
                .toList()
              ..sort();
        final s1 = segments().length;
        for (final n in negs) {
          await feed(_pcm16Bytes(n));
          await feed(_noise(2.0, rnd));
        }
        await feed(_pcm16Bytes('$_labDir/wavs_phone/amen__rms-35.wav'));
        await feed(_noise(2.5, rnd));
        // 메시지는 순서대로 처리되므로 기준 아멘이 나왔을 때는 부정 예시가 모두 끝난 뒤다.
        await _waitFor(
          () => phrases.isNotEmpty,
          what: () => 'sentinel 아멘 after negatives: ${segments().skip(s1)}',
        );
        final negSegments = segments().skip(s1).toList();
        expect(phrases, [
          '아멘',
        ], reason: 'negatives must not trigger; segments=$negSegments');

        // ---- 정리: 작업자가 'disposed'로 응답한다 ----
        await detector.stop();
        await detector.dispose();
        await _waitFor(
          () => logs.contains('[amen] worker disposed'),
          timeout: const Duration(seconds: 10),
          what: () => "worker 'disposed' reply",
        );

        origDebugPrint(
          '[e2e] positives:\n  ${report.join('\n  ')}\n'
          '[e2e] max gain ${gains.reduce(math.max).toStringAsFixed(1)} dB, '
          'max level ${maxLevel.toStringAsFixed(2)}\n'
          '[e2e] negatives (${negs.length} clips + sentinel): $negSegments',
        );
      },
      skip: skip,
      timeout: const Timeout(Duration(minutes: 6)),
    );

    test(
      'worker reports a recognizer init failure as an error message',
      () async {
        final fromWorker = ReceivePort();
        final msgs = <List<Object?>>[];
        final gotError = Completer<void>();
        fromWorker.listen((m) {
          msgs.add((m as List).cast<Object?>());
          if (m.first == 'error' && !gotError.isCompleted) gotError.complete();
        });
        final isolate = await Isolate.spawn<List<Object>>(
          recognizerWorkerMain,
          [
            fromWorker.sendPort,
            RecognizerParams(
              modelDir: tmp.path,
              encoder: '${tmp.path}/missing-encoder.onnx',
              decoder: '${tmp.path}/missing-decoder.onnx',
              joiner: '${tmp.path}/missing-joiner.onnx',
              tokens: '${ModelAssets.dir}/${ModelAssets.tokensFile}',
              decodingMethod: 'modified_beam_search',
              hotwordsFile: '',
              hotwordsScore: 2.0,
              maxActivePaths: 4,
              modelingUnit: '',
              bpeVocab: '',
              rule1: 1.5,
              rule2: 0.8,
              rule3: 20,
              numThreads: 1,
            ).toMessage(),
          ],
        );
        await gotError.future.timeout(const Duration(seconds: 30));
        expect(msgs.first.first, 'port');
        expect(msgs.map((m) => m.first), isNot(contains('ready')));
        isolate.kill(priority: Isolate.immediate);
        fromWorker.close();
      },
      skip: skip,
    );
  });
}
