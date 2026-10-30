/// 한국 천주교 공식 기도문 (출처: 가톨릭 기도서, 한국천주교주교회의)
///
/// 모든 본문은 한국천주교주교회의 홈페이지(cbck.or.kr)의 『가톨릭 기도서』 전자 본문을
/// 기준으로 하고, 가톨릭 굿뉴스(maria.catholic.or.kr) 기도서 페이지와 대조하여 확인하였다.
/// 전례 지시문(예: '십자 성호를 그으며', '밑줄 부분에서 고개를 숙이며')은 본문에서 제외하였다.
library;

/// 하나의 기도문.
class Prayer {
  /// 기도문을 만든다.
  const Prayer({
    required this.id,
    required this.title,
    required this.text,
    required this.endsWithAmen,
  });

  /// 영문 식별자. 예: 'sign_of_cross', 'apostles_creed', 'our_father'.
  final String id;

  /// 한글 제목. 예: '성호경'.
  final String title;

  /// 전문. 행 구분은 '\n'.
  final String text;

  /// 본문이 '아멘'으로 끝나면 true.
  final bool endsWithAmen;
}

/// 묵주기도에 쓰이는 기도문 모음.
abstract final class Prayers {
  /// 성호경. 십자 성호를 그으며 바친다.
  static const signOfCross = Prayer(
    id: 'sign_of_cross',
    title: '성호경',
    text:
        '성부와 성자와 성령의 이름으로.\n'
        '아멘.',
    endsWithAmen: true,
  );

  /// 사도 신경 (2008년 이후 현행 공식 번역).
  ///
  /// '성령으로 인하여 동정 마리아께 잉태되어 나시고' 부분에서 모두 깊은 절을 한다.
  static const apostlesCreed = Prayer(
    id: 'apostles_creed',
    title: '사도신경',
    text:
        '전능하신 천주 성부\n'
        '천지의 창조주를 저는 믿나이다.\n'
        '그 외아들 우리 주 예수 그리스도님\n'
        '성령으로 인하여 동정 마리아께 잉태되어 나시고\n'
        '본시오 빌라도 통치 아래서 고난을 받으시고\n'
        '십자가에 못 박혀 돌아가시고 묻히셨으며\n'
        '저승에 가시어 사흗날에 죽은 이들 가운데서 부활하시고\n'
        '하늘에 올라 전능하신 천주 성부 오른편에 앉으시며\n'
        '그리로부터 산 이와 죽은 이를 심판하러 오시리라 믿나이다.\n'
        '성령을 믿으며\n'
        '거룩하고 보편된 교회와 모든 성인의 통공을 믿으며\n'
        '죄의 용서와 육신의 부활을 믿으며\n'
        '영원한 삶을 믿나이다.\n'
        '아멘.',
    endsWithAmen: true,
  );

  /// 주님의 기도.
  static const ourFather = Prayer(
    id: 'our_father',
    title: '주님의 기도',
    text:
        '하늘에 계신 우리 아버지,\n'
        '아버지의 이름이 거룩히 빛나시며\n'
        '아버지의 나라가 오시며\n'
        '아버지의 뜻이 하늘에서와 같이\n'
        '땅에서도 이루어지소서!\n'
        '오늘 저희에게 일용할 양식을 주시고\n'
        '저희에게 잘못한 이를 저희가 용서하오니\n'
        '저희 죄를 용서하시고\n'
        '저희를 유혹에 빠지지 않게 하시고\n'
        '악에서 구하소서.\n'
        '아멘.',
    endsWithAmen: true,
  );

  /// 성모송.
  static const hailMary = Prayer(
    id: 'hail_mary',
    title: '성모송',
    text:
        '은총이 가득하신 마리아님, 기뻐하소서!\n'
        '주님께서 함께 계시니 여인 중에 복되시며\n'
        '태중의 아들 예수님 또한 복되시나이다.\n'
        '천주의 성모 마리아님,\n'
        '이제와 저희 죽을 때에\n'
        '저희 죄인을 위하여 빌어 주소서.\n'
        '아멘.',
    endsWithAmen: true,
  );

  /// 영광송. 첫 행('영광이 성부와 성자와 성령께')에서 고개를 숙인다.
  static const gloryBe = Prayer(
    id: 'glory_be',
    title: '영광송',
    text:
        '영광이 성부와 성자와 성령께\n'
        '처음과 같이\n'
        '이제와 항상 영원히.\n'
        '아멘.',
    endsWithAmen: true,
  );

  /// 구원을 비는 기도(구원송, 파티마 기도).
  ///
  /// 『가톨릭 기도서』 공식 본문은 '아멘'으로 끝나지 않는다. 각 단의 영광송 뒤에 바칠 수 있다.
  static const fatima = Prayer(
    id: 'fatima',
    title: '구원을 비는 기도',
    text:
        '예수님, 저희 죄를 용서하시며\n'
        '저희를 지옥 불에서 구하시고\n'
        '연옥 영혼을 돌보시며\n'
        '가장 버림받은 영혼을 돌보소서.',
    endsWithAmen: false,
  );

