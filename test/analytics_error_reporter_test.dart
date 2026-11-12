// ignore_for_file: depend_on_referenced_packages
import 'package:fake_async/fake_async.dart';

import 'dart:ui';

import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/analytics/analytics.dart';
import 'package:rosary_app/analytics/error_reporter.dart';

import 'analytics_test_helpers.dart';

void main() {
  late FlutterExceptionHandler? origFlutter;
  late ErrorCallback? origPlatform;
  setUp(() {
    Analytics.debugReset();
    origFlutter = FlutterError.onError;
    origPlatform = PlatformDispatcher.instance.onError;
  });
  tearDown(() {
    FlutterError.onError = origFlutter;
    PlatformDispatcher.instance.onError = origPlatform;
    Analytics.debugReset();
  });

  List<Map<String, dynamic>> errors(Analytics a) => [
    for (final e in a.queuedForTest)
      if (e['name'] == 'error') e,
  ];

  test('chains onError handlers instead of replacing them', () {
    fakeAsync((fa) {
      final a = initIn(fa, uploader: FakeEventUploader());
      final seenFlutter = <String>[];
      final seenPlatform = <String>[];
      FlutterError.onError = (d) => seenFlutter.add(d.exceptionAsString());
      PlatformDispatcher.instance.onError = (e, s) {
        seenPlatform.add('$e');
        return true;
      };
      final r = ErrorReporter.install(analytics: a, consent: (_) => true);

      FlutterError.onError!(FlutterErrorDetails(exception: StateError('f1')));
      final handled = PlatformDispatcher.instance.onError!(
        ArgumentError('p1'),
        StackTrace.current,
      );
      expect(seenFlutter, hasLength(1));
      expect(seenPlatform, ['Invalid argument(s): p1']);
      expect(handled, isTrue);
      final es = errors(a);
      expect(es, hasLength(2));
      expect((es[0]['props'] as Map)['where'], 'flutter');
      expect((es[1]['props'] as Map)['where'], 'platform');

      r.uninstall();
      expect(PlatformDispatcher.instance.onError, isNot(same(r)));
    });
  });

  test('platform handler without a previous one reports "not handled"', () {
    fakeAsync((fa) {
      final a = initIn(fa, uploader: FakeEventUploader());
      PlatformDispatcher.instance.onError = null;
      ErrorReporter.install(analytics: a, consent: (_) => true);
      expect(
        PlatformDispatcher.instance.onError!(StateError('x'), StackTrace.empty),
        isFalse,
      );
    });
  });

  test('silent when diagnostics consent is off, but still chains', () {
    fakeAsync((fa) {
      final a = initIn(fa, uploader: FakeEventUploader());
      var called = 0;
      FlutterError.onError = (_) => called++;
      var on = false;
      ErrorReporter.install(
        analytics: a,
        consent: (k) => on && k == 'diagnostics',
      );
      FlutterError.onError!(FlutterErrorDetails(exception: StateError('a')));
      expect(called, 1);
      expect(errors(a), isEmpty);
      on = true;
      FlutterError.onError!(FlutterErrorDetails(exception: StateError('b')));
      expect(errors(a), hasLength(1));
    });
  });

  test('rate limit: max 5 per minute, window slides', () {
    fakeAsync((fa) {
      var t = DateTime.utc(2026, 11, 12);
      final a = initIn(fa, uploader: FakeEventUploader());
      final r = ErrorReporter.install(
        analytics: a,
        consent: (_) => true,
        now: () => t,
      );
      for (var i = 0; i < 9; i++) {
        r.report('flutter', 'distinct failure letters ${'x' * i}', null);
      }
      expect(errors(a), hasLength(5));
      t = t.add(const Duration(seconds: 61));
      r.report('flutter', 'later problem', null);
      expect(errors(a), hasLength(6));
    });
  });

  test('identical messages are deduplicated within a minute', () {
    fakeAsync((fa) {
      var t = DateTime.utc(2026, 11, 12);
      final a = initIn(fa, uploader: FakeEventUploader());
      final r = ErrorReporter.install(
        analytics: a,
        consent: (_) => true,
        now: () => t,
      );
      r.report('flutter', 'same', null);
      r.report('flutter', 'same', null);
      expect(errors(a), hasLength(1));
      // 숫자만 다르고 긴 숫자열이 가려져 같아지는 문구도 같은 것으로 본다.
      r.report('flutter', 'id 1234567 failed', null);
      r.report('flutter', 'id 7654321 failed', null);
      expect(errors(a), hasLength(2));
      t = t.add(const Duration(seconds: 61));
      r.report('flutter', 'same', null);
      expect(errors(a), hasLength(3));
    });
  });

  test('redacts paths, long digits and truncates message/stack', () {
    fakeAsync((fa) {
      final a = initIn(fa, uploader: FakeEventUploader());
      final r = ErrorReporter.install(analytics: a, consent: (_) => true);
      final stack = StackTrace.fromString(
        '#0 foo (file:///home/kim/proj/lib/a.dart:1:2)\n'
        '#1 bar (package:rosary_app/b.dart:3:4)\n'
        '${'#2 filler (package:rosary_app/c.dart:5:6)\n' * 60}',
      );
      r.report(
        'flutter',
        'cannot read /data/user/0/kr.rosary/files/x.json for 01012345678 '
            '${'z' * 400}',
        stack,
      );
      final props = errors(a).single['props'] as Map;
      final msg = props['message'] as String;
      final st = props['stack'] as String;
      expect(msg.length, lessThanOrEqualTo(200));
      expect(msg, contains('<path>/x.json'));
      expect(msg, isNot(contains('/data/user')));
      expect(msg, isNot(contains('01012345678')));
      expect(st.length, lessThanOrEqualTo(1000));
      expect(st, isNot(contains('/home/kim')));
      expect(st, contains('package:rosary_app/b.dart'));
    });
  });

  test('never throws, even for hostile objects', () {
    fakeAsync((fa) {
      FlutterError.onError = (_) {}; // 기본 핸들러가 toString을 부르지 않게
      final a = initIn(fa, uploader: FakeEventUploader());
      final r = ErrorReporter.install(
        analytics: a,
        consent: (_) => throw StateError('consent broke'),
      );
      expect(() => r.report('x', _Bad(), null), returnsNormally);
      final r2 = ErrorReporter.install(analytics: a, consent: (_) => true);
      expect(() => r2.report('x', _Bad(), null), returnsNormally);
      expect(
        () => FlutterError.onError!(FlutterErrorDetails(exception: _Bad())),
        returnsNormally,
      );
    });
  });
}

class _Bad {
  @override
  String toString() => throw StateError('toString broke');
}
