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
    Color(0xFFF7D9C4),
    Color(0xFFEDBE9A),
    Color(0xFFC98E64),
    Color(0xFF8A5738),
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
    Color(0xFF2B2320),
    Color(0xFF4A2C1E),
    Color(0xFF6B3A22),
    Color(0xFF8C4B26),
    Color(0xFFB5532A),
    Color(0xFFC99A4B),
    Color(0xFFEBC76A),
    Color(0xFF9A9A9E),
    Color(0xFFE3E1DA),
    Color(0xFF8A2E28),
  ];

  static const List<Color> outfitColors = [
    Color(0xFF2F4A8A),
    Color(0xFF4A4E57),
    Color(0xFF2A2A30),
    Color(0xFFD09A55),
    Color(0xFF8A9A3F),
    Color(0xFF9A2F45),
    Color(0xFF2F7A5A),
    Color(0xFFF1E6CB),
    Color(0xFFA58E7E),
    Color(0xFF6FA0C8),
    Color(0xFF8A4F8C),
    Color(0xFFD9694B),
  ];

  /// 바지색(옷색과 같은 인덱스). palette.js의 `pants`와 같다.
  static const List<Color> pantsColors = [
    Color(0xFFBCA982),
    Color(0xFF5C7FA8),
    Color(0xFF7A7F8C),
    Color(0xFF3E4F7A),
    Color(0xFFE2D8C0),
    Color(0xFF4A5470),
    Color(0xFFBCA982),
    Color(0xFF6B86AE),
    Color(0xFF3E4F7A),
    Color(0xFFE2D8C0),
    Color(0xFF8A8E98),
    Color(0xFF3E4F7A),
  ];

  final int skin;
  final int style;
  final int hair;
  final int outfit;
  final int name;

  Color get pantsColor => pantsColors[outfit.clamp(0, pantsColors.length - 1)];
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
