import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:path_provider/path_provider.dart';

import '../../diag/diag_recorder.dart';

/// 카드를 이미지로 만들어 안드로이드 공유 시트(FileProvider)나 인스타그램 스토리로 보낸다.
/// 독서공방 `shareImageTo`/`shareImageInstagram`(MainActivity.kt)의 Flutter 판.

/// 공유 결과.
enum ShareOutcome {
  /// 공유 시트(또는 스토리 화면)를 열었다.
  opened,

  /// 스토리 전용 인텐트가 안 돼 일반 공유 시트로 대신 열었다.
  openedSheet,

  /// 이 기기에서는 공유를 지원하지 않는다(안드로이드가 아님 등).
  unsupported,

  /// 실패.
  failed,
}

/// 렌더 → 공유 경로의 경계. 테스트에서는 가짜로 바꿔 끼운다.
abstract class ImageShareChannel {
  Future<ShareOutcome> shareImage(Uint8List png, String name);
  Future<ShareOutcome> shareStory(Uint8List png, String name);
}

/// 안드로이드 `rosarium/share` 채널(MainActivity.kt)을 쓰는 실제 구현.
class PlatformImageShare implements ImageShareChannel {
  PlatformImageShare({MethodChannel? channel, Future<Directory> Function()? tempDir})
    : _channel = channel ?? const MethodChannel('rosarium/share'),
      _tempDir = tempDir ?? getTemporaryDirectory;

  final MethodChannel _channel;
  final Future<Directory> Function() _tempDir;

  /// 공유용 임시 파일 폴더 이름(android/app/src/main/res/xml/file_paths.xml 의 `share/`).
  static const String folder = 'share';

  Future<String> _write(Uint8List png, String name) async {
    final base = await _tempDir();
    final dir = Directory('${base.path}/$folder');
    if (await dir.exists()) {
      // 이전 공유 파일을 지운다(캐시가 쌓이지 않게).
      for (final f in dir.listSync()) {
        try {
          f.deleteSync();
        } catch (_) {}
      }
    } else {
      await dir.create(recursive: true);
    }
    final safe = name.replaceAll(RegExp(r'[^A-Za-z0-9_\-]'), '_');
    final file = File('${dir.path}/${safe.isEmpty ? 'rosarium' : safe}.png');
    await file.writeAsBytes(png, flush: true);
    return file.path;
  }

  Future<ShareOutcome> _call(String method, Uint8List png, String name) async {
    if (kIsWeb || !Platform.isAndroid) return ShareOutcome.unsupported;
    try {
      final path = await _write(png, name);
      final r = await _channel.invokeMethod<String>(method, {'path': path});
      return r == 'sheet' ? ShareOutcome.openedSheet : ShareOutcome.opened;
    } on MissingPluginException {
      return ShareOutcome.unsupported;
    } catch (e, st) {
      Diag.caught('share_channel', e, st);
      return ShareOutcome.failed;
    }
  }

  @override
  Future<ShareOutcome> shareImage(Uint8List png, String name) =>
      _call('shareImage', png, name);

  @override
  Future<ShareOutcome> shareStory(Uint8List png, String name) =>
      _call('shareStory', png, name);
}

/// [boundary]를 PNG 바이트로. 논리 크기 × [pixelRatio] 픽셀(카드 360dp × 3 = 1080px).
Future<Uint8List> capturePng(RenderRepaintBoundary boundary, {double pixelRatio = 3}) async {
  final ui.Image image = await boundary.toImage(pixelRatio: pixelRatio);
  try {
    final data = await image.toByteData(format: ui.ImageByteFormat.png);
    if (data == null) throw StateError('PNG 로 만들지 못했어요');
    return data.buffer.asUint8List();
  } finally {
    image.dispose();
  }
}
