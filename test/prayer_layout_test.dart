import 'dart:async';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/app/leader_voice.dart';
import 'package:rosary_app/app/prayer_text_short.dart';
import 'package:rosary_app/app/settings.dart';
import 'package:rosary_app/app/sound_player.dart';
import 'package:rosary_app/app/theme.dart';
import 'package:rosary_app/domain/prayer_data.dart';
import 'package:rosary_app/domain/prayer_mode.dart';
import 'package:rosary_app/domain/rosary_sequence.dart';
import 'package:rosary_app/domain/rosary_session.dart';
import 'package:rosary_app/ui/prayer_screen.dart';
import 'package:rosary_app/ui/widgets/prayer_actions.dart';
import 'package:rosary_app/ui/widgets/prayer_bead_strip.dart';
import 'package:rosary_app/ui/widgets/prayer_text_view.dart';
import 'package:rosary_app/ui/widgets/rosary_map.dart';
import 'package:rosary_app/ui/widgets/rosary_map_sheet.dart';
import 'package:shared_preferences/shared_preferences.dart';

class _SilentSoundPlayer extends SoundPlayer {
  @override
  Future<void> init() async {}
  @override
  Future<void> playDecadeChime() async {}
  @override
  Future<void> playBeadTick() async {}
  @override
  Future<void> dispose() async {}
}

/// 선창 모드 뒷단 재생을 [finish]까지 붙들어 두는 가짜 목소리.
class _HoldVoice implements LeaderVoice {
  final _speaking = ValueNotifier<bool>(false);
  final _pending = <Completer<void>>[];

  @override
  ValueListenable<bool> get isSpeaking => _speaking;
  @override
  Future<void> init() async {}
  @override
  Future<void> speakStep(RosaryStep step) async {}
  @override
  Future<void> speakResponder(RosaryStep step) {
    final c = Completer<void>();
    _pending.add(c);
    return c.future;
  }

  void finish() {
    for (final c in _pending) {
      if (!c.isCompleted) c.complete();
    }
    _pending.clear();
  }

  @override
  Future<void> stop() async => finish();
  @override
  Future<void> dispose() async {}
}

const _set = MysterySet.sorrowful;

final _steps = buildRosarySequence(_set);

int _indexOf(bool Function(RosaryStep) test) => _steps.indexWhere(test);

/// 고통의 신비 1단 성모송 4/10.
final _hailMary4 = _indexOf(
  (s) => s.kind == StepKind.hailMary && s.decade == 1 && s.beadIndex == 4,
);

Future<AppSettings> _settings([Map<String, Object> values = const {}]) async {
  SharedPreferences.setMockInitialValues({'haptic': false, ...values});
  return AppSettings.load();
}

/// 스크린샷을 남길 폴더(`--dart-define=UX_P0_SHOTS=<dir>`). 비어 있으면 찍지 않는다.
const _shotDir = String.fromEnvironment('UX_P0_SHOTS');

/// 논리 [size]의 화면(상태바·제스처 바 24dp 가정)에 기도 화면을 그린다.
/// [bottomInset]은 시스템 내비게이션 높이(제스처 24, 3버튼 48).
Future<void> _pump(
  WidgetTester tester,
  AppSettings settings, {
  Size size = const Size(360, 640),
  double systemScale = 1.0,
  int? index,
  RosarySession? session,
  Brightness? brightness,
  double bottomInset = 24,
  LeaderVoice? leaderVoice,
}) async {
  const dpr = 2.0;
  tester.view.devicePixelRatio = dpr;
  tester.view.physicalSize = size * dpr;
  final padding = FakeViewPadding(top: 48, bottom: bottomInset * dpr);
  tester.view.padding = padding;
  tester.view.viewPadding = padding;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    RepaintBoundary(
      key: const ValueKey('shot-root'),
      child: MaterialApp(
        debugShowCheckedModeBanner: false,
        // 밝기를 주면 앱의 실제 테마로 그린다(스크린샷, 다크 검증).
        theme: switch (brightness) {
          Brightness.light => AppTheme.light(),
          Brightness.dark => AppTheme.dark(),
          null => null,
        },
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(context)
              .copyWith(textScaler: TextScaler.linear(systemScale)),
          child: child!,
        ),
        home: PrayerScreen(
          settings: settings,
          mysterySet: _set,
          initialIndex: index ?? 0,
          session: session,
          soundPlayer: _SilentSoundPlayer(),
          leaderVoice: leaderVoice,
        ),
      ),
    ),
  );
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 300));
}

Future<void> _shot(WidgetTester tester, String name) async {
  if (_shotDir.isEmpty) return;
  final boundary = tester.renderObject<RenderRepaintBoundary>(
    find.byKey(const ValueKey('shot-root')),
  );
  await tester.runAsync(() async {
    final image = await boundary.toImage(pixelRatio: 2);
    final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
    final f = File('$_shotDir/$name.png');
    await f.parent.create(recursive: true);
    await f.writeAsBytes(bytes!.buffer.asUint8List());
  });
}

Rect _rect(WidgetTester tester, Finder f) => tester.getRect(f);

Finder get _scroll => find.byKey(const ValueKey('prayer-text-scroll'));
Finder get _more => find.byKey(const ValueKey('prayer-read-more'));
Finder get _next => find.byKey(const ValueKey('prayer-next'));
Finder get _header => find.byKey(const ValueKey('prayer-header'));
Finder get _strip => find.byKey(const ValueKey('prayer-strip'));
Finder get _actions => find.byType(PrayerActions);

ScrollPosition _position(WidgetTester tester) => tester
    .state<ScrollableState>(
      find.descendant(of: _scroll, matching: find.byType(Scrollable)),
    )
    .position;

/// 글자 폭이 실제와 같도록 Pretendard를 불러온다(테스트 기본 글꼴 Ahem은 훨씬 넓다).
Future<void> _loadFonts() async {
  Future<ByteData> load(String file) async =>
      ByteData.sublistView(await File('assets/fonts/$file').readAsBytes());
  final sans = FontLoader('Pretendard');
  for (final f in const [
    'Pretendard-Regular.otf',
    'Pretendard-Medium.otf',
    'Pretendard-SemiBold.otf',
    'Pretendard-Bold.otf',
  ]) {
    sans.addFont(load(f));
  }
  await sans.load();
  const icons = String.fromEnvironment('MATERIAL_ICONS');
  if (icons.isNotEmpty) {
    final l = FontLoader('MaterialIcons')
      ..addFont(
        Future.value(ByteData.sublistView(await File(icons).readAsBytes())),
      );
    await l.load();
  }
}

