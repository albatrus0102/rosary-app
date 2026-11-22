/// 성당 장면 멎음 감시(2026-11-23, 여의도동 '멎음' 제보 — docs/church/interiors/yeouido.md §9.9).
///
/// 웹 장면은 1초마다 심장 박동(`{e:'hb', f: 그린 프레임 수, st}`)을 보낸다. 화면이 보이고 장면이 그려야 하는 동안
/// 아래 셋 중 하나가 [stallAfter] 넘게 이어지면 멎은 것으로 본다:
///  * `no_heartbeat` — 박동이 오지 않는다(웹 스레드가 끝나지 않는 계산에 묶였거나 웹뷰가 응답하지 않는다)
///  * `frozen` — 박동은 오는데 그린 프레임 수가 늘지 않는다(그리기 고리가 죽었다)
///  * `webgl` — WebGL 문맥을 잃고 되찾지 못했다(three.js 는 조용히 그리기를 건너뛴다 — 화면이 마지막 그림에서 멎는다)
///  * `paused` — 화면은 보이는데 웹이 아직 일시정지 상태다(재개가 닿지 않았다) — 화면은 재개를 다시 보낸다
///  * `hidden` — 화면은 보이는데 웹 문서는 자기가 숨어 있다고 안다(앱 재개 뒤 웹뷰가 창에 다시 붙지 않음 — rAF 가 오지 않는다)
///    — 화면은 웹뷰를 다시 붙인다
/// 보이기 시작한 직후(재개)에는 [grace] 동안 판단하지 않는다(웹이 다시 깨어나는 시간). 박동을 한 번도 받지 못했으면(박동을 보내지 않는
/// 옛 장면·시험용 가짜) 판단하지 않는다.
class ChurchSceneWatchdog {
  ChurchSceneWatchdog({
    this.stallAfter = const Duration(seconds: 3),
    this.grace = const Duration(seconds: 4),
    DateTime Function()? clock,
  }) : _clock = clock ?? DateTime.now;

  final Duration stallAfter;
  final Duration grace;
  final DateTime Function() _clock;

  bool _expect = false;
  DateTime? _since; // 그려야 하는 상태가 된 때(유예 기준)
  DateTime? _lastBeat; // 마지막 박동
  DateTime? _lastAdvance; // 그린 수가 마지막으로 늘어난 때(또는 그릴 필요가 없던 때)
  int? _frames;
  String _state = 'run';
  bool _glLost = false;
  DateTime? _glLostAt;
  DateTime? _offSince; // 'paused'·'hidden' 이 이어진 때부터
  bool _armed = false; // 박동을 한 번이라도 받았다

  /// 지금 알고 있는 마지막 박동 상태(오류 기록용).
  String get state => _state;
  int get frames => _frames ?? -1;

  /// 장면이 그려야 하는 상태인가(화면에 보이고, 준비됐고, 첫 프레임 뒤, 창 감상이 아님). 바뀔 때 유예를 새로 시작한다.
  void expect(bool running) {
    if (running == _expect) return;
    _expect = running;
    final now = _clock();
    _since = running ? now : null;
    _lastBeat = null;
    _lastAdvance = now;
    _offSince = null;
  }

  void beat({required int frames, String state = 'run'}) {
    final now = _clock();
    _armed = true;
    _lastBeat = now;
    if (_frames == null || frames > _frames! || state != 'run') {
      _lastAdvance = now;
    }
    _frames = frames;
    if (state == 'paused' || state == 'hidden') {
      if (_state != state) _offSince = now;
      _offSince ??= now;
    } else {
      _offSince = null;
    }
    _state = state;
    if (state == 'gl') {
      _onGl(true, now);
    } else if (state == 'run' && _glLost) {
      _onGl(false, now);
    }
  }

  void gl({required bool lost}) => _onGl(lost, _clock());

  void _onGl(bool lost, DateTime now) {
    if (lost && !_glLost) _glLostAt = now;
    _glLost = lost;
    if (!lost) _glLostAt = null;
  }

  /// 멎었으면 까닭('no_heartbeat'|'frozen'|'webgl'|'paused'|'hidden'), 아니면 null.
  String? check() {
    if (!_expect || !_armed) return null;
    final now = _clock();
    final since = _since ?? now;
    if (now.difference(since) < grace) return null;
    final glAt = _glLostAt;
    if (_glLost && glAt != null && now.difference(glAt) >= stallAfter) {
      return 'webgl';
    }
    final off = _offSince;
    if (off != null && now.difference(off) >= stallAfter) return _state;
    final lb = _lastBeat ?? since;
    if (now.difference(lb) >= stallAfter + const Duration(milliseconds: 500)) {
      return 'no_heartbeat';
    }
    final la = _lastAdvance ?? since;
    // 박동이 아직 오는 중일 때만 frozen(박동이 끊긴 것은 위의 no_heartbeat 가 맡는다 — 다시 붙이기로는 고쳐지지 않는다)
    if (_state == 'run' &&
        now.difference(la) >= stallAfter &&
        now.difference(lb) < const Duration(seconds: 2)) {
      return 'frozen';
    }
    return null;
  }
}
