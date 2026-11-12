import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';

import 'analytics_events.dart';
import 'analytics_queue_store.dart';
import 'analytics_types.dart';

export 'analytics_events.dart';
export 'analytics_queue_store.dart';
export 'analytics_types.dart';

/// 사용 분석 싱글톤. `Analytics.instance.track('이름', {속성})` 하나로 기록한다.
///
/// - 동의는 `track` 호출 시점에 확인하고, 꺼져 있으면 조용히 버린다.
/// - 이벤트 이름과 속성 키는 SPEC §4의 허용 목록만 통과한다([AnalyticsEvents]).
/// - 큐는 파일에 저장되어 재시작 후에도 남고, 20개 / 30초 / 앱이 뒤로 갈 때 올린다.
/// - 실패하면 5초에서 5분까지 2배씩 늘려 다시 시도하며 데이터를 잃지 않는다.
/// - 로그는 이벤트 이름만 출력한다(속성·사용자 id는 출력하지 않는다).
class Analytics with WidgetsBindingObserver {
  Analytics._({
    required this.uploader,
    required this.consent,
    required this.appVersion,
    required this.platform,
    required this._now,
    required this._store,
    required this.sessionId,
    required this.flushInterval,
    required this.batchSize,
    required this.maxQueue,
    required this.uploadChunk,
    required this.throwOnUnknownEvent,
    required this.minBackoff,
    required this.maxBackoff,
    this._userId,
  }) : _enabled = true;

  /// 아무것도 하지 않는 인스턴스(초기화 전 `instance`가 돌려준다).
  Analytics._noop()
    : uploader = FakeEventUploader(),
      consent = ((_) => false),
      appVersion = '',
      platform = 'android',
      sessionId = '',
      flushInterval = const Duration(seconds: 30),
      batchSize = 20,
      maxQueue = 500,
      uploadChunk = 100,
      throwOnUnknownEvent = false,
      minBackoff = const Duration(seconds: 5),
      maxBackoff = const Duration(minutes: 5),
      _now = DateTime.now,
      _store = MemoryQueueStore(),
      _enabled = false;

  static Analytics? _instance;
  static final Analytics _noopInstance = Analytics._noop();

  /// 초기화 전에는 모든 호출이 아무 일도 하지 않는 인스턴스를 돌려준다.
  static Analytics get instance => _instance ?? _noopInstance;

  static bool get isInitialized => _instance != null;

  /// 분석을 시작한다. 저장된 큐를 읽고, 그 큐가 다른 사용자의 것이면 비운다.
  ///
  /// [userId]가 null이면(로그인 전) 이벤트는 기록하지 않고, [setUserId]로 나중에
  /// 알려 준다. [platform]은 'android'/'ios'(서버 CHECK).
  static Future<Analytics> init({
    required EventUploader uploader,
    required ConsentGate consent,
    String? userId,
    required String appVersion,
    String? platform,
    DateTime Function()? now,
    QueueStore? store,
    String Function()? sessionIdGenerator,
    Duration flushInterval = const Duration(seconds: 30),
    int batchSize = 20,
    int maxQueue = 500,
    int uploadChunk = 100,
    bool throwOnUnknownEvent = kDebugMode,
    bool observeLifecycle = true,
    bool trackAppOpen = true,
    Duration minBackoff = const Duration(seconds: 5),
    Duration maxBackoff = const Duration(minutes: 5),
  }) async {
    await _instance?.dispose();
    final a = Analytics._(
      uploader: uploader,
      consent: consent,
      appVersion: appVersion,
      platform:
          platform ??
          (defaultTargetPlatform == TargetPlatform.iOS ? 'ios' : 'android'),
      now: now ?? DateTime.now,
      store: store ?? FileQueueStore(),
      sessionId: (sessionIdGenerator ?? newUuid)(),
      flushInterval: flushInterval,
      batchSize: batchSize,
      maxQueue: maxQueue,
      uploadChunk: uploadChunk,
      throwOnUnknownEvent: throwOnUnknownEvent,
      minBackoff: minBackoff,
      maxBackoff: maxBackoff,
      userId: userId,
    );
    _instance = a;
    await a._load();
    if (observeLifecycle) {
      WidgetsFlutterBinding.ensureInitialized();
      WidgetsBinding.instance.addObserver(a);
      a._observing = true;
    }
    a._autoAppOpen = trackAppOpen;
    a._trackAppOpenIfReady();
    a._armTimer();
    return a;
  }

  /// UUID v4.
  static String newUuid([Random? random]) {
    final rng = random ?? Random.secure();
    final b = List<int>.generate(16, (_) => rng.nextInt(256));
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    String hex(int from, int to) => b
        .sublist(from, to)
        .map((v) => v.toRadixString(16).padLeft(2, '0'))
        .join();
    return '${hex(0, 4)}-${hex(4, 6)}-${hex(6, 8)}-${hex(8, 10)}-${hex(10, 16)}';
  }

