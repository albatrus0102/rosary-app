import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

import '../domain/art_credits.dart';

/// 라이선스 화면에 등록되는 번들 JS 의 패키지 이름(테스트에서도 쓴다).
/// - three.js r149: assets/church/three.min.js, three_extras.js(examples/jsm 일부), assets/rosary3d/ 가 같은 파일을 쓴다.
/// - meshoptimizer: assets/church/statue3d_mary_meshy.js 안에 동봉된 디코더.
/// - esbuild: three_extras.js·디코더 번들에 들어간 런타임 도우미 몇 줄.
const bundledJsLicenseTitles = <List<String>>[
  ['three.js (r149) — three.min.js, three_extras.js'],
  ['meshoptimizer — statue3d_mary_meshy.js 의 디코더'],
  ['esbuild (번들 도우미) — three_extras.js 등'],
];

/// 번들된 글꼴(Pretendard, OFL)의 라이선스를 `showLicensePage`에 보태 등록한다.
/// 앱 시작 때 한 번만 호출한다.
void registerFontLicenses() {
  LicenseRegistry.addLicense(() async* {
    for (final (packages, asset) in <(List<String>, String)>[
      (const ['Pretendard'], 'assets/fonts/OFL-Pretendard.txt'),
      // 번들 JS(성당 3D 장면): 각 MIT 라이선스 전문. 파일 목록과 근거는 docs/legal/LEGAL_REVIEW_2026-11.md §9.
      (bundledJsLicenseTitles[0], 'assets/licenses/three.js-LICENSE.txt'),
      (bundledJsLicenseTitles[1], 'assets/licenses/meshoptimizer-LICENSE.txt'),
      (bundledJsLicenseTitles[2], 'assets/licenses/esbuild-LICENSE.txt'),
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
        for (final c in [stationsArtCredit, ...visibleMysteryArtCredits, ...churchArtCredits])
          '${c.use}: ${c.credit} (${c.license})',
      ].join('\n\n'),
    );
    // 성당 안 성상 3D 스캔(SMK·Virtual Museums of Małopolska·noe-3d.at): licenses/STATUE_SCANS.md.
    yield LicenseEntryWithLineBreaks(
      const ['성상 3D 스캔(성당 안)'],
      [
        for (final c in statueScanCredits) '${c.use}: ${c.credit} (${c.license})',
      ].join('\n\n'),
    );
    // 기도 배경 성가(오르간): 퍼블릭 도메인 선율을 앱이 직접 합성한 연주(CC0). licenses/MUSIC.md.
    yield LicenseEntryWithLineBreaks(
      const ['성가(기도 배경 음악)'],
      [
        for (final c in musicCredits) '${c.use}: ${c.credit} (${c.license})',
      ].join('\n\n'),
    );
  });
}
