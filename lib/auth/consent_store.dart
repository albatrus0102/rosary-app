import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart'
    hide AuthState, LocalStorage;

import 'auth_service.dart';

/// 동의 문서·앱·서버가 함께 쓰는 버전. 바뀌면 모두에게 다시 동의를 받는다.
const String consentVersion = '2026-11-v1';

/// 동의 종류(SPEC §2). 서버 `consents.kind`와 같은 문자열.
abstract final class ConsentKind {
  // 필수
  static const String terms = 'terms';
  static const String privacy = 'privacy';
  static const String age14 = 'age14';
  // 선택
  static const String usage = 'usage';
  static const String sync = 'sync';
  static const String church = 'church';
  static const String diagnostics = 'diagnostics';

  static const List<String> required = [terms, privacy, age14];
  static const List<String> optional = [usage, sync, church, diagnostics];
  static const List<String> all = [...required, ...optional];

  static bool isValid(String kind) => all.contains(kind);
}

/// 한 동의 항목의 최신 기록(서버 최신 행 또는 로컬 캐시).
@immutable
class ConsentRecord {
  const ConsentRecord({
    required this.kind,
    required this.granted,
    required this.version,
    required this.at,
  });

  final String kind;
  final bool granted;
  final String version;
  final DateTime at;
}

/// 동의 변경 이벤트(변경 스트림용).
@immutable
class ConsentChange {
  const ConsentChange(this.kind, this.granted);
  final String kind;
  final bool granted;
}

/// 동의 서버 접근 추상. Supabase 구현은 [SupabaseConsentBackend].
abstract class ConsentBackend {
  /// 동의 기록 한 건을 서버에 추가한다(철회면 서버가 그 범주 데이터를 삭제).
  Future<void> setConsent({
    required String kind,
    required bool granted,
    required String version,
    required String source,
  });

  /// 종류별 최신 기록.
  Future<List<ConsentRecord>> fetchLatest();
}

/// Supabase RPC `set_consent`와 `consents` 표를 쓰는 구현.
class SupabaseConsentBackend implements ConsentBackend {
  SupabaseConsentBackend({SupabaseClient? client})
    : _client = client ?? Supabase.instance.client;

  final SupabaseClient _client;

  @override
  Future<void> setConsent({
    required String kind,
    required bool granted,
    required String version,
    required String source,
  }) async {
    await _client.rpc(
      'set_consent',
      params: {
        'kind': kind,
        'granted': granted,
        'version': version,
        'source': source,
      },
    );
  }

  @override
  Future<List<ConsentRecord>> fetchLatest() async {
    final rows = await _client
        .from('consents')
        .select('kind, version, granted, at')
        .order('at', ascending: false)
        .limit(200);
    final latest = <String, ConsentRecord>{};
    for (final row in rows) {
      final kind = row['kind'] as String?;
      if (kind == null || !ConsentKind.isValid(kind)) continue;
      // 최신순이므로 처음 보이는 행이 그 종류의 최신.
      latest.putIfAbsent(
        kind,
        () => ConsentRecord(
          kind: kind,
          granted: row['granted'] == true,
          version: row['version'] as String? ?? '',
          at: DateTime.tryParse('${row['at']}') ?? DateTime.now(),
        ),
      );
    }
    return latest.values.toList();
  }
}

class _Pending {
  _Pending(this.kind, this.granted, this.version, this.source);
  final String kind;
  final bool granted;
  final String version;
  final String source;

  Map<String, Object?> toJson() => {
    'k': kind,
    'g': granted,
    'v': version,
    's': source,
  };

  static _Pending? fromJson(Object? j) {
    if (j is! Map) return null;
    final k = j['k'];
    final g = j['g'];
    final v = j['v'];
    final s = j['s'];
    if (k is! String || g is! bool || v is! String || s is! String) return null;
    return _Pending(k, g, v, s);
  }
}

/// 동의 저장소: 로컬 캐시(사용자별) + 서버 동기화.
///
/// - 오프라인에서도 동작한다. 서버 쓰기는 큐에 쌓고, 로그인·온라인·
///   [flush] 때 올린다.
/// - 현재 로그인한 사용자의 동의만 다룬다. 사용자가 바뀌면 그 사용자의 캐시를 읽는다.
/// - 서버 쓰기 순서는 보존된다(append-only 로그).
/// - 다른 기능은 `has(kind)`로 확인한다(예: `consentStore.has(ConsentKind.sync)`).
class ConsentStore extends ChangeNotifier {
  ConsentStore({
    required this._prefs,
    required AuthService authService,
    this._backend,
    this.version = consentVersion,
    this.syncTimeout = const Duration(seconds: 8),
    DateTime Function()? now,
  }) : _auth = authService,
       _now = now ?? DateTime.now {
    _auth.state.addListener(_onAuth);
    // 시작 시 로그아웃 상태면 로그인 전에 받아 둔 동의(기기 캐시)부터 읽는다.
    _load(deviceKey);
    _onAuth();
  }

