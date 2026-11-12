import 'package:flutter/material.dart';

import 'glass_catalog.dart';
import 'glass_chrome.dart';
import 'glass_widgets.dart';

/// 평면 원본 보기(G-10): 보정한 2k WebP를 중성 배경 위에 놓고 Flutter의 [InteractiveViewer]로
/// 확대(최대 8배)·이동한다. 두 번 누르면 처음 구도로 돌아간다.
///
/// 3D 장면이 WebGL·메모리 문제로 못 뜰 때의 대체이자 저사양 기기용 선택지다. 3D 장면과 같은
/// 덮개(뒤로·정보)를 쓴다. 색은 보정한 사진에 충실하다(연출 없음).
class GlassFlatViewer extends StatefulWidget {
  const GlassFlatViewer({
    super.key,
    required this.window,
    required this.onBack,
    required this.onInfo,
    this.notice,
    this.onZoom,
    this.onPan,
    this.onLoaded,
    this.maxScale = 8,
  });

  final GlassWindow window;
  final VoidCallback onBack;
  final VoidCallback onInfo;

  /// 대체 보기로 내려온 이유 등 한 줄 안내.
  final String? notice;

  /// 확대 배율이 바뀔 때(현재 배율).
  final ValueChanged<double>? onZoom;

  /// 끌어서 옮겼을 때(한 번 이상).
  final VoidCallback? onPan;

  /// 사진 첫 화면이 그려졌을 때.
  final VoidCallback? onLoaded;

  final double maxScale;

  /// 화면 아래 한 줄.
  static const String colorNote = '색은 보정한 사진에 충실합니다';

  @override
  State<GlassFlatViewer> createState() => _GlassFlatViewerState();
}

class _GlassFlatViewerState extends State<GlassFlatViewer>
    with SingleTickerProviderStateMixin {
  final TransformationController _tc = TransformationController();
  final GlassChromeController _chrome = GlassChromeController();
  late final AnimationController _anim = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 280),
  );
  Animation<Matrix4>? _reset;
  bool _loadedReported = false;
  bool _zoomed = false;

  @override
  void initState() {
    super.initState();
    _chrome.show();
    _tc.addListener(_onTransform);
    _anim.addListener(() {
      final r = _reset;
      if (r != null) _tc.value = r.value;
    });
  }

  void _onTransform() {
    final z = _tc.value.getMaxScaleOnAxis() > 1.05;
    if (z != _zoomed) setState(() => _zoomed = z);
  }

  @override
  void dispose() {
    _tc.dispose();
    _anim.dispose();
    _chrome.dispose();
    super.dispose();
  }

  void _resetView() {
    if (_tc.value.isIdentity()) return;
    if (MediaQuery.disableAnimationsOf(context)) {
      _tc.value = Matrix4.identity();
      widget.onZoom?.call(1);
      return;
    }
    _reset = Matrix4Tween(
      begin: _tc.value,
      end: Matrix4.identity(),
    ).animate(CurvedAnimation(parent: _anim, curve: Curves.easeOutCubic));
    _anim
      ..reset()
      ..forward();
  }

  void _update(ScaleUpdateDetails d) {
    widget.onZoom?.call(_tc.value.getMaxScaleOnAxis());
    if (d.scale == 1.0 && d.focalPointDelta != Offset.zero) widget.onPan?.call();
    if (d.pointerCount == 1 && _tc.value.getMaxScaleOnAxis() > 1.0) {
      widget.onPan?.call();
    }
  }

  @override
  Widget build(BuildContext context) {
    final w = widget.window;
    final theme = Theme.of(context);
    final image = Image.asset(
      w.file2k.path,
      fit: BoxFit.contain,
      filterQuality: FilterQuality.high,
      excludeFromSemantics: true,
      frameBuilder: (context, child, frame, sync) {
        if (frame != null && !_loadedReported) {
          _loadedReported = true;
          WidgetsBinding.instance.addPostFrameCallback(
            (_) => widget.onLoaded?.call(),
          );
        }
        return child;
      },
      errorBuilder: (_, _, _) => const Center(
        child: Icon(Icons.broken_image_outlined, color: kGlassOnStone, size: 48),
      ),
    );
    return ColoredBox(
      key: const ValueKey('glass-flat'),
      color: kGlassStone,
      child: GlassChromeLayer(
        controller: _chrome,
        top: GlassTopBar(
          title: w.titleKo,
          onBack: widget.onBack,
          onInfo: widget.onInfo,
        ),
        bottom: GlassBottomBar(
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    '${w.place} · ${glassSizeText(w)}',
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: kGlassOnStone,
                    ),
                  ),
                ),
                if (_zoomed)
                  TextButton(
                    key: const ValueKey('flat-reset'),
                    style: TextButton.styleFrom(foregroundColor: kGlassOnStone),
                    onPressed: _resetView,
                    child: const Text('처음으로'),
                  ),
              ],
            ),
            const SizedBox(height: 2),
            Text(
              widget.notice == null
                  ? GlassFlatViewer.colorNote
                  : '${widget.notice}\n${GlassFlatViewer.colorNote}',
              key: const ValueKey('flat-note'),
              style: theme.textTheme.bodySmall?.copyWith(
                color: kGlassOnStone.withValues(alpha: 0.8),
              ),
            ),
          ],
        ),
        child: Semantics(
          label:
              '${w.titleKo} 평면 원본. 두 손가락으로 확대하고, 두 번 누르면 처음으로 돌아갑니다.',
          child: GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: _chrome.toggle,
            onDoubleTap: _resetView,
            child: InteractiveViewer(
              key: const ValueKey('flat-viewer'),
              transformationController: _tc,
              minScale: 1,
              maxScale: widget.maxScale,
              onInteractionStart: (_) => _chrome.hide(),
              onInteractionUpdate: _update,
              onInteractionEnd: (_) =>
                  widget.onZoom?.call(_tc.value.getMaxScaleOnAxis()),
              child: Center(child: image),
            ),
          ),
        ),
      ),
    );
  }
}
