import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

import '../domain/art_credits.dart';

/// 번들된 글꼴(Pretendard, OFL)의 라이선스를 `showLicensePage`에 보태 등록한다.
/// 앱 시작 때 한 번만 호출한다.
void registerFontLicenses() {
  LicenseRegistry.addLicense(() async* {
    for (final (packages, asset) in const [
      (['Pretendard'], 'assets/fonts/OFL-Pretendard.txt'),
    ]) {
      try {
        final text = await rootBundle.loadString(asset);
        yield LicenseEntryWithLineBreaks(packages, text);
      } catch (e) {
        debugPrint('license asset $asset not loaded: $e');
      }
    }
    // 번들 성화(기도 배경·십자가의 길): Public domain / CC0. 앱 안 '성화 출처' 화면과 같은 내용.
    yield LicenseEntryWithLineBreaks(
      const ['성화(기도 배경·십자가의 길)'],
      [
        for (final c in [stationsArtCredit, ...mysteryArtCredits])
          '${c.use}: ${c.credit} (${c.license})',
      ].join('\n\n'),
    );
  });
}
