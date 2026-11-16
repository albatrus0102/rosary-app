/// 스킨 고르기: 큰 그림 카드 2열 시트(기본 / 계절 / 내가 만든 탭) + 미리 보기 막대.
///
/// 독서공방의 `openThemeSheet`·`skinGal*`·`skinPreview`·`skinPvUse`·`skinPvAbort`·`skinNewDot`을 옮겼다.
/// - 카드를 누르면 시트가 내려가고 **앱 전체가 그 스킨으로 미리 보인다**(저장 안 함: [AppSettings.skinPreviewId]).
///   아래 막대의 [적용]이 저장하고, [취소]·뒤로가기(화면 이동)·앱을 나갔다 오기는 원래대로 되돌린다.
/// - 처음 보는 새 스킨은 카드와 탭에 빨간 점이 붙고, 미리 보거나 쓰면 꺼진다([AppSettings.skinSeen]).
/// - 계절 스킨은 그 전례 시기에만 나타난다(날짜 문, [Skins.visible]).
library;

import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../app/settings.dart';
import '../app/skins.dart';
import '../app/theme.dart';
import 'skin_builder.dart';

/// 새 스킨이고 아직 못 본 것에 빨간 점을 붙인다.
bool skinNewDot(AppSettings settings, AppSkin skin) =>
    skin.isNew && !settings.skinSeen.contains(skin.id);

enum _Action { preview, create, edit }

class _Result {
  const _Result(this.action, [this.id]);
  final _Action action;
  final String? id;
}

/// 스킨 고르기 시트를 연다. [now]는 날짜 문 시험용(기본: 지금).
Future<void> showSkinPicker(
  BuildContext context,
  AppSettings settings, {
  DateTime? now,
  SkinGroup? initialTab,
}) async {
  var tab = initialTab;
  for (;;) {
    if (!context.mounted) return;
    final r = await showModalBottomSheet<_Result>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) =>
          SkinPickerSheet(settings: settings, now: now, initialTab: tab),
    );
    if (r == null || !context.mounted) return;
    switch (r.action) {
      case _Action.preview:
        final id = r.id!;
        settings.markSkinSeen(id);
        final current = Skins.effectiveId(
          settings.skinId,
          now ?? DateTime.now(),
          settings.skinCustoms,
        );
        // 이미 쓰는 스킨이면 미리 볼 것이 없다.
        if (id != current) settings.skinPreviewId = id;
        return;
      case _Action.create:
        await Navigator.of(context).push(
          MaterialPageRoute<void>(
            settings: const RouteSettings(name: 'skin-builder'),
            builder: (_) => SkinBuilderScreen(settings: settings),
          ),
        );
        tab = SkinGroup.custom;
      case _Action.edit:
        final c = settings.skinCustoms.where((e) => e.id == r.id).firstOrNull;
        if (c != null) {
          await Navigator.of(context).push(
            MaterialPageRoute<void>(
              settings: const RouteSettings(name: 'skin-builder'),
              builder: (_) => SkinBuilderScreen(settings: settings, editing: c),
            ),
          );
        }
        tab = SkinGroup.custom;
    }
  }
}

/// 화면을 옮기면(PageRoute가 닫히면) 미리 보던 스킨을 되돌린다(뒤로가기 = 자동 취소).
/// 시트·대화상자 같은 팝업이 닫히는 것에는 반응하지 않는다.
class SkinPreviewObserver extends NavigatorObserver {
  SkinPreviewObserver(this.settings);
  final AppSettings settings;

  @override
  void didPop(Route<dynamic> route, Route<dynamic>? previousRoute) {
    if (route is PageRoute) settings.skinPreviewId = null;
  }
}

/// 앱 위에 미리 보기 막대를 얹는다. 미리 보는 중이 아니면 [child] 그대로.
class SkinPreviewHost extends StatelessWidget {
  const SkinPreviewHost({
    super.key,
    required this.settings,
    required this.child,
  });

