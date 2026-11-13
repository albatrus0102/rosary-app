// ignore_for_file: depend_on_referenced_packages
import 'package:fake_async/fake_async.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/analytics/analytics.dart';
import 'package:rosary_app/analytics/analytics_observer.dart';

import 'analytics_test_helpers.dart';

Route<void> page(String? name) => MaterialPageRoute<void>(
  settings: RouteSettings(name: name),
  builder: (_) => const SizedBox(),
);

void main() {
  setUp(Analytics.debugReset);
  tearDown(Analytics.debugReset);

  List<String> screens(Analytics a) => [
    for (final e in a.queuedForTest)
      if (e['name'] == 'screen_view') (e['props'] as Map)['screen'] as String,
  ];

  test('screen ids are derived from route names', () {
    expect(AnalyticsObserver.screenIdFor(page('/')), 'home');
    expect(AnalyticsObserver.screenIdFor(page('/Settings')), 'settings');
    expect(
      AnalyticsObserver.screenIdFor(page('rosary_styles')),
      'rosary_styles',
    );
    expect(
      AnalyticsObserver.screenIdFor(page('/church/select')),
      'church_select',
    );
    expect(AnalyticsObserver.screenIdFor(page(null)), isNull);
    expect(AnalyticsObserver.screenIdFor(page('  ')), isNull);
    expect(AnalyticsObserver.screenIdFor(page('/!!')), isNull);
    expect(AnalyticsObserver.screenIdFor(null), isNull);
    expect(AnalyticsObserver.screenIdFor(page('/${'a' * 60}'))!.length, 40);
  });

  test('the root route takes the shell\'s current tab id', () {
    expect(
      AnalyticsObserver.screenIdFor(page('/'), root: 'glass_gallery'),
      'glass_gallery',
    );
    expect(AnalyticsObserver.screenIdFor(page('/'), root: 'more'), 'more');
    expect(
      AnalyticsObserver.screenIdFor(page('settings'), root: 'more'),
      'settings',
    );
    fakeAsync((fa) {
      var tab = 'glass_gallery';
      var t = DateTime.utc(2026, 11, 12);
      final a = initIn(fa, uploader: FakeEventUploader());
      final o = AnalyticsObserver(
        analytics: a,
        now: () => t,
        rootScreen: () => tab,
      );
      final home = page('/');
      final settings = page('settings');
      o.didPush(home, null);
      t = t.add(const Duration(seconds: 5));
      tab = 'more';
      o.didPush(settings, home);
      t = t.add(const Duration(seconds: 5));
      o.didPop(settings, home);
      expect(screens(a), ['glass_gallery', 'settings', 'more']);
    });
  });

  test('a null root id (church view records itself) is not recorded', () {
    expect(AnalyticsObserver.screenIdFor(page('/'), root: null), isNull);
    fakeAsync((fa) {
      String? tab;
      var t = DateTime.utc(2026, 11, 12);
      final a = initIn(fa, uploader: FakeEventUploader());
      final o = AnalyticsObserver(
        analytics: a,
        now: () => t,
        rootScreen: () => tab,
      );
      final home = page('/');
      final settings = page('settings');
      o.didPush(home, null);
      t = t.add(const Duration(seconds: 5));
      o.didPush(settings, home);
      t = t.add(const Duration(seconds: 5));
      o.didPop(settings, home);
      expect(screens(a), ['settings']);
    });
  });

  test('closing a dialog does not record the screen underneath again', () {
    fakeAsync((fa) {
      var t = DateTime.utc(2026, 11, 12);
      final a = initIn(fa, uploader: FakeEventUploader());
      final o = AnalyticsObserver(analytics: a, now: () => t);
      final home = page('/');
      final prayer = page('prayer');
      final dialog = RawDialogRoute<void>(
        pageBuilder: (_, _, _) => const SizedBox(),
      );
      o.didPush(home, null);
      t = t.add(const Duration(seconds: 5));
      o.didPush(prayer, home);
      t = t.add(const Duration(seconds: 5));
      o.didPush(dialog, prayer);
      t = t.add(const Duration(seconds: 5));
      o.didPop(dialog, prayer);
      expect(screens(a), ['home', 'prayer']);
    });
  });

  test('push/pop sequence yields one screen_view per visible change', () {
    fakeAsync((fa) {
      var t = DateTime.utc(2026, 11, 12);
      final a = initIn(fa, uploader: FakeEventUploader());
      final o = AnalyticsObserver(analytics: a, now: () => t);
      final home = page('/');
      final settings = page('/settings');
      final styles = page('rosary_styles');

      o.didPush(home, null);
      t = t.add(const Duration(seconds: 5));
      o.didPush(settings, home);
      t = t.add(const Duration(seconds: 5));
      o.didPush(styles, settings);
      t = t.add(const Duration(seconds: 5));
      o.didPop(styles, settings);
      t = t.add(const Duration(seconds: 5));
      o.didPop(settings, home);
      expect(screens(a), [
        'home',
        'settings',
        'rosary_styles',
        'settings',
        'home',
      ]);
    });
  });

  test('unnamed routes, dialogs and null routes are ignored', () {
    fakeAsync((fa) {
      final a = initIn(fa, uploader: FakeEventUploader());
      final o = AnalyticsObserver(analytics: a);
      o.didPush(page(null), null);
      o.didPop(page(null), null);
      o.didPush(
        RawDialogRoute<void>(
          settings: const RouteSettings(name: 'dialog'),
          pageBuilder: (_, _, _) => const SizedBox(),
        ),
        null,
      );
      o.didReplace(newRoute: null, oldRoute: page('x'));
      expect(a.pendingCount, 0);
    });
  });

  test('duplicates within the debounce window are collapsed', () {
    fakeAsync((fa) {
      var t = DateTime.utc(2026, 11, 12);
      final a = initIn(fa, uploader: FakeEventUploader());
      final o = AnalyticsObserver(analytics: a, now: () => t);
      o.didPush(page('/settings'), null);
      o.didReplace(newRoute: page('/settings'), oldRoute: page('/settings'));
      t = t.add(const Duration(milliseconds: 900));
      o.didPush(page('/settings'), null);
      expect(screens(a), ['settings']);
      t = t.add(const Duration(seconds: 2));
      o.didPush(page('/settings'), null);
      expect(screens(a), ['settings', 'settings']);
    });
  });

  testWidgets('works inside a MaterialApp navigator', (tester) async {
    final a = (await tester.runAsync(
      () => Analytics.init(
        uploader: FakeEventUploader(),
        consent: (_) => true,
        userId: 'u',
        appVersion: '1',
        store: MemoryQueueStore(),
        observeLifecycle: false,
        trackAppOpen: false,
      ),
    ))!;
    final key = GlobalKey<NavigatorState>();
    await tester.pumpWidget(
      MaterialApp(
        navigatorKey: key,
        navigatorObservers: [AnalyticsObserver(analytics: a)],
        initialRoute: '/',
        onGenerateRoute: (s) => MaterialPageRoute<void>(
          settings: s,
          builder: (_) => Scaffold(body: Text(s.name ?? '')),
        ),
      ),
    );
    key.currentState!.pushNamed('/settings');
    await tester.pumpAndSettle();
    key.currentState!.pop();
    await tester.pumpAndSettle();
    expect(screens(a), ['home', 'settings', 'home']);
    Analytics.debugReset(); // 30초 타이머 정리
  });
}
