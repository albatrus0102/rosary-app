/// 기도 모드: 혼자 / 선창(앞단) / 후창(뒷단).
enum PrayerMode { solo, leader, responder }

extension PrayerModeInfo on PrayerMode {
  String get label => switch (this) {
    PrayerMode.solo => '혼자',
    PrayerMode.leader => '선창(앞단)',
    PrayerMode.responder => '후창(뒷단)',
  };

  String get description => switch (this) {
    PrayerMode.solo => '혼자서 전체를 바칩니다',
    PrayerMode.leader => '앞단을 선창하고 뒷단은 다른 사람이 받습니다',
    PrayerMode.responder => '다른 사람이 앞단을 하고 뒷단을 받습니다',
  };
}
