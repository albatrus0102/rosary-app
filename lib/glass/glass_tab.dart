import 'dart:async';

import 'package:flutter/material.dart';

import '../app/settings.dart';
import '../app/track.dart';
import '../church/church_host.dart';
import '../church/church_scene_controller.dart';
import '../church/church_tab.dart';
import 'glass_catalog.dart';
import 'glass_gallery.dart';
import 'glass_view_screen.dart';

/// 유리화 탭의 두 보기: 창(갤러리) | 성당(기존 성당 탭 내용).
enum GlassSegment { window, church }

/// '유리화' 탭(G-01): 위쪽 제목·[창 | 성당] 전환 아래에 갤러리 홈 또는 성당 흐름을 둔다.
///
/// 성당 보기는 '성당'을 처음 고를 때 만들고, 그 뒤로는 다른 탭이나 '창' 보기로 가도 남겨 둔다
/// (성당 안에 있던 자리·좌석·기도 카드가 그대로다). 보이지 않는 동안에는 [ChurchHost.visible]이
/// false가 되어 성당 화면이 장면 그리기·소리를 멈추고, 오래 안 보이면 접속과 장면을 놓았다가
/// 돌아올 때 같은 자리로 복원한다. 갤러리도 계속 둔다(필터·스크롤 유지).
class GlassTab extends StatefulWidget {
  const GlassTab({
    super.key,
    required this.settings,
    this.active = true,
    this.catalog,
    this.churchBuilder,
    this.sceneFactory,
    this.onOpenPrayer,
    this.initialSegment = GlassSegment.window,
  });

  final AppSettings settings;

  /// 이 탭이 지금 보이는가.
  final bool active;

  /// 시험용 주입. 없으면 앱 번들의 카탈로그를 읽는다.
  final Future<GlassCatalog>? catalog;

  /// 시험용 주입: 성당 보기 내용을 대신 만든다.
  final WidgetBuilder? churchBuilder;

  /// 시험용 주입: 창 감상 장면 컨트롤러 공장.
  final ChurchSceneController Function()? sceneFactory;

  /// 오늘의 묵주기도(오늘 탭)로 간다.
  final VoidCallback? onOpenPrayer;

  final GlassSegment initialSegment;

  @override
  State<GlassTab> createState() => _GlassTabState();
}

class _GlassTabState extends State<GlassTab> {
  late GlassSegment _segment = widget.initialSegment;
  late final Future<GlassCatalog> _catalog =
      widget.catalog ?? GlassCatalog.shared();
  bool _inChurch = false;

  /// 성당 보기를 한 번이라도 열었는가(그때 만들고, 그 뒤로는 남겨 둔다).
  late bool _churchBuilt = widget.initialSegment == GlassSegment.church;

  @override
  void didUpdateWidget(GlassTab old) {
    super.didUpdateWidget(old);
    if (old.active != widget.active &&
        widget.active &&
        _segment == GlassSegment.window) {
      Track.screen('glass_gallery');
    }
  }

  void _select(GlassSegment s) {
    if (s == _segment) return;
    setState(() {
      _segment = s;
      if (s == GlassSegment.church) _churchBuilt = true;
    });
    if (s == GlassSegment.window) Track.screen('glass_gallery');
  }

  void _open(GlassWindow w, String from) {
    unawaited(
      Navigator.of(context).push(
        MaterialPageRoute<void>(
          settings: const RouteSettings(name: 'glass_view'),
          builder: (_) => GlassViewScreen(
            window: w,
            settings: widget.settings,
            from: from,
            scene: widget.sceneFactory?.call(),
            onPray: widget.onOpenPrayer == null
                ? null
                : () => widget.onOpenPrayer!(),
          ),
        ),
      ),
    );
  }

