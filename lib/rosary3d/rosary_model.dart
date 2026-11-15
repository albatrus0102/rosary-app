import 'dart:math' as math;

import '../domain/rosary_sequence.dart';

/// 3D 묵주(T-81)의 순수 규칙: 스텝 → 묵주 경로 위치, 묵주 목록, 촉각·소리 신호, 당기기 판정.
/// 3D 는 진행 상태를 '표시'만 한다. 진행은 늘 [RosarySession](도메인)이 정한다.

/// 경로 노드 수(십자가 0, 알 59, 메달 6, 고리 끝 메달 61) — assets/rosary3d/layout.js 와 같다.
const int rosaryNodeCount = 62;

/// 실물 알 수(5단 묵주).
const int rosaryBeadCount = 59;

int _bigNode(int d) => d == 1 ? 5 : 17 + (d - 2) * 11;
int _smallNode(int d, int n) => (d == 1 ? 6 : _bigNode(d)) + n;

/// 경로 위 노드 종류.
enum RosaryNodeKind { cross, big, small, medal }

/// 노드 i 의 종류.
RosaryNodeKind rosaryNodeKind(int i) {
  if (i == 0) return RosaryNodeKind.cross;
  if (i == 6 || i == 61) return RosaryNodeKind.medal;
  if (i == 1 || i == 5) return RosaryNodeKind.big;
  if (i >= 17 && i <= 50 && (i - 17) % 11 == 0) return RosaryNodeKind.big;
  return RosaryNodeKind.small;
}

/// 스텝 인덱스(buildRosarySequence 의 0..72) → 경로 위치(소수).
/// 영광송·구원의 기도는 10번째 알 다음 '체인 위'(+0.35, +0.65)라 알이 늘지 않는다. layout.js stepPos 와 같다.
double rosaryStepPos(int step) {
  if (step <= 1) return 0;
  if (step == 2) return 1;
  if (step <= 5) return (step - 1).toDouble();
  if (step == 6) return 4.5;
  if (step >= 72) return 61;
  final d = (step - 7) ~/ 13 + 1, r = (step - 7) % 13;
  if (r == 0) return _bigNode(d).toDouble();
  if (r <= 10) return _smallNode(d, r).toDouble();
  return _smallNode(d, 10) + (r == 11 ? 0.35 : 0.65);
}

/// 묵주 하나의 정보(갤러리·설정). 모양·재질은 assets/rosary3d/defs.js 가 정한다(id 가 같아야 한다).
class RosaryInfo {
  const RosaryInfo(this.id, this.name, this.category, this.description);
  final String id;
  final String name;

  /// 재질 분류(갤러리 필터): 원목 · 진주 · 수정.
  final String category;
  final String description;
}