  /// 성모 찬송(Salve Regina). 묵주기도를 마치며 바칠 수 있는 선택 기도.
  ///
  /// 『가톨릭 기도서』에서는 ○/● 교송 형식으로 실려 있으며, 그 뒤에
  /// [salveReginaCollect]의 응송과 마침 기도가 이어진다.
  static const salveRegina = Prayer(
    id: 'salve_regina',
    title: '성모 찬송',
    text:
        '모후이시며 사랑이 넘친 어머니,\n'
        '우리의 생명, 기쁨, 희망이시여,\n'
        '당신 우러러 하와의 그 자손들이\n'
        '눈물을 흘리며 부르짖나이다,\n'
        '슬픔의 골짜기에서.\n'
        '우리들의 보호자 성모님,\n'
        '불쌍한 저희를\n'
        '인자로운 눈으로 굽어보소서.\n'
        '귀양살이 끝날 때에\n'
        '당신의 아들 우리 주 예수님 뵙게 하소서.\n'
        '너그러우시고 자애로우시며\n'
        '오! 아름다우신 동정 마리아님.',
    endsWithAmen: false,
  );

  /// 성모 찬송에 이어지는 응송과 마침 기도('기도합시다').
  ///
  /// [all]에는 포함되지 않는다. 성모 찬송 뒤에 선택적으로 이어 바친다.
  static const salveReginaCollect = Prayer(
    id: 'salve_regina_collect',
    title: '성모 찬송 마침 기도',
    text:
        '천주의 성모님, 저희를 위하여 빌어 주시어\n'
        '그리스도께서 약속하신 영원한 생명을 얻게 하소서.\n'
        '기도합시다.\n'
        '하느님,\n'
        '외아드님께서 삶과 죽음과 부활로\n'
        '저희에게 영원한 구원을 마련해 주셨나이다.\n'
        '복되신 동정 마리아와 함께 이 신비를 묵상하며\n'
        '묵주 기도를 바치오니\n'
        '저희가 그 가르침을 따라\n'
        '영원한 생명을 얻게 하소서.\n'
        '우리 주 그리스도를 통하여 비나이다.\n'
        '아멘.',
    endsWithAmen: true,
  );

  /// 묵주기도 순서에 쓰이는 기본 기도문 7개.
  static const all = [
    signOfCross,
    apostlesCreed,
    ourFather,
    hailMary,
    gloryBe,
    fatima,
    salveRegina,
  ];
}

/// 묵주기도의 네 가지 신비.
enum MysterySet {
  /// 환희의 신비 (월·토).
  joyful,

  /// 빛의 신비 (목).
  luminous,

  /// 고통의 신비 (화·금).
  sorrowful,

  /// 영광의 신비 (수·일).
  glorious;

  /// 요일별 기본 신비. [weekday]는 [DateTime.weekday] (1=월 .. 7=일).
  static MysterySet forWeekday(int weekday) => mysterySetForWeekday(weekday);
}

/// 묵주기도의 한 단.
class Mystery {
  /// 한 단을 만든다.
  const Mystery({
    required this.set,
    required this.index,
    required this.title,
    required this.meditation,
  });

  /// 소속 신비.
  final MysterySet set;

  /// 1..5
  final int index;

  /// 예: '환희의 신비 1단'.
  final String title;

  /// 예: '마리아께서 예수님을 잉태하심을 묵상합시다.'
  final String meditation;
}

/// 20단 신비 전문.
abstract final class Mysteries {
  /// 환희의 신비 1~5단.
  static const joyful = [
    Mystery(
      set: MysterySet.joyful,
      index: 1,
      title: '환희의 신비 1단',
      meditation: '마리아께서 예수님을 잉태하심을 묵상합시다.',
    ),
    Mystery(
      set: MysterySet.joyful,
      index: 2,
      title: '환희의 신비 2단',
      meditation: '마리아께서 엘리사벳을 찾아보심을 묵상합시다.',
    ),
    Mystery(
      set: MysterySet.joyful,
      index: 3,
      title: '환희의 신비 3단',
      meditation: '마리아께서 예수님을 낳으심을 묵상합시다.',
    ),
    Mystery(
      set: MysterySet.joyful,
      index: 4,
      title: '환희의 신비 4단',
      meditation: '마리아께서 예수님을 성전에 바치심을 묵상합시다.',
    ),
    Mystery(
      set: MysterySet.joyful,
      index: 5,
      title: '환희의 신비 5단',
      meditation: '마리아께서 잃으셨던 예수님을 성전에서 찾으심을 묵상합시다.',
    ),
  ];

