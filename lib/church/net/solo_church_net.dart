import 'dart:async';

import 'package:flutter/foundation.dart';

import 'church_net.dart';

/// 서버가 없는 혼자 모드용 구현: 항상 offline, 이벤트 없음, 전송은 모두 무시.
class SoloChurchNet implements ChurchNet {
  final ValueNotifier<NetState> _state = ValueNotifier(NetState.offline);
  final ValueNotifier<int> _count = ValueNotifier(0);

  @override
  ValueListenable<NetState> get state => _state;

  @override
  ValueListenable<int> get count => _count;

  @override
  Stream<ChurchEvent> get events => const Stream<ChurchEvent>.empty();

  @override
  Future<void> connect({required String churchId}) async {}

  @override
  Future<void> disconnect() async {}

  @override
  void dispose() {
    _state.dispose();
    _count.dispose();
  }

  @override
  void sendPos(double x, double z, double r, bool moving) {}

  @override
  void requestSit(String seat) {}

  @override
  void sendStand() {}

  @override
  void sendPraying(bool on, int ms, {bool kneel = false}) {}

  @override
  void lightCandle(int slot, int intention) {}

  @override
  void emote(int e) {}

  @override
  void requestWho() {}
}
