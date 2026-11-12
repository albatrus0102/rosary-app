import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:rosary_app/glass/glass_catalog.dart';

/// 실제 카탈로그(46점). 위젯 시험에서 쓰는 동기 Future로 감싸 `pumpAndSettle`이
/// 자산 읽기를 기다리다 멈추지 않게 한다.
GlassCatalog testGlassCatalog() => GlassCatalog.parse(
  File('assets/church/glass_catalog.json').readAsStringSync(),
);

Future<GlassCatalog> testGlassCatalogFuture() =>
    SynchronousFuture<GlassCatalog>(testGlassCatalog());