const List<RosaryInfo> rosaryCatalog = [
  RosaryInfo(
    'olive',
    '올리브 원목 묵주',
    '원목',
    '베들레헴 올리브 나무 결이 그대로 보이는 손때 묻은 원목 알, 꼬은 갈색 끈과 매듭, '
        '나무 십자가에 앤티크 은빛 예수님 형상.',
  ),
  RosaryInfo(
    'ebony',
    '흑단 원목 묵주',
    '원목',
    '깊은 검정에 은은한 결이 비치는 반광택 흑단 원통 알, 앤티크 은 체인, 성 베네딕토 메달 십자가.',
  ),
  RosaryInfo(
    'rosewood',
    '로즈우드 묵주',
    '원목',
    '적갈색 결이 촘촘히 겹친 로즈우드 둥근 알과 매듭 끈, 금 장식을 두른 로즈우드 십자가.',
  ),
  RosaryInfo(
    'pearl',
    '아이보리 진주 묵주',
    '진주',
    '은은한 무지갯빛이 도는 아이보리 진주, 꽃잎 금 마개와 금 고리, 꽃봉오리형 금 십자가와 성모 메달.',
  ),
  RosaryInfo(
    'crystal',
    '청색 수정 묵주',
    '수정·유리',
    '빛을 꺾는 면 깎은 청색 수정 알, 은 체인과 투각 세공 은 십자가.',
  ),
  RosaryInfo(
    'glass',
    '초록 유리 묵주',
    '수정·유리',
    '손으로 녹여 빚은 초록 유리알(기포·잔물결), 은 고리, 단순한 은 십자가와 성심 하트 메달.',
  ),
  RosaryInfo(
    'amethyst',
    '자수정 묵주',
    '수정·유리',
    '색띠가 지는 보라 결정을 길쭉하게 깎은 알, 은 고리, 은 투각 십자가와 세공 메달.',
  ),
  RosaryInfo(
    'rosequartz',
    '장미석 묵주',
    '수정·유리',
    '우윳빛 결이 비치는 분홍 장미석, 로즈골드 꽃잎 마개와 고리, 꽃봉오리형 십자가와 하트 메달.',
  ),
  RosaryInfo(
    'amber',
    '호박 묵주',
    '보석',
    '따뜻한 금빛 호박을 자연 그대로 다듬은 알(속 무늬·내포물), 매듭 끈, 청동 켈트 십자가.',
  ),
  RosaryInfo(
    'lapis',
    '청금석 묵주',
    '보석',
    '금빛 황철석 점과 흰 결이 박힌 짙푸른 청금석 큐브 알, 금 체인, 금 성 베네딕토 십자가.',
  ),
  RosaryInfo(
    'jade',
    '옥 묵주',
    '보석',
    '은은히 빛이 스미는 녹색 옥 론델 알과 붉은 매듭 끈, 금 장식 옥 십자가.',
  ),
  RosaryInfo(
    'silver',
    '앤티크 실버 세공 묵주',
    '금속',
    '마름모·꽃잎을 새긴 세공 은구슬(홈은 산화), 굵은 은 체인, 은 투각 십자가.',
  ),
  RosaryInfo(
    'gold',
    '금도금 묵주',
    '금속',
    '골이 진 멜론형 금도금 알(미세한 두드림 결), 금 체인, 금 켈트 십자가와 세공 메달.',
  ),
  RosaryInfo(
    'ceramic',
    '세라믹 묵주',
    '도자',
    '흰 유약 위에 쪽빛 꽃을 손으로 그린 도자 알, 파란 끈, 도자 십자가와 은 메달.',
  ),
];

/// 갤러리 재질 분류(카탈로그 순서).
List<String> get rosaryCategories =>
    <String>{for (final r in rosaryCatalog) r.category}.toList();

RosaryInfo rosaryInfo(String id) => rosaryCatalog.firstWhere(
  (r) => r.id == id,
  orElse: () => rosaryCatalog.first,
);

/// 한 스텝 이동에 맞는 촉각·소리 신호(요구서 표).
enum RosaryCue {
  /// 성모송 알로 이동: 25ms 진동 + 작은 접촉음.
  bead,

  /// 주님의 기도 시작(서두): 80ms 진동 + 낮은 단음.
  ourFather,

  /// 10번째 성모송을 바치고 넘김: 짧은 진동 2회 + 높이 다른 종 2회.
  tenComplete,

  /// 영광송 시작: 중간 진동.
  gloryBe,

  /// 다음 신비(단의 주님의 기도): 긴 진동 1회 + 은은한 종.
  mystery,

  /// 5단 완료(마침으로): 긴 진동 3회 + 잔잔한 종.
  rosaryComplete,

  /// 그 밖의 이동(사도신경·구원의 기도·뒤로): 아주 짧은 틱.
  minor,
}

/// [from]에서 [to]로 한 칸 이동할 때의 신호. 뒤로 가면 완료 신호를 내지 않는다(틱만).
RosaryCue rosaryCueFor(
  RosaryStep from,
  RosaryStep to, {
  required bool forward,
}) {
  if (!forward) return RosaryCue.minor;
  // 완료 신호는 10번째를 '바친 뒤 넘길 때' — 10번째 알에 도착할 때가 아니다.
  if (from.kind == StepKind.hailMary && from.beadIndex == 10) {
    return RosaryCue.tenComplete;
  }
  switch (to.kind) {
    case StepKind.hailMary:
      return RosaryCue.bead;
    case StepKind.ourFather:
      return to.decade == null ? RosaryCue.ourFather : RosaryCue.mystery;
    case StepKind.gloryBe:
      return RosaryCue.gloryBe;
    case StepKind.closing:
      return RosaryCue.rosaryComplete;
    case StepKind.signOfCross:
    case StepKind.apostlesCreed:
    case StepKind.fatima:
      return RosaryCue.minor;
  }
}

