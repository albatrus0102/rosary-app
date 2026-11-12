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

  // --- 스테인드글라스 감상(G-14). 창은 `win`(카탈로그 id)로만 가리킨다. ---

  /// `glass_open{win,from,view}`: from = gallery|today|church|widget|collection,
  /// view = room|church|flat.
  static void glassOpen(String win, {required String from, String? view}) =>
      event('glass_open', {'win': win, 'from': from, 'view': ?view});

  /// `glass_view_end{win,seconds,zoom_max,panned,light,photo_mode}`: light = ref|sun|night.
  static void glassViewEnd(
    String win, {
    required num seconds,
    required num zoomMax,
    required bool panned,
    required String light,
    bool photoMode = false,
  }) => event('glass_view_end', {
    'win': win,
    'seconds': seconds.round(),
    'zoom_max': zoomMax.round().clamp(1, 32),
    'panned': panned,
    'light': light,
    'photo_mode': photoMode,
  });

  /// `glass_filter{kind,value}`: kind = church|era|shape|color, value는 영문 열거형 키.
  static void glassFilter(String kind, String value) =>
      event('glass_filter', {'kind': kind, 'value': value});

  /// `glass_info{win,section}`: section = about|credit|review.
  static void glassInfo(String win, String section) =>
      event('glass_info', {'win': win, 'section': section});

  static void glassFav(String win, {required bool on}) =>
      event('glass_fav', {'win': win, 'on': on});

  static void glassCapture(
    String win, {
    required bool shared,
    required bool saved,
  }) => event('glass_capture', {'win': win, 'shared': shared, 'saved': saved});

  /// `glass_pray{win,kind}`: kind = decade|rosary|meditation.
  static void glassPray(String win, String kind) =>
      event('glass_pray', {'win': win, 'kind': kind});

  /// `glass_load{win,tier,ms,ok}`: tier = t1|t2|t3|tile.
  static void glassLoad(
    String win, {
    required String tier,
    required int ms,
    required bool ok,
  }) => event('glass_load', {'win': win, 'tier': tier, 'ms': ms, 'ok': ok});

  /// `glass_mem{tex_mb,budget_mb,downgraded,tier}`: tier = low|mid|high.
  static void glassMem({
    required num texMb,
    required num budgetMb,
    required bool downgraded,
    required String tier,
  }) => event('glass_mem', {
    'tex_mb': texMb.round(),
    'budget_mb': budgetMb.round(),
    'downgraded': downgraded,
    'tier': tier,
  });

  /// `glass_download{scope,mb,ok,wifi}`: scope = win|all.
  static void glassDownload({
    required String scope,
    required num mb,
    required bool ok,
    required bool wifi,
  }) => event('glass_download', {
    'scope': scope,
    'mb': mb.round(),
    'ok': ok,
    'wifi': wifi,
  });
}
