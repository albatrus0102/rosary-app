import 'package:flutter/material.dart';

import '../../app/theme.dart';

/// 그림 한 장을 [decodeWidth] 화소로만 디코드해 보여 주고, 바뀌거나 사라지면 캐시에서 바로 내린다.
///
/// 기도 배경·십자가의 길 시트처럼 한 화면에 큰 그림이 하나뿐인 곳에서 메모리를 한 장 분량으로 묶는다.
/// 새 그림은 짧게 나타난다(동작 줄이기면 바로).
class SingleArtImage extends StatefulWidget {
  const SingleArtImage({
    super.key,
    required this.asset,
    required this.decodeWidth,
    this.fit = BoxFit.cover,
    this.alignment = Alignment.center,
    this.semanticLabel,
  });

  final String asset;

  /// 디코드할 가로 화소(원본보다 크면 원본 크기).
  final int decodeWidth;
  final BoxFit fit;
  final Alignment alignment;

  /// 없으면 장식 그림으로 보고 읽지 않는다.
  final String? semanticLabel;

  /// 화면 폭(논리 px × 기기 배율)에 맞춘 디코드 폭. [max]보다 크게 디코드하지 않는다.
  static int decodeWidthFor(
    BuildContext context,
    double logicalWidth,
    int max,
  ) {
    final dpr = MediaQuery.maybeDevicePixelRatioOf(context) ?? 2;
    return (logicalWidth * dpr).round().clamp(64, max);
  }

  @override
  State<SingleArtImage> createState() => _SingleArtImageState();
}

class _SingleArtImageState extends State<SingleArtImage> {
  late ImageProvider _provider = _make();

  ImageProvider _make() =>
      ResizeImage(AssetImage(widget.asset), width: widget.decodeWidth);

  @override
  void didUpdateWidget(SingleArtImage old) {
    super.didUpdateWidget(old);
    if (old.asset != widget.asset || old.decodeWidth != widget.decodeWidth) {
      final prev = _provider;
      _provider = _make();
      // 앞 그림은 더 쓰지 않는다: 캐시에서 내려 한 장만 남긴다.
      prev.evict();
    }
  }

  @override
  void dispose() {
    _provider.evict();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final fade = AppMotion.of(context, Durations.medium2);
    return Image(
      key: ValueKey(widget.asset),
      image: _provider,
      fit: widget.fit,
      alignment: widget.alignment,
      excludeFromSemantics: widget.semanticLabel == null,
      semanticLabel: widget.semanticLabel,
      gaplessPlayback: false,
      errorBuilder: (context, error, stack) => const SizedBox.shrink(),
      frameBuilder: (context, child, frame, sync) {
        if (sync || fade == Duration.zero) return child;
        return AnimatedOpacity(
          opacity: frame == null ? 0 : 1,
          duration: fade,
          curve: Easing.standardDecelerate,
          child: child,
        );
      },
    );
  }
}
