/// 사이버 성당 카탈로그 (SPEC §8, §12).
///
/// 건립 연도·설명·축소 비율은 `docs/church/interiors/<id>.md` 조사서가 나오면
/// 그 내용으로 채운다. 그 전에는 비어 있거나 임시 값이다.
library;

import 'package:flutter/foundation.dart';

/// 성당 상세 시트의 '기리는 이' 한 줄(예: 순교자 이름 + 순교일).
@immutable
class ChurchPerson {
  const ChurchPerson(this.name, this.detail);

  /// 공식 표기 그대로(예: '성 박종원 아우구스티노').
  final String name;

  /// 한 줄 설명(예: '1840년 1월 31일 순교').
  final String detail;

  @override
  bool operator ==(Object other) =>
      other is ChurchPerson && other.name == name && other.detail == detail;

  @override
  int get hashCode => Object.hash(name, detail);
}

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
    this.peopleTitle = '',
    this.people = const [],
    this.peopleNote = '',
    this.facts = const [],
    this.modelNote = '',
    this.source = '',
  });

  /// 소문자 영문 id(서버 방 이름·웹 빌더와 같다).
  final String id;
  final String nameKo;

  /// '도시, 나라'.
  final String place;

  /// '대성전' | '대성당' | '성당' | '성지' | '우리 본당'.
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

  /// 상세 시트의 '기리는 이' 목록 제목(예: '당고개의 순교자 10위'). [people]이 비면 쓰지 않는다.
  final String peopleTitle;

  /// 이 성당·성지가 기리는 이들(공식 표기·차례). 비어 있으면 상세 시트에 나오지 않는다.
  final List<ChurchPerson> people;

  /// [people]의 표기·날짜 근거 한 줄.
  final String peopleNote;

  /// 알아 둘 사실(직접 다시 쓴 사실 문장). 비어 있으면 나오지 않는다.
  final List<String> facts;

  /// 3D 모형 고지에 덧붙이는 줄(추정 치수, 싣지 않은 작품 등).
  final String modelNote;

  /// 소개 글의 출처 한 줄.
  final String source;

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
      other.group == group &&
      other.peopleTitle == peopleTitle &&
      listEquals(other.people, people) &&
      other.peopleNote == peopleNote &&
      listEquals(other.facts, facts) &&
      other.modelNote == modelNote &&
      other.source == source;

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
    peopleTitle,
    Object.hashAll(people),
    peopleNote,
    Object.hashAll(facts),
    modelNote,
    source,
  );

  @override
  String toString() => 'ChurchInfo($id, $nameKo)';
}

abstract final class ChurchCatalog {
  /// 기본 성당 id.
  static const String defaultId = 'basic';

