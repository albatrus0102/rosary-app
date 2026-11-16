import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/app/settings.dart';
import 'package:rosary_app/app/skins.dart';
import 'package:rosary_app/app/theme.dart';
import 'package:rosary_app/church/church_theme.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// 한국 시각 [y]-[m]-[d] 정오(UTC 03:00)의 순간.
DateTime kst(int y, int m, int d) => DateTime.utc(y, m, d, 3);

/// 스킨 한 벌의 (이름, 토큰, 밝기) 전부.
Iterable<(String, SkinTokens, Brightness)> _variants() sync* {
  for (final s in kSkins) {
    if (s.light != null) yield ('${s.id} light', s.light!, Brightness.light);
    if (s.dark != null) yield ('${s.id} dark', s.dark!, Brightness.dark);
  }
}

/// theme_contrast_test.dart 와 같은 짝: 텍스트·아이콘 4.5:1, 비텍스트 3:1.
List<String> schemeFailures(ColorScheme s) {
  final pairs = <(String, Color, Color, double)>[
    ('onSurface/surface', s.onSurface, s.surface, 4.5),
    ('onSurfaceVariant/surface', s.onSurfaceVariant, s.surface, 4.5),
    (
      'onSurface/surfaceContainerLowest',
      s.onSurface,
      s.surfaceContainerLowest,
      4.5,
    ),
    ('onSurface/surfaceContainerLow', s.onSurface, s.surfaceContainerLow, 4.5),
    ('onSurface/surfaceContainer', s.onSurface, s.surfaceContainer, 4.5),
    (
      'onSurface/surfaceContainerHigh',
      s.onSurface,
      s.surfaceContainerHigh,
      4.5,
    ),
    (
      'onSurface/surfaceContainerHighest',
      s.onSurface,
      s.surfaceContainerHighest,
      4.5,
    ),
    (
      'onSurfaceVariant/surfaceContainerLow',
      s.onSurfaceVariant,
      s.surfaceContainerLow,
      4.5,
    ),
    (
      'onSurfaceVariant/surfaceContainerHigh',
      s.onSurfaceVariant,
      s.surfaceContainerHigh,
      4.5,
    ),
    ('onPrimary/primary', s.onPrimary, s.primary, 4.5),
    (
      'onPrimaryContainer/primaryContainer',
      s.onPrimaryContainer,
      s.primaryContainer,
      4.5,
    ),
    ('onSecondary/secondary', s.onSecondary, s.secondary, 4.5),
    (
      'onSecondaryContainer/secondaryContainer',
      s.onSecondaryContainer,
      s.secondaryContainer,
      4.5,
    ),
    ('onTertiary/tertiary', s.onTertiary, s.tertiary, 4.5),
    (
      'onTertiaryContainer/tertiaryContainer',
      s.onTertiaryContainer,
      s.tertiaryContainer,
      4.5,
    ),
    ('onError/error', s.onError, s.error, 4.5),
    (
      'onErrorContainer/errorContainer',
      s.onErrorContainer,
      s.errorContainer,
      4.5,
    ),
    (
      'onInverseSurface/inverseSurface',
      s.onInverseSurface,
      s.inverseSurface,
      4.5,
    ),
    ('inversePrimary/inverseSurface', s.inversePrimary, s.inverseSurface, 4.5),
    // 글자로 쓰이는 강조색이 표면 위에서 읽혀야 한다.
    ('primary/surface', s.primary, s.surface, 4.5),
    ('primary/surfaceContainerLow', s.primary, s.surfaceContainerLow, 4.5),
    ('primary/surfaceContainerHigh', s.primary, s.surfaceContainerHigh, 4.5),
    ('secondary/surface', s.secondary, s.surface, 4.5),
    ('tertiary/surface', s.tertiary, s.surface, 4.5),
    ('error/surface', s.error, s.surface, 4.5),
    ('outline/surface (비텍스트)', s.outline, s.surface, 3.0),
  ];
  return [
    for (final (n, a, b, min) in pairs)
      if (contrastRatio(a, b) < min)
        '$n ${contrastRatio(a, b).toStringAsFixed(2)} < $min',
  ];
}

