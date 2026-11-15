import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../app/theme.dart';
import 'church_theme.dart';

/// 개발용 임시 유리(스테인드글라스 시안)의 Flutter 쪽 관문. `docs/church/GLASS_DEV_PIPELINE.md`
///
/// 시안은 실제 작품이 아닌 개발용 그림이다. **일반(배포) 빌드에는 들어가지도, 보이지도 않는다.**
///
/// * [enabled]은 컴파일 상수다: `--dart-define=ROSARIUM_DEV_GLASS=true`로 빌드한 개발용 APK
///   (`tools/build_dev_apk.sh`)에서만 true. 일반 빌드에서는 false라 아래 코드는 쓰이지 않는다.
/// * true일 때만 성당 장면 주소에 `devglass=1`을 붙인다([sceneUri]). 웹 쪽은 그 표시가 있고
///   `assets/church/dev/`(개발용 APK에만 들어가는 폴더)가 있을 때만 시안을 건다.
/// * 시안이 걸리면 장면이 `{e:'devGlass', church, placed, total, on}`을 보내고([handleRaw]),
///   성당 화면이 [DevGlassBadge]로 '개발용 임시 시안'을 표시한다. 창 정보 시트와는 연결하지 않는다.
abstract final class DevGlass {
  /// 개발용 임시 유리를 켠 빌드인가(컴파일 상수).
  static const bool enabled = bool.fromEnvironment('ROSARIUM_DEV_GLASS');

  /// 장면 주소에 붙이는 표시.
  static const String query = 'devglass=1';

  /// QA Gallery(시안 55장을 모두 건 개발용 방)의 성당 id.
  static const String qaGalleryChurch = 'qa_milan55';

  /// 지금 성당에 걸린 시안(없으면 null). 장면이 알려 준다.
  static final ValueNotifier<DevGlassState?> state = ValueNotifier(null);

  /// 개발용 빌드(안드로이드)에서 장면을 여는 주소: 번들 자산의 index.html 뒤에 `?devglass=1`.
  ///
  /// `loadFlutterAsset`은 질의 문자열을 받지 않으므로 자산의 file 주소를 직접 연다.
  /// 일반 빌드·다른 플랫폼에서는 null(평소처럼 `loadFlutterAsset`).
  static Uri? sceneUri(String assetPath, {String? church}) {
    if (!enabled) return null;
    return sceneUriFor(
      assetPath,
      church: church,
      android: !kIsWeb && defaultTargetPlatform == TargetPlatform.android,
    );
  }

  /// [sceneUri]의 순수 계산(시험용: [enabled]과 무관).
  @visibleForTesting
  static Uri? sceneUriFor(
    String assetPath, {
    String? church,
    required bool android,
  }) {
    if (!android) return null;
    final extra = church == null ? '' : '&church=${Uri.encodeQueryComponent(church)}';
    return Uri.parse(
      'file:///android_asset/flutter_assets/$assetPath?$query$extra',
    );
  }

  /// 장면이 보낸 `{e:'devGlass'}`를 처리한다(화면 이벤트로 만들지 않는다). 처리했으면 true.
  static bool handleRaw(String raw) {
    if (!raw.contains('"devGlass"')) return false;
    try {
      final j = jsonDecode(raw);
      if (j is! Map || j['e'] != 'devGlass') return false;
      // 일반 빌드에서는 어떤 경우에도 상태를 켜지 않는다(이중 확인).
      if (!enabled) return true;
      state.value = DevGlassState.fromJson(j);
      return true;
    } catch (_) {
      return false;
    }
  }
}

/// 한 성당에 걸린 시안의 요약.
@immutable
class DevGlassState {
  const DevGlassState({
    required this.church,
    required this.placed,
    required this.total,
    required this.on,
  });

  /// 장면이 보낸 값에서 만든다. 걸린 것이 없으면 null.
  static DevGlassState? fromJson(Map<dynamic, dynamic> j) {
    final placed = j['placed'], total = j['total'];
    final on = j['on'] == 1 || j['on'] == true;
    if (!on || placed is! num || placed <= 0) return null;
    return DevGlassState(
      church: j['church'] is String ? j['church'] as String : '',
      placed: placed.toInt(),
      total: total is num ? total.toInt() : placed.toInt(),
      on: true,
    );
  }

  final String church;
  final int placed;
  final int total;
  final bool on;

  /// 배지 문구.
  String get label => '개발용 임시 시안 · 실제 작품 아님 · $placed/$total';
}

/// 성당 장면 위의 한 줄 표시: '개발용 임시 시안'. 터치를 받지 않는다.
///
/// 색·모양은 성당 테마([ChurchTheme])의 M3 역할을 쓴다(오류 계열 표면 + 가는 테두리).
class DevGlassBadge extends StatelessWidget {
  const DevGlassBadge({super.key, this.notifier});

