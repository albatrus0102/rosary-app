// ignore_for_file: depend_on_referenced_packages
// 기도 배경 성가(오르간): 설정, 재생 조건(붙잡기·백그라운드), 목소리 나올 때 낮추기, 성삼일 침묵, 곡 목록·출처.
import 'dart:async';
import 'dart:io';
import 'dart:math';

import 'package:fake_async/fake_async.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/app/prayer_music.dart';
import 'package:rosary_app/app/settings.dart';
import 'package:rosary_app/app/sound_player.dart';
import 'package:rosary_app/church/church_liturgy.dart';
import 'package:rosary_app/church/church_prayer_card.dart';
import 'package:rosary_app/domain/art_credits.dart';
import 'package:rosary_app/domain/liturgical_season.dart';
import 'package:rosary_app/domain/prayer_data.dart';
import 'package:rosary_app/domain/prayer_music_tracks.dart';
import 'package:rosary_app/ui/art_credits_screen.dart';
import 'package:rosary_app/ui/prayer_music_sheet.dart';
import 'package:rosary_app/ui/prayer_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'church_screen_fakes.dart';
import 'widget_leader_test.dart' show FakeLeaderVoice;

/// 재생기에 간 호출을 그대로 적어 두는 가짜.
class FakeMusicBackend implements MusicBackend {
  final log = <String>[];
  final _complete = StreamController<void>.broadcast();
  bool disposed = false;

  /// 마지막으로 틀어 달라고 한 자산.
  String? asset;

  /// 마지막으로 준 음량.
  double volume = 0;
  bool playing = false;

  @override
  Future<void> play(String asset, double volume) async {
    this.asset = asset;
    this.volume = volume;
    playing = true;
    log.add('play ${asset.split('/').last} ${volume.toStringAsFixed(3)}');
  }

  @override
  Future<void> setVolume(double volume) async {
    this.volume = volume;
    log.add('volume ${volume.toStringAsFixed(3)}');
  }

  @override
  Future<void> pause() async {
    playing = false;
    log.add('pause');
  }

  @override
  Future<void> resume() async {
    playing = true;
    log.add('resume');
  }

  @override
  Future<void> stop() async {
    playing = false;
    log.add('stop');
  }

  @override
  Stream<void> get onComplete => _complete.stream;

  /// 곡이 끝까지 재생된 것으로 친다.
  void finishTrack() => _complete.add(null);

