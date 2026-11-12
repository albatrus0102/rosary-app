// ignore_for_file: depend_on_referenced_packages
import 'dart:async';
import 'dart:convert';

import 'package:fake_async/fake_async.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/church/avatar/avatar_config.dart';
import 'package:rosary_app/church/net/church_net.dart';
import 'package:rosary_app/church/net/solo_church_net.dart';
import 'package:rosary_app/church/net/web_socket_church_net.dart';
import 'package:stream_channel/stream_channel.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

class _FakeSink implements WebSocketSink {
  _FakeSink(this._inner, this._onClose);

  final StreamSink<dynamic> _inner;
  final void Function(int? code) _onClose;

  @override
  void add(dynamic data) => _inner.add(data);

  @override
  void addError(Object error, [StackTrace? stackTrace]) =>
      _inner.addError(error, stackTrace);

  @override
  Future<dynamic> addStream(Stream<dynamic> stream) => _inner.addStream(stream);

  @override
  Future<dynamic> close([int? closeCode, String? closeReason]) {
    _onClose(closeCode);
    return _inner.close();
  }

  @override
  Future<dynamic> get done => _inner.done;
}

/// 테스트에서 서버 역할을 하는 가짜 채널.
class _FakeWsChannel extends StreamChannelMixin<dynamic>
    implements WebSocketChannel {
  _FakeWsChannel(this.uri, {Object? readyError}) {
    sink0 = _FakeSink(_ctl.local.sink, (code) => closeCodeSent = code);
    if (readyError == null) {
      _ready.complete();
    } else {
      _ready.completeError(readyError);
    }
    _ready.future.catchError((Object _) {});
    _ctl.foreign.stream.listen((m) {
      if (m is String) {
        sent.add(jsonDecode(m) as Map<String, dynamic>);
      }
    });
  }

  final Uri uri;
  final _ctl = StreamChannelController<dynamic>();
  final _ready = Completer<void>();
  late final _FakeSink sink0;
  final List<Map<String, dynamic>> sent = [];
  int? closeCodeSent;

  void serverSend(Object? data) =>
      _ctl.foreign.sink.add(data is Map ? jsonEncode(data) : data);

  void serverClose() => _ctl.foreign.sink.close();

  List<Map<String, dynamic>> sentOf(String t) =>
      sent.where((m) => m['t'] == t).toList();

  @override
  String? get protocol => null;
  @override
  int? get closeCode => null;
  @override
  String? get closeReason => null;
  @override
  Future<void> get ready => _ready.future;
  @override
  Stream<dynamic> get stream => _ctl.local.stream;
  @override
  WebSocketSink get sink => sink0;
}

class _Harness {
  _Harness(this.async, {this.failFirst = 0}) {
    net = WebSocketChurchNet(
      serverUrl: 'wss://church.example/ws',
      avatarProvider: () =>
          const AvatarConfig(skin: 1, style: 0, hair: 3, outfit: 5, name: 7),
      clientIdProvider: () async => 'test-client-id',
      channelFactory: (uri) {
        final fail = channels.length < failFirst;
        final ch = _FakeWsChannel(
          uri,
          readyError: fail ? StateError('refused') : null,
        );
        channels.add(ch);
        return ch;
      },
      clock: () => now,
    );
    net.events.listen(events.add);
  }

  final FakeAsync async;
  final int failFirst;
  late final WebSocketChurchNet net;
  final List<_FakeWsChannel> channels = [];
  final List<ChurchEvent> events = [];
  DateTime now = DateTime.utc(2026, 1, 1);

  _FakeWsChannel get ch => channels.last;

  void flush() => async.flushMicrotasks();

  void connect({String churchId = 'basic'}) {
    net.connect(churchId: churchId);
    flush();
  }

  void welcome({String room = 'basic-1', int n = 3}) {
    ch.serverSend({
      't': 'welcome',
      'you': 'test-client-id',
      'room': room,
      'n': n,
      'peers': <Object>[],
      'seats': <String, String>{},
      'candles': <Object>[],
      'now': 1,
    });
    flush();
  }
}