  final EventUploader uploader;
  final ConsentGate consent;
  final String appVersion;
  final String platform;

  /// 앱 실행(프로세스) 하나당 한 번 만든 무작위 UUID.
  final String sessionId;
  final Duration flushInterval;
  final int batchSize;
  final int maxQueue;
  final int uploadChunk;
  final bool throwOnUnknownEvent;
  final Duration minBackoff;
  final Duration maxBackoff;

  final DateTime Function() _now;
  final QueueStore _store;
  bool _enabled;
  bool _observing = false;
  bool _autoAppOpen = false;
  String? _appOpenUser;
  String? _userId;

  final List<_QueuedEvent> _queue = [];
  Timer? _timer;
  bool _flushing = false;
  int _failures = 0;
  bool _persistScheduled = false;
  Future<void> _writeChain = Future<void>.value();

  /// 현재 큐에 쌓인(아직 올라가지 않은) 이벤트 수.
  int get pendingCount => _queue.length;

  /// 연속 실패 횟수(백오프 단계).
  int get failureCount => _failures;

  /// 다음 재시도까지 기다릴 시간(실패 횟수 기준).
  Duration get currentBackoff {
    if (_failures <= 0) return Duration.zero;
    final ms = minBackoff.inMilliseconds * pow(2, _failures - 1);
    return Duration(milliseconds: min(ms, maxBackoff.inMilliseconds).toInt());
  }

  /// 큐에 있는 이벤트의 읽기 전용 복사본(테스트·디버그용).
  @visibleForTesting
  List<Map<String, dynamic>> get queuedForTest => [
    for (final e in _queue) e.toRow(appVersion: appVersion, platform: platform),
  ];

  // ---------------------------------------------------------------- track

  /// 이벤트를 기록한다. 동의가 꺼져 있거나 로그인 전이면 조용히 버린다.
  void track(String name, [Map<String, Object?> props = const {}]) {
    if (!_enabled) return;
    try {
      final spec = AnalyticsEvents.specs[name];
      if (spec == null) {
        if (throwOnUnknownEvent) {
          throw AssertionError('알 수 없는 분석 이벤트 이름: $name');
        }
        return;
      }
      if (_userId == null) return;
      if (!_consentOn(spec.category)) return;
      final clean = PropsSanitizer.sanitize(name, props);
      _enqueue(
        _QueuedEvent(
          sessionId: sessionId,
          at: _now().toUtc().toIso8601String(),
          category: spec.category,
          name: name,
          props: clean,
        ),
      );
      if (kDebugMode) debugPrint('analytics: $name');
    } on AssertionError {
      rethrow;
    } catch (_) {
      // 분석은 앱을 깨뜨리지 않는다.
    }
  }

  /// `screen_view{screen}` 단축.
  void screen(String id) => track('screen_view', {'screen': id});

  bool _consentOn(String kind) {
    try {
      return consent(kind);
    } catch (_) {
      return false;
    }
  }

  void _enqueue(_QueuedEvent e) {
    _queue.add(e);
    while (_queue.length > maxQueue) {
      _queue.removeAt(0);
    }
    _markDirty();
    if (_queue.length >= batchSize && _failures == 0 && !_flushing) {
      unawaited(flush());
    } else {
      _ensureTimer();
    }
  }

  void _trackAppOpenIfReady() {
    if (!_autoAppOpen || _userId == null || _appOpenUser == _userId) return;
    _appOpenUser = _userId;
    track('app_open');
  }

  // ------------------------------------------------------------ user/consent

  /// 로그인한 사용자가 바뀌었음을 알린다(새 사용자에게는 `app_open`을 한 번 기록한다). 사용자가 바뀌면(로그아웃 포함) 이전
  /// 사용자의 아직 올라가지 않은 이벤트는 개인정보 보호를 위해 **버린다**.
  void setUserId(String? id) {
    if (!_enabled || id == _userId) return;
    _userId = id;
    _queue.clear();
    _failures = 0;
    _timer?.cancel();
    _timer = null;
    _markDirty();
    if (id != null) _trackAppOpenIfReady();
  }

  /// 동의를 철회한 범주([ConsentKinds.usage] 등)의 큐에 남은 이벤트를 버린다.
  void purgeCategory(String kind) {
    if (!_enabled) return;
    final before = _queue.length;
    _queue.removeWhere((e) => e.category == kind);
    if (_queue.length != before) _markDirty();
    if (_queue.isEmpty) {
      _timer?.cancel();
      _timer = null;
    }
  }

  // -------------------------------------------------------------- flushing

