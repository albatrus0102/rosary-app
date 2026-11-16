import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/church/church_theme.dart';
import 'package:rosary_app/church/dev_glass.dart';

/// 개발용 임시 유리(E-4, docs/church/GLASS_DEV_PIPELINE.md)의 릴리스 차단과 표시.
///
/// 이 시험은 `--dart-define` 없이 돈다 = 일반(배포) 빌드와 같은 조건.
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('일반 빌드(ROSARIUM_DEV_GLASS 없음)', () {
    test('플래그는 꺼져 있고 장면 주소를 바꾸지 않는다', () {
      expect(DevGlass.enabled, isFalse);
      expect(DevGlass.sceneUri('assets/church/index.html'), isNull);
      expect(
        DevGlass.sceneUri('assets/church/index.html', church: 'qa_milan55'),
        isNull,
      );
    });

    test('장면이 devGlass 이벤트를 보내도 상태를 켜지 않는다', () {
      DevGlass.state.value = null;
      const raw =
          '{"e":"devGlass","church":"milan","placed":42,"total":55,"on":1}';
      expect(DevGlass.handleRaw(raw), isTrue, reason: '화면 이벤트로 흘리지 않는다');
      expect(DevGlass.state.value, isNull);
      expect(DevGlass.handleRaw('{"e":"pos","x":1}'), isFalse);
      expect(DevGlass.handleRaw('not json "devGlass"'), isFalse);
    });

    test('번들 자산 목록에 개발용 폴더·팩이 없다', () async {
      final manifest = await AssetManifest.loadFromAssetBundle(rootBundle);
      final assets = manifest.listAssets();
      expect(assets, contains('assets/church/index.html'));
      expect(assets, contains('assets/church/ch_milan.js'));
      final bad = assets.where(
        (a) =>
            a.contains('/dev/') ||
            a.contains('gpack_dev') ||
            a.contains('devglass') ||
            a.contains('ch_qa_') ||
            a.contains('glass_milan55') ||
            a.contains('DEV-0'),
      );
      expect(bad, isEmpty, reason: '시안은 일반 빌드에 들어가면 안 된다');
    });

    test('pubspec.yaml 의 assets 에 개발용 폴더가 없다', () {
      final lines = File('pubspec.yaml')
          .readAsLinesSync()
          .map((l) => l.trim())
          .where((l) => l.startsWith('- assets/'))
          .toList();
      expect(lines, contains('- assets/church/'));
      expect(
        lines.where(
          (l) =>
              l.contains('church/dev') ||
              l.contains('_devbundle') ||
              l.contains('glass_milan55'),
        ),
        isEmpty,
      );
      // 개발용 폴더는 저장소에 있지만(개발용 APK 빌드가 쓴다) 번들 목록에는 없다.
      expect(Directory('assets/church/dev').existsSync(), isTrue);
    });

    test("'더보기'와 성당 화면은 컴파일 상수로만 개발용 항목을 연다", () {
      final more = File('lib/ui/more_screen.dart').readAsStringSync();
      final screen = File('lib/church/church_screen.dart').readAsStringSync();
      expect(more, contains('if (DevGlass.enabled) const DevGlassMoreTile()'));
      expect(
        screen,
        contains(
          'child: DevGlassBadge()',
        ),
      );
    });
  });

  group('개발용 빌드의 동작(순수 계산·위젯)', () {
    test('안드로이드에서는 번들 자산을 ?devglass=1 로 연다', () {
      expect(
        DevGlass.sceneUriFor(
          'assets/church/index.html',
          android: true,
        ).toString(),
        'file:///android_asset/flutter_assets/assets/church/index.html?devglass=1',
      );
      expect(
        DevGlass.sceneUriFor(
          'assets/church/index.html',
          church: DevGlass.qaGalleryChurch,
          android: true,
        ).toString(),
        'file:///android_asset/flutter_assets/assets/church/index.html?devglass=1&church=qa_milan55',
      );
      expect(
        DevGlass.sceneUriFor('assets/church/index.html', android: false),
        isNull,
      );
    });

    test('이벤트 해석: 걸린 것이 있을 때만 상태가 생긴다', () {
      final s = DevGlassState.fromJson(const {
        'e': 'devGlass',
        'church': 'milan',
        'placed': 42,
        'total': 55,
        'on': 1,
      });
      expect(s, isNotNull);
      expect(s!.label, '개발용 임시 시안 · 실제 작품 아님 · 42/55');
      expect(
        DevGlassState.fromJson(const {'church': 'basic', 'placed': 0, 'on': 0}),
        isNull,
      );
      expect(
        DevGlassState.fromJson(const {'church': 'milan', 'placed': 3, 'on': 0}),
        isNull,
      );
    });

    testWidgets('배지: 상태가 있을 때만 한 줄로 보이고 터치를 받지 않는다', (tester) async {
      final n = ValueNotifier<DevGlassState?>(null);
      addTearDown(n.dispose);
      var taps = 0;
      await tester.pumpWidget(
        MaterialApp(
          theme: ChurchTheme.data(),
          home: Scaffold(
            body: Stack(
              fit: StackFit.expand,
              children: [
                Positioned.fill(
                  child: GestureDetector(
                    behavior: HitTestBehavior.opaque,
                    onTap: () => taps++,
                  ),
                ),
                Positioned.fill(child: DevGlassBadge(notifier: n)),
              ],
            ),
          ),
        ),
      );
      expect(find.byKey(const ValueKey('dev-glass-badge')), findsNothing);
      n.value = const DevGlassState(
        church: 'milan',
        placed: 42,
        total: 55,
        on: true,
      );
      await tester.pump();
      expect(find.text('개발용 임시 시안 · 실제 작품 아님 · 42/55'), findsOneWidget);
      await tester.tapAt(
        tester.getCenter(find.byKey(const ValueKey('dev-glass-badge'))),
      );
      expect(taps, 1, reason: '배지는 아래 장면의 터치를 막지 않는다');
      // 좁은 화면에서도 넘치지 않는다
      await tester.binding.setSurfaceSize(const Size(320, 640));
      addTearDown(() => tester.binding.setSurfaceSize(null));
      await tester.pump();
      expect(tester.takeException(), isNull);
      n.value = null;
      await tester.pump();
      expect(find.byKey(const ValueKey('dev-glass-badge')), findsNothing);
    });

    testWidgets("'더보기' 항목: 일반 빌드에서는 그려지지 않는다", (tester) async {
      await tester.pumpWidget(
        const MaterialApp(home: Scaffold(body: DevGlassMoreTile())),
      );
      expect(
        find.byKey(const ValueKey('more-dev-glass-gallery')),
        findsNothing,
      );
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(body: DevGlassMoreTile(visible: true)),
        ),
      );
      expect(
        find.byKey(const ValueKey('more-dev-glass-gallery')),
        findsOneWidget,
      );
      expect(find.textContaining('실제 작품 아님'), findsOneWidget);
    });

    test('컴파일 상수 이름은 빌드 스크립트와 같다', () {
      final sh = File('tools/build_dev_apk.sh').readAsStringSync();
      expect(sh, contains('--dart-define=ROSARIUM_DEV_GLASS=true'));
      expect(
        File('lib/church/dev_glass.dart').readAsStringSync(),
        contains("bool.fromEnvironment('ROSARIUM_DEV_GLASS')"),
      );
      expect(kReleaseMode, isFalse);
    });
  });
}
