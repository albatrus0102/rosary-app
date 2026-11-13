// 기도 화면 배경 그림: 신비(기쁨·빛·고통·영광)와 단마다 한 장.
//
// 고통의 신비는 십자가의 길 그림을 먼저 쓴다(3단 = 1처의 가시관 쓰신 예수님, 4단 = 2처, 5단 = 12처).
// 1·2단(겟세마니·채찍질)은 십자가의 길에 없는 장면이라 거장 그림을 쓴다.
// 출처·라이선스: docs/ux/ART_REFERENCES.md, 앱 안 '성화 출처' 화면(art_credits.dart).

import 'prayer_data.dart';
import 'stations_of_cross.dart';

/// 배경 그림 한 장: 에셋 경로와 초점(0..1, 왼쪽 위 0/0).
class MysteryArt {
  const MysteryArt(this.asset, this.fx, this.fy);

  final String asset;
  final double fx;
  final double fy;

  @override
  bool operator ==(Object other) => other is MysteryArt && other.asset == asset;

  @override
  int get hashCode => asset.hashCode;
}

const Map<MysterySet, List<(double, double)>> _focus = {
  MysterySet.joyful: [
    (0.78, 0.38),
    (0.50, 0.30),
    (0.62, 0.55),
    (0.62, 0.22),
    (0.42, 0.36),
  ],
  MysterySet.luminous: [
    (0.50, 0.33),
    (0.33, 0.52),
    (0.62, 0.27),
    (0.50, 0.13),
    (0.50, 0.45),
  ],
  MysterySet.sorrowful: [(0.45, 0.33), (0.52, 0.38)],
  MysterySet.glorious: [
    (0.50, 0.42),
    (0.50, 0.33),
    (0.50, 0.36),
    (0.50, 0.32),
    (0.50, 0.40),
  ],
};

/// 고통의 신비 3·4·5단이 쓰는 십자가의 길 처.
const Map<int, int> sorrowfulStationArt = {3: 1, 4: 2, 5: 12};

/// [set]의 [decade]단(1..5) 배경. 단이 없는 기도(시작·마침)는 가까운 단을 쓴다.
MysteryArt mysteryArtFor(MysterySet set, int? decade) {
  final d = (decade ?? 1).clamp(1, 5);
  if (set == MysterySet.sorrowful && sorrowfulStationArt.containsKey(d)) {
    final st = StationsOfCross.byNumber(sorrowfulStationArt[d]!);
    final (fx, fy) = st.focus;
    return MysteryArt(st.imageAsset, fx, fy);
  }
  final (fx, fy) = _focus[set]![d - 1];
  return MysteryArt('assets/images/mysteries/${set.name}_$d.webp', fx, fy);
}

/// 번들된 배경 그림 경로 전부(시험용).
List<String> get allMysteryArtAssets => [
  for (final s in MysterySet.values)
    for (var d = 1; d <= 5; d++) mysteryArtFor(s, d).asset,
];
