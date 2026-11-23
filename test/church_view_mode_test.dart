// 성당 카메라 「시점」(docs/church/CAMERA_MODES.md): 위쪽 도구 줄 단추가 뒤에서 보기 ↔ 1인칭으로 바뀌고(자동 1인칭은 없앴다),
// 설정에 저장되며(백업 등록부에도), 웹에는 setViewMode{mode} 로 간다(tp / fp).
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/app/settings.dart';
import 'package:rosary_app/backup/backup_registry.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'church_screen_fakes.dart';

void main() {
  test('설정: 기본은 뒤에서 보기, 다음은 뒤에서 보기 ↔ 1인칭, 저장된다', () async {
    SharedPreferences.setMockInitialValues({});
    final s = await AppSettings.load();
    expect(s.churchCamView, ChurchCamView.follow);
    expect(ChurchCamView.follow.next, ChurchCamView.firstPerson);
    expect(ChurchCamView.firstPerson.next, ChurchCamView.follow);
    expect(ChurchCamView.values.map((v) => v.web), ['tp', 'fp']);
    var notified = 0;
    s.addListener(() => notified++);
    s.churchCamView = s.churchCamView.next;
    s.churchCamView = ChurchCamView.firstPerson;
    expect(notified, 1);
    final again = await AppSettings.load();
    expect(again.churchCamView, ChurchCamView.firstPerson);
    // 잘못된 저장값은 뒤에서 보기로
    SharedPreferences.setMockInitialValues({'church_cam_view': 'nope'});
    expect((await AppSettings.load()).churchCamView, ChurchCamView.follow);
  });

  test(
    '예전 저장값 「자동」(auto)은 뒤에서 보기로 읽고 저장값도 고친다(자동 1인칭 없앰, 2026-11-23)',
    () async {
      SharedPreferences.setMockInitialValues({'church_cam_view': 'auto'});
      final s = await AppSettings.load();
      expect(s.churchCamView, ChurchCamView.follow);
      final prefs = await SharedPreferences.getInstance();
      expect(prefs.getString('church_cam_view'), 'follow');
      // 1인칭은 그대로
      SharedPreferences.setMockInitialValues({
        'church_cam_view': 'firstPerson',
      });
      expect(
        (await AppSettings.load()).churchCamView,
        ChurchCamView.firstPerson,
      );
    },
  );

  test('백업 등록부에 church_cam_view 가 백업 키로 있다', () {
    expect(BackupRegistry.shouldExport('church_cam_view'), isTrue);
    final spec = BackupRegistry.backupSpecs.firstWhere(
      (p) => p.key == 'church_cam_view',
    );
    expect(spec.why, isNot(contains('자동')));
  });

  testWidgets(
    '도구 줄 「시점」: 누를 때마다 뒤에서 보기 ↔ 1인칭, 아이콘·스크린리더 라벨이 바뀌고, 웹에 setViewMode 를 보낸다',
    (tester) async {
      final h = await pumpChurch(tester, size: const Size(400, 800));
      await tester.pump(const Duration(milliseconds: 300));
      // 들어올 때 지금 모드를 보낸다
      expect(h.scene.lastArgs('setViewMode'), {'mode': 'tp'});
      final btn = find.byKey(const ValueKey('view-mode'));
      expect(btn, findsOneWidget);
      expect(find.bySemanticsLabel('시점: 뒤에서 보기'), findsOneWidget);
      expect(
        find.descendant(of: btn, matching: find.byIcon(Icons.person_outline)),
        findsOneWidget,
      );
      expect(tester.getRect(btn).shortestSide, greaterThanOrEqualTo(48));

      await tester.tap(btn);
      await tester.pump();
      expect(h.settings.churchCamView, ChurchCamView.firstPerson);
      expect(h.scene.lastArgs('setViewMode'), {'mode': 'fp'});
      expect(find.bySemanticsLabel('시점: 1인칭'), findsOneWidget);
      expect(
        find.descendant(
          of: btn,
          matching: find.byIcon(Icons.visibility_outlined),
        ),
        findsOneWidget,
      );

      await tester.tap(btn);
      await tester.pump();
      expect(h.settings.churchCamView, ChurchCamView.follow);
      expect(h.scene.lastArgs('setViewMode'), {'mode': 'tp'});
      expect(find.bySemanticsLabel('시점: 뒤에서 보기'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.pump(const Duration(seconds: 7));
    },
  );
}
