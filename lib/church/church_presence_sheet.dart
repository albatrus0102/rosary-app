import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../app/track.dart';
import 'church_catalog.dart';
import 'net/church_loads.dart';
import 'net/church_net.dart';

/// 접속자 시트의 두 보기.
enum ChurchPresenceView {
  /// 지금 이 성당에 있는 사람들(세례명 + 상태).
  here('here', '이 성당'),

  /// 성당별 접속 인원(이름은 보이지 않는다).
  all('all', '전체');

  const ChurchPresenceView(this.key, this.label);

  /// 분석 이벤트에 쓰는 영문 키.
  final String key;
  final String label;
}

/// 방에 공유되는 상태 `st`의 글과 아이콘.
(String, IconData) churchPresenceStatus(String st) => switch (st) {
  'p' => ('기도 중', Icons.self_improvement),
  's' => ('앉아 있음', Icons.event_seat),
  _ => ('둘러보는 중', Icons.directions_walk),
};

/// '지금 접속 중' 바텀 시트를 연다. '전체' 보기에서 다른 성당을 고르면 그 성당 id를 돌려준다
/// (닫으면 null). 실제 이동은 호출 쪽이 기존 입장 확인 단계를 거쳐 한다.
///
/// 시트가 열려 있는 동안에만 명단([ChurchNet.requestWho])과 성당별 인원([ChurchLoads])을
/// 주기적으로 다시 받는다.
Future<String?> showChurchPresenceSheet(
  BuildContext context, {
  required ChurchNet net,
  required ChurchLoads loads,
  required String churchId,
  required String selfName,
  required String Function() selfSt,
  bool Function(String churchId)? canEnter,
}) {
  Track.church('presence_sheet_open', churchId, {
    'online': net.state.value == NetState.online,
  });
  return showModalBottomSheet<String>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    useSafeArea: true,
    builder: (context) => SafeArea(
      top: false,
      child: ChurchPresenceSheet(
        net: net,
        loads: loads,
        churchId: churchId,
        selfName: selfName,
        selfSt: selfSt,
        canEnter: canEnter,
      ),
    ),
  );
}

class ChurchPresenceSheet extends StatefulWidget {
  const ChurchPresenceSheet({
    super.key,
    required this.net,
    required this.loads,
    required this.churchId,
    required this.selfName,
    required this.selfSt,
    this.canEnter,
    this.pollInterval = const Duration(seconds: 8),
  });

  final ChurchNet net;
  final ChurchLoads loads;

  /// 지금 있는 성당.
  final String churchId;

  /// 내 세례명과 지금 상태(`w`/`s`/`p`).
  final String selfName;
  final String Function() selfSt;

  /// '전체' 보기에서 그 성당으로 옮길 수 있는지(없으면 모두 가능).
  final bool Function(String churchId)? canEnter;

  /// 명단을 다시 청하는 간격.
  final Duration pollInterval;

  @override
  State<ChurchPresenceSheet> createState() => _ChurchPresenceSheetState();
}

class _ChurchPresenceSheetState extends State<ChurchPresenceSheet> {
  ChurchPresenceView _view = ChurchPresenceView.here;
  StreamSubscription<ChurchEvent>? _sub;
  Timer? _timer;
  Who? _who;

  bool get _online => widget.net.state.value == NetState.online;

  @override
  void initState() {
    super.initState();
    _sub = widget.net.events.listen((e) {
      if (e is Who && mounted) setState(() => _who = e);
    });
    widget.net.state.addListener(_onNetState);
    widget.loads.watch();
    _ask();
    _timer = Timer.periodic(widget.pollInterval, (_) => _ask());
  }

  void _ask() {
    if (_online) widget.net.requestWho();
  }

  void _onNetState() {
    if (!mounted) return;
    // 끊기면 옛 명단을 버리고, 다시 붙으면 바로 새로 청한다.
    if (!_online) _who = null;
    _ask();
    setState(() {});
  }

  @override
  void dispose() {
    _timer?.cancel();
    unawaited(_sub?.cancel());
    widget.net.state.removeListener(_onNetState);
    widget.loads.unwatch();
    super.dispose();
  }