/// 신호를 '성모송 완료 알림만' 설정에서도 낼지.
bool rosaryCueIsMilestone(RosaryCue c) =>
    c == RosaryCue.tenComplete ||
    c == RosaryCue.mystery ||
    c == RosaryCue.rosaryComplete;

/// 진동 패턴(ms): [쉼, 울림, 쉼, 울림 …]. 세기는 설정(0.2..1)으로 곱한다.
List<int> rosaryVibePattern(RosaryCue c) => switch (c) {
  RosaryCue.bead => const [0, 25],
  RosaryCue.minor => const [0, 12],
  RosaryCue.ourFather => const [0, 80],
  RosaryCue.gloryBe => const [0, 50],
  RosaryCue.tenComplete => const [0, 40, 90, 40],
  RosaryCue.mystery => const [0, 320],
  RosaryCue.rosaryComplete => const [0, 300, 180, 300, 180, 300],
};

/// 음성 제목 안내 문구(기기 음성). 성모송은 순번을 우리말 서수로 읽는다.
String rosaryVoiceTitle(RosaryStep s) {
  const ord = ['첫', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉', '열'];
  if (s.kind == StepKind.hailMary && s.beadIndex != null) {
    final n = s.beadIndex!;
    return n == 1 ? '성모송 첫 번째입니다' : '성모송 ${ord[n - 1]} 번째입니다';
  }
  if (s.kind == StepKind.ourFather && s.decade != null) {
    return '${s.decade}단, 주님의 기도입니다';
  }
  return '${s.title}입니다';
}

/// 세로 당기기 판정: 한 제스처 = 한 단계. 아래로 당기면 다음(+1), 위로 당기면 이전(-1).
///
/// - 끄는 동안의 표시 이동량은 ±1 알을 넘지 않는다(고무줄처럼 줄어든다).
/// - 놓을 때 [commitFraction] 이상 끌었거나 빠르게 튕기면 한 칸, 아니면 제자리로 돌아간다.
/// - 직전 넘김 뒤 [cooldown] 안의 새 넘김은 무시한다(빠른 연타로 여러 알이 넘어가지 않게).
class BeadPull {
  BeadPull({
    this.commitFraction = 0.32,
    this.flingVelocity = 650,
    this.cooldown = const Duration(milliseconds: 260),
  });

  final double commitFraction;
  final double flingVelocity;
  final Duration cooldown;

  double _dy = 0;
  Duration? _lastCommit;

  /// 끌기 시작.
  void start() => _dy = 0;

  /// 끈 거리(+ 아래)를 더하고, 3D 에 보낼 표시 이동량(알 단위, -1..1)을 돌려준다.
  double update(double deltaDy, double beadSpacingPx) {
    _dy += deltaDy;
    final raw = _dy / beadSpacingPx;
    // 0.6 알까지는 그대로, 그 뒤는 점점 무거워지며 1 을 넘지 않는다.
    final a = raw.abs();
    final shown = a <= 0.6 ? a : 0.6 + 0.4 * (1 - math.exp(-(a - 0.6) * 2.5));
    return raw.sign * shown;
  }

  /// 놓음: +1 다음, -1 이전, 0 제자리.
  /// [now]은 단조 시각(프레임 시각 등).
  int end(double velocityDy, double beadSpacingPx, {required Duration now}) {
    final t = now;
    final frac = _dy / beadSpacingPx;
    _dy = 0;
    var dir = 0;
    if (frac.abs() >= commitFraction) {
      dir = frac.sign.toInt();
    } else if (velocityDy.abs() >= flingVelocity && frac.abs() > 0.05) {
      dir = velocityDy.sign.toInt();
    }
    if (dir == 0) return 0;
    final last = _lastCommit;
    if (last != null && t - last < cooldown) return 0;
    _lastCommit = t;
    return dir;
  }
}