  /// 빛의 신비 1~5단.
  static const luminous = [
    Mystery(
      set: MysterySet.luminous,
      index: 1,
      title: '빛의 신비 1단',
      meditation: '예수님께서 세례 받으심을 묵상합시다.',
    ),
    Mystery(
      set: MysterySet.luminous,
      index: 2,
      title: '빛의 신비 2단',
      meditation: '예수님께서 카나에서 첫 기적을 행하심을 묵상합시다.',
    ),
    Mystery(
      set: MysterySet.luminous,
      index: 3,
      title: '빛의 신비 3단',
      meditation: '예수님께서 하느님 나라를 선포하심을 묵상합시다.',
    ),
    Mystery(
      set: MysterySet.luminous,
      index: 4,
      title: '빛의 신비 4단',
      meditation: '예수님께서 거룩하게 변모하심을 묵상합시다.',
    ),
    Mystery(
      set: MysterySet.luminous,
      index: 5,
      title: '빛의 신비 5단',
      meditation: '예수님께서 성체성사를 세우심을 묵상합시다.',
    ),
  ];

  /// 고통의 신비 1~5단.
  static const sorrowful = [
    Mystery(
      set: MysterySet.sorrowful,
      index: 1,
      title: '고통의 신비 1단',
      meditation: '예수님께서 우리를 위하여 피땀 흘리심을 묵상합시다.',
    ),
    Mystery(
      set: MysterySet.sorrowful,
      index: 2,
      title: '고통의 신비 2단',
      meditation: '예수님께서 우리를 위하여 매 맞으심을 묵상합시다.',
    ),
    Mystery(
      set: MysterySet.sorrowful,
      index: 3,
      title: '고통의 신비 3단',
      meditation: '예수님께서 우리를 위하여 가시관 쓰심을 묵상합시다.',
    ),
    Mystery(
      set: MysterySet.sorrowful,
      index: 4,
      title: '고통의 신비 4단',
      meditation: '예수님께서 우리를 위하여 십자가 지심을 묵상합시다.',
    ),
    Mystery(
      set: MysterySet.sorrowful,
      index: 5,
      title: '고통의 신비 5단',
      meditation: '예수님께서 우리를 위하여 십자가에 못 박혀 돌아가심을 묵상합시다.',
    ),
  ];

  /// 영광의 신비 1~5단.
  static const glorious = [
    Mystery(
      set: MysterySet.glorious,
      index: 1,
      title: '영광의 신비 1단',
      meditation: '예수님께서 부활하심을 묵상합시다.',
    ),
    Mystery(
      set: MysterySet.glorious,
      index: 2,
      title: '영광의 신비 2단',
      meditation: '예수님께서 승천하심을 묵상합시다.',
    ),
    Mystery(
      set: MysterySet.glorious,
      index: 3,
      title: '영광의 신비 3단',
      meditation: '예수님께서 성령을 보내심을 묵상합시다.',
    ),
    Mystery(
      set: MysterySet.glorious,
      index: 4,
      title: '영광의 신비 4단',
      meditation: '예수님께서 마리아를 하늘에 불러올리심을 묵상합시다.',
    ),
    Mystery(
      set: MysterySet.glorious,
      index: 5,
      title: '영광의 신비 5단',
      meditation: '예수님께서 마리아께 천상 모후의 관을 씌우심을 묵상합시다.',
    ),
  ];

  /// 네 신비 20단 전체 (환희 → 빛 → 고통 → 영광 순).
  static const all = [...joyful, ...luminous, ...sorrowful, ...glorious];
}

/// [MysterySet]의 한글 이름과 소속 단 목록.
extension MysterySetInfo on MysterySet {
  /// '환희의 신비', '빛의 신비', '고통의 신비', '영광의 신비'.
  String get koreanName => switch (this) {
    MysterySet.joyful => '환희의 신비',
    MysterySet.luminous => '빛의 신비',
    MysterySet.sorrowful => '고통의 신비',
    MysterySet.glorious => '영광의 신비',
  };

  /// 이 신비의 5단.
  List<Mystery> get mysteries => switch (this) {
    MysterySet.joyful => Mysteries.joyful,
    MysterySet.luminous => Mysteries.luminous,
    MysterySet.sorrowful => Mysteries.sorrowful,
    MysterySet.glorious => Mysteries.glorious,
  };

  /// 이 신비를 바치는 요일 ([DateTime.weekday] 값, 1=월 .. 7=일).
  List<int> get weekdays => switch (this) {
    MysterySet.joyful => const [DateTime.monday, DateTime.saturday],
    MysterySet.luminous => const [DateTime.thursday],
    MysterySet.sorrowful => const [DateTime.tuesday, DateTime.friday],
    MysterySet.glorious => const [DateTime.wednesday, DateTime.sunday],
  };
}

/// 요일별 기본 신비. [weekday]는 [DateTime.weekday] (1=월 .. 7=일).
///
/// 월·토 환희, 목 빛, 화·금 고통, 수·일 영광
/// (교황 요한 바오로 2세 교서 『동정 마리아의 묵주기도』 38항의 배분).
MysterySet mysterySetForWeekday(int weekday) => switch (weekday) {
  DateTime.monday || DateTime.saturday => MysterySet.joyful,
  DateTime.thursday => MysterySet.luminous,
  DateTime.tuesday || DateTime.friday => MysterySet.sorrowful,
  DateTime.wednesday || DateTime.sunday => MysterySet.glorious,
  _ => throw RangeError.range(
    weekday,
    DateTime.monday,
    DateTime.sunday,
    'weekday',
  ),
};
