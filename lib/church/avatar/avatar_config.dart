import 'dart:convert';
import 'dart:math' show Random;
import 'dart:ui' show Color;

import 'package:flutter/foundation.dart';

import '../church_constants.dart';

/// 사이버 성당 아바타 설정. 모든 값은 인덱스이며 항상 허용 범위로 맞춰진다.
///
/// [gender]는 0 여성, 1 남성. [style]은 성별마다 따로 있는 머리 모양 0..3이고,
/// [name]은 성별과 무관한 통합 세례명 목록([baptismalNames]) 안의 인덱스다.
/// 색상표는 웹(`assets/church/palette.js`)과 같은 HEX 값을 가진다.
@immutable
class AvatarConfig {
  const AvatarConfig({
    this.gender = 0,
    this.skin = 0,
    this.style = 0,
    this.hair = 0,
    this.outfit = 0,
    this.name = 0,
  });

  /// 값 범위를 벗어나면 가장 가까운 허용 값으로 맞춘다.
  factory AvatarConfig.clamped({
    int gender = 0,
    int skin = 0,
    int style = 0,
    int hair = 0,
    int outfit = 0,
    int name = 0,
  }) {
    final g = gender == avatarMale ? avatarMale : avatarFemale;
    return AvatarConfig(
      gender: g,
      skin: skin.clamp(0, skinColors.length - 1),
      style: style.clamp(0, styleCount - 1),
      hair: hair.clamp(0, hairColors.length - 1),
      outfit: outfit.clamp(0, outfitColors.length - 1),
      name: name >= 0 && name < baptismalNames.length
          ? name
          : defaultBaptismalNameIndex,
    );
  }

  /// JSON에서 읽는다(저장값·와이어 공용). 이름 형식은 `nv`로 가린다.
  ///
  /// - `nv` = [avatarNameVersion]: `name`은 통합 목록 인덱스.
  /// - `nv` 없음 + `g` 있음: 옛 형식. `name`은 옛 성별별 목록(여 65 / 남 71) 인덱스라
  ///   이름을 거쳐 통합 목록 인덱스로 옮긴다.
  /// - `nv`·`g` 둘 다 없음: 더 옛 형식(이름이 옛 40개 목록 인덱스, 머리 모양이 옛 4종).
  ///   성별을 이름에서 유추하고 이름·머리 모양을 옮긴다.
  ///
  /// 어느 경우든 범위를 벗어난 이름은 기본 이름(마리아)이 된다.
  factory AvatarConfig.fromJson(Map<String, dynamic> json) {
    int read(String key) {
      final v = json[key];
      if (v is num && v.isFinite) return v.toInt();
      return 0;
    }

    final g = json['g'];
    final nv = json['nv'];
    final unified = nv is num && nv == avatarNameVersion;
    if (g is num && g.isFinite) {
      final gender = g.toInt() == avatarMale ? avatarMale : avatarFemale;
      return AvatarConfig.clamped(
        gender: gender,
        skin: read('skin'),
        style: read('style'),
        hair: read('hair'),
        outfit: read('outfit'),
        name: unified
            ? read('name')
            : migrateBaptismalName(read('name'), gender: gender),
      );
    }
    if (unified) {
      return AvatarConfig.clamped(
        skin: read('skin'),
        style: read('style'),
        hair: read('hair'),
        outfit: read('outfit'),
        name: read('name'),
      );
    }
    // 가장 옛 형식: 0..19 여성 이름, 20..39 남성 이름.
    final oldName = read('name');
    final gender = oldName >= 20 ? avatarMale : avatarFemale;
    final oldStyle = read('style').clamp(0, 3);
    return AvatarConfig.clamped(
      gender: gender,
      skin: read('skin'),
      style: _legacyStyle[gender][oldStyle],
      hair: read('hair'),
      outfit: read('outfit'),
      name: migrateBaptismalName(oldName),
    );
  }

  /// 저장된 JSON 문자열이 지금 형식(`nv` = [avatarNameVersion])인지. 아니면 읽은 뒤 다시
  /// 저장해 한 번만 옮긴다(app/settings.dart).
  static bool isCurrentFormat(String? source) {
    if (source == null || source.isEmpty) return true;
    try {
      final decoded = jsonDecode(source);
      return decoded is Map && decoded['nv'] == avatarNameVersion;
    } catch (_) {
      return false;
    }
  }

