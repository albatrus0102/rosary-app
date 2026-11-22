import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/app/app.dart';
import 'package:rosary_app/app/guide_voice.dart';
import 'package:rosary_app/app/settings.dart';
import 'package:rosary_app/backup/backup_registry.dart';
import 'package:rosary_app/ui/app_intro.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'guide_fakes.dart';

Future<AppSettings> _settings([Map<String, Object> values = const {}]) async {
  SharedPreferences.setMockInitialValues({'appIntroDone': false, ...values});
  return AppSettings.load();
}

void _size(WidgetTester tester, [Size size = const Size(400, 900)]) {
  tester.view.physicalSize = size;
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
}

/// 낱말 가운데서 줄이 꺾이지 않게 글자 사이에 넣은 붙임 표시(U+2060)를 뺀 글로 찾는다.
Finder _t(String text) => find.byWidgetPredicate(
  (w) => w is Text && w.data?.replaceAll('\u2060', '') == text,
);

Finder get _next => find.byKey(const ValueKey('intro-next'));
Finder get _skip => find.byKey(const ValueKey('intro-skip'));
Finder get _count => find.byKey(const ValueKey('intro-count'));
Finder get _nav => find.byType(NavigationBar);

Future<void> _page(WidgetTester tester) async {
  await tester.tap(_next);
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 400));
}

