import 'dart:io';
import 'dart:typed_data';

import 'package:flutter/services.dart' show rootBundle;
import 'package:path_provider/path_provider.dart';

/// 모델 에셋이 앱에 포함되지 않았을 때 던지는 예외.
class ModelMissingException implements Exception {
  ModelMissingException(this.message);
  final String message;

  @override
  String toString() => message;
}

/// 번들된 음성 인식 모델을 앱 지원 디렉터리로 복사한다.
class ModelAssets {
  static const dir =
      'assets/models/sherpa-onnx-streaming-zipformer-korean-2024-06-16';

  static const encoderFile = 'encoder-epoch-99-avg-1.int8.onnx';
  static const decoderFile = 'decoder-epoch-99-avg-1.onnx';
  static const joinerFile = 'joiner-epoch-99-avg-1.int8.onnx';
  static const tokensFile = 'tokens.txt';

  /// 핫워드를 BPE로 쪼갤 때 쓰는 어휘 파일. 저장소에 커밋되어 있다(내려받지 않는다).
  static const bpeVocabFile = 'bpe.vocab';

  /// 번들 에셋의 알려진 바이트 크기. 대상 파일이 이미 있고 이 크기와 같으면
  /// 에셋을 메모리에 올리지 않고 건너뛴다. (크기가 다르면 실제 에셋과 비교)
  static const expectedSizes = <String, int>{
    encoderFile: 126968852,
    decoderFile: 11309084,
    joinerFile: 2581421,
    tokensFile: 60246,
    bpeVocabFile: 132232,
  };

  static List<String> get files => expectedSizes.keys.toList();

  static String get _dirName => dir.split('/').last;

  /// 대상 파일이 없거나 에셋과 크기가 다를 때만 복사하고,
  /// 대상 디렉터리 경로를 반환한다.
  ///
  /// 에셋이 앱에 없으면(빌드 전에 모델을 받지 않은 경우) [ModelMissingException].
  static Future<String> ensureCopied() async {
    final support = await getApplicationSupportDirectory();
    final targetDir = Directory('${support.path}/$_dirName');
    await targetDir.create(recursive: true);

    for (final name in files) {
      final target = File('${targetDir.path}/$name');

      // 존재/크기 확인을 먼저 하고, 이미 최신이면 에셋을 로드하지 않는다.
      if (await target.exists() &&
          await target.length() == expectedSizes[name]) {
        continue;
      }

      final ByteData data;
      try {
        data = await rootBundle.load('$dir/$name');
      } catch (_) {
        throw ModelMissingException(
          name == bpeVocabFile
              ? '$bpeVocabFile 이 앱에 포함되어 있지 않습니다. '
                    '저장소에 커밋된 $dir/$bpeVocabFile 이 있는지 확인해 주세요.'
              : '음성 인식 모델 파일($name)이 앱에 포함되어 있지 않습니다. '
                    '빌드 전에 scripts/fetch_model.sh 를 실행해 모델을 내려받아 주세요.',
        );
      }
      if (!await target.exists() ||
          await target.length() != data.lengthInBytes) {
        final bytes = data.buffer.asUint8List(
          data.offsetInBytes,
          data.lengthInBytes,
        );
        await target.writeAsBytes(bytes, flush: true);
      }
    }
    return targetDir.path;
  }
}
