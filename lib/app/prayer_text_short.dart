import '../domain/rosary_sequence.dart';

/// '외운 기도 짧게 보기'(설정 `shortPrayers`)에서 보여 주는 첫머리 형태.
///
/// 이 파일이 짧은 형태의 **유일한 정의**다. 기도문 본문(`prayer_data.dart`)은 건드리지 않고,
/// 아래 문구는 모두 공식 본문의 앞단/뒷단 **첫 줄의 앞부분**이며 끝에 '…'만 붙인다
/// (`test/prayer_text_short_test.dart`가 본문의 접두어인지 검사한다).
///
/// TODO(review): 사제·교구(주교회의 전례위원회) 검토 필요. 어느 기도를 줄여 보이는지,
/// 어디까지를 첫머리로 볼지는 신앙 공동체의 판단이다. 검토 전에는 기본 꺼짐을 유지한다.
///
/// 줄이지 않는 기도(늘 전문): 성호경, 사도신경, 서두의 주님의 기도, 영광송, 신비 안내(묵상 문구).
/// 줄이는 기도: 성모송(서두 3번 포함), 각 단의 주님의 기도, 구원을 비는 기도(파티마).
class ShortPrayer {
  const ShortPrayer({required this.leader, required this.responder});

  /// 앞단(선창) 첫머리. 예: '은총이 가득하신 마리아님, …'.
  final String leader;

  /// 뒷단(후창) 첫머리. 예: '천주의 성모 마리아님, …'.
  final String responder;

  /// 혼자 모드에서 보여 주는 두 줄.
  String get both => '$leader\n$responder';
}

abstract final class ShortPrayers {
  static const hailMary = ShortPrayer(
    leader: '은총이 가득하신 마리아님, …',
    responder: '천주의 성모 마리아님, …',
  );

  static const ourFather = ShortPrayer(
    leader: '하늘에 계신 우리 아버지, …',
    responder: '오늘 저희에게 일용할 양식을 주시고 …',
  );

  static const fatima = ShortPrayer(
    leader: '예수님, 저희 죄를 용서하시며 …',
    responder: '연옥 영혼을 돌보시며 …',
  );

  /// [step]의 짧은 형태. 늘 전문으로 보이는 기도는 null.
  static ShortPrayer? of(RosaryStep step) {
    switch (step.kind) {
      case StepKind.hailMary:
        return hailMary;
      case StepKind.ourFather:
        // 서두(단 앞)의 주님의 기도는 전문. 각 단 앞의 주님의 기도만 줄인다.
        return step.decade == null ? null : ourFather;
      case StepKind.fatima:
        return fatima;
      case StepKind.signOfCross:
      case StepKind.apostlesCreed:
      case StepKind.gloryBe:
      case StepKind.closing:
        return null;
    }
  }
}
