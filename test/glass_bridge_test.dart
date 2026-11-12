import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/church/church_scene_controller.dart';

String _j(Map<String, Object?> m) => jsonEncode(m);

void main() {
  group('view events parse (JSON from the FlutterChurch channel)', () {
    test('viewReady', () {
      final e = SceneEvent.parse(
        _j({
          'e': 'viewReady',
          'win': 'rose_chartres_north',
          'tier': 't2',
          'ms': 640,
        }),
      );
      expect(e, isA<ViewReady>());
      e as ViewReady;
      expect((e.win, e.tier, e.ms), ('rose_chartres_north', 't2', 640));
      // 빠진 값은 기본값.
      final d =
          SceneEvent.parse(_j({'e': 'viewReady', 'win': 'x'})) as ViewReady;
      expect((d.tier, d.ms), ('t1', 0));
      expect(SceneEvent.parse(_j({'e': 'viewReady'})), isNull);
    });

    test('viewEnd accepts camelCase and snake_case zoom', () {
      final e = SceneEvent.parse(
        _j({
          'e': 'viewEnd',
          'win': 'x',
          'seconds': 12.5,
          'zoomMax': 4,
          'panned': true,
        }),
      ) as ViewEnd;
      expect((e.seconds, e.zoomMax, e.panned), (12.5, 4.0, true));
      final s = SceneEvent.parse(
        _j({
          'e': 'viewEnd',
          'win': 'x',
          'seconds': 3,
          'zoom_max': 2,
          'panned': 0,
        }),
      ) as ViewEnd;
      expect((s.zoomMax, s.panned), (2.0, false));
    });

    test('viewError reasons, unknown falls back to unknown', () {
      for (final r in ['texture', 'webgl', 'memory', 'unknown']) {
        final e = SceneEvent.parse(
          _j({'e': 'viewError', 'win': 'x', 'reason': r}),
        ) as ViewError;
        expect(e.reason.name, r);
      }
      final e = SceneEvent.parse(
        _j({'e': 'viewError', 'win': 'x', 'reason': 'boom'}),
      ) as ViewError;
      expect(e.reason, ViewErrorReason.unknown);
      expect(ViewErrorReason.webgl.needsFlatFallback, isTrue);
      expect(ViewErrorReason.memory.needsFlatFallback, isTrue);
      expect(ViewErrorReason.texture.needsFlatFallback, isFalse);
      expect(ViewErrorReason.unknown.needsFlatFallback, isFalse);
    });

    test('viewPerf and viewGesture', () {
      final p = SceneEvent.parse(
        _j({'e': 'viewPerf', 'win': 'x', 'fps': 58.5, 'texMb': 96}),
      ) as ViewPerf;
      expect((p.fps, p.texMb), (58.5, 96.0));
      expect(SceneEvent.parse(_j({'e': 'viewPerf', 'win': 'x'})), isNull);
      for (final k in ['zoom', 'pan', 'reset']) {
        final g = SceneEvent.parse(
          _j({'e': 'viewGesture', 'kind': k}),
        ) as ViewGesture;
        expect(g.kind.name, k);
      }
      expect(
        SceneEvent.parse(_j({'e': 'viewGesture', 'kind': 'swipe'})),
        isNull,
      );
    });

    test('existing events still parse', () {
      expect(SceneEvent.parse(_j({'e': 'ready'})), isA<SceneReady>());
      expect(SceneEvent.parse('not json'), isNull);
    });
  });

  group('view API (Flutter → web)', () {
    test('calls are queued until init, then sent in order', () async {
      final c = FakeChurchSceneController();
      await c.viewWindow(win: 'rose_chartres_north', light: 'sun', hour: 14.5);
      await c.setViewLight(light: 'night');
      await c.setViewTier('t2');
      expect(c.calls, isEmpty);
      await c.init(
        avatar: const {},
        hour: 12,
        ambient: false,
        solo: true,
        quality: 'high',
        church: 'glass_room',
      );
      expect(
        [for (final x in c.calls) x.$1],
        ['init', 'viewWindow', 'setViewLight', 'setViewTier'],
      );
      expect(c.lastView, {
        'win': 'rose_chartres_north',
        'mode': 'room',
        'tier': 't1',
        'light': 'sun',
        'hour': 14.5,
      });
      expect(c.lastArgs('setViewLight'), {'light': 'night'});
      expect(c.lastArgs('setViewTier'), {'tier': 't2'});
      await c.resetView();
      await c.endView();
      expect(c.count('resetView'), 1);
      expect(c.count('endView'), 1);
      c.dispose();
    });

    test('resetView and endView before init are dropped', () async {
      final c = FakeChurchSceneController();
      await c.resetView();
      await c.endView();
      await c.init(
        avatar: const {},
        hour: 12,
        ambient: false,
        solo: true,
        quality: 'high',
      );
      expect(c.calls.map((x) => x.$1), ['init']);
      c.dispose();
    });

    test('script string targets window.ChurchAPI.viewWindow', () {
      final s = churchApiScript('viewWindow', {
        'win': 'x',
        'mode': 'room',
        'tier': 't1',
        'light': 'ref',
      });
      expect(s, contains('window.ChurchAPI.viewWindow('));
      expect(s, contains('"win":"x"'));
    });

    test('fake can emit view events and reply to endView', () async {
      final c = FakeChurchSceneController();
      final got = <SceneEvent>[];
      c.events.listen(got.add);
      await c.init(
        avatar: const {},
        hour: 12,
        ambient: false,
        solo: true,
        quality: 'high',
      );
      c.endViewReply = const ViewEnd(win: 'x', seconds: 9);
      c.emitViewReady(win: 'x');
      await c.endView();
      await Future<void>.delayed(Duration.zero);
      expect(got.whereType<ViewReady>(), hasLength(1));
      expect(got.whereType<ViewEnd>().single.seconds, 9);
      c.dispose();
    });
  });
}
