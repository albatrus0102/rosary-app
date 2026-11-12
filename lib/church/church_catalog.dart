/// 사이버 성당 카탈로그 (SPEC §8, §12).
///
/// 건립 연도·설명·축소 비율은 `docs/church/interiors/<id>.md` 조사서가 나오면
/// 그 내용으로 채운다. 그 전에는 비어 있거나 임시 값이다.
library;

import 'package:flutter/foundation.dart';

@immutable
class ChurchInfo {
  const ChurchInfo({
    required this.id,
    required this.nameKo,
    required this.place,
    required this.kind,
    required this.group,
    this.builtYear,
    this.scalePercent = 40,
    this.blurb = '',
    this.wave = 1,
  });

  /// 소문자 영문 id(서버 방 이름·웹 빌더와 같다).
  final String id;
  final String nameKo;

  /// '도시, 나라'.
  final String place;

  /// '대성전' | '대성당' | '성당' | '우리 본당'.
  final String kind;

  /// 건립(봉헌) 연도. 모르면 null.
  final int? builtYear;

  /// 3D 모형이 실제 크기의 몇 %인지.
  final int scalePercent;

  /// 짧은 설명(비어 있을 수 있다).
  final String blurb;

  /// 1차(1) 또는 2차(2) 제작 구분.
  final int wave;

  /// '로마·바티칸' | '이탈리아' | '한국' | '세계' | '우리 본당'.
  final String group;

  @override
  bool operator ==(Object other) =>
      other is ChurchInfo &&
      other.id == id &&
      other.nameKo == nameKo &&
      other.place == place &&
      other.kind == kind &&
      other.builtYear == builtYear &&
      other.scalePercent == scalePercent &&
      other.blurb == blurb &&
      other.wave == wave &&
      other.group == group;

  @override
  int get hashCode => Object.hash(
    id,
    nameKo,
    place,
    kind,
    builtYear,
    scalePercent,
    blurb,
    wave,
    group,
  );

  @override
  String toString() => 'ChurchInfo($id, $nameKo)';
}

abstract final class ChurchCatalog {
  /// 기본 성당 id.
  static const String defaultId = 'basic';

  /// 구역 머리글 순서.
  static const List<String> groups = ['로마·바티칸', '이탈리아', '한국', '세계', '우리 본당'];

  static const List<ChurchInfo> all = [
    ChurchInfo(
      id: 'basic',
      nameKo: '우리 본당',
      place: '가상의 본당',
      kind: '우리 본당',
      group: '우리 본당',
      scalePercent: 100,
    ),
    // 1차
    ChurchInfo(
      id: 'stpeter',
      nameKo: '성 베드로 대성전',
      place: '바티칸 시국, 바티칸',
      kind: '대성전',
      group: '로마·바티칸',
    ),
    ChurchInfo(
      id: 'lateran',
      nameKo: '라테라노 성 요한 대성전',
      place: '로마, 이탈리아',
      kind: '대성전',
      group: '로마·바티칸',
    ),
    ChurchInfo(
      id: 'maggiore',
      nameKo: '성 마리아 마조레 대성전',
      place: '로마, 이탈리아',
      kind: '대성전',
      group: '로마·바티칸',
    ),
    ChurchInfo(
      id: 'stpaul',
      nameKo: '성 밖의 성 바오로 대성전',
      place: '로마, 이탈리아',
      kind: '대성전',
      group: '로마·바티칸',
    ),
    ChurchInfo(
      id: 'milan',
      nameKo: '밀라노 대성당',
      place: '밀라노, 이탈리아',
      kind: '대성당',
      group: '이탈리아',
    ),
    ChurchInfo(
      id: 'florence',
      nameKo: '피렌체 대성당',
      place: '피렌체, 이탈리아',
      kind: '대성당',
      group: '이탈리아',
    ),
    ChurchInfo(
      id: 'myeongdong',
      nameKo: '명동대성당',
      place: '서울, 대한민국',
      kind: '대성당',
      group: '한국',
      builtYear: 1898,
    ),
    // 2차
    ChurchInfo(
      id: 'stmark',
      nameKo: '산 마르코 대성당',
      place: '베네치아, 이탈리아',
      kind: '대성당',
      group: '이탈리아',
      wave: 2,
    ),
    ChurchInfo(
      id: 'jeondong',
      nameKo: '전주 전동성당',
      place: '전주, 대한민국',
      kind: '성당',
      group: '한국',
      builtYear: 1914,
      wave: 2,
    ),
    ChurchInfo(
      id: 'yakhyeon',
      nameKo: '약현성당',
      place: '서울, 대한민국',
      kind: '성당',
      group: '한국',
      builtYear: 1892,
      wave: 2,
    ),
    ChurchInfo(
      id: 'gyesan',
      nameKo: '계산성당',
      place: '대구, 대한민국',
      kind: '성당',
      group: '한국',
      builtYear: 1902,
      wave: 2,
    ),
    ChurchInfo(
      id: 'fatima',
      nameKo: '파티마 성모 성지 대성당',
      place: '파티마, 포르투갈',
      kind: '대성당',
      group: '세계',
      builtYear: 1953,
      wave: 2,
    ),
    ChurchInfo(
      id: 'lourdes',
      nameKo: '루르드 로사리오 대성전',
      place: '루르드, 프랑스',
      kind: '대성전',
      group: '세계',
      builtYear: 1889,
      wave: 2,
    ),
    ChurchInfo(
      id: 'sagrada',
      nameKo: '사그라다 파밀리아',
      place: '바르셀로나, 스페인',
      kind: '대성당',
      group: '세계',
      wave: 2,
    ),
    ChurchInfo(
      id: 'notredame',
      nameKo: '파리 노트르담 대성당',
      place: '파리, 프랑스',
      kind: '대성당',
      group: '세계',
      wave: 2,
    ),
  ];

  static final Map<String, ChurchInfo> byId = {for (final c in all) c.id: c};

  /// 알 수 없는 id면 `basic`.
  static ChurchInfo resolve(String? id) => byId[id] ?? byId[defaultId]!;

  /// [group] 구역의 성당들(카탈로그 순서).
  static List<ChurchInfo> inGroup(String group) => [
    for (final c in all)
      if (c.group == group) c,
  ];
}
