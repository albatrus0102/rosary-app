import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:rosary_app/glass/glass_catalog.dart';

const _catalogPath = 'assets/church/glass_catalog.json';

/// 앱이 실제로 읽는 카탈로그: 번들에 싣는 8점뿐이다(APK 용량 정책,
/// `tools/glass_bundle`). 나머지 38점은 `files.1k.bundled:false`라 앱에 보이지 않는다.
/// 위젯 시험에서 쓰는 동기 Future로 감싸 `pumpAndSettle`이 자산 읽기를 기다리다 멈추지 않게 한다.
GlassCatalog testGlassCatalog() =>
    GlassCatalog.parse(File(_catalogPath).readAsStringSync());

/// 번들 밖 38점까지 포함한 전체 카탈로그(46점). 분류·검증·화면 일반 동작 시험용이다.
/// 번들 밖 창의 사진은 자산에 없으므로 그림 자리에는 깨진 그림 아이콘이 나온다.
GlassCatalog testFullGlassCatalog() => GlassCatalog.parse(
  File(_catalogPath).readAsStringSync(),
  includeUnbundled: true,
);

Future<GlassCatalog> testGlassCatalogFuture() =>
    SynchronousFuture<GlassCatalog>(testGlassCatalog());

Future<GlassCatalog> testFullGlassCatalogFuture() =>
    SynchronousFuture<GlassCatalog>(testFullGlassCatalog());
