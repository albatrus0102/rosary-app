import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/backup/backup_data.dart';
import 'package:rosary_app/backup/backup_format.dart';
import 'package:rosary_app/backup/backup_registry.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'backup_test_support.dart';

/// 소스에서 SharedPreferences 키를 모두 찾아낸다(시험 도구).
///
/// - 저장소 호출(`get*`/`set*`/`remove`/`containsKey`)의 첫 인자를 본다.
/// - 인자가 글자면 그대로, 같은 파일·다른 파일의 `const` 이름이면 그 값으로, `'$접두사…'`면 접두사로 푼다.
/// - 풀 수 없는 자리(매개변수로 받은 키 등)는 [dynamicSites]에 이유와 함께 적혀 있어야 한다.
class PrefsKeyScan {
  final Map<String, Set<String>> keys = {}; // 키 → 쓰는 파일
  final Map<String, Set<String>> prefixes = {};
  final List<String> unresolved = [];
}

/// 키를 값으로 받지 않는 자리 — 감싸는 함수의 호출부에서 실제 키를 다시 찾는다.
const Map<String, String> dynamicSites = {
  'lib/auth/secure_session_storage.dart': '로그인 세션 저장소: 키는 rosary.auth.session·rosary.auth.pkce.* (등록부 rosary.auth. 접두사)',
  'lib/auth/guest_link_prompt.dart':
      '_readTime(prefs, key): 같은 파일의 guest.* 상수로만 부른다(등록부 guest. 접두사)',
  'lib/backup/backup_data.dart': '백업 기능 자신: 등록부를 따라 모든 키를 읽고 쓴다',
  'lib/backup/backup_vault.dart': '백업 기능 자신',
  'lib/backup/auto_backup.dart': '백업 기능 자신(backup.* 상태)',
  'lib/backup/backup_service.dart': '백업 기능 자신(backup.* 상태)',
  'lib/app/app_services.dart': '시험용 메모리 저장소(_MemoryPrefs) 구현',
  'lib/app/settings.dart': '_setBool/_setEnum(key) 도우미: 호출부가 _k 상수를 넘긴다(keyConstFiles 가 _k 상수를 모두 키로 센다)',
};

/// 모든 `_k…` 상수가 저장 키인 파일(도우미 함수가 키를 매개변수로 받는다).
const List<String> keyConstFiles = ['lib/app/settings.dart'];

final _prefsCall = RegExp(
  r'(?:\bprefs|\b_prefs|\bp|\bsp|\bpreferences|\(await _fallback\(\)\)|\(await SharedPreferences\.getInstance\(\)\))'
  r'(?:\?|!)?\.(?:get|getString|getBool|getInt|getDouble|getStringList|setString|setBool|setInt|setDouble|setStringList|remove|containsKey)\(\s*([^,)]+)',
);
final _constDecl = RegExp(
  r"(?:static\s+)?(?:const|final)\s+(?:String\s+)?(\w+)\s*=\s*'([^']*)'\s*;",
);

/// `static const _p = BackupRegistry.internalPrefix;` 처럼 다른 상수를 가리키는 선언.
final _aliasDecl = RegExp(
  r"(?:static\s+)?const\s+(?:String\s+)?(\w+)\s*=\s*([A-Za-z_]\w*(?:\.\w+)?)\s*;",
);
final _classDecl = RegExp(
  r'^\s*(?:abstract\s+)?(?:final\s+)?(?:class|mixin|extension)\s+(\w+)',
  multiLine: true,
);

