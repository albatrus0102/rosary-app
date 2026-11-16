import 'dart:convert';
import 'dart:io';
import 'dart:ui';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/analytics/device_reporter.dart';
import 'package:rosary_app/app/track.dart';
import 'package:rosary_app/backup/backup_registry.dart';
import 'package:rosary_app/backup/auto_backup.dart';
import 'package:rosary_app/church/church_touch_trace.dart';
import 'package:rosary_app/diag/diag_handlers.dart';
import 'package:rosary_app/diag/diag_recorder.dart';
import 'package:rosary_app/diag/diag_report.dart';
import 'package:rosary_app/diag/diag_sanitize.dart';
import 'package:rosary_app/diag/diag_sources.dart';
import 'package:rosary_app/diag/diag_store.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'backup_test_support.dart';

const _device = DeviceInfoSnapshot(
  model: 'samsung SM-F946N',
  os: 'Android 14 (SDK 34)',
  appVersion: '0.1.0+7',
  locale: 'ko-KR',
);

/// 수동 시계(밀리초).
class _Clock {
  int t = 1763000000000;
  int call() => t;
}

void main() {
  group('전역 처리기', () {
    late FlutterExceptionHandler? savedFlutter;
    late ErrorCallback? savedPlatform;
    setUp(() {
      savedFlutter = FlutterError.onError;
      savedPlatform = PlatformDispatcher.instance.onError;
    });
    tearDown(() {
      FlutterError.onError = savedFlutter;
      PlatformDispatcher.instance.onError = savedPlatform;
    });

    test('FlutterError.reportError 를 기록하고 원래 처리기(디버그 출력)도 부른다', () {
      final prev = <FlutterErrorDetails>[];
      FlutterError.onError = prev.add;
      PlatformDispatcher.instance.onError = null;
      final r = DiagRecorder();
      final h = DiagHandlers.install(recorder: r);
      try {
        FlutterError.reportError(
          FlutterErrorDetails(
            exception: StateError('boom for someone@example.com'),
            stack: StackTrace.current,
            library: 'widgets library',
          ),
        );
        expect(prev, hasLength(1), reason: '기존 처리기는 그대로 불린다');
        final e = r.errors.single;
        expect(e['src'], 'flutter');
        expect(e['type'], 'StateError');
        expect(e['msg'], contains('<email>'));
        expect(e['msg'], isNot(contains('example.com')));
        expect(e['lib'], 'widgets library');
        expect(e['x'], isTrue);
        expect('${e['stack']}', contains('diag_test.dart'));
        expect(r.unexpected.value, 1);

        // silent(이미지 불러오기 등)은 기록만, 안내는 띄우지 않는다.
        FlutterError.reportError(
          FlutterErrorDetails(exception: Exception('img'), silent: true),
        );
        expect(r.errors, hasLength(2));
        expect(r.errors.last['x'], isNull);
        expect(r.unexpected.value, 1);

        // 뿌리 존의 처리되지 않은 오류: 원래 처리기가 없으면 false(엔진이 출력)를 그대로 돌려준다.
        final handled = PlatformDispatcher.instance.onError!(
          ArgumentError('bad'),
          StackTrace.current,
        );
        expect(handled, isFalse);
        expect(r.errors.last['src'], 'platform');
        expect(r.unexpected.value, 2);
        // 흔한 네트워크 오류는 기록하되 안내하지 않는다.
        PlatformDispatcher.instance.onError!(
          const SocketException('down'),
          StackTrace.current,
        );
        expect(r.errors.last['type'], 'SocketException');
        expect(r.unexpected.value, 2);
      } finally {
        h.uninstall();
      }
    });

    test('떼면 원래 처리기로 돌아간다', () {
      void mine(FlutterErrorDetails d) {}
      FlutterError.onError = mine;
      final h = DiagHandlers.install(recorder: DiagRecorder());
      expect(identical(FlutterError.onError, mine), isFalse);
      h.uninstall();
      expect(identical(FlutterError.onError, mine), isTrue);
    });
  });

  group('기록기: 상한·중복·재시작', () {
    test('발자취·오류 고리 상한을 지킨다', () {
      final r = DiagRecorder(maxCrumbs: 5, maxErrors: 3);
      for (var i = 0; i < 12; i++) {
        r.crumb('ev$i');
        r.add(src: 'caught', type: 'E$i', message: 'm$i');
      }
      expect(r.crumbs.map((c) => c['ev']), [
        'ev7',
        'ev8',
        'ev9',
        'ev10',
        'ev11',
      ]);
      expect(r.errors.map((e) => e['type']), ['E9', 'E10', 'E11']);
    });

    test('같은 오류는 한 줄로 세고, 새 오류는 1분 상한', () {
      final clock = _Clock();
      final r = DiagRecorder(maxNewErrorsPerMinute: 3, clock: clock.call);
      for (var i = 0; i < 5; i++) {
        r.add(src: 'js', type: 'error', message: 'same');
        clock.t += 1000;
      }
      expect(r.errors, hasLength(1));
      expect(r.errors.single['n'], 5);
      expect(r.errors.single['last'], clock.t - 1000);
      r.add(src: 'js', type: 'error', message: 'b');
      r.add(src: 'js', type: 'error', message: 'c');
      r.add(src: 'js', type: 'error', message: 'd'); // 1분에 4번째 새 오류 → 버림
      expect(r.errors, hasLength(3));
      expect(r.dropped, 1);
      clock.t += 61000;
      r.add(src: 'js', type: 'error', message: 'same'); // 창이 지나 새 줄
      expect(r.errors, hasLength(4));
      expect(r.errors.last['n'], 1);
    });

    test('파일에 남아 다시 켜도 이어진다(JSON Lines, 실행 번호, 상한, 압축)', () {
      final dir = Directory.systemTemp.createTempSync('diag_test_');
      addTearDown(() => dir.deleteSync(recursive: true));
      final file = File('${dir.path}/diag/diag_log.jsonl');
      final clock = _Clock();
      final a = DiagRecorder(maxCrumbs: 20, maxErrors: 5, clock: clock.call);
      a.crumb('before_attach'); // 붙기 전 기록도 잃지 않는다
      file.parent.createSync(recursive: true);
      a.attach(FileDiagStore(file));
      expect(a.session, 1);
      for (var i = 0; i < 100; i++) {
        clock.t += 10;
        a.crumb('tap', {'i': i});
      }
      for (var i = 0; i < 8; i++) {
        clock.t += 10;
        a.add(src: 'flutter', type: 'StateError', message: 'e$i');
      }
      clock.t += 10;
      for (var i = 0; i < 4; i++) {
        a.add(
          src: 'js',
          type: 'error',
          message: 'dup',
        ); // n = 4 → 파일에 n=4 로 고쳐 쓴다
      }
      // 압축: 파일 줄 수는 상한의 두 배 남짓을 넘지 않는다.
      final lines = file.readAsLinesSync();
      expect(lines.length, lessThanOrEqualTo(2 * (20 + 5) + 1));
      for (final l in lines) {
        expect(jsonDecode(l), isA<Map>());
      }

      // 「앱이 죽고 다시 켬」: 새 기록기가 같은 파일을 붙인다.
      clock.t += 60000;
      final b = DiagRecorder(maxCrumbs: 20, maxErrors: 5, clock: clock.call);
      b.attach(FileDiagStore(file));
      expect(b.session, 2);
      expect(b.errors, hasLength(5));
      expect(b.errors.last['type'], 'error');
      expect(b.errors.last['n'], 4);
      expect(b.crumbs.last['ev'], 'app_start');
      expect((b.crumbs.last['d'] as Map)['sess'], 2);
      expect(b.crumbs.length, 20);
      final starts = b.crumbs.where((c) => c['ev'] == 'app_start').toList();
      expect(starts, isNotEmpty);
      // 끝이 잘린 줄(쓰는 중 종료)은 버리고 나머지는 읽는다.
      file.writeAsStringSync('{"k":"c","t":1,', mode: FileMode.append);
      final c = DiagRecorder(maxCrumbs: 20, maxErrors: 5, clock: clock.call)
        ..attach(FileDiagStore(file));
      expect(c.session, 3);
      expect(c.errors, hasLength(5));
    });

    test('Diag.dataOnce 는 같은 키를 기간 안에 한 번만', () {
      final r = DiagRecorder();
      final old = DiagRecorder.instance;
      DiagRecorder.debugReplace(r);
      addTearDown(() => DiagRecorder.debugReplace(old));
      expect(
        Diag.dataOnce('k_once_test', const Duration(hours: 1), 'save_fail'),
        isTrue,
      );
      expect(
        Diag.dataOnce('k_once_test', const Duration(hours: 1), 'save_fail'),
        isFalse,
      );
      expect(r.crumbs.where((c) => c['ev'] == 'save_fail'), hasLength(1));
      expect(r.crumbs.single['lv'], 'd');
    });
  });

  group('입구들', () {
    late DiagRecorder r;
    late DiagRecorder old;
    setUp(() {
      old = DiagRecorder.instance;
      r = DiagRecorder.debugReplace(DiagRecorder());
    });
    tearDown(() => DiagRecorder.debugReplace(old));

    test('Track(분석 호출)이 발자취도 남긴다 — 기도 시작/끝·성당 들어감', () {
      Track.event('prayer_start', {'set': 'joyful', 'mode': 'solo'});
      Track.church('church_enter', 'myeongdong', {'solo': true});
      Track.screen('stats');
      expect(r.crumbs.map((c) => c['ev']), [
        'prayer_start',
        'church_enter',
        'screen',
      ]);
      expect(r.crumbs[1]['d'], {'church': 'myeongdong', 'solo': true});
    });

    test('웹 JS 오류(jsError)를 기록하고 다른 메시지는 건드리지 않는다', () {
      final raw = jsonEncode({
        'e': 'jsError',
        'kind': 'error',
        'msg': 'Uncaught TypeError: x',
        'src': 'main.js',
        'line': 12,
        'col': 3,
        'stack': 'TypeError: x\n    at f (main.js:12:3)',
      });
      expect(DiagJs.handleRaw(raw, recorder: r), isTrue);
      expect(DiagJs.handleRaw('{"e":"ready"}', recorder: r), isFalse);
      final e = r.errors.single;
      expect(e['src'], 'js');
      expect(e['type'], 'error');
      expect(e['d'], containsPair('file', 'main.js'));
      expect(e['d'], containsPair('line', 12));
      expect(e['x'], isNull, reason: '웹 오류는 안내를 띄우지 않는다');
    });

    test('네이티브 기록과 지난 실행의 자바 예외를 옮긴다', () {
      final n = DiagNative.absorb({
        'entries': [
          {
            't': 1763000000000,
            'tag': 'backup:probe',
            'type': 'SecurityException',
            'msg': 'Permission Denial: content://com.android.externalstorage/tree/x',
            'stack': 'at a.b:1',
          },
        ],
        'crash': {
          't': 1762999990000,
          'type': 'IllegalStateException',
          'msg': 'boom',
          'stack': 'at kr.rosary.X.y:3',
          'thread': 'main',
        },
      }, r);
      expect(n, 2);
      expect(r.errors.first['src'], 'native');
      expect(r.errors.first['msg'], isNot(contains('content://')));
      expect(r.errors.last['src'], 'native_crash');
      expect(r.errors.last['x'], isTrue);
      expect(r.unexpected.value, 1);
    });

    test('화면 이동 관찰자: 이름 있는 화면·시트', () {
      final o = DiagNavigatorObserver(recorder: r);
      final page = PageRouteBuilder<void>(
        settings: const RouteSettings(name: 'prayer'),
        pageBuilder: (_, _, _) => const SizedBox(),
      );
      o.didPush(page, null);
      o.didPop(page, null);
      expect(r.crumbs.first['d'], {'op': 'push', 'to': 'prayer'});
      expect(r.crumbs.last['d'], {'op': 'pop', 'to': '-', 'from': 'prayer'});
    });
  });

  group('거르기', () {
    test('사건 값: 짧은 코드·숫자·참거짓만, 글은 길이로', () {
      expect(
        DiagSanitize.detail({
          'set': 'joyful',
          'n': 3,
          'ok': true,
          'intention': '가족의 건강을 위하여',
          'mail': 'a@b.com',
          'err': StateError('x').runtimeType,
          'list': [1, 2],
        }),
        {
          'set': 'joyful',
          'n': 3,
          'ok': true,
          'intention': '<11>',
          'mail': '<7>',
          'err': 'StateError',
          'list': 'list:2',
        },
      );
    });

    test('오류 문구: 첫 줄만, 따옴표 조각·한글·이메일·토큰을 가린다', () {
      final s = DiagSanitize.text(
        'FormatException: Unexpected character (at character 3)\n'
        '{"name":"마리아"}\n  ^',
      );
      expect(s, startsWith('FormatException: Unexpected character'));
      expect(s, contains('<+2 lines>'));
      expect(s, isNot(contains('마리아')));
      final t = DiagSanitize.text(
        'Bad "어린 왕자" for x@y.org token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9abc',
      );
      expect(t, contains('"<5>"'));
      expect(t, contains('<email>'));
      expect(t, contains('<token>'));
      expect(DiagSanitize.text('세례명 프란치스코'), '<ko3> <ko5>');
    });
  });

  group('내보내기 파일', () {
    late DiagRecorder r;
    late DiagRecorder old;
    setUp(() {
      old = DiagRecorder.instance;
      r = DiagRecorder.debugReplace(DiagRecorder());
    });
    tearDown(() => DiagRecorder.debugReplace(old));

    test('개인정보: 뺀 키·비밀 키 값, 이메일·토큰 모양, 사용자 글(한글)이 하나도 없다', () async {
      // 등록부의 「뺀 키」 전부에 알아볼 수 있는 값을 넣는다.
      final values = <String, Object>{};
      var i = 0;
      for (final s in BackupRegistry.specs) {
        if (s.role == PrefRole.backup) continue;
        final k = s.prefix ? '${s.key}probe' : s.key;
        values[k] = 'SENTINEL${i++}x'; // 값 자체도 짧은 코드 모양 — 키 규칙만으로 막혀야 한다
      }
      values['rosary.auth.session'] = 'eyJhbGciOiJIUzI1NiJ9.SENTINELjwt.sig';
      values['stats_owner_uid'] = '8f14e45f-ceea-467f-a0e6-1234567890ab';
      values['unregistered_new_key'] = 'SENTINELunreg';
      // 등록부가 backup 으로 싣는 키 중 사람의 글이 든 것
      values['church_avatar'] = '{"name":"프란치스코","baptismal":"프란치스코"}';
      values['skin_customs'] = '[{"name":"SENTINELskin"}]';
      values['church_solo_candles_v1'] = '[{"note":"SENTINELcandle"}]';
      // 설정 값이 글이면(이메일 등) 빼고, 짧은 코드·숫자·참거짓은 싣는다.
      values['church_id'] = 'me@example.com';
      values['prayer_mode'] = 'solo';
      values['haptic'] = true;
      values['prayer_text_scale'] = 1.25;
      values['church_favorites'] = ['myeongdong', 'stpeter'];
      SharedPreferences.setMockInitialValues(values);
      final prefs = await SharedPreferences.getInstance();

      // 발자취·오류에 사용자 글을 넣어 본다(호출부 실수를 흉내).
      r.crumb('prayer_start', {
        'intention': '가족의 건강을 위하여',
        'name': '마리아',
        'note': 'call 010-1234-5678 or me@example.com',
      });
      r.error(
        'caught',
        FormatException('bad json\n{"intention":"SENTINELtext 기도"}'),
        stack: StackTrace.fromString(
          '#0 f (file:///data/user/0/kr.rosary.rosary_app/x.dart:1:1)',
        ),
      );
      r.add(
        src: 'native',
        type: 'IOException',
        message:
            'open failed for 8f14e45f-ceea-467f-a0e6-1234567890ab '
            'token=ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef0123456789 user@mail.com',
      );

      final out = DiagReport.build(
        recorder: r,
        now: DateTime(2026, 11, 16, 9, 30),
        device: _device,
        prefs: prefs,
        screen: const {},
      );
      expect(out, isNot(contains('SENTINEL')));
      expect(RegExp(r'[\w.+\-]+@[\w\-]+\.[\w.\-]+').hasMatch(out), isFalse);
      expect(RegExp(r'[A-Za-z0-9_\-]{32,}').hasMatch(out), isFalse);
      expect(
        RegExp(r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}')
            .hasMatch(out),
        isFalse,
      );
      expect(RegExp(r'[가-힣]').hasMatch(out), isFalse, reason: '한글(의향·세례명) 없음');
      expect(out, isNot(contains('/data/user')));
      expect(out, isNot(contains('010-1234')));

      final header = jsonDecode(out.split('\n').first) as Map<String, dynamic>;
      final settings = header['settings'] as Map<String, dynamic>;
      expect(settings['prayer_mode'], 'solo');
      expect(settings['haptic'], true);
      expect(settings['prayer_text_scale'], 1.25);
      expect(settings['church_favorites'], 'list:2');
      expect(settings.containsKey('church_id'), isFalse);
      expect(settings.containsKey('church_avatar'), isFalse);
      for (final k in settings.keys) {
        expect(BackupRegistry.specFor(k)?.role, PrefRole.backup, reason: k);
      }
    });

    test('형식: 머리 → 오류 → 발자취 → 끝, 줄마다 JSON', () async {
      SharedPreferences.setMockInitialValues({'skin_id': 'advent'});
      final prefs = await SharedPreferences.getInstance();
      r.crumb('route', {'op': 'push', 'to': 'prayer'});
      r.add(src: 'flutter', type: 'StateError', message: 'No element');
      r.crumb('prayer_finish', {'completed': false});
      final out = DiagReport.build(
        recorder: r,
        now: DateTime(2026, 11, 16, 9, 30),
        device: _device,
        prefs: prefs,
        screen: const {
          'logical': [882.0, 1104.0],
          'features': [
            {'type': 'fold', 'state': 'postureFlat'},
          ],
        },
      );
      final lines = const LineSplitter().convert(out.trim());
      final objs = [
        for (final l in lines) jsonDecode(l) as Map<String, dynamic>,
      ];
      expect(objs.first['type'], 'header');
      expect(objs.first['format'], 'rosarium-diag');
      expect(objs.first['v'], 1);
      expect(objs.first['app'], '0.1.0+7');
      expect(objs.first['model'], 'samsung SM-F946N');
      expect(objs.first['os'], 'Android 14 (SDK 34)');
      expect(objs.first['fold'], 'fold:postureFlat');
      expect((objs.first['theme'] as Map)['skin'], 'advent');
      expect(
        objs.first.keys,
        containsAll([
          'buildId',
          'locale',
          'screen',
          'settings',
          'stats',
          'counts',
          'mode',
        ]),
      );
      expect(objs[1]['k'], 'e');
      expect(objs[2]['k'], 'c');
      expect(objs[3]['k'], 'c');
      expect(objs.last, {'type': 'end', 'errors': 1, 'crumbs': 2});
      expect(
        DiagReport.fileName(DateTime(2026, 11, 16, 9, 3, 7)),
        'rosarium-diag-20261116-090307.txt',
      );
    });

    test('개발용 빌드: 성당 터치 기록이 있으면 요약 한 줄을 붙인다', () {
      ChurchTouchTrace.debugForce = true;
      addTearDown(() {
        ChurchTouchTrace.instance.clear();
        ChurchTouchTrace.debugForce = false;
      });
      ChurchTouchTrace.instance.clear();
      String build() => DiagReport.build(
        recorder: r,
        now: DateTime(2026, 11, 16, 9, 30),
        device: _device,
        screen: const {},
      );
      expect(build(), isNot(contains('"type":"touchTrace"')));
      ChurchTouchTrace.instance.decision('stick-grab', {'id': 3});
      final lines = const LineSplitter().convert(build().trim());
      expect(jsonDecode(lines[0])['type'], 'header');
      final tt = jsonDecode(lines[1]) as Map<String, dynamic>;
      expect(tt['type'], 'touchTrace');
      expect(tt['format'], 'rosarium-touch-trace');
      expect(tt['count'], 1);
    });

    test('백업 상태: 폴더 상태·사유 코드·횟수만(이름·경로 없음)', () async {
      final rig = await BackupRig.create(
        values: {BackupKeys.autoEnabled: true, BackupKeys.autoEverOk: true},
      );
      rig.platform.folderCode = 'no_perm:p0';
      rig.platform.folderName = 'SENTINEL내 폴더';
      final outcome = await rig.service.auto.run(BackupTrigger.launch);
      expect(outcome, AutoOutcome.noFolder);
      // 자동 백업 실패가 사유 코드와 함께 발자취에 남는다(독서공방 autobackup_fail).
      final fail = r.crumbs.lastWhere((c) => c['ev'] == 'autobackup_fail');
      expect(fail['lv'], 'd');
      expect(fail['d'], {'code': 'no_folder:no_perm:p0', 'n': 1});

      final out = DiagReport.build(
        recorder: r,
        now: rig.clock(),
        device: _device,
        prefs: rig.prefs,
        stats: rig.stats,
        backup: rig.service,
        screen: const {},
      );
      final header = jsonDecode(out.split('\n').first) as Map<String, dynamic>;
      final b = header['backup'] as Map<String, dynamic>;
      expect(b['autoWanted'], isTrue);
      expect(b['folder'], 'noPermission');
      expect(b['folderCode'], 'no_perm:p0');
      expect(b['failN'], 1);
      expect(b['failCode'], 'no_folder:no_perm:p0');
      expect(out, isNot(contains('SENTINEL')));
    });
  });
}