  @override
  Future<void> dispose() async {
    disposed = true;
    log.add('dispose');
  }
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

Future<AppSettings> _settings([Map<String, Object> values = const {}]) async {
  SharedPreferences.setMockInitialValues({...values});
  return AppSettings.load();
}

/// 밀린 마이크로태스크(재생기 호출 줄)를 비운다.
Future<void> _flush() async {
  for (var i = 0; i < 8; i++) {
    await Future<void>.delayed(Duration.zero);
  }
}

/// 메뉴·시트 애니메이션이 끝나게 한다(기도 화면에는 끝나지 않는 애니메이션이 있어 pumpAndSettle 을 못 쓴다).
Future<void> _settle(WidgetTester tester) async {
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 400));
  await tester.pump(const Duration(milliseconds: 400));
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('설정', () {
    test('기본: 꺼짐 · 섞어 듣기 · 낮은 음량 · 성당에서는 안 틂', () async {
      final s = await _settings();
      expect(s.prayerMusic, isFalse);
      expect(s.prayerMusicTrack, kMusicShuffle);
      expect(s.prayerMusicVolume, AppSettings.defaultPrayerMusicVolume);
      expect(s.prayerMusicVolume, lessThanOrEqualTo(0.4));
      expect(s.prayerMusicInChurch, isFalse);
    });

    test('바꾼 값은 저장되고 다시 읽힌다, 음량은 범위 안으로', () async {
      final s = await _settings();
      var notified = 0;
      s.addListener(() => notified++);
      s.prayerMusic = true;
      s.prayerMusicTrack = 'organ_ave_maria';
      s.prayerMusicVolume = 7;
      s.prayerMusicInChurch = true;
      expect(notified, 4);
      expect(s.prayerMusicVolume, AppSettings.maxPrayerMusicVolume);
      s.prayerMusicVolume = 0;
      expect(s.prayerMusicVolume, AppSettings.minPrayerMusicVolume);

      final again = await AppSettings.load();
      expect(again.prayerMusic, isTrue);
      expect(again.prayerMusicTrack, 'organ_ave_maria');
      expect(again.prayerMusicVolume, AppSettings.minPrayerMusicVolume);
      expect(again.prayerMusicInChurch, isTrue);
    });
  });

  group('재생 조건', () {
    late FakeMusicBackend backend;
    late int created;

    PrayerMusic make(AppSettings s, {bool Function()? silent, Random? random}) {
      created = 0;
      final m = PrayerMusic(
        s,
        backend: () {
          created++;
          return backend = FakeMusicBackend();
        },
        silent: silent ?? () => false,
        random: random ?? Random(1),
        fade: Duration.zero,
        observeLifecycle: false,
      );
      addTearDown(m.dispose);
      return m;
    }

    test('꺼져 있으면(기본) 기도 화면이 붙잡아도 재생기를 만들지 않는다', () async {
      final s = await _settings();
      final m = make(s);
      final h = m.hold('prayer');
      await _flush();
      expect(created, 0);
      expect(m.audible, isFalse);
      h.release();
    });

    test('켜져 있어도 붙잡은 화면이 없으면 울리지 않는다', () async {
      final s = await _settings({'prayer_music': true});
      final m = make(s);
      await _flush();
      expect(created, 0);
      expect(m.wanted, isFalse);
    });

    test('켜고 붙잡으면 낮은 음량으로 틀고, 놓으면 멈추고 재생기를 놓는다', () async {
      final s = await _settings({
        'prayer_music': true,
        'prayer_music_track': 'organ_salve_regina',
      });
      final m = make(s);
      final h = m.hold('prayer');
      await _flush();
      expect(created, 1);
      expect(backend.log, ['play organ_salve_regina.m4a 0.300']);
      expect(m.current?.id, 'organ_salve_regina');
      expect(m.audible, isTrue);

      h.release();
      await _flush();
      expect(backend.log.sublist(1), ['stop', 'dispose']);
      expect(m.current, isNull);
    });

    test('두 화면이 붙잡으면 둘 다 놓을 때까지 이어진다', () async {
      final s = await _settings({'prayer_music': true});
      final m = make(s);
      final a = m.hold('church_rosary');
      final b = m.hold('prayer');
      await _flush();
      a.release();
      await _flush();
      expect(backend.playing, isTrue);
      expect(backend.disposed, isFalse);
      b.release();
      await _flush();
      expect(backend.disposed, isTrue);
    });

    test('기도 중에 설정을 켜면 바로 틀고, 끄면 멈춘다', () async {
      final s = await _settings();
      final m = make(s);
      m.hold('prayer');
      s.prayerMusic = true;
      await _flush();
      expect(backend.playing, isTrue);
      final first = backend;
      s.prayerMusic = false;
      await _flush();
      expect(first.log.last, 'dispose');
      expect(m.audible, isFalse);
    });

    test('음량을 바꾸면 재생 중인 곡에 바로 반영된다', () async {
      final s = await _settings({'prayer_music': true});
      final m = make(s);
      m.hold('prayer');
      await _flush();
      s.prayerMusicVolume = 0.6;
      await _flush();
      expect(backend.volume, closeTo(0.6, 1e-9));
    });

    test('앱이 뒤로 가면 멈추고, 돌아오면 이어서 튼다', () async {
      final s = await _settings({'prayer_music': true});
      final m = make(s);
      m.hold('prayer');
      await _flush();
      m.didChangeAppLifecycleState(AppLifecycleState.paused);
      await _flush();
      expect(backend.log.last, 'pause');
      expect(backend.playing, isFalse);
      expect(m.audible, isFalse);
      // 뒤에 있는 동안 곡이 끝났다는 신호가 와도 새 곡을 틀지 않는다.
      backend.finishTrack();
      await _flush();
      expect(backend.playing, isFalse);

      m.didChangeAppLifecycleState(AppLifecycleState.resumed);
      await _flush();
      expect(backend.log.last, 'resume');
      expect(backend.playing, isTrue);
      expect(created, 1);
    });

    test('알림 창 등으로 잠깐 비활성(inactive)이 되어도 멈춘다', () async {
      final s = await _settings({'prayer_music': true});
      final m = make(s);
      m.hold('prayer');
      await _flush();
      m.didChangeAppLifecycleState(AppLifecycleState.inactive);
      await _flush();
      expect(backend.playing, isFalse);
    });
  });

  group('목소리가 나올 때 낮추기', () {
    late FakeMusicBackend backend;

    PrayerMusic make(AppSettings s, {Duration fade = Duration.zero}) {
      final m = PrayerMusic(
        s,
        backend: () => backend = FakeMusicBackend(),
        silent: () => false,
        fade: fade,
        observeLifecycle: false,
      );
      addTearDown(m.dispose);
      return m;
    }

    test('선창·후창 음성이 말하는 동안 1/4 로 낮췄다가 끝나면 되돌린다', () async {
      final s = await _settings({'prayer_music': true});
      final m = make(s);
      m.hold('prayer');
      await _flush();
      final voice = Object();
      m.setSpeaking(voice, true);
      await _flush();
      expect(m.ducked, isTrue);
      expect(backend.volume, closeTo(0.3 * PrayerMusic.duckFactor, 1e-9));
      expect(backend.playing, isTrue, reason: '멈추지 않고 작게만 한다');

      m.setSpeaking(voice, false);
      await _flush();
      expect(m.ducked, isFalse);
      expect(backend.volume, closeTo(0.3, 1e-9));
    });

    test('두 목소리가 겹치면 둘 다 끝나야 되돌린다', () async {
      final s = await _settings({'prayer_music': true});
      final m = make(s);
      m.hold('prayer');
      await _flush();
      final a = Object(), b = Object();
      m.setSpeaking(a, true);
      m.setSpeaking(b, true);
      m.setSpeaking(a, false);
      await _flush();
      expect(backend.volume, closeTo(0.075, 1e-9));
      m.setSpeaking(b, false);
      await _flush();
      expect(backend.volume, closeTo(0.3, 1e-9));
    });

    test('duckWhile: 음성 제목 안내가 끝날 때까지(실패해도) 낮춘다', () async {
      final s = await _settings({'prayer_music': true});
      final m = make(s);
      m.hold('prayer');
      await _flush();
      final speech = Completer<void>();
      final done = m.duckWhile(speech.future);
      await _flush();
      expect(backend.volume, closeTo(0.075, 1e-9));
      speech.complete();
      await done;
      await _flush();
      expect(backend.volume, closeTo(0.3, 1e-9));

      final failing = Completer<void>();
      final failed = m.duckWhile(failing.future);
      failing.completeError(StateError('tts'));
      await expectLater(failed, throwsStateError);
      await _flush();
      expect(m.ducked, isFalse);
      expect(backend.volume, closeTo(0.3, 1e-9));
    });

    test('말하는 중에 시작하면 처음부터 낮은 음량으로 튼다', () async {
      final s = await _settings({'prayer_music': true});
      final m = make(s);
      m.setSpeaking('voice', true);
      m.hold('prayer');
      await _flush();
      expect(backend.log.single, endsWith('0.075'));
    });

    test('낮추기·되돌리기는 뚝 끊기지 않고 서서히 옮긴다', () async {
      final s = await _settings({'prayer_music': true});
      fakeAsync((async) {
        final m = make(s, fade: const Duration(milliseconds: 400));
        m.hold('prayer');
        async.flushMicrotasks();
        m.setSpeaking('voice', true);
        async.elapse(const Duration(milliseconds: 200));
        expect(backend.volume, lessThan(0.3));
        expect(backend.volume, greaterThan(0.075));
        async.elapse(const Duration(milliseconds: 300));
        expect(backend.volume, closeTo(0.075, 1e-9));
        final steps = backend.log.where((l) => l.startsWith('volume')).length;
        expect(steps, greaterThanOrEqualTo(6));
        m.dispose();
        async.flushMicrotasks();
      });
    });
  });

  group('성삼일 침묵', () {
    tearDown(() {
      ChurchLiturgy.clock = DateTime.now;
      ChurchLiturgy.preview.value = LiturgyPreview.today;
    });

    late FakeMusicBackend? backend;

    PrayerMusic make(AppSettings s, {bool Function()? silent}) {
      backend = null;
      final m = PrayerMusic(
        s,
        backend: () => backend = FakeMusicBackend(),
        silent: silent,
        clock: () => ChurchLiturgy.clock(),
        fade: Duration.zero,
        observeLifecycle: false,
      );
      addTearDown(m.dispose);
      return m;
    }

    test('성금요일에는 켜져 있어도 울리지 않는다', () async {
      // 2026-04-03(성금요일) 정오 KST
      ChurchLiturgy.clock = () => DateTime.utc(2026, 4, 3, 3);
      final s = await _settings({'prayer_music': true});
      final m = make(s);
      m.hold('prayer');
      await _flush();
      expect(m.silent, isTrue);
      expect(m.wanted, isTrue);
      expect(m.audible, isFalse);
      expect(backend, isNull);
    });

    test('성목요일 저녁 8시(KST)부터 성토요일 저녁 7시 전까지', () async {
      final s = await _settings({'prayer_music': true});
      final m = make(s);
      bool silentAt(DateTime utc) {
        ChurchLiturgy.clock = () => utc;
        return m.silent;
      }

      expect(silentAt(DateTime.utc(2026, 4, 2, 10)), isFalse); // 목 19:00
      expect(silentAt(DateTime.utc(2026, 4, 2, 12)), isTrue); // 목 21:00
      expect(silentAt(DateTime.utc(2026, 4, 4, 9)), isTrue); // 토 18:00
      expect(silentAt(DateTime.utc(2026, 4, 4, 11)), isFalse); // 토 20:00
      expect(silentAt(DateTime.utc(2026, 4, 5, 3)), isFalse); // 부활 대축일
    });

    test('기도하는 중에 침묵 시각이 되면 멈추고, 끝나면 다시 튼다', () async {
      final s = await _settings({'prayer_music': true});
      fakeAsync((async) {
        // 성목요일 19:59:30 KST
        final start = DateTime.utc(2026, 4, 2, 10, 59, 30);
        ChurchLiturgy.clock = () => start.add(async.elapsed);
        final m = make(s);
        m.hold('prayer');
        async.flushMicrotasks();
        expect(backend!.playing, isTrue);

        async.elapse(const Duration(seconds: 40));
        expect(m.silent, isTrue);
        expect(backend!.playing, isFalse);
        expect(backend!.log.last, 'pause');

        // 성토요일 19:00 KST 를 지나면 다시 울린다.
        async.elapse(const Duration(hours: 47));
        expect(m.silent, isFalse);
        expect(backend!.playing, isTrue);
        m.dispose();
        async.flushMicrotasks();
      });
    });

    testWidgets('성가 시트: 침묵 중에 켜면 안내 문구를 보인다', (tester) async {
      final s = await _settings();
      PrayerMusic.debugBackendFactory = FakeMusicBackend.new;
      addTearDown(() => PrayerMusic.debugBackendFactory = null);
      ChurchLiturgy.clock = () => DateTime.utc(2026, 4, 3, 3);
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(body: PrayerMusicSheet(settings: s)),
        ),
      );
      expect(find.text(kMusicTriduumNote), findsNothing);
      await tester.tap(find.byKey(const ValueKey('music-enabled')));
      await tester.pump();
      expect(s.prayerMusic, isTrue);
      expect(find.text(kMusicTriduumNote), findsWidgets);
      expect(PrayerMusic.of(s).audible, isFalse);
      await tester.pumpWidget(const SizedBox());
    });
  });

  group('곡 고르기', () {
    late List<FakeMusicBackend> backends;

    PrayerMusic make(AppSettings s) {
      backends = [];
      final m = PrayerMusic(
        s,
        backend: () {
          final b = FakeMusicBackend();
          backends.add(b);
          return b;
        },
        silent: () => false,
        random: Random(3),
        fade: Duration.zero,
        observeLifecycle: false,
      );
      addTearDown(m.dispose);
      return m;
    }

    test('한 곡을 고르면 그 곡만 되풀이한다', () async {
      final s = await _settings({
        'prayer_music': true,
        'prayer_music_track': 'organ_adoro_te',
      });
      final m = make(s);
      m.hold('prayer');
      await _flush();
      backends.single.finishTrack();
      await _flush();
      expect(
        backends.single.log.where((l) => l.startsWith('play')),
        everyElement(contains('organ_adoro_te.m4a')),
      );
      expect(backends.single.log.where((l) => l.startsWith('play')).length, 2);
      expect(m.current?.id, 'organ_adoro_te');
    });

    test('섞어 듣기: 곡이 끝나면 다른 곡으로 넘어간다', () async {
      final s = await _settings({'prayer_music': true});
      final m = make(s);
      m.hold('prayer');
      await _flush();
      final played = <String>[m.current!.id];
      for (var i = 0; i < 12; i++) {
        backends.single.finishTrack();
        await _flush();
        played.add(m.current!.id);
      }
      for (var i = 1; i < played.length; i++) {
        expect(played[i], isNot(played[i - 1]), reason: '같은 곡을 연달아 틀지 않는다');
      }
      expect(played.toSet().length, greaterThan(2));
    });

    test('재생 중에 곡을 바꾸면 바로 그 곡을 튼다', () async {
      final s = await _settings({
        'prayer_music': true,
        'prayer_music_track': 'organ_adoro_te',
      });
      final m = make(s);
      m.hold('prayer');
      await _flush();
      s.prayerMusicTrack = 'organ_ubi_caritas';
      await _flush();
      expect(backends.single.asset, 'assets/music/organ_ubi_caritas.m4a');
      expect(m.current?.id, 'organ_ubi_caritas');
    });

    test('지워진 곡 id 가 저장돼 있으면 섞어 듣기로 튼다', () async {
      final s = await _settings({
        'prayer_music': true,
        'prayer_music_track': 'gone',
      });
      final m = make(s);
      m.hold('prayer');
      await _flush();
      expect(m.current, isNotNull);
    });
  });

  group('곡 목록 · 출처', () {
    test('3~4곡 이상, 파일이 있고 합쳐서 10MB 미만', () {
      expect(bundledMusicTracks.length, inInclusiveRange(3, 4));
      var total = 0;
      for (final t in prayerMusicTracks) {
        final f = File(t.asset);
        expect(f.existsSync(), isTrue, reason: t.asset);
        expect(t.asset, startsWith('assets/music/'));
        total += f.lengthSync();
      }
      expect(total, lessThan(10 * 1024 * 1024));
      expect(
        prayerMusicTracks.map((t) => t.id).toSet().length,
        prayerMusicTracks.length,
      );
    });

    test('pubspec 에 assets/music/ 가 등록돼 있다', () {
      expect(File('pubspec.yaml').readAsStringSync(), contains('- assets/music/'));
    });

    test('곡마다 제작 방식·라이선스·출처 주소를 적는다', () {
      expect(musicCredits.length, prayerMusicTracks.length);
      for (final t in bundledMusicTracks) {
        expect(t.license, contains('CC0'), reason: t.id);
        expect(
          t.license,
          contains('https://creativecommons.org/publicdomain/zero/1.0/'),
        );
        expect(t.credit, contains('합성음'), reason: '녹음이 아님을 밝힌다');
        expect(t.credit, contains('GregoBase'));
        expect(t.source, startsWith('https://gregobase.selapa.net/chant.php?id='));
      }
      final doc = File('licenses/MUSIC.md').readAsStringSync();
      for (final t in prayerMusicTracks) {
        expect(doc, contains(t.asset.split('/').last), reason: t.id);
        expect(doc, contains(t.source), reason: t.id);
      }
    });

    testWidgets('출처 화면에 기도 음악 섹션이 있다', (tester) async {
      await tester.pumpWidget(const MaterialApp(home: ArtCreditsScreen()));
      await tester.scrollUntilVisible(
        find.byKey(const ValueKey('music-credits-disclosure')),
        600,
      );
      expect(find.text('기도 음악(성가)'), findsOneWidget);
      await tester.scrollUntilVisible(
        find.text(bundledMusicTracks.last.title),
        300,
      );
      expect(find.textContaining('합성음'), findsWidgets);
    });
  });

  group('기도 화면', () {
    late List<FakeMusicBackend> backends;
    setUp(() {
      backends = [];
      PrayerMusic.debugBackendFactory = () {
        final b = FakeMusicBackend();
        backends.add(b);
        return b;
      };
    });
    tearDown(() => PrayerMusic.debugBackendFactory = null);

    Future<void> pumpPrayer(
      WidgetTester tester,
      AppSettings settings, {
      FakeLeaderVoice? voice,
    }) async {
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
    }

    testWidgets('기본은 꺼짐: 기도 화면을 열어도 아무것도 틀지 않는다', (tester) async {
      final s = await _settings();
      await pumpPrayer(tester, s);
      expect(backends, isEmpty);
      await tester.pumpWidget(const SizedBox());
    });

    testWidgets('⋮ 메뉴의 ♪ 성가 듣기로 켜고 끈다, 화면을 닫으면 멈춘다', (tester) async {
      final s = await _settings({'prayer_music_track': 'organ_ave_maria'});
      await pumpPrayer(tester, s);
      await tester.tap(find.byKey(const ValueKey('prayer-menu')));
      await _settle(tester);
      expect(find.text('♪ 성가 듣기'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('prayer-menu-music')));
      await _settle(tester);
      expect(s.prayerMusic, isTrue);
      expect(backends.single.asset, 'assets/music/organ_ave_maria.m4a');
      expect(backends.single.playing, isTrue);
      expect(PrayerMusic.of(s).audible, isTrue);

      // 화면을 닫으면 멈추고 재생기를 놓는다.
      await tester.pumpWidget(const SizedBox());
      await _settle(tester);
      expect(backends.single.disposed, isTrue);
      expect(PrayerMusic.of(s).audible, isFalse);
    });

    testWidgets('메뉴의 성가 고르기 시트에서 곡과 음량을 바꾼다', (tester) async {
      final s = await _settings({'prayer_music': true});
      await pumpPrayer(tester, s);
      await tester.tap(find.byKey(const ValueKey('prayer-menu')));
      await _settle(tester);
      await tester.tap(find.byKey(const ValueKey('prayer-menu-music-options')));
      await _settle(tester);
      expect(find.text('성가 · 배경 음악'), findsOneWidget);
      expect(find.text('섞어 듣기'), findsOneWidget);
      for (final t in bundledMusicTracks) {
        expect(find.byKey(ValueKey('music-track-${t.id}')), findsOneWidget);
      }
      await tester.tap(
        find.byKey(const ValueKey('music-track-organ_salve_regina')),
      );
      await _settle(tester);
      expect(s.prayerMusicTrack, 'organ_salve_regina');
      expect(backends.single.asset, 'assets/music/organ_salve_regina.m4a');
      await tester.pumpWidget(const SizedBox());
    });

    testWidgets('후창 모드: 선창 음성이 나오는 동안 성가를 낮췄다가 되돌린다', (tester) async {
      final s = await _settings({
        'prayer_mode': 'responder',
        'prayer_music': true,
        'prayer_music_track': 'organ_ave_maria',
      });
      final voice = FakeLeaderVoice();
      await pumpPrayer(tester, s, voice: voice);
      await tester.pump(const Duration(milliseconds: 600));
      expect(backends.single.volume, closeTo(0.3, 1e-9));

      voice.speaking.value = true;
      await tester.pump(const Duration(milliseconds: 600));
      expect(backends.single.playing, isTrue);
      expect(backends.single.volume, closeTo(0.075, 1e-9));

      voice.speaking.value = false;
      await tester.pump(const Duration(milliseconds: 600));
      expect(backends.single.volume, closeTo(0.3, 1e-9));
      await tester.pumpWidget(const SizedBox());
    });

    testWidgets('말하는 중에 화면을 닫아도 낮춘 상태가 남지 않는다', (tester) async {
      final s = await _settings({
        'prayer_mode': 'responder',
        'prayer_music': true,
      });
      final voice = FakeLeaderVoice();
      await pumpPrayer(tester, s, voice: voice);
      voice.speaking.value = true;
      await tester.pump(const Duration(milliseconds: 600));
      expect(PrayerMusic.of(s).ducked, isTrue);
      await tester.pumpWidget(const SizedBox());
      await tester.pump();
      expect(PrayerMusic.of(s).ducked, isFalse);
    });
  });

  group('성당 묵주기도', () {
    late List<FakeMusicBackend> backends;
    setUp(() {
      backends = [];
      PrayerMusic.debugBackendFactory = () {
        final b = FakeMusicBackend();
        backends.add(b);
        return b;
      };
    });
    tearDown(() => PrayerMusic.debugBackendFactory = null);

    testWidgets('성당 안에서도 듣기: 성가가 울리면 성당 오르간 패드를 끄고, 멎으면 다시 켠다', (
      tester,
    ) async {
      final h = await pumpChurch(tester);
      final m = PrayerMusic.of(h.settings);
      await _settle(tester);
      expect(m.audible, isFalse);
      expect(backends, isEmpty, reason: '기본은 꺼짐: 성당에 들어가도 틀지 않는다');

      h.settings.prayerMusic = true;
      await _settle(tester);
      expect(m.audible, isFalse, reason: '성당 안에서도 듣기를 켜야 걷는 동안 울린다');

      h.settings.prayerMusicInChurch = true;
      await _settle(tester);
      expect(m.audible, isTrue);
      expect(backends.last.playing, isTrue);
      expect(h.scene.lastArgs('setAmbient'), {'on': false});
      expect(
        h.scene.lastArgs('setSteps')!['chant'],
        true,
        reason: '성가가 울리면 발소리를 그보다 더 낮춘다(웹 stepGain)',
      );

      h.settings.prayerMusicInChurch = false;
      await _settle(tester);
      expect(m.audible, isFalse);
      expect(h.scene.lastArgs('setAmbient'), {'on': true});

      // 성당을 나가면 붙잡은 것을 놓는다.
      h.settings.prayerMusicInChurch = true;
      await _settle(tester);
      expect(m.audible, isTrue);
      await tester.pumpWidget(const SizedBox());
      await _settle(tester);
      expect(m.audible, isFalse);
      expect(backends.every((b) => b.disposed), isTrue);
    });

    test('앉아서 기도하는 동안만 울린다(쉬는 중·일어서면 멈춤)', () async {
      final s = await _settings({'prayer_music': true});
      final c = ChurchPrayerController(
        settings: s,
        mysterySet: MysterySet.joyful,
      );
      final m = PrayerMusic.of(s);
      await _flush();
      expect(m.audible, isFalse, reason: '아직 앉지 않았다');

      c.start();
      await _flush();
      expect(m.audible, isTrue);
      expect(backends.single.playing, isTrue);

      c.pause();
      await _flush();
      expect(m.audible, isFalse);
      expect(backends.single.disposed, isTrue);

      c.resume();
      await _flush();
      expect(m.audible, isTrue);

      c.stop();
      await _flush();
      expect(m.audible, isFalse);

      c.start();
      await _flush();
      expect(m.audible, isTrue);
      c.dispose();
      await _flush();
      expect(m.audible, isFalse);
      expect(backends.every((b) => b.disposed), isTrue);
    });
  });
}
