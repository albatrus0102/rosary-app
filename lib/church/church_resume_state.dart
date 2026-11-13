import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// 성당 안에서 '방금 있던 그대로'를 되살리는 데 필요한 상태.
///
/// 성당 화면이 보이지 않게 될 때(다른 탭·다른 화면·앱 백그라운드) 웹 장면이 `state` 이벤트로
/// 알려 준 값으로 만든다. 같은 장면(WebView)이 살아 있으면 쓸 일이 없고, 장면을 새로 만들어야
/// 할 때(오래 숨겨져 장면을 해제했거나, 백그라운드에서 앱이 종료된 뒤 다시 들어올 때)
/// `ChurchAPI.restore`로 새 장면에 적용한다.
///
/// 개인 정보는 없다: 성당 id, 좌표, 좌석 id, 자세, 카메라 값뿐이다.
@immutable
class ChurchResumeState {
  const ChurchResumeState({
    required this.churchId,
    required this.x,
    required this.z,
    this.r = 0,
    this.seat,
    this.kneel = false,
    this.camYaw,
    this.camPitch,
    this.camZoom,
    this.camLook,
    this.walkKind,
    this.walkIndex = 0,
    this.walkSeat,
    this.savedAtMs = 0,
  });

  /// 저장분을 믿는 기간. 이보다 오래된 것은 버리고 입구에서 시작한다.
  static const Duration maxAge = Duration(minutes: 30);

  static const String prefsKey = 'church_resume_state';

  static final RegExp _idRe = RegExp(r'^[a-z0-9_]{1,40}$');
  static final RegExp _seatRe = RegExp(r'^[A-Za-z0-9_-]{1,16}$');
  static const Set<String> walkKinds = {
    'candle',
    'altar',
    'seat',
    'entrance',
    'font',
    'cross',
  };

  final String churchId;
  final double x;
  final double z;

  /// 아바타가 보는 방향(yaw 라디안).
  final double r;

  /// 앉아 있던 좌석 id. 서 있었으면 null.
  final String? seat;

  /// 무릎 꿇고 있었는지(앉아 있을 때만 뜻이 있다).
  final bool kneel;

  /// 카메라: 수평 각·수직 각·줌·올려다보기. null이면 장면 기본값.
  final double? camYaw;
  final double? camPitch;
  final double? camZoom;
  final double? camLook;

  /// 자동 걷기 중이던 목적지(candle|altar|seat|entrance|font|cross). 없으면 null.
  final String? walkKind;
  final int walkIndex;
  final String? walkSeat;

  /// 저장 시각(epoch ms).
  final int savedAtMs;

  /// [churchId] 성당의 것이고 아직 [maxAge] 안인가.
  bool isFreshFor(String churchId, DateTime now) {
    if (churchId != this.churchId) return false;
    final age = now.millisecondsSinceEpoch - savedAtMs;
    return age >= 0 && age <= maxAge.inMilliseconds;
  }

  /// 좌석만 바꾼 사본(앱이 알고 있는 좌석 상태가 장면의 것보다 우선이다).
  ChurchResumeState withSeat(String? seat, {bool? kneel}) => ChurchResumeState(
    churchId: churchId,
    x: x,
    z: z,
    r: r,
    seat: seat,
    kneel: seat == null ? false : (kneel ?? this.kneel),
    camYaw: camYaw,
    camPitch: camPitch,
    camZoom: camZoom,
    camLook: camLook,
    walkKind: seat == null ? walkKind : null,
    walkIndex: walkIndex,
    walkSeat: walkSeat,
    savedAtMs: savedAtMs,
  );

  /// 웹 브리지 `ChurchAPI.restore`의 인자.
  Map<String, Object?> toSceneArgs() => {
    'church': churchId,
    'x': x,
    'z': z,
    'r': r,
    'seat': seat,
    'posture': seat != null && kneel ? 'kneel' : 'sit',
    'cy': ?camYaw,
    'cp': ?camPitch,
    'cz': ?camZoom,
    'cl': ?camLook,
    if (walkKind != null && seat == null)
      'walk': {'kind': walkKind, 'index': walkIndex, 'seat': ?walkSeat},
  };