  /// 창 감상실(GLASS_APP_PLAN §3) 장면 id. 목록·서버 방에는 없고 혼자 보는 곳이다.
  static const String glassRoomId = 'glass_room';

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
    // 당고개 순교성지: 지하 성당 + 입구 홀(docs/church/interiors/danggogae.md).
    // 문구는 사실만 직접 다시 쓴 글이다(성지 누리집·가톨릭굿뉴스·주교회의 자료 확인, 인용·전재 아님).
    ChurchInfo(
      id: 'danggogae',
      nameKo: '당고개 순교성지',
      place: '서울, 대한민국',
      kind: '성지',
      group: '한국',
      builtYear: 2011,
      scalePercent: 100,
      blurb:
          '기해박해 끝 무렵인 1840년 초(음력 1839년 12월), 열 분의 교우가 순교한 '
          '서울 용산의 순교성지로, 성인 아홉 분과 복자 이성례 마리아를 기립니다. '
          "2011년 한옥과 황토 담장으로 새로 꾸며 '어머니의 성지'로 불리며, "
          '지하 성당은 옅은 황토빛 벽과 한지 빛 창, 나무 바닥으로 이루어져 있습니다.',
      peopleTitle: '당고개의 순교자 10위',
      people: [
        ChurchPerson('성 박종원 아우구스티노', '1840년 1월 31일 순교'),
        ChurchPerson('성 홍병주 베드로', '1840년 1월 31일 순교'),
        ChurchPerson('성녀 손소벽 막달레나', '1840년 1월 31일 순교'),
        ChurchPerson('성녀 이경이 아가타', '1840년 1월 31일 순교'),
        ChurchPerson('성녀 이인덕 마리아', '1840년 1월 31일 순교'),
        ChurchPerson('성녀 권진이 아가타', '1840년 1월 31일 순교'),
        ChurchPerson('성 홍영주 바오로', '1840년 2월 1일 순교'),
        ChurchPerson('성 이문우 요한', '1840년 2월 1일 순교'),
        ChurchPerson('성녀 최영이 바르바라', '1840년 2월 1일 순교'),
        ChurchPerson('복자 이성례 마리아', '1840년 1월 31일 순교'),
      ],
      peopleNote:
          "표기와 차례는 한국천주교주교회의 '103위 성인 호칭 기도'와 "
          "'124위 한국 순교 복자 호칭 기도'를, 순교일(양력)은 가톨릭굿뉴스 성인 자료를 따랐습니다. "
          '성인 아홉 분은 1984년에 시성되었고, 복자 이성례 마리아는 2014년 8월 16일에 시복되었습니다.',
      facts: [
        '본래 형장은 서소문 밖 네거리였으나, 설 대목장을 앞둔 상인들의 요청으로 당고개로 옮겨졌습니다.',
        '순교자 가운데에는 서소문 밖 네거리에서 순교한 이들의 가족이 많습니다. '
            '성 홍병주 베드로와 성 홍영주 바오로 형제는 하루 차이로 순교했습니다.',
        '복자 이성례 마리아는 성 최경환 프란치스코의 아내이자 최양업 토마스 신부의 어머니입니다. '
            '2014년 8월 16일 서울 광화문 광장에서 프란치스코 교황이 시복했습니다.',
        "성지는 '찔레꽃 아픔, 매화 향기'를 주제로 꾸며졌습니다.",
      ],
      modelNote:
          '지하 성당과 입구 홀만 지었습니다. 실제 치수는 확인 전이며 사진을 보고 분위기를 재현한 것입니다. '
          '성지에 있는 성화·유리화·조각은 싣지 않았습니다.',
      source:
          '출처: 당고개순교성지 누리집(danggogae.org), 가톨릭굿뉴스 성지 정보(천주교 서울대교구), '
          "한국천주교주교회의 '한국 순교자' 자료",
    ),
    // 여의도동성당: 사용자의 본당(로드맵 T-79). 성전 내부만(docs/church/interiors/yeouido.md).
    // 문구는 본당 누리집·서울대교구 본당 현황에서 확인한 사실만 직접 다시 쓴 글이다(인용·전재 아님).
    ChurchInfo(
      id: 'yeouido',
      nameKo: '여의도동성당',
      place: '서울, 대한민국',
      kind: '성당',
      group: '한국',
      builtYear: 1984,
      scalePercent: 100,
      blurb:
          '1974년 서울 여의도에 세워진 천주교 서울대교구의 본당으로, '
          '파티마의 성모를 주보로 모십니다. 1984년 봉헌된 붉은 벽돌 성전은 '
          '초록 지붕을 이고 있으며, 안에서는 흰 원기둥이 반원형 제단을 둘러쌉니다.',
      facts: [
        '1974년 9월 17일 영등포 본당의 여의도 공소에서 본당으로 승격했습니다.',
        '지금의 성전은 1982년에 공사를 시작해 1984년 4월 28일 봉헌되었고, '
            '2008년부터 2009년까지 증축과 보수를 거쳤습니다.',
        "본당 주보는 1983년에 '파티마의 성모'로 정해졌고, 1986년 8월 15일 성모동산을 꾸며 성모상을 축복했습니다.",
        '1984년 5월 6일 요한 바오로 2세 교황이 한국 순교자 103위를 시성한 여의도 광장(지금의 여의도공원)이 '
            '가까이 있어, 본당은 그 시성 터를 순례지로 안내합니다.',
      ],
      modelNote:
          '성전 내부만 지었습니다. 실제 치수는 확인 전이며 사진을 보고 분위기를 재현한 것입니다. '
          '성당에 있는 성화·유리화·조각은 싣지 않았습니다.',
      source:
          '출처: 천주교 여의도동성당 누리집(ycatholic.or.kr) 본당 소개·연혁, 천주교 서울대교구 누리집 본당 현황',
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
