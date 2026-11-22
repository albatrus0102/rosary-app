// 성당 '앉기'는 앉기만 한다: 기도 시간·성가·묵주·기도 상태 알림 없이 앉은 줄(묵주기도 시작 | 일어나기)이 뜨고,
// 묵주기도는 사용자가 고른다. 기도하기 시트의 '묵주기도 하기'는 그대로 걸어가 앉아 바로 시작한다.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/analytics/analytics.dart';
import 'package:rosary_app/app/settings.dart';
import 'package:rosary_app/church/church_hud.dart';
import 'package:rosary_app/church/church_prayer_card.dart';
import 'package:rosary_app/church/church_scene_controller.dart';
import 'package:rosary_app/domain/prayer_data.dart';
import 'package:rosary_app/domain/rosary_session.dart';

import 'church_screen_fakes.dart';

Future<void> _settle(WidgetTester tester) async {
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 20));
  await tester.pump(const Duration(milliseconds: 400));
  await tester.pump();
}

const _bar = ValueKey('seated-bar');
const _start = ValueKey('seated-bar-start');
const _stand = ValueKey('seated-bar-stand');

/// 맥락 단추 '앉기'를 눌러 앉는다(웹이 앉힌 것까지 흉내 낸다).
Future<void> _plainSit(WidgetTester tester, ChurchHarness h) async {
  h.scene.emit(const SceneNear(seat: 'L03-2'));
  await _settle(tester);
  await tester.tap(find.text('앉기'));
  await tester.pump();
  h.scene.emit(const SceneSeated('L03-2'));
  await _settle(tester);
}

List<bool> _rosaryCalls(ChurchHarness h) => [
  for (final a in h.scene.argsOf('setRosary')) a['on']! as bool,
];

