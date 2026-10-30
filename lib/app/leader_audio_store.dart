import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';

import '../domain/leader_cues.dart';

/// 선창(앞단) 녹음 파일 저장소. `<문서 폴더>/leader_audio/<cueId>.m4a`.
///
/// [init] 이후에는 [has], [recordedCount]가 동기적으로 답한다.
/// 녹음/삭제 뒤에는 리스너에게 알린다.
class LeaderAudioStore extends ChangeNotifier {
  /// [directory]를 주면 그 폴더를 쓴다(테스트용). 없으면 앱 문서 폴더 아래를 쓴다.
  LeaderAudioStore({Directory? directory}) : _dir = directory;

  static const _ext = '.m4a';
  static const _tmpSuffix = '.rec.m4a';

  Directory? _dir;
  Future<void>? _initFuture;
  final Set<String> _recorded = {};
  bool _disposed = false;

  /// 폴더를 만들고 이미 있는 파일을 읽는다. 여러 번 불러도 한 번만 실행한다.
  Future<void> init() => _initFuture ??= _init();

  Future<void> _init() async {
    var dir = _dir;
    if (dir == null) {
      final docs = await getApplicationDocumentsDirectory();
      dir = Directory('${docs.path}${Platform.pathSeparator}leader_audio');
      _dir = dir;
    }
    await dir.create(recursive: true);
    await _scan();
  }

  Future<void> _scan() async {
    final dir = _dir;
    if (dir == null) return;
    final found = <String>{};
    final known = {for (final c in allLeaderCues) c.id};
    await for (final entity in dir.list()) {
      if (entity is! File) continue;
      final name = entity.uri.pathSegments.last;
      if (name.endsWith(_tmpSuffix)) {
        // 끝나지 않은 녹음 조각은 지운다.
        try {
          await entity.delete();
        } catch (_) {}
        continue;
      }
      if (!name.endsWith(_ext)) continue;
      final id = name.substring(0, name.length - _ext.length);
      if (known.contains(id) && await entity.length() > 0) found.add(id);
    }
    _recorded
      ..clear()
      ..addAll(found);
    _notify();
  }

  /// [cueId]의 녹음 파일이 있는지.
  bool has(String cueId) => _recorded.contains(cueId);

  /// [cueId]의 녹음 파일 경로(파일이 없어도 돌려준다). [init] 전에는 ''.
  String pathFor(String cueId) {
    final dir = _dir;
    if (dir == null) return '';
    return '${dir.path}${Platform.pathSeparator}$cueId$_ext';
  }

  /// 녹음 중 임시로 쓰는 경로. 녹음이 끝나야 [commitRecording]으로 확정한다.
  String tempPathFor(String cueId) {
    final dir = _dir;
    if (dir == null) return '';
    return '${dir.path}${Platform.pathSeparator}$cueId$_tmpSuffix';
  }

  /// 녹음된 큐 개수.
  int get recordedCount => _recorded.length;

  /// 임시 녹음 파일을 정식 파일로 바꾼다. 비었거나 없으면 false.
  Future<bool> commitRecording(String cueId) async {
    final tmp = File(tempPathFor(cueId));
    try {
      if (!await tmp.exists() || await tmp.length() == 0) {
        if (await tmp.exists()) await tmp.delete();
        return false;
      }
      final target = File(pathFor(cueId));
      if (await target.exists()) await target.delete();
      await tmp.rename(target.path);
      _recorded.add(cueId);
      _notify();
      return true;
    } catch (e) {
      debugPrint('LeaderAudioStore.commitRecording($cueId) failed: $e');
      return false;
    }
  }

  /// 녹음 취소 등으로 남은 임시 파일을 지운다.
  Future<void> discardTemp(String cueId) async {
    try {
      final tmp = File(tempPathFor(cueId));
      if (await tmp.exists()) await tmp.delete();
    } catch (_) {}
  }

  /// [cueId]의 녹음을 지운다.
  Future<void> delete(String cueId) async {
    try {
      final file = File(pathFor(cueId));
      if (await file.exists()) await file.delete();
    } catch (e) {
      debugPrint('LeaderAudioStore.delete($cueId) failed: $e');
    }
    if (_recorded.remove(cueId)) _notify();
  }

  void _notify() {
    if (!_disposed) notifyListeners();
  }

  @override
  void dispose() {
    _disposed = true;
    super.dispose();
  }
}