  final AppSettings settings;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: settings,
      child: child,
      builder: (context, child) {
        final id = settings.skinPreviewId;
        if (id == null) return child!;
        final skin = Skins.find(id, settings.skinCustoms);
        return Directionality(
          textDirection: TextDirection.ltr,
          child: Stack(
            children: [
              Positioned.fill(child: child!),
              if (skin != null)
                Positioned(
                  left: 12,
                  right: 12,
                  bottom: MediaQuery.paddingOf(context).bottom + 92,
                  child: Center(
                    child: SkinPreviewBar(settings: settings, skin: skin),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }
}

/// "'밤 성당' 미리 보는 중 · 취소 · 적용".
class SkinPreviewBar extends StatelessWidget {
  const SkinPreviewBar({super.key, required this.settings, required this.skin});

  final AppSettings settings;
  final AppSkin skin;

  void _apply() {
    settings.skinId = skin.id;
    settings.markSkinSeen(skin.id);
    settings.skinPreviewId = null;
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 460),
      child: Material(
        key: const ValueKey('skin-preview-bar'),
        color: scheme.inverseSurface,
        elevation: 0,
        shape: StadiumBorder(
          side: BorderSide(color: AppDecor.of(context).gold),
        ),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 6, 8, 6),
          child: Row(
            children: [
              Expanded(
                child: Semantics(
                  liveRegion: true,
                  child: Text(
                    '‘${skin.nameKo}’ 미리 보는 중',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.labelLarge
                        ?.copyWith(color: scheme.onInverseSurface),
                  ),
                ),
              ),
              TextButton(
                key: const ValueKey('skin-preview-cancel'),
                style: TextButton.styleFrom(
                  foregroundColor: scheme.onInverseSurface,
                ),
                onPressed: () => settings.skinPreviewId = null,
                child: const Text('취소'),
              ),
              FilledButton(
                key: const ValueKey('skin-preview-apply'),
                style: FilledButton.styleFrom(
                  backgroundColor: scheme.inversePrimary,
                  foregroundColor: scheme.inverseSurface,
                ),
                onPressed: _apply,
                child: const Text('적용'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// 카드 그림: 스킨 색으로 그린 작은 묵주 장면.
class SkinArtView extends StatelessWidget {
  const SkinArtView({super.key, required this.art});
  final SkinArt art;

  @override
  Widget build(BuildContext context) => CustomPaint(
    painter: _SkinArtPainter(art),
    child: const SizedBox.expand(),
  );
}

class _SkinArtPainter extends CustomPainter {
  _SkinArtPainter(this.art);
  final SkinArt art;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    canvas.drawRect(
      rect,
      Paint()
        ..shader = LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [art.top, art.bottom],
        ).createShader(rect),
    );
    // 묵주: 원을 따라 놓인 알 열두 개와 아래로 늘어진 십자가.
    final c = Offset(size.width / 2, size.height * 0.40);
    final r = math.min(size.width, size.height) * 0.27;
    final bead = Paint()..color = art.beads;
    final thread = Paint()
      ..color = art.beads.withValues(alpha: 0.45)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.2;
    canvas.drawCircle(c, r, thread);
    for (var i = 0; i < 12; i++) {
      final a = math.pi / 2 + (i + 0.5) * 2 * math.pi / 12;
      // 아래쪽(십자가 자리)은 비운다.
      if (i == 0 || i == 11) continue;
      canvas.drawCircle(
        c + Offset(math.cos(a), math.sin(a)) * r,
        r * (i % 3 == 0 ? 0.13 : 0.09),
        bead,
      );
    }
    final top = c + Offset(0, r);
    final cross = Paint()
      ..color = art.beads
      ..strokeWidth = r * 0.1
      ..strokeCap = StrokeCap.round;
    final cy = top.dy + r * 0.62;
    canvas.drawLine(top, Offset(top.dx, cy + r * 0.28), cross);
    canvas.drawLine(
      Offset(top.dx - r * 0.2, cy),
      Offset(top.dx + r * 0.2, cy),
      cross,
    );
    // 아래 바(내비게이션 흉내).
    final bar = RRect.fromRectAndRadius(
      Rect.fromLTWH(
        size.width * 0.14,
        size.height * 0.9,
        size.width * 0.72,
        size.height * 0.055,
      ),
      Radius.circular(size.height),
    );
    canvas.drawRRect(bar, Paint()..color = art.ink.withValues(alpha: 0.16));
  }

  @override
  bool shouldRepaint(_SkinArtPainter old) => old.art != art;
}

/// 시트 본문.
class SkinPickerSheet extends StatefulWidget {
  const SkinPickerSheet({
    super.key,
    required this.settings,
    this.now,
    this.initialTab,
  });

  final AppSettings settings;
  final DateTime? now;
  final SkinGroup? initialTab;

  @override
  State<SkinPickerSheet> createState() => _SkinPickerSheetState();
}

class _SkinPickerSheetState extends State<SkinPickerSheet> {
  late SkinGroup _tab;
  AppSettings get _s => widget.settings;
  DateTime get _now => widget.now ?? DateTime.now();

  @override
  void initState() {
    super.initState();
    final cur = Skins.effective(_s.skinId, _now, _s.skinCustoms);
    _tab = widget.initialTab ?? cur.group;
  }

  bool _tabHasNew(SkinGroup g) =>
      Skins.visibleIn(g, _now, _s.skinCustoms).any((e) => skinNewDot(_s, e));

  void _pick(AppSkin s) =>
      Navigator.of(context).pop(_Result(_Action.preview, s.id));

  Future<void> _confirmDelete(AppSkin s) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('‘${s.nameKo}’ 스킨을 지울까요?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('아니요'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('지우기'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    _s.skinCustoms = [
      for (final c in _s.skinCustoms)
        if (c.id != s.id) c,
    ];
    if (_s.skinId == s.id) _s.skinId = kDefaultSkinId;
    if (_s.skinPreviewId == s.id) _s.skinPreviewId = null;
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final customs = _s.skinCustoms;
    final current = Skins.effectiveId(_s.skinId, _now, customs);
    final list = Skins.visibleIn(_tab, _now, customs);
    final height = MediaQuery.sizeOf(context).height;
    return ConstrainedBox(
      constraints: BoxConstraints(maxHeight: height * 0.88),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 0, 24, 4),
            child: Text('스킨', style: theme.textTheme.titleLarge),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 0, 24, 12),
            child: Text(
              '카드를 누르면 앱 전체가 그 색으로 먼저 보여요. 마음에 들면 ‘적용’을 눌러 주세요.',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ),
          _Tabs(
            tab: _tab,
            hasNew: _tabHasNew,
            count: (g) => Skins.visibleIn(g, _now, customs).length,
            onTab: (g) => setState(() => _tab = g),
          ),
          const SizedBox(height: 12),
          Flexible(
            child: SingleChildScrollView(
              key: const ValueKey('skin-grid-scroll'),
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (_tab == SkinGroup.season && list.isEmpty)
                    _SeasonHint(now: _now),
                  _Grid(
                    children: [
                      for (final s in list)
                        _SkinCard(
                          skin: s,
                          selected: s.id == current,
                          showNew: skinNewDot(_s, s),
                          onTap: () => _pick(s),
                          menu: s.group == SkinGroup.custom
                              ? _CustomMenu(
                                  onEdit: () =>
                                      Navigator.of(context)
                                          .pop(_Result(_Action.edit, s.id)),
                                  onDelete: () => _confirmDelete(s),
                                )
                              : null,
                        ),
                      if (_tab == SkinGroup.custom)
                        _NewCard(
                          onTap: () =>
                              Navigator.of(context)
                                  .pop(const _Result(_Action.create)),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Tabs extends StatelessWidget {
  const _Tabs({
    required this.tab,
    required this.hasNew,
    required this.count,
    required this.onTab,
  });

  final SkinGroup tab;
  final bool Function(SkinGroup) hasNew;
  final int Function(SkinGroup) count;
  final ValueChanged<SkinGroup> onTab;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: [
          for (final g in SkinGroup.values)
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4),
                child: Semantics(
                  button: true,
                  selected: g == tab,
                  label:
                      '${g.labelKo} ${count(g)}${hasNew(g) ? ' 새 스킨 있음' : ''}',
                  excludeSemantics: true,
                  child: InkWell(
                    key: ValueKey('skin-tab-${g.name}'),
                    borderRadius: BorderRadius.circular(22),
                    onTap: () => onTab(g),
                    child: Container(
                      height: 44,
                      alignment: Alignment.center,
                      decoration: ShapeDecoration(
                        shape: StadiumBorder(
                          side: BorderSide(
                            color: g == tab
                                ? AppDecor.of(context).gold
                                : scheme.outlineVariant,
                          ),
                        ),
                        color: g == tab ? scheme.secondaryContainer : null,
                      ),
                      child: Stack(
                        clipBehavior: Clip.none,
                        alignment: Alignment.center,
                        children: [
                          Text(
                            '${g.labelKo} ${count(g)}',
                            style: Theme.of(context).textTheme.labelLarge
                                ?.copyWith(
                                  color: g == tab
                                      ? scheme.onSecondaryContainer
                                      : scheme.onSurfaceVariant,
                                ),
                          ),
                          if (hasNew(g))
                            Positioned(
                              right: -14,
                              top: -2,
                              child: _RedDot(
                                key: ValueKey('skin-tab-dot-${g.name}'),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _RedDot extends StatelessWidget {
  const _RedDot({super.key});

  @override
  Widget build(BuildContext context) => DecoratedBox(
    decoration: BoxDecoration(
      color: Theme.of(context).colorScheme.error,
      shape: BoxShape.circle,
      border: Border.all(
        color: Theme.of(context).colorScheme.surface,
        width: 1.5,
      ),
    ),
    child: const SizedBox(width: 11, height: 11),
  );
}

class _Grid extends StatelessWidget {
  const _Grid({required this.children});
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    // 두 열. 카드 높이는 폭에 비례(그림 + 이름 + 상태 줄).
    return LayoutBuilder(
      builder: (context, c) {
        const gap = 12.0;
        final w = (c.maxWidth - gap) / 2;
        return Wrap(
          spacing: gap,
          runSpacing: gap,
          children: [for (final ch in children) SizedBox(width: w, child: ch)],
        );
      },
    );
  }
}

class _SkinCard extends StatelessWidget {
  const _SkinCard({
    required this.skin,
    required this.selected,
    required this.showNew,
    required this.onTap,
    this.menu,
  });

  final AppSkin skin;
  final bool selected;
  final bool showNew;
  final VoidCallback onTap;
  final Widget? menu;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final gold = AppDecor.of(context).gold;
    final state = selected ? '사용 중' : '미리 보기';
    return Semantics(
      button: true,
      selected: selected,
      label: '${skin.nameKo}, $state${showNew ? ', 새 스킨' : ''}',
      excludeSemantics: true,
      child: Card.outlined(
        key: ValueKey('skin-card-${skin.id}'),
        color: scheme.surfaceContainerLow,
        shape: RoundedRectangleBorder(
          borderRadius: AppShape.large,
          side: BorderSide(
            color: selected ? gold : scheme.outlineVariant,
            width: selected ? 2 : 1,
          ),
        ),
        child: InkWell(
          onTap: onTap,
          child: Stack(
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  AspectRatio(
                    aspectRatio: 1.15,
                    child: SkinArtView(art: skin.art),
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          skin.nameKo,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: theme.textTheme.titleMedium,
                        ),
                        const SizedBox(height: 2),
                        Row(
                          children: [
                            if (selected) ...[
                              Icon(
                                Icons.check,
                                size: 16,
                                color: scheme.primary,
                              ),
                              const SizedBox(width: 4),
                            ],
                            Flexible(
                              child: Text(
                                state,
                                style: theme.textTheme.bodySmall?.copyWith(
                                  color: selected
                                      ? scheme.primary
                                      : scheme.onSurfaceVariant,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              if (showNew)
                Positioned(
                  left: 8,
                  top: 8,
                  child: _RedDot(key: ValueKey('skin-dot-${skin.id}')),
                ),
              if (menu != null) Positioned(right: 0, top: 0, child: menu!),
            ],
          ),
        ),
      ),
    );
  }
}

class _CustomMenu extends StatelessWidget {
  const _CustomMenu({required this.onEdit, required this.onDelete});
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) => PopupMenuButton<int>(
    tooltip: '스킨 더 보기',
    icon: const Icon(Icons.more_vert),
    onSelected: (v) => v == 0 ? onEdit() : onDelete(),
    itemBuilder: (_) => const [
      PopupMenuItem(value: 0, child: Text('고치기')),
      PopupMenuItem(value: 1, child: Text('지우기')),
    ],
  );
}

class _NewCard extends StatelessWidget {
  const _NewCard({required this.onTap});
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    return Card.outlined(
      key: const ValueKey('skin-card-new'),
      color: scheme.surfaceContainerLow,
      shape: RoundedRectangleBorder(
        borderRadius: AppShape.large,
        side: BorderSide(color: scheme.outline),
      ),
      child: InkWell(
        onTap: onTap,
        child: AspectRatio(
          aspectRatio: 0.9,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.add_circle_outline, size: 40, color: scheme.primary),
              const SizedBox(height: 8),
              Text('새로 만들기', style: theme.textTheme.titleMedium),
              const SizedBox(height: 2),
              Text(
                '색을 골라 나만의 스킨을',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: scheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// 계절 탭이 비어 있을 때의 안내: 계절 스킨은 그 전례 시기에만 열리고, 다음에 열릴 시기를 알려 준다.
class _SeasonHint extends StatelessWidget {
  const _SeasonHint({required this.now});
  final DateTime now;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    AppSkin? next;
    DateTime? when;
    for (final s in kSkins) {
      if (s.group != SkinGroup.season) continue;
      final d = s.window?.nextOpen(now);
      if (d != null && (when == null || d.isBefore(when))) {
        next = s;
        when = d;
      }
    }
    final text = next == null
        ? '계절 스킨은 해당 전례 시기에만 나타나요.'
        : '계절 스킨은 해당 전례 시기에만 나타나요.\n'
              '다음은 ‘${next.nameKo}’ — ${next.window!.labelKo}가 시작되는 ${when!.month}월 ${when.day}일부터예요.';
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 8),
      child: Text(
        text,
        key: const ValueKey('skin-season-hint'),
        textAlign: TextAlign.center,
        style: theme.textTheme.bodyMedium?.copyWith(
          color: theme.colorScheme.onSurfaceVariant,
        ),
      ),
    );
  }
}
