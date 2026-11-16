import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'net/church_net.dart';

/// 봉헌초가 타는 시간: 켠 뒤 하루. 서버(`server/church/src/room_logic.ts`의
/// `CANDLE_TTL_MS`)와 같은 값이다(docs/church/SPEC.md).
const Duration churchCandleBurn = Duration(hours: 24);

/// 가득 찬 봉헌초 대에서 초를 켜려 할 때의 안내.
const String churchCandleFullNote = '초 자리가 모두 찼어요. 켠 초는 하루 동안 타요.';

/// 혼자 모드(서버 없음)에서 내가 켠 초를 기기에 남긴다: 성당별로 슬롯·지향·
/// 꺼지는 시각(켠 시각 + 하루). 앱을 다시 열어도 하루 안이면 켜져 있다.
class ChurchCandleStore {
  static const String prefsKey = 'church_solo_candles_v1';

  static Map<String, List<CandleInfo>> _decode(String? raw, int nowMs) {
    final out = <String, List<CandleInfo>>{};
    if (raw == null || raw.isEmpty) return out;
    try {
      final m = jsonDecode(raw);
      if (m is! Map) return out;
      m.forEach((k, v) {
        if (k is! String || v is! List) return;
        final list = <CandleInfo>[];
        for (final c in v) {
          if (c is! Map) continue;
          final slot = c['slot'], until = c['until'], intention = c['intention'];
          if (slot is! int || until is! int || intention is! int) continue;
          if (until <= nowMs) continue; // 다 탄 초
          final color = c['color'];
          list.add(
            CandleInfo(
              slot: slot,
              until: until,
              intention: intention,
              color: color is int && color >= 0 && color < 6 ? color : null,
            ),
          );
        }
        if (list.isNotEmpty) out[k] = list;
      });
    } catch (e) {
      debugPrint('church candles decode failed: $e');
    }
    return out;
  }

  /// [churchId]에 아직 타고 있는 초(슬롯 순).
  static Future<List<CandleInfo>> load(String churchId, {DateTime? now}) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final nowMs = (now ?? DateTime.now()).millisecondsSinceEpoch;
      final list = _decode(prefs.getString(prefsKey), nowMs)[churchId] ?? [];
      return list..sort((a, b) => a.slot.compareTo(b.slot));
    } catch (e) {
      debugPrint('church candles load failed: $e');
      return const [];
    }
  }

  /// 초 하나를 남긴다(같은 슬롯은 덮어쓴다). 다 탄 초는 이때 함께 지운다.
  static Future<void> add(
    String churchId,
    CandleInfo candle, {
    DateTime? now,
  }) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final nowMs = (now ?? DateTime.now()).millisecondsSinceEpoch;
      final all = _decode(prefs.getString(prefsKey), nowMs);
      final list = (all[churchId] ?? <CandleInfo>[])
        ..removeWhere((c) => c.slot == candle.slot)
        ..add(candle);
      all[churchId] = list;
      await prefs.setString(
        prefsKey,
        jsonEncode({
          for (final e in all.entries)
            e.key: [for (final c in e.value) c.toJson()],
        }),
      );
    } catch (e) {
      debugPrint('church candles save failed: $e');
    }
  }
}
