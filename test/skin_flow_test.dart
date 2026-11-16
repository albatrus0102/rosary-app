import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/app/app.dart';
import 'package:rosary_app/app/settings.dart';
import 'package:rosary_app/app/skins.dart';
import 'package:rosary_app/app/theme.dart';
import 'package:rosary_app/church/church_theme.dart';
import 'package:rosary_app/ui/skin_builder.dart';
import 'package:rosary_app/ui/skin_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';

Future<AppSettings> _settings([Map<String, Object> values = const {}]) async {
  SharedPreferences.setMockInitialValues(values);
  return AppSettings.load();
}

void _size(WidgetTester t, [Size size = const Size(400, 900)]) {
  t.view.physicalSize = size;
  t.view.devicePixelRatio = 1;
  addTearDown(t.view.reset);
}

/// 앱 본문(성당·오늘…)의 현재 색 구성.
ColorScheme _scheme(WidgetTester t) =>
    Theme.of(t.element(find.byType(Scaffold).first)).colorScheme;

DateTime _kst(int y, int m, int d) => DateTime.utc(y, m, d, 3);

Future<void> _openMore(WidgetTester t) async {
  await t.tap(
    find.descendant(of: find.byType(NavigationBar), matching: find.text('더보기')),
  );
  await t.pumpAndSettle();
}

/// 시트만 단독으로 여는 작은 앱(날짜 문 시험용: 지금을 넣을 수 있다).
Widget _sheetHost(AppSettings s, {DateTime? now, SkinGroup? tab}) =>
    MaterialApp(
      theme: AppTheme.light(),
      home: Builder(
        builder: (context) => Scaffold(
          body: Center(
            child: TextButton(
              onPressed: () =>
                  showSkinPicker(context, s, now: now, initialTab: tab),
              child: const Text('열기'),
            ),
          ),
        ),
      ),
    );

