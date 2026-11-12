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
    Color(0xFFFFE3CC),
    Color(0xFFF6CBA8),
    Color(0xFFDDA77A),
    Color(0xFFA87049),
  ];

  static const List<String> skinNames = ['밝은 피부', '보통 피부', '구릿빛 피부', '짙은 피부'];

  static const List<String> styleNames = ['짧은 머리', '단발', '올림머리', '곱슬'];

  static const List<Color> hairColors = [
    Color(0xFF2B2522),
    Color(0xFF4A3328),
    Color(0xFF7A5238),
    Color(0xFFA8744A),
    Color(0xFFE3C070),
    Color(0xFFC8643A),
    Color(0xFF9A9AA3),
    Color(0xFFD8D8E0),
    Color(0xFF2F3A5F),
    Color(0xFFE58AA8),
  ];

  static const List<Color> outfitColors = [
    Color(0xFFE8665D),
    Color(0xFFF4A259),
    Color(0xFFF4D35E),
    Color(0xFF9CCC65),
    Color(0xFF4CAF7A),
    Color(0xFF3FB8AF),
    Color(0xFF5AA9E6),
    Color(0xFF4A6FD6),
    Color(0xFF8E6BD0),
    Color(0xFFF08CB4),
    Color(0xFFA1745A),
    Color(0xFFECE6DA),
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
