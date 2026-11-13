import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

import '../avatar/avatar_config.dart';
import '../church_catalog.dart';
import '../church_constants.dart';
import 'church_net.dart';
import 'church_protocol.dart';
import 'client_id.dart';

typedef ChurchChannelFactory = WebSocketChannel Function(Uri uri);

/// `serverUrl`(끝이 `/ws`이든 아니든)에서 접속 주소를 만든다:
/// `<scheme>://host/ws?room=<churchId>-N&v=1`. http(s)는 ws(s)로 바꾼다.
Uri buildChurchUri(String serverUrl, String room) {
  var base = Uri.parse(serverUrl.trim());
  var scheme = base.scheme;
  if (scheme == 'http') scheme = 'ws';
  if (scheme == 'https') scheme = 'wss';
  var path = base.path;
  while (path.endsWith('/')) {
    path = path.substring(0, path.length - 1);
  }
  if (!path.endsWith('/ws')) path = '$path/ws';
  final query = <String, String>{
    for (final e in base.queryParameters.entries)
      if (e.key != 'room' && e.key != 'v') e.key: e.value,
  };
  // room, v 순서를 고정한다.
  final params = <String, String>{
    'room': room,
    'v': '${ChurchConfig.protocolVersion}',
    ...query,
  };
  base = base.replace(scheme: scheme, path: path, queryParameters: params);
  return base;
}

/// 재연결 대기: 1, 2, 4, 8, 16초, 이후 30초 상한. [attempt]는 0부터.
Duration defaultChurchBackoff(int attempt) {
  final secs = attempt >= 5 ? 30 : (1 << attempt);
  return Duration(seconds: secs > 30 ? 30 : secs);
}

/// WebSocket으로 사이버 성당 서버에 접속하는 [ChurchNet].
class WebSocketChurchNet implements ChurchNet {
  WebSocketChurchNet({
    required this.serverUrl,
    required this.avatarProvider,
    Future<String> Function()? clientIdProvider,
    ChurchChannelFactory? channelFactory,
    DateTime Function()? clock,
    this.pingInterval = const Duration(seconds: 25),
    this.posMinInterval = const Duration(milliseconds: 200),
    this.backoff = defaultChurchBackoff,
  }) : _clientIdProvider = clientIdProvider ?? loadChurchClientId,
       _channelFactory = channelFactory ?? WebSocketChannel.connect,
       _clock = clock ?? DateTime.now;

  final String serverUrl;

  /// 접속(재접속)할 때마다 호출해 `hello`에 실을 아바타를 얻는다.
  final AvatarConfig Function() avatarProvider;
  final Duration pingInterval;
  final Duration posMinInterval;
  final Duration Function(int attempt) backoff;

  final Future<String> Function() _clientIdProvider;
  final ChurchChannelFactory _channelFactory;
  final DateTime Function() _clock;

  final ValueNotifier<NetState> _state = ValueNotifier(NetState.offline);
  final ValueNotifier<int> _count = ValueNotifier(0);
  final StreamController<ChurchEvent> _events =
      StreamController<ChurchEvent>.broadcast();

  WebSocketChannel? _channel;
  StreamSubscription<dynamic>? _sub;
  Timer? _pingTimer;
  Timer? _retryTimer;
  bool _wanted = false;
  bool _disposed = false;
  bool _open = false; // hello까지 보낸 상태
  int _attempt = 0;
  int _generation = 0; // 채널 교체 시 이전 채널의 콜백을 무시하기 위함
  String _churchId = ChurchCatalog.defaultId;
  String _room = ChurchConfig.roomName(ChurchCatalog.defaultId, 1);
  Completer<void>? _connecting;

  DateTime? _lastPosAt;
  bool _wasMoving = false;
  double _lastX = double.nan;
  double _lastZ = double.nan;
  double _lastR = double.nan;

  /// 접속 중(또는 접속하려는) 성당 id.
  String get churchId => _churchId;

  /// 지금 접속해 있는(또는 접속하려는) 방.
  String get room => _room;

  /// 연속 실패 횟수(다음 대기 시간 계산용, welcome을 받으면 0).
  @visibleForTesting
  int get attempt => _attempt;

  @override
  ValueListenable<NetState> get state => _state;

  @override
  ValueListenable<int> get count => _count;

  @override
  Stream<ChurchEvent> get events => _events.stream;

  @override
  Future<void> connect({required String churchId}) {
    if (_disposed) return Future.value();
    final changed = churchId != _churchId;
    if (changed) {
      // 다른 성당으로 옮긴다: 기존 연결을 끊고 새 성당의 1번 방으로.
      _retryTimer?.cancel();
      _retryTimer = null;
      _teardownChannel();
      _count.value = 0;
      _attempt = 0;
      _churchId = churchId;
      _room = ChurchConfig.roomName(churchId, 1);
      _wanted = true;
      return _openChannel();
    }
    _wanted = true;
    if (_channel != null || _retryTimer != null) {
      return _connecting?.future ?? Future.value();
    }
    return _openChannel();
  }

  Future<void> _openChannel() {
    final done = Completer<void>();
    _connecting = done;
    _retryTimer?.cancel();
    _retryTimer = null;
    _setState(NetState.connecting);
    final gen = ++_generation;
    unawaited(_start(gen, done));
    return done.future;
  }

