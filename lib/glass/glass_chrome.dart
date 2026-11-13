import 'dart:async';

import 'package:flutter/material.dart';

import '../app/theme.dart';
import 'glass_widgets.dart';

/// 감상 화면 덮개 UI의 보임/숨김. 마지막 조작 뒤 [idle] 동안 가만히 있으면 숨는다.
/// 화면 읽기(접근성 탐색)를 쓰는 중에는 숨기지 않는다.
class GlassChromeController extends ChangeNotifier {
  GlassChromeController({this.idle = const Duration(seconds: 3)});

  final Duration idle;
  Timer? _timer;
  bool _visible = true;
  bool _pinned = false;
  bool _disposed = false;

  bool get visible => _visible || _pinned;

  /// 로딩·오류·시트가 떠 있을 때처럼 숨기면 안 될 때 true.
  set pinned(bool v) {
    if (_pinned == v) return;
    _pinned = v;
    if (v) {
      _timer?.cancel();
    } else {
      _arm();
    }
    _notify();
  }

  void show() {
    _visible = true;
    _arm();
    _notify();
  }

  void hide() {
    _timer?.cancel();
    if (!_visible) return;
    _visible = false;
    _notify();
  }

  void toggle() => visible ? hide() : show();

  /// 덮개를 쓰는 중(버튼 누름 등): 보이고 있으면 숨는 시각을 뒤로 민다.
  void bump() {
    if (_visible) _arm();
  }

  void _arm() {
    _timer?.cancel();
    if (_pinned) return;
    _timer = Timer(idle, hide);
  }

  void _notify() {
    if (!_disposed) notifyListeners();
  }

  @override
  void dispose() {
    _disposed = true;
    _timer?.cancel();
    super.dispose();
  }
}

/// 감상 화면의 덮개: 위(뒤로·이름·정보)와 아래(캡션·조작)를 [child] 위에 얹는다.
/// 숨겨지면 위·아래 가장자리를 눌러 다시 부를 수 있다(WebView가 가운데 제스처를 쓰므로).
class GlassChromeLayer extends StatelessWidget {
  const GlassChromeLayer({
    super.key,
    required this.controller,
    required this.top,
    required this.bottom,
    required this.child,
  });

  final GlassChromeController controller;
  final Widget top;
  final Widget bottom;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    // M3 모션: 덮개 나타남/숨김은 medium1(250ms) + 표준 곡선, '동작 줄이기'면 즉시.
    final dur = AppMotion.of(context, Durations.medium1);
    return ListenableBuilder(
      listenable: controller,
      builder: (context, _) {
        final show = controller.visible;
        return Stack(
          fit: StackFit.expand,
          children: [
            child,
            if (!show) ...[
              // 숨은 동안 위·아래 가장자리 눌러서 다시 보이기.
              Positioned(
                left: 0,
                right: 0,
                top: 0,
                height: 96,
                child: _EdgeZone(onTap: controller.show),
              ),
              Positioned(
                left: 0,
                right: 0,
                bottom: 0,
                height: 120,
                child: _EdgeZone(onTap: controller.show),
              ),
            ],
            Positioned(
              left: 0,
              right: 0,
              top: 0,
              child: _Fade(
                visible: show,
                duration: dur,
                child: GlassViewerTheme(child: top),
              ),
            ),
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: _Fade(
                visible: show,
                duration: dur,
                child: GlassViewerTheme(child: bottom),
              ),
            ),
          ],
        );
      },
    );
  }
}

class _EdgeZone extends StatelessWidget {
  const _EdgeZone({required this.onTap});
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Semantics(
    button: true,
    label: '조작 보이기',
    child: GestureDetector(behavior: HitTestBehavior.translucent, onTap: onTap),
  );
}

class _Fade extends StatelessWidget {
  const _Fade({
    required this.visible,
    required this.duration,
    required this.child,
  });

  final bool visible;
  final Duration duration;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    // 숨겨도 위젯은 남겨 두되(자리·접근성 트리 유지) 누르지는 못하게 한다.
    return IgnorePointer(
      ignoring: !visible,
      child: ExcludeSemantics(
        excluding: !visible,
        child: AnimatedOpacity(
          opacity: visible ? 1 : 0,
          duration: duration,
          curve: Easing.standard,
          child: child,
        ),
      ),
    );
  }
}

/// 덮개 위쪽 줄: 뒤로 · 창 이름 · 정보 · (선택) 더보기.
class GlassTopBar extends StatelessWidget {
  const GlassTopBar({
    super.key,
    required this.title,
    required this.onBack,
    required this.onInfo,
    this.menu,
  });

  final String title;
  final VoidCallback onBack;
  final VoidCallback onInfo;
  final Widget? menu;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: glassScrim(scheme, from: Alignment.topCenter),
      ),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(4, 4, 4, 16),
          child: Row(
            children: [
              GlassIconButton(
                key: const ValueKey('view-back'),
                icon: Icons.arrow_back,
                tooltip: '뒤로',
                onPressed: onBack,
              ),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.titleMedium
                      ?.copyWith(color: scheme.onSurface),
                ),
              ),
              GlassIconButton(
                key: const ValueKey('view-info'),
                icon: Icons.info_outline,
                tooltip: '창 정보',
                onPressed: onInfo,
              ),
              ?menu,
            ],
          ),
        ),
      ),
    );
  }
}

/// 감상 덮개 아이콘 버튼 모양(더보기 메뉴 단추도 같은 모양을 쓴다).
ButtonStyle glassIconButtonStyle(ColorScheme scheme) => IconButton.styleFrom(
  backgroundColor: scheme.surfaceContainerHigh,
  foregroundColor: scheme.onSurface,
  minimumSize: const Size(48, 48),
);

/// 어두운 덮개 위에 올리는 둥근 아이콘 버튼(48dp 이상).
class GlassIconButton extends StatelessWidget {
  const GlassIconButton({
    super.key,
    required this.icon,
    required this.tooltip,
    required this.onPressed,
  });

  final IconData icon;
  final String tooltip;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    // M3 filled tonal 아이콘 버튼(어두운 감상 테마의 표면 역할). 48dp.
    return IconButton.filledTonal(
      tooltip: tooltip,
      onPressed: onPressed,
      style: glassIconButtonStyle(Theme.of(context).colorScheme),
      icon: Icon(icon),
    );
  }
}

/// 덮개 아래쪽 바탕(위로 갈수록 투명해지는 어두운 띠)과 안쪽 여백.
class GlassBottomBar extends StatelessWidget {
  const GlassBottomBar({super.key, required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: glassScrim(
          scheme,
          from: Alignment.bottomCenter,
          strength: 0.85,
        ),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 32, 16, 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: children,
          ),
        ),
      ),
    );
  }
}