  Map<String, Object?> toJson() => {
    'v': 1,
    'church': churchId,
    'x': x,
    'z': z,
    'r': r,
    'seat': ?seat,
    if (kneel) 'kneel': true,
    'cy': ?camYaw,
    'cp': ?camPitch,
    'cz': ?camZoom,
    'cl': ?camLook,
    'walk': ?walkKind,
    if (walkKind != null) 'wi': walkIndex,
    'ws': ?walkSeat,
    't': savedAtMs,
  };

  String encode() => jsonEncode(toJson());

  static double? _num(Object? v, {double limit = 2000}) {
    if (v is! num) return null;
    final d = v.toDouble();
    if (!d.isFinite || d.abs() > limit) return null;
    return d;
  }

  /// 깨졌거나 모르는 형식이면 null.
  static ChurchResumeState? fromJson(Object? j) {
    if (j is! Map) return null;
    final v = j['v'];
    if (v != null && v != 1) return null;
    final church = j['church'];
    final x = _num(j['x']);
    final z = _num(j['z']);
    if (church is! String || !_idRe.hasMatch(church)) return null;
    if (x == null || z == null) return null;
    final seat = j['seat'];
    final okSeat = seat is String && _seatRe.hasMatch(seat);
    final walk = j['walk'];
    final okWalk = walk is String && walkKinds.contains(walk);
    final wi = j['wi'];
    final ws = j['ws'];
    final t = j['t'];
    return ChurchResumeState(
      churchId: church,
      x: x,
      z: z,
      r: _num(j['r'], limit: 100) ?? 0,
      seat: okSeat ? seat : null,
      kneel: okSeat && j['kneel'] == true,
      camYaw: _num(j['cy'], limit: 1e6),
      camPitch: _num(j['cp'], limit: 10),
      camZoom: _num(j['cz'], limit: 10),
      camLook: _num(j['cl'], limit: 10),
      walkKind: okWalk && !okSeat ? walk : null,
      walkIndex: okWalk && wi is num && wi >= 0 && wi < 1000 ? wi.toInt() : 0,
      walkSeat: okWalk && ws is String && _seatRe.hasMatch(ws) ? ws : null,
      savedAtMs: t is num && t.isFinite ? t.toInt() : 0,
    );
  }

  static ChurchResumeState? decode(String? raw) {
    if (raw == null || raw.isEmpty) return null;
    try {
      return fromJson(jsonDecode(raw));
    } catch (_) {
      return null;
    }
  }

  // --- 저장(앱이 백그라운드에서 종료된 뒤에도 되살릴 수 있게) ---

  static Future<ChurchResumeState?> load() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return decode(prefs.getString(prefsKey));
    } catch (e) {
      debugPrint('church resume load failed: $e');
      return null;
    }
  }

  Future<void> save() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(prefsKey, encode());
    } catch (e) {
      debugPrint('church resume save failed: $e');
    }
  }

  /// 성당을 명시적으로 나갈 때 지운다(다음에는 입구에서 시작).
  static Future<void> clear() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(prefsKey);
    } catch (e) {
      debugPrint('church resume clear failed: $e');
    }
  }

  @override
  bool operator ==(Object other) =>
      other is ChurchResumeState &&
      other.churchId == churchId &&
      other.x == x &&
      other.z == z &&
      other.r == r &&
      other.seat == seat &&
      other.kneel == kneel &&
      other.camYaw == camYaw &&
      other.camPitch == camPitch &&
      other.camZoom == camZoom &&
      other.camLook == camLook &&
      other.walkKind == walkKind &&
      other.walkIndex == walkIndex &&
      other.walkSeat == walkSeat &&
      other.savedAtMs == savedAtMs;

  @override
  int get hashCode => Object.hash(
    churchId,
    x,
    z,
    r,
    seat,
    kneel,
    camYaw,
    camPitch,
    camZoom,
    camLook,
    walkKind,
    walkIndex,
    walkSeat,
    savedAtMs,
  );

  @override
  String toString() => 'ChurchResumeState(${encode()})';
}
