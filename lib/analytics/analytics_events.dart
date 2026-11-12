import 'dart:convert';

import 'analytics_redact.dart';
import 'analytics_types.dart';

/// 이벤트 하나의 규격: 범주와 허용되는 속성 키(SPEC §4).
class EventSpec {
  const EventSpec(
    this.category, [
    this.keys = const {},
    this.longKeys = const {},
  ]);

  /// `usage`, `church`, `diagnostics`. 동의 종류 이름과 같다.
  final String category;

  /// 허용되는 속성 키. 이 밖의 키는 버려진다.
  final Set<String> keys;

  /// 40자보다 긴 문자열이 허용되는 키와 최대 길이(오류 문구용).
  final Map<String, int> longKeys;
}

/// 이벤트 사전(SPEC §4). 이름과 속성 키의 유일한 허용 목록이다.
abstract final class AnalyticsEvents {
  static const Map<String, EventSpec> specs = {
    // usage
    'app_open': EventSpec(ConsentKinds.usage),
    'screen_view': EventSpec(ConsentKinds.usage, {'screen'}),
    'login_success': EventSpec(ConsentKinds.usage, {'provider'}),
    'consent_change': EventSpec(ConsentKinds.usage, {'kind', 'granted'}),
    'prayer_start': EventSpec(ConsentKinds.usage, {
      'set',
      'mode',
      'resumed',
      'source',
      'with_intent',
      'pace',
    }),
    'decade_complete': EventSpec(ConsentKinds.usage, {'set', 'decade'}),
    'prayer_finish': EventSpec(ConsentKinds.usage, {
      'set',
      'completed',
      'decades',
      'seconds',
    }),
    'rosary_style_change': EventSpec(ConsentKinds.usage, {'style'}),
    'mode_change': EventSpec(ConsentKinds.usage, {'mode'}),
    'leader_voice_change': EventSpec(ConsentKinds.usage, {'source', 'persona'}),
    'text_scale_change': EventSpec(ConsentKinds.usage, {'scale'}),
    'setting_change': EventSpec(ConsentKinds.usage, {'key'}),
    'stats_open': EventSpec(ConsentKinds.usage, {'range'}),
    // UX 개편(R1): 온보딩·기록·알림·노베나·위젯. 값은 열거형·숫자·bool만.
    'onboarding_step': EventSpec(ConsentKinds.usage, {'step'}),
    'guest_link': EventSpec(ConsentKinds.usage, {'provider'}),
    'prayed_today': EventSpec(ConsentKinds.usage, {'kind'}),
    'reminder_change': EventSpec(ConsentKinds.usage, {'kind', 'on', 'hour'}),
    'reminder_open': EventSpec(ConsentKinds.usage, {'kind'}),
    'novena_start': EventSpec(ConsentKinds.usage, {'type', 'luminous'}),
    'novena_day': EventSpec(ConsentKinds.usage, {'type', 'day', 'makeup'}),
    'widget_tap': EventSpec(ConsentKinds.usage, {'action'}),
    // church
    'church_pick': EventSpec(ConsentKinds.church, {'church'}),
    'church_enter': EventSpec(ConsentKinds.church, {'church', 'online'}),
    'church_exit': EventSpec(ConsentKinds.church, {
      'church',
      'seconds',
      'sat_seconds',
    }),
    'church_sit': EventSpec(ConsentKinds.church, {'church'}),
    'church_candle': EventSpec(ConsentKinds.church, {'church'}),
    'avatar_save': EventSpec(ConsentKinds.church),
    'church_gesture': EventSpec(ConsentKinds.church, {'church', 'e'}),
    'church_mode': EventSpec(ConsentKinds.church, {'church', 'mode', 'on'}),
    'church_report': EventSpec(ConsentKinds.church, {'church', 'reason'}),
    // diagnostics
    'error': EventSpec(
      ConsentKinds.diagnostics,
      {'where', 'message', 'stack'},
      {'message': 200, 'stack': 1000},
    ),
    'perf': EventSpec(ConsentKinds.diagnostics, {'fps_avg', 'church', 'tier'}),
  };

  static bool isKnown(String name) => specs.containsKey(name);

  static String? categoryOf(String name) => specs[name]?.category;
}

/// 속성 정리기. 허용되지 않는 것은 **조용히 버린다**.
///
/// 규칙: (1) 이벤트별 허용 키만, 금지 키(intention/text/note/name 등)는 항상 버림,
/// (2) 값은 짧은 열거형 문자열(영문·숫자·`_`·`-`, 40자 이하), bool, 유한한 수만,
/// (3) 이메일·UUID·URL·전화번호처럼 보이는 값은 버림, (4) 중첩 값은 버림,
/// (5) 전체 JSON 2KB 이하.
abstract final class PropsSanitizer {
  static const int maxEnumLength = 40;
  static const int maxPropsBytes = 2048;

  /// 어떤 이벤트에서도 허용되지 않는 키.
  static const Set<String> blockedKeys = {
    'intention',
    'text',
    'note',
    'name',
    'email',
    'user_id',
    'uid',
    'id',
    'phone',
    'url',
    'lat',
    'lng',
    'latitude',
    'longitude',
    'location',
    'ip',
    'ad_id',
    'advertising_id',
    'idfa',
    'gaid',
  };

  static final RegExp _enumValue = RegExp(r'^[A-Za-z0-9_\-]+$');

  static Map<String, Object?> sanitize(
    String name,
    Map<String, Object?> props,
  ) {
    final spec = AnalyticsEvents.specs[name];
    if (spec == null) return const {};
    final out = <String, Object?>{};
    for (final entry in props.entries) {
      final key = entry.key;
      if (blockedKeys.contains(key.toLowerCase())) continue;
      if (!spec.keys.contains(key)) continue;
      final value = entry.value;
      final longMax = spec.longKeys[key];
      if (value is bool) {
        out[key] = value;
      } else if (value is num) {
        if (value.isFinite && value.abs() < 1e9) out[key] = value;
      } else if (value is String) {
        if (longMax != null) {
          var s = Redactor.redact(value);
          if (s.length > longMax) s = s.substring(0, longMax);
          out[key] = s;
        } else if (value.isNotEmpty &&
            value.length <= maxEnumLength &&
            _enumValue.hasMatch(value) &&
            !Redactor.looksIdentifying(value)) {
          out[key] = value;
        }
      }
      // 그 밖(Map, List, null, 객체)은 버린다.
    }
    return _fitSize(out);
  }

  static Map<String, Object?> _fitSize(Map<String, Object?> props) {
    int size(Map<String, Object?> m) => utf8.encode(jsonEncode(m)).length;
    var current = Map<String, Object?>.from(props);
    while (current.isNotEmpty && size(current) > maxPropsBytes) {
      String? biggest;
      var biggestLen = -1;
      current.forEach((k, v) {
        final len = jsonEncode(v).length;
        if (len > biggestLen) {
          biggestLen = len;
          biggest = k;
        }
      });
      current.remove(biggest);
    }
    return current;
  }
}
