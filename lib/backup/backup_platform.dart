import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

import '../diag/diag_recorder.dart';

/// 자동 백업 폴더의 상태(네이티브 `folderState`의 사유 코드, 독서공방 autoBackupFolderCode와 같은 뜻).
enum FolderState {
  /// 고른 폴더에 지금 쓸 수 있다.
  ok,

  /// 이 기기에서 폴더를 고른 적이 없다.
  never,

  /// 폴더 권한이 없다(설정에서 회수했거나, 앱을 지웠다 깔아 권한이 사라졌다).
  noPermission,

  /// 읽기 권한만 남았다.
  readOnly,

  /// 폴더가 지워졌거나 저장소(드라이브 앱 등)가 없다.
  gone,

  /// 그 폴더에 파일을 만들 수 없다.
  noCreate,

  /// 확인 중 오류.
  error,

  /// 이 기기(안드로이드 아님·테스트)에서는 자동 백업을 쓸 수 없다.
  unsupported;

  static FolderState parse(String? code) {
    switch (code) {
      case 'ok':
        return FolderState.ok;
      case 'never':
        return FolderState.never;
      case 'read_only':
        return FolderState.readOnly;
      case 'gone':
        return FolderState.gone;
      case 'no_create':
        return FolderState.noCreate;
      case 'unsupported':
        return FolderState.unsupported;
    }
    if (code != null && code.startsWith('no_perm')) {
      return FolderState.noPermission;
    }
    return FolderState.error;
  }
}

/// 폴더 상태 + 사람이 볼 폴더 이름(없으면 null).
class FolderInfo {
  const FolderInfo(this.state, {this.name, this.code = ''});
  final FolderState state;
  final String? name;

  /// 네이티브가 준 원래 사유 코드(진단용 — 경로·URI는 담지 않는다).
  final String code;
}

/// 자동 백업 폴더 안의 우리 파일 하나.
class FolderFile {
  const FolderFile(this.name, this.size);
  final String name;
  final int size;
}

/// 파일 고르기·저장의 결과(고른 파일 내용 또는 사유 코드).
class PlatformResult<T> {
  const PlatformResult.ok(T this.value) : code = 'ok';
  const PlatformResult.fail(this.code) : value = null;
  final T? value;

  /// ok · cancelled · too_big · io:<예외> · unsupported 등.
  final String code;
  bool get ok => code == 'ok';
  bool get cancelled => code == 'cancelled';
}

const String jsonMime = 'application/json';
const String textMime = 'text/plain';

/// 공유할 파일 하나(이름·내용·종류).
class ShareDoc {
  const ShareDoc(this.name, this.content, {this.mime = jsonMime});
  final String name;
  final String content;
  final String mime;
}

/// 백업에 필요한 안드로이드 기능(저장소 접근 프레임워크 SAF·공유 시트). 실제 구현은
/// [MethodChannelBackupPlatform], 시험은 가짜를 넣는다.
abstract class BackupPlatform {
  bool get supported;

  /// 자동 백업 폴더를 고른다(시스템 폴더 선택기). 고르면 지속 권한을 받아 둔다.
  Future<PlatformResult<FolderInfo>> pickFolder();

  /// 저장된 폴더가 **지금** 쓸 수 있는지 매번 다시 확인한다(권한 회수·폴더 삭제를 잡는다).
  Future<FolderInfo> folderState();

  /// 폴더에 [name]으로 쓴다(임시 이름 → 끝까지 쓰고 fsync → 이름 바꾸기).
  Future<PlatformResult<void>> writeFolderFile(String name, String content);

  /// 폴더 안의 우리 파일(이름 형식이 맞는 것만).
  Future<PlatformResult<List<FolderFile>>> listFolderFiles();

  Future<PlatformResult<String>> readFolderFile(String name);

  /// 우리 파일만 지운다(네이티브도 이름 형식을 다시 본다).
  Future<bool> deleteFolderFile(String name);

  /// 자동 백업을 끌 때 폴더 권한을 놓아준다.
  Future<bool> releaseFolder();

  /// 사용자가 고른 자리(다운로드 등)에 파일로 저장한다. [mime]은 파일 종류(기본 JSON — 백업 파일).
  Future<PlatformResult<void>> saveDocument(
    String name,
    String content, {
    String mime = jsonMime,
  });

  /// 공유 시트로 보낸다.
  Future<PlatformResult<void>> shareFile(
    String name,
    String content, {
    String mime = jsonMime,
  });

  /// 여러 파일을 한 번에 공유 시트로 보낸다(오류 기록 + 백업 파일).
  Future<PlatformResult<void>> shareFiles(List<ShareDoc> files);

  /// 백업 파일을 고르고 그 내용을 읽는다(20MB 상한).
  Future<PlatformResult<String>> openDocument();
}

