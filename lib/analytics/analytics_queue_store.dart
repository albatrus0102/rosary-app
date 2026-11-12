import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:path_provider/path_provider.dart';

/// 오프라인 큐의 영속 저장소 추상.
///
/// 파일을 고른 이유: 큐는 최대 500개(수백 KB)이고 이벤트마다 바뀐다.
/// `shared_preferences`는 값 하나를 통째로 다시 쓰고 다른 설정과 한 파일을 공유해
/// 느려지거나 다른 키를 깨뜨릴 수 있다. 앱 지원 폴더의 전용 파일에 임시 파일 쓰기 후
/// 이름 바꾸기(원자적)로 저장한다.
abstract class QueueStore {
  /// 저장된 JSON 문자열(없으면 null).
  Future<String?> read();
  Future<void> write(String data);
  Future<void> delete();
}

/// 메모리 구현(테스트용). [data]를 다른 인스턴스와 공유하면 재시작을 흉내 낼 수 있다.
class MemoryQueueStore implements QueueStore {
  MemoryQueueStore([this.data]);
  String? data;

  @override
  Future<String?> read() async => data;

  @override
  Future<void> write(String d) async => data = d;

  @override
  Future<void> delete() async => data = null;
}

/// 파일 구현. 기본 위치는 `getApplicationSupportDirectory()/analytics_queue_v1.json`.
class FileQueueStore implements QueueStore {
  FileQueueStore({Future<Directory> Function()? directory})
    : _directory = directory ?? getApplicationSupportDirectory;

  final Future<Directory> Function() _directory;

  Future<File> _file() async {
    final dir = await _directory();
    if (!await dir.exists()) await dir.create(recursive: true);
    return File('${dir.path}/analytics_queue_v1.json');
  }

  @override
  Future<String?> read() async {
    try {
      final f = await _file();
      if (!await f.exists()) return null;
      return await f.readAsString(encoding: utf8);
    } catch (_) {
      return null;
    }
  }

  @override
  Future<void> write(String data) async {
    try {
      final f = await _file();
      final tmp = File('${f.path}.tmp');
      await tmp.writeAsString(data, encoding: utf8, flush: true);
      await tmp.rename(f.path);
    } catch (_) {
      // 저장 실패는 메모리 큐를 해치지 않는다.
    }
  }

  @override
  Future<void> delete() async {
    try {
      final f = await _file();
      if (await f.exists()) await f.delete();
    } catch (_) {}
  }
}
