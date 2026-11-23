// 검수용(출시) 빌드에서 숨긴 것들(lib/app/release_gate.dart). `flutter test` 의 기본은 DevGlass.enabled == false
// (= 일반 빌드)라서 아래는 모두 '숨겨진 상태'를 확인한다. 개발용 빌드의 켜짐 상태는
// `flutter test --dart-define=ROSARIUM_DEV_GLASS=true test/release_gate_test.dart` 로 확인한다(그때는 반대로 기대한다).
import 'dart:io';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/app/release_gate.dart';
import 'package:rosary_app/app/rosary_style.dart';
import 'package:rosary_app/app/settings.dart';
import 'package:rosary_app/app/leader_voice.dart';
import 'package:rosary_app/app/theme.dart';
import 'package:rosary_app/church/church_catalog.dart';
import 'package:rosary_app/church/church_select_screen.dart';
import 'package:rosary_app/domain/art_credits.dart';
import 'package:rosary_app/domain/mystery_art.dart';
import 'package:rosary_app/domain/prayer_data.dart';
import 'package:rosary_app/domain/stations_series.dart';
import 'package:rosary_app/ui/settings_screen.dart';
import 'package:rosary_app/ui/widgets/rosary_glyph.dart';
import 'package:shared_preferences/shared_preferences.dart';

const _dev = ReleaseGate.showAll;

List<String> _hiddenEntries() => [
  for (final l in File('tools/release_hidden_assets.txt').readAsLinesSync())
    if (l.trim().isNotEmpty && !l.trim().startsWith('#')) l.trim(),
];

