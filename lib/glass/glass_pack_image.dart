import 'dart:convert';
import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

/// 창 사진 팩(`assets/church/gpack_<id>_1k.js`)에서 WebP 바이트를 꺼낸다.
///
/// 팩은 3D 감상실(file:// WebView)이 읽는 스크립트다:
/// `(window.ChurchGlassPack=…)['<id>_1k']='data:image/webp;base64,<본문>';`.
/// 같은 그림을 .webp 로 한 번 더 싣지 않으려고(APK 용량) 평면 보기도 이 파일을 읽는다.
/// 형식이 다르면 [FormatException].
Uint8List decodeGlassPack(Uint8List script) {
  const marker = 'base64,';
  // 머리말(주석·키)은 짧다. 표지는 앞쪽 1KB 안에 있다.
  final headLen = script.length < 1024 ? script.length : 1024;
  final head = String.fromCharCodes(script, 0, headLen);
  final at = head.indexOf(marker);
  if (at < 0) throw const FormatException('창 사진 팩 형식이 아님');
  final start = at + marker.length;
  var end = script.length;
  // 끝은 `';` + 줄바꿈. 따옴표를 뒤에서부터 찾는다.
  while (end > start && script[end - 1] != 0x27) {
    end--;
  }
  if (end <= start) throw const FormatException('창 사진 팩 끝을 찾지 못함');
  return base64Decode(String.fromCharCodes(script, start, end - 1));
}

/// 번들의 창 사진 팩(gpack JS)을 이미지로 읽는 [ImageProvider].
///
/// 갤러리 썸네일은 .webp 자산이지만, 번들에 1k 사진은 팩 하나뿐이다(3D·평면 공용).
@immutable
class GlassPackImage extends ImageProvider<GlassPackImage> {
  const GlassPackImage(this.path, {this.bundle});

  /// 자산 경로(예: `assets/church/gpack_dove_stpeter_1k.js`).
  final String path;

  /// 시험용 번들. null 이면 [rootBundle].
  final AssetBundle? bundle;

  @override
  Future<GlassPackImage> obtainKey(ImageConfiguration configuration) =>
      SynchronousFuture<GlassPackImage>(this);

  @override
  ImageStreamCompleter loadImage(
    GlassPackImage key,
    ImageDecoderCallback decode,
  ) {
    return MultiFrameImageStreamCompleter(
      codec: _load(key, decode),
      scale: 1.0,
      debugLabel: path,
    );
  }

  Future<ui.Codec> _load(
    GlassPackImage key,
    ImageDecoderCallback decode,
  ) async {
    final data = await (bundle ?? rootBundle).load(key.path);
    final bytes = decodeGlassPack(
      data.buffer.asUint8List(data.offsetInBytes, data.lengthInBytes),
    );
    final buffer = await ui.ImmutableBuffer.fromUint8List(bytes);
    return decode(buffer);
  }

  @override
  bool operator ==(Object other) =>
      other is GlassPackImage && other.path == path && other.bundle == bundle;

  @override
  int get hashCode => Object.hash(path, bundle);

  @override
  String toString() => 'GlassPackImage("$path")';
}
