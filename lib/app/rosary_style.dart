/// 묵주 모양(이미지) 스타일.
enum RosaryStyle { bead, knot }

extension RosaryStyleAssets on RosaryStyle {
  /// 묵주 전체 이미지.
  String get fullImage => switch (this) {
    RosaryStyle.bead => 'assets/images/rosary.png',
    RosaryStyle.knot => 'assets/images/rosary_knot.png',
  };

  /// 구슬(매듭) 하나의 이미지.
  String get unitImage => switch (this) {
    RosaryStyle.bead => 'assets/images/bead.png',
    RosaryStyle.knot => 'assets/images/knot.png',
  };

  String get label => switch (this) {
    RosaryStyle.bead => '구슬 묵주',
    RosaryStyle.knot => '매듭 묵주',
  };
}