/// `rosarium/backup` 채널(android/.../MainActivity.kt `BackupBridge`).
class MethodChannelBackupPlatform implements BackupPlatform {
  MethodChannelBackupPlatform({MethodChannel? channel})
    : _ch = channel ?? const MethodChannel('rosarium/backup');

  final MethodChannel _ch;

  @override
  bool get supported =>
      !kIsWeb && defaultTargetPlatform == TargetPlatform.android;

  Future<Map<String, Object?>> _call(
    String method, [
    Map<String, Object?>? args,
  ]) async {
    if (!supported) return const {'code': 'unsupported'};
    try {
      final r = await _ch.invokeMethod<Object?>(method, args);
      if (r is Map) return Map<String, Object?>.from(r);
      return {'code': 'bad_reply'};
    } on MissingPluginException {
      return const {'code': 'unsupported'};
    } on PlatformException catch (e) {
      debugPrint('backup channel $method failed: ${e.code}');
      Diag.data('backup_channel_fail', {'m': method, 'code': e.code});
      return {'code': 'err:${e.code}'};
    } catch (e) {
      debugPrint('backup channel $method failed: ${e.runtimeType}');
      Diag.data('backup_channel_fail', {'m': method, 'err': e.runtimeType});
      return {'code': 'err:${e.runtimeType}'};
    }
  }

  static String _code(Map<String, Object?> m) => '${m['code'] ?? 'err'}';

  FolderInfo _info(Map<String, Object?> m) {
    final name = m['name'];
    return FolderInfo(
      FolderState.parse(_code(m)),
      name: name is String && name.isNotEmpty ? name : null,
      code: _code(m),
    );
  }

  @override
  Future<PlatformResult<FolderInfo>> pickFolder() async {
    final m = await _call('pickFolder');
    final code = _code(m);
    if (code != 'ok') return PlatformResult.fail(code);
    return PlatformResult.ok(_info({...m, 'code': 'ok'}));
  }

  @override
  Future<FolderInfo> folderState() async => _info(await _call('folderState'));

  @override
  Future<PlatformResult<void>> writeFolderFile(
    String name,
    String content,
  ) async {
    final m = await _call('writeFolderFile', {
      'name': name,
      'content': content,
    });
    return _code(m) == 'ok'
        ? const PlatformResult.ok(null)
        : PlatformResult.fail(_code(m));
  }

  @override
  Future<PlatformResult<List<FolderFile>>> listFolderFiles() async {
    final m = await _call('listFolderFiles');
    if (_code(m) != 'ok') return PlatformResult.fail(_code(m));
    final files = <FolderFile>[];
    final raw = m['files'];
    if (raw is List) {
      for (final f in raw) {
        if (f is Map && f['name'] is String) {
          final size = f['size'];
          files.add(FolderFile(f['name'] as String, size is int ? size : -1));
        }
      }
    }
    return PlatformResult.ok(files);
  }

  @override
  Future<PlatformResult<String>> readFolderFile(String name) async {
    final m = await _call('readFolderFile', {'name': name});
    final text = m['text'];
    if (_code(m) == 'ok' && text is String) return PlatformResult.ok(text);
    return PlatformResult.fail(_code(m));
  }

  @override
  Future<bool> deleteFolderFile(String name) async =>
      _code(await _call('deleteFolderFile', {'name': name})) == 'ok';

  @override
  Future<bool> releaseFolder() async =>
      _code(await _call('releaseFolder')) == 'ok';

  @override
  Future<PlatformResult<void>> saveDocument(
    String name,
    String content, {
    String mime = jsonMime,
  }) async {
    final m = await _call('saveDocument', {
      'name': name,
      'content': content,
      'mime': mime,
    });
    return _code(m) == 'ok'
        ? const PlatformResult.ok(null)
        : PlatformResult.fail(_code(m));
  }

  @override
  Future<PlatformResult<void>> shareFile(
    String name,
    String content, {
    String mime = jsonMime,
  }) async {
    final m = await _call('shareFile', {
      'name': name,
      'content': content,
      'mime': mime,
    });
    return _code(m) == 'ok'
        ? const PlatformResult.ok(null)
        : PlatformResult.fail(_code(m));
  }

  @override
  Future<PlatformResult<void>> shareFiles(List<ShareDoc> files) async {
    final m = await _call('shareFiles', {
      'files': [
        for (final f in files)
          {'name': f.name, 'content': f.content, 'mime': f.mime},
      ],
    });
    return _code(m) == 'ok'
        ? const PlatformResult.ok(null)
        : PlatformResult.fail(_code(m));
  }

  @override
  Future<PlatformResult<String>> openDocument() async {
    final m = await _call('openDocument');
    final text = m['text'];
    if (_code(m) == 'ok' && text is String) return PlatformResult.ok(text);
    return PlatformResult.fail(_code(m));
  }
}
