import 'dart:convert';

import '../avatar/avatar_config.dart';
import '../church_constants.dart';
import 'church_net.dart';

/// 서버 → 클라이언트 JSON 메시지를 [ChurchEvent]로 해석한다.
///
/// [raw]는 JSON 문자열이거나 이미 디코딩된 `Map`. `pong`·`error`·알 수 없는
/// 종류·형식이 틀린 메시지는 null을 돌려준다(예외를 던지지 않는다).
ChurchEvent? parseChurchEvent(Object? raw) {
  try {
    final json = decodeServerMessage(raw);
    if (json == null) return null;
    return _parse(json);
  } catch (_) {
    return null;
  }
}

/// JSON 문자열(또는 Map)을 Map으로. 형식이 틀리면 null.
Map<String, dynamic>? decodeServerMessage(Object? raw) {
  try {
    Object? decoded = raw;
    if (raw is String) decoded = jsonDecode(raw);
    if (decoded is Map<String, dynamic>) return decoded;
    if (decoded is Map) return decoded.cast<String, dynamic>();
  } catch (_) {}
  return null;
}

/// `PeerInfo` JSON 해석. 필수 값이 없으면 null.
PeerInfo? parsePeer(Object? v) {
  if (v is! Map) return null;
  final id = v['id'];
  if (id is! String || id.isEmpty) return null;
  final avatar = v['avatar'];
  final seat = v['seat'];
  final st = v['st'];
  return PeerInfo(
    id: id,
    avatar: avatar is Map
        ? AvatarConfig.fromJson(avatar.cast<String, dynamic>())
        : AvatarConfig.defaultConfig,
    x: _num(v['x']) ?? 0,
    z: _num(v['z']) ?? 0,
    r: _num(v['r']) ?? 0,
    st: st is String && st.isNotEmpty ? st : 'w',
    seat: seat is String && seat.isNotEmpty ? seat : null,
    ms: _int(v['ms']) ?? -1,
  );
}

double? _num(Object? v) => v is num && v.isFinite ? v.toDouble() : null;
int? _int(Object? v) => v is num && v.isFinite ? v.toInt() : null;

CandleInfo? _candle(Object? v) {
  if (v is! Map) return null;
  final slot = _int(v['slot']);
  final until = _int(v['until']);
  final intention = _int(v['intention']);
  if (slot == null || until == null || intention == null) return null;
  return CandleInfo(slot: slot, until: until, intention: intention);
}

ChurchEvent? _parse(Map<String, dynamic> m) {
  switch (m['t']) {
    case 'welcome':
      final you = m['you'];
      final room = m['room'];
      final n = _int(m['n']);
      if (you is! String || room is! String || n == null) return null;
      final peers = <PeerInfo>[];
      final rawPeers = m['peers'];
      if (rawPeers is List) {
        for (final p in rawPeers) {
          final peer = parsePeer(p);
          if (peer != null) peers.add(peer);
        }
      }
      final seats = <String, String>{};
      final rawSeats = m['seats'];
      if (rawSeats is Map) {
        rawSeats.forEach((k, v) {
          if (k is String && v is String) seats[k] = v;
        });
      }
      final candles = <CandleInfo>[];
      final rawCandles = m['candles'];
      if (rawCandles is List) {
        for (final c in rawCandles) {
          final candle = _candle(c);
          if (candle != null) candles.add(candle);
        }
      }
      return Welcome(
        you: you,
        room: room,
        n: n,
        peers: peers,
        seats: seats,
        candles: candles,
        now: _int(m['now']) ?? DateTime.now().millisecondsSinceEpoch,
      );
    case 'join':
      final peer = parsePeer(m['peer']);
      final n = _int(m['n']);
      if (peer == null || n == null) return null;
      return Join(peer, n);
    case 'leave':
      final id = m['id'];
      final n = _int(m['n']);
      if (id is! String || n == null) return null;
      return Leave(id, n, aoi: m['aoi'] == true);
    case 'snap':
      final n = _int(m['n']);
      final p = m['p'];
      if (n == null || p is! List) return null;
      final list = <SnapEntry>[];
      for (final e in p) {
        if (e is! List || e.length < 5) continue;
        final id = e[0];
        final x = _num(e[1]);
        final z = _num(e[2]);
        final r = _num(e[3]);
        final st = e[4];
        if (id is! String || x == null || z == null || r == null) continue;
        list.add(SnapEntry(id, x, z, r, st is String ? st : 'w'));
      }
      return Snap(n, list);
    case 'seated':
      final id = m['id'];
      final seat = m['seat'];
      if (id is! String || seat is! String) return null;
      return Seated(id, seat);
    case 'stood':
      final id = m['id'];
      if (id is! String) return null;
      return Stood(id);
    case 'seat_denied':
      final seat = m['seat'];
      final reason = m['reason'];
      if (seat is! String) return null;
      return SeatDenied(seat, reason is String ? reason : 'invalid');
    case 'praying':
      final id = m['id'];
      final on = m['on'];
      if (id is! String || on is! bool) return null;
      return Praying(id, on, _int(m['ms']) ?? -1);
    case 'candle':
      final c = _candle(m);
      if (c == null) return null;
      return Candle(c.slot, c.until, c.intention);
    case 'emote':
      final id = m['id'];
      final e = _int(m['e']);
      if (id is! String || e == null) return null;
      return Emote(id, e);
    case 'who':
      final n = _int(m['n']);
      final raw = m['list'];
      if (n == null || raw is! List) return null;
      final list = <RosterEntry>[];
      for (final e in raw) {
        if (e is! Map) continue;
        final st = e['st'];
        list.add(
          RosterEntry(
            // 이름 형식(`nv`/`g`) 해석은 아바타와 같은 규칙을 쓴다.
            AvatarConfig.fromJson(e.cast<String, dynamic>()).nameText,
            st == 's' || st == 'p' ? st as String : 'w',
          ),
        );
      }
      return Who(
        n: n,
        room: _int(m['room']) ?? list.length + 1,
        list: list,
        more: m['more'] == true,
      );
    case 'full':
      final next = m['next'];
      if (next is! String || ChurchConfig.parseRoomName(next) == null) {
        return null;
      }
      return Full(next);
  }
  return null;
}

// ---------------------------------------------------------------------------
// 클라이언트 → 서버 메시지

double _round(double v, int places) {
  var f = 1.0;
  for (var i = 0; i < places; i++) {
    f *= 10;
  }
  return (v * f).round() / f;
}

String helloMessage(String id, AvatarConfig avatar) => jsonEncode({
  't': 'hello',
  'id': id,
  'v': ChurchConfig.protocolVersion,
  'avatar': avatar.toJson(),
});

String posMessage(double x, double z, double r, bool moving) => jsonEncode({
  't': 'pos',
  'x': _round(x, 2),
  'z': _round(z, 2),
  'r': _round(r, 3),
  'm': moving ? 1 : 0,
});

String sitMessage(String seat) => jsonEncode({'t': 'sit', 'seat': seat});

String standMessage() => jsonEncode({'t': 'stand'});

String prayMessage(bool on, int ms) =>
    jsonEncode({'t': 'pray', 'on': on, 'ms': ms});

String candleMessage(int slot, int intention) =>
    jsonEncode({'t': 'candle', 'slot': slot, 'intention': intention});

String emoteMessage(int e) => jsonEncode({'t': 'emote', 'e': e});

String whoMessage() => jsonEncode({'t': 'who'});

String pingMessage() => jsonEncode({'t': 'ping'});
