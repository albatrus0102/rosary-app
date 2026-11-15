// 십자가의 길 '함께 바치기' 단계와 '바치는 법' 안내 글.
//
// 단계의 기도문·지시문·순서는 모두 `stations_prayers.dart`(주교회의 『가톨릭 기도서』)에서 온다.
// 여기서 새로 쓰는 글은 '지금 할 일' 한 줄과 안내 글뿐이며, 기도서 본문에 없는 내용은
// [StationsHowTo.customs]에 따로 모아 '일반적인 관습'이라고 밝힌다.

import 'stations_prayers.dart';

/// 한 단계의 종류.
enum StationsGuideKind {
  /// 시작 기도.
  opening,

  /// 제N처로 가며 ◎ 어머니께 청하오니 …
  move,

  /// '제N처 …을 묵상합시다.'
  announce,

  /// ┼ 주님께서는 … / ◎ 예수 그리스도님, (깊은 절을 하며) …
  verse,

  /// ○ 처별 기도.
  prayer,

  /// 잠깐 묵상한다. 주님의 기도, 성모송, 영광송.
  after,

  /// 14처 뒤 마침(공식 마침 기도는 없다).
  closing,
}

/// '함께 바치기'의 한 화면.
class StationsGuideStep {
  const StationsGuideStep({
    required this.kind,
    required this.station,
    required this.action,
    this.rubrics = const [],
    this.announce,
    this.parts = const [],
  });

  final StationsGuideKind kind;

  /// 1..14. 시작 기도는 0, 마침은 15.
  final int station;

  /// 지금 할 일(앱이 쓴 안내 한 줄).
  final String action;

  /// 기도서 지시문(그대로).
  final List<String> rubrics;

  /// '…을 묵상합시다.'(기도서 그대로, [StationsGuideKind.announce]에서만).
  final String? announce;

  /// 기호가 붙은 기도문(그대로).
  final List<StationsPrayerPart> parts;

  /// 깊은 절을 하는 단계인가(기도서 지시문 '깊은 절을 하며').
  bool get bow => parts.any((p) => p.lines.any((l) => l.rubric));
}

abstract final class StationsGuide {
  /// 한 처의 단계 수.
  static const int perStation = 5;

  /// 전체 단계: 시작 기도 1 + 14처 × 5 + 마침 1 = 72.
  static final List<StationsGuideStep> steps = _build();

  /// [n]처의 첫 단계('제N처로 가며') 위치.
  static int indexOfStation(int n) => 1 + (n.clamp(1, 14) - 1) * perStation;

  static List<StationsGuideStep> _build() {
    final out = <StationsGuideStep>[
      StationsGuideStep(
        kind: StationsGuideKind.opening,
        station: 0,
        action: '마음을 모으고 시작 기도를 읽으세요',
        rubrics: [StationsPrayers.openingRubric],
        parts: const [StationsPrayers.opening],
      ),
    ];
    for (final p in StationsPrayers.all) {
      out
        ..add(
          StationsGuideStep(
            kind: StationsGuideKind.move,
            station: p.n,
            action: '제${p.n}처로 이동하며 다 함께 읽으세요',
            rubrics: [p.movingRubric],
            parts: [p.moving],
          ),
        )
        ..add(
          StationsGuideStep(
            kind: StationsGuideKind.announce,
            station: p.n,
            action: '제${p.n}처 앞에서 묵상할 내용을 읽으세요',
            announce: p.announce,
          ),
        )
        ..add(
          StationsGuideStep(
            kind: StationsGuideKind.verse,
            station: p.n,
            action: '주송자가 읽으면, 다 함께 깊은 절을 하며 응답하세요',
            parts: p.verse,
          ),
        )
        ..add(
          StationsGuideStep(
            kind: StationsGuideKind.prayer,
            station: p.n,
            action: '선창자가 기도를 읽으세요',
            parts: [p.prayer],
          ),
        )
        ..add(
          StationsGuideStep(
            kind: StationsGuideKind.after,
            station: p.n,
            action: '잠깐 묵상한 뒤 주님의 기도, 성모송, 영광송을 바치세요',
            rubrics: p.after,
          ),
        );
    }
    out.add(
      const StationsGuideStep(
        kind: StationsGuideKind.closing,
        station: 15,
        action: '십자가의 길을 마쳤습니다',
      ),
    );
    return out;
  }
}

/// '바치는 법' 안내 글. [order]·[gestures]는 기도서 본문이 근거이고, [customs]는 본문에 없는 관습이다.
abstract final class StationsHowTo {
  static const String what =
      '예수님께서 사형 선고를 받으신 때부터 무덤에 묻히실 때까지의 길을 14처로 나누어, '
      '한 처씩 옮겨 가며 주님의 수난을 묵상하는 기도입니다.';

  /// 기도서 본문에 적힌 순서.
  static const List<String> order = [
    '먼저 깊이 뉘우치고 시작 기도(┼ 주 예수님, …)를 바칩니다.',
    '‘제1처로 가며’ ◎ 어머니께 청하오니 제 맘속에 주님 상처 깊이 새겨 주소서.',
    '‘제1처 예수님께서 사형 선고 받으심을 묵상합시다.’',
    '┼ 주님께서는 십자가로 온 세상을 구원하셨나이다.',
    '◎ 예수 그리스도님, (깊은 절을 하며) 경배하며 찬송하나이다.',
    '○ 그 처의 기도(구세주 예수님, …)',
    '잠깐 묵상하고 주님의 기도, 성모송, 영광송을 바칩니다.',
    '다음 처로 가며 2~7을 되풀이하여 제14처까지 바칩니다. 제14처 기도로 끝납니다.',
  ];

  /// 기도서 본문에 적힌 동작.
  static const List<String> gestures = [
    '깊은 절: 처마다 ◎ ‘예수 그리스도님,’ 다음에 깊은 절을 하며 ‘경배하며 찬송하나이다.’를 바칩니다.',
    '이동: 처마다 ‘제N처로 가며’ 다음 처로 옮겨 갑니다. 성당에서는 벽의 14처 판 앞으로 갑니다.',
  ];

  /// 기도서 본문에는 없는, 널리 하는 방식.
  static const List<String> customs = [
    '혼자 바칠 때는 ┼ ○ ◎ 부분을 모두 혼자 읽습니다.',
    '집에서는 걷지 않고 앉아서 그림을 보며 바쳐도 됩니다.',
    '‘어머니께 청하오니 …’는 노래로 부르기도 합니다.',
    '마칠 때 성호경을 긋습니다.',
    '14처를 다 바치는 데 보통 20~30분쯤 걸립니다.',
  ];

  static const String customsNote = '일반적인 관습 (기도서 본문에는 없음)';

  static const String source =
      '순서·지시문 출처: 한국천주교주교회의 『가톨릭 기도서』(개정판) ‘십자가의 길’';
}
