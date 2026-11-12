import 'dart:convert';
import 'dart:ui' show Color;

import 'package:flutter/foundation.dart';

/// 사이버 성당 아바타 설정. 모든 값은 인덱스이며 항상 허용 범위로 맞춰진다.
///
/// 색상표는 웹(`assets/church/palette.js`)과 같은 HEX 값을 가진다.
@immutable
class AvatarConfig {
  const AvatarConfig({
    this.skin = 0,
    this.style = 0,
    this.hair = 0,
    this.outfit = 0,
    this.name = 0,
  });

  /// 값 범위를 벗어나면 가장 가까운 허용 값으로 맞춘다.
  factory AvatarConfig.clamped({
    int skin = 0,
    int style = 0,
    int hair = 0,
    int outfit = 0,
    int name = 0,
  }) => AvatarConfig(
    skin: skin.clamp(0, skinColors.length - 1),
    style: style.clamp(0, styleNames.length - 1),
    hair: hair.clamp(0, hairColors.length - 1),
    outfit: outfit.clamp(0, outfitColors.length - 1),
    name: name.clamp(0, nameCount - 1),
  );

  factory AvatarConfig.fromJson(Map<String, dynamic> json) {
    int read(String key) {
      final v = json[key];
      if (v is num) return v.toInt();
      return 0;
    }

    return AvatarConfig.clamped(
      skin: read('skin'),
      style: read('style'),
      hair: read('hair'),
      outfit: read('outfit'),
      name: read('name'),
    );
  }

  /// JSON 문자열에서 읽는다. 잘못된 입력이면 [defaultConfig].
  factory AvatarConfig.fromJsonString(String? source) {
    if (source == null || source.isEmpty) return defaultConfig;
    try {
      final decoded = jsonDecode(source);
      if (decoded is Map<String, dynamic>) {
        return AvatarConfig.fromJson(decoded);
      }
    } catch (_) {}
    return defaultConfig;
  }

  static const AvatarConfig defaultConfig = AvatarConfig(
    skin: 1,
    style: 0,
    hair: 3,
    outfit: 5,
    name: 0,
  );

  /// 세례명 목록 길이(church_constants.dart의 baptismalNames와 같다).
  static const int nameCount = 40;

  // assets/church/palette.js(window.ChurchPalette)와 같은 HEX 값.
  static const List<Color> skinColors = [
    Color(0xFFF2D4BD),
    Color(0xFFE0B393),
    Color(0xFFB98259),
    Color(0xFF70472F),
  ];

  static const List<String> skinNames = ['밝은 피부', '보통 피부', '구릿빛 피부', '짙은 피부'];

  static const List<String> styleNames = ['짧은 머리', '단발', '올림머리', '곱슬'];

  /// 머리색 이름(접근성 라벨용). 색상표와 같은 순서.
  static const List<String> hairNames = [
    '검정',
    '짙은 갈색',
    '갈색',
    '밤색',
    '적갈색',
    '어두운 금발',
    '금발',
    '회색',
    '은백색',
    '짙은 적색',
  ];

  /// 옷색 이름(접근성 라벨용). 색상표와 같은 순서.
  static const List<String> outfitNames = [
    '네이비',
    '차콜',
    '블랙',
    '카멜',
    '올리브',
    '버건디',
    '포레스트',
    '크림',
    '토프',
    '더스티 블루',
    '플럼',
    '테라코타',
  ];

  static const List<Color> hairColors = [
    Color(0xFF1C1917),
    Color(0xFF3B2A20),
    Color(0xFF5A3B28),
    Color(0xFF7B4A2D),
    Color(0xFF8F4A2A),
    Color(0xFFA88B5A),
    Color(0xFFD2B27A),
    Color(0xFF8F8E8C),
    Color(0xFFD9D9D6),
    Color(0xFF6E2A1E),
  ];

  static const List<Color> outfitColors = [
    Color(0xFF26334F),
    Color(0xFF3A3D42),
    Color(0xFF1F1F22),
    Color(0xFFB58A5B),
    Color(0xFF6B6B3F),
    Color(0xFF6A2433),
    Color(0xFF2F5240),
    Color(0xFFE4DAC3),
    Color(0xFF8C7B6E),
    Color(0xFF6F8CA6),
    Color(0xFF5E3B5C),
    Color(0xFFB35E45),
  ];

  final int skin;
  final int style;
  final int hair;
  final int outfit;
  final int name;

  Color get skinColor => skinColors[skin.clamp(0, skinColors.length - 1)];
  Color get hairColor => hairColors[hair.clamp(0, hairColors.length - 1)];
  Color get outfitColor =>
      outfitColors[outfit.clamp(0, outfitColors.length - 1)];

  AvatarConfig copyWith({
    int? skin,
    int? style,
    int? hair,
    int? outfit,
    int? name,
  }) => AvatarConfig.clamped(
    skin: skin ?? this.skin,
    style: style ?? this.style,
    hair: hair ?? this.hair,
    outfit: outfit ?? this.outfit,
    name: name ?? this.name,
  );

  Map<String, dynamic> toJson() => {
    'skin': skin,
    'style': style,
    'hair': hair,
    'outfit': outfit,
    'name': name,
  };

  String toJsonString() => jsonEncode(toJson());

  @override
  bool operator ==(Object other) =>
      other is AvatarConfig &&
      other.skin == skin &&
      other.style == style &&
      other.hair == hair &&
      other.outfit == outfit &&
      other.name == name;

  @override
  int get hashCode => Object.hash(skin, style, hair, outfit, name);

  @override
  String toString() =>
      'AvatarConfig(skin: $skin, style: $style, hair: $hair, outfit: $outfit, name: $name)';
}