void main() {
  late RecordingGuideEngine voice;
  setUp(() {
    voice = RecordingGuideEngine();
    GuideVoice.engine = voice;
  });
  tearDown(() => GuideVoice.engine = SilentGuideEngine());

  group('앱 소개(첫 실행)', () {
    testWidgets('첫 실행: 탭이 나오기 전에 소개가 먼저 나온다', (tester) async {
      _size(tester);
      final settings = await _settings();
      await tester.pumpWidget(RosaryApp(settings));
      await tester.pump();
      expect(find.byType(AppIntroScreen), findsOneWidget);
      expect(_nav, findsNothing);
      expect(_t('환영해요'), findsOneWidget);
      expect(_t('로사리움은 묵주기도를 함께 바치는 곳이에요.'), findsOneWidget);
      expect(
        tester.widget<Text>(_count).data,
        '1 / 4',
      );
      // 큰 단추 56dp, 건너뛰기 있음, 쪽 표시
      expect(tester.getSize(_next).height, greaterThanOrEqualTo(56));
      expect(tester.getSize(_skip).height, greaterThanOrEqualTo(56));
      expect(find.byKey(const ValueKey('intro-dots')), findsOneWidget);
      expect(find.text('다음'), findsOneWidget);
      // 그림 자리: 그림이 읽기에서 빠지고, 그림을 못 읽으면 큰 아이콘으로 바뀐다.
      expect(find.byKey(const ValueKey('intro-art-image')), findsOneWidget);
    });

    testWidgets('네 쪽을 지나 시작해요를 누르면 첫 탭이 나오고 다시 안 나온다', (tester) async {
      _size(tester);
      final settings = await _settings();
      await tester.pumpWidget(RosaryApp(settings));
      await tester.pump();
      // 2쪽: 네 탭과 실제 아이콘
      await _page(tester);
      expect(tester.widget<Text>(_count).data, '2 / 4');
      for (final tab in ['성당', '오늘', '기록', '더보기']) {
        expect(find.byKey(ValueKey('intro-tab-$tab')), findsOneWidget);
      }
      expect(find.byIcon(Icons.church), findsOneWidget);
      expect(find.byIcon(Icons.self_improvement), findsOneWidget);
      expect(find.byIcon(Icons.calendar_month), findsOneWidget);
      expect(find.byIcon(Icons.more_horiz), findsOneWidget);
      // 3쪽
      await _page(tester);
      expect(
        _t('성당에서는 걸어 다니며 초를 켜고 자리에 앉아 기도해요.'),
        findsOneWidget,
      );
      // 4쪽: 글자 크기
      await _page(tester);
      expect(_t('글씨를 크게 볼까요?'), findsOneWidget);
      for (final l in ['보통', '크게', '아주 크게']) {
        expect(find.text(l), findsOneWidget);
      }
      expect(find.text('시작해요'), findsOneWidget);
      expect(settings.appIntroDone, isFalse);
      await tester.tap(_next);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 400));
      expect(find.byType(AppIntroScreen), findsNothing);
      expect(_nav, findsOneWidget);
      expect(settings.appIntroDone, isTrue);

      // 앱을 다시 열어도(같은 저장값) 소개는 나오지 않는다.
      final again = await AppSettings.load();
      await tester.pumpWidget(const SizedBox());
      await tester.pumpWidget(RosaryApp(again));
      await tester.pump();
      expect(find.byType(AppIntroScreen), findsNothing);
      expect(_nav, findsOneWidget);
    });

    testWidgets('건너뛰기: 바로 첫 탭, 다시 안 나온다(저장됨)', (tester) async {
      _size(tester);
      final settings = await _settings();
      await tester.pumpWidget(RosaryApp(settings));
      await tester.pump();
      await tester.tap(_skip);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 400));
      expect(find.byType(AppIntroScreen), findsNothing);
      expect(_nav, findsOneWidget);
      expect(settings.appIntroDone, isTrue);
      final prefs = await SharedPreferences.getInstance();
      expect(prefs.getBool('appIntroDone'), isTrue);
    });

    testWidgets('이미 마친 사람에게는 처음부터 나오지 않는다', (tester) async {
      _size(tester);
      final settings = await _settings({'appIntroDone': true});
      await tester.pumpWidget(RosaryApp(settings));
      await tester.pump();
      expect(find.byType(AppIntroScreen), findsNothing);
      expect(_nav, findsOneWidget);
    });

    testWidgets('글자 크기: 고르면 바로 예시와 앱 전체에 적용된다', (tester) async {
      _size(tester);
      final settings = await _settings();
      await tester.pumpWidget(RosaryApp(settings));
      await tester.pump();
      for (var i = 0; i < 3; i++) {
        await _page(tester);
      }
      Finder sample() => find.byKey(const ValueKey('intro-sample'));
      double scaleOf() =>
          MediaQuery.of(tester.element(sample())).textScaler.scale(10) / 10;
      expect(scaleOf(), closeTo(1.0, 0.001));
      expect(settings.appTextScale, 1.0);
      final h0 = tester.getSize(sample()).height;

      await tester.tap(find.byKey(const ValueKey('intro-size-1')));
      await tester.pump();
      expect(settings.appTextScale, 1.2);
      expect(scaleOf(), closeTo(1.2, 0.001));
      expect(tester.getSize(sample()).height, greaterThanOrEqualTo(h0));

      await tester.tap(find.byKey(const ValueKey('intro-size-2')));
      await tester.pump();
      expect(settings.appTextScale, 1.4);
      expect(scaleOf(), closeTo(1.4, 0.001));
      expect(tester.takeException(), isNull);

      // 마친 뒤 첫 탭도 같은 크기로 그려진다.
      await tester.tap(_next);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 400));
      final ctx = tester.element(_nav);
      expect(MediaQuery.of(ctx).textScaler.scale(10) / 10, closeTo(1.4, 0.001));
      final prefs = await SharedPreferences.getInstance();
      expect(prefs.getDouble('appTextScale'), 1.4);
    });

    testWidgets('좁은 화면 360x640 아주 크게: 모든 쪽이 넘치지 않는다', (tester) async {
      _size(tester, const Size(360, 640));
      final settings = await _settings({'appTextScale': 1.4});
      await tester.pumpWidget(RosaryApp(settings));
      await tester.pump();
      for (var i = 0; i < 4; i++) {
        expect(tester.takeException(), isNull, reason: 'page $i');
        // 단추는 화면 안에 있다
        final r = tester.getRect(_next);
        expect(r.bottom, lessThanOrEqualTo(640));
        expect(r.height, greaterThanOrEqualTo(56));
        if (i < 3) await _page(tester);
      }
    });

    testWidgets('쪽마다 글을 읽어 주고 스피커로 끈다', (tester) async {
      _size(tester);
      final settings = await _settings();
      await tester.pumpWidget(RosaryApp(settings));
      await tester.pump();
      expect(voice.spoken, hasLength(1));
      expect(voice.spoken.last, contains('묵주기도를 함께 바치는 곳'));
      await _page(tester);
      expect(voice.spoken.last, contains('성당, 오늘, 기록, 더보기'));
      await tester.tap(find.byKey(const ValueKey('intro-tts')));
      await tester.pump();
      expect(settings.guideTtsOn, isFalse);
      final n = voice.spoken.length;
      await _page(tester);
      expect(voice.spoken.length, n);
      // 마치면 읽기를 멈춘다
      final stops = voice.stops;
      await tester.tap(_skip);
      await tester.pump();
      expect(voice.stops, greaterThan(stops));
    });
  });

  group('앱 전체 글자 크기 배율', () {
    test('1.0 은 그대로, 기기 글자 크기와 곱하되 2.0 을 넘기지 않는다', () {
      const base = MediaQueryData(textScaler: TextScaler.linear(1.0));
      expect(identical(scaledForApp(base, 1.0), base), isTrue);
      expect(scaledForApp(base, 1.2).textScaler.scale(10), closeTo(12, 1e-6));
      expect(scaledForApp(base, 1.4).textScaler.scale(10), closeTo(14, 1e-6));
      const sys15 = MediaQueryData(textScaler: TextScaler.linear(1.5));
      expect(scaledForApp(sys15, 1.2).textScaler.scale(10), closeTo(18, 1e-6));
      expect(
        scaledForApp(sys15, 1.4).textScaler.scale(10),
        closeTo(20, 1e-6),
        reason: '1.5 x 1.4 = 2.1 은 2.0 으로 눌린다',
      );
      const sys25 = MediaQueryData(textScaler: TextScaler.linear(2.5));
      expect(
        scaledForApp(sys25, 1.4).textScaler.scale(10),
        closeTo(25, 1e-6),
        reason: '기기 값이 이미 상한 위면 줄이지 않는다',
      );
    });

    test('저장값은 세 가지 중 하나만, 백업 등록부에 있다', () async {
      SharedPreferences.setMockInitialValues({'appTextScale': 1.7});
      final s = await AppSettings.load();
      expect(s.appTextScale, 1.0, reason: '엉뚱한 값은 보통으로');
      s.appTextScale = 1.2;
      expect(s.appTextScale, 1.2);
      s.appTextScale = 3.0;
      expect(s.appTextScale, 1.0);
    });
  });

  group('백업 등록부(새 첫 사용 안내 설정)', () {
    test('앱 소개·성당 안내·읽어 주기·글자 크기 배율이 설정으로 실린다', () {
      const expected = {
        'appIntroDone': PrefType.boolean,
        'churchTourDone': PrefType.boolean,
        'guideTtsOn': PrefType.boolean,
        'appTextScale': PrefType.decimal,
      };
      expected.forEach((key, type) {
        final spec = BackupRegistry.specFor(key);
        expect(spec, isNotNull, reason: key);
        expect(spec!.role, PrefRole.backup, reason: key);
        expect(spec.type, type, reason: key);
        expect(BackupRegistry.shouldExport(key), isTrue, reason: key);
      });
    });

    test('읽어 주기는 기본 켜짐, 안내 마침 표시는 기본 꺼짐', () async {
      SharedPreferences.setMockInitialValues({});
      AppSettings.defaultAppIntroDone = false;
      AppSettings.defaultChurchTourDone = false;
      addTearDown(() {
        AppSettings.defaultAppIntroDone = true;
        AppSettings.defaultChurchTourDone = true;
      });
      final s = await AppSettings.load();
      expect(s.guideTtsOn, isTrue);
      expect(s.appIntroDone, isFalse);
      expect(s.churchTourDone, isFalse);
      expect(s.appTextScale, 1.0);
    });
  });
}