  /// 큐를 지금 올린다(실패하면 백오프 후 재시도). 동시에 한 번만 돈다.
  Future<void> flush() async {
    if (!_enabled || _flushing) return;
    _flushing = true;
    _timer?.cancel();
    _timer = null;
    try {
      while (true) {
        // 방어: 동의가 꺼진 범주의 이벤트는 올리지 않고 버린다.
        final before = _queue.length;
        _queue.removeWhere((e) => !_consentOn(e.category));
        if (_queue.length != before) _markDirty();
        if (_queue.isEmpty || _userId == null) break;
        final batch = _queue.take(uploadChunk).toList();
        final rows = [
          for (final e in batch)
            e.toRow(appVersion: appVersion, platform: platform),
        ];
        try {
          await uploader.uploadEvents(rows);
        } catch (_) {
          _failures++;
          break;
        }
        final sent = Set<_QueuedEvent>.identity()..addAll(batch);
        _queue.removeWhere(sent.contains);
        _failures = 0;
        _markDirty();
      }
    } finally {
      _flushing = false;
      _armTimer();
    }
  }

  void _armTimer() {
    _timer?.cancel();
    _timer = null;
    if (!_enabled || _queue.isEmpty) return;
    final delay = _failures > 0 ? currentBackoff : flushInterval;
    _timer = Timer(delay, _onTimer);
  }

  void _ensureTimer() {
    if (_timer != null || _flushing || _failures > 0) return;
    _timer = Timer(flushInterval, _onTimer);
  }

  void _onTimer() {
    _timer = null;
    unawaited(flush());
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.hidden ||
        state == AppLifecycleState.detached) {
      unawaited(flush());
    }
  }

  // ------------------------------------------------------------ persistence

  Future<void> _load() async {
    try {
      final raw = await _store.read();
      if (raw == null || raw.isEmpty) return;
      final decoded = jsonDecode(raw);
      if (decoded is! Map) return;
      // 저장된 큐가 다른 사용자의 것(또는 로그아웃 상태)이면 버린다.
      if (decoded['user'] != _userId || _userId == null) {
        _markDirty();
        return;
      }
      final list = decoded['events'];
      if (list is! List) return;
      for (final item in list) {
        final e = _QueuedEvent.tryParse(item);
        if (e != null && AnalyticsEvents.isKnown(e.name)) _queue.add(e);
      }
      while (_queue.length > maxQueue) {
        _queue.removeAt(0);
      }
    } catch (_) {
      // 깨진 큐 파일: 빈 큐로 시작한다.
    }
  }

  void _markDirty() {
    if (_persistScheduled) return;
    _persistScheduled = true;
    scheduleMicrotask(() {
      _persistScheduled = false;
      final snapshot = jsonEncode({
        'v': 1,
        'user': _userId,
        'events': [for (final e in _queue) e.toJson()],
      });
      _writeChain = _writeChain
          .then((_) => _store.write(snapshot))
          .catchError((Object _) {});
    });
  }

  /// 저장 쓰기가 끝날 때까지 기다린다(테스트·종료 직전용).
  Future<void> settle() async {
    await Future<void>.microtask(() {});
    await _writeChain;
  }

  /// 테스트 사이에 싱글톤을 동기적으로 치운다(저장 쓰기를 기다리지 않는다).
  @visibleForTesting
  static void debugReset() {
    final a = _instance;
    if (a == null) return;
    a._timer?.cancel();
    a._timer = null;
    if (a._observing) {
      WidgetsBinding.instance.removeObserver(a);
      a._observing = false;
    }
    a._enabled = false;
    _instance = null;
  }

  /// 타이머와 관찰자를 정리한다. 큐는 파일에 남는다.
  Future<void> dispose() async {
    if (!_enabled) return;
    _timer?.cancel();
    _timer = null;
    if (_observing) {
      WidgetsBinding.instance.removeObserver(this);
      _observing = false;
    }
    await settle();
    _enabled = false;
    if (identical(_instance, this)) _instance = null;
  }
}

class _QueuedEvent {
  _QueuedEvent({
    required this.sessionId,
    required this.at,
    required this.category,
    required this.name,
    required this.props,
  });

  /// 이 이벤트가 만들어진 앱 실행의 세션 id(재시작 후 올라가도 유지된다).
  final String sessionId;
  final String at;
  final String category;
  final String name;
  final Map<String, Object?> props;

  Map<String, dynamic> toJson() => {
    'session_id': sessionId,
    'at': at,
    'category': category,
    'name': name,
    'props': props,
  };

  Map<String, dynamic> toRow({
    required String appVersion,
    required String platform,
  }) => {
    'session_id': sessionId,
    'at': at,
    'category': category,
    'name': name,
    'props': props,
    'app_version': appVersion,
    'platform': platform,
  };

  static _QueuedEvent? tryParse(Object? json) {
    if (json is! Map) return null;
    final sessionId = json['session_id'];
    final at = json['at'];
    final category = json['category'];
    final name = json['name'];
    final props = json['props'];
    if (sessionId is! String ||
        at is! String ||
        category is! String ||
        name is! String) {
      return null;
    }
    if (AnalyticsEvents.categoryOf(name) != category) return null;
    return _QueuedEvent(
      sessionId: sessionId,
      at: at,
      category: category,
      name: name,
      props: props is Map
          ? PropsSanitizer.sanitize(name, Map<String, Object?>.from(props))
          : const {},
    );
  }
}
