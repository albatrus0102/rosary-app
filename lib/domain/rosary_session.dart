import 'dart:async';

import 'package:flutter/foundation.dart';

import 'rosary_sequence.dart';

/// 세션 진행 중 발생하는 이벤트.
enum SessionEvent { bead, hailMarysCompleted, decadeCompleted, finished }

/// 묵주기도 진행 상태 머신.
class RosarySession extends ChangeNotifier {
  RosarySession(this.steps) : assert(steps.isNotEmpty);

  final List<RosaryStep> steps;
  final StreamController<SessionEvent> _events =
      StreamController<SessionEvent>.broadcast();

  int _index = 0;
  bool _isFinished = false;
  bool _disposed = false;

  int get index => _index;
  RosaryStep get current => steps[_index];
  bool get isFinished => _isFinished;

  Stream<SessionEvent> get events => _events.stream;

  void next() {
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
    final target = index.clamp(0, steps.length - 1);
    if (target == _index && !_isFinished) return;
    _index = target;
    _isFinished = false;
    notifyListeners();
  }

  void restart() {
    _index = 0;
    _isFinished = false;
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
