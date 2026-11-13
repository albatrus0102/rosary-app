import 'package:flutter/foundation.dart';

import '../avatar/avatar_config.dart';

/// 연결 상태.
enum NetState { offline, connecting, online }

/// 같은 성당에 있는 다른 사용자(피어).
@immutable
class PeerInfo {
  const PeerInfo({
    required this.id,
    required this.avatar,
    this.x = 0,
    this.z = 0,
    this.r = 0,
    this.st = 'w',
    this.seat,
    this.ms = -1,
    this.kneel = false,
  });

  final String id;
  final AvatarConfig avatar;
  final double x;
  final double z;

  /// yaw 라디안.
  final double r;

  /// 'w' 서 있음/걷기, 's' 앉음, 'p' 앉아서 기도 중.
  final String st;
  final String? seat;

  /// 기도 중인 신비 종류 0..3, 기도 중이 아니면 -1.
  final int ms;

  /// 무릎 꿇고 기도 중(서버 `k:1`).
  final bool kneel;

  /// 웹 브리지(`setPeers`/`peerJoin`)로 넘기는 JSON.
  Map<String, dynamic> toJson() => {
    'id': id,
    'avatar': avatar.toJson(),
    'x': x,
    'z': z,
    'r': r,
    'st': st,
    'seat': seat,
    'ms': ms,
    if (kneel) 'k': 1,
  };

  @override
  bool operator ==(Object other) =>
      other is PeerInfo &&
      other.id == id &&
      other.avatar == avatar &&
      other.x == x &&
      other.z == z &&
      other.r == r &&
      other.st == st &&
      other.seat == seat &&
      other.ms == ms &&
      other.kneel == kneel;

  @override
  int get hashCode => Object.hash(id, avatar, x, z, r, st, seat, ms, kneel);

  @override
  String toString() => 'PeerInfo($id, $st, seat: $seat, ms: $ms)';
}

/// 켜져 있는 봉헌 초 하나.
@immutable
class CandleInfo {
  const CandleInfo({
    required this.slot,
    required this.until,
    required this.intention,
  });

  final int slot;

  /// 꺼지는 시각(epoch ms, 서버 시계).
  final int until;
  final int intention;

  Map<String, dynamic> toJson() => {
    'slot': slot,
    'until': until,
    'intention': intention,
  };

  @override
  bool operator ==(Object other) =>
      other is CandleInfo &&
      other.slot == slot &&
      other.until == until &&
      other.intention == intention;

  @override
  int get hashCode => Object.hash(slot, until, intention);

  @override
  String toString() =>
      'CandleInfo($slot, until: $until, intention: $intention)';
}

/// `snap` 메시지의 피어 한 명 분량.
@immutable
class SnapEntry {
  const SnapEntry(this.id, this.x, this.z, this.r, this.st);

  final String id;
  final double x;
  final double z;
  final double r;
  final String st;

  /// 웹 브리지 `peerSnap`의 `[id,x,z,r,st]` 형식.
  List<Object> toJson() => [id, x, z, r, st];

  @override
  bool operator ==(Object other) =>
      other is SnapEntry &&
      other.id == id &&
      other.x == x &&
      other.z == z &&
      other.r == r &&
      other.st == st;

  @override
  int get hashCode => Object.hash(id, x, z, r, st);

  @override
  String toString() => 'SnapEntry($id, $x, $z, $r, $st)';
}

/// 서버가 보내는 이벤트.
sealed class ChurchEvent {
  const ChurchEvent();
}

class Welcome extends ChurchEvent {
  const Welcome({
    required this.you,
    required this.room,
    required this.n,
    required this.peers,
    required this.seats,
    required this.candles,
    required this.now,
  });

  final String you;
  final String room;
  final int n;
  final List<PeerInfo> peers;

  /// 좌석 id → 앉은 피어 id.
  final Map<String, String> seats;
  final List<CandleInfo> candles;

  /// 서버 현재 시각(epoch ms).
  final int now;
}

