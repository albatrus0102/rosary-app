import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/app/settings.dart';
import 'package:rosary_app/church/avatar/avatar_config.dart';
import 'package:rosary_app/church/net/church_net.dart';
import 'package:rosary_app/church/net/church_net_factory.dart';
import 'package:rosary_app/church/net/client_id.dart';
import 'package:rosary_app/church/net/solo_church_net.dart';
import 'package:rosary_app/church/net/web_socket_church_net.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// SPEC 2절을 따르는 아주 작은 로컬 서버.
class _LocalServer {
  late final HttpServer http;
  final List<Uri> requests = [];
  final List<Map<String, dynamic>> received = [];
  final List<WebSocket> sockets = [];

  Future<void> start() async {
    http = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
    http.listen((req) async {
      requests.add(req.uri);
      final ws = await WebSocketTransformer.upgrade(req);
      sockets.add(ws);
      ws.listen((data) {
        final msg = jsonDecode(data as String) as Map<String, dynamic>;
        received.add(msg);
        switch (msg['t']) {
          case 'hello':
            ws.add(
              jsonEncode({
                't': 'welcome',
                'you': msg['id'],
                'room': req.uri.queryParameters['room'],
                'n': 2,
                'peers': [
                  {
                    'id': 'other',
                    'avatar': {
                      'skin': 2,
                      'style': 1,
                      'hair': 4,
                      'outfit': 6,
                      'name': 10,
                      'g': 0,
                      'nv': 2,
                    },
                    'x': 1.5,
                    'z': 12,
                    'r': 0,
                    'st': 'w',
                    'seat': null,
                    'ms': -1,
                  },
                ],
                'seats': <String, String>{},
                'candles': [
                  {'slot': 1, 'until': 1760001800000, 'intention': 2},
                ],
                'now': 1760000000000,
              }),
            );
            ws.add(
              jsonEncode({
                't': 'join',
                'peer': {
                  'id': 'third',
                  'avatar': {
                    'skin': 0,
                    'style': 0,
                    'hair': 0,
                    'outfit': 0,
                    'name': 0,
                  },
                },
                'n': 3,
              }),
            );
          case 'pos':
            ws.add(
              jsonEncode({
                't': 'snap',
                'n': 3,
                'p': [
                  ['other', msg['x'], msg['z'], msg['r'], 'w'],
                ],
              }),
            );
          case 'sit':
            ws.add(
              jsonEncode({'t': 'seated', 'id': 'me', 'seat': msg['seat']}),
            );
          case 'ping':
            ws.add(jsonEncode({'t': 'pong'}));
        }
      });
    });
  }

  String get url => 'ws://127.0.0.1:${http.port}/ws';

  Future<void> stop() async {
    for (final s in sockets) {
      await s.close();
    }
    await http.close(force: true);
  }
}

