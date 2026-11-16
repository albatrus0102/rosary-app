import 'logical_day.dart';

/// 하루 기도 목표(독서공방 `dailyGoal`/`dailyGoalMin`/`sanitizeGoalFields` 이식).
///
/// 단 수([decades])와 분([minutes]) 중 정한 것만 쓰고, 0 이면 그 축은 끈 것이다. 둘 다 0 이면
/// 목표 없음(기본값). 둘 다 정하면 **어느 하나만 채워도** 그날은 '목표만큼 바친 날'이다.
/// 목표는 성취 경쟁이 아니라 오늘의 기도를 가볍게 돕는 눈금이라, 못 채운 날을 따로 세거나
/// 문구로 드러내지 않는다.
class PrayerGoal {
  const PrayerGoal({this.decades = 0, this.minutes = 0});

  static const PrayerGoal off = PrayerGoal();
  static const int maxDecades = 100;
  static const int maxMinutes = 1440;

  /// 하루에 바칠 단 수(0=끔).
  final int decades;

  /// 하루에 기도할 분(0=끔).
  final int minutes;

  bool get isOff => decades <= 0 && minutes <= 0;
  bool get hasDecades => decades > 0;
  bool get hasMinutes => minutes > 0;

  /// 그날의 단 수·초로 목표를 채웠는지. 목표가 없으면 false.
  bool isMet({required int decades, required int seconds}) {
    if (isOff) return false;
    if (hasDecades && decades >= this.decades) return true;
    if (hasMinutes && seconds >= minutes * 60) return true;
    return false;
  }

  static int _num(Object? v, int max) {
    if (v is! num || !v.isFinite) return 0;
    return v.round().clamp(0, max);
  }

  /// 값 위생(`_rsGoalNum`): 숫자가 아니면 0, 범위 밖이면 범위로 맞춘다.
  factory PrayerGoal.sanitized({Object? decades, Object? minutes}) =>
      PrayerGoal(
        decades: _num(decades, maxDecades),
        minutes: _num(minutes, maxMinutes),
      );

  /// 백업·복원용 단순 JSON.
  Map<String, Object> toJson() => {'decades': decades, 'minutes': minutes};

  factory PrayerGoal.fromJson(Object? json) => json is Map
      ? PrayerGoal.sanitized(decades: json['decades'], minutes: json['minutes'])
      : off;

  @override
  bool operator ==(Object other) =>
      other is PrayerGoal &&
      other.decades == decades &&
      other.minutes == minutes;

  @override
  int get hashCode => Object.hash(decades, minutes);

  /// '하루 2단 또는 10분' 같은 한 줄.
  String get summaryKo {
    final parts = [if (hasDecades) '$decades단', if (hasMinutes) '$minutes분'];
    return parts.isEmpty ? '정하지 않았어요' : '하루 ${parts.join(' 또는 ')}';
  }
}

/// 통계 화면이 쓰는 설정 묶음(백업·복원이 이 JSON 하나를 다루면 된다).
class StatsPrefs {
  const StatsPrefs({
    this.dayStartHour = defaultDayStartHour,
    this.goal = PrayerGoal.off,
    this.goalPrompted = true,
  });

  final int dayStartHour;
  final PrayerGoal goal;

  /// 목표 안내를 이미 한 번 보여 줬는지(한 번만, 다시 묻지 않는다).
  final bool goalPrompted;

  Map<String, Object> toJson() => {
    'dayStartHour': dayStartHour,
    'goal': goal.toJson(),
    'goalPrompted': goalPrompted,
  };

  factory StatsPrefs.fromJson(Object? json) {
    if (json is! Map) return const StatsPrefs(goalPrompted: false);
    return StatsPrefs(
      dayStartHour: sanitizeDayStartHour(json['dayStartHour']),
      goal: PrayerGoal.fromJson(json['goal']),
      goalPrompted: json['goalPrompted'] == true,
    );
  }
}
