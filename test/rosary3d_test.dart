import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/app/rosary_style.dart';
import 'package:rosary_app/app/leader_voice.dart';
import 'package:rosary_app/app/settings.dart';
import 'package:rosary_app/app/sound_player.dart';
import 'package:rosary_app/domain/prayer_data.dart';
import 'package:rosary_app/domain/prayer_mode.dart';
import 'package:rosary_app/domain/rosary_sequence.dart';
import 'package:rosary_app/rosary3d/rosary_feedback.dart';
import 'package:rosary_app/rosary3d/rosary_gallery_screen.dart';
import 'package:rosary_app/rosary3d/rosary_model.dart';
import 'package:rosary_app/rosary3d/rosary_scene.dart';
import 'package:rosary_app/ui/prayer_screen.dart';
import 'package:rosary_app/ui/widgets/prayer_bead_strip.dart';
import 'package:shared_preferences/shared_preferences.dart';

class _SilentSoundPlayer extends SoundPlayer {
  @override
  Future<void> init() async {}
  @override
  Future<void> playDecadeChime() async {}
  @override
  Future<void> playBeadTick() async {}
  @override
  Future<void> dispose() async {}
}

class _Voice implements LeaderVoice {
  final log = <String>[];
  final speaking = ValueNotifier<bool>(false);
  final _pending = <Completer<void>>[];
  @override
  ValueListenable<bool> get isSpeaking => speaking;
  @override
  Future<void> init() async {}
  @override
  Future<void> speakStep(RosaryStep step) async =>
      log.add('step:${step.title}');
  @override
  Future<void> speakResponder(RosaryStep step) {
    log.add('resp:${step.title}');
    final c = Completer<void>();
    _pending.add(c);
    return c.future;
  }

  void finish() {
    for (final c in _pending) {
      if (!c.isCompleted) c.complete();
    }
    _pending.clear();
  }

  @override
  Future<void> stop() async => finish();
  @override
  Future<void> dispose() async {}
}

/// 음성 제목 안내 순서를 [log]에 함께 남기는 기록기.
class _OrderedFeedback extends RecordingRosaryFeedback {
  _OrderedFeedback(this.log);
  final List<String> log;
  @override
  Future<void> announce(String text) async {
    log.add('title:$text');
    await super.announce(text);
  }
}