void main() {
  group('레지스트리 유효성', () {
    test('id 는 겹치지 않고 소문자-하이픈이며 이름은 한국어로 채워져 있다', () {
      final ids = <String>{};
      for (final s in kSkins) {
        expect(ids.add(s.id), isTrue, reason: '중복 id ${s.id}');
        expect(
          RegExp(r'^[a-z]+(-[a-z]+)*$').hasMatch(s.id),
          isTrue,
          reason: s.id,
        );
        expect(s.nameKo.trim(), isNotEmpty);
        expect(RegExp(r'[가-힣]').hasMatch(s.nameKo), isTrue, reason: s.nameKo);
        expect(s.light != null || s.dark != null, isTrue);
      }
      expect(kSkins.first.id, kDefaultSkinId);
      expect(kSkins.first.builtin, isTrue);
      expect(kSkins.length, greaterThanOrEqualTo(8));
    });

    test('필요한 스킨이 모두 있다', () {
      final names = kSkins.map((s) => s.nameKo).toSet();
      expect(
        names,
        containsAll(<String>[
          '기본',
          '성모 하늘색',
          '밤 성당',
          '올리브 정원',
          '장미',
          '양피지',
          '대리석',
          '대림 보라',
          '사순 자주',
          '부활 흰금',
          '성탄 금홍',
        ]),
      );
    });

    test('계절 스킨만 공개 기간이 있고 그룹이 계절이다', () {
      for (final s in kSkins) {
        expect(s.window != null, s.group == SkinGroup.season, reason: s.id);
      }
    });

    test('토큰은 모두 불투명하고 배경 밝기가 변형과 맞다', () {
      for (final (name, t, b) in _variants()) {
        for (final slot in SkinSlot.values) {
          expect(t[slot].a, 1.0, reason: '$name ${slot.name}');
        }
        expect(t.isDark, b == Brightness.dark, reason: '$name 배경 밝기');
      }
    });

    test('기본 스킨은 손으로 정한 상아색 구성을 그대로 쓴다', () {
      final light = AppTheme.forSkin(kSkins.first, Brightness.light);
      expect(light.colorScheme, AppTheme.seedScheme(Brightness.light));
      final dark = AppTheme.forSkin(kSkins.first, Brightness.dark);
      expect(dark.colorScheme, AppTheme.seedScheme(Brightness.dark));
    });

    test('밤 성당은 밝기가 어두움으로 고정된다', () {
      final night = Skins.byId('night-church');
      expect(night.fixedBrightness, Brightness.dark);
      expect(night.themeMode, ThemeMode.dark);
      expect(night.resolve(Brightness.light).$2, Brightness.dark);
    });

    test('토큰 JSON 왕복과 깨진 값 거르기', () {
      final t = kSkins[1].light!;
      expect(SkinTokens.fromJson(t.toJson()), t);
      expect(SkinTokens.fromJson({...t.toJson(), 'ink': 'red'}), isNull);
      expect(SkinTokens.fromJson('x'), isNull);
      expect(decodeCustomSkins('{깨짐'), isEmpty);
      expect(decodeCustomSkins('[1,2]'), isEmpty);
      final c = CustomSkin(id: 'custom-1', name: '내 스킨', tokens: t);
      final back = decodeCustomSkins(encodeCustomSkins([c]));
      expect(back.single.name, '내 스킨');
      expect(back.single.tokens, t);
    });
  });

  group('대비(WCAG AA)', () {
    for (final (name, t, b) in _variants()) {
      test('$name: 고른 색의 짝이 모두 통과한다', () {
        expect(skinContrastIssues(t), isEmpty);
      });
      test('$name: 유도한 M3 구성의 짝이 모두 통과한다', () {
        expect(schemeFailures(deriveSkinScheme(t, b)), isEmpty);
      });
    }

    test('밝은 스킨의 내비게이션(어두운 구성)도 읽힌다', () {
      for (final s in kSkins) {
        if (s.builtin || s.light == null) continue;
        if (s.dark != null) {
          expect(
            schemeFailures(deriveSkinScheme(s.dark!, Brightness.dark)),
            isEmpty,
            reason: s.id,
          );
        }
        // 어두운 짝이 없는 밝은 스킨(만든 스킨 등)이 쓰는 유도 구성.
        expect(
          schemeFailures(deriveChromeScheme(s.light!)),
          isEmpty,
          reason: '${s.id} 유도',
        );
      }
    });

    test('기본 스킨의 손으로 정한 구성도 같은 짝을 통과한다', () {
      for (final b in Brightness.values) {
        expect(schemeFailures(AppTheme.seedScheme(b)), isEmpty);
      }
    });

    test('견본 색은 모두 불투명한 #rrggbb 이다', () {
      for (final dark in [false, true]) {
        for (final slot in SkinSlot.values) {
          final list = SkinSwatches.of(slot, dark: dark);
          expect(list, isNotEmpty);
          for (final c in list) {
            expect(parseHex(colorHex(c)), c);
          }
        }
      }
    });

    test('장식 금색은 스킨의 gold 토큰이다', () {
      final s = Skins.byId('mary-blue');
      final data = AppTheme.forSkin(s, Brightness.light);
      expect(data.extension<AppDecor>()!.gold, s.light!.gold);
      expect(data.colorScheme, AppTheme.skinScheme(s.light!, Brightness.light));
    });
  });

  group('날짜 문', () {
    final advent = Skins.byId('advent-violet');

    test('대림 스킨은 대림 시기 안에서만 열린다(2026-11-29 시작)', () {
      expect(advent.isOpen(kst(2026, 11, 28)), isFalse);
      expect(advent.isOpen(kst(2026, 11, 29)), isTrue);
      expect(advent.isOpen(kst(2026, 12, 24)), isTrue);
      expect(advent.isOpen(kst(2026, 12, 25)), isFalse);
    });

    test('경계는 한국 시각 자정이다', () {
      // 2026-11-28 14:59 UTC = 한국 11-28 23:59(아직 닫힘), 15:00 UTC = 한국 11-29 0시(열림).
      expect(advent.isOpen(DateTime.utc(2026, 11, 28, 14, 59)), isFalse);
      expect(advent.isOpen(DateTime.utc(2026, 11, 28, 15, 0)), isTrue);
    });

    test('열리기 전에는 목록에서 빠지고 저장값은 그대로, 화면은 기본이다', () {
      final now = kst(2026, 11, 16);
      expect(Skins.visible(now).any((s) => s.id == 'advent-violet'), isFalse);
      expect(Skins.visibleIn(SkinGroup.season, now), isEmpty);
      expect(Skins.effectiveId('advent-violet', now), kDefaultSkinId);
      expect(Skins.effective('advent-violet', now).isDefault, isTrue);
      // 열린 뒤에는 같은 저장값이 그대로 살아난다.
      final open = kst(2026, 12, 3);
      expect(Skins.visible(open).any((s) => s.id == 'advent-violet'), isTrue);
      expect(Skins.effectiveId('advent-violet', open), 'advent-violet');
      // 기간 밖의 다른 계절 스킨은 여전히 닫혀 있다.
      expect(Skins.effectiveId('lent-plum', open), kDefaultSkinId);
    });

    test('시기마다 맞는 스킨이 열린다(사순·부활·성탄)', () {
      expect(Skins.effectiveId('lent-plum', kst(2027, 2, 20)), 'lent-plum');
      expect(Skins.effectiveId('easter-gold', kst(2027, 4, 4)), 'easter-gold');
      expect(
        Skins.effectiveId('christmas-gold-red', kst(2026, 12, 25)),
        'christmas-gold-red',
      );
      expect(
        Skins.effectiveId('christmas-gold-red', kst(2026, 11, 16)),
        kDefaultSkinId,
      );
    });

    test('모르는 id 도 기본으로 그린다', () {
      expect(Skins.effectiveId('없는-스킨', kst(2026, 11, 16)), kDefaultSkinId);
      expect(Skins.effectiveId(null, kst(2026, 11, 16)), kDefaultSkinId);
    });

    test('다음에 열리는 날을 알려 준다', () {
      expect(
        advent.window!.nextOpen(kst(2026, 11, 16)),
        DateTime(2026, 11, 29),
      );
      expect(advent.window!.nextOpen(kst(2026, 12, 1)), isNull);
    });

    test('날짜 창(DateWindow)', () {
      final w = DateWindow(
        '테스트',
        from: DateTime(2027, 1, 1),
        until: DateTime(2027, 2, 1),
      );
      expect(w.contains(kst(2026, 12, 31)), isFalse);
      expect(w.contains(kst(2027, 1, 15)), isTrue);
      expect(w.contains(kst(2027, 2, 1)), isFalse);
    });

    test('만든 스킨은 늘 열려 있다', () {
      final c = CustomSkin(id: 'custom-9', name: 'x', tokens: kSkins[1].light!);
      expect(Skins.effectiveId('custom-9', kst(2026, 11, 16), [c]), 'custom-9');
      expect(Skins.effectiveId('custom-9', kst(2026, 11, 16)), kDefaultSkinId);
    });
  });

  group('설정에 저장', () {
    test('스킨 값은 평범한 값으로 저장·복원되고 미리 보기는 저장하지 않는다', () async {
      SharedPreferences.setMockInitialValues({});
      final s = await AppSettings.load();
      expect(s.skinId, kDefaultSkinId);
      s.skinId = 'advent-violet'; // 날짜 문 밖이어도 값은 받아 둔다
      s.markSkinSeen('rose');
      s.skinPreviewId = 'marble';
      s.skinCustoms = [
        CustomSkin(id: 'custom-5', name: '내 것', tokens: kSkins[3].light!),
      ];
      final prefs = await SharedPreferences.getInstance();
      expect(prefs.getString('skin_id'), 'advent-violet');
      expect(prefs.getStringList('skin_seen'), ['rose']);
      expect(prefs.getString('skin_customs'), isA<String>());
      expect(prefs.getKeys().any((k) => k.contains('preview')), isFalse);

      final again = await AppSettings.load();
      expect(again.skinId, 'advent-violet');
      expect(again.skinSeen, {'rose'});
      expect(again.skinPreviewId, isNull);
      expect(again.skinCustoms.single.name, '내 것');
    });
  });

  group('성당·기도 화면은 스킨과 따로다', () {
    test('ChurchTheme 구성은 스킨과 상관없이 같다', () async {
      SharedPreferences.setMockInitialValues({});
      final before = ChurchTheme.data().colorScheme;
      final s = await AppSettings.load();
      s.skinId = 'rose';
      AppTheme.forSkin(Skins.byId('rose'), Brightness.light);
      expect(ChurchTheme.data().colorScheme, before);
      expect(ChurchTheme.scheme, before);
    });

    test('기도 화면 바탕 설정(rosaryBackdrop)은 스킨을 바꿔도 그대로다', () async {
      SharedPreferences.setMockInitialValues({});
      final s = await AppSettings.load();
      s.rosaryBackdrop = RosaryBackdrop.ivory;
      s.skinId = 'night-church';
      expect(s.rosaryBackdrop, RosaryBackdrop.ivory);
      s.skinId = kDefaultSkinId;
      expect(s.rosaryBackdrop, RosaryBackdrop.ivory);
    });
  });
}
