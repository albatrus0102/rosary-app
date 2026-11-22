import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/app/settings.dart';
import 'package:rosary_app/ui/app_intro.dart';
import 'package:rosary_app/ui/more_screen.dart';
import 'package:rosary_app/ui/settings_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';

Future<AppSettings> _settings() async {
  SharedPreferences.setMockInitialValues({
    'appIntroDone': true,
    'churchTourDone': true,
    'prayerScreenTourDone': true,
    'beadSwipeLearned': 3,
  });
  return AppSettings.load();
}

Widget _more(
  AppSettings s, {
  VoidCallback? onChurch,
  VoidCallback? onToday,
}) => MaterialApp(
  home: MoreScreen(
    settings: s,
    onOpenStyles: () {},
    onOpenSettings: () {},
    onOpenChurch: onChurch,
    onOpenToday: onToday,
  ),
);

Future<void> _openChoices(WidgetTester tester) async {
  await tester.ensureVisible(find.byKey(const ValueKey('more-help')));
  await tester.tap(find.byKey(const ValueKey('more-help')));
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('더보기에 사용법 다시 보기가 있고 세 안내를 고르게 한다', (tester) async {
    tester.view.physicalSize = const Size(400, 1400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    final s = await _settings();
    await tester.pumpWidget(_more(s));
    expect(find.text('사용법 다시 보기'), findsOneWidget);
    // 있던 항목은 그대로
    expect(find.byKey(const ValueKey('more-styles')), findsOneWidget);
    expect(find.byKey(const ValueKey('more-settings')), findsOneWidget);
    await _openChoices(tester);
    for (final k in ['help-app', 'help-church', 'help-rosary']) {
      final r = tester.getRect(find.byKey(ValueKey(k)));
      expect(r.height, greaterThanOrEqualTo(56), reason: k);
    }
    expect(find.text('앱 소개'), findsOneWidget);
    expect(find.text('성당 안내'), findsOneWidget);
    expect(find.text('묵주기도 화면 안내'), findsOneWidget);
  });

  testWidgets('성당 안내: 마침 표시를 지우고 성당 탭으로 보낸다', (tester) async {
    tester.view.physicalSize = const Size(400, 1400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    final s = await _settings();
    var church = 0;
    var today = 0;
    await tester.pumpWidget(_more(s, onChurch: () => church++, onToday: () => today++));
    await _openChoices(tester);
    await tester.tap(find.byKey(const ValueKey('help-church')));
    await tester.pumpAndSettle();
    expect(s.churchTourDone, isFalse);
    expect(church, 1);
    expect(today, 0);
    expect(s.appIntroDone, isTrue);
    expect(s.prayerScreenTourDone, isTrue);
    expect(find.text('성당에 들어가면 안내가 시작돼요'), findsOneWidget);
  });

  testWidgets('묵주기도 화면 안내: 기도 화면 첫 안내와 내리기 안내를 다시 켠다', (tester) async {
    tester.view.physicalSize = const Size(400, 1400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    final s = await _settings();
    var today = 0;
    await tester.pumpWidget(_more(s, onToday: () => today++));
    await _openChoices(tester);
    await tester.tap(find.byKey(const ValueKey('help-rosary')));
    await tester.pumpAndSettle();
    expect(s.prayerScreenTourDone, isFalse);
    expect(s.beadSwipeHintVisible, isTrue);
    expect(today, 1);
    expect(s.churchTourDone, isTrue);
    expect(find.text('묵주기도 화면을 열면 안내가 나와요'), findsOneWidget);
  });

  testWidgets('앱 소개: 바로 소개 화면을 다시 열고, 마치면 돌아온다', (tester) async {
    tester.view.physicalSize = const Size(400, 1400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    final s = await _settings();
    await tester.pumpWidget(_more(s));
    await _openChoices(tester);
    await tester.tap(find.byKey(const ValueKey('help-app')));
    await tester.pumpAndSettle();
    expect(find.byType(AppIntroScreen), findsOneWidget);
    expect(s.appIntroDone, isFalse);
    await tester.tap(find.byKey(const ValueKey('intro-skip')));
    await tester.pumpAndSettle();
    expect(find.byType(AppIntroScreen), findsNothing);
    expect(find.text('사용법 다시 보기'), findsOneWidget);
    expect(s.appIntroDone, isTrue);
  });

  testWidgets('설정에 글자 크기 (앱 전체)가 있고 고르면 바로 저장된다', (tester) async {
    tester.view.physicalSize = const Size(400, 3200);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    final s = await _settings();
    await tester.pumpWidget(MaterialApp(home: SettingsScreen(settings: s)));
    await tester.pump();
    expect(find.text('글자 크기 (앱 전체)'), findsOneWidget);
    final seg = find.byKey(const ValueKey('settings-app-text-scale'));
    expect(tester.getSize(seg).height, greaterThanOrEqualTo(48));
    await tester.tap(find.descendant(of: seg, matching: find.text('아주 크게')));
    await tester.pump();
    expect(s.appTextScale, 1.4);
    await tester.tap(find.descendant(of: seg, matching: find.text('보통')));
    await tester.pump();
    expect(s.appTextScale, 1.0);
  });
}
