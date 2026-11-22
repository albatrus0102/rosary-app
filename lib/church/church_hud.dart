import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';

import '../app/theme.dart';
import 'church_touch_trace.dart';
import 'net/church_net.dart';

/// 3D 장면 위 HUD 의 M3 표면 규칙(2026-11 성당 테마 재디자인).
///
/// 성당 화면은 [ChurchTheme](어두운 먹색 + 촛불 금색)을 쓰고, 장면 위에 떠 있는 것은 모두 이 규칙을 따른다.
/// - **표면**: `surface` 를 [surfaceOpacity] 만큼만 비치게 한 어두운 표면. 불투명도는 가장 밝은 장면
///   (흰 대리석) 위에서도 글자·아이콘 대비가 WCAG AA(4.5:1)를 넘도록 정한 토큰이다
///   (`test/church_theme_test.dart`가 흰 바탕과 섞은 최악의 경우를 검사한다).
/// - **테두리**: 가는 금색 선(1dp, `outlineVariant`). 그림자 대신 이 선이 표면의 가장자리를 만든다.
/// - **전경**: 글자는 `onSurface`/`onSurfaceVariant`, 선 아이콘과 누를 수 있는 글자는 `primary`(금색).
/// - **모양**: 이름판은 large(16), 정보 칩은 small(8), 도구 줄은 extra large(28), 안내는 extra small(4).
/// - 높이는 level 2(3dp)로 통일한다.
abstract final class ChurchHudStyle {
  /// HUD 표면의 불투명도(장면이 14%만 비친다).
  static const double surfaceOpacity = 0.86;

  /// HUD 표면색(이름판·도구 줄·칩·안내·기도 카드).
  static Color surface(ColorScheme s) =>
      s.surface.withValues(alpha: surfaceOpacity);

  /// 가는 금색 테두리.
  static BorderSide border(ColorScheme s) =>
      BorderSide(color: s.outlineVariant);

  /// 떠 있는 HUD 의 높이(M3 elevation level 2 = 3dp).
  static const double elevation = 3;

  /// 이름판·기도 카드(M3 large).
  static ShapeBorder plaque(ColorScheme s) =>
      RoundedRectangleBorder(borderRadius: AppShape.large, side: border(s));

  /// 정보 칩·띠(M3 small).
  static ShapeBorder chip(ColorScheme s) =>
      RoundedRectangleBorder(borderRadius: AppShape.small, side: border(s));

  /// 도구 줄(M3 extra large).
  static ShapeBorder bar(ColorScheme s) => RoundedRectangleBorder(
    borderRadius: AppShape.extraLarge,
    side: border(s),
  );

  /// 짧은 안내 말풍선(M3 extra small).
  static ShapeBorder note(ColorScheme s) => RoundedRectangleBorder(
    borderRadius: AppShape.extraSmall,
    side: border(s),
  );

  /// 띠·기도 카드의 최대 폭(넓은 화면에서 장면을 가로로 다 덮지 않게 한다).
  static const double panelMaxWidth = 560;

  /// 도구 줄 항목(아이콘 + 아래 짧은 라벨)의 최소 크기. 터치 타깃 48dp 이상.
  static const Size barItemSize = Size(56, 56);

  /// 아이콘 아래 라벨은 글자 크기 설정을 이 배율까지만 따른다(M3 내비게이션 바 라벨과 같은 이유:
  /// 줄 폭이 고정이다). 전체 문구는 툴팁·스크린리더 라벨이 전한다.
  static const double labelMaxScale = 1.3;

  /// 고정 이동 손잡이: 화면 구석에 고정된 HUD 라 성당 테마를 쓴다(어두운 반투명 `surface` 바탕 +
  /// 반투명 금색 `primary` 테두리·손잡이). 그림자는 테마의 `shadow`.
  static const double stickFillOpacity = 0.18;
  static const double stickFillHeldOpacity = 0.32;
  static const double stickRingOpacity = 0.7;
  static const double stickKnobOpacity = 0.6;
  static const double stickShadowOpacity = 0.3;
}

/// 상단 왼쪽 이름판: 성당 이름 + 접속 상태(+ 부제).
///
/// 이름판은 두 구역으로 나뉜다. 왼쪽(성당 이름 + 인원)을 누르면 '지금 접속 중' 시트
/// ([onShowPresence]), 오른쪽 ↔ 아이콘을 누르면 '성당 바꾸기'([onChangeChurch]).
///
/// 접속자 수는 online일 때만 보인다. 혼자 모드/오프라인에서는 숫자를 보이지 않는다.
/// [subtitle]은 둘째 줄 상태 뒤에 붙는 짧은 부제(예: 전례 시기)이고, 없으면 자리를 차지하지 않는다.
class ChurchStatusChip extends StatelessWidget {
  const ChurchStatusChip({
    super.key,
    required this.churchName,
    required this.state,
    required this.count,
    this.subtitle,
    this.onChangeChurch,
    this.onShowPresence,
    this.onHelp,
    this.compact = false,
  });

  /// 있으면 이름판 맨 오른쪽에 '사용법 다시 보기' 단추를 둔다(성당 첫 입장 안내를 다시 본다). 접힌 모습에서는 숨는다.
  final VoidCallback? onHelp;

  /// 접힌 모습: 성당 이름 한 줄만(상태·부제 줄은 숨긴다. 스크린리더 라벨에는 그대로 들어간다).
  final bool compact;

  final String churchName;
  final NetState state;
  final int count;

