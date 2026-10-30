import 'dart:async';

import 'package:flutter/foundation.dart';

import 'rosary_sequence.dart';

/// 세션 진행 중 발생하는 이벤트.
enum SessionEvent { bead, hailMarysCompleted, decadeCompleted, finished }

/// 묵주기도 진행 상태 머신.
class RosarySession extends ChangeNotifier {
  RosarySession(this.steps, {DateTime Function()? clock})
    : _clock = clock ?? DateTime.now,
      assert(steps.isNotEmpty);

  /// '돌보소서'처럼 아멘이 아닌 문구로 넘어간 직후, 사용자가 덧붙여 말한
  /// '아멘'이 이 시간 안에 들어오면 한 번 무시한다(다음 기도까지 건너뛰지 않도록).
  static const trailingAmenWindow = Duration(seconds: 3);

  final List<RosaryStep> steps;
  final DateTime Function() _clock;
  DateTime? _ignoreAmenUntil;
  final StreamController<SessionEvent> _events =
      StreamController<SessionEvent>.broadcast();

  int _index = 0;
  bool _isFinished = false;
  int _amenCount = 0;
  bool _disposed = false;

  int get index => _index;
  RosaryStep get current => steps[_index];
  bool get isFinished => _isFinished;

  /// 음성으로 전진한 횟수.
  int get amenCount => _amenCount;

  Stream<SessionEvent> get events => _events.stream;

  void onPhrase(String phrase) {
    if (_isFinished) return;
    if (phrase == '아멘') {
      final until = _ignoreAmenUntil;
      _ignoreAmenUntil = null;
      if (until != null && !_clock().isAfter(until)) return;
    }
    if (current.triggerPhrases.contains(phrase)) {
      _amenCount++;
      next();
      if (phrase != '아멘') {
        _ignoreAmenUntil = _clock().add(trailingAmenWindow);
      }
    }
  }

  void onAmen() => onPhrase('아멘');

  void next() {
    _ignoreAmenUntil = null;
    if (_isFinished) return;
    if (_index == steps.length - 1) {
      _isFinished = true;
      _emit(SessionEvent.finished);
      notifyListeners();
      return;
    }
    final old = steps[_index];
    final oldDecade = old.decade;
    _index++;
    final newDecade = steps[_index].decade;
    // 단이 끝난 경우에만 decadeCompleted (서두 -> 1단 진입은 제외,
    // 5단 -> 마침은 포함).
    final SessionEvent event;
    if (oldDecade != null && newDecade != oldDecade) {
      event = SessionEvent.decadeCompleted;
    } else if (old.kind == StepKind.hailMary && old.beadIndex == 10) {
      event = SessionEvent.hailMarysCompleted;
    } else {
      event = SessionEvent.bead;
    }
    _emit(event);
    notifyListeners();
  }

  void back() {
    _ignoreAmenUntil = null;
    if (_isFinished) {
      _isFinished = false;
      notifyListeners();
      return;
    }
    if (_index == 0) return;
    _index--;
    notifyListeners();
  }

  void jumpTo(int index) {
    _ignoreAmenUntil = null;
    final target = index.clamp(0, steps.length - 1);
    if (target == _index && !_isFinished) return;
    _index = target;
    _isFinished = false;
    notifyListeners();
  }

  void restart() {
    _ignoreAmenUntil = null;
    _index = 0;
    _isFinished = false;
    _amenCount = 0;
    notifyListeners();
  }

  void _emit(SessionEvent e) {
    if (!_events.isClosed) _events.add(e);
  }

  @override
  void dispose() {
    if (_disposed) return;
    _disposed = true;
    _events.close();
    super.dispose();
  }
}