void main() {
  testWidgets('앉기만: 앉은 줄이 뜨고 기도는 시작되지 않는다', (tester) async {
    final h = await pumpChurch(tester, size: const Size(360, 800));
    await _plainSit(tester, h);

    expect(h.net.sits, ['L03-2']);
    expect(find.byKey(_bar), findsOneWidget);
    expect(find.text('묵주기도 시작'), findsOneWidget);
    expect(find.text('일어나기'), findsOneWidget);
    // 기도 카드·묵주·기도 상태 알림이 없다.
    expect(find.byType(ChurchPrayerCard), findsNothing);
    expect(h.net.prayings, isEmpty);
    expect(h.scene.argsOf('setPraying'), isEmpty);
    expect(_rosaryCalls(h), isEmpty);
    // 터치 목표 48dp 이상.
    expect(tester.getSize(find.byKey(_start)).height, greaterThanOrEqualTo(48));
    expect(tester.getSize(find.byKey(_stand)).height, greaterThanOrEqualTo(48));
  });

  testWidgets('묵주기도 시작: 카드가 열리고 기도가 시작된다(저장된 진행분의 신비로)', (tester) async {
    final h = await pumpChurch(tester, size: const Size(360, 800));
    final other =
        MysterySet.values[(mysterySetForWeekday(DateTime.now().weekday).index +
                1) %
            MysterySet.values.length];
    h.settings.saveProgress(other, 3);
    await _plainSit(tester, h);
    expect(h.net.prayings, isEmpty);

    await tester.tap(find.byKey(_start));
    await _settle(tester);

    expect(find.byKey(_bar), findsNothing);
    expect(find.byType(ChurchPrayerCard), findsOneWidget);
    final card = tester.widget<ChurchPrayerCard>(find.byType(ChurchPrayerCard));
    expect(card.controller.mysterySet, other);
    expect(card.controller.session.index, 3);
    expect(h.net.prayings.last.$1, isTrue);
    expect(h.net.prayings.last.$2, other.index);
    expect(_rosaryCalls(h), [true]);
  });

  testWidgets('묵주기도 시작: 큰 화면을 골라 두었으면 전체 화면 기도가 열린다', (tester) async {
    final shared = <RosarySession>[];
    final h = await pumpChurch(
      tester,
      size: const Size(360, 800),
      prayerScreenBuilder: (c, m, s) {
        shared.add(s as RosarySession);
        return const Scaffold(body: Text('full-screen-prayer'));
      },
    );
    h.settings.churchRosaryBig = true;
    await _plainSit(tester, h);
    expect(find.text('full-screen-prayer'), findsNothing);

    await tester.tap(find.byKey(_start));
    await _settle(tester);
    await _settle(tester);

    expect(find.text('full-screen-prayer'), findsOneWidget);
    expect(shared, hasLength(1));
  });

  testWidgets('묵주기도 시작: 작은 화면이면 전체 화면은 열리지 않는다', (tester) async {
    final h = await pumpChurch(
      tester,
      size: const Size(360, 800),
      prayerScreenBuilder: (c, m, s) =>
          const Scaffold(body: Text('full-screen-prayer')),
    );
    h.settings.churchRosaryBig = false;
    await _plainSit(tester, h);
    await tester.tap(find.byKey(_start));
    await _settle(tester);
    await _settle(tester);
    expect(find.text('full-screen-prayer'), findsNothing);
    expect(find.byType(ChurchPrayerCard), findsOneWidget);
  });

  testWidgets('기도하기 시트의 묵주기도 하기: 걸어가 앉으면 바로 시작한다(앉은 줄 없음)', (tester) async {
    final h = await pumpChurch(tester, size: const Size(360, 800));
    h.scene.emit(const SceneNear(station: 'altar'));
    await _settle(tester);
    await tester.tap(find.text('기도하기'));
    await _settle(tester);
    await tester.tap(find.byKey(const ValueKey('pray-rosary')));
    await _settle(tester);
    h.scene.emit(const SceneWalkStart('seat'));
    h.scene.emit(const SceneNear(seat: 'L03-2'));
    h.scene.emit(const SceneWalkDone('seat', seat: 'L03-2'));
    await tester.pump();
    h.scene.emit(const SceneSeated('L03-2'));
    await _settle(tester);

    expect(find.byKey(_bar), findsNothing);
    expect(find.byType(ChurchPrayerCard), findsOneWidget);
    expect(h.net.prayings.last.$1, isTrue);
  });

  testWidgets('복원(같은 자리에 다시 앉힘): 앉기만 했으면 그대로 앉기만', (tester) async {
    final h = await pumpChurch(tester, size: const Size(360, 800));
    await _plainSit(tester, h);
    h.scene.emit(const SceneSeated('L03-2'));
    await _settle(tester);
    expect(find.byKey(_bar), findsOneWidget);
    expect(find.byType(ChurchPrayerCard), findsNothing);
    expect(h.net.prayings, isEmpty);
  });

  testWidgets('복원: 기도 중이었으면 기도 중으로 남고(쉬는 중도 그대로)', (tester) async {
    final h = await pumpChurch(tester, size: const Size(360, 800));
    await _plainSit(tester, h);
    await tester.tap(find.byKey(_start));
    await _settle(tester);
    final before = h.net.prayings.length;
    h.scene.emit(const SceneSeated('L03-2'));
    await _settle(tester);
    expect(find.byKey(_bar), findsNothing);
    expect(find.byType(ChurchPrayerCard), findsOneWidget);
    // 기도 중이던 것은 새로 시작하지 않고 상태만 다시 알린다.
    expect(h.net.prayings.length, greaterThanOrEqualTo(before));
    expect(h.net.prayings.last.$1, isTrue);
  });

  testWidgets('앉은 줄의 일어나기: 일어나고 줄이 사라진다', (tester) async {
    final h = await pumpChurch(tester, size: const Size(360, 800));
    await _plainSit(tester, h);
    await tester.tap(find.byKey(_stand));
    await _settle(tester);
    expect(h.net.stands, 1);
    expect(h.scene.count('stand'), 1);
    expect(find.byKey(_bar), findsNothing);
    expect(find.byType(ChurchPrayerCard), findsNothing);
    expect(h.net.prayings, isEmpty);
  });

  testWidgets('앉은 줄의 자세 선택: 무릎 꿇고를 고르면 저장되고 장면에 알린다', (tester) async {
    final h = await pumpChurch(tester, size: const Size(360, 800));
    await _plainSit(tester, h);
    await tester.tap(find.text('무릎 꿇고'));
    await _settle(tester);
    expect(h.settings.prayerPosture, PrayerPosture.kneel);
    expect(h.scene.lastArgs('setPrayerPosture')!['posture'], 'kneel');
    // 자세만 바꿨을 뿐 기도 상태는 알리지 않는다.
    expect(h.net.prayings, isEmpty);
  });

  testWidgets('분석: church_sit 은 앉을 때, prayer_start 는 묵주기도가 시작될 때만', (
    tester,
  ) async {
    final uploader = FakeEventUploader();
    Analytics.debugReset();
    addTearDown(Analytics.debugReset);
    await Analytics.init(
      uploader: uploader,
      consent: (_) => true,
      userId: 'user-1',
      appVersion: '1.0.0+1',
      platform: 'android',
      store: MemoryQueueStore(),
      observeLifecycle: false,
      trackAppOpen: false,
      throwOnUnknownEvent: true,
      batchSize: 1000,
    );
    int count(String name) => [
      ...uploader.events,
      ...Analytics.instance.queuedForTest,
    ].where((e) => e['name'] == name).length;
    final h = await pumpChurch(tester, size: const Size(360, 800));
    await _plainSit(tester, h);
    expect(count('church_sit'), 1);
    expect(count('prayer_start'), 0);
    await tester.tap(find.byKey(_start));
    await _settle(tester);
    expect(count('church_sit'), 1);
    expect(count('prayer_start'), 1);
    Analytics.debugReset();
  });

  testWidgets('앉은 줄 모양: 좁은 폭·큰 글씨에서도 넘치지 않는다', (tester) async {
    final h = await pumpChurch(
      tester,
      size: const Size(320, 640),
      textScale: 1.5,
    );
    await _plainSit(tester, h);
    expect(tester.takeException(), isNull);
    expect(find.byType(ChurchSeatedBar), findsOneWidget);
  });
}
