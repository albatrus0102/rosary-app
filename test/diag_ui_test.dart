import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/analytics/device_reporter.dart';
import 'package:rosary_app/app/app_services.dart';
import 'package:rosary_app/app/settings.dart';
import 'package:rosary_app/app/theme.dart';
import 'package:rosary_app/backup/backup_platform.dart';
import 'package:rosary_app/diag/diag_recorder.dart';
import 'package:rosary_app/diag/diag_send_sheet.dart';
import 'package:rosary_app/ui/more_screen.dart';

import 'backup_test_support.dart';

class _FakeDevice implements DeviceInfoProvider {
  @override
  Future<DeviceInfoSnapshot> read() async => const DeviceInfoSnapshot(
    model: 'samsung SM-F946N',
    os: 'Android 14 (SDK 34)',
    appVersion: '0.1.0+7',
    locale: 'ko-KR',
  );
}

void main() {
  late DiagRecorder old;
  late DiagRecorder r;
  setUp(() {
    old = DiagRecorder.instance;
    r = DiagRecorder.debugReplace(DiagRecorder());
    DiagErrorWatcher.debugReset();
    DiagSendSheet.debugDeviceInfo = _FakeDevice();
  });
  tearDown(() {
    DiagRecorder.debugReplace(old);
    DiagErrorWatcher.debugReset();
    DiagSendSheet.debugDeviceInfo = null;
    DiagSendSheet.debugPlatform = null;
  });

  Future<(BackupRig, AppServices)> pumpMore(WidgetTester tester) async {
    final rig = await BackupRig.create(now: DateTime(2026, 11, 16, 9, 30));
    final settings = await AppSettings.load();
    final services = AppServices.inMemory(
      settings,
      stats: rig.stats,
      backup: rig.service,
    );
    addTearDown(services.disposeInMemory);
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(
      AppServicesScope(
        services: services,
        child: MaterialApp(
          theme: AppTheme.light(),
          home: MoreScreen(
            settings: settings,
            onOpenStyles: () {},
            onOpenSettings: () {},
          ),
        ),
      ),
    );
    await tester.pump();
    return (rig, services);
  }

  Future<void> openSheet(WidgetTester tester) async {
    final entry = find.byKey(const ValueKey('more-diag-send'));
    await tester.ensureVisible(entry);
    await tester.pumpAndSettle();
    await tester.tap(entry);
    // 기기 정보·설정을 읽는 동안 도는 표시가 있어 몇 번 나눠 그린다.
    for (var i = 0; i < 5; i++) {
      await tester.pump(const Duration(milliseconds: 100));
    }
    await tester.pumpAndSettle();
  }

  testWidgets('더보기 › 문제 알리기 › 오류 기록 보내기 → 미리보기 시트(자동 전송 없음, 백업 붙이기 기본 꺼짐)', (
    tester,
  ) async {
    await pumpMore(tester);
    final entry = find.byKey(const ValueKey('more-diag-send'));
    await tester.ensureVisible(entry);
    await tester.pumpAndSettle();
    expect(find.text('문제 알리기'), findsOneWidget);
    expect(find.text('오류 기록 보내기'), findsOneWidget);
    // 「정보」 묶음(출처·라이선스) 가까이: 그 뒤에 온다.
    expect(
      tester.getTopLeft(find.text('문제 알리기')).dy,
      greaterThan(tester.getTopLeft(find.text('오픈소스 라이선스')).dy),
    );

    r.add(src: 'flutter', type: 'StateError', message: 'Bad state: No element');
    r.crumb('prayer_start', {'set': 'joyful'});
    await openSheet(tester);

    expect(find.byKey(const ValueKey('diag-sheet')), findsOneWidget);
    expect(find.byKey(const ValueKey('diag-no-auto')), findsOneWidget);
    expect(find.textContaining('자동으로 보내지 않아요'), findsWidgets);
    expect(find.textContaining('기도 의향·세례명'), findsOneWidget);
    final preview = find.byKey(const ValueKey('diag-preview'));
    expect(
      find.descendant(of: preview, matching: find.textContaining('SM-F946N')),
      findsOneWidget,
    );
    expect(
      find.descendant(of: preview, matching: find.textContaining('오류 1건')),
      findsOneWidget,
    );
    expect(
      find.descendant(of: preview, matching: find.textContaining('StateError')),
      findsOneWidget,
    );
    final sw = tester.widget<SwitchListTile>(
      find.byKey(const ValueKey('diag-attach-backup')),
    );
    expect(sw.value, isFalse);
    expect(find.text('백업 파일도 함께 붙이기'), findsOneWidget);
  });

  testWidgets('공유하기: 오류 기록 파일 하나(글 파일)를 기존 공유 통로로 연다', (tester) async {
    final (rig, _) = await pumpMore(tester);
    r.crumb('church_enter', {'church': 'myeongdong'});
    await openSheet(tester);
    await tester.tap(find.byKey(const ValueKey('diag-share')));
    await tester.pumpAndSettle();

    expect(rig.platform.shared, hasLength(1));
    final (name, text) = rig.platform.shared.single;
    expect(name, matches(RegExp(r'^rosarium-diag-\d{8}-\d{6}\.txt$')));
    expect(rig.platform.mimes[name], textMime);
    final head = jsonDecode(text.split('\n').first) as Map<String, dynamic>;
    expect(head['format'], 'rosarium-diag');
    expect(head['model'], 'samsung SM-F946N');
    expect(head['backup'], isA<Map<String, dynamic>>());
    expect(text, contains('"ev":"church_enter"'));
    expect(find.byKey(const ValueKey('diag-sheet')), findsNothing);
    expect(r.crumbs.last['ev'], 'diag_export');
    expect(r.crumbs.last['d'], {'via': 'share', 'backup': false, 'code': 'ok'});
  });

  testWidgets('백업 파일도 함께 붙이기를 켜면 두 파일을 한 번에 공유한다', (tester) async {
    final (rig, _) = await pumpMore(tester);
    await openSheet(tester);
    await tester.tap(find.byKey(const ValueKey('diag-attach-backup')));
    await tester.pump();
    await tester.tap(find.byKey(const ValueKey('diag-share')));
    await tester.pumpAndSettle();

    final batch = rig.platform.sharedBatches.single;
    expect(batch, hasLength(2));
    expect(batch[0].name, endsWith('.txt'));
    expect(batch[0].mime, textMime);
    expect(batch[1].name, startsWith('rosarium-export-'));
    expect(batch[1].mime, jsonMime);
    final backup = jsonDecode(batch[1].content) as Map<String, dynamic>;
    expect(backup, contains('data'));
  });

  testWidgets('파일로 저장: 다운로드 등 고른 자리에 저장한다', (tester) async {
    final (rig, _) = await pumpMore(tester);
    await openSheet(tester);
    await tester.tap(find.byKey(const ValueKey('diag-save')));
    await tester.pumpAndSettle();
    expect(rig.platform.saved, hasLength(1));
    expect(rig.platform.saved.single.$1, endsWith('.txt'));
    expect(find.textContaining('저장했어요'), findsOneWidget);
  });

  testWidgets('예상하지 못한 오류: 「문제가 생겼어요 · 기록 보내기」를 실행마다 한 번만', (tester) async {
    final rig = await BackupRig.create(now: DateTime(2026, 11, 16, 9, 30));
    final settings = await AppSettings.load();
    final services = AppServices.inMemory(
      settings,
      stats: rig.stats,
      backup: rig.service,
    );
    addTearDown(services.disposeInMemory);
    await tester.pumpWidget(
      AppServicesScope(
        services: services,
        child: MaterialApp(
          home: Scaffold(
            body: DiagErrorWatcher(recorder: r, child: const Text('home')),
          ),
        ),
      ),
    );
    // 잡아서 처리한 오류·웹 오류는 안내하지 않는다.
    r.add(src: 'js', type: 'error', message: 'x');
    await tester.pump();
    await tester.pump();
    expect(find.text('문제가 생겼어요'), findsNothing);

    r.add(
      src: 'flutter',
      type: 'StateError',
      message: 'a',
      unexpectedError: true,
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 500));
    expect(find.text('문제가 생겼어요'), findsOneWidget);
    expect(find.text('기록 보내기'), findsOneWidget);
    expect(DiagErrorWatcher.shownThisSession, isTrue);

    // 안내가 사라진 뒤 또 오류가 나도 다시 띄우지 않는다.
    await tester.pump(const Duration(seconds: 1));
    await tester.pump(const Duration(seconds: 9));
    await tester.pumpAndSettle();
    expect(find.text('문제가 생겼어요'), findsNothing);
    r.add(
      src: 'platform',
      type: 'ArgumentError',
      message: 'b',
      unexpectedError: true,
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 500));
    expect(find.text('문제가 생겼어요'), findsNothing);
    expect(r.unexpected.value, 2);
  });

  testWidgets('안내의 「기록 보내기」를 누르면 보내기 시트가 열린다', (tester) async {
    DiagSendSheet.debugPlatform = FakeBackupPlatform();
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: DiagErrorWatcher(recorder: r, child: const Text('home')),
        ),
      ),
    );
    r.add(
      src: 'flutter',
      type: 'StateError',
      message: 'a',
      unexpectedError: true,
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 500));
    await tester.pump(const Duration(milliseconds: 500));
    await tester.tap(find.text('기록 보내기'));
    for (var i = 0; i < 5; i++) {
      await tester.pump(const Duration(milliseconds: 100));
    }
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('diag-sheet')), findsOneWidget);
    // 백업 서비스가 없으면 「백업 붙이기」는 보이지 않는다.
    expect(find.byKey(const ValueKey('diag-attach-backup')), findsNothing);
  });
}