PrefsKeyScan scanLib() {
  final scan = PrefsKeyScan();
  final files = Directory('lib')
      .listSync(recursive: true)
      .whereType<File>()
      .where((f) => f.path.endsWith('.dart'))
      .toList();
  final local = <String, Map<String, String>>{};
  final qualified = <String, String>{};
  final qualifiedFile = <String, String>{};
  final texts = <String, String>{};
  for (final f in files) {
    final path = f.path.replaceAll('\\', '/');
    final text = f.readAsStringSync();
    texts[path] = text;
    final m = <String, String>{};
    final classes = _classDecl.allMatches(text).toList();
    for (final c in _constDecl.allMatches(text)) {
      final name = c.group(1)!;
      var value = c.group(2)!;
      m[name] = value;
      String? owner;
      for (final k in classes) {
        if (k.start < c.start) owner = k.group(1);
      }
      if (owner != null) {
        qualified['$owner.$name'] = value;
        qualifiedFile['$owner.$name'] = path;
      }
    }
    for (final a in _aliasDecl.allMatches(text)) {
      m['__alias__${a.group(1)!}'] = a.group(2)!;
    }
    local[path] = m;
  }
  // 별칭을 값으로 바꾼다(다른 파일의 Class.name 포함).
  for (final e in local.entries) {
    for (final k in e.value.keys.toList()) {
      if (!k.startsWith('__alias__')) continue;
      final target = e.value.remove(k)!;
      final v = e.value[target] ?? qualified[target];
      if (v != null) e.value[k.substring(9)] = v;
    }
  }
  // 상수 안의 보간('${_p}auto.enabled')을 한 번 푼다.
  String expand(String v, Map<String, String> m) => v.replaceAllMapped(
    RegExp(r'\$\{?(\w+(?:\.\w+)?)\}?'),
    (x) => m[x.group(1)] ?? qualified[x.group(1)] ?? x.group(0)!,
  );
  for (final e in local.entries) {
    for (final k in e.value.keys.toList()) {
      e.value[k] = expand(e.value[k]!, e.value);
    }
  }
  for (final k in qualified.keys.toList()) {
    qualified[k] = expand(qualified[k]!, local[qualifiedFile[k]]!);
  }
  // 파일 안 값이 다른 파일 상수를 보간한 경우(두 번째 고리)까지 한 번 더.
  for (final e in local.entries) {
    for (final k in e.value.keys.toList()) {
      e.value[k] = expand(e.value[k]!, e.value);
    }
  }

  // AppSettings 는 _setBool/_setEnum(key) 도우미로 쓰므로, 그 파일의 _k 상수는 모두 키다.
  for (final path in keyConstFiles) {
    for (final e in local[path]!.entries) {
      if (e.key.startsWith('_k')) (scan.keys[e.value] ??= {}).add(path);
    }
  }
  for (final e in texts.entries) {
    final path = e.key;
    for (final call in _prefsCall.allMatches(e.value)) {
      final arg = call.group(1)!.trim();
      final consts = local[path]!;
      String? key;
      String? prefix;
      final lit = RegExp(r"^'([^'$]*)'$").firstMatch(arg);
      final interp = RegExp(r"^'([^']*)'$").firstMatch(arg);
      if (lit != null) {
        key = lit.group(1);
      } else if (interp != null) {
        final raw = expand(interp.group(1)!, consts);
        final cut = raw.indexOf(r'$');
        if (cut < 0) {
          key = raw;
        } else if (cut > 0) {
          prefix = raw.substring(0, cut);
        }
      } else if (consts.containsKey(arg)) {
        key = consts[arg];
      } else if (qualified.containsKey(arg)) {
        key = qualified[arg];
      }
      if (key != null) {
        (scan.keys[key] ??= {}).add(path);
      } else if (prefix != null) {
        (scan.prefixes[prefix] ??= {}).add(path);
      } else if (!dynamicSites.containsKey(path)) {
        scan.unresolved.add('$path: $arg');
      }
    }
  }
  return scan;
}

/// 사용자 값 보존 불변식(독서공방 user-value-invariant 의 Dart 판): 등록부의 backup 키마다
/// 값을 넣고 → 내보내고 → 지우고 → 가져오면 → 그 값이 돌아와야 한다. 왕복을 못 재는 키는
/// 이유와 함께 여기 적는다(지금은 없다 — 새로 생기면 시험이 실패해 적게 만든다).
const Map<String, String> uncovered = {};

Object sampleFor(PrefSpec s) => switch (s.type!) {
  PrefType.boolean => true,
  PrefType.integer => 42,
  PrefType.decimal => 0.625,
  PrefType.text => '값-${s.key}',
  PrefType.textList => ['가', 'b'],
};

