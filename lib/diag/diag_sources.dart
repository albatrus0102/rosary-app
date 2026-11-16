import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:path_provider/path_provider.dart';

import 'diag_recorder.dart';
import 'diag_sanitize.dart';
import 'diag_store.dart';

/// 화면 이동을 발자취로 남기는 [NavigatorObserver]. 이름 있는 화면은 그 이름, 시트·대화상자는 `popup`.
class DiagNavigatorObserver extends NavigatorObserver {
  DiagNavigatorObserver({this._recorder});

  final DiagRecorder? _recorder;
  DiagRecorder get _r => _recorder ?? DiagRecorder.instance;

  static String nameOf(Route<dynamic>? route) {
    if (route == null) return '-';
    final raw = route.settings.name;
    if (raw != null && raw.trim().isNotEmpty) {
      final id = raw.trim() == '/'
          ? 'root'
          : raw
                .trim()
                .toLowerCase()
                .replaceAll(RegExp(r'^/+'), '')
                .replaceAll(RegExp(r'[^a-z0-9_]+'), '_');
      return DiagSanitize.name(id.isEmpty ? '-' : id);
    }
    return route is PopupRoute ? 'popup' : (route is PageRoute ? 'page' : '-');
  }

  void _rec(String op, Route<dynamic>? route, Route<dynamic>? other) {
    _r.crumb('route', {
      'op': op,
      'to': nameOf(route),
      if (other != null) 'from': nameOf(other),
    });
  }

  @override
  void didPush(Route<dynamic> route, Route<dynamic>? previousRoute) =>
      _rec('push', route, previousRoute);

  @override
  void didPop(Route<dynamic> route, Route<dynamic>? previousRoute) =>
      _rec('pop', previousRoute, route);

  @override
  void didReplace({Route<dynamic>? newRoute, Route<dynamic>? oldRoute}) =>
      _rec('replace', newRoute, oldRoute);

  @override
  void didRemove(Route<dynamic> route, Route<dynamic>? previousRoute) =>
      _rec('remove', previousRoute, route);
}

/// 성당 웹 장면(assets/church/bridge.js)이 보낸 JS 오류 `{e:'jsError', kind, msg, src, line, col, stack}`.
abstract final class DiagJs {
  /// 처리했으면 true(화면 이벤트로 만들지 않는다).
  static bool handleRaw(String raw, {DiagRecorder? recorder}) {
    if (!raw.startsWith('{"e":"jsError"')) return false;
    try {
      final j = jsonDecode(raw);
      if (j is! Map) return true;
      final kind = '${j['kind'] ?? 'error'}';
      final line = j['line'];
      final col = j['col'];
      (recorder ?? DiagRecorder.instance).add(
        src: 'js',
        type: kind,
        message: '${j['msg'] ?? ''}',
        stack: j['stack'] is String ? j['stack'] as String : null,
        extra: {
          'file': DiagSanitize.name('${j['src'] ?? ''}'),
          'line': line is num ? line.toInt() : 0,
          'col': col is num ? col.toInt() : 0,
          'scene': '${j['scene'] ?? 'church'}',
        },
      );
    } catch (_) {}
    return true;
  }
}

/// 안드로이드 쪽 예외(`rosarium/diag` 채널, MainActivity `NativeDiag`): 채널 처리 중 잡은 예외와,
/// 지난 실행에서 앱을 끝낸 자바 예외(다음 실행에 한 번 넘어온다).
abstract final class DiagNative {
  static const MethodChannel _ch = MethodChannel('rosarium/diag');

  /// 쌓인 네이티브 기록을 가져와 오류 기록에 옮긴다. 옮긴 수. 채널이 없으면(시험·iOS) 0.
  static Future<int> drain({
    DiagRecorder? recorder,
    MethodChannel? channel,
  }) async {
    if (kIsWeb) return 0;
    final r = recorder ?? DiagRecorder.instance;
    try {
      final res = await (channel ?? _ch)
          .invokeMethod<Object?>('drain')
          .timeout(const Duration(seconds: 3));
      return absorb(res, r);
    } on MissingPluginException {
      return 0;
    } catch (e) {
      r.crumb('diag_native_drain_fail', {'err': DiagSanitize.typeName(e)}, 'w');
      return 0;
    }
  }

  /// 채널 응답 `{entries:[{t,tag,type,msg,stack}], crash:{t,type,msg,stack,thread}?}`을 옮긴다(시험용으로 따로).
  @visibleForTesting
  static int absorb(Object? res, DiagRecorder r) {
    if (res is! Map) return 0;
    var n = 0;
    final entries = res['entries'];
    if (entries is List) {
      for (final e in entries) {
        if (e is! Map) continue;
        final t = e['t'];
        r.add(
          src: 'native',
          type: '${e['type'] ?? 'Exception'}',
          message: '${e['msg'] ?? ''}',
          stack: e['stack'] is String ? e['stack'] as String : null,
          lib: '${e['tag'] ?? ''}',
          at: t is int ? t : null,
        );
        n++;
      }
    }
    final crash = res['crash'];
    if (crash is Map) {
      final t = crash['t'];
      r.add(
        src: 'native_crash',
        type: '${crash['type'] ?? 'Throwable'}',
        message: '${crash['msg'] ?? ''}',
        stack: crash['stack'] is String ? crash['stack'] as String : null,
        lib: '${crash['thread'] ?? ''}',
        at: t is int ? t : null,
        // 지난 실행이 이것으로 끝났다 — 이번 실행에서 한 번 「기록 보내기」를 권한다.
        unexpectedError: true,
      );
      n++;
    }
    return n;
  }
}

/// 실행 때 한 번: 오류 기록 파일을 붙이고(지난 실행 기록 읽기) 안드로이드 쪽 기록을 옮긴다. 화면을 막지 않는다.
abstract final class DiagBoot {
  static Future<void> start({DiagRecorder? recorder}) async {
    final r = recorder ?? DiagRecorder.instance;
    try {
      final dir = await getApplicationSupportDirectory();
      final d = Directory('${dir.path}/diag');
      if (!d.existsSync()) d.createSync(recursive: true);
      r.attach(FileDiagStore(File('${d.path}/diag_log.jsonl')));
    } catch (e) {
      // 파일을 못 붙이면 이번 실행은 메모리에만 쌓는다(보내기는 그대로 된다).
      r.crumb('diag_store_fail', {'err': DiagSanitize.typeName(e)}, 'w');
    }
    await drainNative(r);
  }

  static Future<void> drainNative(DiagRecorder r) async {
    try {
      await DiagNative.drain(recorder: r);
    } catch (_) {}
  }
}
