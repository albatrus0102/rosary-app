import 'dart:convert';

import '../stats/prayer_record.dart';
import 'backup_registry.dart';

/// 로사리움 백업 파일 한 벌(JSON). 수동 내보내기·자동 백업 폴더·기기 안 금고가 **모두 이 한 모양**을
/// 쓴다(독서공방 B5: 세 통로가 같은 묶음을 싣는다).
///
/// ```json
/// {
///   "format": "rosarium-backup",
///   "schemaVersion": 1,          // 이 파일을 쓴 앱의 형식 판
///   "minReaderSchema": 1,        // 이 파일을 읽으려면 필요한 최소 판(판 올림은 필드 추가만 하므로 보통 1)
///   "appVersion": "0.1.0+1",
///   "createdAt": "2026-11-16T10:00:00.000Z",
///   "device": {"platform": "android", "model": "…"},
///   "summary": {"prayerRecords": 12, "settings": 30},
///   "data": {
///     "prefs": {"chime_ten": {"t": "bool", "v": true}, …},
///     "prayerRecords": [ {PrayerRecord.toJson}, … ],
///     "…모르는 구역…": 보관했다가 다시 내보낸다
///   }
/// }
/// ```
abstract final class BackupFormat {
  static const String formatId = 'rosarium-backup';

  /// 지금 앱이 쓰는 형식 판. 판을 올릴 때는 [BackupMigrations]에 **필드를 더하기만 하는** 단계를 단다.
  static const int schemaVersion = 1;

  /// 이 앱이 쓰는 파일을 읽는 데 필요한 최소 판. 필드 추가만 하는 한 1에서 올리지 않는다.
  static const int minReaderSchema = 1;

  // ---- 한도(손상·악성 파일이 앱을 멈추지 않게) --------------------------------
  static const int maxFileChars = 20 * 1024 * 1024;
  static const int maxPrefs = 2000;
  static const int maxKeyChars = 200;
  static const int maxStringChars = 100 * 1024;
  static const int maxListItems = 1000;
  static const int maxListItemChars = 500;
  static const int maxRecords = 50000;
  static const int maxRecordIdChars = 64;
  static const int maxCarryChars = 1024 * 1024;
  static const int maxMetaChars = 200;

  /// 자동 백업 파일 이름 접두사(수동 내보내기와 다르다 — 정리가 수동 파일을 절대 건드리지 않게).
  static const String autoPrefix = 'rosarium-backup-';

  /// 수동 내보내기 파일 이름 접두사.
  static const String exportPrefix = 'rosarium-export-';

  static String two(int v) => v.toString().padLeft(2, '0');

  static String dayKey(DateTime t) =>
      '${t.year.toString().padLeft(4, '0')}${two(t.month)}${two(t.day)}';

  /// 수동 내보내기 파일 이름(`rosarium-export-YYYYMMDD.json`).
  static String exportFileName(DateTime now) =>
      '$exportPrefix${dayKey(now)}.json';
}

/// 값 모양을 함께 적은 설정 값 하나.
class TypedPref {
  const TypedPref(this.type, this.value);

  final PrefType type;
  final Object value;

  static const _names = {
    PrefType.boolean: 'bool',
    PrefType.integer: 'int',
    PrefType.decimal: 'double',
    PrefType.text: 'string',
    PrefType.textList: 'stringList',
  };

  Map<String, Object> toJson() => {'t': _names[type]!, 'v': value};

  /// 저장된 값에서 모양을 읽는다(지원하지 않는 모양이면 null).
  static TypedPref? fromStored(Object? v) {
    if (v is bool) return TypedPref(PrefType.boolean, v);
    if (v is int) return TypedPref(PrefType.integer, v);
    if (v is double) return TypedPref(PrefType.decimal, v);
    if (v is String) return TypedPref(PrefType.text, v);
    if (v is List) {
      if (v.every((e) => e is String)) {
        return TypedPref(PrefType.textList, List<String>.from(v));
      }
    }
    return null;
  }