void main() {
  test('release build: every gate is closed by default', () {
    expect(_dev, isFalse, reason: 'flutter test 기본은 일반 빌드');
    expect(ReleaseGate.aiVoiceClips, _dev);
    expect(ReleaseGate.rosaryPhotos, _dev);
    expect(ReleaseGate.devGlass, _dev);
  }, skip: _dev ? '개발용 빌드에서는 켜져 있는 것이 맞다' : false);

  group('1. AI voice clips', () {
    test('a stored "bundled" source plays as device TTS', () async {
      SharedPreferences.setMockInitialValues({
        'leader_voice_source': 'bundled',
      });
      final s = await AppSettings.load();
      expect(
        s.leaderVoiceSource,
        _dev ? LeaderVoiceSource.bundled : LeaderVoiceSource.tts,
      );
      SharedPreferences.setMockInitialValues({});
      final d = await AppSettings.load(); // 기본값(저장 없음)도 마찬가지
      expect(
        d.leaderVoiceSource,
        _dev ? LeaderVoiceSource.bundled : LeaderVoiceSource.tts,
      );
    });

    testWidgets('settings hide the AI voice choice and notice', (tester) async {
      SharedPreferences.setMockInitialValues({});
      final settings = await AppSettings.load();
      tester.view.physicalSize = const Size(800, 3200);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.reset);
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light(),
          home: SettingsScreen(settings: settings),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('기기 음성'), findsWidgets);
      expect(find.text('직접 녹음'), findsOneWidget);
      expect(find.text('AI 음성(고품질)'), _dev ? findsOneWidget : findsNothing);
      expect(find.text('합성 음성 안내'), _dev ? findsOneWidget : findsNothing);
      expect(find.textContaining('(AI)'), _dev ? findsWidgets : findsNothing);
      expect(find.text('말하기 속도'), _dev ? findsNothing : findsOneWidget);
    });

    test('voice clips are not in pubspec (not bundled)', () {
      final pub = File('pubspec.yaml').readAsStringSync();
      expect(pub, isNot(contains('- assets/leader_voice')));
      expect(_hiddenEntries(), contains('assets/leader_voice/sister/'));
      expect(_hiddenEntries(), contains('assets/leader_voice/priest/'));
    });
  });

  group('2. consent-pending churches', () {
    test('Danggogae and Yeouido are closed', () {
      expect(
        ChurchSelectScreen.pendingConsentIds,
        ReleaseGate.pendingConsentChurchIds,
      );
      expect(ReleaseGate.pendingConsentChurchIds, {
        'danggogae',
        'yeouido',
      });
      for (final id in ReleaseGate.pendingConsentChurchIds) {
        expect(ChurchSelectScreen.availableIds.contains(id), _dev, reason: id);
        expect(ChurchSelectScreen.releaseIds, isNot(contains(id)));
      }
      expect(
        ChurchSelectScreen.availableIds,
        containsAll(ChurchSelectScreen.releaseIds),
      );
    });
  });

  group('2-1. unreleased fictional church (빛의 성당)', () {
    test('light is hidden in release (not even "준비 중"), open in dev builds', () {
      expect(ReleaseGate.unreleasedChurchIds, {'light'});
      expect(ChurchSelectScreen.releaseIds, isNot(contains('light')));
      expect(ChurchSelectScreen.availableIds.contains('light'), _dev);
      expect(ReleaseGate.churchListed('light'), _dev);
      expect(ChurchCatalog.listed.map((c) => c.id).contains('light'), _dev);
      // 카탈로그에는 있다(개발용 빌드가 들어가려면) — 가상의 성당으로 밝힌다
      final l = ChurchCatalog.byId['light']!;
      expect(l.place, '가상의 성당');
      expect(l.modelNote, startsWith('이 3D 성당은 실제로 있는 어느 성당과도 같지 않습니다.'));
      expect(l.modelNote, contains('가상의 성당'));
      // 다른 성당은 그대로 목록에 있다
      for (final id in ChurchSelectScreen.releaseIds) {
        expect(ReleaseGate.churchListed(id), isTrue, reason: id);
      }
      // 창 그림 팩은 일반 빌드 번들에서 빠진다
      expect(_hiddenEntries(), contains('assets/church/light/'));
      expect(File('pubspec.yaml').readAsStringSync(), isNot(contains('- assets/church/light/')));
    });
  });

  group('3. Previati series', () {
    test('not listed, St Peter uses another bundled public-domain series', () {
      final ids = StationsSeriesCatalog.all.map((s) => s.id);
      expect(ids.contains('previati'), _dev);
      expect(
        StationsSeriesCatalog.byId('previati').id,
        _dev ? 'previati' : 'fugel',
      );
      expect(
        StationsSeriesCatalog.forChurch('stpeter').id,
        _dev ? 'previati' : 'oreilly',
      );
      expect(
        StationsSeriesCatalog.assignments.values.contains('previati'),
        _dev,
      );
      if (!_dev) {
        final s = StationsSeriesCatalog.forChurch('stpeter');
        expect(
          s.license,
          isNot(StationsLicense.ccBy),
          reason: '대체 연작은 표기 의무 없는 PD',
        );
        expect(s.assetDir, isNot(contains('previati')));
        expect(
          stationsSeriesCredits.map((e) => e.assetDir),
          isNot(contains('assets/images/stations/previati')),
        );
        // 연작이 둘 이상 같은 성당에 겹치는 것은 이 한 건(라테라노와 oreilly)뿐이다.
        expect(
          StationsSeriesCatalog.churchesOf(s),
          containsAll(['stpeter', 'lateran']),
        );
      }
    });

    test('St Peter note does not mention Previati in release builds', () {
      final raw = ChurchCatalog.byId['stpeter']!.modelNote;
      expect(raw, contains('프레비아티'), reason: '원문은 개발용 빌드용으로 남긴다');
      final shown = ReleaseGate.churchNote('stpeter', raw);
      expect(shown.contains('프레비아티'), _dev);
      if (!_dev) {
        expect(shown, contains('옛 석판화 연작(1897년)'));
        expect(shown, isNot(contains('1901')));
      }
      // 다른 성당 안내문은 건드리지 않는다.
      final l = ChurchCatalog.byId['lateran']!.modelNote;
      expect(ReleaseGate.churchNote('lateran', l), l);
    });

    test('source data still lists Previati (kept for dev builds)', () {
      expect(
        StationsSeriesCatalog.allIncludingHidden.map((s) => s.id),
        contains('previati'),
      );
      expect(StationsSeriesCatalog.sourceAssignments['stpeter'], 'previati');
      expect(ReleaseGate.stationSeriesOverrides['stpeter'], 'oreilly');
    });

    test('the 3D scene pack is under assets/church/dev/ (dev builds only)', () {
      final js = File('assets/church/cross_data.js').readAsStringSync();
      expect(js, contains('dev/cross_pack_previati.js'));
      expect(
        File('assets/church/dev/cross_pack_previati.js').existsSync(),
        isTrue,
      );
      expect(
        File('assets/church/cross_pack_previati.js').existsSync(),
        isFalse,
      );
      expect(
        File('pubspec.yaml').readAsStringSync(),
        isNot(contains('previati')),
      );
      expect(_hiddenEntries(), contains('assets/images/stations/previati/'));
    });
  });

  group('4. prayer backgrounds from Vatican/Italian public collections', () {
    test('seven backgrounds and their credit lines are hidden', () {
      expect(ReleaseGate.hiddenMysteryArt, hasLength(7));
      expect(ReleaseGate.hiddenMysteryArtCreditUses, hasLength(7));
      var hidden = 0;
      for (final set in MysterySet.values) {
        for (var d = 1; d <= 5; d++) {
          final raw = mysteryArtFor(set, d);
          final shown = visibleMysteryArtFor(set, d);
          if (ReleaseGate.hiddenMysteryArt.contains(raw.asset)) {
            hidden++;
            expect(shown, _dev ? isNotNull : isNull, reason: raw.asset);
          } else {
            expect(shown, isNotNull, reason: raw.asset);
          }
        }
      }
      expect(hidden, 7);
      // 〈거룩한 변모〉(빛 4단)
      expect(
        visibleMysteryArtFor(MysterySet.luminous, 4),
        _dev ? isNotNull : isNull,
      );
      final uses = visibleMysteryArtCredits.map((c) => c.use).toSet();
      for (final u in ReleaseGate.hiddenMysteryArtCreditUses) {
        expect(uses.contains(u), _dev, reason: u);
      }
      // 숨긴 출처 줄은 실제 작품(이탈리아·바티칸 소장)과 짝이 맞는다.
      final txt = [
        for (final c in mysteryArtCredits)
          if (ReleaseGate.hiddenMysteryArtCreditUses.contains(c.use)) c.credit,
      ].join('\n');
      for (final k in ['산 마르코', '우피치', '카포디몬테', '산세폴크로', '바티칸']) {
        expect(txt, contains(k));
      }
    });

    test('hidden backgrounds are not bundled; the rest are', () {
      final pub = File('pubspec.yaml').readAsStringSync();
      for (final a in ReleaseGate.hiddenMysteryArt) {
        expect(pub, isNot(contains('- $a')), reason: a);
        expect(_hiddenEntries(), contains(a));
        expect(
          File(a).existsSync(),
          isTrue,
          reason: '원본은 저장소에 남는다(개발용 빌드가 쓴다)',
        );
      }
      for (final set in MysterySet.values) {
        for (var d = 1; d <= 5; d++) {
          final raw = mysteryArtFor(set, d).asset;
          if (!raw.startsWith('assets/images/mysteries/')) continue;
          if (!ReleaseGate.hiddenMysteryArt.contains(raw)) {
            expect(pub, contains('- $raw'), reason: raw);
          }
        }
      }
    });
  });

  group('5. rosary images of unknown provenance', () {
    test('not bundled', () {
      final pub = File('pubspec.yaml').readAsStringSync();
      expect(
        pub,
        isNot(matches(RegExp(r'^\s*- assets/images/\s*$', multiLine: true))),
      );
      expect(_hiddenEntries(), contains('assets/images/'));
      for (final s in RosaryStyle.values) {
        expect(File(s.fullImage).existsSync(), isTrue);
        expect(File(s.unitImage).existsSync(), isTrue);
      }
    });

    testWidgets('a plain glyph is drawn instead of the picture', (
      tester,
    ) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light(),
          home: Column(
            children: [
              for (final s in RosaryStyle.values)
                RosaryStyleImage(style: s, size: 48),
            ],
          ),
        ),
      );
      await tester.pump();
      if (_dev) return;
      expect(find.byType(Image), findsNothing);
      expect(
        find.byKey(const ValueKey('rosary-glyph')),
        findsNWidgets(RosaryStyle.values.length),
      );
      expect(tester.takeException(), isNull);
    });
  });

  group('6. Milan dev glass', () {
    test('only in dev builds', () {
      expect(ReleaseGate.devGlass, _dev);
      final pub = File('pubspec.yaml').readAsStringSync();
      expect(pub, isNot(contains('assets/church/dev')));
      expect(File('assets/church/dev/gpack_dev_milan.js').existsSync(), isTrue);
    });
  });

  group('9. launcher icon', () {
    test('original icon at every mipmap size (dark brown ground)', () {
      const sizes = {
        'mdpi': 48,
        'hdpi': 72,
        'xhdpi': 96,
        'xxhdpi': 144,
        'xxxhdpi': 192,
      };
      sizes.forEach((d, px) {
        final f = File('android/app/src/main/res/mipmap-$d/ic_launcher.png');
        final b = f.readAsBytesSync();
        final bd = ByteData.sublistView(Uint8List.fromList(b.sublist(16, 24)));
        expect([bd.getUint32(0), bd.getUint32(4)], [px, px], reason: d);
        // Flutter 기본 로고 PNG(팔레트 PNG, 수 KB 이하)가 아니라 새로 그린 RGB PNG 인가(색 유형 2).
        expect(b[25], 2, reason: '$d: RGB 8비트');
      });
      // 적응형 아이콘: 배경색 + 투명 바탕 전경(RGBA, 색 유형 6)
      final xml = File(
        'android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml',
      ).readAsStringSync();
      expect(xml, contains('@mipmap/ic_launcher_foreground'));
      expect(
        File('android/app/src/main/res/values/ic_launcher_background.xml')
            .readAsStringSync(),
        contains('#140806'),
      );
      final fg = File(
        'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png',
      ).readAsBytesSync();
      expect(fg[25], 6);
    });
  });

  group('bundle exclusion list', () {
    test('release_hidden_assets.txt entries exist and are not in pubspec', () {
      final pub = File('pubspec.yaml').readAsStringSync();
      final entries = _hiddenEntries();
      expect(entries, isNotEmpty);
      for (final e in entries) {
        expect(
          pub,
          isNot(
            matches(
              RegExp('^\\s*- ${RegExp.escape(e)}\\s*\$', multiLine: true),
            ),
          ),
          reason: e,
        );
        expect(
          FileSystemEntity.typeSync(e),
          isNot(FileSystemEntityType.notFound),
          reason: e,
        );
      }
    });
  });
}
