import 'dart:math';

import '../domain/prayer_data.dart';

/// 기도 한 번(한 세션 조각)의 기록.
///
/// 앱에서 직접 바친 기도는 `source == 'app'`, 사이버 성당에서 함께 바친 기도는
/// `'church'`다. 이어서 기도한 경우 한 묵주기도가 여러 기록으로 나뉠 수 있어,
/// 각 기록은 그 기록 안에서 **새로** 마친 단/성모송만 센다.
class PrayerRecord {
  PrayerRecord({
    String? id,
    required this.at,
    required this.set,
    this.decades = 0,
    this.hailMarys = 0,
    this.completed = false,
    this.seconds = 0,
    this.source = sourceApp,
  }) : id = id ?? generateId();

  /// UUID v4 형식의 무작위 id(`Random.secure`).
  static String generateId([Random? random]) {
    final rng = random ?? Random.secure();
    final b = List<int>.generate(16, (_) => rng.nextInt(256));
    b[6] = (b[6] & 0x0f) | 0x40; // version 4
    b[8] = (b[8] & 0x3f) | 0x80; // variant 10xx
    String hex(int from, int to) => b
        .sublist(from, to)
        .map((v) => v.toRadixString(16).padLeft(2, '0'))
        .join();
    return '${hex(0, 4)}-${hex(4, 6)}-${hex(6, 8)}-${hex(8, 10)}-${hex(10, 16)}';
  }

  /// 기록의 고유 id. 서버 동기화 등에서 멱등 업로드의 키로 쓴다. 저장·복원해도
  /// 바뀌지 않는다.
  final String id;

  static const String sourceApp = 'app';
  static const String sourceChurch = 'church';

  /// 기도를 마친(기록한) 시각. 로컬 시간.
  final DateTime at;

  /// 바친 신비.
  final MysterySet set;

  /// 이 기록에서 새로 마친 단 수 (0..5).
  final int decades;

  /// 이 기록에서 새로 마친 성모송 수.
  final int hailMarys;

  /// 이 기록에서 묵주기도 전체를 마쳤는지.
  final bool completed;

  /// 기도한 시간(초). 쉬는 시간과 긴 공백은 제외.
  final int seconds;

  /// 'app' 또는 'church'.
  final String source;

  /// 아무 진행도 없는 기록인지(통계에서 무시된다).
  bool get hasProgress => decades >= 1 || hailMarys >= 1 || completed;

  Map<String, Object> toJson() => {
    'id': id,
    'at': at.toIso8601String(),
    'set': set.name,
    'decades': decades,
    'hailMarys': hailMarys,
    'completed': completed,
    'seconds': seconds,
    'source': source,
  };

  /// JSON에서 기록을 복원한다. 필수 필드(`at`, `set`)가 없거나 형식이 틀리면
  /// `null`을 돌려주어 호출자가 그 기록을 건너뛰게 한다. `id`가 없으면(구버전 JSON)
  /// 새 id를 만든다. 숫자 필드가 없으면 0,
  /// 범위를 벗어나면 범위로 맞춘다.
  static PrayerRecord? tryParse(Object? json) {
    if (json is! Map) return null;
    final atRaw = json['at'];
    final setRaw = json['set'];
    if (atRaw is! String || setRaw is! String) return null;
    final at = DateTime.tryParse(atRaw);
    if (at == null) return null;
    MysterySet? set;
    for (final s in MysterySet.values) {
      if (s.name == setRaw) set = s;
    }
    if (set == null) return null;

    int? readInt(String key) {
      final v = json[key];
      if (v == null) return 0;
      if (v is num && v.isFinite) return v.round();
      return null;
    }

    final decades = readInt('decades');
    final hailMarys = readInt('hailMarys');
    final seconds = readInt('seconds');
    if (decades == null || hailMarys == null || seconds == null) return null;
    final completedRaw = json['completed'];
    if (completedRaw != null && completedRaw is! bool) return null;
    final idRaw = json['id'];
    final id = idRaw is String && idRaw.isNotEmpty ? idRaw : null;
    final sourceRaw = json['source'];
    final source = sourceRaw == sourceChurch ? sourceChurch : sourceApp;

    return PrayerRecord(
      id: id,
      at: at.toLocal(),
      set: set,
      decades: decades.clamp(0, 5),
      hailMarys: hailMarys.clamp(0, 99),
      completed: completedRaw == true,
      seconds: seconds.clamp(0, 24 * 3600),
      source: source,
    );
  }

  @override
  bool operator ==(Object other) =>
      other is PrayerRecord &&
      other.id == id &&
      other.at == at &&
      other.set == set &&
      other.decades == decades &&
      other.hailMarys == hailMarys &&
      other.completed == completed &&
      other.seconds == seconds &&
      other.source == source;

  @override
  int get hashCode =>
      Object.hash(id, at, set, decades, hailMarys, completed, seconds, source);

  @override
  String toString() =>
      'PrayerRecord($id, $at, ${set.name}, decades: $decades, hailMarys: $hailMarys, '
      'completed: $completed, seconds: $seconds, source: $source)';
}
