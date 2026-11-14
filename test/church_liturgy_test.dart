// ignore_for_file: depend_on_referenced_packages
import 'package:fake_async/fake_async.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/church/church_liturgy.dart';
import 'package:rosary_app/domain/liturgical_season.dart';

import 'church_screen_fakes.dart';

/// 2026-11-14 정오(KST): 연중 시기 · 위령 성월.
final _nov14 = DateTime.utc(2026, 11, 14, 3);

void main() {
  setUp(() {
    ChurchLiturgy.clock = () => _nov14;
    ChurchLiturgy.preview.value = LiturgyPreview.today;
  });
  tearDown(() {
    ChurchLiturgy.clock = DateTime.now;
    ChurchLiturgy.preview.value = LiturgyPreview.today;
  });

  test('helpers: 칩 라벨과 색', () {
    expect(liturgicalChipLabel(), '연중 시기 · 위령 성월');
    expect(liturgicalChipLabel(DateTime.utc(2026, 12, 24, 15)), '주님 성탄 대축일');
    expect(liturgicalChipLabel(DateTime.utc(2026, 3, 3)), '사순 시기');
    for (final c in LiturgicalColor.values) {
      expect(liturgicalColor(c).a, 1.0);
    }
    expect(
      liturgicalColor(LiturgicalColor.violet),
      isNot(liturgicalColor(LiturgicalColor.green)),
    );
    expect(ChurchLiturgy.current().toSceneArgs(), {
      'season': 'ordinary',
      'color': 'violet',
      'memorial': true,
    });
  });

  test('binding: 미리 보기를 바꾸면 알리고, 같은 값이면 알리지 않는다', () {
    var n = 0;
    final b = ChurchLiturgyBinding(onChanged: () => n++);
    expect(b.chipLabel, '연중 시기 · 위령 성월');
    ChurchLiturgy.preview.value = LiturgyPreview.lent;
    expect(n, 1);
    expect(b.sceneArgs, {'season': 'lent', 'color': 'violet', 'week': 1});
    expect(b.chipLabel, '사순 시기');
    b.refresh();
    expect(n, 1);
    ChurchLiturgy.preview.value = LiturgyPreview.christmas;
    expect(n, 2);
    expect(b.sceneArgs, {
      'season': 'christmas',
      'color': 'white',
      'feast': 'christmas',
    });
    b.dispose();
    ChurchLiturgy.preview.value = LiturgyPreview.easter;
    expect(n, 2);
  });

  test('binding: KST 자정이 지나면 다시 계산한다(11월 28일 → 대림 제1주일)', () {
    fakeAsync((async) {
      // 2026-11-28 23:59:30 KST
      final start = DateTime.utc(2026, 11, 28, 14, 59, 30);
      ChurchLiturgy.clock = () => start.add(async.elapsed);
      var n = 0;
      final b = ChurchLiturgyBinding(onChanged: () => n++);
      expect(b.sceneArgs['season'], 'ordinary');
      expect(b.sceneArgs['memorial'], true);
      async.elapse(const Duration(seconds: 20));
      expect(n, 0);
      async.elapse(const Duration(seconds: 15));
      expect(n, 1);
      expect(b.sceneArgs, {'season': 'advent', 'color': 'violet', 'week': 1});
      expect(b.chipLabel, '대림 시기');
      // 다음 자정에도(같은 시기면 알리지 않아도 날짜는 따라간다)
      async.elapse(const Duration(hours: 24));
      expect(b.day.date, DateTime(2026, 11, 30));
      b.dispose();
      expect(async.pendingTimers, isEmpty);
    });
  });

  testWidgets('설정의 미리 보기: 시기를 고르면 바로 바뀐다', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(home: Scaffold(body: ChurchLiturgyPreviewTile())),
    );
    expect(find.text('전례 시기 미리 보기'), findsOneWidget);
    expect(find.textContaining('오늘 날짜대로 · 연중 시기 · 위령 성월'), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('settings-church-liturgy')));
    await tester.pumpAndSettle();
    // 선택지 7개: 오늘 날짜·대림·성탄·사순·부활·연중·위령 성월
    for (final p in LiturgyPreview.values) {
      expect(find.byKey(ValueKey('liturgy-preview-${p.name}')), findsOneWidget);
    }
    await tester.tap(find.byKey(const ValueKey('liturgy-preview-lent')));
    await tester.pumpAndSettle();
    expect(ChurchLiturgy.preview.value, LiturgyPreview.lent);
    expect(find.textContaining('사순 시기 장식을 보는 중'), findsOneWidget);

    // 닫기만 하면 그대로
    await tester.tap(find.byKey(const ValueKey('settings-church-liturgy')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('닫기'));
    await tester.pumpAndSettle();
    expect(ChurchLiturgy.preview.value, LiturgyPreview.lent);

    // 다시 오늘 날짜로
    await tester.tap(find.byKey(const ValueKey('settings-church-liturgy')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('liturgy-preview-today')));
    await tester.pumpAndSettle();
    expect(ChurchLiturgy.preview.value, LiturgyPreview.today);
    expect(find.textContaining('오늘 날짜대로'), findsOneWidget);
  });

  testWidgets('미리 보기 창: 360x640, 글자 1.5배에서 넘치지 않는다', (tester) async {
    setView(tester, const Size(360, 640));
    await tester.pumpWidget(
      wrapApp(const Scaffold(body: ChurchLiturgyPreviewTile()), textScale: 1.5),
    );
    await tester.tap(find.byKey(const ValueKey('settings-church-liturgy')));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    await tester.tap(find.text('닫기'));
    await tester.pumpAndSettle();
  });

  testWidgets('성당 화면: 입장하면 오늘의 시기를 장면과 상태 칩에 준다', (tester) async {
    final h = await pumpChurch(tester);
    expect(h.scene.count('setLiturgy'), 1);
    expect(h.scene.lastArgs('setLiturgy'), {
      'season': 'ordinary',
      'color': 'violet',
      'memorial': true,
    });
    // init 다음에 보낸다
    final order = h.scene.calls.map((c) => c.$1).toList();
    expect(order.indexOf('setLiturgy'), greaterThan(order.indexOf('init')));
    final sub = tester.widget<Text>(
      find.byKey(const ValueKey('status-subtitle')),
    );
    expect(sub.data, contains('연중 시기 · 위령 성월'));

    // 설정에서 미리 보기를 바꾸면 장식과 칩이 바로 바뀐다
    ChurchLiturgy.preview.value = LiturgyPreview.christmas;
    await tester.pump();
    expect(h.scene.count('setLiturgy'), 2);
    expect(h.scene.lastArgs('setLiturgy'), {
      'season': 'christmas',
      'color': 'white',
      'feast': 'christmas',
    });
    expect(
      tester.widget<Text>(find.byKey(const ValueKey('status-subtitle'))).data,
      contains('주님 성탄 대축일'),
    );
    expect(tester.takeException(), isNull);
  });
}