  Future<void> _start(int gen, Completer<void> done) async {
    try {
      final id = await _clientIdProvider();
      if (gen != _generation || !_wanted || _disposed) return;
      final uri = buildChurchUri(serverUrl, _room);
      final channel = _channelFactory(uri);
      _channel = channel;
      _sub = channel.stream.listen(
        (data) => _onData(gen, data),
        onError: (Object e, StackTrace s) => _onClosed(gen),
        onDone: () => _onClosed(gen),
        cancelOnError: false,
      );
      await channel.ready;
      if (gen != _generation || !_wanted || _disposed) return;
      _open = true;
      _raw(helloMessage(id, avatarProvider()));
      _pingTimer?.cancel();
      _pingTimer = Timer.periodic(pingInterval, (_) {
        if (_open) _raw(pingMessage());
      });
    } catch (_) {
      if (gen == _generation) _onClosed(gen);
    } finally {
      if (!done.isCompleted) done.complete();
    }
  }

  void _onData(int gen, Object? data) {
    if (gen != _generation || _disposed) return;
    try {
      if (data is! String) return;
      final json = decodeServerMessage(data);
      if (json == null) return;
      final t = json['t'];
      if (t == 'pong') return;
      if (t == 'error') {
        // 프로토콜 버전이 맞지 않으면 다시 시도해도 소용없다.
        if (json['code'] == 'version') {
          unawaited(disconnect());
        }
        return;
      }
      final event = parseChurchEvent(json);
      if (event == null) return;
      switch (event) {
        case Welcome():
          _attempt = 0;
          if (ChurchConfig.parseRoomName(event.room) != null) {
            _room = event.room;
          }
          _count.value = event.n;
          _setState(NetState.online);
        case Join():
          _count.value = event.n;
        case Leave():
          _count.value = event.n;
        case Snap():
          _count.value = event.n;
        case Who():
          _count.value = event.n;
        case Full():
          _events.add(event);
          _switchRoom(event.next);
          return;
        case Seated() ||
            Stood() ||
            SeatDenied() ||
            Praying() ||
            Candle() ||
            Emote():
          break;
      }
      _events.add(event);
    } catch (_) {
      // 잘못된 메시지는 무시한다.
    }
  }

  /// 방이 가득 차서 다음 방으로 즉시 재접속한다(대기 없음). 성당은 그대로다.
  void _switchRoom(String next) {
    if (!_wanted || _disposed) return;
    final parsed = ChurchConfig.parseRoomName(next);
    if (parsed == null || parsed.churchId != _churchId) return;
    _teardownChannel();
    _room = next;
    _count.value = 0;
    unawaited(_openChannel());
  }

  void _onClosed(int gen) {
    if (gen != _generation || _disposed) return;
    _teardownChannel();
    _count.value = 0;
    _setState(NetState.offline);
    if (!_wanted) return;
    // 연결이 끊기면 같은 성당의 1번 방부터 다시 시도한다.
    _room = ChurchConfig.roomName(_churchId, 1);
    final delay = backoff(_attempt);
    _attempt++;
    _retryTimer?.cancel();
    _retryTimer = Timer(delay, () {
      _retryTimer = null;
      if (_wanted && !_disposed) unawaited(_openChannel());
    });
  }

  void _teardownChannel() {
    _generation++;
    _open = false;
    _pingTimer?.cancel();
    _pingTimer = null;
    final sub = _sub;
    final channel = _channel;
    _sub = null;
    _channel = null;
    _wasMoving = false;
    _lastPosAt = null;
    _lastX = _lastZ = _lastR = double.nan;
    if (sub != null) unawaited(sub.cancel().catchError((Object _) {}));
    if (channel != null) {
      try {
        unawaited(channel.sink.close(1000).catchError((Object _) {}));
      } catch (_) {}
    }
  }

  void _setState(NetState s) {
    if (_disposed) return;
    _state.value = s;
  }

  void _raw(String message) {
    final channel = _channel;
    if (channel == null || !_open) return;
    try {
      channel.sink.add(message);
    } catch (_) {}
  }

  @override
  Future<void> disconnect() async {
    _wanted = false;
    _retryTimer?.cancel();
    _retryTimer = null;
    _attempt = 0;
    _room = ChurchConfig.roomName(_churchId, 1);
    _teardownChannel();
    if (_disposed) return;
    _count.value = 0;
    _setState(NetState.offline);
    final c = _connecting;
    if (c != null && !c.isCompleted) c.complete();
  }

  @override
  void dispose() {
    if (_disposed) return;
    unawaited(disconnect());
    _disposed = true;
    _events.close();
    _state.dispose();
    _count.dispose();
  }

  @override
  void sendPos(double x, double z, double r, bool moving) {
    if (!_open) return;
    if (moving) {
      final now = _clock();
      final last = _lastPosAt;
      if (last != null && now.difference(last) < posMinInterval) return;
      _lastPosAt = now;
      _wasMoving = true;
      _lastX = x;
      _lastZ = z;
      _lastR = r;
      _raw(posMessage(x, z, r, true));
    } else {
      final same = x == _lastX && z == _lastZ && r == _lastR;
      if (!_wasMoving && same) return;
      _wasMoving = false;
      _lastPosAt = null;
      _lastX = x;
      _lastZ = z;
      _lastR = r;
      _raw(posMessage(x, z, r, false));
    }
  }

  @override
  void requestSit(String seat) => _raw(sitMessage(seat));

  @override
  void sendStand() => _raw(standMessage());

  @override
  void sendPraying(bool on, int ms) => _raw(prayMessage(on, ms));

  @override
  void lightCandle(int slot, int intention) =>
      _raw(candleMessage(slot, intention));

  @override
  void emote(int e) => _raw(emoteMessage(e));

  @override
  void requestWho() => _raw(whoMessage());
}
