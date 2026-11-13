import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/app/leader_audio_store.dart';
import 'package:rosary_app/app/leader_voice.dart';
import 'package:rosary_app/app/settings.dart';
import 'package:rosary_app/app/sound_player.dart';
import 'package:rosary_app/domain/prayer_data.dart';
import 'package:rosary_app/domain/rosary_sequence.dart';
import 'package:rosary_app/ui/prayer_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// 파일 시스템 없이 메모리에서만 동작하는 가짜 저장소.
class FakeLeaderAudioStore extends LeaderAudioStore {
  FakeLeaderAudioStore([Set<String> recorded = const {}])
    : _recorded = {...recorded};

  final Set<String> _recorded;

  @override
  Future<void> init() async {}

  @override
  bool has(String cueId) => _recorded.contains(cueId);

  @override
  String pathFor(String cueId) => '/nonexistent/$cueId.m4a';

  @override
  int get recordedCount => _recorded.length;
}

class FakeLeaderVoice implements LeaderVoice {
  final spoken = <String>[];

  /// 선창 모드에서 받은 뒷단 요청(스텝 제목).
  final responded = <String>[];
  final speaking = ValueNotifier<bool>(false);
  int stops = 0;

  /// true면 [speakResponder]가 곧바로 끝난다. false면 [finishResponder]까지 기다린다.
  bool autoFinishResponder = false;

  /// false면 [stop]이 재생을 끝내 주지 않는다(늦게 도착하는 완료 신호를 흉내 낸다).
  bool stopCompletesResponder = true;
  final _pending = <Completer<void>>[];

  @override
  ValueListenable<bool> get isSpeaking => speaking;

  @override
  Future<void> init() async {}

  @override
  Future<void> speakStep(RosaryStep step) async => spoken.add(step.title);

  @override
  Future<void> speakResponder(RosaryStep step) {
    responded.add(step.title);
    if (autoFinishResponder) return Future.value();
    final c = Completer<void>();
    _pending.add(c);
    return c.future;
  }

  /// 재생 중인 뒷단을 끝까지 들은 것으로 친다.
  void finishResponder() {
    for (final c in _pending) {
      if (!c.isCompleted) c.complete();
    }
    _pending.clear();
  }

  @override
  Future<void> stop() async {
    stops++;
    if (stopCompletesResponder) finishResponder();
  }

  @override
  Future<void> dispose() async {}
}

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

