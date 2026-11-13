// ignore_for_file: depend_on_referenced_packages
import 'package:fake_async/fake_async.dart';

import 'dart:io';

import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/analytics/analytics.dart';

import 'analytics_test_helpers.dart';

final _uuid = RegExp(
  r'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
);

void main() {
  setUp(Analytics.debugReset);
  tearDown(Analytics.debugReset);

  group('consent gating', () {
    test('each category is dropped unless its own consent is on', () {
      fakeAsync((fa) {
        final up = FakeEventUploader();
        final on = <String>{};
        final a = initIn(fa, uploader: up, consent: on.contains);
        void fire() {
          a.track('stats_open', {'range': 'week'});
          a.track('church_enter', {'church': 'basic', 'online': true});
          a.track('error', {'where': 'flutter', 'message': 'x', 'stack': 'y'});
        }

        fire();
        expect(a.pendingCount, 0);

        on.add('usage');
        fire();
        expect(a.queuedForTest.map((e) => e['name']), ['stats_open']);

        on.add('church');
        fire();
        expect(a.pendingCount, 1 + 2);

        on.add('diagnostics');
        fire();
        expect(a.pendingCount, 1 + 2 + 3);
        expect(a.queuedForTest.map((e) => e['category']).toSet(), {
          'usage',
          'church',
          'diagnostics',
        });

        // sync 동의는 이벤트와 무관하다.
        on
          ..clear()
          ..add('sync');
        fire();
        expect(a.pendingCount, 6);
      });
    });

    test('consent is checked at call time and exceptions mean off', () {
      fakeAsync((fa) {
        final up = FakeEventUploader();
        var allowed = true;
        final a = initIn(fa, uploader: up, consent: (_) => allowed);
        a.track('stats_open', {'range': 'week'});
        allowed = false;
        a.track('stats_open', {'range': 'week'});
        expect(a.pendingCount, 1);
        final b = initIn(
          fa,
          uploader: up,
          consent: (_) => throw StateError('boom'),
        );
        b.track('stats_open', {'range': 'week'});
        expect(b.pendingCount, 0);
      });
    });

    test('events at flush time are re-checked (revoked without purge)', () {
      fakeAsync((fa) {
        final up = FakeEventUploader();
        var usage = true;
        final a = initIn(
          fa,
          uploader: up,
          consent: (k) => k == 'usage' ? usage : true,
        );
        a.track('stats_open', {'range': 'week'});
        a.track('church_pick', {'church': 'basic'});
        usage = false;
        a.flush();
        fa.flushMicrotasks();
        expect(up.events.map((e) => e['name']), ['church_pick']);
        expect(a.pendingCount, 0);
      });
    });
  });

  group('event rows', () {
    test('row shape, session id and ISO timestamp', () {
      fakeAsync((fa) {
        final up = FakeEventUploader();
        final t = DateTime.utc(2026, 11, 12, 9, 30);
        final a = initIn(fa, uploader: up, now: () => t);
        a.screen('home');
        a.track('prayer_finish', {
          'set': 'joyful',
          'completed': true,
          'decades': 5,
          'seconds': 1200,
        });
        a.flush();
        fa.flushMicrotasks();
        expect(up.events, hasLength(2));
        final row = up.events.first;
        expect(row['session_id'], matches(_uuid));
        expect(row['session_id'], a.sessionId);
        expect(up.events.last['session_id'], a.sessionId);
        expect(row['at'], '2026-11-12T09:30:00.000Z');
        expect(row['category'], 'usage');
        expect(row['name'], 'screen_view');
        expect(row['props'], {'screen': 'home'});
        expect(row['app_version'], '1.0.0+1');
        expect(row['platform'], 'android');
        expect(row.containsKey('user_id'), isFalse);
      });
    });

    test(
      'app_open is sent once at init, and after login if started signed out',
      () {
        fakeAsync((fa) {
          final up = FakeEventUploader();
          final a = initIn(fa, uploader: up, trackAppOpen: true);
          expect(a.queuedForTest.map((e) => e['name']), ['app_open']);
          final b = initIn(fa, uploader: up, userId: null, trackAppOpen: true);
          expect(b.pendingCount, 0);
          b.setUserId('u2');
          b.setUserId('u2');
          expect(b.queuedForTest.map((e) => e['name']), ['app_open']);
        });
      },
    );

    test('nothing is recorded while signed out', () {
      fakeAsync((fa) {
        final a = initIn(fa, uploader: FakeEventUploader(), userId: null);
        a.screen('home');
        expect(a.pendingCount, 0);
      });
    });

    test('uninitialized instance is a harmless no-op', () async {
      await Analytics.instance.dispose();
      Analytics.instance.track('app_open');
      Analytics.instance.screen('home');
      Analytics.instance.purgeCategory('usage');
      await Analytics.instance.flush();
      expect(Analytics.instance.pendingCount, 0);
    });
  });

  group('flush rules', () {
    test('uploads when 20 events are queued', () {
      fakeAsync((fa) {
        final up = FakeEventUploader();
        final a = initIn(fa, uploader: up);
        for (var i = 0; i < 19; i++) {
          a.track('stats_open', {'range': 'week'});
        }
        fa.flushMicrotasks();
        expect(up.uploadEventsCalls, 0);
        a.track('stats_open', {'range': 'week'});
        fa.flushMicrotasks();
        expect(up.events, hasLength(20));
        expect(a.pendingCount, 0);
      });
    });

    test('uploads 30 s after the first queued event', () {
      fakeAsync((fa) {
        final up = FakeEventUploader();
        final a = initIn(fa, uploader: up);
        a.track('stats_open', {'range': 'week'});
        fa.elapse(const Duration(seconds: 29));
        expect(up.uploadEventsCalls, 0);
        fa.elapse(const Duration(seconds: 1));
        expect(up.events, hasLength(1));
        expect(a.pendingCount, 0);
        // 큐가 비면 타이머도 없다.
        fa.elapse(const Duration(minutes: 5));
        expect(up.uploadEventsCalls, 1);
      });
    });

    test('flushes when the app goes to the background', () {
      fakeAsync((fa) {
        final up = FakeEventUploader();
        final a = initIn(fa, uploader: up);
        a.track('stats_open', {'range': 'week'});
        a.didChangeAppLifecycleState(AppLifecycleState.resumed);
        fa.flushMicrotasks();
        expect(up.uploadEventsCalls, 0);
        a.didChangeAppLifecycleState(AppLifecycleState.paused);
        fa.flushMicrotasks();
        expect(up.events, hasLength(1));
      });
    });

    test('large queues are uploaded in chunks of at most 100', () {
      fakeAsync((fa) {
        final up = FakeEventUploader()..failing = true;
        final a = initIn(fa, uploader: up, batchSize: 1000);
        for (var i = 0; i < 250; i++) {
          a.track('stats_open', {'range': 'week'});
        }
        up.failing = false;
        a.flush();
        fa.flushMicrotasks();
        expect(up.eventBatchSizes, [100, 100, 50]);
      });
    });
  });

  group('failure handling', () {
    test('exponential backoff 5s..5min and no data loss', () {
      fakeAsync((fa) {
        final up = FakeEventUploader()..failing = true;
        final a = initIn(fa, uploader: up);
        a.track('stats_open', {'range': 'week'});
        a.track('stats_open', {'range': 'month'});

        // 첫 시도: 30초 뒤.
        fa.elapse(const Duration(seconds: 30));
        expect(up.uploadEventsCalls, 1);
        final waits = <int>[];
        var calls = up.uploadEventsCalls;
        // 재시도 간격을 1초 단위로 관찰한다.
        var sinceLast = 0;
        for (var s = 0; s < 3000 && waits.length < 8; s++) {
          fa.elapse(const Duration(seconds: 1));
          sinceLast++;
          if (up.uploadEventsCalls != calls) {
            waits.add(sinceLast);
            sinceLast = 0;
            calls = up.uploadEventsCalls;
          }
        }
        expect(waits, [5, 10, 20, 40, 80, 160, 300, 300]);
        expect(a.pendingCount, 2);
        expect(up.events, isEmpty);

        up.failing = false;
        fa.elapse(const Duration(minutes: 5));
        expect(up.events.map((e) => e['props']), [
          {'range': 'week'},
          {'range': 'month'},
        ]);
        expect(a.pendingCount, 0);
        expect(a.failureCount, 0);
        expect(a.currentBackoff, Duration.zero);
      });
    });

    test('events tracked during backoff are kept and sent in order', () {
      fakeAsync((fa) {
        final up = FakeEventUploader()..failNext = 2;
        final a = initIn(fa, uploader: up, batchSize: 3);
        for (var i = 0; i < 3; i++) {
          a.track('stats_open', {'range': 'r$i'});
        }
        fa.flushMicrotasks();
        expect(a.failureCount, 1);
        // 백오프 중에는 20개(여기선 3개) 기준으로 즉시 올리지 않는다.
        for (var i = 3; i < 6; i++) {
          a.track('stats_open', {'range': 'r$i'});
        }
        fa.flushMicrotasks();
        expect(up.uploadEventsCalls, 1);
        fa.elapse(const Duration(seconds: 5)); // 두 번째 실패
        expect(a.failureCount, 2);
        fa.elapse(const Duration(seconds: 10)); // 성공
        expect(up.events.map((e) => (e['props'] as Map)['range']), [
          'r0',
          'r1',
          'r2',
          'r3',
          'r4',
          'r5',
        ]);
      });
    });

    test('queue is capped at 500, oldest dropped', () {
      fakeAsync((fa) {
        final up = FakeEventUploader()..failing = true;
        final a = initIn(fa, uploader: up, batchSize: 100000);
        for (var i = 0; i < 620; i++) {
          a.track('stats_open', {'range': 'r$i'});
        }
        expect(a.pendingCount, 500);
        final q = a.queuedForTest;
        expect((q.first['props'] as Map)['range'], 'r120');
        expect((q.last['props'] as Map)['range'], 'r619');
      });
    });
  });

  group('persistence and privacy', () {
    test(
      'queue survives re-init for the same user, keeps original session',
      () {
        fakeAsync((fa) {
          final store = MemoryQueueStore();
          final up = FakeEventUploader()..failing = true;
          final a = initIn(fa, uploader: up, store: store, sessionId: 'S1');
          a.track('stats_open', {'range': 'week'});
          a.track('church_pick', {'church': 'basic'});
          fa.flushMicrotasks();
          a.dispose();
          fa.flushMicrotasks();
          expect(store.data, isNotNull);

          final up2 = FakeEventUploader();
          final b = initIn(fa, uploader: up2, store: store, sessionId: 'S2');
          expect(b.pendingCount, 2);
          b.flush();
          fa.flushMicrotasks();
          expect(up2.events.map((e) => e['name']), [
            'stats_open',
            'church_pick',
          ]);
          expect(up2.events.map((e) => e['session_id']).toSet(), {'S1'});
          expect(b.pendingCount, 0);
          fa.flushMicrotasks();
          b.track('stats_open', {'range': 'week'});
          expect(b.queuedForTest.single['session_id'], 'S2');
        });
      },
    );

    test('a queue saved for another user is discarded at init', () {
      fakeAsync((fa) {
        final store = MemoryQueueStore();
        final a = initIn(
          fa,
          uploader: FakeEventUploader()..failing = true,
          store: store,
          userId: 'alice',
        );
        a.track('stats_open', {'range': 'week'});
        fa.flushMicrotasks();
        a.dispose();
        fa.flushMicrotasks();
        final b = initIn(
          fa,
          uploader: FakeEventUploader(),
          store: store,
          userId: 'bob',
        );
        expect(b.pendingCount, 0);
        final c = initIn(
          fa,
          uploader: FakeEventUploader(),
          store: store,
          userId: null,
        );
        expect(c.pendingCount, 0);
      });
    });

    test('corrupt queue file is ignored', () {
      fakeAsync((fa) {
        final a = initIn(
          fa,
          uploader: FakeEventUploader(),
          store: MemoryQueueStore('{not json'),
        );
        expect(a.pendingCount, 0);
      });
    });

    test('setUserId(null) clears pending events, also on disk', () {
      fakeAsync((fa) {
        final store = MemoryQueueStore();
        final up = FakeEventUploader()..failing = true;
        final a = initIn(fa, uploader: up, store: store);
        a.track('stats_open', {'range': 'week'});
        a.setUserId(null);
        expect(a.pendingCount, 0);
        a.track('stats_open', {'range': 'week'});
        expect(a.pendingCount, 0);
        fa.flushMicrotasks();
        up.failing = false;
        fa.elapse(const Duration(minutes: 10));
        expect(up.events, isEmpty);
        expect(store.data, contains('"events":[]'));
        // 다른 사용자가 로그인하면 새로 기록한다.
        a.setUserId('u2');
        a.track('stats_open', {'range': 'week'});
        expect(a.pendingCount, 1);
      });
    });

    test('purgeCategory drops only that category from the queue', () {
      fakeAsync((fa) {
        final up = FakeEventUploader()..failing = true;
        final a = initIn(fa, uploader: up, batchSize: 1000);
        a.track('stats_open', {'range': 'week'});
        a.track('church_pick', {'church': 'basic'});
        a.track('church_sit', {'church': 'basic'});
        a.track('error', {'where': 'flutter', 'message': 'm', 'stack': 's'});
        a.purgeCategory('church');
        expect(a.queuedForTest.map((e) => e['name']), ['stats_open', 'error']);
        a.purgeCategory('sync'); // 이벤트 범주가 아님: 아무 일 없음
        expect(a.pendingCount, 2);
        a.purgeCategory('usage');
        a.purgeCategory('diagnostics');
        expect(a.pendingCount, 0);
      });
    });
  });

  test('debug logs print event names only', () {
    final logs = <String>[];
    final orig = debugPrint;
    debugPrint = (String? m, {int? wrapWidth}) => logs.add(m ?? '');
    addTearDown(() => debugPrint = orig);
    fakeAsync((fa) {
      final a = initIn(fa, uploader: FakeEventUploader(), userId: 'secret-uid');
      a.track('stats_open', {'range': 'bob@example.com'});
      a.track('church_pick', {'church': 'basic'});
    });
    expect(logs, ['analytics: stats_open', 'analytics: church_pick']);
  });

  group('event allow-list', () {
    // SPEC §4 그대로.
    const specNames = {
      'usage': [
        'app_open',
        'screen_view',
        'login_success',
        'consent_change',
        'prayer_start',
        'decade_complete',
        'prayer_finish',
        'rosary_style_change',
        'mode_change',
        'leader_voice_change',
        'text_scale_change',
        'setting_change',
        'stats_open',
        'onboarding_step',
        'guest_link',
        'prayed_today',
        'reminder_change',
        'reminder_open',
        'novena_start',
        'novena_day',
        'widget_tap',
        'stations_open',
        'stations_next',
        'stations_complete',
        'glass_open',
        'glass_view_end',
        'glass_filter',
        'glass_info',
        'glass_fav',
        'glass_capture',
        'glass_pray',
        'glass_download',
      ],
      'church': [
        'church_pick',
        'church_enter',
        'church_exit',
        'church_sit',
        'church_candle',
        'avatar_save',
        'church_gesture',
        'church_mode',
        'church_report',
        'presence_sheet_open',
        'presence_toggle',
      ],
      'diagnostics': ['error', 'perf', 'glass_load', 'glass_mem'],
    };

    test('every SPEC §4 name is accepted with the right category', () {
      fakeAsync((fa) {
        final a = initIn(fa, uploader: FakeEventUploader(), batchSize: 1000);
        var n = 0;
        specNames.forEach((category, names) {
          for (final name in names) {
            a.track(name);
            n++;
            expect(AnalyticsEvents.categoryOf(name), category, reason: name);
          }
        });
        expect(a.pendingCount, n);
        expect(AnalyticsEvents.specs.keys.toSet(), {
          for (final l in specNames.values) ...l,
        });
      });
    });

    test('unknown name asserts in debug mode', () {
      fakeAsync((fa) {
        final a = initIn(fa, uploader: FakeEventUploader());
        expect(() => a.track('made_up_event'), throwsA(isA<AssertionError>()));
        expect(a.pendingCount, 0);
      });
    });

    test('unknown name is ignored when not throwing (release behaviour)', () {
      fakeAsync((fa) {
        final a = initIn(
          fa,
          uploader: FakeEventUploader(),
          throwOnUnknownEvent: false,
        );
        a.track('made_up_event', {'range': 'week'});
        expect(a.pendingCount, 0);
      });
    });
  });

  group('FileQueueStore', () {
    test('round trips through a file and tolerates a missing one', () async {
      final dir = await Directory.systemTemp.createTemp('analytics_q');
      addTearDown(() => dir.delete(recursive: true));
      final store = FileQueueStore(directory: () async => dir);
      expect(await store.read(), isNull);
      await store.write('{"a":1}');
      expect(await store.read(), '{"a":1}');
      await store.write('{"a":2}');
      expect(await store.read(), '{"a":2}');
      await store.delete();
      expect(await store.read(), isNull);
    });
  });
}
