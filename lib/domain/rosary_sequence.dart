import 'prayer_data.dart';

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
    this.heading,
    this.triggerPhrases = const ['아멘'],
    this.decade,
    this.beadIndex,
  });

  final StepKind kind;

  /// 화면 상단 제목. 예: '성모송 3/10'.
  final String title;

  /// 단 시작 시 신비 묵상 문구. 예: '환희의 신비 1단\n마리아께서 ...'.
  final String? heading;

  /// 기도문 본문.
  final String text;

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
    RosaryStep(
      kind: StepKind.signOfCross,
      title: Prayers.signOfCross.title,
      text: Prayers.signOfCross.text,
    ),
    RosaryStep(
      kind: StepKind.apostlesCreed,
      title: Prayers.apostlesCreed.title,
      text: Prayers.apostlesCreed.text,
    ),
    RosaryStep(
      kind: StepKind.ourFather,
      title: Prayers.ourFather.title,
      text: Prayers.ourFather.text,
    ),
    for (var n = 1; n <= 3; n++)
      RosaryStep(
        kind: StepKind.hailMary,
        title: '${Prayers.hailMary.title} $n/3',
        text: Prayers.hailMary.text,
        beadIndex: n,
      ),
    RosaryStep(
      kind: StepKind.gloryBe,
      title: Prayers.gloryBe.title,
      text: Prayers.gloryBe.text,
    ),
  ];

  final mysteries = set.mysteries;
  for (var d = 1; d <= 5; d++) {
    final mystery = mysteries[d - 1];
    steps.add(
      RosaryStep(
        kind: StepKind.ourFather,
        title: Prayers.ourFather.title,
        heading: '${mystery.title}\n${mystery.meditation}',
        text: Prayers.ourFather.text,
        decade: d,
      ),
    );
    for (var n = 1; n <= 10; n++) {
      steps.add(
        RosaryStep(
          kind: StepKind.hailMary,
          title: '${Prayers.hailMary.title} $n/10',
          text: Prayers.hailMary.text,
          decade: d,
          beadIndex: n,
        ),
      );
    }
    steps.add(
      RosaryStep(
        kind: StepKind.gloryBe,
        title: Prayers.gloryBe.title,
        text: Prayers.gloryBe.text,
        decade: d,
      ),
    );
    steps.add(
      RosaryStep(
        kind: StepKind.fatima,
        title: Prayers.fatima.title,
        text: Prayers.fatima.text,
        triggerPhrases: const ['아멘', '돌보소서'],
        decade: d,
      ),
    );
  }

  steps.add(
    RosaryStep(
      kind: StepKind.closing,
      title: '마침 ${Prayers.signOfCross.title}',
      text: Prayers.signOfCross.text,
    ),
  );
  return steps;
}