void main() {
  late PrefsKeyScan scan;
  setUpAll(() => scan = scanLib());

  test('소스 훑기가 실제로 키를 찾는다(도구 자체 점검)', () {
    // 알려진 키 몇 개가 잡히지 않으면 훑기 도구가 고장 난 것이다.
    for (final k in [
      'chime_ten',
      'prayer_stats_v1',
      'church_solo_candles_v1',
      'church_resume_state',
      'stations_series_id',
      'church_candle_color_v1',
      'church_walk_hint_seen',
      'stats_owner_uid',
      'device_id_v1',
      'church_client_id',
      'synced_prayer_ids_v1',
      'guest.first_seen',
      'prayer_music_volume',
      'rosary3d_vibe',
    ]) {
      expect(scan.keys.keys, contains(k), reason: k);
    }
    expect(scan.prefixes.keys, contains('auth.consent.v1.'));
  });

  test('모든 SharedPreferences 키가 등록부에서 백업/제외로 분류돼 있다', () {
    final missing = [
      for (final e in scan.keys.entries)
        if (BackupRegistry.specFor(e.key) == null)
          '${e.key}  (${e.value.join(', ')})',
      for (final e in scan.prefixes.entries)
        if (BackupRegistry.specFor(e.key) == null)
          '${e.key}*  (${e.value.join(', ')})',
    ];
    expect(
      missing,
      isEmpty,
      reason:
          '새 설정 키는 lib/backup/backup_registry.dart 에 backup(값 모양과 함께) 또는 exclude(이유)로 '
          '한 줄 더해야 한다. 분류되지 않은 키:\n${missing.join('\n')}',
    );
  });

  test('저장소 호출 중 키를 풀 수 없는 자리가 없다(있으면 dynamicSites에 이유와 함께)', () {
    expect(scan.unresolved, isEmpty, reason: scan.unresolved.join('\n'));
  });

  test('등록부: 백업 키는 값 모양·이유가, 제외 키는 이유가 있고 겹치지 않는다', () {
    final seen = <String>{};
    for (final s in BackupRegistry.specs) {
      expect(seen.add('${s.prefix}:${s.key}'), isTrue, reason: '중복 ${s.key}');
      expect(s.why.trim(), isNotEmpty, reason: s.key);
      if (s.role == PrefRole.backup) {
        expect(s.type, isNotNull, reason: '${s.key}: 값 모양이 없다');
        expect(BackupRegistry.looksSecret(s.key), isFalse, reason: s.key);
      }
    }
  });

  test('등록부에 있지만 소스에서 안 쓰이는 키는 없다(낡은 줄 정리)', () {
    final used = {...scan.keys.keys};
    final stale = [
      for (final s in BackupRegistry.specs)
        if (!s.prefix && !used.contains(s.key)) s.key,
    ];
    expect(stale, isEmpty, reason: stale.join(', '));
  });

  test('비밀·기기·계정 값은 모두 제외로 분류돼 있다', () {
    for (final k in [
      'rosary.auth.session',
      'rosary.auth.pkce.code-verifier',
      'auth.consent.v1._device',
      'device_id_v1',
      'church_client_id',
      'stats_owner_uid',
      'synced_prayer_ids_v1',
      'synced_prayer_user_v1',
      'backup.auto.enabled',
    ]) {
      expect(BackupRegistry.shouldExport(k), isFalse, reason: k);
    }
  });

  group('사용자 값 보존 불변식: backup 키마다 왕복', () {
    final specs = BackupRegistry.backupSpecs.toList();

    test('UNCOVERED 목록 밖의 backup 키는 모두 왕복 시험을 받는다', () {
      expect(
        specs.where((s) => uncovered.containsKey(s.key)),
        hasLength(uncovered.length),
        reason: 'uncovered 목록에 등록부에 없는 키가 있다',
      );
    });

    test('값을 넣고 → 내보내고 → 새 기기에서 가져오면 그대로 돌아온다', () async {
      final values = <String, Object>{
        for (final s in specs)
          if (!uncovered.containsKey(s.key)) s.key: sampleFor(s),
      };
      final src = await BackupRig.create(values: values);
      final text = src.service.buildDocument().encode();
      final dst = await BackupRig.create();
      final plan = dst.service.planFromText(text).plan!;
      expect(plan.typeConflicts, 0);
      await dst.service.applyPlan(plan);
      final lost = <String>[];
      for (final e in values.entries) {
        final v = dst.prefs.get(e.key);
        final same = v is List
            ? (e.value as List).join('|') == v.join('|')
            : v == e.value;
        if (!same) lost.add('${e.key}: ${e.value} → $v');
      }
      expect(lost, isEmpty, reason: lost.join('\n'));
    });

    test('가져오기가 바꾸는 값을 이 기기의 다른 모양 값 위에 쓰지 않는다', () async {
      final rig = await BackupRig.create(values: {'chime_ten': 'oops'});
      final text = BackupDocument(
        createdAt: DateTime(2026),
        appVersion: '',
        prefs: {'chime_ten': const TypedPref(PrefType.boolean, false)},
        records: const [],
      ).encode();
      final plan = rig.service.planFromText(text).plan!;
      expect(plan.typeConflicts, 1);
      await rig.service.applyPlan(plan);
      expect(rig.prefs.get('chime_ten'), 'oops');
    });
  });

  test('일반 수집: 등록부에 없는 새 키도 백업에 실린다(등록을 잊어도 값이 빠지지 않게)', () async {
    SharedPreferences.setMockInitialValues({'goal_streak_days': 7});
    final p = await SharedPreferences.getInstance();
    final doc = BackupCollector.collect(p, now: DateTime(2026));
    expect(doc.prefs['goal_streak_days']?.value, 7);
  });
}