  /// 상태 뒤에 '· 부제'로 붙는 짧은 글(예: '대림 시기'). 스크린리더 라벨에도 들어간다.
  final String? subtitle;
  final VoidCallback? onChangeChurch;
  final VoidCallback? onShowPresence;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    final online = state == NetState.online;
    final String statusText = online
        ? '$count명'
        : state == NetState.connecting
        ? '연결 중…'
        : '혼자 모드';
    final sub = subtitle;
    final hasSub = sub != null && sub.isNotEmpty;
    final statusStyle = text.labelMedium?.copyWith(
      color: scheme.onSurfaceVariant,
    );
    final status = Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (online) ...[
          Container(
            key: const ValueKey('presence-dot'),
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              color: scheme.primary,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: AppSpace.xs),
        ],
        Flexible(
          child: Text(
            statusText,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: statusStyle,
          ),
        ),
        if (hasSub)
          Flexible(
            child: Text(
              ' · $sub',
              key: const ValueKey('status-subtitle'),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: statusStyle,
            ),
          ),
        if (onShowPresence != null)
          // 누르면 접속자 시트가 열린다는 작은 표시.
          Icon(
            Icons.expand_more,
            key: const ValueKey('presence-chevron'),
            size: 16,
            color: scheme.onSurfaceVariant,
          ),
      ],
    );
    final stateLabel = online ? '$count명 접속 중' : statusText;
    return Material(
      color: ChurchHudStyle.surface(scheme),
      shape: ChurchHudStyle.plaque(scheme),
      clipBehavior: Clip.antiAlias,
      elevation: ChurchHudStyle.elevation,
      child: ConstrainedBox(
        constraints: BoxConstraints(minHeight: compact ? 48 : 56),
        child: IntrinsicHeight(
          child: Row(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Flexible(
                child: Semantics(
                  container: true,
                  button: onShowPresence != null,
                  label: hasSub
                      ? '$churchName, $stateLabel, $sub'
                      : '$churchName, $stateLabel',
                  hint: onShowPresence != null ? '접속 중인 사람 보기' : null,
                  onTap: onShowPresence,
                  child: ExcludeSemantics(
                    child: InkWell(
                      key: const ValueKey('presence-chip'),
                      onTap: onShowPresence,
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(
                          AppSpace.sm,
                          AppSpace.xxs,
                          AppSpace.xs,
                          AppSpace.xxs,
                        ),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          mainAxisAlignment: MainAxisAlignment.center,
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              churchName,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style:
                                  (compact ? text.titleSmall : text.titleMedium)
                                      ?.copyWith(color: scheme.onSurface),
                            ),
                            if (!compact) status,
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              VerticalDivider(
                width: 1,
                thickness: 1,
                indent: AppSpace.xs,
                endIndent: AppSpace.xs,
                color: scheme.outlineVariant,
              ),
              Tooltip(
                message: '성당 바꾸기',
                child: InkWell(
                  onTap: onChangeChurch,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 14),
                    child: Icon(
                      Icons.swap_horiz,
                      size: 22,
                      color: scheme.primary,
                    ),
                  ),
                ),
              ),
              if (onHelp != null && !compact) ...[
                VerticalDivider(
                  width: 1,
                  thickness: 1,
                  indent: AppSpace.xs,
                  endIndent: AppSpace.xs,
                  color: scheme.outlineVariant,
                ),
                Tooltip(
                  message: '사용법 다시 보기',
                  child: Semantics(
                    button: true,
                    label: '사용법 다시 보기',
                    excludeSemantics: true,
                    child: InkWell(
                      key: const ValueKey('hud-help'),
                      onTap: onHelp,
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 14),
                        child: Icon(
                          Icons.help_outline,
                          size: 22,
                          color: scheme.primary,
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

/// 도구 줄의 한 항목: 금색 선 아이콘 + 아래 짧은 라벨. M3 텍스트 버튼(상태 레이어·포커스·터치 타깃)을 쓴다.
/// [emphasized]면 아이콘 뒤에 `primaryContainer` 표시기(M3 내비게이션 표시기 모양)를 둔다.
class _HudBarButton extends StatelessWidget {
  const _HudBarButton({
    required this.icon,
    required this.label,
    required this.onPressed,
    this.tooltip,
    this.emphasized = false,
    this.width,
  });

  final IconData icon;
  final String label;
  final String? tooltip;
  final VoidCallback onPressed;
  final bool emphasized;

  /// 좁은 화면에서 도구 줄이 정한 항목 폭(48dp 이상). null 이면 기본 폭([ChurchHudStyle.barItemSize]).
  /// 이 폭에서는 표시기와 라벨이 함께 줄어든다(라벨은 [FittedBox]로 글자 크기만 줄인다).
  final double? width;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    final w = width;
    final pad = w == null ? AppSpace.xxs : 2.0;
    final indicatorW = w == null ? 48.0 : (w - pad * 2).clamp(32.0, 48.0);
    final labelText = Text(
      label,
      maxLines: 1,
      style: text.labelMedium?.copyWith(color: scheme.onSurface),
    );
    final button = TextButton(
      onPressed: onPressed,
      style: TextButton.styleFrom(
        minimumSize: w == null
            ? ChurchHudStyle.barItemSize
            : Size(w, ChurchHudStyle.barItemSize.height),
        maximumSize: w == null ? null : Size(w, double.infinity),
        padding: EdgeInsets.symmetric(
          horizontal: pad,
          vertical: AppSpace.xxs,
        ),
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(20)),
        ),
        foregroundColor: scheme.onSurface,
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          DecoratedBox(
            decoration: ShapeDecoration(
              color: emphasized ? scheme.primaryContainer : null,
              shape: AppShape.full,
            ),
            child: SizedBox(
              width: indicatorW,
              height: 28,
              child: Icon(
                icon,
                size: 24,
                color: emphasized ? scheme.onPrimaryContainer : scheme.primary,
              ),
            ),
          ),
          const SizedBox(height: 2),
          MediaQuery.withClampedTextScaling(
            maxScaleFactor: ChurchHudStyle.labelMaxScale,
            // 좁은 폭: 라벨이 항목 폭보다 길면 글자만 줄인다(항목·터치 타깃은 그대로).
            child: w == null
                ? labelText
                : FittedBox(fit: BoxFit.scaleDown, child: labelText),
          ),
        ],
      ),
    );
    final tip = tooltip;
    return tip == null ? button : Tooltip(message: tip, child: button);
  }
}

/// 위쪽 도구 줄(하나의 어두운 표면 위): 소리, 아바타 편집, 인사/이모트, 그리고 [onGo]가 있으면
/// 구분선 뒤에 '가기'([ChurchGoButton]). 항목마다 금색 선 아이콘 아래 짧은 라벨이 있다.
class ChurchTopActions extends StatelessWidget {
  const ChurchTopActions({
    super.key,
    required this.ambientOn,
    required this.onToggleAmbient,
    required this.onEditAvatar,
    required this.onEmote,
    this.onGo,
    this.onCollapse,
  });

  /// 있으면 줄 끝에 '메뉴 접기' 단추를 둔다(접으면 [ChurchHudMenuButton] 하나만 남는다).
  final VoidCallback? onCollapse;

  final bool ambientOn;
  final VoidCallback onToggleAmbient;
  final VoidCallback onEditAvatar;
  final ValueChanged<int> onEmote;

  /// 걸어 다닐 수 있을 때만 준다(앉아 있으면 null → '가기'가 없다).
  final VoidCallback? onGo;

  static const emoteLabels = ['인사', '성호경', '고개 숙임'];

  /// 항목 폭의 하한(M3 터치 타깃 48dp).
  static const double minItemWidth = 48;

  /// 줄 안 항목(소리·아바타·인사·가기) 말고 고정 폭: 좌우 안쪽 여백 + 구분선 + 접기 단추.
  double _fixedWidth() =>
      AppSpace.xs * 2 +
      (onGo != null ? AppSpace.xs + 1 : 0) +
      (onCollapse != null ? 48 : 0);

  /// 줄이 [maxWidth] 안에 들어가게 하는 항목 폭. 기본 폭으로 들어가면 null(예전 그대로).
  /// 320dp 폰처럼 좁으면 항목을 똑같이 줄이되 48dp 아래로는 줄이지 않는다(라벨 글자는 [_HudBarButton]이 줄인다).
  double? itemWidthFor(double maxWidth) {
    if (!maxWidth.isFinite) return null;
    final n = onGo != null ? 4 : 3;
    final full = _fixedWidth() + n * ChurchHudStyle.barItemSize.width;
    if (maxWidth >= full) return null;
    final w = ((maxWidth - _fixedWidth()) / n).floorToDouble();
    return w < minItemWidth ? minItemWidth : w;
  }

  @override
  Widget build(BuildContext context) {
    // 넓은 화면(이름판 옆)에서는 폭 제한이 없고, 폰 폭(이름판 아래 오른쪽)에서는 남은 폭 안에 들어가야 한다.
    return LayoutBuilder(
      builder: (context, constraints) =>
          _buildBar(context, itemWidthFor(constraints.maxWidth)),
    );
  }

  Widget _buildBar(BuildContext context, double? itemW) {
    final scheme = Theme.of(context).colorScheme;
    final go = onGo;
    return Material(
      color: ChurchHudStyle.surface(scheme),
      shape: ChurchHudStyle.bar(scheme),
      clipBehavior: Clip.antiAlias,
      elevation: ChurchHudStyle.elevation,
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpace.xs,
          vertical: AppSpace.xxs,
        ),
        child: IntrinsicHeight(
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              _HudBarButton(
                tooltip: ambientOn ? '소리 끄기' : '소리 켜기',
                onPressed: onToggleAmbient,
                icon: ambientOn
                    ? Icons.volume_up_outlined
                    : Icons.volume_off_outlined,
                label: '소리',
                width: itemW,
              ),
              _HudBarButton(
                tooltip: '아바타 편집',
                onPressed: onEditAvatar,
                icon: Icons.face_outlined,
                label: '아바타',
                width: itemW,
              ),
              PopupMenuButton<int>(
                tooltip: '인사',
                onSelected: onEmote,
                position: PopupMenuPosition.under,
                itemBuilder: (context) => [
                  for (var i = 0; i < emoteLabels.length; i++)
                    PopupMenuItem<int>(value: i, child: Text(emoteLabels[i])),
                ],
                // 누르는 것은 안쪽 버튼이 받아 메뉴를 연다(상태 레이어·터치 타깃을 다른 항목과 같게).
                child: Builder(
                  builder: (context) => _HudBarButton(
                    onPressed: () => context
                        .findAncestorStateOfType<PopupMenuButtonState<int>>()
                        ?.showButtonMenu(),
                    icon: Icons.waving_hand_outlined,
                    label: '인사',
                    width: itemW,
                  ),
                ),
              ),
              if (go != null) ...[
                VerticalDivider(
                  width: AppSpace.xs + 1,
                  thickness: 1,
                  indent: AppSpace.xs,
                  endIndent: AppSpace.xs,
                  color: scheme.outlineVariant,
                ),
                ChurchGoButton(
                  key: const ValueKey('go-button'),
                  onPressed: go,
                  width: itemW,
                ),
              ],
              if (onCollapse != null)
                Semantics(
                  button: true,
                  label: '메뉴 접기',
                  excludeSemantics: true,
                  child: IconButton(
                    key: const ValueKey('hud-collapse'),
                    tooltip: '메뉴 접기',
                    onPressed: onCollapse,
                    constraints: const BoxConstraints(
                      minWidth: 48,
                      minHeight: 48,
                    ),
                    color: scheme.onSurfaceVariant,
                    icon: const Icon(Icons.chevron_right),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

/// 접힌 메뉴: 도구 줄이 줄어든 모습(같은 어두운 알약 + 흐린 소리·아바타·인사 아이콘 + 펼치기 화살표).
/// 아무것도 안 보이는 단추가 아니라 '이 줄이 접혀 있다'고 읽히므로, 누르면 펼쳐진다는 것이 바로 보인다.
/// 알약 전체가 하나의 누르는 자리(높이 48dp)다.
class ChurchHudMenuButton extends StatelessWidget {
  const ChurchHudMenuButton({super.key, required this.onPressed});

  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final faint = scheme.onSurfaceVariant.withValues(alpha: 0.55);
    return Semantics(
      button: true,
      label: '메뉴 펼치기',
      excludeSemantics: true,
      child: Tooltip(
        message: '메뉴 펼치기',
        child: Material(
          color: ChurchHudStyle.surface(scheme),
          shape: ChurchHudStyle.bar(scheme),
          clipBehavior: Clip.antiAlias,
          elevation: ChurchHudStyle.elevation,
          child: InkWell(
            key: const ValueKey('hud-expand'),
            onTap: onPressed,
            child: ConstrainedBox(
              constraints: const BoxConstraints(minHeight: 48, minWidth: 48),
              child: Padding(
                padding: const EdgeInsets.only(left: AppSpace.sm),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    for (final i in const [
                      Icons.volume_up_outlined,
                      Icons.face_outlined,
                      Icons.waving_hand_outlined,
                    ])
                      Padding(
                        padding: const EdgeInsets.only(right: AppSpace.xs),
                        child: Icon(i, size: 18, color: faint),
                      ),
                    SizedBox(
                      width: 40,
                      height: 48,
                      child: Icon(
                        Icons.chevron_left,
                        size: 28,
                        color: scheme.primary,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// '가기' 항목(지도 핀 선 아이콘 + 라벨): 촛불 봉헌대·제대 앞·빈 자리·입구로 바로 걸어간다.
/// 도구 줄의 마지막 칸이며, 가장 자주 쓰는 길이라 금색 표시기로 강조한다.
class ChurchGoButton extends StatelessWidget {
  const ChurchGoButton({super.key, required this.onPressed, this.width});

  final VoidCallback onPressed;

  /// 좁은 도구 줄의 항목 폭([_HudBarButton.width]). null 이면 기본 폭.
  final double? width;

  @override
  Widget build(BuildContext context) {
    return _HudBarButton(
      onPressed: onPressed,
      icon: Icons.place_outlined,
      label: '가기',
      emphasized: true,
      width: width,
    );
  }
}

/// 오른쪽 아래 상황 버튼(하나만): 제대 앞/성수대에 서 있으면 '기도하기'/'성호 긋기'(한 번 누르면 그 자리에서는 사라진다),
/// 가까이 앉을 자리가 있으면 '앉기', 촛불대가 있으면 '초 켜기', 아무것도 없으면 숨는다.
/// 앉은 동안의 '일어나기'는 기도 카드의 같은 자리(오른쪽 아래)에 있다.
/// 행동은 그 자리에 서 있어야만 나온다(멀리서 하는 방법은 없다).
enum ChurchAction { none, sit, light, pray, cross }

class ChurchContextAction extends StatelessWidget {
  const ChurchContextAction({
    super.key,
    required this.action,
    required this.onPressed,
  });

  final ChurchAction action;
  final VoidCallback onPressed;

  /// [station]은 아직 하지 않은 스테이션 동작('altar'|'font')이다. 있으면 그것을 먼저 보여 주고,
  /// 자리와 촛불대가 모두 가까우면 자리(더 좁은 반경)를 먼저 보여 준다.
  static ChurchAction forNear({
    required bool canSit,
    required bool canLight,
    String? station,
  }) {
    if (station == 'altar') return ChurchAction.pray;
    if (station == 'font') return ChurchAction.cross;
    return canSit
        ? ChurchAction.sit
        : (canLight ? ChurchAction.light : ChurchAction.none);
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedSwitcher(
      // M3 모션: short4(200ms) + 표준 곡선, '동작 줄이기'면 즉시.
      duration: AppMotion.of(context, Durations.short4),
      switchInCurve: Easing.standardDecelerate,
      switchOutCurve: Easing.standardAccelerate,
      transitionBuilder: (child, anim) => FadeTransition(
        opacity: anim,
        child: ScaleTransition(scale: anim, child: child),
      ),
      child: switch (action) {
        ChurchAction.none => const SizedBox(
          key: ValueKey('ctx-none'),
          width: 0,
          height: 0,
        ),
        ChurchAction.sit => _button(
          const ValueKey('ctx-sit'),
          Icons.event_seat_outlined,
          '앉기',
        ),
        ChurchAction.light => _button(
          const ValueKey('ctx-light'),
          Icons.local_fire_department_outlined,
          '초 켜기',
        ),
        ChurchAction.pray => _button(
          const ValueKey('ctx-pray'),
          Icons.self_improvement_outlined,
          '기도하기',
        ),
        ChurchAction.cross => _button(
          const ValueKey('ctx-cross'),
          Icons.add,
          '성호 긋기',
        ),
      },
    );
  }

  Widget _button(Key key, IconData icon, String label) => FilledButton.icon(
    key: key,
    onPressed: onPressed,
    // 장면 위 주 행동: M3 filled 버튼(성당 테마의 primary = 촛불 금색, 기본 full 모양) + level 2 높이.
    style: FilledButton.styleFrom(
      minimumSize: const Size(112, 64),
      padding: const EdgeInsets.symmetric(horizontal: AppSpace.md),
      elevation: ChurchHudStyle.elevation,
    ),
    icon: Icon(icon),
    label: Text(label),
  );
}

/// HUD 정보 칩의 공통 틀: 어두운 표면 + 금색 가는 테두리, 최소 높이 48, 누르면 [onTap].
class ChurchHudChip extends StatelessWidget {
  const ChurchHudChip({super.key, required this.onTap, required this.child});

  final VoidCallback onTap;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Material(
      color: ChurchHudStyle.surface(scheme),
      shape: ChurchHudStyle.chip(scheme),
      clipBehavior: Clip.antiAlias,
      elevation: ChurchHudStyle.elevation,
      child: InkWell(
        onTap: onTap,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 48),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpace.sm),
            child: child,
          ),
        ),
      ),
    );
  }
}

/// 자동 걷기 중에 뜨는 작은 칩: '걷는 중… (취소)'. 누르면 멈춘다.
class ChurchWalkChip extends StatelessWidget {
  const ChurchWalkChip({super.key, required this.onCancel});

  final VoidCallback onCancel;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    return ChurchHudChip(
      onTap: onCancel,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.directions_walk_outlined, size: 20, color: scheme.primary),
          const SizedBox(width: AppSpace.xs),
          Flexible(
            child: Text(
              '걷는 중… (취소)',
              style: text.labelLarge?.copyWith(color: scheme.onSurface),
            ),
          ),
        ],
      ),
    );
  }
}

/// 성당 안의 진본 사진 창 앞에 서거나 창을 누르면 뜨는 칩(G-29): '이 창: ○○ · 자세히 보기'.
/// 누르면 창 정보(출처·설명)를 연다. 도구 줄 아래 왼쪽에 놓여 다른 HUD와 겹치지 않는다.
class ChurchGlassChip extends StatelessWidget {
  const ChurchGlassChip({super.key, required this.title, required this.onTap});

  /// 창 이름(스테인드글라스 카탈로그의 한국어 제목).
  final String title;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    return Semantics(
      button: true,
      label: '이 창: $title. 자세히 보기',
      excludeSemantics: true,
      child: ChurchHudChip(
        onTap: onTap,
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.auto_awesome_mosaic_outlined,
              size: 20,
              color: scheme.primary,
            ),
            const SizedBox(width: AppSpace.xs),
            Flexible(
              child: Text(
                '이 창: $title',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: text.labelLarge?.copyWith(color: scheme.onSurface),
              ),
            ),
            const SizedBox(width: AppSpace.xs),
            Text(
              '자세히 보기',
              style: text.labelMedium?.copyWith(color: scheme.primary),
            ),
            Icon(Icons.chevron_right, size: 18, color: scheme.primary),
          ],
        ),
      ),
    );
  }
}

/// HUD 안내 말풍선의 공통 틀(M3 rich tooltip 규칙: 표면색 + onSurface, extra small 모서리).
class _HudNote extends StatelessWidget {
  const _HudNote({super.key, required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    return DecoratedBox(
      decoration: ShapeDecoration(
        color: ChurchHudStyle.surface(scheme),
        shape: ChurchHudStyle.note(scheme),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpace.xs,
          vertical: AppSpace.xxs,
        ),
        child: Text(
          message,
          style: text.bodySmall?.copyWith(color: scheme.onSurface),
        ),
      ),
    );
  }
}

/// 처음 한 번 뜨는 '가기' 안내 말풍선(6초 뒤 또는 처음 쓰면 사라진다).
/// 3D 이름표·표식이 뜨는 위쪽을 가리지 않도록 오른쪽 아래(상황 버튼 위)에 놓는다.
/// 폭은 왼쪽 이동 안내(왼쪽 16 + 140 + 간격 8)와 겹치지 않게 줄이고, 260을 넘지 않는다.
class ChurchWalkHint extends StatelessWidget {
  const ChurchWalkHint({super.key});

  static const message = '가기 버튼으로 촛불 봉헌대·제대 앞에 바로 갈 수 있어요';

  @override
  Widget build(BuildContext context) {
    final maxW = (MediaQuery.sizeOf(context).width - 16 - 164).clamp(
      120.0,
      260.0,
    );
    return IgnorePointer(
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: maxW),
        child: const _HudNote(key: ValueKey('walk-hint'), message: message),
      ),
    );
  }
}

/// 고정 이동 손잡이(조이스틱) + 걷는 동안 3D 화면 위의 **모든 손가락**을 맡는 입력 층.
///
/// 화면 아래 한쪽 구석([rightSide]면 오른쪽)의 원 안에서 닿은 손가락은 이동(끌면 [-1,1], y > 0 이 앞 = 위로 끌기,
/// 갱신은 최대 30Hz, 손을 떼면 가운데로 돌아가며 (0,0)을 한 번 보냄)이고, 그 밖의 손가락은 여기서 읽어 웹에 보낸다:
/// 한 손가락 끌기 = 시점 회전([onLook] dx·dy), 두 손가락 = 확대/축소([onLook] k), 짧은 탭 = 표식 누르기([onTap]).
///
/// 왜 앱이 다 맡는가: 안드로이드에서 웹뷰는 플랫폼 뷰라 Flutter 가 손가락을 넘겨 줄 때 `_AndroidMotionEventConverter`
/// 가 원래 MotionEvent 의 손가락 수(`platformData`)와 웹뷰가 아는 손가락 수가 다르면 ACTION_MOVE 를 버린다
/// (flutter/lib/src/services/platform_views.dart `toAndroidMotionEvent`: `pointerIdx != originalPointerCount - 1`).
/// 손잡이 손가락은 Flutter 만 보므로, 손잡이를 잡은 채로는 웹뷰가 다른 손가락의 움직임을 하나도 받지 못한다.
/// 그래서 손가락을 웹뷰에 나눠 주지 않고(불투명 Listener) 이 층이 역할을 정해 짧은 메시지로 보낸다.
/// HUD 버튼은 이 층보다 위(Stack 뒤쪽)에 두어 터치를 먼저 받는다. 앉아 있는 동안(이 층이 없음)은 웹이 직접 받는다.
///
/// 역할: 원 안에서 처음 닿은 손가락 = stick(하나뿐), 그 밖 = view. view 가 하나면 look, 둘 이상이면 앞의 둘로 pinch.
/// 어느 순서로 닿고 떼어도 각 손가락은 제 역할을 이어 간다(시점이 튀지 않게 늘 직전 위치와의 차이만 보낸다).
class ChurchMoveZone extends StatefulWidget {
  const ChurchMoveZone({
    super.key,
    required this.onChanged,
    this.size = 132,
    this.minInterval = const Duration(milliseconds: 33),
    this.hint,
    this.onTap,
    this.onTouchDown,
    this.onLook,
    this.onZone,
    this.rightSide = false,
    this.insets = EdgeInsets.zero,
  });

  /// 손잡이와 화면 가장자리 사이 여백.
  static const double margin = AppSpace.sm;

  /// 손잡이가 차지하는 폭(여백 포함): 같은 줄의 다른 HUD 가 이만큼 비켜 선다.
  static const double reserve = 132 + margin + AppSpace.xs;

  /// 탭으로 치는 최대 움직임(논리 px)과 시간.
  static const double tapSlop = 12;
  static const Duration tapTime = Duration(milliseconds: 450);

  final void Function(double x, double y) onChanged;

  /// 거의 끌지 않고 짧게 눌렀다 뗀 '탭'(화면 좌표). 손잡이 위든 장면 위든 웹 장면의 표식을 누르는 데 쓴다.
  /// 장면 위의 탭은 그 손가락 혼자(닿을 때 다른 손가락이 없고, 떼기 전에 다른 손가락도 닿지 않음)일 때만.
  final ValueChanged<Offset>? onTap;

  /// 손잡이에 손이 닿을 때(자동 걷기를 멈추는 데 쓴다).
  final VoidCallback? onTouchDown;

  /// 시점·확대 입력. `on`: 장면 손가락이 닿기 시작(true)/모두 떨어짐(false),
  /// `dx`·`dy`: 한 손가락 끌기량(논리 px), `k`: 두 손가락 사이 거리 배율(>1 벌림).
  final void Function({bool? on, double dx, double dy, double k})? onLook;

  /// 손잡이 원의 실제 자리(이 위젯 좌표 = 웹 화면 좌표)가 정해지거나 바뀔 때(처음·펴고 접기·안전 영역 변화) 부른다.
  final void Function(Offset center, double radius)? onZone;

  /// 손잡이 지름(120~140dp).
  final double size;
  final Duration minInterval;

  /// 오른쪽 아래에 둔다(설정 '조이스틱 위치').
  final bool rightSide;

  /// 안전 영역(상태 바·제스처 바·접힌 화면의 여백).
  final EdgeInsets insets;

  /// 처음 한 번 보이는 안내 문구(손잡이를 한 번 쓰면 사라진다).
  final String? hint;

  @override
  State<ChurchMoveZone> createState() => _ChurchMoveZoneState();
}

/// 이 층이 맡은 손가락 하나.
class _Ptr {
  _Ptr(this.pos, this.at, {required this.alone}) : down = pos;
  Offset pos;
  final Offset down;
  final Duration at;
  bool alone;
  double moved = 0;
  int lastTraceMs = 0;
}

class _ChurchMoveZoneState extends State<ChurchMoveZone> {
  Offset _knob = Offset.zero; // -1..1 (화면 좌표: y 아래가 +)
  int? _pointer; // 손잡이를 잡은 손가락
  Timer? _pending;
  final Stopwatch _clock = Stopwatch()..start();
  Duration? _lastSent;
  bool _dirty = false;
  bool _sent = false;
  bool _used = false;
  Offset _downAt = Offset.zero;
  double _maxDrag = 0;
  Duration _downTime = Duration.zero;

  /// 지금 이 층에 닿아 있는 모든 손가락(HUD 버튼 위의 것은 HUD 가 먼저 받아 여기 오지 않는다).
  final Map<int, _Ptr> _pts = {};

  /// 장면(view) 손가락: 닿은 순서. 하나면 시점, 둘 이상이면 앞의 둘로 확대.
  final List<int> _views = [];
  bool _lookOn = false;
  double _pinchDist = 0;

  Size _area = Size.zero;
  (Offset, double)? _zoneSent;

  void _syncZone() {
    final z = (_center, _radius);
    if (_zoneSent == z) return;
    _zoneSent = z;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && _zoneSent == z) widget.onZone?.call(z.$1, z.$2);
    });
  }

  double get _radius => widget.size / 2;

  Offset get _center {
    final m = ChurchMoveZone.margin;
    final x = widget.rightSide
        ? _area.width - widget.insets.right - m - _radius
        : widget.insets.left + m + _radius;
    return Offset(x, _area.height - widget.insets.bottom - m - _radius);
  }

  bool _inStick(Offset p) => (p - _center).distance <= _radius;

  void _update(Offset local) {
    final drag = (local - _downAt).distance;
    if (drag > _maxDrag) _maxDrag = drag;
    var v = (local - _center) / _radius;
    if (v.distance > 1) v = v / v.distance;
    setState(() => _knob = v);
    _emitThrottled();
  }

  (double, double) get _value {
    var v = _knob;
    if (v.distance < 0.12) v = Offset.zero;
    return (v.dx, -v.dy);
  }

  void _emitThrottled() {
    final now = _clock.elapsed;
    final last = _lastSent;
    if (last == null || now - last >= widget.minInterval) {
      _send();
    } else {
      _dirty = true;
      _pending ??= Timer(widget.minInterval - (now - last), () {
        _pending = null;
        if (_dirty) _send();
      });
    }
  }

  void _send() {
    _dirty = false;
    _sent = true;
    _lastSent = _clock.elapsed;
    final (x, y) = _value;
    widget.onChanged(x, y);
  }

  /// 손잡이를 놓는다: 가운데로 돌아가고 (0,0)을 보낸다.
  void _release() {
    _pending?.cancel();
    _pending = null;
    _pointer = null;
    final wasSent = _sent;
    _sent = false;
    _dirty = false;
    _lastSent = null;
    if (mounted) setState(() => _knob = Offset.zero);
    if (wasSent) widget.onChanged(0, 0);
  }

  // --- 역할(기록·진단 표시) ---
  static ChurchTouchTrace get _trace => ChurchTouchTrace.instance;

  String _roleOf(int id) {
    if (id == _pointer) return 'stick';
    final i = _views.indexOf(id);
    if (i < 0) return 'none';
    if (_views.length == 1) return 'look';
    return i < 2 ? 'pinch' : 'view';
  }

  void _syncRoles() {
    if (!ChurchTouchTrace.on) return;
    for (final id in _pts.keys) {
      _trace.roles[id] = _roleOf(id);
    }
  }

  void _setPinchBase() {
    _pinchDist = _views.length >= 2
        ? (_pts[_views[0]]!.pos - _pts[_views[1]]!.pos).distance
        : 0;
  }

  void _down(PointerDownEvent e) {
    final p = e.localPosition;
    // 새 손가락이 닿으면 이미 닿아 있던 손가락은 더 이상 '혼자 탭'이 아니다.
    for (final o in _pts.values) {
      o.alone = false;
    }
    _pts[e.pointer] = _Ptr(p, _clock.elapsed, alone: _pts.isEmpty);
    if (_pointer == null && _inStick(p)) {
      // 손잡이를 잡는다. 다른 손가락이 이미 장면을 끌고 있으면 그 손가락은 그대로 시점을 돌린다.
      _pointer = e.pointer;
      _downAt = p;
      _maxDrag = 0;
      _downTime = _clock.elapsed;
      widget.onTouchDown?.call();
      setState(() => _used = true);
      _update(p);
      if (ChurchTouchTrace.on) {
        _trace.decision('stick-grab', {
          'id': e.pointer,
          'views': _views.length,
        });
      }
    } else {
      _views.add(e.pointer);
      if (!_lookOn) {
        _lookOn = true;
        widget.onLook?.call(on: true);
      }
      if (_views.length == 2) _setPinchBase();
      if (ChurchTouchTrace.on) {
        _trace.decision(
          _views.length == 1
              ? 'look-start'
              : (_views.length == 2 ? 'pinch-start' : 'view-extra'),
          {'id': e.pointer, 'stick': ?_pointer, 'views': _views.length},
        );
      }
    }
    _syncRoles();
  }

  void _move(PointerMoveEvent e) {
    final p = _pts[e.pointer];
    if (p == null) return;
    final prev = p.pos;
    p.pos = e.localPosition;
    final d = (e.localPosition - p.down).distance;
    if (d > p.moved) p.moved = d;
    if (e.pointer == _pointer) {
      _update(e.localPosition);
      return;
    }
    final i = _views.indexOf(e.pointer);
    if (i < 0) return;
    if (_views.length == 1) {
      final dd = e.localPosition - prev;
      if (dd != Offset.zero) widget.onLook?.call(dx: dd.dx, dy: dd.dy);
    } else if (i < 2) {
      final dist = (_pts[_views[0]]!.pos - _pts[_views[1]]!.pos).distance;
      if (_pinchDist > 0 && dist > 0 && dist != _pinchDist) {
        widget.onLook?.call(k: dist / _pinchDist);
      }
      _pinchDist = dist;
    }
  }

  void _up(PointerEvent e, {required bool cancelled}) {
    final p = _pts.remove(e.pointer);
    if (p == null) return;
    if (ChurchTouchTrace.on) _trace.roles.remove(e.pointer);
    final quick = _clock.elapsed - p.at < ChurchMoveZone.tapTime;
    if (e.pointer == _pointer) {
      final isTap =
          !cancelled &&
          _maxDrag < ChurchMoveZone.tapSlop &&
          _clock.elapsed - _downTime < ChurchMoveZone.tapTime;
      _release();
      if (ChurchTouchTrace.on) {
        _trace.decision('stick-release', {'id': e.pointer, 'tap': isTap});
      }
      if (isTap) widget.onTap?.call(e.localPosition);
      _syncRoles();
      return;
    }
    final i = _views.indexOf(e.pointer);
    if (i < 0) return;
    _views.removeAt(i);
    // 확대하던 둘 중 하나가 떨어지면: 남은 둘(셋째 손가락이 있었다면)로 새 기준, 하나 남으면 그 손가락이 이어서 시점.
    if (i < 2) _setPinchBase();
    final isTap =
        !cancelled && p.alone && p.moved < ChurchMoveZone.tapSlop && quick;
    if (_views.isEmpty && _lookOn) {
      _lookOn = false;
      widget.onLook?.call(on: false);
    }
    if (ChurchTouchTrace.on) {
      _trace.decision('view-up', {
        'id': e.pointer,
        'tap': isTap,
        'views': _views.length,
      });
    }
    if (isTap) widget.onTap?.call(e.localPosition);
    _syncRoles();
  }

  void _traceEvent(PointerEvent e) {
    if (!ChurchTouchTrace.on) return;
    // 이 층이 기록한 손가락(바깥 기록 층은 HUD·웹으로 간 손가락만 기록한다)
    if (e is PointerDownEvent) _trace.claimed.add(e.pointer);
    final role = _roleOf(e.pointer);
    if (e is PointerMoveEvent) {
      // 움직임은 손가락마다 33ms 에 한 번(고리 버퍼가 몇 초 만에 차지 않게)
      final p = _pts[e.pointer];
      final ms = e.timeStamp.inMilliseconds;
      if (p != null) {
        if (ms - p.lastTraceMs < 33) return;
        p.lastTraceMs = ms;
      }
    }
    _trace.pointer(e, role);
  }

  @override
  void dispose() {
    _pending?.cancel();
    if (_pointer != null && _sent) widget.onChanged(0, 0);
    if (_lookOn) widget.onLook?.call(on: false);
    if (ChurchTouchTrace.on) {
      for (final id in _pts.keys) {
        _trace.roles.remove(id);
      }
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final knobSize = widget.size * 0.42;
    final m = ChurchMoveZone.margin;
    final bottom = widget.insets.bottom + m;
    final held = _pointer != null;
    return LayoutBuilder(
      builder: (context, c) {
        _area = c.biggest;
        _syncZone();
        return Listener(
          // 불투명: 걷는 동안 3D 화면 위 손가락은 모두 여기서 읽는다(웹뷰에 나눠 주지 않는다, 위 설명).
          behavior: HitTestBehavior.opaque,
          onPointerDown: (e) {
            _down(e);
            _traceEvent(e);
          },
          onPointerMove: (e) {
            _traceEvent(e);
            _move(e);
          },
          onPointerUp: (e) {
            _traceEvent(e);
            _up(e, cancelled: false);
          },
          onPointerCancel: (e) {
            _traceEvent(e);
            _up(e, cancelled: true);
          },
          child: Stack(
            fit: StackFit.expand,
            children: [
              Positioned(
                left: widget.rightSide ? null : widget.insets.left + m,
                right: widget.rightSide ? widget.insets.right + m : null,
                bottom: bottom,
                child: Semantics(
                  label: '이동 손잡이: 누른 채 끌면 걸어요',
                  child: _CircleHit(
                    key: const ValueKey('move-zone'),
                    child: Container(
                      key: const ValueKey('joystick-ring'),
                      width: widget.size,
                      height: widget.size,
                      // 성당 테마: 어두운 반투명 바탕 + 반투명 금색 테두리. 밝은 대리석 위에서도 보이게 옅은 그림자를 둔다.
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: scheme.surface.withValues(
                          alpha: held
                              ? ChurchHudStyle.stickFillHeldOpacity
                              : ChurchHudStyle.stickFillOpacity,
                        ),
                        border: Border.all(
                          color: scheme.primary.withValues(
                            alpha: ChurchHudStyle.stickRingOpacity,
                          ),
                          width: 1.5,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: scheme.shadow.withValues(
                              alpha: ChurchHudStyle.stickShadowOpacity,
                            ),
                            blurRadius: 4,
                          ),
                        ],
                      ),
                      child: Transform.translate(
                        offset: _knob * (_radius - knobSize / 2),
                        child: Center(
                          child: Container(
                            key: const ValueKey('joystick-knob'),
                            width: knobSize,
                            height: knobSize,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: scheme.primary.withValues(
                                alpha: ChurchHudStyle.stickKnobOpacity,
                              ),
                              boxShadow: [
                                BoxShadow(
                                  color: scheme.shadow.withValues(
                                    alpha: ChurchHudStyle.stickShadowOpacity,
                                  ),
                                  blurRadius: 4,
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              if (widget.hint != null && !_used)
                Positioned(
                  left: widget.rightSide ? null : widget.insets.left + m,
                  right: widget.rightSide ? widget.insets.right + m : null,
                  bottom: bottom + widget.size + AppSpace.xs,
                  child: IgnorePointer(
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 140),
                      child: _HudNote(
                        key: const ValueKey('move-hint'),
                        message: widget.hint!,
                      ),
                    ),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }
}

/// 손잡이 원(시험·접근성에서 원의 자리를 찾는 표식). 터치 경로는 바깥 불투명 Listener 가 맡는다.
class _CircleHit extends SingleChildRenderObjectWidget {
  const _CircleHit({super.key, super.child});

  @override
  RenderObject createRenderObject(BuildContext context) => _RenderCircleHit();
}

class _RenderCircleHit extends RenderProxyBox {
  @override
  bool hitTest(BoxHitTestResult result, {required Offset position}) {
    final r = size.shortestSide / 2;
    if ((position - size.center(Offset.zero)).distance > r) return false;
    result.add(BoxHitTestEntry(this, position));
    return true;
  }
}

/// 느린 기기 안내(C-04, Q8): 입장 직후 평균 fps가 낮을 때 떠서 간단 모드를 '권한다'.
/// 화면을 가리지 않는 작은 띠이며, 아무것도 강제하지 않는다.
class ChurchPerfBanner extends StatelessWidget {
  const ChurchPerfBanner({
    super.key,
    required this.onSwitch,
    required this.onKeep,
  });

  final VoidCallback onSwitch;
  final VoidCallback onKeep;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    return Material(
      // HUD 표면 규칙(어두운 표면 + 금색 가는 테두리). 누르는 글자는 M3 텍스트 버튼 그대로.
      color: ChurchHudStyle.surface(scheme),
      elevation: ChurchHudStyle.elevation,
      shape: ChurchHudStyle.chip(scheme),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(
          AppSpace.sm,
          AppSpace.xs,
          AppSpace.xs,
          AppSpace.xs,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              '화면이 느려요. 간단 모드로 바꿀까요?',
              style: text.bodyMedium?.copyWith(color: scheme.onSurface),
            ),
            Align(
              alignment: Alignment.centerRight,
              child: Wrap(
                children: [
                  TextButton(
                    onPressed: onKeep,
                    style: TextButton.styleFrom(
                      foregroundColor: scheme.onSurfaceVariant,
                      minimumSize: const Size(64, 48),
                    ),
                    child: const Text('그대로'),
                  ),
                  TextButton(
                    onPressed: onSwitch,
                    style: TextButton.styleFrom(
                      minimumSize: const Size(64, 48),
                    ),
                    child: const Text('바꾸기'),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
