import '../analytics/analytics.dart';
import '../domain/prayer_data.dart';
import '../domain/prayer_mode.dart';
import 'rosary_style.dart';
import 'settings.dart';

/// 분석 호출 도우미. 화면 코드에서는 한 줄로 부른다.
///
/// - 속성은 열거형 이름과 숫자뿐이다(SPEC §4). 기도 의향·글·이름은 절대 넘기지 않는다.
/// - 어떤 경우에도 던지지 않는다. 초기화 전에는 `Analytics.instance`가 아무것도 하지 않는다.
abstract final class Track {
  static void event(String name, [Map<String, Object?> props = const {}]) {
    try {
      Analytics.instance.track(name, props);
    } catch (_) {
      // 분석은 앱을 깨뜨리지 않는다.
    }
  }

  static void screen(String id) {
    try {
      Analytics.instance.screen(id);
    } catch (_) {}
  }

  /// `setting_change{key}`: 어떤 설정인지만 기록하고 값은 보내지 않는다.
  static void setting(String key) => event('setting_change', {'key': key});

  /// `text_scale_change{scale}`: 0.05 단위로 반올림.
  static void textScale(double scale) =>
      event('text_scale_change', {'scale': (scale * 20).round() / 20});

  static void mode(PrayerMode mode) =>
      event('mode_change', {'mode': mode.name});

  static void rosaryStyle(RosaryStyle style) =>
      event('rosary_style_change', {'style': style.name});

  /// `leader_voice_change{source,persona}`: 설정에 지금 들어 있는 값.
  static void leaderVoice(AppSettings s) => event('leader_voice_change', {
    'source': s.leaderVoiceSource.name,
    'persona': s.leaderPersona.name,
  });

  static void prayerStart({
    required MysterySet set,
    required PrayerMode mode,
    required bool resumed,
    required String source,
  }) => event('prayer_start', {
    'set': set.name,
    'mode': mode.name,
    'resumed': resumed,
    'source': source,
  });

  static void decadeComplete(MysterySet set, int decade) =>
      event('decade_complete', {'set': set.name, 'decade': decade});

  static void prayerFinish({
    required MysterySet set,
    required bool completed,
    required int decades,
    required int seconds,
  }) => event('prayer_finish', {
    'set': set.name,
    'completed': completed,
    'decades': decades,
    'seconds': seconds,
  });

  /// 성당 이벤트(`church_*`): 성당 id와 숫자·bool만.
  static void church(
    String name,
    String churchId, [
    Map<String, Object?>? more,
  ]) => event(name, {'church': churchId, ...?more});
}
