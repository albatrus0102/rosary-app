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
}