class Join extends ChurchEvent {
  const Join(this.peer, this.n);

  final PeerInfo peer;
  final int n;
}

class Leave extends ChurchEvent {
  const Leave(this.id, this.n, {this.aoi = false});

  final String id;
  final int n;

  /// true면 접속이 끊긴 게 아니라 관심 영역(AOI) 밖으로 멀어져 보이지 않게 된 것.
  final bool aoi;
}

class Snap extends ChurchEvent {
  const Snap(this.n, this.list);

  final int n;
  final List<SnapEntry> list;
}

class Seated extends ChurchEvent {
  const Seated(this.id, this.seat);

  final String id;
  final String seat;
}

class Stood extends ChurchEvent {
  const Stood(this.id);

  final String id;
}

class SeatDenied extends ChurchEvent {
  const SeatDenied(this.seat, this.reason);

  final String seat;

  /// `taken` | `invalid` | `far`.
  final String reason;
}

class Praying extends ChurchEvent {
  const Praying(this.id, this.on, this.ms, {this.kneel = false});

  final String id;
  final bool on;
  final int ms;

  /// 무릎 꿇고 기도 중(서버 `k:1`). 기도 중(`on`)일 때만 뜻이 있다.
  final bool kneel;
}

class Candle extends ChurchEvent {
  const Candle(this.slot, this.until, this.intention);

  final int slot;
  final int until;
  final int intention;

  CandleInfo get info =>
      CandleInfo(slot: slot, until: until, intention: intention);
}

class Emote extends ChurchEvent {
  const Emote(this.id, this.e);

  final String id;

  /// 0 인사, 1 성호경, 2 고개 숙임.
  final int e;
}

/// 접속자 명단의 한 사람. 개인 식별 정보 없이 세례명과 상태만 있다.
@immutable
class RosterEntry {
  const RosterEntry(this.name, this.st);

  /// 세례명(통합 목록에서 풀어 쓴 글).
  final String name;

  /// 'w' 서 있음/걷기, 's' 앉음, 'p' 기도 중.
  final String st;

  @override
  bool operator ==(Object other) =>
      other is RosterEntry && other.name == name && other.st == st;

  @override
  int get hashCode => Object.hash(name, st);

  @override
  String toString() => 'RosterEntry($name, $st)';
}

/// `who` 요청의 답: 지금 이 방에 접속한 사람들(나는 빠져 있다).
class Who extends ChurchEvent {
  const Who({
    required this.n,
    required this.room,
    required this.list,
    this.more = false,
  });

  /// 성당 전체 인원.
  final int n;

  /// 이 방 인원(나 포함).
  final int room;
  final List<RosterEntry> list;

  /// 명단이 상한에서 잘렸는지.
  final bool more;
}

/// 방이 가득 참. 클라이언트는 [next] 방으로 다시 접속한다(자동 처리됨).
class Full extends ChurchEvent {
  const Full(this.next);

  final String next;
}

/// 사이버 성당 네트워크 계층.
abstract class ChurchNet {
  ValueListenable<NetState> get state;

  /// 방 인원수(offline이면 0).
  ValueListenable<int> get count;
  Stream<ChurchEvent> get events;

  /// [churchId] 성당의 방(`<churchId>-1`부터)에 접속한다.
  Future<void> connect({required String churchId});
  Future<void> disconnect();
  void dispose();

  /// 내 위치 전송. 내부에서 5Hz로 제한한다(멈출 때는 즉시 전송).
  void sendPos(double x, double z, double r, bool moving);
  void requestSit(String seat);
  void sendStand();

  /// [kneel]: 무릎 꿇고 기도(서버 `k:1`). 다른 사람 화면에도 무릎 꿇은 자세로 보인다.
  void sendPraying(bool on, int ms, {bool kneel = false});
  void lightCandle(int slot, int intention);
  void emote(int e);

  /// 이 방 접속자 명단을 청한다. 답은 [events]에 [Who]로 온다(online이 아니면 아무 일도 없다).
  void requestWho();
}
