import 'prayer_data.dart';
import 'prayer_splits.dart';

/// 묵주기도 한 스텝의 종류.
enum StepKind {
  signOfCross,
  apostlesCreed,
  ourFather,
  hailMary,
  gloryBe,
  fatima,
  closing,
}

/// 묵주기도의 한 스텝(기도 하나, 구슬 하나).
class RosaryStep {
  const RosaryStep({
    required this.kind,
    required this.title,
    required this.text,
    required this.leaderText,
    required this.responderText,
    this.heading,
    this.triggerPhrases = const ['아멘'],
    this.decade,
    this.beadIndex,
  });

  /// 기도문에서 만든 스텝. 앞단/뒷단은 [splitPrayer]로 나눈다.
  factory RosaryStep.fromPrayer({
    required StepKind kind,
    required String title,
    required Prayer prayer,
    String? heading,
    List<String> triggerPhrases = const ['아멘'],
    int? decade,
    int? beadIndex,
  }) {
    final parts = splitPrayer(prayer);
    return RosaryStep(
      kind: kind,
      title: title,
      text: prayer.text,
      leaderText: parts.leader,
      responderText: parts.responder,
      heading: heading,
      triggerPhrases: triggerPhrases,
      decade: decade,
      beadIndex: beadIndex,
    );
  }

  final StepKind kind;

  /// 화면 상단 제목. 예: '성모송 3/10'.
  final String title;

  /// 단 시작 시 신비 묵상 문구. 예: '환희의 신비 1단\n마리아께서 ...'.
  final String? heading;

  /// 기도문 본문.
  final String text;

  /// 앞단(선창). 나뉘지 않는 기도(성호경)는 [text] 전체.
  final String leaderText;

  /// 뒷단(후창). 나뉘지 않으면 ''.
  final String responderText;

  /// 이 스텝에서 음성으로 다음으로 넘어가는 정규화된 문구들.
  final List<String> triggerPhrases;

  /// 1..5. 서두/마침은 null.
  final int? decade;

  /// 성모송 1..10(단) 또는 1..3(서두). 그 외 null.
  final int? beadIndex;

  bool get advancesByVoice => triggerPhrases.isNotEmpty;
}

/// 선택한 신비에 대한 전체 묵주기도 스텝 목록(73개)을 만든다.
List<RosaryStep> buildRosarySequence(MysterySet set) {
  final steps = <RosaryStep>[
    RosaryStep.fromPrayer(
      kind: StepKind.signOfCross,
      title: Prayers.signOfCross.title,
      prayer: Prayers.signOfCross,
    ),
    RosaryStep.fromPrayer(
      kind: StepKind.apostlesCreed,
      title: Prayers.apostlesCreed.title,
      prayer: Prayers.apostlesCreed,
    ),
    RosaryStep.fromPrayer(
      kind: StepKind.ourFather,
      title: Prayers.ourFather.title,
      prayer: Prayers.ourFather,
    ),
    for (var n = 1; n <= 3; n++)
      RosaryStep.fromPrayer(
        kind: StepKind.hailMary,
        title: '${Prayers.hailMary.title} $n/3',
        prayer: Prayers.hailMary,
        beadIndex: n,
      ),
    RosaryStep.fromPrayer(
      kind: StepKind.gloryBe,
      title: Prayers.gloryBe.title,
      prayer: Prayers.gloryBe,
    ),
  ];

  final mysteries = set.mysteries;
  for (var d = 1; d <= 5; d++) {
    final mystery = mysteries[d - 1];
    steps.add(
      RosaryStep.fromPrayer(
        kind: StepKind.ourFather,
        title: Prayers.ourFather.title,
        heading: '${mystery.title}\n${mystery.meditation}',
        prayer: Prayers.ourFather,
        decade: d,
      ),
    );
    for (var n = 1; n <= 10; n++) {
      steps.add(
        RosaryStep.fromPrayer(
          kind: StepKind.hailMary,
          title: '${Prayers.hailMary.title} $n/10',
          prayer: Prayers.hailMary,
          decade: d,
          beadIndex: n,
        ),
      );
    }
    steps.add(
      RosaryStep.fromPrayer(
        kind: StepKind.gloryBe,
        title: Prayers.gloryBe.title,
        prayer: Prayers.gloryBe,
        decade: d,
      ),
    );
    steps.add(
      RosaryStep.fromPrayer(
        kind: StepKind.fatima,
        title: Prayers.fatima.title,
        prayer: Prayers.fatima,
        triggerPhrases: const ['아멘', '돌보소서'],
        decade: d,
      ),
    );
  }

  steps.add(
    RosaryStep.fromPrayer(
      kind: StepKind.closing,
      title: '마침 ${Prayers.signOfCross.title}',
      prayer: Prayers.signOfCross,
    ),
  );
  return steps;
}
