import 'dart:async';

/// 동의 확인 함수. [kind]는 `usage`, `sync`, `church`, `diagnostics` 중 하나다.
/// 호출 시점마다 최신 동의 상태를 돌려줘야 한다(결과를 캐시하지 않는다).
typedef ConsentGate = bool Function(String kind);

/// 선택 동의 종류 이름.
abstract final class ConsentKinds {
  static const String usage = 'usage';
  static const String sync = 'sync';
  static const String church = 'church';
  static const String diagnostics = 'diagnostics';
}

/// 서버로 올리는 일을 맡는 추상 계층. Supabase 구현은 별도 클래스
/// (`supabase_event_uploader.dart`)이고 테스트는 [FakeEventUploader]를 쓴다.
///
/// 모든 메서드는 실패하면 **예외를 던진다**(큐가 재시도할 수 있도록). 행에는
/// `user_id`가 들어 있지 않으며 구현이 현재 로그인한 사용자로 채운다.
abstract class EventUploader {
  Future<void> uploadEvents(List<Map<String, dynamic>> rows);
  Future<void> uploadDevice(Map<String, dynamic> row);
  Future<List<Map<String, dynamic>>> fetchPrayerRecords();
  Future<void> upsertPrayerRecords(List<Map<String, dynamic>> rows);
}

/// 테스트용 가짜 업로더: 호출을 기록하고, 실패하도록 지시할 수 있다.
class FakeEventUploader implements EventUploader {
  /// 올라간(성공한) 이벤트 행.
  final List<Map<String, dynamic>> events = [];

  /// `uploadEvents`를 호출한 횟수(실패 포함)와 각 호출의 행 수.
  final List<int> eventBatchSizes = [];
  final List<Map<String, dynamic>> devices = [];

  /// 서버에 있는 기도 기록(id → 행).
  final Map<String, Map<String, dynamic>> serverPrayerRecords = {};
  final List<List<Map<String, dynamic>>> upsertBatches = [];
  int fetchCalls = 0;
  int uploadEventsCalls = 0;

  /// true면 모든 호출이 [StateError]로 실패한다.
  bool failing = false;

  /// 남은 실패 횟수(0이 될 때까지 실패한 뒤 성공).
  int failNext = 0;

  void _maybeFail() {
    if (failing) throw StateError('fake offline');
    if (failNext > 0) {
      failNext--;
      throw StateError('fake offline');
    }
  }

  @override
  Future<void> uploadEvents(List<Map<String, dynamic>> rows) async {
    uploadEventsCalls++;
    eventBatchSizes.add(rows.length);
    _maybeFail();
    events.addAll(rows.map((r) => Map<String, dynamic>.from(r)));
  }

  @override
  Future<void> uploadDevice(Map<String, dynamic> row) async {
    _maybeFail();
    devices.add(Map<String, dynamic>.from(row));
  }

  @override
  Future<List<Map<String, dynamic>>> fetchPrayerRecords() async {
    fetchCalls++;
    _maybeFail();
    return [
      for (final r in serverPrayerRecords.values) Map<String, dynamic>.from(r),
    ];
  }

  @override
  Future<void> upsertPrayerRecords(List<Map<String, dynamic>> rows) async {
    _maybeFail();
    upsertBatches.add([for (final r in rows) Map<String, dynamic>.from(r)]);
    for (final r in rows) {
      serverPrayerRecords[r['id'] as String] = Map<String, dynamic>.from(r);
    }
  }
}