  /// 옛 머리 모양(짧은 머리·단발·올림머리·곱슬) → 성별별 새 머리 모양.
  static const List<List<int>> _legacyStyle = [
    [0, 0, 3, 1], // 여성: 단발, 단발, 낮은 쪽머리, 어깨 길이
    [1, 0, 0, 2], // 남성: 가르마, 짧게, 짧게, 웨이브
  ];

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
    gender: avatarFemale,
    skin: 1,
    style: 0,
    hair: 3,
    outfit: 5,
    name: defaultBaptismalNameIndex,
  );

  /// 첫 입장 때 미리 골라 두는 모습: 성별·머리 모양·머리색·세례명(인기 이름 중)을
  /// 무작위로 정한다. 그대로 들어가도 어색하지 않은 값만 쓴다.
  factory AvatarConfig.randomStart(Random random) {
    final g = random.nextInt(2);
    return AvatarConfig(
      gender: g,
      skin: 1,
      style: random.nextInt(styleCount),
      hair: random.nextInt(4), // 검정·갈색 계열
      outfit: defaultConfig.outfit,
      name: commonBaptismalIndicesFor(g)[random.nextInt(popularBaptismalCount)],
    );
  }

  /// 성별마다의 머리 모양 개수.
  static const int styleCount = 4;

  /// 성별 [gender]에서 흔히 쓰는 이름 중 하나를 무작위로 고른다(통합 목록 인덱스).
  static int randomCommonName(int gender, Random random) {
    final pool = commonBaptismalIndicesFor(gender);
    return pool[random.nextInt(pool.length)];
  }

  // assets/church/palette.js(window.ChurchPalette)와 같은 HEX 값.
  static const List<Color> skinColors = [
    Color(0xFFF7D9C4),
    Color(0xFFEDBE9A),
    Color(0xFFC98E64),
    Color(0xFF8A5738),
  ];

  static const List<String> skinNames = ['밝은 피부', '보통 피부', '구릿빛 피부', '짙은 피부'];

  /// 머리 모양 이름(여성/남성). 3D 아바타·미리보기와 같은 순서.
  static const List<String> femaleStyleNames = [
    '단발',
    '어깨 길이',
    '포니테일',
    '낮은 쪽머리',
  ];
  static const List<String> maleStyleNames = ['짧게 친 머리', '가르마', '웨이브', '넓은 이마'];

  static List<String> styleNamesFor(int gender) =>
      gender == avatarMale ? maleStyleNames : femaleStyleNames;

  static const List<String> genderNames = ['여성', '남성'];

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

  /// 0 여성, 1 남성.
  final int gender;
  final int skin;
  final int style;
  final int hair;
  final int outfit;
  final int name;

  bool get isMale => gender == avatarMale;

  /// 이름표에 보일 세례명.
  String get nameText => baptismalNameOf(name);

  List<String> get styleNameList => styleNamesFor(gender);

  Color get pantsColor => pantsColors[outfit.clamp(0, pantsColors.length - 1)];
  Color get skinColor => skinColors[skin.clamp(0, skinColors.length - 1)];
  Color get hairColor => hairColors[hair.clamp(0, hairColors.length - 1)];
  Color get outfitColor =>
      outfitColors[outfit.clamp(0, outfitColors.length - 1)];

  /// 성별을 바꿔도 세례명은 그대로다(이름 목록은 성별과 무관). 머리 모양 번호도 그대로
  /// 둔다(성별마다 모양이 다르다).
  AvatarConfig withGender(int g) {
    if (g == gender) return this;
    return AvatarConfig.clamped(
      gender: g,
      skin: skin,
      style: style,
      hair: hair,
      outfit: outfit,
      name: name,
    );
  }

  AvatarConfig copyWith({
    int? gender,
    int? skin,
    int? style,
    int? hair,
    int? outfit,
    int? name,
  }) => AvatarConfig.clamped(
    gender: gender ?? this.gender,
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
    'g': gender,
    'nv': avatarNameVersion,
  };

  String toJsonString() => jsonEncode(toJson());

  @override
  bool operator ==(Object other) =>
      other is AvatarConfig &&
      other.gender == gender &&
      other.skin == skin &&
      other.style == style &&
      other.hair == hair &&
      other.outfit == outfit &&
      other.name == name;

  @override
  int get hashCode => Object.hash(gender, skin, style, hair, outfit, name);

  @override
  String toString() =>
      'AvatarConfig(gender: $gender, skin: $skin, style: $style, hair: $hair, outfit: $outfit, name: $name)';
}
