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
    bool? withIntent,
    String? pace,
  }) => event('prayer_start', {
    'set': set.name,
    'mode': mode.name,
    'resumed': resumed,
    // app | church | widget | reminder
    'source': source,
    'with_intent': ?withIntent,
    // silent | guided
    'pace': ?pace,
  });

  /// `prayed_today{kind}`: beads | app | church.
  static void prayedToday(String kind) => event('prayed_today', {'kind': kind});

  /// `onboarding_step{step}`: consent | text_size | style | done.
  static void onboardingStep(String step) =>
      event('onboarding_step', {'step': step});

  /// `guest_link{provider}`.
  static void guestLink(String provider) =>
      event('guest_link', {'provider': provider});

  /// `reminder_change{kind,on,hour}`: kind = angelus | rosary | mercy.
  static void reminderChange(String kind, {required bool on, int? hour}) =>
      event('reminder_change', {'kind': kind, 'on': on, 'hour': ?hour});

  static void reminderOpen(String kind) =>
      event('reminder_open', {'kind': kind});

  /// `novena_start{type,luminous}`: type = n9 | n54.
  static void novenaStart(String type, {required bool luminous}) =>
      event('novena_start', {'type': type, 'luminous': luminous});

  static void novenaDay(String type, int day, {required bool makeup}) =>
      event('novena_day', {'type': type, 'day': day, 'makeup': makeup});

  /// `widget_tap{action}`: start | resume.
  static void widgetTap(String action) =>
      event('widget_tap', {'action': action});

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
