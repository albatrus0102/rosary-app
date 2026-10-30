import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/app/rosary_style.dart';
import 'package:rosary_app/app/settings.dart';
import 'package:rosary_app/domain/prayer_data.dart';
import 'package:rosary_app/ui/home_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  testWidgets('HomeScreen shows start button and 4 mystery sets', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues({});
    final settings = await AppSettings.load();

    await tester.pumpWidget(MaterialApp(home: HomeScreen(settings: settings)));
    await tester.pump();

    expect(find.text('기도 시작'), findsOneWidget);
    for (final set in MysterySet.values) {
      expect(find.text(set.koreanName), findsOneWidget);
    }
    expect(find.text('구슬 묵주'), findsOneWidget);
    for (final style in RosaryStyle.values) {
      final finder = find.text(style.label);
      await tester.ensureVisible(finder);
      await tester.pump();
      expect(finder, findsOneWidget);
    }
    expect(find.text('혼자'), findsOneWidget);
  });
}