void main() {
  final steps = buildRosarySequence(MysterySet.joyful);

  group('진행 → 묵주 위치 매핑', () {
    test('73 스텝이 59알 + 십자가 + 메달에 대응하고, 알을 더하지 않는다', () {
      expect(steps.length, 73);
      var prev = -1.0;
      final beads = <int>{};
      for (var i = 0; i < steps.length; i++) {
        final p = rosaryStepPos(i), s = steps[i];
        expect(p, greaterThanOrEqualTo(prev), reason: 'step $i');
        prev = p;
        switch (s.kind) {
          case StepKind.hailMary:
            expect(rosaryNodeKind(p.toInt()), RosaryNodeKind.small);
            expect(p % 1, 0);
            beads.add(p.toInt());
          case StepKind.ourFather:
            expect(rosaryNodeKind(p.toInt()), RosaryNodeKind.big);
            beads.add(p.toInt());
          case StepKind.gloryBe || StepKind.fatima:
            // 체인 위(알 사이 소수 위치)
            expect(p % 1, isNot(0), reason: 'step $i ${s.title}');
          case StepKind.signOfCross || StepKind.apostlesCreed:
            expect(rosaryNodeKind(p.toInt()), RosaryNodeKind.cross);
          case StepKind.closing:
            expect(rosaryNodeKind(p.toInt()), RosaryNodeKind.medal);
        }
      }
      expect(beads.length, rosaryBeadCount);
      final all = [
        for (var i = 0; i < rosaryNodeCount; i++)
          if (rosaryNodeKind(i) == RosaryNodeKind.big ||
              rosaryNodeKind(i) == RosaryNodeKind.small)
            i,
      ];
      expect(all.length, 59);
      expect(beads, all.toSet());
      expect(
        all.where((i) => rosaryNodeKind(i) == RosaryNodeKind.big).length,
        6,
      );
    });

    test('영광송·구원의 기도는 10번째 알과 다음 큰 알 사이 체인 위', () {
      final glory = rosaryStepPos(7 + 11), fatima = rosaryStepPos(7 + 12);
      final ten = rosaryStepPos(7 + 10), nextOf = rosaryStepPos(7 + 13);
      expect(glory, greaterThan(ten));
      expect(fatima, greaterThan(glory));
      expect(nextOf, greaterThan(fatima));
      expect(nextOf - ten, 1);
      expect(rosaryStepPos(6), 4.5); // 서두 영광송
    });
  });

  group('당기기 판정', () {
    test('아무리 길게 끌어도 한 제스처 = 한 단계, 표시 이동은 ±1 안', () {
      final p = BeadPull();
      p.start();
      double off = 0;
      for (var i = 0; i < 30; i++) {
        off = p.update(20, 100);
      }
      expect(off, lessThanOrEqualTo(1));
      expect(p.end(0, 100, now: Duration.zero), 1);
    });

    test('임계 미달이면 제자리, 위로 당기면 이전, 빠른 연타는 한 번만', () {
      final p = BeadPull();
      const t = Duration(seconds: 1);
      p.start();
      p.update(20, 100);
      expect(p.end(0, 100, now: t), 0);
      p.start();
      p.update(-50, 100);
      expect(p.end(0, 100, now: t), -1);
      p.start();
      p.update(60, 100);
      expect(p.end(0, 100, now: t + const Duration(milliseconds: 100)), 0);
      p.start();
      p.update(60, 100);
      expect(p.end(0, 100, now: t + const Duration(milliseconds: 500)), 1);
    });
  });

  test('10번째 성모송 완료 신호는 10번째를 바친 뒤 넘길 때', () {
    final ten = steps.indexWhere((s) => s.decade == 1 && s.beadIndex == 10);
    expect(
      rosaryCueFor(steps[ten - 1], steps[ten], forward: true),
      RosaryCue.bead,
    );
    expect(
      rosaryCueFor(steps[ten], steps[ten + 1], forward: true),
      RosaryCue.tenComplete,
    );
    expect(
      rosaryCueFor(steps[ten + 1], steps[ten], forward: false),
      RosaryCue.minor,
    );
    expect(
      rosaryCueFor(steps[1], steps[2], forward: true),
      RosaryCue.ourFather,
    );
    expect(rosaryCueFor(steps[6], steps[7], forward: true), RosaryCue.mystery);
    expect(
      rosaryCueFor(steps[71], steps[72], forward: true),
      RosaryCue.rosaryComplete,
    );
    expect(rosaryVoiceTitle(steps[ten]), '성모송 열 번째입니다');
  });

  group('묵주 화면(위젯)', () {
    Future<AppSettings> load([Map<String, Object> extra = const {}]) async {
      SharedPreferences.setMockInitialValues({
        'prayer_view': 'rosary',
        'leader_audio': false,
        ...extra,
      });
      return AppSettings.load();
    }

    void phone(WidgetTester tester) {
      tester.view.devicePixelRatio = 2;
      tester.view.physicalSize = const Size(720, 1600);
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
    }

    Widget app(
      AppSettings s,
      FakeRosaryScene scene,
      RecordingRosaryFeedback fb, {
      int initialIndex = 0,
      double? textScale,
    }) => MaterialApp(
      builder: textScale == null
          ? null
          : (context, child) => MediaQuery(
              data: MediaQuery.of(context)
                  .copyWith(textScaler: TextScaler.linear(textScale)),
              child: child!,
            ),
      home: PrayerScreen(
        settings: s,
        mysterySet: MysterySet.joyful,
        initialIndex: initialIndex,
        soundPlayer: _SilentSoundPlayer(),
        rosaryScene: scene,
        rosaryFeedback: fb,
      ),
    );

    testWidgets('당기기: 아래로 길게 끌어도 한 단계, 위로 당기면 이전, 3D 는 진행을 따라간다', (
      tester,
    ) async {
      phone(tester);
      final s = await load();
      final scene = FakeRosaryScene(), fb = RecordingRosaryFeedback();
      await tester.pumpWidget(app(s, scene, fb, initialIndex: 3));
      await tester.pump();
      expect(find.text('성모송'), findsOneWidget);
      expect(find.text('1 / 3'), findsOneWidget);
      final area = find.byKey(const ValueKey('rosary-area'));
      await tester.drag(area, const Offset(0, 600));
      await tester.pump(const Duration(milliseconds: 400));
      expect(find.text('2 / 3'), findsOneWidget);
      expect(scene.calls.last.$1, 'setDrag');
      expect(scene.calls.where((c) => c.$1 == 'setStep').last.$2['step'], 4);
      await tester.drag(area, const Offset(0, -300));
      await tester.pump(const Duration(milliseconds: 400));
      expect(find.text('1 / 3'), findsOneWidget);
      // 짧게 끌면 제자리
      await tester.drag(area, const Offset(0, 20));
      await tester.pump(const Duration(milliseconds: 400));
      expect(find.text('1 / 3'), findsOneWidget);
      expect(fb.played.first.$1, RosaryCue.bead);
      expect(fb.played.last.$1, RosaryCue.minor);
    });

    testWidgets('10번째 성모송 신호, 전체 보기 전환 뒤 상태 유지, 기도문 펼침 기억, 재시작 복원', (
      tester,
    ) async {
      phone(tester);
      final s = await load();
      final scene = FakeRosaryScene(), fb = RecordingRosaryFeedback();
      final ten = steps.indexWhere((x) => x.decade == 1 && x.beadIndex == 10);
      await tester.pumpWidget(app(s, scene, fb, initialIndex: ten - 1));
      await tester.pump();
      await tester.tap(find.byKey(const ValueKey('prayer-next')));
      await tester.pump();
      expect(find.text('10 / 10'), findsOneWidget);
      expect(fb.played.map((p) => p.$1), [RosaryCue.bead]);
      await tester.tap(find.byKey(const ValueKey('prayer-next')));
      await tester.pump();
      expect(fb.played.last.$1, RosaryCue.tenComplete);
      expect(find.text('영광송'), findsOneWidget);

      // ◎ 전체 보기 → 진행 그대로, 돌아오면 현재 알
      await tester.tap(find.byKey(const ValueKey('rosary-full-toggle')));
      await tester.pump(const Duration(milliseconds: 400));
      expect(scene.fullView, isTrue);
      expect(find.byKey(const ValueKey('rosary-full-caption')), findsOneWidget);
      expect(find.byKey(const ValueKey('rosary-title')), findsNothing);
      await tester.tap(find.byKey(const ValueKey('rosary-full-toggle')));
      await tester.pump(const Duration(milliseconds: 400));
      expect(scene.fullView, isFalse);
      expect(find.text('영광송'), findsOneWidget);
      expect(scene.state['step'], ten + 1);

      // 기도문 펼치기 → 설정에 기억
      await tester.tap(find.byKey(const ValueKey('rosary-text-toggle')));
      await tester.pump();
      expect(s.rosaryTextExpanded, isTrue);
      expect(find.byKey(const ValueKey('rosary-text-panel')), findsOneWidget);

      // 앱 재시작: 같은 위치·펼침 상태로 이어서
      expect(s.savedPrayer?.stepIndex, ten + 1);
      await tester.pumpWidget(const SizedBox());
      final s2 = await AppSettings.load();
      final scene2 = FakeRosaryScene();
      await tester.pumpWidget(
        app(
          s2,
          scene2,
          RecordingRosaryFeedback(),
          initialIndex: s2.savedPrayer!.stepIndex,
        ),
      );
      await tester.pump();
      expect(find.text('영광송'), findsOneWidget);
      expect(find.byKey(const ValueKey('rosary-text-panel')), findsOneWidget);
      expect(scene2.state['step'], ten + 1);
    });

    for (final b in RosaryBackdrop.values) {
      testWidgets('360×800 글자 2배(${b.name}) 넘침 없음 + 버튼만으로 끝까지', (tester) async {
        phone(tester);
        final s = await load({
          'rosary3d_backdrop': b.name,
          'short_prayers_asked': true,
        });
        final scene = FakeRosaryScene(), fb = RecordingRosaryFeedback();
        await tester.pumpWidget(app(s, scene, fb, textScale: 2));
        await tester.pump();
        for (var i = 0; i < 73; i++) {
          if (i == 20) {
            await tester.tap(find.byKey(const ValueKey('rosary-text-toggle')));
          }
          await tester.tap(find.byKey(const ValueKey('prayer-next')));
          await tester.pump(const Duration(milliseconds: 50));
          expect(tester.takeException(), isNull, reason: 'step $i');
        }
        expect(find.text('묵주기도를 마쳤습니다'), findsOneWidget);
        expect(fb.played.where((p) => p.$1 == RosaryCue.tenComplete).length, 5);
        expect(
          fb.played.where((p) => p.$1 == RosaryCue.rosaryComplete).length,
          1,
        );
      });
    }

    testWidgets('설정 전환: 기도문 중심(기존) 화면은 그대로 동작', (tester) async {
      phone(tester);
      final s = await load({'prayer_view': 'classic'});
      final scene = FakeRosaryScene(), fb = RecordingRosaryFeedback();
      await tester.pumpWidget(app(s, scene, fb));
      await tester.pump();
      expect(find.byType(PrayerBeadStrip), findsOneWidget);
      expect(find.byKey(const ValueKey('rosary-area')), findsNothing);
      await tester.tap(find.byKey(const ValueKey('prayer-next')));
      await tester.pump();
      expect(find.text('사도신경'), findsWidgets);
      expect(fb.played, isEmpty);
    });

    testWidgets('갤러리: 다른 묵주를 보고 즐겨찾기·사용, 3D 도 같은 묵주로', (tester) async {
      SharedPreferences.setMockInitialValues({});
      final s = await AppSettings.load();
      final scene = FakeRosaryScene();
      await tester.pumpWidget(
        MaterialApp(
          home: RosaryGalleryScreen(settings: s, scene: scene),
        ),
      );
      await tester.pump();
      expect(find.byKey(const ValueKey('gallery-in-use')), findsOneWidget);
      expect(scene.fullView, isTrue);
      await tester.tap(find.byKey(const ValueKey('gallery-item-pearl')));
      await tester.pump();
      expect(scene.calls.last.$2['id'], 'pearl');
      expect(find.byKey(const ValueKey('gallery-in-use')), findsNothing);
      await tester.tap(find.byKey(const ValueKey('gallery-fav')));
      await tester.tap(find.byKey(const ValueKey('gallery-use')));
      await tester.pump();
      expect(s.rosaryId, 'pearl');
      expect(s.rosaryFavorites, {'pearl'});
      expect(find.byKey(const ValueKey('gallery-in-use')), findsOneWidget);
    });
  });

  group('묵주 목록 통합(옛 스타일 12종 → 3D 묵주)', () {
    final ids = {for (final r in rosaryCatalog) r.id};

    test('옛 12종 모두 유효한 3D id 로 매핑, 3D 16종 모두 대표 스타일이 있다', () {
      expect(rosaryCatalog.length, 16);
      expect(legacyStyleTo3d.keys.toSet(), RosaryStyle.values.toSet());
      for (final id in legacyStyleTo3d.values) {
        expect(ids, contains(id));
      }
      expect(rosaryRepresentativeStyle.keys.toSet(), ids);
    });

    for (final style in RosaryStyle.values) {
      test(
        '저장값 이전: ${style.name} → ${legacyStyleTo3d[style]}, 옛 화면·성당 색은 그대로',
        () async {
          SharedPreferences.setMockInitialValues({'rosary_style': style.name});
          final s = await AppSettings.load();
          expect(s.rosaryId, legacyStyleTo3d[style]);
          expect(s.rosaryStyle, style); // 기도문 중심 화면의 묵주 지도·성당 기도 카드 그림
          // 다시 열어도 같은 값(이전은 한 번만)
          final again = await AppSettings.load();
          expect(again.rosaryId, legacyStyleTo3d[style]);
          expect(again.rosaryStyle, style);
        },
      );
    }

    test('새 설치: 올리브 원목 + 옛 화면은 그 대표 스타일, 갤러리에서 바꾸면 옛 화면도 따라간다', () async {
      SharedPreferences.setMockInitialValues({});
      final s = await AppSettings.load();
      expect(s.rosaryId, 'olive');
      expect(s.rosaryStyle, representativeStyleFor('olive'));
      s.rosaryId = 'lapis';
      expect(s.rosaryStyle, RosaryStyle.bead);
      final again = await AppSettings.load();
      expect(again.rosaryId, 'lapis');
      expect(again.rosaryStyle, RosaryStyle.bead);
    });
  });

  group('묵주 화면 음성·묵주 바꾸기', () {
    Future<AppSettings> load([Map<String, Object> extra = const {}]) async {
      SharedPreferences.setMockInitialValues({
        'prayer_view': 'rosary',
        'leader_audio': false,
        ...extra,
      });
      return AppSettings.load();
    }

    void phone(WidgetTester tester) {
      tester.view.devicePixelRatio = 2;
      tester.view.physicalSize = const Size(720, 1600);
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
    }

    Widget app(
      AppSettings s,
      FakeRosaryScene scene,
      RosaryFeedbackSink fb, {
      int initialIndex = 0,
      LeaderVoice? voice,
    }) => MaterialApp(
      home: PrayerScreen(
        settings: s,
        mysterySet: MysterySet.joyful,
        initialIndex: initialIndex,
        soundPlayer: _SilentSoundPlayer(),
        rosaryScene: scene,
        rosaryFeedback: fb,
        leaderVoice: voice,
      ),
    );

    testWidgets('음성 제목: 칩을 켜면 넘길 때마다 제목을 소리로 알린다', (tester) async {
      phone(tester);
      final s = await load();
      final fb = RecordingRosaryFeedback();
      final ten = steps.indexWhere((x) => x.decade == 3 && x.beadIndex == 10);
      await tester.pumpWidget(
        app(s, FakeRosaryScene(), fb, initialIndex: ten - 1),
      );
      await tester.pump();
      await tester.tap(find.byKey(const ValueKey('prayer-next')));
      await tester.pump();
      expect(fb.announced, isEmpty, reason: '끈 동안은 말하지 않는다');
      await tester.tap(find.byKey(const ValueKey('rosary-voice-title')));
      await tester.pump();
      expect(s.rosaryVoiceTitle, isTrue);
      await tester.tap(find.byKey(const ValueKey('prayer-back')));
      await tester.pump();
      await tester.tap(find.byKey(const ValueKey('prayer-next')));
      await tester.pump();
      await tester.tap(find.byKey(const ValueKey('prayer-next')));
      await tester.pump();
      await tester.tap(find.byKey(const ValueKey('prayer-next')));
      await tester.pump();
      await tester.tap(find.byKey(const ValueKey('prayer-next')));
      await tester.pump();
      expect(fb.announced, [
        '성모송 아홉 번째입니다',
        '성모송 열 번째입니다',
        '영광송입니다',
        '구원을 비는 기도입니다',
        '환희의 신비 제4단입니다',
      ]);
    });

    testWidgets('음성 인도 칩: 후창이면 제목 안내 뒤에 앞단 음성, 끄면 조용히', (tester) async {
      phone(tester);
      final s = await load({'rosary3d_voice_title': true});
      final log = <String>[];
      final voice = _Voice();
      voice.log.addAll([]);
      final fb = _OrderedFeedback(log);
      await tester.pumpWidget(
        app(s, FakeRosaryScene(), fb, initialIndex: 3, voice: voice),
      );
      await tester.pump();
      await tester.tap(find.byKey(const ValueKey('rosary-voice-mode')));
      await tester.pumpAndSettle();
      await tester.tap(find.text('후창 — 앱이 앞단, 내가 뒷단'));
      await tester.pumpAndSettle();
      expect(s.prayerMode, PrayerMode.responder);
      expect(s.leaderAudioEnabled, isTrue);
      voice.log.clear();
      await tester.tap(find.byKey(const ValueKey('prayer-next')));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 10));
      expect(log, ['title:성모송 두 번째입니다']);
      expect(voice.log, ['step:성모송 2/3'], reason: '제목 안내가 끝난 뒤 앞단');
      // 끄기
      await tester.tap(find.byKey(const ValueKey('rosary-voice-mode')));
      await tester.pumpAndSettle();
      await tester.tap(find.text('음성 끄기'));
      await tester.pumpAndSettle();
      expect(s.leaderAudioEnabled, isFalse);
      voice.log.clear();
      await tester.tap(find.byKey(const ValueKey('prayer-next')));
      await tester.pump();
      expect(voice.log, isEmpty);
    });

    testWidgets('선창: 뒷단 재생 중 다음을 또 눌러도 한 단계만', (tester) async {
      phone(tester);
      final s = await load({'prayer_mode': 'leader', 'leader_audio': true});
      final voice = _Voice();
      await tester.pumpWidget(
        app(
          s,
          FakeRosaryScene(),
          RecordingRosaryFeedback(),
          initialIndex: 3,
          voice: voice,
        ),
      );
      await tester.pump();
      await tester.tap(find.byKey(const ValueKey('prayer-next')));
      await tester.pump();
      expect(voice.log.last, 'resp:성모송 1/3');
      expect(find.text('1 / 3'), findsOneWidget, reason: '뒷단을 듣는 동안은 그대로');
      await tester.tap(find.byKey(const ValueKey('prayer-next')));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 10));
      expect(find.text('2 / 3'), findsOneWidget, reason: '재생을 끊고 한 칸만');
    });

    testWidgets('기도 중 묵주 바꾸기: 진행 위치는 그대로, 3D 묵주만 바뀐다', (tester) async {
      phone(tester);
      final s = await load();
      final scene = FakeRosaryScene();
      await tester.pumpWidget(
        app(s, scene, RecordingRosaryFeedback(), initialIndex: 12),
      );
      await tester.pump();
      final before = find.text('5 / 10');
      expect(before, findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('prayer-menu')));
      await tester.pumpAndSettle();
      await tester.tap(find.text('묵주 바꾸기'));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('gallery-item-ebony')));
      await tester.pump();
      await tester.tap(find.byKey(const ValueKey('gallery-use')));
      await tester.pump();
      await tester.pageBack();
      await tester.pumpAndSettle();
      expect(
        scene.calls.where((c) => c.$1 == 'setRosary').last.$2['id'],
        'ebony',
      );
      expect(find.text('5 / 10'), findsOneWidget);
    });
  });
}