void main() {
  group('미리 보기 · 적용 · 취소', () {
    testWidgets('카드 → 미리 보기(저장 안 함) → 취소 → 원래대로', (t) async {
      _size(t);
      final s = await _settings();
      await t.pumpWidget(RosaryApp(s));
      await t.pumpAndSettle();
      final base = _scheme(t).primary;
      expect(base, AppTheme.seedScheme(Brightness.light).primary);

      await _openMore(t);
      expect(find.byKey(const ValueKey('more-skin')), findsOneWidget);
      await t.tap(find.byKey(const ValueKey('more-skin')));
      await t.pumpAndSettle();
      // 큰 카드 두 열
      expect(find.byKey(const ValueKey('skin-card-mary-blue')), findsOneWidget);
      final a = t.getTopLeft(find.byKey(const ValueKey('skin-card-default')));
      final b = t.getTopLeft(find.byKey(const ValueKey('skin-card-mary-blue')));
      expect(a.dy, b.dy, reason: '같은 줄에 두 카드');
      expect(b.dx, greaterThan(a.dx + 100));

      await t.tap(find.byKey(const ValueKey('skin-card-mary-blue')));
      await t.pumpAndSettle();
      // 시트가 내려가고 앱이 그 스킨으로 보인다. 저장은 아직이다.
      expect(find.byKey(const ValueKey('skin-card-mary-blue')), findsNothing);
      expect(find.byKey(const ValueKey('skin-preview-bar')), findsOneWidget);
      expect(find.text('‘성모 하늘색’ 미리 보는 중'), findsOneWidget);
      expect(s.skinPreviewId, 'mary-blue');
      expect(s.skinId, kDefaultSkinId);
      expect(_scheme(t).primary, Skins.byId('mary-blue').light!.accent);
      final prefs = await SharedPreferences.getInstance();
      expect(prefs.getString('skin_id'), isNull);

      await t.tap(find.byKey(const ValueKey('skin-preview-cancel')));
      await t.pumpAndSettle();
      expect(find.byKey(const ValueKey('skin-preview-bar')), findsNothing);
      expect(s.skinPreviewId, isNull);
      expect(s.skinId, kDefaultSkinId);
      expect(_scheme(t).primary, base);
    });

    testWidgets('적용하면 저장되고 앱이 그 스킨으로 남는다', (t) async {
      _size(t);
      final s = await _settings();
      await t.pumpWidget(RosaryApp(s));
      await t.pumpAndSettle();
      await _openMore(t);
      await t.tap(find.byKey(const ValueKey('more-skin')));
      await t.pumpAndSettle();
      await t.tap(find.byKey(const ValueKey('skin-card-olive-garden')));
      await t.pumpAndSettle();
      await t.tap(find.byKey(const ValueKey('skin-preview-apply')));
      await t.pumpAndSettle();
      expect(find.byKey(const ValueKey('skin-preview-bar')), findsNothing);
      expect(s.skinId, 'olive-garden');
      expect(s.skinPreviewId, isNull);
      expect(_scheme(t).primary, Skins.byId('olive-garden').light!.accent);
      final prefs = await SharedPreferences.getInstance();
      expect(prefs.getString('skin_id'), 'olive-garden');
      // 더보기 항목이 이름을 보여 준다.
      expect(
        find.descendant(
          of: find.byKey(const ValueKey('more-skin')),
          matching: find.text('올리브 정원'),
        ),
        findsOneWidget,
      );
    });

    testWidgets('화면을 뒤로 가면 미리 보기가 자동으로 되돌아간다', (t) async {
      _size(t);
      final s = await _settings();
      await t.pumpWidget(RosaryApp(s));
      await t.pumpAndSettle();
      await _openMore(t);
      await t.tap(find.byKey(const ValueKey('more-settings')));
      await t.pumpAndSettle();
      // 설정 → 화면 → 스킨
      await t.ensureVisible(
        find.byKey(const ValueKey('settings-skin'), skipOffstage: false),
      );
      await t.pumpAndSettle();
      await t.tap(find.byKey(const ValueKey('settings-skin')));
      await t.pumpAndSettle();
      await t.tap(find.byKey(const ValueKey('skin-card-rose')));
      await t.pumpAndSettle();
      expect(s.skinPreviewId, 'rose');
      expect(_scheme(t).primary, Skins.byId('rose').light!.accent);

      await t.tap(find.byType(BackButton));
      await t.pumpAndSettle();
      expect(s.skinPreviewId, isNull);
      expect(s.skinId, kDefaultSkinId);
      expect(find.byKey(const ValueKey('skin-preview-bar')), findsNothing);
      expect(_scheme(t).primary, AppTheme.seedScheme(Brightness.light).primary);
    });

    testWidgets('밝기가 고정된 스킨(밤 성당)은 기기가 밝아도 어둡게 그린다', (t) async {
      _size(t);
      final s = await _settings({'skin_id': 'night-church'});
      await t.pumpWidget(RosaryApp(s));
      await t.pumpAndSettle();
      final sc = _scheme(t);
      expect(sc.brightness, Brightness.dark);
      expect(sc.surface, Skins.byId('night-church').dark!.bg);
    });

    testWidgets('스킨을 바꿔도 성당 테마·기도 화면 바탕 설정은 그대로다', (t) async {
      _size(t);
      final s = await _settings({
        'skin_id': 'rose',
        'rosary3d_backdrop': 'ivory',
      });
      await t.pumpWidget(RosaryApp(s));
      await t.pumpAndSettle();
      final ctx = t.element(find.byType(Scaffold).first);
      expect(
        Theme.of(ctx).colorScheme.primary,
        Skins.byId('rose').light!.accent,
      );
      expect(ChurchTheme.of(ctx).colorScheme, ChurchTheme.scheme);
      expect(s.rosaryBackdrop, RosaryBackdrop.ivory);
    });
  });

  group('새 스킨 빨간 점', () {
    testWidgets('처음엔 점이 있고 미리 보면 꺼진다', (t) async {
      _size(t);
      final s = await _settings();
      await t.pumpWidget(_sheetHost(s, now: _kst(2026, 11, 16)));
      await t.tap(find.text('열기'));
      await t.pumpAndSettle();
      expect(find.byKey(const ValueKey('skin-dot-mary-blue')), findsOneWidget);
      expect(find.byKey(const ValueKey('skin-dot-default')), findsNothing);
      expect(find.byKey(const ValueKey('skin-tab-dot-basic')), findsOneWidget);

      await t.tap(find.byKey(const ValueKey('skin-card-mary-blue')));
      await t.pumpAndSettle();
      expect(s.skinSeen, contains('mary-blue'));
      await t.tap(find.text('열기'));
      await t.pumpAndSettle();
      expect(find.byKey(const ValueKey('skin-dot-mary-blue')), findsNothing);
      expect(
        find.byKey(const ValueKey('skin-dot-night-church')),
        findsOneWidget,
      );
    });
  });

  group('날짜 문', () {
    testWidgets('대림 전에는 계절 탭이 비고 안내만, 대림이 되면 카드가 나온다', (t) async {
      _size(t);
      final s = await _settings({'skin_id': 'advent-violet'});
      await t.pumpWidget(_sheetHost(s, now: _kst(2026, 11, 16)));
      await t.tap(find.text('열기'));
      await t.pumpAndSettle();
      await t.tap(find.byKey(const ValueKey('skin-tab-season')));
      await t.pumpAndSettle();
      expect(
        find.byKey(const ValueKey('skin-card-advent-violet')),
        findsNothing,
      );
      expect(find.byKey(const ValueKey('skin-season-hint')), findsOneWidget);
      expect(find.textContaining('11월 29일'), findsOneWidget);
      // 저장값은 그대로다.
      expect(s.skinId, 'advent-violet');
      await t.tapAt(const Offset(10, 10)); // 시트 닫기
      await t.pumpAndSettle();

      await t.pumpWidget(
        _sheetHost(s, now: _kst(2026, 12, 3), tab: SkinGroup.season),
      );
      await t.tap(find.text('열기'));
      await t.pumpAndSettle();
      expect(
        find.byKey(const ValueKey('skin-card-advent-violet')),
        findsOneWidget,
      );
      expect(find.byKey(const ValueKey('skin-card-lent-plum')), findsNothing);
    });

    testWidgets('앱은 대림 전에는 저장된 대림 스킨 대신 기본을 그리고, 대림이 되면 되살아난다', (t) async {
      _size(t);
      final s = await _settings({'skin_id': 'advent-violet'});
      await t.pumpWidget(RosaryApp(s, clock: () => _kst(2026, 11, 16)));
      await t.pumpAndSettle();
      expect(_scheme(t).primary, AppTheme.seedScheme(Brightness.light).primary);
      expect(s.skinId, 'advent-violet');

      await t.pumpWidget(RosaryApp(s, clock: () => _kst(2026, 12, 3)));
      await t.pumpAndSettle();
      expect(_scheme(t).primary, Skins.byId('advent-violet').light!.accent);
    });
  });

  group('만들기', () {
    Future<void> pump(
      WidgetTester t,
      AppSettings s, {
      CustomSkin? editing,
    }) async {
      _size(t, const Size(400, 1400));
      await t.pumpWidget(
        MaterialApp(
          theme: AppTheme.light(),
          home: SkinBuilderScreen(settings: s, editing: editing),
        ),
      );
      await t.pumpAndSettle();
    }

    FilledButton saveButton(WidgetTester t) => t.widget<FilledButton>(
      find.byKey(const ValueKey('skin-builder-save'), skipOffstage: false),
    );

    testWidgets('이름이 있고 대비가 괜찮으면 저장하고 바로 쓴다', (t) async {
      final s = await _settings();
      await pump(t, s);
      expect(saveButton(t).onPressed, isNull, reason: '이름이 없으면 잠김');
      await t.enterText(
        find.byKey(const ValueKey('skin-builder-name')),
        '우리 성당',
      );
      await t.pumpAndSettle();
      expect(find.byKey(const ValueKey('skin-builder-ok')), findsOneWidget);
      expect(saveButton(t).onPressed, isNotNull);
      await t.ensureVisible(find.byKey(const ValueKey('skin-builder-save')));
      await t.tap(find.byKey(const ValueKey('skin-builder-save')));
      await t.pumpAndSettle();
      expect(s.skinCustoms.single.name, '우리 성당');
      expect(s.skinId, s.skinCustoms.single.id);
      expect(
        Skins.effective(s.skinId, DateTime.now(), s.skinCustoms).nameKo,
        '우리 성당',
      );
    });

    testWidgets('읽기 어려운 색 조합은 경고하고 저장을 막는다', (t) async {
      final s = await _settings();
      await pump(t, s);
      await t.enterText(
        find.byKey(const ValueKey('skin-builder-name')),
        '흐린 것',
      );
      // 강조 칸을 펴고 옅은 금색을 고른다(밝은 바탕에서 글자 대비가 모자라다).
      await t.tap(find.byKey(const ValueKey('skin-slot-accent')));
      await t.pumpAndSettle();
      await t.ensureVisible(
        find.byKey(const ValueKey('swatch-accent-#c9a04a')),
      );
      await t.tap(find.byKey(const ValueKey('swatch-accent-#c9a04a')));
      await t.pumpAndSettle();
      expect(
        find.byKey(const ValueKey('skin-builder-warning')),
        findsOneWidget,
      );
      expect(find.textContaining('강조 / 배경'), findsOneWidget);
      expect(saveButton(t).onPressed, isNull);
      expect(s.skinCustoms, isEmpty);

      // 괜찮은 색으로 되돌리면 다시 저장할 수 있다.
      await t.tap(find.byKey(const ValueKey('swatch-accent-#2a5c94')));
      await t.pumpAndSettle();
      expect(find.byKey(const ValueKey('skin-builder-warning')), findsNothing);
      expect(saveButton(t).onPressed, isNotNull);
    });

    test('저장 함수 자체도 낮은 대비·빈 이름을 거절하고 아무것도 쓰지 않는다', () async {
      final s = await _settings();
      final bad = kSkins.first.light!.withSlot(
        SkinSlot.ink,
        kSkins.first.light!.bg,
      );
      final r = trySaveCustomSkin(s, name: '안 보임', tokens: bad);
      expect(r, isNotEmpty);
      expect(r.join(), contains('글자 / 배경'));
      expect(s.skinCustoms, isEmpty);
      expect(s.skinId, kDefaultSkinId);
      expect(
        trySaveCustomSkin(s, name: '  ', tokens: kSkins.first.light!),
        contains('이름을 적어 주세요'),
      );
      expect(s.skinCustoms, isEmpty);
      expect(
        trySaveCustomSkin(s, name: '좋은 색', tokens: kSkins.first.light!),
        isEmpty,
      );
      expect(s.skinCustoms.single.name, '좋은 색');
    });

    testWidgets('내가 만든 탭에서 새로 만들기·지우기', (t) async {
      _size(t);
      final s = await _settings();
      trySaveCustomSkin(
        s,
        name: '내 스킨',
        tokens: Skins.byId('rose').light!,
        apply: false,
      );
      await t.pumpWidget(_sheetHost(s, tab: SkinGroup.custom));
      await t.tap(find.text('열기'));
      await t.pumpAndSettle();
      expect(find.byKey(const ValueKey('skin-card-new')), findsOneWidget);
      final id = s.skinCustoms.single.id;
      expect(find.byKey(ValueKey('skin-card-$id')), findsOneWidget);
      await t.tap(find.byTooltip('스킨 더 보기'));
      await t.pumpAndSettle();
      await t.tap(find.text('지우기'));
      await t.pumpAndSettle();
      await t.tap(find.widgetWithText(FilledButton, '지우기'));
      await t.pumpAndSettle();
      expect(s.skinCustoms, isEmpty);
    });
  });
}
