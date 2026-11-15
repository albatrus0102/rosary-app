// 성당 안 묵주기도(T-81): 묵주 화면을 쓰면 기도문 카드 대신 3D 묵주 패널(화면 38% 이하, 장면은 그만큼 위로).
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/app/settings.dart';
import 'package:rosary_app/church/church_prayer_card.dart';
import 'package:rosary_app/church/church_rosary_panel.dart';
import 'package:rosary_app/church/church_scene_controller.dart';
import 'package:rosary_app/rosary3d/rosary_feedback.dart';
import 'package:rosary_app/rosary3d/rosary_model.dart';

import 'church_screen_fakes.dart';

Future<void> _settle(WidgetTester tester) async {
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 20));
  await tester.pump(const Duration(milliseconds: 400));
  await tester.pump();
}

Future<void> _rosaryAndSit(WidgetTester tester, ChurchHarness h) async {
  h.scene.emit(const SceneNear(station: 'altar', seat: 'L00-0'));
  await _settle(tester);
  await tester.tap(find.text('기도하기'));
  await _settle(tester);
  await tester.tap(find.byKey(const ValueKey('pray-rosary')));
  await _settle(tester);
  h.scene.emit(const SceneSeated('L00-0'));
  await _settle(tester);
}

void main() {
  late RecordingRosaryFeedback fb;
  setUp(() => ChurchRosaryPanel.debugFeedback = fb = RecordingRosaryFeedback());
  tearDown(() => ChurchRosaryPanel.debugFeedback = null);

  testWidgets('묵주 화면이면 성당에서도 3D 묵주 패널: 화면 38% 이하, 장면은 위로, 일어나면 원래대로', (
    tester,
  ) async {
    final h = await pumpChurch(tester, size: const Size(360, 800));
    h.settings.prayerView = PrayerView.rosary;
    await _rosaryAndSit(tester, h);
    expect(find.byType(ChurchRosaryPanel), findsOneWidget);
    expect(find.byType(ChurchPrayerCard), findsNothing);
    final panelH = tester.getSize(find.byType(ChurchRosaryPanel)).height;
    expect(panelH, lessThanOrEqualTo(800 * 0.38 + 0.5));
    final inset = h.scene.argsOf('setViewInset').last['bottom']! as double;
    expect(inset, greaterThan(0.2));
    expect(inset, lessThanOrEqualTo(0.45));
    // 기도문은 접혀 있다가 펼칠 때만
    expect(find.byKey(const ValueKey('church-rosary-text')), findsNothing);
    await tester.tap(find.byKey(const ValueKey('church-rosary-text-toggle')));
    await _settle(tester);
    expect(find.byKey(const ValueKey('church-rosary-text')), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('church-rosary-text-toggle')));
    await _settle(tester);
    // 자세 바꾸기 그대로
    await tester.tap(find.text('무릎 꿇고'));
    await tester.pump();
    expect(h.net.kneels.last, isTrue);
    // 일어나기 → 패널이 사라지고 장면도 원래대로(0)
    await tester.tap(find.byKey(const ValueKey('prayer-stand')));
    await _settle(tester);
    expect(find.byType(ChurchRosaryPanel), findsNothing);
    expect(h.scene.argsOf('setViewInset').last['bottom'], 0.0);
  });

  testWidgets('당기기·다음: 한 알씩, 같은 세션, 10번째 성모송 신호', (tester) async {
    final h = await pumpChurch(tester, size: const Size(360, 800));
    h.settings.prayerView = PrayerView.rosary;
    await _rosaryAndSit(tester, h);
    final area = find.byKey(const ValueKey('church-rosary-area'));
    await tester.drag(area, const Offset(0, 300));
    await _settle(tester);
    expect(find.textContaining('사도신경'), findsWidgets);
    expect(fb.played.map((p) => p.$1), [RosaryCue.minor]);
    for (var i = 0; i < 17; i++) {
      await tester.tap(find.byKey(const ValueKey('prayer-next')));
      await tester.pump(const Duration(milliseconds: 50));
      expect(tester.takeException(), isNull);
    }
    // 1단 성모송 10 을 바치고 넘기면 완료 신호
    expect(fb.played.where((p) => p.$1 == RosaryCue.tenComplete).length, 1);
    expect(h.settings.savedPrayer?.stepIndex, 18);
  });

  testWidgets('기도문 중심(기존) 설정이면 예전 카드 그대로', (tester) async {
    final h = await pumpChurch(tester, size: const Size(360, 800));
    await _rosaryAndSit(tester, h);
    expect(find.byType(ChurchPrayerCard), findsOneWidget);
    expect(find.byType(ChurchRosaryPanel), findsNothing);
    expect(h.scene.count('setViewInset'), 0);
  });
}
