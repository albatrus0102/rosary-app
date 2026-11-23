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
    final by = churchArtCredits.where((c) => c.license.contains('CC BY') && !c.credit.contains('Meshy')).toList();
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

  test('성모상 3D: Meshy AI 표기(CC BY 4.0) · 원 그림 사용자 제작', () {
    final m = churchArtCredits.where((c) => c.credit.contains('Meshy AI')).toList();
    expect(m.length, 1);
    expect(m.single.credit, contains('성모상 3D: Meshy AI로 생성(CC BY 4.0), 원 그림 사용자 제작'));
    expect(m.single.credit, contains('변경: '));
    expect(m.single.license, contains('https://creativecommons.org/licenses/by/4.0/'));
  });

  test('성상 3D 스캔: 제목 · 만든이 · 원본 주소 · 라이선스 · 축소·재질 변경', () {
    expect(statueScanCredits.length, 9);
    for (final c in statueScanCredits) {
      expect(c.credit, contains('스캔: '), reason: c.use);
      expect(c.credit, contains('출처: https://'), reason: c.use);
      expect(c.credit, contains('변경: 축소·재질 변경'), reason: c.use);
      expect(c.license, contains('https://creativecommons.org/'), reason: c.use);
    }
    // 원본 주소(묶음 meta.src.url 과 같다 — tools/church_web/scan3d.test.mjs 가 맞춰 본다)
    final urls = statueScanCredits.map((c) => c.credit).join(' ');
    for (final u in [
      'https://open.smk.dk/artwork/image/KAS115',
      'https://sketchfab.com/3d-models/crucified-christ-from-st-jadwigas-hospital-d2404e52b2d144e18f0621903c98c06a',
      'https://sketchfab.com/3d-models/saint-peter-9e6b4da152f64fa1b4b0613a57318751',
      'https://sketchfab.com/3d-models/saint-paul-the-apostle-2195c3c0b9a140628e938ddb146d00ca',
      'https://sketchfab.com/3d-models/engel-668dcbf72a7243e491f540a6a575213b',
      // 빛의 성당(가상) — assets/church/light/scan3d_<키>.js
      'https://sketchfab.com/3d-models/597d14d7e6ec46a8a0becdf57dd6dbec',
      'https://sketchfab.com/3d-models/4da4a29f59e142af86b8fbdc7aff818c',
      'https://sketchfab.com/3d-models/2cb9b7c61cea469b9628d62c9fe289aa',
      'https://sketchfab.com/3d-models/418484f48ef14723865d76dcbcad45fb',
    ]) {
      expect(urls, contains(u));
    }
    // 실물: 피에타만 '피에타(미켈란젤로)'. 나머지는 대용이라 실제 작품 이름을 붙이지 않는다.
    final pieta = statueScanCredits.firstWhere((c) => c.credit.contains('KAS115'));
    expect(pieta.use, contains('피에타(미켈란젤로)'));
    expect(pieta.license, contains('Public Domain Mark 1.0'));
    // 빛의 성당 메달 홀 성모자상은 그 작품(크루즐로바의 성모)의 스캔을 가상 성당에 모신 것 — 실제 이름 그대로
    final kruzlowa = statueScanCredits.firstWhere((c) => c.credit.contains('Krużlowa'));
    expect(kruzlowa.use, contains('크루즐로바의 성모'));
    for (final c in statueScanCredits.where((c) => c != pieta && c != kruzlowa)) {
      expect(c.use, contains('대용'), reason: c.use);
      expect(c.use, isNot(contains('아르놀포')), reason: c.use);
    }
    // CC BY · CC BY-NC: 저작자 표시 의무(만든이·라이선스 주소). CC BY-NC 는 앱이 비상업일 때만(licenses/STATUE_SCANS.md)
    final by = statueScanCredits.where((c) => c.license.startsWith('CC BY 4.0')).toList();
    expect(by.length, 3);
    for (final c in by) {
      expect(c.license, contains('https://creativecommons.org/licenses/by/4.0/'));
    }
    final nc = statueScanCredits.where((c) => c.license.startsWith('CC BY-NC')).toList();
    expect(nc.length, 2);
    for (final c in nc) {
      expect(c.credit, contains('noe-3d.at'));
      expect(c.license, contains('https://creativecommons.org/licenses/by-nc/4.0/'));
    }
  });
}
