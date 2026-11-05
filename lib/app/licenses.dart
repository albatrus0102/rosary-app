import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

/// 번들된 글꼴(OFL)의 라이선스를 `showLicensePage`에 보태 등록한다.
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
  });
}
