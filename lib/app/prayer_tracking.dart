import 'dart:async';

import '../domain/prayer_data.dart';
import '../domain/rosary_session.dart';
import '../stats/prayer_session_tracker.dart';
import '../stats/prayer_stats_store.dart';
import 'settings.dart';
import 'track.dart';

/// 기도 세션 하나의 기록(통계)과 분석(`prayer_start`/`decade_complete`/`prayer_finish`)을 묶는다.
///
/// 세션의 **주인**이 하나만 만든다: 앱 기도 화면은 자기가 만든 세션에만, 성당 기도 카드는
/// 자기 세션에만 만든다(성당 카드가 연 전체 화면 기도는 주인이 아니므로 만들지 않는다).
/// 그래야 한 세션에서 기록이 한 번만 쓰인다.
class PrayerTracking {
  PrayerTracking({
    required this.session,
    required this.mysterySet,
    required this.settings,
    PrayerStatsStore? stats,
    this.source = PrayerRecord.sourceApp,
    this.resumed = false,
  }) : _stats = stats ?? PrayerStatsStore.inMemory();

  final RosarySession session;
  final MysterySet mysterySet;
  final AppSettings settings;
  final String source;

  /// 저장된 위치에서 이어 기도하는지.
  final bool resumed;

  final PrayerStatsStore _stats;
  PrayerSessionTracker? _tracker;
  StreamSubscription<SessionEvent>? _sub;
  final Set<int> _decadesSeen = {};

  /// 세션을 이어 받은 **뒤**(이어하기 `jumpTo` 다음)에 부른다. 그 위치가 기준선이 된다.
  void start() {
    if (_tracker != null) return;
    _tracker = PrayerSessionTracker(
      store: _stats,
      session: session,
      mysterySet: mysterySet,
      source: source,
      onRecord: (r) => Track.prayerFinish(
        set: r.set,
        completed: r.completed,
        decades: r.decades,
        seconds: r.seconds,
      ),
    )..start();
    _sub = session.events.listen(_onEvent);
    session.addListener(_onSession);
    Track.prayerStart(
      set: mysterySet,
      mode: settings.prayerMode,
      resumed: resumed,
      source: source,
    );
  }

  void _onSession() {
    // 처음으로 돌아가면(다시 기도하기 포함) 단 완료를 다시 센다.
    if (session.index == 0) _decadesSeen.clear();
  }

  void _onEvent(SessionEvent e) {
    if (e != SessionEvent.decadeCompleted) return;
    // 이벤트 직후 현재 스텝은 다음 단(또는 마침)이다.
    final next = session.current.decade;
    final done = next == null ? 5 : next - 1;
    if (done < 1 || done > 5) return;
    if (_decadesSeen.add(done)) Track.decadeComplete(mysterySet, done);
  }

  /// 잠깐 쉬기: 시간 측정을 멈춘다.
  void pause() => _tracker?.pause();

  void resume() => _tracker?.resume();

  /// 기록을 남기고 끝낸다(멱등). 세션을 정리하기 **전에** 부른다.
  Future<void> finish() {
    _sub?.cancel();
    _sub = null;
    session.removeListener(_onSession);
    return _tracker?.finish() ?? Future<void>.value();
  }

  void dispose() => unawaited(finish());
}