  /// 시험용 주입. 기본은 [DevGlass.state].
  final ValueListenable<DevGlassState?>? notifier;

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<DevGlassState?>(
      valueListenable: notifier ?? DevGlass.state,
      builder: (context, s, _) {
        if (s == null) return const SizedBox.shrink();
        const scheme = ChurchTheme.scheme;
        final text = Theme.of(context).textTheme.labelMedium;
        return IgnorePointer(
          child: Align(
            alignment: const Alignment(0, -0.52),
            child: Semantics(
              label: s.label,
              container: true,
              child: ExcludeSemantics(
                child: DecoratedBox(
                  key: const ValueKey('dev-glass-badge'),
                  decoration: ShapeDecoration(
                    color: scheme.errorContainer.withValues(alpha: 0.86),
                    shape: StadiumBorder(
                      side: BorderSide(color: scheme.outlineVariant),
                    ),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpace.sm,
                      vertical: AppSpace.xxs,
                    ),
                    child: Text(
                      s.label,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: text?.copyWith(color: scheme.onErrorContainer),
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}

/// QA Gallery: 시안 55장을 모두, 비율 그대로, 상태 이름표와 함께 건 개발용 방.
///
/// 성당 화면과 따로 도는 단순한 웹 보기다(서버·좌석·기도 없음). 웹 쪽 조작기(화면 왼쪽 끌기 =
/// 걷기, 오른쪽 끌기 = 둘러보기)를 그대로 쓴다. 개발용 빌드에서만 '더보기'에 들어가는 길이 생긴다.
class DevGlassGalleryScreen extends StatefulWidget {
  const DevGlassGalleryScreen({super.key});

  static const routeName = 'dev_glass_gallery';

  @override
  State<DevGlassGalleryScreen> createState() => _DevGlassGalleryScreenState();
}

class _DevGlassGalleryScreenState extends State<DevGlassGalleryScreen> {
  WebViewController? _controller;
  String? _error;

  @override
  void initState() {
    super.initState();
    final uri = DevGlass.sceneUri(
      'assets/church/index.html',
      church: DevGlass.qaGalleryChurch,
    );
    if (uri == null) {
      _error = '이 기기·빌드에서는 QA Gallery 를 열 수 없습니다(안드로이드 개발용 APK 전용).';
      return;
    }
    final c = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(ChurchTheme.scheme.surface)
      ..setNavigationDelegate(
        NavigationDelegate(
          onWebResourceError: (err) {
            if ((err.isForMainFrame ?? true) && mounted) {
              setState(() => _error = '장면을 열지 못했습니다: ${err.description}');
            }
          },
        ),
      );
    _controller = c;
    unawaited(
      c.loadRequest(uri).catchError((Object e) {
        if (mounted) setState(() => _error = '장면을 열지 못했습니다: $e');
      }),
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = _controller;
    return ChurchTheme.wrap(
      context,
      Builder(
        builder: (context) => Scaffold(
          appBar: AppBar(
            title: const Text('QA Gallery · 밀라노 시안 55'),
            bottom: const PreferredSize(
              preferredSize: Size.fromHeight(24),
              child: Padding(
                padding: EdgeInsets.only(bottom: AppSpace.xs),
                child: Text('개발용 임시 시안 · 실제 작품 아님'),
              ),
            ),
          ),
          body: _error != null || c == null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(AppSpace.lg),
                    child: Text(_error ?? '', textAlign: TextAlign.center),
                  ),
                )
              : WebViewWidget(controller: c),
        ),
      ),
    );
  }
}

/// '더보기'의 개발용 항목(개발용 빌드에서만 보인다). 일반 빌드에서는 아무것도 그리지 않는다.
class DevGlassMoreTile extends StatelessWidget {
  const DevGlassMoreTile({super.key, this.visible = DevGlass.enabled});

  /// 시험용: 보일지 여부(기본은 컴파일 상수).
  final bool visible;

  @override
  Widget build(BuildContext context) {
    if (!visible) return const SizedBox.shrink();
    return ListTile(
      key: const ValueKey('more-dev-glass-gallery'),
      leading: const Icon(Icons.science_outlined),
      title: const Text('QA Gallery · 밀라노 시안 55'),
      subtitle: const Text('개발용 임시 시안(실제 작품 아님) 55장과 배치 상태'),
      trailing: const Icon(Icons.chevron_right),
      onTap: () => unawaited(
        Navigator.of(context).push(
          MaterialPageRoute<void>(
            settings: const RouteSettings(
              name: DevGlassGalleryScreen.routeName,
            ),
            builder: (_) => const DevGlassGalleryScreen(),
          ),
        ),
      ),
    );
  }
}