  /// 파일의 값 하나를 읽는다. `{"t":…, "v":…}` 또는 맨 값(형식 0)을 받는다.
  /// 한도를 넘거나 모양이 틀리면 null(그 키만 건너뛴다).
  static TypedPref? fromJson(Object? json) {
    Object? raw = json;
    String? t;
    if (json is Map && json.containsKey('v')) {
      raw = json['v'];
      final tt = json['t'];
      if (tt is String) t = tt;
    }
    TypedPref? out;
    switch (t) {
      case 'bool':
        if (raw is bool) out = TypedPref(PrefType.boolean, raw);
      case 'int':
        if (raw is int) out = TypedPref(PrefType.integer, raw);
        if (raw is double && raw == raw.roundToDouble() && raw.isFinite) {
          out = TypedPref(PrefType.integer, raw.toInt());
        }
      case 'double':
        if (raw is num && raw.isFinite) {
          out = TypedPref(PrefType.decimal, raw.toDouble());
        }
      case 'string':
        if (raw is String) out = TypedPref(PrefType.text, raw);
      case 'stringList':
        if (raw is List && raw.every((e) => e is String)) {
          out = TypedPref(PrefType.textList, List<String>.from(raw));
        }
      case null:
        out = fromStored(raw);
        if (raw is double && !raw.isFinite) out = null;
      default:
        out = null; // 모르는 모양 이름
    }
    if (out == null) return null;
    final v = out.value;
    if (v is String && v.length > BackupFormat.maxStringChars) return null;
    if (v is List<String>) {
      if (v.length > BackupFormat.maxListItems) return null;
      if (v.any((e) => e.length > BackupFormat.maxListItemChars)) return null;
    }
    return out;
  }

  bool sameValue(TypedPref other) {
    if (type != other.type) return false;
    final a = value, b = other.value;
    if (a is List && b is List) {
      if (a.length != b.length) return false;
      for (var i = 0; i < a.length; i++) {
        if (a[i] != b[i]) return false;
      }
      return true;
    }
    return a == b;
  }

  @override
  bool operator ==(Object other) => other is TypedPref && sameValue(other);

  @override
  int get hashCode =>
      Object.hash(type, value is List ? Object.hashAll(value as List) : value);

  @override
  String toString() => 'TypedPref($type, $value)';
}

/// 백업 파일 한 벌의 내용.
class BackupDocument {
  BackupDocument({
    required this.createdAt,
    required this.appVersion,
    required this.prefs,
    required this.records,
    this.schemaVersion = BackupFormat.schemaVersion,
    this.minReaderSchema = BackupFormat.minReaderSchema,
    Map<String, Object?>? device,
    Map<String, Object?>? carry,
    this.skippedPrefs = 0,
    this.skippedRecords = 0,
    this.droppedCarry = 0,
  }) : device = device ?? const {},
       carry = carry ?? const {};

  final int schemaVersion;
  final int minReaderSchema;
  final String appVersion;
  final DateTime createdAt;
  final Map<String, Object?> device;

  /// 설정 값(키 → 값). 등록부가 싣기로 한 키만 들어 있다.
  final Map<String, TypedPref> prefs;

  /// 기도 기록(파일에 적힌 순서).
  final List<PrayerRecord> records;

  /// 이 앱이 모르는 `data` 구역(새 버전 앱이 만든 파일). 보관했다가 다시 내보낸다.
  final Map<String, Object?> carry;

  /// 읽다가 건너뛴 것(손상·한도 초과·모양 틀림) — 미리보기에 그대로 보인다.
  final int skippedPrefs;
  final int skippedRecords;
  final int droppedCarry;

  Map<String, Object?> dataJson() {
    final keys = prefs.keys.toList()..sort();
    return {
      for (final e in carry.entries)
        if (e.key != 'prefs' && e.key != 'prayerRecords') e.key: e.value,
      'prefs': {for (final k in keys) k: prefs[k]!.toJson()},
      'prayerRecords': [for (final r in records) r.toJson()],
    };
  }

  Map<String, Object?> toJson() => {
    'format': BackupFormat.formatId,
    'schemaVersion': schemaVersion,
    'minReaderSchema': minReaderSchema,
    'appVersion': appVersion,
    'createdAt': createdAt.toUtc().toIso8601String(),
    'device': device,
    'summary': {'prayerRecords': records.length, 'settings': prefs.length},
    'data': dataJson(),
  };

  String encode() => jsonEncode(toJson());

  /// 기록 목록을 PrayerStatsStore 저장 모양(JSON 배열)으로.
  static String encodeRecords(Iterable<PrayerRecord> records) =>
      jsonEncode([for (final r in records) r.toJson()]);

  /// 내용(시각·기기 제외) 지문 — 「바뀐 게 있나」 판정용. 64비트 FNV-1a.
  String get dataHash => fnv64(jsonEncode(dataJson()));

