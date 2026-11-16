import 'dart:io';
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';

/// 묵주 효과음(assets/sounds/r_*.wav) 점검: 시작·끝에 클릭('딱'·'툭')이 나지 않게 앞뒤가 조용하고 DC 가 작아야 한다.
/// 재생성: node tools/rosary3d/make_sounds.mjs
void main() {
  final files =
      Directory('assets/sounds')
          .listSync()
          .whereType<File>()
          .where((f) => RegExp(r'r_[a-z0-9_]+\.wav$').hasMatch(f.path))
          .toList()
        ..sort((a, b) => a.path.compareTo(b.path));

  test('r_*.wav 5개가 있다', () => expect(files.length, 5));

  for (final f in files) {
    test('${f.uri.pathSegments.last}: 앞뒤 3ms ≤ 피크 5%, DC 작음, 16bit mono', () {
      final b = f.readAsBytesSync();
      final bd = ByteData.sublistView(b);
      expect(String.fromCharCodes(b.sublist(0, 4)), 'RIFF');
      expect(bd.getUint16(22, Endian.little), 1, reason: 'mono');
      expect(bd.getUint16(34, Endian.little), 16);
      final rate = bd.getUint32(24, Endian.little);
      final n = bd.getUint32(40, Endian.little) ~/ 2;
      final x = List<int>.generate(
        n,
        (i) => bd.getInt16(44 + i * 2, Endian.little),
      );
      int maxAbs(Iterable<int> s) =>
          s.map((v) => v.abs()).reduce((a, c) => a > c ? a : c);
      final peak = maxAbs(x);
      final k = (rate * 0.003).round();
      expect(maxAbs(x.take(k)) / peak, lessThan(0.05), reason: '처음 3ms');
      expect(maxAbs(x.skip(n - k)) / peak, lessThan(0.05), reason: '끝 3ms');
      final dc = x.reduce((a, c) => a + c) / n / peak;
      expect(dc.abs(), lessThan(0.01), reason: 'DC');
      expect(peak / 32767, lessThan(0.9), reason: '클리핑 여유');
    });
  }
}
