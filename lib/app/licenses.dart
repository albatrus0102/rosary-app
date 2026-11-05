import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

/// 번들된 글꼴(OFL)과 음성 인식 구성요소의 라이선스를 `showLicensePage`에 보태 등록한다.
/// 앱 시작 때 한 번만 호출한다.
void registerFontLicenses() {
  LicenseRegistry.addLicense(() async* {
    for (final (packages, asset) in const [
      (['Pretendard'], 'assets/fonts/OFL-Pretendard.txt'),
      (['Noto Serif KR'], 'assets/fonts/OFL-NotoSerifKR.txt'),
    ]) {
      try {
        final text = await rootBundle.loadString(asset);
        yield LicenseEntryWithLineBreaks(packages, text);
      } catch (e) {
        debugPrint('license asset $asset not loaded: $e');
      }
    }
    yield const LicenseEntryWithLineBreaks(
      ['sherpa-onnx'],
      'sherpa-onnx (https://github.com/k2-fsa/sherpa-onnx)는 Apache License 2.0으로 '
      '배포됩니다. 음성 인식 모델(sherpa-onnx-streaming-zipformer-korean-2024-06-16)은 '
      '해당 모델 배포처의 라이선스를 따릅니다.',
    );
  });
}
