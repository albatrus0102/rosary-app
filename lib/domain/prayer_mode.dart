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

/// 앱이 들려주는 상대 목소리를 켜 두었는지에 따른 모드 설명(홈 화면).
/// 선창 모드는 뒷단을, 후창 모드는 앞단을 앱이 들려준다. 혼자 모드는 늘 소리가 없다.
extension PrayerModeVoiceInfo on PrayerMode {
  String descriptionWithVoice({required bool voiceOn}) => switch (this) {
    PrayerMode.solo => description,
    PrayerMode.leader =>
      voiceOn
          ? '앞단을 선창하면 뒷단은 앱이 목소리로 받아 줍니다'
          : '앞단을 선창하고 뒷단은 다른 사람이 받습니다. 상대 목소리가 꺼져 있어 소리는 나지 않습니다',
    PrayerMode.responder =>
      voiceOn
          ? '앱이 앞단을 들려주면 뒷단을 받아 바칩니다'
          : '다른 사람이 앞단을 하고 뒷단을 받습니다. 상대 목소리가 꺼져 있어 소리는 나지 않습니다',
  };
}