void main() {
  setUpAll(_loadFonts);

  group('layout budget (no control ever overlaps the prayer text)', () {
    // (시스템 글자 배율, 테마 밝기, 시스템 내비 높이): 제스처 24dp, 3버튼 48dp.
    const variants = <(double, Brightness?, double)>[
      (1.0, null, 24),
      (1.3, null, 24),
      (1.0, Brightness.light, 48),
      (1.0, Brightness.dark, 24),
      (1.3, Brightness.dark, 48),
    ];
    for (final size in const [Size(360, 640), Size(360, 800), Size(412, 915)]) {
      for (final prayerScale in const [1.0, 1.5, 2.0]) {
        for (final (system, brightness, nav) in variants) {
          testWidgets(
            'Hail Mary at ${size.width.toInt()}x${size.height.toInt()} '
            'prayer x$prayerScale system x$system '
            '${brightness?.name ?? 'default'} nav ${nav.toInt()}',
            (tester) async {
              final settings = await _settings({
                'prayer_text_scale': prayerScale,
                // 한 번 권하는 안내 막대가 측정에 끼지 않게.
                'short_prayers_asked': true,
              });
              await _pump(
                tester,
                settings,
                size: size,
                systemScale: system,
                index: _hailMary4,
                brightness: brightness,
                bottomInset: nav,
              );
              expect(tester.takeException(), isNull);

              final header = _rect(tester, _header);
              final strip = _rect(tester, _strip);
              final actions = _rect(tester, _actions);
              final viewport = _rect(tester, _scroll);
              final next = _rect(tester, _next);
              final back = _rect(
                tester,
                find.byKey(const ValueKey('prayer-back')),
              );

              // 고정 높이: 머리 48, 띠 36, 하단 76. 시스템 글자가 커져도 변하지 않는다.
              expect(header.height, 48);
              expect(strip.height, 36);
              expect(actions.height, PrayerActions.height);
              expect(actions.height, 76);

              // 글 칸은 어떤 조작 요소와도 겹치지 않는다.
              expect(viewport.overlaps(header), isFalse);
              expect(viewport.overlaps(strip), isFalse);
              expect(viewport.overlaps(actions), isFalse);
              expect(viewport.top, greaterThanOrEqualTo(strip.bottom));
              expect(viewport.bottom, lessThanOrEqualTo(actions.top));

              // 구슬 단추는 시스템 내비게이션(3버튼 포함) 위에 온전히 있다.
              expect(
                actions.bottom,
                lessThanOrEqualTo(size.height - nav + 0.01),
              );
              expect(next.height, greaterThanOrEqualTo(48));
              expect(back.overlaps(next), isFalse);
              // 단추 글이 단추 밖으로 넘치지 않는다.
              final nextText = _rect(
                tester,
                find.descendant(of: _next, matching: find.byType(Text)),
              );
              expect(nextText.left, greaterThanOrEqualTo(next.left));
              expect(nextText.right, lessThanOrEqualTo(next.right));
              expect(find.text('다음 구슬'), findsOneWidget);

              // 남는 높이는 모두 기도문 몫('기도문 계속 읽기' 칸 48 제외).
              final budget = size.height - 24 - nav - 48 - 36 - 76;
              final extent = _position(tester).maxScrollExtent;
              final overflow = extent > 0;
              expect(
                viewport.height,
                closeTo(budget - (overflow ? 48 : 0), 0.6),
              );
              // 기본 글자·기본 배율에서는 성모송 전문이 한 화면에 들어간다(360x640 포함).
              if (prayerScale == 1.0 && system == 1.0 && nav == 24) {
                expect(overflow, isFalse);
              }

              // 맨 위: 첫 글자가 칸 안.
              final text = find.textContaining('은총이 가득하신');
              expect(
                _rect(tester, text).top,
                greaterThanOrEqualTo(viewport.top),
              );

              if (!overflow) {
                expect(_more, findsNothing);
                expect(
                  _rect(tester, text).bottom,
                  lessThanOrEqualTo(viewport.bottom),
                );
                return;
              }

              // 넘치면: '기도문 계속 읽기'가 글 칸과 구슬 단추 사이의 제 칸에 있고,
              // 구슬 단추와 겹치지 않으며 이름이 다르다.
              expect(_more, findsOneWidget);
              expect(find.text('기도문 계속 읽기'), findsOneWidget);
              final more = _rect(tester, _more);
              expect(more.height, greaterThanOrEqualTo(48));
              expect(more.top, greaterThanOrEqualTo(viewport.bottom - 0.01));
              expect(more.bottom, lessThanOrEqualTo(actions.top + 0.01));
              expect(more.overlaps(next), isFalse);
              expect(more.overlaps(viewport), isFalse);
              // 스크롤 막대가 늘 보인다.
              expect(
                tester
                    .widget<Scrollbar>(
                      find.byKey(const ValueKey('prayer-text-scrollbar')),
                    )
                    .thumbVisibility,
                isTrue,
              );

              // '기도문 계속 읽기'만 눌러 끝까지 간다. 매번 앞으로 나아가고, 건너뛴 글이 없고
              // (새 쪽의 맨 윗줄은 앞 쪽에서 이미 보였거나 잘려 보이던 줄), 구슬은 그대로다.
              var taps = 0;
              while (_more.evaluate().isNotEmpty) {
                final before = _position(tester).pixels;
                await tester.tap(_more);
                await tester.pumpAndSettle();
                final after = _position(tester).pixels;
                expect(after, greaterThan(before));
                expect(
                  after - before,
                  lessThanOrEqualTo(viewport.height),
                  reason: 'a page never skips unread text',
                );
                expect(find.text('성모송 4/10'), findsOneWidget);
                expect(++taps, lessThan(40));
              }
              expect(_position(tester).pixels, closeTo(extent, 0.5));
              // 끝: 마지막 글자(아멘)가 칸 안에서 온전히 보이고, 계속 읽기 단추는 사라진다.
              expect(
                _rect(tester, text).bottom,
                lessThanOrEqualTo(viewport.bottom + 0.5),
              );
              expect(tester.takeException(), isNull);
            },
          );
        }
      }
    }
  });

  testWidgets('system text scale above 1.3 does not grow the chrome and is '
      'not multiplied into the prayer text', (tester) async {
    final settings = await _settings();
    await _pump(tester, settings, systemScale: 2.0, index: _hailMary4);
    expect(_rect(tester, _header).height, 48);
    expect(_rect(tester, _strip).height, 36);
    expect(_rect(tester, _actions).height, 76);
    final prayer = tester.widget<Text>(find.textContaining('은총이 가득하신').first);
    // 시스템 2.0 → 기도문 2.0배(48sp). 4.0배(96sp)가 아니다.
    expect(prayer.style!.fontSize, closeTo(48, 0.01));
    final element = tester.element(find.textContaining('은총이 가득하신').first);
    expect(MediaQuery.textScalerOf(element).scale(10), 10);
    // 머리줄 제목은 1.3배까지만.
    final title = tester.widget<Text>(find.text('고통의 신비 · 1단'));
    expect(
      MediaQuery.textScalerOf(tester.element(find.text('고통의 신비 · 1단')))
          .scale(10),
      closeTo(13, 0.01),
    );
    expect(title.maxLines, 1);
  });

  group('overflow (독립 스크롤 영역)', () {
    testWidgets('reading on never changes the bead; the bead button always '
        'does, even before the end of the text', (tester) async {
      final settings = await _settings({
        'prayer_text_scale': 2.0,
        'short_prayers_asked': true,
      });
      await _pump(tester, settings, index: _hailMary4);
      expect(_more, findsOneWidget);
      expect(find.text('성모송 4/10'), findsOneWidget);
      final position = _position(tester);
      expect(position.pixels, 0);

      // 계속 읽기: 아래로만 내리고 구슬은 그대로.
      await tester.tap(_more);
      await tester.pumpAndSettle();
      final afterMore = position.pixels;
      expect(afterMore, greaterThan(0));
      expect(find.text('성모송 4/10'), findsOneWidget);

      // 손가락으로 밀어도 스크롤된다(구슬은 그대로).
      await tester.drag(_scroll, const Offset(0, -120));
      await tester.pumpAndSettle();
      expect(position.pixels, greaterThan(afterMore));
      expect(find.text('성모송 4/10'), findsOneWidget);

      // 글을 짧게 눌러도, 읽지 않은 글이 남아 있으면 구슬이 아니라 글이 내려간다.
      final beforeTap = position.pixels;
      expect(beforeTap, lessThan(position.maxScrollExtent));
      await tester.tap(_scroll);
      await tester.pumpAndSettle();
      expect(position.pixels, greaterThan(beforeTap));
      expect(find.text('성모송 4/10'), findsOneWidget);

      // 끝까지 읽지 않았어도 '다음 구슬'은 바로 넘긴다.
      position.jumpTo(0);
      await tester.pump();
      expect(_more, findsOneWidget);
      await tester.tap(_next);
      await tester.pump(const Duration(milliseconds: 300));
      expect(find.text('성모송 5/10'), findsOneWidget);
      expect(_position(tester).pixels, 0);

      // 끝까지 읽은 뒤에 글을 누르면 다음 구슬.
      _position(tester).jumpTo(_position(tester).maxScrollExtent);
      await tester.pump();
      expect(_more, findsNothing);
      await tester.tap(_scroll);
      await tester.pump(const Duration(milliseconds: 300));
      expect(find.text('성모송 6/10'), findsOneWidget);
    });

    testWidgets('each page starts on a whole line that was cut or unseen', (
      tester,
    ) async {
      for (final scale in const [1.5, 2.0]) {
        final settings = await _settings({
          'prayer_text_scale': scale,
          'short_prayers_asked': true,
        });
        await _pump(tester, settings, index: _hailMary4);
        final viewport = _rect(tester, _scroll);
        final paragraph = tester.renderObject<RenderParagraph>(
          find.textContaining('은총이 가득하신'),
        );
        final length = paragraph.text.toPlainText().length;

        /// 화면 좌표의 (위, 아래) 줄 목록.
        List<Rect> lines() {
          final origin = paragraph.localToGlobal(Offset.zero);
          final out = <Rect>[];
          for (final b in paragraph.getBoxesForSelection(
            TextSelection(baseOffset: 0, extentOffset: length),
            boxHeightStyle: ui.BoxHeightStyle.max,
          )) {
            final r = b.toRect().shift(origin);
            if (out.isNotEmpty && r.top < out.last.bottom - 1) continue;
            out.add(r);
          }
          return out;
        }

        var pages = 0;
        while (_more.evaluate().isNotEmpty) {
          await tester.tap(_more);
          await tester.pumpAndSettle();
          final atEnd =
              _position(tester).pixels >=
              _position(tester).maxScrollExtent - 0.5;
          if (!atEnd) {
            // 칸 맨 위에 걸친(반만 보이는) 줄이 없다: 앞 줄은 흐림 띠 안에서 끝나고,
            // 첫 줄은 흐림 바로 아래에서 온전히 시작한다.
            final ls = lines();
            final cutAtTop = ls.where(
              (r) =>
                  r.top < viewport.top - 0.5 &&
                  r.bottom > viewport.top + PrayerTextView.fadeExtent + 0.5,
            );
            expect(cutAtTop, isEmpty, reason: 'x$scale page ${pages + 2}');
            final first = ls.firstWhere((r) => r.top >= viewport.top - 0.5);
            expect(
              first.top - viewport.top,
              closeTo(PrayerTextView.fadeExtent, 1),
              reason: 'x$scale page ${pages + 2}',
            );
          }
          expect(++pages, lessThan(40));
        }
        await tester.pumpWidget(const SizedBox());
      }
    });

    testWidgets('no button and no reserved space when the text fits', (
      tester,
    ) async {
      final settings = await _settings();
      await _pump(
        tester,
        settings,
        size: const Size(360, 800),
        index: _hailMary4,
      );
      expect(_more, findsNothing);
      final viewport = _rect(tester, _scroll);
      expect(viewport.bottom, _rect(tester, _actions).top);
      // 넘치지 않으면 글을 누르면 다음 구슬(기존 동작).
      await tester.tap(_scroll);
      await tester.pump(const Duration(milliseconds: 300));
      expect(find.text('성모송 5/10'), findsOneWidget);
    });

    testWidgets('semantics: reading button says the bead does not change', (
      tester,
    ) async {
      final handle = tester.ensureSemantics();
      final settings = await _settings({
        'prayer_text_scale': 2.0,
        'short_prayers_asked': true,
      });
      await _pump(tester, settings, index: _hailMary4);
      expect(
        find.bySemanticsLabel(RegExp('기도문 계속 읽기.*구슬은 바뀌지 않습니다')),
        findsOneWidget,
      );
      expect(find.bySemanticsLabel('다음 구슬'), findsOneWidget);
      handle.dispose();
    });

    testWidgets('the last step says 기도 마치기 instead of 다음 구슬', (tester) async {
      final settings = await _settings();
      await _pump(tester, settings, index: _steps.length - 1);
      expect(find.text('기도 마치기'), findsOneWidget);
      expect(find.text('다음 구슬'), findsNothing);
    });

    test('page math: line snapped, with a fallback', () {
      // 줄 높이 40, 칸 100: 0..40, 40..80, 80..120(잘림), 120..160 …
      final lines = [for (var i = 0; i < 10; i++) (i * 40.0, i * 40.0 + 40)];
      double next(double offset) => PrayerTextView.nextPageOffset(
        offset: offset,
        viewport: 100,
        maxExtent: 300,
        lines: lines,
        lineHeight: 40,
        topInset: 0,
      );
      // 흐림(20) 위로 온전히 보이는 줄은 0..80. 잘린 셋째 줄(80)이 다음 쪽의 첫 줄.
      expect(next(0), 80);
      expect(next(80), 160);
      expect(next(160), 240);
      expect(next(240), 300); // 끝에서 멈춘다
      // 줄을 모르면 칸 높이에서 한 줄을 뺀 만큼.
      expect(
        PrayerTextView.nextPageOffset(
          offset: 0,
          viewport: 100,
          maxExtent: 300,
          lines: const [],
          lineHeight: 40,
        ),
        60,
      );
      expect(PrayerTextView.fallbackPageStep(100, 90), 50);
    });
  });

  group('short prayers (외운 기도 짧게 보기)', () {
    testWidgets('default is off and the full Hail Mary shows', (tester) async {
      final settings = await _settings();
      expect(settings.shortPrayers, isFalse);
      await _pump(
        tester,
        settings,
        size: const Size(360, 800),
        index: _hailMary4,
      );
      expect(find.textContaining('기뻐하소서!'), findsOneWidget);
      expect(find.text('전체 기도문 보기'), findsNothing);
    });

    testWidgets('shows opening phrases only, with a big number, and fits at '
        '2.0 on 360x640 and 360x800', (tester) async {
      for (final size in const [Size(360, 640), Size(360, 800)]) {
        final settings = await _settings({
          'prayer_text_scale': 2.0,
          'short_prayers': true,
        });
        await _pump(tester, settings, size: size, index: _hailMary4);
        expect(
          find.textContaining(ShortPrayers.hailMary.leader),
          findsOneWidget,
        );
        expect(
          find.textContaining(ShortPrayers.hailMary.responder),
          findsOneWidget,
        );
        expect(find.textContaining('기뻐하소서'), findsNothing);
        expect(find.textContaining('복되시나이다'), findsNothing);
        expect(find.text('외운 기도 짧게 보기'), findsOneWidget);
        expect(_more, findsNothing, reason: '$size');
        expect(_position(tester).maxScrollExtent, 0, reason: '$size');
      }
    });

    testWidgets('full text button expands the current step only', (
      tester,
    ) async {
      final settings = await _settings({'short_prayers': true});
      await _pump(
        tester,
        settings,
        size: const Size(360, 800),
        index: _hailMary4,
      );
      await tester.tap(find.byKey(const ValueKey('prayer-short-toggle')));
      await tester.pump();
      expect(find.textContaining('기뻐하소서!'), findsOneWidget);
      expect(find.text('짧게 보기'), findsOneWidget);
      // 다음 구슬은 다시 짧게.
      await tester.tap(find.byKey(const ValueKey('prayer-next')));
      await tester.pump(const Duration(milliseconds: 300));
      expect(find.textContaining('기뻐하소서'), findsNothing);
      expect(find.textContaining(ShortPrayers.hailMary.leader), findsOneWidget);
    });

    testWidgets('sign of cross, creed, mystery announcement and glory are '
        'always in full', (tester) async {
      final settings = await _settings({'short_prayers': true});
      final session = RosarySession(buildRosarySequence(_set));
      addTearDown(session.dispose);
      await _pump(
        tester,
        settings,
        size: const Size(360, 800),
        session: session,
      );
      expect(find.textContaining('성부와 성자와 성령의 이름으로.'), findsOneWidget);
      expect(find.text('전체 기도문 보기'), findsNothing);

      Future<void> goto(int i) async {
        session.jumpTo(i);
        await tester.pump(const Duration(milliseconds: 300));
      }

      await goto(1);
      expect(find.textContaining('영원한 삶을 믿나이다.'), findsOneWidget);
      expect(find.text('전체 기도문 보기'), findsNothing);

      // 서두의 주님의 기도(전문)와 서두 성모송(짧게).
      await goto(2);
      expect(find.textContaining('악에서 구하소서.'), findsOneWidget);
      await goto(3);
      expect(find.textContaining('복되시나이다'), findsNothing);

      // 1단 첫 구슬: 신비 안내는 전문, 주님의 기도는 짧게.
      final decadeStart = _indexOf(
        (s) => s.kind == StepKind.ourFather && s.decade == 1,
      );
      await goto(decadeStart);
      expect(find.textContaining('피땀 흘리심을 묵상합시다.'), findsOneWidget);
      expect(
        find.textContaining(ShortPrayers.ourFather.leader),
        findsOneWidget,
      );
      expect(find.textContaining('악에서 구하소서'), findsNothing);

      final glory = _indexOf(
        (s) => s.kind == StepKind.gloryBe && s.decade == 1,
      );
      await goto(glory);
      expect(find.textContaining('이제와 항상 영원히.'), findsOneWidget);
      expect(find.text('전체 기도문 보기'), findsNothing);
    });

    testWidgets('leader/responder mode keeps the role label', (tester) async {
      final settings = await _settings({
        'short_prayers': true,
        'prayer_mode': PrayerMode.responder.name,
        'leader_audio': false,
      });
      await _pump(
        tester,
        settings,
        size: const Size(360, 800),
        index: _hailMary4,
      );
      expect(find.text('내 차례: 뒷단'), findsOneWidget);
      expect(
        find.textContaining(ShortPrayers.hailMary.responder),
        findsOneWidget,
      );
    });

    test('every short form is an opening phrase of the official text', () {
      void check(String shortLine, Prayer p, int line) {
        final full = p.text.split('\n')[line];
        final head = shortLine.replaceAll('…', '').trim();
        expect(full.startsWith(head), isTrue, reason: '"$head" vs "$full"');
      }

      check(ShortPrayers.hailMary.leader, Prayers.hailMary, 0);
      check(ShortPrayers.hailMary.responder, Prayers.hailMary, 3);
      check(ShortPrayers.ourFather.leader, Prayers.ourFather, 0);
      check(ShortPrayers.ourFather.responder, Prayers.ourFather, 5);
      check(ShortPrayers.fatima.leader, Prayers.fatima, 0);
      check(ShortPrayers.fatima.responder, Prayers.fatima, 2);
      // 늘 전문인 기도는 짧은 형태가 없다.
      for (final s in _steps) {
        final short = ShortPrayers.of(s);
        final always =
            s.kind == StepKind.signOfCross ||
            s.kind == StepKind.apostlesCreed ||
            s.kind == StepKind.gloryBe ||
            s.kind == StepKind.closing ||
            (s.kind == StepKind.ourFather && s.decade == null);
        expect(short == null, always, reason: s.title);
      }
    });
  });

  group('suggestion (one time at prayer scale >= 1.6)', () {
    testWidgets('is shown once, remembered, and can turn the setting on', (
      tester,
    ) async {
      final settings = await _settings({'prayer_text_scale': 1.6});
      expect(settings.shortPrayersAsked, isFalse);
      await _pump(tester, settings, index: _hailMary4);
      expect(find.textContaining('외운 기도는 첫머리만'), findsOneWidget);
      expect(settings.shortPrayersAsked, isTrue);
      expect(settings.shortPrayers, isFalse);

      await tester.tap(find.text('켜기'));
      await tester.pump();
      expect(settings.shortPrayers, isTrue);
      await tester.pumpAndSettle();
    });

    testWidgets('그대로 keeps it off and never asks again', (tester) async {
      final settings = await _settings({'prayer_text_scale': 2.0});
      await _pump(tester, settings, index: _hailMary4);
      expect(find.text('그대로'), findsOneWidget);
      await tester.tap(find.text('그대로'));
      await tester.pumpAndSettle();
      expect(settings.shortPrayers, isFalse);
      expect(find.textContaining('외운 기도는 첫머리만'), findsNothing);

      // 새 화면을 열어도 다시 묻지 않는다.
      await tester.pumpWidget(const SizedBox());
      await _pump(tester, settings, index: _hailMary4);
      expect(find.textContaining('외운 기도는 첫머리만'), findsNothing);
    });

    testWidgets('not shown below 1.6 or once answered', (tester) async {
      var settings = await _settings({'prayer_text_scale': 1.5});
      await _pump(tester, settings, index: _hailMary4);
      expect(find.textContaining('외운 기도는 첫머리만'), findsNothing);
      expect(settings.shortPrayersAsked, isFalse);

      await tester.pumpWidget(const SizedBox());
      settings = await _settings({
        'prayer_text_scale': 2.0,
        'short_prayers_asked': true,
      });
      await _pump(tester, settings, index: _hailMary4);
      expect(find.textContaining('외운 기도는 첫머리만'), findsNothing);
    });

    testWidgets('the text size sheet has the switch and answers the question', (
      tester,
    ) async {
      final settings = await _settings();
      await _pump(tester, settings, index: _hailMary4);
      await tester.tap(find.byTooltip('글자 크기'));
      await tester.pumpAndSettle();
      final tile = find.byKey(const ValueKey('sheet-short-prayers'));
      expect(tile, findsOneWidget);
      await tester.tap(tile);
      await tester.pumpAndSettle();
      expect(settings.shortPrayers, isTrue);
      expect(settings.shortPrayersAsked, isTrue);
    });
  });

  group('map sheet (묵주 전체 보기)', () {
    Future<void> openSheet(WidgetTester tester) async {
      await tester.tap(_strip);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 500));
    }

    Finder key(String k) => find.byKey(ValueKey(k));

    /// 지도의 현재 구슬이 계속 숨쉬듯 움직이므로 pumpAndSettle 대신 넉넉히 기다린다.
    Future<void> settle(WidgetTester tester) async {
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 600));
    }

    bool enabled(WidgetTester tester, String k) =>
        tester.widget<ButtonStyleButton>(key(k)).onPressed != null;

    Future<void> tapBead(WidgetTester tester, int slot) async {
      final box = tester.getRect(key('prayer-map-sheet-map'));
      final slots = layoutBeads(box.size);
      await tester.tapAt(slots[slot].center + box.topLeft);
      await tester.pump(const Duration(milliseconds: 100));
    }

    testWidgets('opens from the strip and never closes by itself', (
      tester,
    ) async {
      final settings = await _settings();
      await _pump(tester, settings, index: _hailMary4);
      expect(find.byType(RosaryMap), findsNothing);
      await openSheet(tester);
      expect(find.byType(RosaryMapSheet), findsOneWidget);
      expect(find.text('묵주 전체 보기'), findsOneWidget);
      expect(find.text('닫고 계속'), findsOneWidget);
      expect(find.textContaining('닫을 때까지 열려 있습니다'), findsOneWidget);
      expect(find.textContaining('초 뒤'), findsNothing);

      // 손대지 않고 10초, 다시 1분이 지나도 열려 있다(걸린 타이머도 없다).
      await tester.pump(const Duration(seconds: 10));
      expect(find.byType(RosaryMapSheet), findsOneWidget);
      await tester.pump(const Duration(minutes: 1));
      expect(find.byType(RosaryMapSheet), findsOneWidget);
      // 구슬은 그대로.
      expect(settings.savedPrayer?.stepIndex ?? _hailMary4, _hailMary4);
      expect(tester.takeException(), isNull);
    });

    testWidgets('bead tap jumps, 되돌리기 restores the previous place, '
        '기도하던 자리로 returns to where the sheet was opened', (tester) async {
      final settings = await _settings();
      await _pump(tester, settings, index: _hailMary4);
      await openSheet(tester);
      expect(find.text('1단 성모송 4번째 구슬'), findsNothing); // Text.rich
      expect(
        tester
            .widget<RichText>(
              find.descendant(
                of: key('prayer-map-position'),
                matching: find.byType(RichText),
              ),
            )
            .text
            .toPlainText(),
        '현재 위치  1단 성모송 4번째 구슬',
      );
      // 아직 옮기지 않았으면 두 단추는 꺼져 있다.
      expect(enabled(tester, 'prayer-map-undo'), isFalse);
      expect(enabled(tester, 'prayer-map-origin'), isFalse);

      // 2단 3번째 성모송 구슬을 누른다.
      await tapBead(tester, RosarySlots.decadeBead(2, 3));
      final d2b3 = _indexOf(
        (s) => s.kind == StepKind.hailMary && s.decade == 2 && s.beadIndex == 3,
      );
      expect(settings.savedPrayer?.stepIndex, d2b3);
      expect(find.text('성모송 3/10'), findsWidgets);
      expect(enabled(tester, 'prayer-map-undo'), isTrue);
      expect(enabled(tester, 'prayer-map-origin'), isTrue);

      // 한 번 더 옮긴다: 4단 처음(큰 단추).
      await tester.tap(key('prayer-map-decade-4'));
      await tester.pump(const Duration(milliseconds: 100));
      final d4 = _indexOf((s) => s.kind == StepKind.ourFather && s.decade == 4);
      expect(settings.savedPrayer?.stepIndex, d4);

      // 되돌리기 = 직전 자리(2단 3번째). 한 번 더 = 그 앞(연 자리).
      await tester.tap(key('prayer-map-undo'));
      await tester.pump(const Duration(milliseconds: 100));
      expect(settings.savedPrayer?.stepIndex, d2b3);
      await tester.tap(key('prayer-map-undo'));
      await tester.pump(const Duration(milliseconds: 100));
      expect(settings.savedPrayer?.stepIndex, _hailMary4);
      expect(enabled(tester, 'prayer-map-undo'), isFalse);
      expect(enabled(tester, 'prayer-map-origin'), isFalse);

      // 기도하던 자리로: 여러 번 옮긴 뒤에도 한 번에 돌아온다. 그것도 되돌릴 수 있다.
      await tester.tap(key('prayer-map-decade-5'));
      await tester.pump(const Duration(milliseconds: 100));
      await tapBead(tester, RosarySlots.decadeBead(3, 7));
      final d3b7 = _indexOf(
        (s) => s.kind == StepKind.hailMary && s.decade == 3 && s.beadIndex == 7,
      );
      expect(settings.savedPrayer?.stepIndex, d3b7);
      await tester.tap(key('prayer-map-origin'));
      await tester.pump(const Duration(milliseconds: 100));
      expect(settings.savedPrayer?.stepIndex, _hailMary4);
      await tester.tap(key('prayer-map-undo'));
      await tester.pump(const Duration(milliseconds: 100));
      expect(settings.savedPrayer?.stepIndex, d3b7);

      // 옮긴 뒤에도 저절로 닫히지 않는다.
      await tester.pump(const Duration(seconds: 10));
      expect(find.byType(RosaryMapSheet), findsOneWidget);
      expect(tester.takeException(), isNull);
    });

    testWidgets('decade buttons are large, go to the start of each decade, and '
        '닫고 계속 closes', (tester) async {
      final settings = await _settings();
      await _pump(tester, settings, index: _hailMary4);
      await openSheet(tester);
      for (var d = 0; d <= 5; d++) {
        final r = tester.getRect(key('prayer-map-decade-$d'));
        expect(r.height, greaterThanOrEqualTo(48), reason: 'decade $d');
        expect(r.width, greaterThanOrEqualTo(48), reason: 'decade $d');
      }
      for (final k in const ['prayer-map-undo', 'prayer-map-origin']) {
        expect(tester.getSize(key(k)).height, greaterThanOrEqualTo(48));
      }
      expect(tester.getSize(key('prayer-map-close')).height, 52);

      await tester.tap(key('prayer-map-decade-1'));
      await tester.pump(const Duration(milliseconds: 100));
      final start = _indexOf(
        (s) => s.kind == StepKind.ourFather && s.decade == 1,
      );
      expect(settings.savedPrayer?.stepIndex, start);
      await tester.tap(key('prayer-map-decade-0'));
      await tester.pump(const Duration(milliseconds: 100));
      expect(find.textContaining('성부와 성자와 성령의 이름으로.'), findsWidgets);
      await tester.tap(key('prayer-map-decade-1'));
      await tester.pump(const Duration(milliseconds: 100));

      await tester.tap(find.text('닫고 계속'));
      await settle(tester);
      expect(find.byType(RosaryMapSheet), findsNothing);
      // 신비 안내가 있는 첫 구슬로 돌아와 있다.
      expect(find.textContaining('피땀 흘리심'), findsWidgets);
    });

    testWidgets('a long drag on the sheet map still moves exactly one bead and '
        'can be undone', (tester) async {
      final settings = await _settings();
      await _pump(
        tester,
        settings,
        size: const Size(360, 800),
        index: _hailMary4,
      );
      await openSheet(tester);
      final map = key('prayer-map-sheet-map');
      final g = await tester.startGesture(tester.getCenter(map));
      for (var i = 0; i < 12; i++) {
        await g.moveBy(const Offset(0, 20));
        await tester.pump(const Duration(milliseconds: 16));
      }
      await g.up();
      await tester.pump(const Duration(milliseconds: 400));
      expect(settings.savedPrayer?.stepIndex, _hailMary4 + 1);
      await tester.tap(key('prayer-map-undo'));
      await tester.pump(const Duration(milliseconds: 100));
      expect(settings.savedPrayer?.stepIndex, _hailMary4);
    });

    for (final size in const [Size(360, 640), Size(360, 800), Size(412, 915)]) {
      for (final (system, nav) in const [
        (1.0, 24.0),
        (1.3, 48.0),
        (2.0, 48.0),
      ]) {
        testWidgets('sheet fits ${size.width.toInt()}x${size.height.toInt()} '
            'system x$system nav ${nav.toInt()}: nothing under the system bars, '
            'no overflow', (tester) async {
          final settings = await _settings();
          await _pump(
            tester,
            settings,
            size: size,
            systemScale: system,
            index: _hailMary4,
            bottomInset: nav,
          );
          await openSheet(tester);
          await settle(tester);
          expect(tester.takeException(), isNull);
          final sheet = tester.getRect(find.byType(RosaryMapSheet));
          expect(sheet.top, greaterThanOrEqualTo(24));
          final close = tester.getRect(key('prayer-map-close'));
          expect(close.bottom, lessThanOrEqualTo(size.height - nav));
          final map = tester.getRect(key('prayer-map-sheet-map'));
          expect(map.height, greaterThanOrEqualTo(150));
          // 위에서 아래로 겹치지 않고 쌓인다.
          final decade = tester.getRect(key('prayer-map-decade-0'));
          final undo = tester.getRect(key('prayer-map-undo'));
          expect(map.bottom, lessThanOrEqualTo(decade.top));
          expect(decade.bottom, lessThanOrEqualTo(undo.top));
          expect(undo.bottom, lessThanOrEqualTo(close.top));
        });
      }
    }

    testWidgets('focus returns to the button that opened the sheet', (
      tester,
    ) async {
      final settings = await _settings();
      await _pump(tester, settings, index: _hailMary4);

      FocusNode stripNode() => Focus.of(
        tester.element(
          find.descendant(of: _strip, matching: find.byType(SizedBox)).first,
        ),
      );

      // 띠에서 열고 닫는다.
      expect(stripNode().hasFocus, isFalse);
      await openSheet(tester);
      expect(stripNode().hasFocus, isFalse);
      await tester.tap(find.text('닫고 계속'));
      await settle(tester);
      expect(find.byType(RosaryMapSheet), findsNothing);
      expect(stripNode().hasPrimaryFocus, isTrue);

      // 뒤로 가기(시스템)로 닫아도 같다.
      FocusManager.instance.primaryFocus?.unfocus();
      await tester.pump();
      expect(stripNode().hasFocus, isFalse);
      await openSheet(tester);
      await tester.binding.handlePopRoute();
      await settle(tester);
      expect(find.byType(RosaryMapSheet), findsNothing);
      expect(stripNode().hasPrimaryFocus, isTrue);

      // ⋮ 메뉴에서 열면 ⋮ 단추로 돌아온다.
      await tester.tap(key('prayer-menu'));
      await settle(tester);
      await tester.tap(find.text('묵주 전체 보기'));
      await settle(tester);
      expect(find.byType(RosaryMapSheet), findsOneWidget);
      await tester.tap(find.text('닫고 계속'));
      await settle(tester);
      final menuNode = Focus.of(tester.element(key('prayer-menu')));
      expect(menuNode.hasFocus, isTrue);
      expect(stripNode().hasFocus, isFalse);
      expect(tester.takeException(), isNull);
    });

    testWidgets('screen readers: the sheet reads the current place and every '
        'button has a label', (tester) async {
      final handle = tester.ensureSemantics();
      final settings = await _settings();
      await _pump(tester, settings, index: _hailMary4);
      await openSheet(tester);
      expect(find.bySemanticsLabel('현재 위치, 1단 성모송 4번째 구슬'), findsOneWidget);
      expect(find.bySemanticsLabel('3단 처음으로'), findsOneWidget);
      expect(find.bySemanticsLabel('맨 처음으로, 서두 성호경'), findsOneWidget);
      expect(find.bySemanticsLabel('되돌리기'), findsOneWidget);
      expect(find.bySemanticsLabel('닫고 계속'), findsOneWidget);
      final live = tester.getSemantics(
        find.bySemanticsLabel('현재 위치, 1단 성모송 4번째 구슬'),
      );
      expect(live.flagsCollection.isLiveRegion, isTrue);

      await tester.tap(key('prayer-map-decade-3'));
      await tester.pump(const Duration(milliseconds: 100));
      expect(find.bySemanticsLabel('현재 위치, 3단 주님의 기도'), findsOneWidget);
      expect(
        find.bySemanticsLabel(RegExp('기도하던 자리로, 1단 성모송 4번째 구슬')),
        findsOneWidget,
      );
      // 화면 읽기로 확인하는 동안에도 닫히지 않는다.
      await tester.pump(const Duration(seconds: 30));
      expect(find.byType(RosaryMapSheet), findsOneWidget);
      handle.dispose();
    });

    test('position names', () {
      String at(bool Function(RosaryStep) t) =>
          describeRosaryPosition(_steps[_indexOf(t)]);
      expect(describeRosaryPosition(_steps.first), '서두 성호경');
      expect(describeRosaryPosition(_steps[1]), '서두 사도신경');
      expect(
        at((s) => s.kind == StepKind.hailMary && s.decade == null),
        '서두 성모송 1번째 구슬',
      );
      expect(
        at(
          (s) =>
              s.kind == StepKind.hailMary && s.decade == 3 && s.beadIndex == 2,
        ),
        '3단 성모송 2번째 구슬',
      );
      expect(
        at((s) => s.kind == StepKind.ourFather && s.decade == 5),
        '5단 주님의 기도',
      );
      expect(at((s) => s.kind == StepKind.gloryBe && s.decade == 2), '2단 영광송');
      expect(at((s) => s.kind == StepKind.fatima && s.decade == 2), '2단 구원송');
      expect(describeRosaryPosition(_steps.last), '마침 기도');
    });

    test('slot hit testing and slot -> step mapping', () {
      const size = Size(300, 400);
      final slots = layoutBeads(size);
      for (var i = 0; i < slots.length; i++) {
        expect(slotAtPoint(slots, slots[i].center), i);
      }
      expect(slotAtPoint(slots, const Offset(-500, -500)), isNull);
      expect(stepIndexForSlot(_steps, RosarySlots.crucifix), 0);
      expect(
        _steps[stepIndexForSlot(_steps, RosarySlots.decadeBead(1, 10))!].kind,
        StepKind.hailMary,
      );
      for (var s = 0; s < RosarySlots.count; s++) {
        final i = stepIndexForSlot(_steps, s);
        expect(i, isNotNull, reason: 'slot $s');
        expect(slotIndexForStep(_steps[i!]), s);
      }
    });
  });

  group('bead strip', () {
    test('model: decade, intro and closing', () {
      final hm4 = stripModelFor(_steps[_hailMary4]);
      expect(hm4.beads.length, 12);
      expect(hm4.current, 4);
      expect(hm4.label, '1/5단');
      final of = stripModelFor(
        _steps[_indexOf((s) => s.kind == StepKind.ourFather && s.decade == 3)],
      );
      expect(of.current, 0);
      expect(of.decade, 3);
      final glory = stripModelFor(
        _steps[_indexOf((s) => s.kind == StepKind.gloryBe && s.decade == 2)],
      );
      expect(glory.current, 11);
      expect(stripModelFor(_steps.first).label, '서두');
      expect(stripModelFor(_steps.first).current, 0);
      final closing = stripModelFor(_steps.last);
      expect(closing.label, '마침');
      expect(closing.current, closing.beads.length - 1);
      expect(closing.decade, 6);
    });

    testWidgets('shows current prayer, decade n/5 and is a button', (
      tester,
    ) async {
      final settings = await _settings();
      await _pump(tester, settings, index: _hailMary4);
      expect(find.text('성모송 4/10'), findsOneWidget);
      expect(find.text('1/5단'), findsOneWidget);
      expect(find.byKey(const ValueKey('prayer-strip-dots')), findsOneWidget);
      expect(find.bySemanticsLabel(RegExp('묵주 전체 보기')), findsWidgets);
    });
  });

  testWidgets('header menu has map, short toggle and end', (tester) async {
    final settings = await _settings();
    await _pump(tester, settings, index: _hailMary4);
    await tester.tap(find.byKey(const ValueKey('prayer-menu')));
    await tester.pumpAndSettle();
    expect(find.text('묵주 전체 보기'), findsOneWidget);
    expect(find.text('외운 기도 짧게 보기'), findsOneWidget);
    expect(find.text('기도 끝내기'), findsOneWidget);
    await tester.tap(find.text('외운 기도 짧게 보기'), warnIfMissed: false);
    await tester.pumpAndSettle();
    expect(settings.shortPrayers, isTrue);
  });

  testWidgets('wide landscape keeps two panes and the text never sits under '
      'the controls', (tester) async {
    final settings = await _settings({'prayer_text_scale': 2.0});
    await _pump(
      tester,
      settings,
      size: const Size(640, 360),
      index: _hailMary4,
    );
    final text = _rect(tester, _scroll);
    final map = _rect(tester, find.byType(RosaryMap));
    final header = _rect(tester, _header);
    final actions = _rect(tester, _actions);
    expect(text.right, lessThanOrEqualTo(map.left));
    expect(text.overlaps(header), isFalse);
    expect(text.overlaps(actions), isFalse);
    expect(tester.takeException(), isNull);
  });

  // 눈으로 확인하는 화면 모음. `--dart-define=UX_P0_SHOTS=<dir>`를 주면 PNG로 남긴다
  // (아이콘까지 그리려면 `--dart-define=MATERIAL_ICONS=<MaterialIcons-Regular.otf>`).
  group('선창 모드: 뒷단 듣는 중 (앱이 뒷단을 읽어 주는 동안)', () {
    final status = find.byKey(const ValueKey('prayer-responder-status'));
    final highlight = find.byKey(const ValueKey('prayer-responder-highlight'));
    final pillFinder = find.descendant(of: status, matching: find.byType(Chip));

    String tag(Size s, double prayer, double system, Brightness b) =>
        '${s.width.toInt()}x${s.height.toInt()}_p${prayer}_s${system}_${b.name}';

    // (크기, 기도문 배율, 시스템 배율, 밝기). 글자 2배는 기도문 2.0과 시스템 2.0 둘 다 본다.
    const cases = <(Size, double, double, Brightness)>[
      (Size(360, 640), 1.0, 1.0, Brightness.light),
      (Size(360, 640), 2.0, 1.0, Brightness.light),
      (Size(360, 640), 1.0, 2.0, Brightness.dark),
      (Size(360, 640), 2.0, 2.0, Brightness.dark),
      (Size(360, 800), 1.0, 1.0, Brightness.light),
      (Size(360, 800), 2.0, 1.0, Brightness.dark),
      (Size(360, 800), 2.0, 2.0, Brightness.light),
      (Size(360, 800), 1.0, 2.0, Brightness.dark),
      (Size(412, 915), 2.0, 1.3, Brightness.dark),
      (Size(1024, 600), 1.5, 1.0, Brightness.light),
    ];

    for (final (size, prayer, system, b) in cases) {
      testWidgets('plays without overlap ${tag(size, prayer, system, b)}', (
        tester,
      ) async {
        final settings = await _settings({
          'prayer_text_scale': prayer,
          'short_prayers_asked': true,
          'prayer_mode': PrayerMode.leader.name,
        });
        final voice = _HoldVoice();
        await _pump(
          tester,
          settings,
          size: size,
          systemScale: system,
          index: _hailMary4,
          brightness: b,
          leaderVoice: voice,
        );
        final name = tag(size, prayer, system, b);
        expect(status, findsNothing);
        expect(highlight, findsNothing);
        final before = _rect(tester, _scroll);
        await _shot(tester, 'leader_$name${'_1before'}');

        await tester.tap(_next);
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 300));
        await tester.pump(const Duration(milliseconds: 300));
        await tester.pump(const Duration(milliseconds: 300));
        await tester.pump(const Duration(milliseconds: 300));
        expect(tester.takeException(), isNull);
        expect(status, findsOneWidget);
        expect(find.text('뒷단 듣는 중…'), findsOneWidget);
        // 뒷단 문장이 칸 밖에 있었다면 보이도록 내려 준다(칸보다 길면 첫머리부터).
        {
          final h = _rect(tester, highlight);
          final v = _rect(tester, _scroll);
          expect(h.top, lessThan(v.bottom - 8), reason: 'highlight below fold');
          expect(h.bottom, greaterThan(v.top + 8));
        }
        await _shot(tester, 'leader_$name${'_2playing'}');

        final screen = Offset.zero & size;
        final pill = _rect(tester, pillFinder);
        final viewport = _rect(tester, _scroll);
        final actions = _rect(tester, _actions);
        expect(screen.contains(pill.topLeft), isTrue);
        expect(screen.contains(pill.bottomRight), isTrue, reason: '$pill');
        // 상태 알약은 글 칸 밖(위)에 있고 글과 겹치지 않는다.
        expect(pill.bottom, lessThanOrEqualTo(viewport.top + 0.5));
        // 좁은 화면은 단추가 글 칸 아래에, 넓은 화면은 오른쪽 칸에 있다.
        if (viewport.right > actions.left + 0.5) {
          expect(viewport.bottom, lessThanOrEqualTo(actions.top + 0.5));
        }
        expect(viewport.height, greaterThan(80), reason: 'text pane squeezed');
        // 알약이 글 칸을 줄이는 양은 알약 높이 정도다.
        // (글이 넘치게 되면 '기도문 계속 읽기' 칸 48dp가 더 잡힌다.)
        expect(
          before.height - viewport.height,
          lessThanOrEqualTo(pill.height + 8 + PrayerTextView.moreRowHeight + 1),
        );
        // 단추는 그대로 눌린다: 크기를 지킨다.
        expect(_rect(tester, _next).height, greaterThanOrEqualTo(48));
        if (highlight.evaluate().isNotEmpty) {
          final h = _rect(tester, highlight);
          expect(h.left, greaterThanOrEqualTo(viewport.left - 0.5));
          expect(h.right, lessThanOrEqualTo(viewport.right + 0.5));
        }
        // 글 칸을 끝까지 내리면 뒷단 강조의 끝이 칸 안에 온전히 보인다(글이 칸보다 길면
        // 위쪽은 스크롤로 읽는다).
        _position(tester).jumpTo(_position(tester).maxScrollExtent);
        await tester.pump(const Duration(milliseconds: 300));
        expect(highlight, findsOneWidget);
        final h = _rect(tester, highlight);
        final v = _rect(tester, _scroll);
        expect(h.bottom, lessThanOrEqualTo(v.bottom + 0.5));
        expect(h.bottom, greaterThan(v.top));
        expect(h.left, greaterThanOrEqualTo(v.left - 0.5));
        expect(h.right, lessThanOrEqualTo(v.right + 0.5));
        await _shot(tester, 'leader_$name${'_3playing_end'}');
        expect(tester.takeException(), isNull);

        voice.finish();
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 300));
        expect(status, findsNothing);
        expect(find.text('성모송 5/10'), findsOneWidget);
        await _shot(tester, 'leader_$name${'_4after'}');
        expect(tester.takeException(), isNull);
      });
    }

    testWidgets('mystery card step (first decade bead) at x2 dark', (
      tester,
    ) async {
      final settings = await _settings({
        'prayer_text_scale': 2.0,
        'short_prayers_asked': true,
        'prayer_mode': PrayerMode.leader.name,
      });
      final voice = _HoldVoice();
      await _pump(
        tester,
        settings,
        size: const Size(360, 640),
        index: _indexOf((s) => s.kind == StepKind.ourFather && s.decade == 1),
        brightness: Brightness.dark,
        leaderVoice: voice,
      );
      await tester.tap(_next);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));
      expect(status, findsOneWidget);
      expect(
        _rect(tester, pillFinder).bottom,
        lessThanOrEqualTo(_rect(tester, _scroll).top + 0.5),
      );
      expect(tester.takeException(), isNull);
    });

    testWidgets('short prayers view highlights the responder too', (
      tester,
    ) async {
      final settings = await _settings({
        'prayer_text_scale': 2.0,
        'short_prayers': true,
        'short_prayers_asked': true,
        'prayer_mode': PrayerMode.leader.name,
      });
      final voice = _HoldVoice();
      await _pump(
        tester,
        settings,
        size: const Size(360, 640),
        index: _hailMary4,
        brightness: Brightness.light,
        leaderVoice: voice,
      );
      await tester.tap(_next);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));
      expect(status, findsOneWidget);
      expect(highlight, findsOneWidget);
      await _shot(tester, 'leader_short_360x640_p2.0_light_2playing');
      expect(tester.takeException(), isNull);
    });
  });

  group('screens (기도문 큰 글씨 · 묵주 전체 보기)', () {
    String tag(Size s, double scale, Brightness b) =>
        '${s.width.toInt()}x${s.height.toInt()}_x${scale}_${b.name}';

    for (final size in const [Size(360, 640), Size(360, 800), Size(412, 915)]) {
      for (final scale in const [1.0, 1.5, 2.0]) {
        for (final b in Brightness.values) {
          testWidgets('Hail Mary ${tag(size, scale, b)}', (tester) async {
            final settings = await _settings({
              'prayer_text_scale': scale,
              'short_prayers_asked': true,
            });
            await _pump(
              tester,
              settings,
              size: size,
              index: _hailMary4,
              brightness: b,
            );
            await _shot(tester, 'prayer_${tag(size, scale, b)}_1top');
            if (_more.evaluate().isNotEmpty) {
              await tester.tap(_more);
              await tester.pumpAndSettle();
              await _shot(tester, 'prayer_${tag(size, scale, b)}_2more');
              _position(tester).jumpTo(_position(tester).maxScrollExtent);
              await tester.pumpAndSettle();
              await _shot(tester, 'prayer_${tag(size, scale, b)}_3end');
              expect(_more, findsNothing);
            }
            expect(tester.takeException(), isNull);
          });
        }
      }
    }

    testWidgets('3-button navigation, responder mode, mystery card at x2', (
      tester,
    ) async {
      var settings = await _settings({
        'prayer_text_scale': 2.0,
        'short_prayers_asked': true,
      });
      await _pump(
        tester,
        settings,
        size: const Size(360, 640),
        index: _hailMary4,
        brightness: Brightness.light,
        bottomInset: 48,
      );
      await _shot(tester, 'prayer_360x640_x2.0_light_3button');

      await tester.pumpWidget(const SizedBox());
      settings = await _settings({
        'prayer_text_scale': 2.0,
        'short_prayers_asked': true,
        'prayer_mode': PrayerMode.responder.name,
        'leader_audio': false,
      });
      await _pump(
        tester,
        settings,
        size: const Size(360, 800),
        index: _hailMary4,
        brightness: Brightness.light,
      );
      expect(find.text('내 차례: 뒷단'), findsOneWidget);
      await _shot(tester, 'prayer_360x800_x2.0_light_responder');

      await tester.pumpWidget(const SizedBox());
      settings = await _settings({
        'prayer_text_scale': 2.0,
        'short_prayers_asked': true,
      });
      await _pump(
        tester,
        settings,
        size: const Size(360, 800),
        index: _indexOf((s) => s.kind == StepKind.ourFather && s.decade == 1),
        brightness: Brightness.dark,
      );
      await _shot(tester, 'prayer_360x800_x2.0_dark_mystery_1top');
      await tester.tap(_more);
      await tester.pumpAndSettle();
      await _shot(tester, 'prayer_360x800_x2.0_dark_mystery_2more');

      await tester.pumpWidget(const SizedBox());
      settings = await _settings();
      await _pump(
        tester,
        settings,
        size: const Size(360, 800),
        index: _steps.length - 1,
        brightness: Brightness.light,
      );
      await _shot(tester, 'prayer_360x800_x1.0_light_last_step');
      expect(tester.takeException(), isNull);
    });

    for (final (size, b, system, nav) in const [
      (Size(360, 640), Brightness.light, 1.0, 24.0),
      (Size(360, 640), Brightness.dark, 1.3, 48.0),
      (Size(360, 800), Brightness.light, 1.0, 24.0),
      (Size(360, 800), Brightness.dark, 1.0, 48.0),
      (Size(412, 915), Brightness.light, 1.3, 24.0),
    ]) {
      testWidgets('map sheet ${size.width.toInt()}x${size.height.toInt()} '
          '${b.name} system x$system nav ${nav.toInt()}', (tester) async {
        final settings = await _settings();
        await _pump(
          tester,
          settings,
          size: size,
          index: _hailMary4,
          brightness: b,
          systemScale: system,
          bottomInset: nav,
        );
        await tester.tap(_strip);
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 600));
        final name =
            'map_${size.width.toInt()}x${size.height.toInt()}_${b.name}'
            '_sys${system}_nav${nav.toInt()}';
        await _shot(tester, '${name}_1open');
        await tester.tap(find.byKey(const ValueKey('prayer-map-decade-3')));
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 600));
        await _shot(tester, '${name}_2moved');
        expect(tester.takeException(), isNull);
      });
    }
  });
}
