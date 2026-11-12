import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/app/settings.dart';
import 'package:rosary_app/app/theme.dart';
import 'package:rosary_app/church/avatar/avatar_config.dart';
import 'package:rosary_app/church/avatar/avatar_editor_screen.dart';
import 'package:rosary_app/church/avatar/avatar_preview.dart';
import 'package:rosary_app/church/church_constants.dart';
import 'package:shared_preferences/shared_preferences.dart';

Widget _app(Widget home, {double textScale = 1.0}) => MaterialApp(
  theme: AppTheme.light(),
  builder: (context, child) => MediaQuery(
    data: MediaQuery.of(context)
        .copyWith(textScaler: TextScaler.linear(textScale)),
    child: child!,
  ),
  home: home,
);

Future<AppSettings> _settings() async {
  SharedPreferences.setMockInitialValues({});
  return AppSettings.load();
}

void main() {
  testWidgets('AvatarPreview renders every style and shows the name', (
    tester,
  ) async {
    for (var style = 0; style < 4; style++) {
      await tester.pumpWidget(
        _app(
          Scaffold(
            body: Center(
              child: AvatarPreview(
                config: AvatarConfig(style: style, name: 22),
              ),
            ),
          ),
        ),
      );
      expect(find.text('요한'), findsOneWidget);
      expect(tester.takeException(), isNull);
    }
  });

  testWidgets('pick colors, style and name then save', (tester) async {
    final settings = await _settings();
    tester.view.physicalSize = const Size(800, 3000);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    Object? result;
    await tester.pumpWidget(
      _app(
        Builder(
          builder: (context) => Scaffold(
            body: Center(
              child: FilledButton(
                onPressed: () async {
                  result = await Navigator.of(context).push<AvatarConfig>(
                    MaterialPageRoute<AvatarConfig>(
                      builder: (_) => AvatarEditorScreen(settings: settings),
                    ),
                  );
                },
                child: const Text('open'),
              ),
            ),
          ),
        ),
      ),
    );
    await tester.tap(find.text('open'));
    await tester.pumpAndSettle();

    expect(find.text('내 아바타'), findsWidgets);
    for (final t in ['피부색', '머리 모양', '머리색', '옷 색', '세례명', '무작위', '저장']) {
      expect(find.text(t), findsWidgets, reason: t);
    }
    // Swatch touch targets are at least 48dp with semantics labels.
    final swatch = find.bySemanticsLabel('머리색 8');
    expect(swatch, findsOneWidget);
    final size = tester.getSize(swatch);
    expect(size.width, greaterThanOrEqualTo(48));
    expect(size.height, greaterThanOrEqualTo(48));

    await tester.tap(find.bySemanticsLabel('머리색 8'));
    await tester.pump();
    await tester.tap(find.bySemanticsLabel('옷 색 12'));
    await tester.pump();
    await tester.tap(find.bySemanticsLabel('구릿빛 피부'));
    await tester.pump();
    await tester.tap(find.text('곱슬'));
    await tester.pump();
    // Selected swatch shows a check badge.
    expect(find.byIcon(Icons.check), findsNWidgets(3));

    await tester.tap(find.byIcon(Icons.badge_outlined));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(
      find.text('베네딕토'),
      200,
      scrollable: find.descendant(
        of: find.byType(BottomSheet),
        matching: find.byType(Scrollable),
      ),
    );
    await tester.tap(find.text('베네딕토'));
    await tester.pumpAndSettle();

    // Nothing is saved until the save button.
    expect(settings.churchAvatarChosen, isFalse);

    await tester.tap(find.text('저장'));
    await tester.pumpAndSettle();
    expect(find.text('open'), findsOneWidget);
    const expected = AvatarConfig(
      skin: 2,
      style: 3,
      hair: 7,
      outfit: 11,
      name: 39,
    );
    expect(settings.churchAvatar, expected);
    expect(settings.churchAvatarChosen, isTrue);
    expect(result, expected);
  });

  testWidgets(
    'random changes the avatar deterministically with a seeded Random',
    (tester) async {
      final settings = await _settings();
      await tester.pumpWidget(
        _app(AvatarEditorScreen(settings: settings, random: Random(1))),
      );
      final before = settings.churchAvatar;
      await tester.tap(find.text('무작위'));
      await tester.pump();
      await tester.tap(find.text('저장'));
      await tester.pumpAndSettle();
      final r = Random(1);
      final expected = AvatarConfig(
        skin: r.nextInt(4),
        style: r.nextInt(4),
        hair: r.nextInt(10),
        outfit: r.nextInt(12),
        name: r.nextInt(40),
      );
      expect(settings.churchAvatar, expected);
      expect(before, AvatarConfig.defaultConfig);
      expect(baptismalNames, hasLength(40));
    },
  );

  testWidgets('no overflow at 360x640 with text scale 1.5', (tester) async {
    final settings = await _settings();
    tester.view.physicalSize = const Size(360, 640);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(
      _app(AvatarEditorScreen(settings: settings), textScale: 1.5),
    );
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    // Scroll to the bottom; still no overflow.
    await tester.drag(find.byType(CustomScrollView), const Offset(0, -2000));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    expect(find.text('저장'), findsOneWidget);
    // Name sheet opens without overflow too.
    await tester.tap(find.byIcon(Icons.badge_outlined));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    expect(find.text('마리아'), findsWidgets);
  });
}
