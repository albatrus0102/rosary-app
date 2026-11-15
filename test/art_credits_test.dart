import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/domain/art_credits.dart';

/// 성당 안 진본 사진(C-15)의 출처 표기: CC BY 는 저작자·라이선스 주소·원본 주소·변경사항을 모두 적는다.
void main() {
  test('성당 사진 출처: 커먼즈 사진 7점이 모두 등록돼 있다', () {
    final uses = churchArtCredits.map((c) => c.use).toList();
    expect(uses.where((u) => u.startsWith('피렌체 대성당')).length, 3);
    expect(uses.where((u) => u.startsWith('성 밖 성 바오로 대성전')).length, 2);
    expect(uses.where((u) => u.startsWith('성 베드로 대성전')).length, 2);
  });

  test('CC BY 사진: 저작자 · 라이선스 주소 · 원본 주소 · 변경사항', () {
    final by = churchArtCredits.where((c) => c.license.contains('CC BY')).toList();
    expect(by.length, 4);
    for (final c in by) {
      expect(c.license, contains('https://creativecommons.org/licenses/by/'), reason: c.use);
      expect(c.credit, contains('https://commons.wikimedia.org/wiki/File:'), reason: c.use);
      expect(c.credit, contains('사진: '), reason: c.use);
      expect(c.credit, contains('변경: '), reason: c.use);
    }
    expect(by.where((c) => c.credit.contains('Sailko')).length, 2);
    expect(by.any((c) => c.credit.contains('Alberto Fernandez Fernandez')), isTrue);
    expect(by.any((c) => c.credit.contains('StPaul.jpg')), isTrue);
  });

  test('PDM · PD-Art 사진은 그 표기로 적는다', () {
    final pdm = churchArtCredits.where((c) => c.license.contains('Public Domain Mark')).toList();
    expect(pdm.length, 2);
    for (final c in pdm) {
      expect(c.credit, contains('사진: Gary Todd'));
    }
    expect(churchArtCredits.any((c) => c.use.startsWith('피렌체') && c.license.contains('PD-Art')), isTrue);
  });
}