void main() {
  testWidgets('responder mode with no recordings still renders and advances', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues({
      'prayer_mode': 'responder',
      'leader_voice_source': 'recorded',
    });
    final settings = await AppSettings.load();
    expect(settings.leaderAudioEnabled, isTrue);

    await tester.pumpWidget(
      MaterialApp(
        home: PrayerScreen(
          settings: settings,
          mysterySet: MysterySet.joyful,
          soundPlayer: _SilentSoundPlayer(),
          leaderAudio: FakeLeaderAudioStore(),
        ),
      ),
    );
    await tester.pump();

    expect(find.text('성호경'), findsOneWidget);
    expect(find.text('선창 재생 중'), findsNothing);

    await tester.tap(find.byKey(const ValueKey('prayer-next')));
    await tester.pump();
    expect(find.text('사도신경'), findsOneWidget);
    expect(find.text('내 차례: 뒷단'), findsOneWidget);
  });

  testWidgets('leader audio disabled ignores recordings', (tester) async {
    SharedPreferences.setMockInitialValues({
      'prayer_mode': 'responder',
      'leader_audio': false,
    });
    final settings = await AppSettings.load();
    expect(settings.leaderAudioEnabled, isFalse);

    await tester.pumpWidget(
      MaterialApp(
        home: PrayerScreen(
          settings: settings,
          mysterySet: MysterySet.joyful,
          soundPlayer: _SilentSoundPlayer(),
          leaderAudio: FakeLeaderAudioStore({'sign_of_cross'}),
        ),
      ),
    );
    await tester.pump();
    expect(find.text('선창 재생 중'), findsNothing);
  });

  testWidgets('responder: speaks each step and shows the playing badge', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues({'prayer_mode': 'responder'});
    final settings = await AppSettings.load();
    expect(settings.leaderVoiceSource, LeaderVoiceSource.bundled);
    final voice = FakeLeaderVoice();

    await tester.pumpWidget(
      MaterialApp(
        home: PrayerScreen(
          settings: settings,
          mysterySet: MysterySet.joyful,
          soundPlayer: _SilentSoundPlayer(),
          leaderAudio: FakeLeaderAudioStore(),
          leaderVoice: voice,
        ),
      ),
    );
    await tester.pump();
    expect(voice.spoken, ['성호경']);

    await tester.tap(find.byKey(const ValueKey('prayer-next')));
    await tester.pump();
    expect(voice.spoken, ['성호경', '사도신경']);

    voice.speaking.value = true;
    await tester.pump();
    expect(find.text('선창 재생 중'), findsOneWidget);

    voice.speaking.value = false;
    await tester.pump();
    expect(find.text('선창 재생 중'), findsNothing);

    await tester.tap(find.byKey(const ValueKey('prayer-next')));
    await tester.pump();
    expect(find.text('주님의 기도'), findsOneWidget);
    expect(voice.spoken, ['성호경', '사도신경', '주님의 기도']);
  });

  testWidgets('solo mode never calls the leader voice', (tester) async {
    SharedPreferences.setMockInitialValues({});
    final settings = await AppSettings.load();
    final voice = FakeLeaderVoice();
    await tester.pumpWidget(
      MaterialApp(
        home: PrayerScreen(
          settings: settings,
          mysterySet: MysterySet.joyful,
          soundPlayer: _SilentSoundPlayer(),
          leaderVoice: voice,
        ),
      ),
    );
    await tester.pump();
    await tester.tap(find.byKey(const ValueKey('prayer-next')));
    await tester.pump();
    expect(voice.spoken, isEmpty);
  });

  group('선창 모드: 앱이 뒷단을 받아 준다', () {
    Finder status() => find.byKey(const ValueKey('prayer-responder-status'));
    Finder next() => find.byKey(const ValueKey('prayer-next'));

    Future<(AppSettings, FakeLeaderVoice)> pumpLeader(
      WidgetTester tester, {
      Map<String, Object> prefs = const {},
      int initialIndex = 0,
    }) async {
      SharedPreferences.setMockInitialValues({
        'prayer_mode': 'leader',
        'haptic': false,
        ...prefs,
      });
      final settings = await AppSettings.load();
      final voice = FakeLeaderVoice();
      await tester.pumpWidget(
        MaterialApp(
          home: PrayerScreen(
            settings: settings,
            mysterySet: MysterySet.joyful,
            soundPlayer: _SilentSoundPlayer(),
            leaderVoice: voice,
            initialIndex: initialIndex,
          ),
        ),
      );
      await tester.pump();
      return (settings, voice);
    }

    testWidgets('tap -> responder plays -> auto advances when it ends', (
      tester,
    ) async {
      final (_, voice) = await pumpLeader(tester, initialIndex: 1); // 사도신경
      expect(find.text('사도신경'), findsOneWidget);
      // 스텝에 들어갈 때는 아무것도 들려주지 않는다(앞단은 사용자가 한다).
      expect(voice.spoken, isEmpty);
      expect(voice.responded, isEmpty);
      expect(status(), findsNothing);

      await tester.tap(next());
      await tester.pump();
      expect(voice.responded, ['사도신경']);
      expect(status(), findsOneWidget);
      expect(find.text('뒷단 듣는 중…'), findsOneWidget);
      expect(
        find.byKey(const ValueKey('prayer-responder-highlight')),
        findsOneWidget,
      );
      expect(find.text('사도신경'), findsOneWidget); // 아직 같은 스텝

      voice.finishResponder();
      await tester.pump();
      await tester.pump();
      expect(find.text('주님의 기도'), findsOneWidget);
      expect(status(), findsNothing);
      expect(voice.spoken, isEmpty);
    });

    testWidgets('tapping the prayer text starts the responder too', (
      tester,
    ) async {
      // 글이 넘치지 않는 큰 화면(넘치면 탭은 '계속 읽기'다).
      tester.view.physicalSize = const Size(900, 2400);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.reset);
      final (_, voice) = await pumpLeader(tester, initialIndex: 1);
      await tester.tap(find.byKey(const ValueKey('prayer-text-scroll')));
      await tester.pump();
      expect(voice.responded, ['사도신경']);
      expect(status(), findsOneWidget);
    });

    testWidgets('tapping again while it plays stops it and goes on at once', (
      tester,
    ) async {
      final (_, voice) = await pumpLeader(tester, initialIndex: 1);
      await tester.tap(next());
      await tester.pump();
      expect(status(), findsOneWidget);

      await tester.tap(next());
      await tester.pump();
      expect(find.text('주님의 기도'), findsOneWidget);
      expect(status(), findsNothing);
      expect(voice.stops, greaterThan(0));
      // 늦게 끝났다고 알려도 한 번 더 넘어가지 않는다.
      voice.finishResponder();
      await tester.pump();
      await tester.pump();
      expect(find.text('주님의 기도'), findsOneWidget);
      expect(voice.responded, ['사도신경']);
    });

    testWidgets('volume-down key takes the same path (responder, then next)', (
      tester,
    ) async {
      final (_, voice) = await pumpLeader(
        tester,
        prefs: {'volume_key_advance': true},
        initialIndex: 1,
      );
      await tester.sendKeyEvent(LogicalKeyboardKey.audioVolumeDown);
      await tester.pump();
      expect(voice.responded, ['사도신경']);
      expect(status(), findsOneWidget);
      expect(find.text('사도신경'), findsOneWidget);

      // 재생 중 한 번 더 누르면 바로 다음.
      await tester.sendKeyEvent(LogicalKeyboardKey.audioVolumeDown);
      await tester.pump();
      expect(find.text('주님의 기도'), findsOneWidget);
      expect(status(), findsNothing);
    });

    testWidgets('steps without a responder part advance immediately', (
      tester,
    ) async {
      final (_, voice) = await pumpLeader(tester); // 성호경
      expect(find.text('성호경'), findsOneWidget);
      await tester.tap(next());
      await tester.pump();
      expect(find.text('사도신경'), findsOneWidget);
      expect(voice.responded, isEmpty);
      expect(status(), findsNothing);
    });

    testWidgets('voice switched off keeps the old silent behavior', (
      tester,
    ) async {
      final (_, voice) = await pumpLeader(
        tester,
        prefs: {'leader_audio': false},
        initialIndex: 1,
      );
      await tester.tap(next());
      await tester.pump();
      expect(find.text('주님의 기도'), findsOneWidget);
      expect(voice.responded, isEmpty);
      expect(voice.spoken, isEmpty);
      expect(status(), findsNothing);
    });

    testWidgets('solo mode stays silent', (tester) async {
      final (_, voice) = await pumpLeader(
        tester,
        prefs: {'prayer_mode': 'solo'},
        initialIndex: 1,
      );
      await tester.tap(next());
      await tester.pump();
      expect(find.text('주님의 기도'), findsOneWidget);
      expect(voice.responded, isEmpty);
      expect(voice.spoken, isEmpty);
    });

    testWidgets('responder mode is unchanged: leader cues, no auto advance', (
      tester,
    ) async {
      final (_, voice) = await pumpLeader(
        tester,
        prefs: {'prayer_mode': 'responder'},
        initialIndex: 1,
      );
      expect(voice.spoken, ['사도신경']);
      await tester.tap(next());
      await tester.pump();
      expect(find.text('주님의 기도'), findsOneWidget);
      expect(voice.spoken, ['사도신경', '주님의 기도']);
      expect(voice.responded, isEmpty);
      expect(status(), findsNothing);
    });

    testWidgets('going back while it plays cancels; a late finish is ignored', (
      tester,
    ) async {
      final (_, voice) = await pumpLeader(tester, initialIndex: 1);
      voice.stopCompletesResponder = false; // 멈춘 뒤에 완료가 늦게 온다
      await tester.tap(next());
      await tester.pump();
      expect(status(), findsOneWidget);

      await tester.tap(find.byKey(const ValueKey('prayer-back')));
      await tester.pump();
      expect(find.text('성호경'), findsOneWidget);
      expect(status(), findsNothing);
      expect(voice.stops, greaterThan(0));

      voice.finishResponder(); // 늦은 완료 신호
      await tester.pump();
      await tester.pump();
      expect(find.text('성호경'), findsOneWidget);
    });

    testWidgets('a late finish of an old step never skips the new step', (
      tester,
    ) async {
      final (_, voice) = await pumpLeader(tester, initialIndex: 1);
      voice.stopCompletesResponder = false;
      await tester.tap(next()); // 사도신경 뒷단 재생
      await tester.pump();
      await tester.tap(next()); // 바로 주님의 기도로
      await tester.pump();
      expect(find.text('주님의 기도'), findsOneWidget);

      voice.finishResponder(); // 사도신경 재생의 늦은 완료
      await tester.pump();
      await tester.pump();
      expect(find.text('주님의 기도'), findsOneWidget);
      expect(status(), findsNothing);
    });

    testWidgets('app going to background cancels playback without advancing', (
      tester,
    ) async {
      final (_, voice) = await pumpLeader(tester, initialIndex: 1);
      await tester.tap(next());
      await tester.pump();
      expect(status(), findsOneWidget);

      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
      await tester.pump();
      expect(status(), findsNothing);
      expect(voice.stops, greaterThan(0));
      expect(find.text('사도신경'), findsOneWidget);
    });

    testWidgets('leaving the screen while it plays stops it and is safe', (
      tester,
    ) async {
      final (_, voice) = await pumpLeader(tester, initialIndex: 1);
      voice.stopCompletesResponder = false;
      await tester.tap(next());
      await tester.pump();

      await tester.pumpWidget(const MaterialApp(home: SizedBox()));
      expect(voice.stops, greaterThan(0));
      voice.finishResponder();
      await tester.pump();
      expect(tester.takeException(), isNull);
    });

    testWidgets('a responder that ends at once still advances', (tester) async {
      final (_, voice) = await pumpLeader(tester, initialIndex: 1);
      voice.autoFinishResponder = true;
      await tester.tap(next());
      await tester.pump();
      await tester.pump();
      expect(voice.responded, ['사도신경']);
      expect(find.text('주님의 기도'), findsOneWidget);
    });

    testWidgets('keeps the saved place in step with what was prayed', (
      tester,
    ) async {
      final (settings, voice) = await pumpLeader(tester, initialIndex: 1);
      await tester.tap(next());
      await tester.pump();
      // 재생이 끝나기 전에는 위치가 바뀌지 않았다(이어하기로 시작해 저장된 것이 없다).
      expect(settings.savedPrayer, isNull);
      voice.finishResponder();
      await tester.pump();
      await tester.pump();
      expect(settings.savedPrayer?.stepIndex, 2);
    });
  });
}