  static String fnv64(String s) {
    var h = 0xcbf29ce484222325;
    const prime = 0x100000001b3;
    for (final unit in utf8.encode(s)) {
      h ^= unit;
      h = h * prime; // 64비트 정수 곱은 넘치면 감긴다(안드로이드 VM)
    }
    return h.toUnsigned(64).toRadixString(16).padLeft(16, '0');
  }
}

/// 백업 파일을 못 읽은 이유.
enum BackupReadError {
  /// 파일이 너무 크다.
  tooLarge,

  /// JSON이 아니다(깨졌거나 잘렸다).
  notJson,

  /// 로사리움 백업 파일이 아니다.
  notBackup,

  /// 더 새 앱에서 만들어 이 앱이 읽을 수 없다(앱을 업데이트해야 한다).
  tooNew,

  /// 모양이 망가졌다(`data`가 없거나 틀림, 형식 단계 실패).
  broken,
}

extension BackupReadErrorText on BackupReadError {
  String get message => switch (this) {
    BackupReadError.tooLarge => '파일이 너무 커요(20MB 넘음). 로사리움 백업 파일이 맞는지 확인해 주세요.',
    BackupReadError.notJson => '파일이 깨졌거나 끝까지 저장되지 않았어요. 다른 백업 파일을 골라 주세요.',
    BackupReadError.notBackup => '로사리움 백업 파일이 아니에요.',
    BackupReadError.tooNew => '더 새 버전의 로사리움에서 만든 파일이에요. 앱을 업데이트한 뒤 다시 가져와 주세요.',
    BackupReadError.broken => '백업 파일의 내용이 망가져 읽을 수 없어요. 아무것도 바꾸지 않았어요.',
  };
}

/// 읽기 결과: [document] 또는 [error] 하나.
class BackupReadResult {
  const BackupReadResult.ok(BackupDocument this.document) : error = null;
  const BackupReadResult.fail(BackupReadError this.error) : document = null;

  final BackupDocument? document;
  final BackupReadError? error;
  bool get ok => document != null;
}

/// 형식 판 올리기. 단계는 **필드를 더하기만** 한다(있는 값은 그대로 — `test/backup_format_test.dart`가
/// 모든 단계에서 입력이 출력에 그대로 들어 있는지 본다). 늘 깊은 사본 위에서 돈다 — 한 단계가 던지면
/// 원본은 그대로이고 그 파일은 [BackupReadError.broken]으로 거부된다(반쯤 바뀐 값을 쓰지 않는다).
abstract final class BackupMigrations {
  /// from 판 → (from+1) 판. 판 0 = schemaVersion이 없는 파일(이 기능 개발 중 판).
  static final Map<int, Map<String, Object?> Function(Map<String, Object?>)>
  steps = {0: _v0to1};

  static Map<String, Object?> _v0to1(Map<String, Object?> m) {
    final data = (m['data'] is Map)
        ? Map<String, Object?>.from(m['data'] as Map)
        : <String, Object?>{};
    data.putIfAbsent('prefs', () => <String, Object?>{});
    data.putIfAbsent('prayerRecords', () => <Object?>[]);
    return {
      ...m,
      'schemaVersion': 1,
      'minReaderSchema': m['minReaderSchema'] ?? 1,
      'data': data,
    };
  }

  /// [json]을 지금 판까지 올린 **새** 맵. 지금보다 새 판이면 그대로(필드 추가뿐이라 읽을 수 있다).
  static Map<String, Object?> migrate(Map<String, Object?> json) {
    var m = deepCopy(json) as Map<String, Object?>;
    var v = _versionOf(m);
    while (v < BackupFormat.schemaVersion) {
      final step = steps[v];
      if (step == null) throw StateError('no migration from $v');
      m = step(m);
      v = _versionOf(m);
    }
    return m;
  }

  static int _versionOf(Map<String, Object?> m) {
    final v = m['schemaVersion'];
    return v is int && v >= 0 ? v : 0;
  }

  static Object? deepCopy(Object? v) {
    if (v is Map) {
      return <String, Object?>{
        for (final e in v.entries) '${e.key}': deepCopy(e.value),
      };
    }
    if (v is List) return [for (final e in v) deepCopy(e)];
    return v;
  }
}

