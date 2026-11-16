import 'dart:io';

/// 오류 기록의 디스크 저장소(JSON Lines). 앱이 죽어도 다음 실행에 남아 있게 한 줄씩 덧붙인다.
///
/// 동기 쓰기다: 오류 바로 뒤에 앱이 끝나도 그 줄이 운영체제에 넘어가 있게(줄 하나는 수백 바이트).
/// 실패해도 던지지 않는다 — 기록은 본 동작을 막지 않는다.
abstract class DiagStore {
  /// 저장된 줄 전부(오래된 것부터). 없거나 못 읽으면 빈 목록.
  List<String> readLines();

  /// 한 줄 덧붙인다.
  void append(String line);

  /// 통째로 바꿔 쓴다(압축).
  void rewrite(List<String> lines);
}

/// 앱 전용 폴더의 파일 하나(`<app support>/diag/diag_log.jsonl`).
class FileDiagStore implements DiagStore {
  FileDiagStore(this.file);

  final File file;

  /// 마지막 쓰기 실패(진단 표시용 — 종류 이름만).
  String? lastError;

  @override
  List<String> readLines() {
    try {
      if (!file.existsSync()) return const [];
      return file.readAsLinesSync().where((l) => l.trim().isNotEmpty).toList();
    } catch (e) {
      lastError = 'read:${e.runtimeType}';
      return const [];
    }
  }

  @override
  void append(String line) {
    try {
      file.writeAsStringSync('$line\n', mode: FileMode.append);
    } catch (e) {
      lastError = 'append:${e.runtimeType}';
    }
  }

  @override
  void rewrite(List<String> lines) {
    try {
      file.parent.createSync(recursive: true);
      final tmp = File('${file.path}.tmp');
      tmp.writeAsStringSync(
        lines.isEmpty ? '' : '${lines.join('\n')}\n',
        flush: true,
      );
      tmp.renameSync(file.path);
    } catch (e) {
      lastError = 'rewrite:${e.runtimeType}';
    }
  }
}

/// 시험용 메모리 저장소(「다시 켜기」를 같은 객체로 흉내 낸다).
class MemoryDiagStore implements DiagStore {
  final List<String> lines = [];

  @override
  List<String> readLines() => List.of(lines);

  @override
  void append(String line) => lines.add(line);

  @override
  void rewrite(List<String> l) => lines
    ..clear()
    ..addAll(l);
}
