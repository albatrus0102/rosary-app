import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/app/licenses.dart';

/// 번들 JS(three.js·meshoptimizer·esbuild 도우미)의 MIT 전문이 라이선스 화면에 실린다(법률 검토 M4).
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('three.js · meshoptimizer · esbuild MIT 전문이 라이선스 레지스트리에 있다', () async {
    registerFontLicenses();
    final entries = <LicenseEntry>[];
    await for (final e in LicenseRegistry.licenses) {
      entries.add(e);
    }
    String textOf(String pkg) {
      final e = entries.firstWhere((e) => e.packages.any((p) => p.startsWith(pkg)), orElse: () => throw 'no $pkg');
      return e.paragraphs.map((p) => p.text).join('\n');
    }

    final three = textOf('three.js');
    expect(three, contains('Copyright © 2010-2023 three.js authors'));
    expect(three, contains('Permission is hereby granted, free of charge'));
    expect(three, contains('THE SOFTWARE IS PROVIDED "AS IS"'));

    final meshopt = textOf('meshoptimizer');
    expect(meshopt, contains('Arseny Kapoulkine'));
    expect(meshopt, contains('Permission is hereby granted, free of charge'));
    expect(meshopt, contains('THE SOFTWARE IS PROVIDED "AS IS"'));

    expect(textOf('esbuild'), contains('Evan Wallace'));
    expect(textOf('Pretendard'), isNotEmpty);
  });

  test('라이선스 자산 파일이 번들에 실제로 있다', () async {
    for (final f in const ['three.js-LICENSE.txt', 'meshoptimizer-LICENSE.txt', 'esbuild-LICENSE.txt']) {
      final t = await rootBundle.loadString('assets/licenses/$f');
      expect(t, contains('MIT'), reason: f);
    }
    expect(bundledJsLicenseTitles.length, 3);
  });
}
