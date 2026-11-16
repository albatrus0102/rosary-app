// 성당에 들어갈 때의 흰 화면 방지: 웹뷰 바탕은 먹색, 첫 프레임까지 입장 화면, 이동 손잡이 원을 웹에 알림,
// 위쪽 메뉴는 기본 '접힘'(알약 모양으로 남는다).
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/app/settings.dart';
import 'package:rosary_app/church/church_hud.dart';
import 'package:rosary_app/church/church_scene_controller.dart';
import 'package:rosary_app/church/church_screen.dart';
import 'package:rosary_app/church/church_theme.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'church_screen_fakes.dart';

void main() {
  group('흰 화면 방지', () {
    test('웹뷰 바탕과 HTML 바탕이 먹색이다(투명·크림색 아님)', () {
      final dart = File(
        'lib/church/church_scene_controller.dart',
      ).readAsStringSync();
      expect(dart, isNot(contains('setBackgroundColor(Colors.transparent)')));
      expect(dart, contains('setBackgroundColor(ChurchTheme.scheme.surface)'));
      expect(ChurchTheme.scheme.surface, const Color(0xFF15110C));
      final html = File('assets/church/index.html').readAsStringSync();
      final style = html.substring(0, html.indexOf('<script'));
      expect(style, contains('background:#15110c'));
      expect(style.toLowerCase(), isNot(contains('#fff')));
      expect(style, isNot(contains('#f6ead8')));
    });

    test('웹은 첫 프레임을 알린다(firstFrame 이벤트)', () {
      expect(SceneEvent.parse('{"e":"firstFrame"}'), isA<SceneFirstFrame>());
      final main = File('assets/church/main.js').readAsStringSync();
      expect(main, contains("post({ e: 'firstFrame' })"));
    });

    testWidgets('페이지가 읽혀도(ready) 첫 프레임 전에는 입장 화면이 덮고 있다', (tester) async {
      setView(tester, const Size(400, 800));
      final settings = await loadSettings();
      final scene = FakeChurchSceneController()..autoFirstFrame = false;
      await tester.pumpWidget(
        wrapApp(
          ChurchScreen(settings: settings, net: FakeChurchNet(), scene: scene),
        ),
      );
      await tester.pump();
      expect(find.text('성당에 들어가는 중…'), findsOneWidget);
      scene.emit(const SceneReady());
      await tester.pump(const Duration(milliseconds: 500));
      // ready 만으로는 걷히지 않는다(장면은 아직 없다).
      expect(find.text('성당에 들어가는 중…'), findsOneWidget);
      var o = tester.widget<AnimatedOpacity>(
        find.byKey(const ValueKey('load-overlay')),
      );
      expect(o.opacity, 1);

      scene.emit(const SceneFirstFrame());
      await tester.pump();
      o = tester.widget<AnimatedOpacity>(
        find.byKey(const ValueKey('load-overlay')),
      );
      expect(o.opacity, 0, reason: '첫 프레임 뒤에는 부드럽게 걷힌다');
      await tester.pump(const Duration(seconds: 1));
      expect(
        find.byKey(const ValueKey('load-overlay')),
        findsNothing,
        reason: '다 걷힌 뒤에는 위젯을 내려 진행 표시줄이 계속 돌지 않는다',
      );
      await tester.pump(const Duration(seconds: 7));
    });
  });

  group('이동 손잡이 원을 웹에 알림', () {
    Map<Object?, Object?>? lastStick(FakeChurchSceneController s) {
      for (final (m, a) in s.calls.reversed) {
        if (m == 'setInput' && a['stick'] != null) {
          return a['stick']! as Map<Object?, Object?>;
        }
      }
      return null;
    }

    testWidgets('왼쪽 아래 원의 중심·반지름을 보낸다(왼쪽 절반 전체가 아니다)', (tester) async {
      final h = await pumpChurch(tester, size: const Size(400, 800));
      await tester.pump(const Duration(milliseconds: 100));
      final s = lastStick(h.scene);
      expect(s, isNotNull);
      final ring = tester.getRect(find.byKey(const ValueKey('joystick-ring')));
      expect(s!['cx']! as double, closeTo(ring.center.dx, 0.5));
      expect(s['cy']! as double, closeTo(ring.center.dy, 0.5));
      expect(s['r']! as double, closeTo(ring.width / 2, 0.5));
      expect(ring.center.dx, lessThan(100), reason: '왼쪽 아래 구석의 작은 원');
      await tester.pump(const Duration(seconds: 7));
    });
  });

  group('위쪽 메뉴 기본 접힘', () {
    test('저장된 값이 없으면 접힘이 기본이다', () async {
      SharedPreferences.setMockInitialValues({});
      expect((await AppSettings.load()).churchHudCollapsed, isTrue);
      SharedPreferences.setMockInitialValues({'church_hud_collapsed': false});
      expect((await AppSettings.load()).churchHudCollapsed, isFalse);
    });

    testWidgets('접힌 모양은 도구 줄이 줄어든 알약(아이콘 + 펼치기 화살표)이다', (tester) async {
      await pumpChurch(tester, size: const Size(360, 800), hudCollapsed: true);
      expect(find.byType(ChurchTopActions), findsNothing);
      final pill = find.byType(ChurchHudMenuButton);
      expect(pill, findsOneWidget);
      expect(
        find.descendant(of: pill, matching: find.byIcon(Icons.chevron_left)),
        findsOneWidget,
      );
      expect(
        find.descendant(
          of: pill,
          matching: find.byIcon(Icons.volume_up_outlined),
        ),
        findsOneWidget,
      );
      expect(tester.getSize(pill).height, greaterThanOrEqualTo(48));
      expect(find.bySemanticsLabel('메뉴 펼치기'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('hud-expand')));
      await tester.pump();
      expect(find.byType(ChurchTopActions), findsOneWidget);
      expect(find.byIcon(Icons.chevron_right), findsOneWidget); // 접기 화살표
      await tester.pump(const Duration(seconds: 7));
    });
  });
}