void _fake(String name, void Function(_Harness h) body, {int failFirst = 0}) {
  test(name, () {
    fakeAsync((async) {
      final h = _Harness(async, failFirst: failFirst);
      body(h);
      h.net.dispose();
      async.flushMicrotasks();
    });
  });
}

void main() {
  group('SoloChurchNet', () {
    test('is always offline and ignores everything', () async {
      final net = SoloChurchNet();
      expect(net.state.value, NetState.offline);
      expect(net.count.value, 0);
      final events = <ChurchEvent>[];
      net.events.listen(events.add);
      await net.connect(churchId: 'stpeter');
      net.sendPos(1, 2, 3, true);
      net.requestSit('L00-0');
      net.sendStand();
      net.sendPraying(true, 1);
      net.lightCandle(1, 1);
      net.emote(0);
      await net.disconnect();
      expect(net.state.value, NetState.offline);
      expect(net.count.value, 0);
      expect(events, isEmpty);
      net.dispose();
    });
  });

  group('WebSocketChurchNet with a fake channel', () {
    _fake(
      'connects, sends hello with the persisted id, goes online on welcome',
      (h) {
        expect(h.net.state.value, NetState.offline);
        h.connect(churchId: 'stpeter');
        expect(h.net.state.value, NetState.connecting);
        expect(h.channels, hasLength(1));
        expect(
          h.ch.uri.toString(),
          'wss://church.example/ws?room=stpeter-1&v=1',
        );
        expect(h.net.churchId, 'stpeter');
        expect(h.ch.sent, hasLength(1));
        expect(h.ch.sent.first, {
          't': 'hello',
          'id': 'test-client-id',
          'v': 1,
          'avatar': {'skin': 1, 'style': 0, 'hair': 3, 'outfit': 5, 'name': 7},
        });
        h.welcome(room: 'stpeter-1', n: 12);
        expect(h.net.state.value, NetState.online);
        expect(h.net.count.value, 12);
        expect(h.events.single, isA<Welcome>());
        // join / leave / snap update the count.
        h.ch.serverSend({
          't': 'join',
          'peer': {
            'id': 'p',
            'avatar': {
              'skin': 0,
              'style': 0,
              'hair': 0,
              'outfit': 0,
              'name': 0,
            },
          },
          'n': 13,
        });
        h.flush();
        expect(h.net.count.value, 13);
        h.ch.serverSend({'t': 'leave', 'id': 'p', 'n': 12});
        h.flush();
        expect(h.net.count.value, 12);
        h.ch.serverSend({'t': 'snap', 'n': 14, 'p': <Object>[]});
        h.flush();
        expect(h.net.count.value, 14);
        expect(h.events.map((e) => e.runtimeType), [
          Welcome,
          Join,
          Leave,
          Snap,
        ]);
      },
    );

    _fake('commands are encoded per SPEC once connected', (h) {
      h.net.requestSit('L03-2');
      h.connect();
      h.welcome();
      h.net.requestSit('L03-2');
      h.net.sendPraying(true, 2);
      h.net.lightCandle(5, 3);
      h.net.emote(1);
      h.net.sendStand();
      h.flush();
      expect(h.ch.sent.skip(1).toList(), [
        {'t': 'sit', 'seat': 'L03-2'},
        {'t': 'pray', 'on': true, 'ms': 2},
        {'t': 'candle', 'slot': 5, 'intention': 3},
        {'t': 'emote', 'e': 1},
        {'t': 'stand'},
      ]);
    });

    _fake('sendPos is throttled to 5 Hz while moving and sends stop at once', (
      h,
    ) {
      h.connect();
      h.welcome();
      h.net.sendPos(1, 2, 0, true); // t=0 sent
      h.now = h.now.add(const Duration(milliseconds: 100));
      h.net.sendPos(1.1, 2, 0, true); // dropped
      h.now = h.now.add(const Duration(milliseconds: 99));
      h.net.sendPos(1.2, 2, 0, true); // 199ms: dropped
      h.now = h.now.add(const Duration(milliseconds: 1));
      h.net.sendPos(1.3, 2, 0, true); // 200ms: sent
      h.net.sendPos(1.3, 2, 0, false); // stop: immediate
      h.net.sendPos(1.4, 2, 0, true); // right after stop: sent immediately
      h.flush();
      final pos = h.ch.sentOf('pos');
      expect(pos.map((m) => [m['x'], m['m']]).toList(), [
        [1.0, 1],
        [1.3, 1],
        [1.3, 0],
        [1.4, 1],
      ]);
      // Repeated stop with the same position is not re-sent.
      h.net.sendPos(1.4, 2, 0, false);
      h.net.sendPos(1.4, 2, 0, false);
      h.flush();
      expect(h.ch.sentOf('pos'), hasLength(5));
    });

    _fake('sendPos before connecting is a no-op', (h) {
      h.net.sendPos(1, 2, 3, true);
      h.net.sendPos(1, 2, 3, false);
      expect(h.channels, isEmpty);
    });

    _fake('reconnects with 1,2,4,8,16,30,30 second backoff', (h) {
      h.connect();
      expect(h.channels, hasLength(1));
      const delays = [1, 2, 4, 8, 16, 30, 30];
      for (var i = 0; i < delays.length; i++) {
        h.ch.serverClose();
        h.flush();
        expect(h.net.state.value, NetState.offline);
        expect(h.net.count.value, 0);
        final before = h.channels.length;
        h.async.elapse(
          Duration(seconds: delays[i]) - const Duration(milliseconds: 1),
        );
        h.flush();
        expect(h.channels, hasLength(before), reason: 'too early at step $i');
        h.async.elapse(const Duration(milliseconds: 1));
        h.flush();
        expect(h.channels, hasLength(before + 1), reason: 'step $i');
        expect(h.net.state.value, NetState.connecting);
      }
    });

    _fake('backoff resets after a welcome', (h) {
      h.connect();
      h.ch.serverClose();
      h.flush();
      h.async.elapse(const Duration(seconds: 1));
      h.flush();
      h.ch.serverClose();
      h.flush();
      h.async.elapse(const Duration(seconds: 2));
      h.flush();
      expect(h.channels, hasLength(3));
      h.welcome();
      expect(h.net.attempt, 0);
      h.ch.serverClose();
      h.flush();
      h.async.elapse(const Duration(seconds: 1));
      h.flush();
      expect(h.channels, hasLength(4));
      // The new socket re-sends hello.
      expect(h.ch.sentOf('hello'), hasLength(1));
    });

    _fake('a failing connect also retries with backoff', (h) {
      h.connect();
      expect(h.channels, hasLength(1));
      expect(h.net.state.value, NetState.offline);
      h.async.elapse(const Duration(seconds: 1));
      h.flush();
      expect(h.channels, hasLength(2));
      h.async.elapse(const Duration(seconds: 2));
      h.flush();
      expect(h.channels, hasLength(3));
      expect(h.ch.sent, hasLength(1)); // third attempt succeeds and says hello
    }, failFirst: 2);

    _fake('disconnect stops retries and closes the socket', (h) {
      h.connect();
      h.welcome();
      final first = h.ch;
      h.net.disconnect();
      h.flush();
      expect(first.closeCodeSent, 1000);
      expect(h.net.state.value, NetState.offline);
      expect(h.net.count.value, 0);
      h.async.elapse(const Duration(minutes: 5));
      h.flush();
      expect(h.channels, hasLength(1));
      // Can connect again afterwards.
      h.connect();
      expect(h.channels, hasLength(2));
    });

    _fake('disconnect while waiting to retry cancels the retry', (h) {
      h.connect();
      h.ch.serverClose();
      h.flush();
      h.net.disconnect();
      h.async.elapse(const Duration(minutes: 1));
      h.flush();
      expect(h.channels, hasLength(1));
    });

    _fake('full reconnects to next room immediately, same church', (h) {
      h.connect(churchId: 'stpeter');
      h.ch.serverSend({'t': 'full', 'next': 'stpeter-2'});
      h.flush();
      expect(h.channels, hasLength(2));
      expect(h.channels[0].closeCodeSent, 1000);
      expect(h.ch.uri.queryParameters['room'], 'stpeter-2');
      expect(h.ch.sentOf('hello'), hasLength(1));
      expect(h.events.whereType<Full>().single.next, 'stpeter-2');
      expect(h.net.room, 'stpeter-2');
      h.welcome(room: 'stpeter-2');
      expect(h.net.state.value, NetState.online);
      // A drop afterwards returns to room 1.
      h.ch.serverClose();
      h.flush();
      h.async.elapse(const Duration(seconds: 1));
      h.flush();
      expect(h.ch.uri.queryParameters['room'], 'stpeter-1');
    });

    _fake('full naming another church or garbage is ignored', (h) {
      h.connect(churchId: 'stpeter');
      h.ch.serverSend({'t': 'full', 'next': 'milan-2'});
      h.ch.serverSend({'t': 'full', 'next': 'bad'});
      h.flush();
      expect(h.channels, hasLength(1));
    });

    _fake('connecting to another church switches rooms', (h) {
      h.connect(churchId: 'basic');
      h.welcome();
      final first = h.ch;
      h.connect(churchId: 'milan');
      expect(first.closeCodeSent, 1000);
      expect(h.channels, hasLength(2));
      expect(h.ch.uri.queryParameters['room'], 'milan-1');
      // Same church again while connecting is a no-op.
      h.connect(churchId: 'milan');
      expect(h.channels, hasLength(2));
    });

    _fake('pings every 25 seconds', (h) {
      h.connect();
      h.welcome();
      expect(h.ch.sentOf('ping'), isEmpty);
      h.async.elapse(const Duration(seconds: 24));
      expect(h.ch.sentOf('ping'), isEmpty);
      h.async.elapse(const Duration(seconds: 1));
      expect(h.ch.sentOf('ping'), hasLength(1));
      h.async.elapse(const Duration(seconds: 50));
      expect(h.ch.sentOf('ping'), hasLength(3));
      h.net.disconnect();
      h.flush();
      h.async.elapse(const Duration(minutes: 2));
      expect(h.ch.sentOf('ping'), hasLength(3));
    });

    _fake('ignores malformed input and keeps working', (h) {
      h.connect();
      h.welcome();
      for (final bad in <Object?>[
        'not json',
        '[1,2,3]',
        '"str"',
        '{"t":"snap"}',
        '{"t":"welcome"}',
        '{"t":"mystery","x":1}',
        '{"t":"pong"}',
        '{"t":"error","code":"rate"}',
        '{"t":"candle","slot":null}',
        <int>[1, 2, 3],
        '',
      ]) {
        h.ch.serverSend(bad);
      }
      h.ch.serverSend({'t': 'stood', 'id': 'someone'});
      h.flush();
      expect(h.events.map((e) => e.runtimeType), [Welcome, Stood]);
      expect(h.net.state.value, NetState.online);
    });

    _fake('an error "version" stops reconnecting', (h) {
      h.connect();
      h.ch.serverSend({'t': 'error', 'code': 'version'});
      h.flush();
      h.async.elapse(const Duration(minutes: 5));
      h.flush();
      expect(h.channels, hasLength(1));
      expect(h.net.state.value, NetState.offline);
    });

    _fake('dispose is safe and silent afterwards', (h) {
      h.connect();
      h.welcome();
      h.net.dispose();
      h.net.dispose();
      h.async.elapse(const Duration(minutes: 1));
      h.flush();
      h.net.sendPos(1, 1, 1, true);
    });
  });
}