/// 백업 파일 읽기(검증 포함). 실패하면 아무것도 바꾸지 않고 이유만 돌려준다.
abstract final class BackupCodec {
  static BackupReadResult decode(String text) {
    if (text.length > BackupFormat.maxFileChars) {
      return const BackupReadResult.fail(BackupReadError.tooLarge);
    }
    Object? raw;
    try {
      raw = jsonDecode(text);
    } catch (_) {
      return const BackupReadResult.fail(BackupReadError.notJson);
    }
    if (raw is! Map) {
      return const BackupReadResult.fail(BackupReadError.notBackup);
    }
    if (raw['format'] != BackupFormat.formatId) {
      return const BackupReadResult.fail(BackupReadError.notBackup);
    }
    final minReader = raw['minReaderSchema'];
    if (minReader is int && minReader > BackupFormat.schemaVersion) {
      return const BackupReadResult.fail(BackupReadError.tooNew);
    }
    Map<String, Object?> m;
    try {
      m = BackupMigrations.migrate(Map<String, Object?>.from(raw));
    } catch (_) {
      return const BackupReadResult.fail(BackupReadError.broken);
    }
    final data = m['data'];
    if (data is! Map) {
      return const BackupReadResult.fail(BackupReadError.broken);
    }
    final prefsRaw = data['prefs'] ?? const <String, Object?>{};
    final recordsRaw = data['prayerRecords'] ?? const <Object?>[];
    if (prefsRaw is! Map || recordsRaw is! List) {
      return const BackupReadResult.fail(BackupReadError.broken);
    }
    if (prefsRaw.length > BackupFormat.maxPrefs ||
        recordsRaw.length > BackupFormat.maxRecords) {
      return const BackupReadResult.fail(BackupReadError.tooLarge);
    }

    final prefs = <String, TypedPref>{};
    var skippedPrefs = 0;
    for (final e in prefsRaw.entries) {
      final k = e.key;
      if (k is! String || k.isEmpty || k.length > BackupFormat.maxKeyChars) {
        skippedPrefs++;
        continue;
      }
      if (!BackupRegistry.shouldImport(k)) {
        // 뺀 키·비밀이 파일에 들어 있어도(옛 앱·손으로 고친 파일) 이 기기에 쓰지 않는다.
        skippedPrefs++;
        continue;
      }
      final v = TypedPref.fromJson(e.value);
      final spec = BackupRegistry.specFor(k);
      if (v == null || (spec?.type != null && spec!.type != v.type)) {
        skippedPrefs++;
        continue;
      }
      prefs[k] = v;
    }

    final records = <PrayerRecord>[];
    var skippedRecords = 0;
    for (final item in recordsRaw) {
      if (item is Map) {
        final id = item['id'];
        if (id != null &&
            (id is! String || id.length > BackupFormat.maxRecordIdChars)) {
          skippedRecords++;
          continue;
        }
        final src = item['source'];
        if (src != null &&
            src != PrayerRecord.sourceApp &&
            src != PrayerRecord.sourceChurch) {
          skippedRecords++;
          continue;
        }
      }
      final r = PrayerRecord.tryParse(item);
      if (r == null) {
        skippedRecords++;
        continue;
      }
      records.add(r);
    }

    final carry = <String, Object?>{};
    var dropped = 0;
    var carryChars = 0;
    for (final e in data.entries) {
      final k = '${e.key}';
      if (k == 'prefs' || k == 'prayerRecords') continue;
      final size = _jsonSize(e.value);
      if (k.length > BackupFormat.maxKeyChars ||
          size < 0 ||
          carryChars + size > BackupFormat.maxCarryChars) {
        dropped++;
        continue;
      }
      carryChars += size;
      carry[k] = e.value;
    }

    DateTime createdAt;
    final c = m['createdAt'];
    createdAt =
        (c is String ? DateTime.tryParse(c) : null)?.toLocal() ??
        DateTime.fromMillisecondsSinceEpoch(0);
    final app = m['appVersion'];
    final dev = m['device'];
    return BackupReadResult.ok(
      BackupDocument(
        schemaVersion:
            (m['schemaVersion'] as int?) ?? BackupFormat.schemaVersion,
        minReaderSchema: minReader is int ? minReader : 1,
        appVersion: app is String && app.length <= BackupFormat.maxMetaChars
            ? app
            : '',
        createdAt: createdAt,
        device: dev is Map && _jsonSize(dev) <= BackupFormat.maxMetaChars * 4
            ? Map<String, Object?>.from(dev)
            : const {},
        prefs: prefs,
        records: records,
        carry: carry,
        skippedPrefs: skippedPrefs,
        skippedRecords: skippedRecords,
        droppedCarry: dropped,
      ),
    );
  }

  static int _jsonSize(Object? v) {
    try {
      return jsonEncode(v).length;
    } catch (_) {
      return -1;
    }
  }
}
