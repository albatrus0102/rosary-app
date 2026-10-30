import 'dart:ui' show Color;

/// 묵주 모양(이미지) 스타일.
enum RosaryStyle {
  bead,
  knot,
  rosewood,
  crystal,
  pearl,
  jade,
  pastel,
  lourdes,
  fatima,
  penal,
  stuart,
  jp2,
}

extension RosaryStyleAssets on RosaryStyle {
  /// 묵주 전체 이미지.
  String get fullImage => switch (this) {
    RosaryStyle.bead => 'assets/images/rosary.png',
    RosaryStyle.knot => 'assets/images/rosary_knot.png',
    RosaryStyle.rosewood => 'assets/images/rosary_rosewood.png',
    RosaryStyle.crystal => 'assets/images/rosary_crystal.png',
    RosaryStyle.pearl => 'assets/images/rosary_pearl.png',
    RosaryStyle.jade => 'assets/images/rosary_jade.png',
    RosaryStyle.pastel => 'assets/images/rosary_pastel.png',
    RosaryStyle.lourdes => 'assets/images/rosary_lourdes.png',
    RosaryStyle.fatima => 'assets/images/rosary_fatima.png',
    RosaryStyle.penal => 'assets/images/rosary_penal.png',
    RosaryStyle.stuart => 'assets/images/rosary_stuart.png',
    RosaryStyle.jp2 => 'assets/images/rosary_jp2.png',
  };

  /// 구슬(매듭) 하나의 이미지.
  String get unitImage => switch (this) {
    RosaryStyle.bead => 'assets/images/bead.png',
    RosaryStyle.knot => 'assets/images/knot.png',
    RosaryStyle.rosewood => 'assets/images/rosewood.png',
    RosaryStyle.crystal => 'assets/images/crystal.png',
    RosaryStyle.pearl => 'assets/images/pearl.png',
    RosaryStyle.jade => 'assets/images/jade.png',
    RosaryStyle.pastel => 'assets/images/pastel.png',
    RosaryStyle.lourdes => 'assets/images/lourdes.png',
    RosaryStyle.fatima => 'assets/images/fatima.png',
    RosaryStyle.penal => 'assets/images/penal.png',
    RosaryStyle.stuart => 'assets/images/stuart.png',
    RosaryStyle.jp2 => 'assets/images/jp2.png',
  };

  /// 묵주 전체 지도에서 이미지가 없을 때 그리는 구슬 색.
  Color get beadColor => switch (this) {
    RosaryStyle.bead => const Color(0xFF2E4A7A),
    RosaryStyle.knot => const Color(0xFF2E4A7A),
    RosaryStyle.rosewood => const Color(0xFF7A4B2E),
    RosaryStyle.crystal => const Color(0xFF8EC2F0),
    RosaryStyle.pearl => const Color(0xFFF2EFE8),
    RosaryStyle.jade => const Color(0xFF8FBF9A),
    RosaryStyle.pastel => const Color(0xFFF7B7C8),
    RosaryStyle.lourdes => const Color(0xFFFFFFFF),
    RosaryStyle.fatima => const Color(0xFFF5F2EC),
    RosaryStyle.penal => const Color(0xFF5A3A28),
    RosaryStyle.stuart => const Color(0xFFD4A33D),
    RosaryStyle.jp2 => const Color(0xFF1F3A8A),
  };

  /// 사슬, 메달, 십자가에 쓰는 금속 색(금, 은, 청동 등).
  Color get accentColor => switch (this) {
    RosaryStyle.bead => const Color(0xFFC9A04A),
    RosaryStyle.knot => const Color(0xFFC9A04A),
    RosaryStyle.rosewood => const Color(0xFFA9743F),
    RosaryStyle.crystal => const Color(0xFF9CA6B3),
    RosaryStyle.pearl => const Color(0xFF9CA6B3),
    RosaryStyle.jade => const Color(0xFFC9A04A),
    RosaryStyle.pastel => const Color(0xFFD9A38F),
    RosaryStyle.lourdes => const Color(0xFFC9A04A),
    RosaryStyle.fatima => const Color(0xFF9CA6B3),
    RosaryStyle.penal => const Color(0xFF6B7078),
    RosaryStyle.stuart => const Color(0xFFB8892E),
    RosaryStyle.jp2 => const Color(0xFF9CA6B3),
  };