  void _setView(ChurchPresenceView v) {
    if (v == _view) return;
    Track.church('presence_toggle', widget.churchId, {'view': v.key});
    setState(() => _view = v);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final height = math.min(560.0, MediaQuery.sizeOf(context).height * 0.7);
    return SizedBox(
      height: height,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 0, 24, 12),
            child: Semantics(
              header: true,
              child: Text('지금 접속 중', style: theme.textTheme.titleLarge),
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: SegmentedButton<ChurchPresenceView>(
              key: const ValueKey('presence-toggle'),
              showSelectedIcon: false,
              segments: [
                for (final v in ChurchPresenceView.values)
                  ButtonSegment(
                    value: v,
                    icon: Icon(
                      v == ChurchPresenceView.here
                          ? Icons.church_outlined
                          : Icons.public,
                    ),
                    label: Text(v.label),
                  ),
              ],
              selected: {_view},
              onSelectionChanged: (s) => _setView(s.first),
            ),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: ListenableBuilder(
              listenable: Listenable.merge([
                widget.net.state,
                widget.net.count,
                widget.loads,
              ]),
              builder: (context, _) => _view == ChurchPresenceView.here
                  ? _here(context)
                  : _all(context),
            ),
          ),
        ],
      ),
    );
  }

  // --- '이 성당' ---

  Widget _here(BuildContext context) {
    final state = widget.net.state.value;
    if (state != NetState.online) {
      return _Notice(
        key: const ValueKey('presence-here-offline'),
        icon: state == NetState.connecting ? Icons.sync : Icons.person_outline,
        text: state == NetState.connecting
            ? '성당에 연결하고 있어요…'
            : '혼자 모드라 접속자를 볼 수 없어요',
      );
    }
    final who = _who;
    final others = who?.list ?? const <RosterEntry>[];
    // 성당 전체 인원(방이 여러 개로 나뉘면 명단보다 많을 수 있다).
    final total = math.max(widget.net.count.value, others.length + 1);
    final shown = others.length + 1;
    final String? footer = who == null
        ? null
        : shown < total
        ? '성당이 붐벼서 같은 공간에 있는 $shown명만 보여요'
        : null;
    return ListView.builder(
      key: const ValueKey('presence-here-list'),
      padding: const EdgeInsets.fromLTRB(12, 0, 12, 16),
      itemCount: others.length + 3,
      itemBuilder: (context, i) {
        if (i == 0) return _Summary('이 성당에 $total명이 있어요');
        if (i == 1) {
          return _PersonTile(
            key: const ValueKey('presence-me'),
            name: widget.selfName,
            st: widget.selfSt(),
            me: true,
          );
        }
        if (i == others.length + 2) {
          if (who == null) {
            return const Padding(
              padding: EdgeInsets.all(24),
              child: Center(
                child: SizedBox(
                  width: 24,
                  height: 24,
                  child: CircularProgressIndicator(strokeWidth: 3),
                ),
              ),
            );
          }
          if (footer == null) return const SizedBox.shrink();
          return Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: Text(
              footer,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
          );
        }
        final p = others[i - 2];
        return _PersonTile(name: p.name, st: p.st);
      },
    );
  }

  // --- '전체' ---

  Widget _all(BuildContext context) {
    final loads = widget.loads;
    if (!loads.available) {
      return const _Notice(
        key: ValueKey('presence-all-unavailable'),
        icon: Icons.cloud_off_outlined,
        text: '혼자 모드라 접속 현황을 볼 수 없어요',
      );
    }
    final raw = loads.counts;
    if (raw == null) {
      if (loads.failed) {
        return _Notice(
          key: const ValueKey('presence-all-failed'),
          icon: Icons.cloud_off_outlined,
          text: '접속 현황을 불러오지 못했어요',
          action: TextButton(
            onPressed: () => unawaited(loads.refresh()),
            child: const Text('다시 시도'),
          ),
        );
      }
      return const Center(child: CircularProgressIndicator());
    }
    final counts = {
      for (final c in ChurchCatalog.all)
        if ((raw[c.id] ?? 0) > 0) c.id: raw[c.id]!,
    };
    // 지금 있는 성당은 방에서 받은 최신 인원을 쓴다(나 자신이 빠져 보이지 않게).
    if (_online && ChurchCatalog.byId.containsKey(widget.churchId)) {
      counts[widget.churchId] = math.max(
        counts[widget.churchId] ?? 0,
        math.max(widget.net.count.value, 1),
      );
    }
    final order = {
      for (var i = 0; i < ChurchCatalog.all.length; i++)
        ChurchCatalog.all[i].id: i,
    };
    final ids = counts.keys.toList()
      ..sort((a, b) {
        final d = counts[b]! - counts[a]!;
        return d != 0 ? d : order[a]! - order[b]!;
      });
    if (ids.isEmpty) {
      return const _Notice(
        key: ValueKey('presence-all-empty'),
        icon: Icons.nights_stay_outlined,
        text: '지금 접속 중인 사람이 없어요',
      );
    }
    final sum = counts.values.fold<int>(0, (a, b) => a + b);
    return ListView.builder(
      key: const ValueKey('presence-all-list'),
      padding: const EdgeInsets.fromLTRB(12, 0, 12, 16),
      itemCount: ids.length + 1,
      itemBuilder: (context, i) {
        if (i == 0) {
          return _Summary(
            loads.failed ? '마지막으로 받은 현황이에요 · 모두 $sum명' : '지금 모두 $sum명이 접속 중이에요',
          );
        }
        final id = ids[i - 1];
        final current = id == widget.churchId;
        final can = !current && (widget.canEnter?.call(id) ?? true);
        return _ChurchLoadTile(
          key: ValueKey('presence-church-$id'),
          info: ChurchCatalog.byId[id]!,
          count: counts[id]!,
          current: current,
          onTap: can ? () => Navigator.of(context).pop(id) : null,
        );
      },
    );
  }
}