  static const String _prefix = 'auth.consent.v1.';

  /// 로그인 전(첫 실행, 게스트 시작 전)의 동의를 담는 로컬 캐시 키. 게스트로 시작하면
  /// 그 사용자의 캐시로 옮겨져 서버에 올라간다.
  static const String deviceKey = '_device';

  final SharedPreferences _prefs;
  final AuthService _auth;
  final ConsentBackend? _backend;
  final DateTime Function() _now;

  /// 이 저장소가 '현재'로 보는 동의 버전.
  final String version;
  final Duration syncTimeout;

  final StreamController<ConsentChange> _changes =
      StreamController<ConsentChange>.broadcast();

  String? _uid;
  final Map<String, ConsentRecord> _records = {};
  final List<_Pending> _queue = [];
  bool _resolved = true;
  Future<void>? _syncing;
  bool _disposed = false;

  /// 동의가 바뀔 때마다 한 건씩 나온다(서버 동기화로 바뀐 것은 나오지 않음).
  Stream<ConsentChange> get changes => _changes.stream;

  /// 서버로 아직 못 보낸 동의 기록 수.
  int get pendingCount => _queue.length;

  /// 저장소가 현재 사용자의 동의 상태를 알고 있는지. 새 기기에서 로그인한 직후,
  /// 서버의 기존 동의를 확인하기 전에는 false(게이트가 잠깐 기다린다).
  bool get isResolved => _resolved;

  /// 현재 버전에서 [kind]에 동의했는가. 로그아웃 상태(아직 사용자 행이 없음)에서는
  /// 항상 false: 사용자 없이 서버로 보낼 수 없으므로 분석·동기화는 막혀 있다.
  bool has(String kind) => _uid != null && _hasLocal(kind);

  /// 사용자 행이 없는 동안(로컬에만 저장된 동의 포함)에도 현재 버전으로 동의했는가.
  bool _hasLocal(String kind) {
    final r = _records[kind];
    return r != null && r.granted && r.version == version;
  }

  bool get isRequiredComplete => ConsentKind.required.every(_hasLocal);

  /// 필수 동의가 현재 버전으로 모두 되어 있지 않다.
  bool get needsConsent => !isRequiredComplete;

  /// 서버 확인 전이라 판단을 미뤄야 하는 상태(첫 로그인한 기기).
  bool get isCheckingServer => _uid != null && !_resolved && needsConsent;

  // ---- 변경 -------------------------------------------------------------

  Future<void> grant(String kind, {String source = 'app'}) =>
      setAll({kind: true}, source: source);

  Future<void> revoke(String kind, {String source = 'app'}) =>
      setAll({kind: false}, source: source);

  /// 필수 3개 동의.
  Future<void> grantRequired({String source = 'consent_screen'}) =>
      setAll({for (final k in ConsentKind.required) k: true}, source: source);

  /// 여러 종류를 한 번에 바꾼다. 로컬에 즉시 반영·저장하고, 서버 전송은 큐로 한다.
  ///
  /// 로그인 전이면 기기 로컬 캐시([deviceKey])에만 저장해 두었다가, 게스트로 시작하는
  /// 순간 새 사용자에게 옮겨 서버에 올린다.
  Future<void> setAll(Map<String, bool> values, {String source = 'app'}) async {
    final uid = _uid;
    final owner = uid ?? deviceKey;
    final now = _now();
    final changed = <ConsentChange>[];
    for (final e in values.entries) {
      if (!ConsentKind.isValid(e.key)) continue;
      _records[e.key] = ConsentRecord(
        kind: e.key,
        granted: e.value,
        version: version,
        at: now,
      );
      _queue.add(_Pending(e.key, e.value, version, source));
      changed.add(ConsentChange(e.key, e.value));
    }
    if (changed.isEmpty) return;
    await _persist(owner);
    notifyListeners();
    for (final c in changed) {
      if (!_changes.isClosed) _changes.add(c);
    }
    unawaited(flush());
  }

  // ---- 동기화 -------------------------------------------------------------

  /// 큐를 서버로 올린다. 실패하면 남겨 두고 다음 기회에 다시 시도한다.
  Future<void> flush() async {
    final backend = _backend;
    final uid = _uid;
    if (backend == null || uid == null) return;
    while (_queue.isNotEmpty && _uid == uid && !_disposed) {
      final p = _queue.first;
      try {
        await backend
            .setConsent(
              kind: p.kind,
              granted: p.granted,
              version: p.version,
              source: p.source,
            )
            .timeout(syncTimeout);
      } catch (e) {
        debugPrint('consent: upload deferred (${e.runtimeType})');
        return;
      }
      if (_uid != uid) return;
      _queue.remove(p);
      await _persist(uid);
    }
  }