  void _comingSoon() {
    ScaffoldMessenger.maybeOf(context)
        ?.showSnackBar(const SnackBar(content: Text('내 컬렉션은 다음 업데이트에서 만나요.')));
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final showHeader = !(_segment == GlassSegment.church && _inChurch);
    final gallery = FutureBuilder<GlassCatalog>(
      future: _catalog,
      builder: (context, snap) {
        if (snap.hasError) {
          return const _CatalogError();
        }
        final c = snap.data;
        if (c == null) {
          return const Center(child: CircularProgressIndicator());
        }
        return GlassGallery(
          catalog: c,
          onOpen: _open,
          onOpenPrayer: widget.onOpenPrayer == null
              ? null
              : (_) => widget.onOpenPrayer!(),
        );
      },
    );
    // 두 보기를 모두 살려 두고 하나만 보인다. 감싸는 위젯의 모양은 바뀌지 않게 한다
    // (모양이 바뀌면 성당 화면이 새로 만들어져 다시 입장하게 된다).
    final Widget body = Stack(
      fit: StackFit.expand,
      children: [
        _Kept(
          show: _segment == GlassSegment.window,
          // 머리줄이 위쪽 안전 영역을 이미 썼다.
          child: MediaQuery.removePadding(
            context: context,
            removeTop: true,
            child: gallery,
          ),
        ),
        if (_churchBuilt)
          _Kept(
            show: _segment == GlassSegment.church,
            child: ChurchHost(
              visible: widget.active && _segment == GlassSegment.church,
              onInChurchChanged: (v) {
                if (mounted && _inChurch != v) setState(() => _inChurch = v);
              },
              // 성당 화면들은 자기 앱 바가 있어 위쪽 안전 영역을 한 번만 쓰게 한다.
              child: MediaQuery.removePadding(
                context: context,
                removeTop: showHeader,
                child: Builder(
                  builder: (context) =>
                      widget.churchBuilder?.call(context) ??
                      ChurchTab(
                        key: const ValueKey('church-tab'),
                        settings: widget.settings,
                      ),
                ),
              ),
            ),
          ),
      ],
    );

    return PopScope(
      // 성당 보기에서 뒤로 가면 창 보기로 돌아온다(탭 자체의 뒤로는 셸이 처리한다).
      canPop: _segment == GlassSegment.window,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop && _segment == GlassSegment.church) {
          _select(GlassSegment.window);
        }
      },
      child: Material(
        color: scheme.surface,
        child: Column(
          children: [
            if (showHeader)
              _Header(
                segment: _segment,
                onSegment: _select,
                onFavorites: _comingSoon,
              ),
            Expanded(child: body),
          ],
        ),
      ),
    );
  }
}

/// 보이지 않아도 상태를 그대로 두는 자리: 그리지 않고, 터치·포커스·애니메이션을 끈다.
class _Kept extends StatelessWidget {
  const _Kept({required this.show, required this.child});

  final bool show;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Offstage(
      offstage: !show,
      child: TickerMode(
        enabled: show,
        child: ExcludeFocus(excluding: !show, child: child),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({
    required this.segment,
    required this.onSegment,
    required this.onFavorites,
  });

  final GlassSegment segment;
  final ValueChanged<GlassSegment> onSegment;
  final VoidCallback onFavorites;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return SafeArea(
      bottom: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 8, 8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Semantics(
                    header: true,
                    child: Text('스테인드글라스', style: theme.textTheme.titleLarge),
                  ),
                ),
                // 내 컬렉션(즐겨찾기)은 G2. 자리만 둔다.
                IconButton(
                  key: const ValueKey('glass-favorites'),
                  tooltip: '내 컬렉션',
                  onPressed: onFavorites,
                  icon: const Icon(Icons.favorite_border),
                ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: SegmentedButton<GlassSegment>(
                key: const ValueKey('glass-segment'),
                showSelectedIcon: false,
                segments: const [
                  ButtonSegment(
                    value: GlassSegment.window,
                    label: Text('창'),
                    icon: Icon(Icons.window_outlined),
                  ),
                  ButtonSegment(
                    value: GlassSegment.church,
                    label: Text('성당'),
                    icon: Icon(Icons.church_outlined),
                  ),
                ],
                selected: {segment},
                onSelectionChanged: (s) => onSegment(s.first),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CatalogError extends StatelessWidget {
  const _CatalogError();

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Padding(
        padding: EdgeInsets.all(32),
        child: Text(
          '창 목록을 불러오지 못했습니다. 앱을 다시 열어 주세요.',
          textAlign: TextAlign.center,
        ),
      ),
    );
  }
}
