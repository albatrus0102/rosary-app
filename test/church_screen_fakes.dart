import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/app/settings.dart';
import 'package:rosary_app/church/church_scene_controller.dart';
import 'package:rosary_app/church/church_screen.dart';
import 'package:rosary_app/church/net/church_net.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// 네트워크 없이 호출을 기록하는 가짜 ChurchNet.
class FakeChurchNet implements ChurchNet {
  final ValueNotifier<NetState> stateN = ValueNotifier(NetState.offline);
  final ValueNotifier<int> countN = ValueNotifier(0);
  final StreamController<ChurchEvent> ctrl = StreamController.broadcast();

  final List<String> connectedIds = [];
  int disconnects = 0;
  final List<String> sits = [];
  int stands = 0;
  final List<(bool, int)> prayings = [];
  final List<(int, int)> candles = [];
  final List<int> emotes = [];
  final List<(double, double, double, bool)> positions = [];

  @override
  ValueListenable<NetState> get state => stateN;
  @override
  ValueListenable<int> get count => countN;
  @override
  Stream<ChurchEvent> get events => ctrl.stream;

  @override
  Future<void> connect({required String churchId}) async =>
      connectedIds.add(churchId);
  @override
  Future<void> disconnect() async => disconnects++;
  @override
  void dispose() {}
  @override
  void sendPos(double x, double z, double r, bool moving) =>
      positions.add((x, z, r, moving));
  @override
  void requestSit(String seat) => sits.add(seat);
  @override
  void sendStand() => stands++;
  @override
  void sendPraying(bool on, int ms, {bool kneel = false}) {
    prayings.add((on, ms));
    kneels.add(kneel);
  }

  /// `sendPraying` 의 kneel 인자(호출 순서대로).
  final List<bool> kneels = [];
  @override
  void lightCandle(int slot, int intention) => candles.add((slot, intention));
  @override
  void emote(int e) => emotes.add(e);
  int whoRequests = 0;
  @override
  void requestWho() => whoRequests++;

  void goOnline(int n) {
    countN.value = n;
    stateN.value = NetState.online;
  }

  void emit(ChurchEvent e) => ctrl.add(e);
}

class ChurchHarness {
  ChurchHarness(this.settings, this.net, this.scene);
  final AppSettings settings;
  final FakeChurchNet net;
  final FakeChurchSceneController scene;
}

Future<AppSettings> loadSettings({bool avatarChosen = true}) async {
  SharedPreferences.setMockInitialValues({});
  final s = await AppSettings.load();
  s.churchAvatarChosen = avatarChosen;
  return s;
}

void setView(WidgetTester tester, Size size) {
  tester.view.physicalSize = size;
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
}

Widget wrapApp(Widget child, {double textScale = 1.0}) => MaterialApp(
  // InkSparkle 셰이더 로딩이 테스트에서 가끔 실패하므로 리플을 쓴다.
  theme: ThemeData(splashFactory: InkRipple.splashFactory),
  builder: (context, c) => MediaQuery(
    data: MediaQuery.of(context)
        .copyWith(textScaler: TextScaler.linear(textScale)),
    child: c!,
  ),
  home: child,
);

/// ChurchScreen을 띄우고 장면 `ready`까지 진행한다.
Future<ChurchHarness> pumpChurch(
  WidgetTester tester, {
  Size size = const Size(400, 800),
  double textScale = 1.0,
  Widget Function(BuildContext, dynamic, dynamic)? prayerScreenBuilder,
}) async {
  setView(tester, size);
  final settings = await loadSettings();
  final net = FakeChurchNet();
  final scene = FakeChurchSceneController();
  await tester.pumpWidget(
    wrapApp(
      ChurchScreen(
        settings: settings,
        net: net,
        scene: scene,
        prayerScreenBuilder: prayerScreenBuilder == null
            ? null
            : (c, m, s) => prayerScreenBuilder(c, m, s),
      ),
      textScale: textScale,
    ),
  );
  await tester.pump();
  scene.emit(const SceneReady());
  await tester.pump();
  return ChurchHarness(settings, net, scene);
}