  String get label => switch (this) {
    RosaryStyle.bead => '구슬 묵주',
    RosaryStyle.knot => '매듭 묵주',
    RosaryStyle.rosewood => '장미목 묵주',
    RosaryStyle.crystal => '크리스탈 묵주',
    RosaryStyle.pearl => '자개 묵주',
    RosaryStyle.jade => '옥 묵주',
    RosaryStyle.pastel => '파스텔 묵주',
    RosaryStyle.lourdes => '루르드 묵주',
    RosaryStyle.fatima => '파티마 묵주',
    RosaryStyle.penal => '아일랜드 형벌 묵주',
    RosaryStyle.stuart => '메리 여왕 황금 묵주',
    RosaryStyle.jp2 => '요한 바오로 2세 묵주',
  };

  /// 묵주 모양에 대한 짧은 설명.
  String get description => switch (this) {
    RosaryStyle.bead => '가장 널리 쓰이는 기본 묵주입니다. 작은 구슬 하나가 성모송 한 번, 큰 구슬이 주님의 기도이며, 손끝으로 구슬을 세며 기도에 집중합니다.',
    RosaryStyle.knot => '끈에 매듭을 지어 만든 소박한 묵주입니다. 사막의 수도자들이 끈의 매듭으로 기도 횟수를 세던 전통에서 비롯되었고, 청빈과 단순함을 상징합니다.',
    RosaryStyle.rosewood => '장미 향이 나는 나무로 만든 묵주입니다. "로사리오"는 "장미 화관"이라는 뜻으로, 성모송 한 번이 성모님께 바치는 장미 한 송이라는 전통을 담고 있습니다.',
    RosaryStyle.crystal => '빛을 통과시키는 맑은 크리스탈 묵주입니다. 기도로 맑아지는 마음과 성모님의 순결을 상징하며, 첫영성체나 혼인 선물로 자주 쓰입니다.',
    RosaryStyle.pearl => '진주와 자개로 만든 묵주입니다. 조개 속에서 오랜 시간 맺히는 진주처럼 고통 속에서 자라는 은총을 떠올리게 하며, 성모님의 순결을 상징합니다.',
    RosaryStyle.jade =>
      '동양에서 덕과 평화를 상징해 온 옥으로 만든 묵주입니다. 한국 신자들이 즐겨 쓰는 소재로, 차분한 빛깔이 묵상에 어울립니다.',
    RosaryStyle.pastel =>
      '밝은 파스텔 색의 묵주입니다. 어린이와 젊은이들이 묵주기도를 친근하고 즐겁게 시작할 수 있도록 만들어졌습니다.',
    RosaryStyle.lourdes => '1858년 루르드 발현 때 성 베르나데트는 성모님이 흰 구슬에 금빛 사슬 묵주를 들고 계셨다고 증언했습니다. 치유와 회개의 기도를 상징합니다.',
    RosaryStyle.fatima => '1917년 파티마 발현에서 성모님은 세 목동에게 "매일 묵주기도를 바치라"고 당부하셨습니다. 세계 평화와 죄인의 회개를 위한 기도를 상징합니다.',
    RosaryStyle.penal => '17~18세기 아일랜드 박해기에 신자들이 숨기기 쉽도록 한 단짜리로 만든 묵주입니다. 반지를 손가락에 끼고 돌려 가며 다섯 단을 바쳤으며, 박해 속에서 지킨 신앙의 인내를 상징합니다.',
    RosaryStyle.stuart => '스코틀랜드 여왕 메리 스튜어트가 1587년 처형되는 순간까지 지녔던 황금 묵주입니다. 죽음 앞에서도 놓지 않은 신앙을 상징합니다.',
    RosaryStyle.jp2 => '"묵주기도의 교황"으로 불린 성 요한 바오로 2세는 2002년 빛의 신비를 더했고 만나는 이들에게 수많은 묵주를 선물했습니다. 교황 문장이 새겨진 메달이 특징입니다.',
  };
}
