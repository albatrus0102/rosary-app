// 성당 '기도하기' 시트 스크린샷 하니스(--dart-define=CHURCH_ROSARY_SHOTS=<dir>). 비어 있으면 건너뛴다.
// 밝게/어둡게/글자 2배 × (기본 | 묵주기도 기억 + 신비 고르기 펼침).
import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/app/settings.dart';
import 'package:rosary_app/app/theme.dart';
import 'package:rosary_app/church/church_prayer_choice_sheet.dart';
import 'package:shared_preferences/shared_preferences.dart';

const _dir = String.fromEnvironment('CHURCH_ROSARY_SHOTS');

Future<void> _fonts() async {
  Future<ByteData> load(String f) async =>
      ByteData.sublistView(await File('assets/fonts/$f').readAsBytes());
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
  final l = FontLoader('MaterialIcons')
    ..addFont(
      Future.value(
        ByteData.sublistView(
          await File(
            '/home/user/sdk/flutter/bin/cache/artifacts/material_fonts/MaterialIcons-Regular.otf',
          ).readAsBytes(),
        ),
      ),
    );
  await l.load();
}

Future<void> _settle(WidgetTester t, [int rounds = 4]) async {
  for (var i = 0; i < rounds; i++) {
    await t.runAsync(
      () => Future<void>.delayed(const Duration(milliseconds: 120)),
    );
    await t.pump(const Duration(milliseconds: 400));
  }
}

Future<void> _shot(WidgetTester t, String name) async {
  final boundary = t.renderObject<RenderRepaintBoundary>(
    find.byKey(const ValueKey('shot-root')),
  );
  await t.runAsync(() async {
    final image = await boundary.toImage(pixelRatio: 2);
    final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
    final f = File('$_dir/$name.png');
    await f.parent.create(recursive: true);
    await f.writeAsBytes(bytes!.buffer.asUint8List());
  });
}

void main() {
  if (_dir.isEmpty) {
    test('church rosary shots (skipped: set CHURCH_ROSARY_SHOTS)', () {});
    return;
  }
  setUpAll(_fonts);

  for (final (tag, b, scale) in const [
    ('light', Brightness.light, 1.0),
    ('dark', Brightness.dark, 1.0),
    ('light_x2', Brightness.light, 2.0),
    ('dark_x2', Brightness.dark, 2.0),
  ]) {
    for (final open in [false, true]) {
      testWidgets('sheet $tag ${open ? 'rosary+chips' : 'default'}', (t) async {
        t.view.devicePixelRatio = 2;
        t.view.physicalSize = const Size(360, 800) * 2;
        const p = FakeViewPadding(top: 48, bottom: 48);
        t.view.padding = p;
        t.view.viewPadding = p;
        addTearDown(t.view.reset);
        SharedPreferences.setMockInitialValues({
          if (open) 'churchPrayerChoice': 'rosary',
        });
        final settings = await AppSettings.load();
        await t.pumpWidget(
          RepaintBoundary(
            key: const ValueKey('shot-root'),
            child: MaterialApp(
              debugShowCheckedModeBanner: false,
              theme: b == Brightness.dark ? AppTheme.dark() : AppTheme.light(),
              locale: const Locale('ko', 'KR'),
              supportedLocales: const [Locale('ko', 'KR')],
              localizationsDelegates: const [
                GlobalMaterialLocalizations.delegate,
                GlobalWidgetsLocalizations.delegate,
                GlobalCupertinoLocalizations.delegate,
              ],
              builder: (context, c) => MediaQuery(
                data: MediaQuery.of(context)
                    .copyWith(textScaler: TextScaler.linear(scale)),
                child: c!,
              ),
              home: Scaffold(
                // 성당 장면처럼 어두운 바탕 위에서 본다.
                backgroundColor: const Color(0xFF2B2622),
                body: Builder(
                  builder: (context) => Center(
                    child: TextButton(
                      onPressed: () => showChurchPrayerChoiceSheet(
                        context,
                        settings: settings,
                      ),
                      child: const Text('open'),
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
        await t.tap(find.text('open'));
        await _settle(t);
        if (open) {
          final change = find.byKey(const ValueKey('pray-change-mystery'));
          await t.ensureVisible(change);
          await _settle(t, 1);
          await t.tap(change);
          await _settle(t, 2);
        }
        await _shot(t, 'sheet_${tag}_${open ? 'rosary_chips' : 'default'}');
      });
    }
  }
}