void main() {
  test('end to end against a local protocol server', () async {
    final server = _LocalServer();
    await server.start();
    addTearDown(server.stop);

    final net = WebSocketChurchNet(
      serverUrl: server.url,
      avatarProvider: () =>
          const AvatarConfig(skin: 1, style: 0, hair: 3, outfit: 5, name: 7),
      clientIdProvider: () async => 'me',
    );
    addTearDown(net.dispose);
    final events = <ChurchEvent>[];
    net.events.listen(events.add);

    Future<void> waitFor(bool Function() ok) async {
      for (var i = 0; i < 200 && !ok(); i++) {
        await Future<void>.delayed(const Duration(milliseconds: 10));
      }
      expect(ok(), isTrue);
    }

    await net.connect(churchId: 'stpeter');
    await waitFor(() => net.state.value == NetState.online);
    expect(server.requests.single.path, '/ws');
    expect(server.requests.single.queryParameters, {
      'room': 'stpeter-1',
      'v': '1',
    });
    expect(server.received.first, {
      't': 'hello',
      'id': 'me',
      'v': 1,
      'avatar': {
        'skin': 1,
        'style': 0,
        'hair': 3,
        'outfit': 5,
        'name': 7,
        'g': 0,
        'nv': 2,
      },
    });

    await waitFor(() => events.length >= 2);
    final welcome = events[0] as Welcome;
    expect(welcome.room, 'stpeter-1');
    expect(welcome.peers.single.id, 'other');
    expect(welcome.peers.single.avatar.name, 10);
    expect(welcome.candles.single.slot, 1);
    final join = events[1] as Join;
    expect(join.peer.id, 'third');
    await waitFor(() => net.count.value == 3);

    net.sendPos(1.25, 8.5, 0.3, true);
    await waitFor(() => events.whereType<Snap>().isNotEmpty);
    final snap = events.whereType<Snap>().single;
    expect(snap.list.single.id, 'other');
    expect(snap.list.single.x, 1.25);
    expect(snap.list.single.z, 8.5);

    net.requestSit('L03-2');
    await waitFor(() => events.whereType<Seated>().isNotEmpty);
    expect(events.whereType<Seated>().single.seat, 'L03-2');

    await net.disconnect();
    expect(net.state.value, NetState.offline);
    expect(net.count.value, 0);
  });

  test('reconnects after the server drops the socket', () async {
    final server = _LocalServer();
    await server.start();
    addTearDown(server.stop);
    final net = WebSocketChurchNet(
      serverUrl: server.url,
      avatarProvider: () => AvatarConfig.defaultConfig,
      clientIdProvider: () async => 'me',
      backoff: (_) => const Duration(milliseconds: 50),
    );
    addTearDown(net.dispose);
    await net.connect(churchId: 'basic');
    for (var i = 0; i < 200 && net.state.value != NetState.online; i++) {
      await Future<void>.delayed(const Duration(milliseconds: 10));
    }
    expect(net.state.value, NetState.online);
    await server.sockets.first.close();
    for (var i = 0; i < 300 && server.requests.length < 2; i++) {
      await Future<void>.delayed(const Duration(milliseconds: 10));
    }
    expect(server.requests, hasLength(2));
    for (var i = 0; i < 200 && net.state.value != NetState.online; i++) {
      await Future<void>.delayed(const Duration(milliseconds: 10));
    }
    expect(net.state.value, NetState.online);
  });

  test('unreachable server keeps state offline without throwing', () async {
    final probe = await ServerSocket.bind(InternetAddress.loopbackIPv4, 0);
    final port = probe.port;
    await probe.close();
    final net = WebSocketChurchNet(
      serverUrl: 'ws://127.0.0.1:$port',
      avatarProvider: () => AvatarConfig.defaultConfig,
      clientIdProvider: () async => 'me',
      backoff: (_) => const Duration(seconds: 30),
    );
    await net.connect(churchId: 'basic');
    expect(net.state.value, NetState.offline);
    net.sendPos(1, 1, 1, true);
    net.dispose();
  });

  group('factory and client id', () {
    test(
      'createChurchNet picks solo for an empty url, websocket otherwise',
      () async {
        SharedPreferences.setMockInitialValues({});
        final settings = await AppSettings.load();
        expect(createChurchNet(settings), isA<SoloChurchNet>());
        expect(createChurchNet(settings, serverUrl: ''), isA<SoloChurchNet>());
        final ws = createChurchNet(settings, serverUrl: 'wss://x.example/ws');
        expect(ws, isA<WebSocketChurchNet>());
        ws.dispose();
      },
    );

    test('client id is generated once and persisted', () async {
      SharedPreferences.setMockInitialValues({});
      final a = await loadChurchClientId();
      final b = await loadChurchClientId();
      expect(isUuidV4(a), isTrue);
      expect(b, a);
      final prefs = await SharedPreferences.getInstance();
      expect(prefs.getString('church_client_id'), a);
      SharedPreferences.setMockInitialValues({'church_client_id': 'garbage'});
      final c = await loadChurchClientId();
      expect(isUuidV4(c), isTrue);
    });
  });
}
