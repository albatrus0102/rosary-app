import 'package:supabase_flutter/supabase_flutter.dart';

import 'analytics_types.dart';

/// [EventUploader]의 Supabase 구현. 예외를 삼키지 않는다(큐가 재시도한다).
/// 행의 `user_id`는 현재 로그인한 사용자로 여기서 채운다. 로그인하지 않았으면
/// [StateError]를 던진다.
class SupabaseEventUploader implements EventUploader {
  SupabaseEventUploader({this._client});

  final SupabaseClient? _client;

  SupabaseClient get _c => _client ?? Supabase.instance.client;

  String get _uid {
    final user = _c.auth.currentUser;
    if (user == null) throw StateError('not signed in');
    return user.id;
  }

  @override
  Future<void> uploadEvents(List<Map<String, dynamic>> rows) async {
    if (rows.isEmpty) return;
    final uid = _uid;
    await _c.from('events').insert([
      for (final r in rows) {...r, 'user_id': uid},
    ]);
  }

  @override
  Future<void> uploadDevice(Map<String, dynamic> row) async {
    final uid = _uid;
    await _c.from('devices').upsert({
      ...row,
      'user_id': uid,
      // 서버 표의 last_seen이 갱신되도록 마지막 접속 시각을 함께 보낸다.
      'last_seen': DateTime.now().toUtc().toIso8601String(),
    }, onConflict: 'user_id,device_id');
  }

  /// 서버에 있는 내 기도 기록 전체(1000개씩 나누어 읽는다).
  @override
  Future<List<Map<String, dynamic>>> fetchPrayerRecords() async {
    final uid = _uid;
    const page = 1000;
    final out = <Map<String, dynamic>>[];
    for (var from = 0; ; from += page) {
      final rows = await _c
          .from('prayer_records')
          .select()
          .eq('user_id', uid)
          .order('at', ascending: false)
          .range(from, from + page - 1);
      out.addAll(rows.map((r) => Map<String, dynamic>.from(r)));
      if (rows.length < page) break;
    }
    return out;
  }

  @override
  Future<void> upsertPrayerRecords(List<Map<String, dynamic>> rows) async {
    if (rows.isEmpty) return;
    final uid = _uid;
    // 서버 표는 기도 기록 수정을 허용하지 않는다(불변 기록). 이미 있는 id는 건너뛴다.
    await _c
        .from('prayer_records')
        .upsert(
          [
            for (final r in rows) {...r, 'user_id': uid},
          ],
          onConflict: 'id',
          ignoreDuplicates: true,
        );
  }
}
