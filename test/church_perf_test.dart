import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/app/settings.dart';
import 'package:rosary_app/church/church_scene_controller.dart';
import 'package:rosary_app/church/church_screen.dart';

import 'church_screen_fakes.dart';

Finder get _banner => find.byKey(const ValueKey('perf-banner'));

void main() {
  testWidgets('slow first sample offers simple mode; 바꾸기 sets quality low', (
    tester,
  ) async {
    final h = await pumpChurch(tester);
    expect(h.settings.churchQuality, ChurchQuality.high);
    expect(_banner, findsNothing);
    h.scene.emit(const ScenePerf(9, tier: 'high'));
    await tester.pump();
    expect(_banner, findsOneWidget);
    expect(find.text('화면이 느려요. 간단 모드로 바꿀까요?'), findsOneWidget);
    expect(find.text('바꾸기'), findsOneWidget);
    expect(find.text('그대로'), findsOneWidget);
    // 안내만 할 뿐 아무것도 바꾸지 않았다.
    expect(h.scene.count('setQuality'), 0);
    expect(h.settings.churchQuality, ChurchQuality.high);

    await tester.tap(find.text('바꾸기'));
    await tester.pump();
    expect(h.scene.lastArgs('setQuality'), {'quality': 'low'});
    expect(h.scene.count('setQuality'), 1); // 설정 리스너가 한 번 더 보내지 않는다
    expect(h.settings.churchQuality, ChurchQuality.low);
    expect(_banner, findsNothing);
  });

  testWidgets('그대로 keeps everything and never asks again', (tester) async {
    final h = await pumpChurch(tester);
    h.scene.emit(const ScenePerf(12, tier: 'high'));
    await tester.pump();
    await tester.tap(find.text('그대로'));
    await tester.pump();
    expect(_banner, findsNothing);
    expect(h.scene.count('setQuality'), 0);
    expect(h.settings.churchQuality, ChurchQuality.high);
    h.scene.emit(const ScenePerf(8, tier: 'high'));
    await tester.pump();
    expect(_banner, findsNothing);
  });

  testWidgets('the banner is non-blocking and fades by itself', (tester) async {
    final h = await pumpChurch(tester);
    h.scene.emit(const ScenePerf(10, tier: 'high'));
    await tester.pump();
    // 배너가 떠 있어도 HUD 는 그대로 눌린다.
    await tester.tap(find.byTooltip('소리 끄기'));
    await tester.pump();
    expect(h.settings.churchAmbient, isFalse);
    await tester.pump(const Duration(seconds: 13));
    expect(_banner, findsNothing);
    expect(h.scene.count('setQuality'), 0);
  });

  testWidgets('no banner when fast, already low, or auto-downgraded', (
    tester,
  ) async {
    var h = await pumpChurch(tester);
    h.scene.emit(const ScenePerf(40, tier: 'high'));
    await tester.pump();
    expect(_banner, findsNothing);
    // 첫 표본이 정상이면 이후 느려져도 묻지 않는다(입장 직후 5초만 본다).
    h.scene.emit(const ScenePerf(5, tier: 'high'));
    await tester.pump();
    expect(_banner, findsNothing);

    h = await pumpChurch(tester);
    h.scene.emit(const ScenePerf(9, tier: 'low')); // 이미 낮은 화질
    await tester.pump();
    expect(_banner, findsNothing);

    h = await pumpChurch(tester);
    h.scene.emit(const ScenePerf(9, tier: 'low', auto: true));
    await tester.pump();
    h.scene.emit(const ScenePerf(9, tier: 'low'));
    await tester.pump();
    expect(_banner, findsNothing);
  });

  testWidgets('no banner when the saved quality is already low', (
    tester,
  ) async {
    setView(tester, const Size(400, 800));
    final settings = await loadSettings();
    settings.churchQuality = ChurchQuality.low;
    final scene = FakeChurchSceneController();
    await tester.pumpWidget(
      wrapApp(
        ChurchScreen(settings: settings, net: FakeChurchNet(), scene: scene),
      ),
    );
    await tester.pump();
    scene.emit(const SceneReady());
    scene.emit(const ScenePerf(6));
    await tester.pump();
    expect(_banner, findsNothing);
  });

  testWidgets('changing quality in settings is forwarded to the scene', (
    tester,
  ) async {
    final h = await pumpChurch(tester);
    h.settings.churchQuality = ChurchQuality.low;
    await tester.pump();
    expect(h.scene.lastArgs('setQuality'), {'quality': 'low'});
  });

  test('init carries the quality tier from settings', () async {
    final scene = FakeChurchSceneController();
    await scene.init(
      avatar: const {},
      hour: 12,
      ambient: false,
      solo: true,
      quality: 'low',
    );
    expect(scene.lastArgs('init')!['quality'], 'low');
  });
}
