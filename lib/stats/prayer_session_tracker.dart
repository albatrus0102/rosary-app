import 'dart:async';

import '../domain/prayer_data.dart';
import '../domain/rosary_sequence.dart';
import '../domain/rosary_session.dart';
import 'prayer_stats_store.dart';

/// 진행 중인 [RosarySession]에 붙어 기도 기록을 만든다.
///
/// 이벤트를 세지 않고 **도달한 가장 큰 스텝 인덱스**에서 개수를 계산하므로
/// 뒤로 갔다가 다시 앞으로 가도 두 번 세지 않는다.
///  - 성모송: 인덱스가 (도달 최대 인덱스)보다 작은 성모송 스텝 수
///    − (시작 인덱스보다 작은 성모송 스텝 수)
///  - 단: 구원송 스텝 인덱스가 같은 기준보다 작은 단 수
///  - 완주: 세션이 `isFinished`가 된 적이 있음
///
/// 세션이 끝나면 즉시 `completed: true` 기록을 쓰고, 사용자가 다시 시작
/// (`restart()`)하면 새 구간(기준선 0)이 시작되어 나중에 새 기록이 쓰인다.
class PrayerSessionTracker {
  PrayerSessionTracker({
    required this.store,
    required this.session,
    required this.mysterySet,
    this.source = PrayerRecord.sourceApp,
    this.now = DateTime.now,
  }) : _hailMaryBelow = _prefix(
         session.steps,
         (s) => s.kind == StepKind.hailMary,
       ),
       _decadeBelow = _prefix(session.steps, (s) => s.kind == StepKind.fatima);

  /// 스텝 사이 공백 하나가 시간으로 인정되는 최대치.
  static const Duration maxGap = Duration(minutes: 3);

  final PrayerStatsStore store;
  final RosarySession session;
  final MysterySet mysterySet;
  final String source;

  /// 시계(테스트에서 주입).
  final DateTime Function() now;

  /// `prefix[i]` = 인덱스 i보다 작은 스텝 중 조건을 만족하는 수.
  final List<int> _hailMaryBelow;
  final List<int> _decadeBelow;

  static List<int> _prefix(
    List<RosaryStep> steps,
    bool Function(RosaryStep) test,
  ) {
    final out = List<int>.filled(steps.length + 1, 0);
    for (var i = 0; i < steps.length; i++) {
      out[i + 1] = out[i] + (test(steps[i]) ? 1 : 0);
    }
    return out;
  }

  bool _started = false;
  bool _closed = false;
  bool _paused = false;

  // 현재 구간 상태.
  bool _segmentActive = false;
  bool _allowComplete = true;
  int _baseline = 0;
  int _maxIndex = 0;
  bool _completed = false;
  Duration _active = Duration.zero;
  late DateTime _mark;

  int _lastIndex = 0;
  bool _lastFinished = false;
  Future<void> _pending = Future<void>.value();

  /// 현재 구간에서 새로 마친 성모송 수.
  int get hailMarys => _segmentActive ? _count(_hailMaryBelow) : 0;

  /// 현재 구간에서 새로 마친 단 수.
  int get decades => _segmentActive ? _count(_decadeBelow).clamp(0, 5) : 0;

  bool get isPaused => _paused;

  int _count(List<int> prefix) {
    final upper = _maxIndex.clamp(0, session.steps.length);
    final base = _baseline.clamp(0, session.steps.length);
    return prefix[upper] - prefix[base];
  }

  /// 세션에 붙어 기록을 시작한다. 여러 번 불러도 한 번만 동작한다.
  void start() {
    if (_started || _closed) return;
    _started = true;
    _lastIndex = session.index;
    _lastFinished = session.isFinished;
    session.addListener(_onSession);
    if (!session.isFinished) _beginSegment(allowComplete: true);
  }

  /// 잠깐 쉬기: 시간 측정을 멈춘다.
  void pause() {
    if (!_started || _closed || _paused) return;
    _accrue();
    _paused = true;
  }

  /// 쉬기 끝: 시간 측정을 다시 시작한다.
  void resume() {
    if (!_paused) return;
    _paused = false;
    _mark = now();
  }

  /// 현재까지의 진행을 기록으로 남기고 끝낸다(멱등). 진행이 없으면 아무것도
  /// 쓰지 않는다. 화면을 떠날 때(dispose) 호출한다.
  Future<void> finish() {
    if (_closed) return _pending;
    _closed = true;
    if (_started) {
      session.removeListener(_onSession);
      if (_segmentActive) {
        _accrue();
        _writeSegment();
      }
    }
    return _pending;
  }

  /// [finish]를 기다리지 않고 호출한다.
  void dispose() {
    unawaited(finish());
  }

  void _beginSegment({required bool allowComplete}) {
    _segmentActive = true;
    _allowComplete = allowComplete;
    _baseline = session.index;
    _maxIndex = _baseline;
    _completed = false;
    _active = Duration.zero;
    _mark = now();
  }

  void _accrue() {
    final t = now();
    if (!_paused) {
      var gap = t.difference(_mark);
      if (gap.isNegative) gap = Duration.zero;
      if (gap > maxGap) gap = maxGap;
      _active += gap;
    }
    _mark = t;
  }

  void _onSession() {
    if (_closed) return;
    final idx = session.index;
    final fin = session.isFinished;
    final changed = idx != _lastIndex || fin != _lastFinished;
    _lastIndex = idx;
    _lastFinished = fin;
    if (!changed) return;

    if (!_segmentActive) {
      // 끝난 뒤 다시 열린 경우: 새 구간. 처음(0)부터 다시 시작할 때만 새 완주를
      // 인정하고, 끝에서 한두 스텝 되돌아간 경우는 이미 쓴 완주와 겹치지 않게 한다.
      if (!fin) _beginSegment(allowComplete: idx == 0);
      return;
    }

    _accrue();
    if (idx > _maxIndex) _maxIndex = idx;
    if (fin) {
      _maxIndex = session.steps.length;
      _completed = _allowComplete;
      _writeSegment();
      _segmentActive = false;
    }
  }

  void _writeSegment() {
    final hm = _count(_hailMaryBelow);
    final dec = _count(_decadeBelow).clamp(0, 5);
    if (hm < 1 && dec < 1 && !_completed) return;
    final record = PrayerRecord(
      at: now(),
      set: mysterySet,
      decades: dec,
      hailMarys: hm,
      completed: _completed,
      seconds: (_active.inMilliseconds / 1000).round(),
      source: source,
    );
    _pending = _pending.then((_) => store.add(record));
  }
}