class _Summary extends StatelessWidget {
  const _Summary(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
      child: Semantics(
        liveRegion: true,
        child: Text(
          text,
          key: const ValueKey('presence-summary'),
          style: theme.textTheme.bodyMedium?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
      ),
    );
  }
}

class _Notice extends StatelessWidget {
  const _Notice({
    super.key,
    required this.icon,
    required this.text,
    this.action,
  });

  final IconData icon;
  final String text;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 40, color: scheme.onSurfaceVariant),
            const SizedBox(height: 12),
            Text(
              text,
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyLarge?.copyWith(
                color: scheme.onSurfaceVariant,
              ),
            ),
            if (action != null) ...[const SizedBox(height: 8), action!],
          ],
        ),
      ),
    );
  }
}

class _PersonTile extends StatelessWidget {
  const _PersonTile({
    super.key,
    required this.name,
    required this.st,
    this.me = false,
  });

  final String name;
  final String st;
  final bool me;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final (label, icon) = churchPresenceStatus(st);
    return Semantics(
      container: true,
      label: me ? '나, $name, $label' : '$name, $label',
      child: ExcludeSemantics(
        child: ListTile(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          tileColor: me ? scheme.secondaryContainer : null,
          leading: CircleAvatar(
            backgroundColor: me
                ? scheme.primary
                : st == 'p'
                ? scheme.tertiaryContainer
                : scheme.surfaceContainerHighest,
            foregroundColor: me
                ? scheme.onPrimary
                : st == 'p'
                ? scheme.onTertiaryContainer
                : scheme.onSurfaceVariant,
            child: Icon(icon, size: 22),
          ),
          title: Text(name, maxLines: 2, overflow: TextOverflow.ellipsis),
          subtitle: Text(label, maxLines: 1, overflow: TextOverflow.ellipsis),
          trailing: me ? const _Badge('나') : null,
        ),
      ),
    );
  }
}

class _ChurchLoadTile extends StatelessWidget {
  const _ChurchLoadTile({
    super.key,
    required this.info,
    required this.count,
    required this.current,
    this.onTap,
  });

  final ChurchInfo info;
  final int count;
  final bool current;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    return Semantics(
      container: true,
      button: onTap != null,
      selected: current,
      label:
          '${info.nameKo}, $count명 접속 중'
          '${current ? ', 지금 있는 성당' : ''}',
      hint: onTap != null ? '이 성당으로 가기' : null,
      child: ExcludeSemantics(
        child: ListTile(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          tileColor: current ? scheme.secondaryContainer : null,
          onTap: onTap,
          leading: Icon(
            current ? Icons.place : Icons.church_outlined,
            color: current
                ? scheme.onSecondaryContainer
                : scheme.onSurfaceVariant,
          ),
          title: Text(
            info.nameKo,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          subtitle: current ? const Text('지금 여기') : null,
          trailing: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                '$count명',
                style: theme.textTheme.titleSmall?.copyWith(
                  color: current
                      ? scheme.onSecondaryContainer
                      : scheme.onSurface,
                ),
              ),
              if (onTap != null) ...[
                const SizedBox(width: 4),
                Icon(
                  Icons.chevron_right,
                  size: 20,
                  color: scheme.onSurfaceVariant,
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _Badge extends StatelessWidget {
  const _Badge(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: scheme.primary,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
        child: Text(
          text,
          style: theme.textTheme.labelMedium?.copyWith(color: scheme.onPrimary),
        ),
      ),
    );
  }
}