  /// 큐를 올리고 서버의 최신 동의를 가져와 합친다. 대기 중인 로컬 변경이 있는
  /// 종류는 로컬이 우선이다. 오프라인이면 조용히 끝난다.
  Future<void> sync() => _syncing ??= _doSync().whenComplete(() {
    _syncing = null;
  });

  Future<void> _doSync() async {
    final uid = _uid;
    final backend = _backend;
    if (uid == null || backend == null) {
      _markResolved();
      return;
    }
    try {
      await flush();
      final remote = await backend.fetchLatest().timeout(syncTimeout);
      if (_uid != uid || _disposed) return;
      final pendingKinds = _queue.map((p) => p.kind).toSet();
      var changed = false;
      for (final r in remote) {
        if (pendingKinds.contains(r.kind)) continue;
        final local = _records[r.kind];
        if (local == null ||
            local.granted != r.granted ||
            local.version != r.version) {
          _records[r.kind] = r;
          changed = true;
        }
      }
      if (changed) await _persist(uid);
    } catch (e) {
      debugPrint('consent: sync skipped (${e.runtimeType})');
    }
    if (_uid == uid) _markResolved(forceNotify: true);
  }

  void _markResolved({bool forceNotify = false}) {
    final was = _resolved;
    _resolved = true;
    if (!_disposed && (forceNotify || !was)) notifyListeners();
  }

  // ---- 로컬 캐시 ----------------------------------------------------------

  /// 로그아웃 → 같은 기기의 다른 사용자 로그인 등으로 사용자가 바뀌면 캐시를 다시 읽는다.
  void _onAuth() {
    final s = _auth.state.value;
    final uid = s.isSignedIn ? s.userId : null;
    if (uid == _uid) return;
    _uid = uid;
    _records.clear();
    _queue.clear();
    if (uid == null) {
      // 로그아웃·첫 실행: 사용자 없이 기기에 저장해 둔 동의만 읽는다.
      _load(deviceKey);
      _resolved = true;
      notifyListeners();
      return;
    }
    _load(uid);
    _adoptDeviceConsent(uid);
    // 로컬에서 필수 동의가 이미 확인되면 서버 확인을 기다리지 않는다.
    _resolved = !needsConsent;
    notifyListeners();
    unawaited(sync());
  }

  /// 로그인 전에 받은 동의를 새로 생긴 사용자에게 옮긴다(사용자가 이미 현재 버전의
  /// 필수 동의를 가졌으면 건드리지 않는다). 옮긴 뒤 기기 캐시는 지운다.
  void _adoptDeviceConsent(String uid) {
    final key = '$_prefix$deviceKey';
    if (_prefs.getString(key) == null) return;
    if (needsConsent) {
      final userRecords = Map<String, ConsentRecord>.of(_records);
      final userQueue = List<_Pending>.of(_queue);
      _records.clear();
      _queue.clear();
      _load(deviceKey);
      // 사용자 캐시에 같은 종류가 있으면 그것을 우선한다.
      _records.addAll(userRecords);
      _queue.addAll(userQueue);
      unawaited(_persist(uid));
    }
    unawaited(_prefs.remove(key));
  }

  void _load(String owner) {
    final raw = _prefs.getString('$_prefix$owner');
    if (raw == null) return;
    try {
      final j = jsonDecode(raw) as Map<String, dynamic>;
      final recs = j['r'];
      if (recs is Map) {
        for (final e in recs.entries) {
          final v = e.value;
          if (v is Map && ConsentKind.isValid('${e.key}')) {
            _records['${e.key}'] = ConsentRecord(
              kind: '${e.key}',
              granted: v['g'] == true,
              version: '${v['v']}',
              at: DateTime.fromMillisecondsSinceEpoch(
                (v['t'] as num?)?.toInt() ?? 0,
              ),
            );
          }
        }
      }
      final q = j['q'];
      if (q is List) {
        for (final item in q) {
          final p = _Pending.fromJson(item);
          if (p != null) _queue.add(p);
        }
      }
    } catch (_) {
      // 손상된 캐시는 무시한다(서버 동기화로 복구).
    }
  }

  Future<void> _persist(String owner) {
    final j = {
      'r': {
        for (final e in _records.entries)
          e.key: {
            'g': e.value.granted,
            'v': e.value.version,
            't': e.value.at.millisecondsSinceEpoch,
          },
      },
      'q': [for (final p in _queue) p.toJson()],
    };
    return _prefs.setString('$_prefix$owner', jsonEncode(j));
  }

  /// 계정 삭제 뒤: 이 사용자의 로컬 동의 캐시와 대기 큐를 지운다.
  Future<void> clearLocalData([String? uid]) async {
    final target = uid ?? _uid ?? deviceKey;
    await _prefs.remove('$_prefix$target');
    if (target == (_uid ?? deviceKey)) {
      _records.clear();
      _queue.clear();
      notifyListeners();
    }
  }

  @override
  void dispose() {
    _disposed = true;
    _auth.state.removeListener(_onAuth);
    _changes.close();
    super.dispose();
  }
}
