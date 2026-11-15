// 십자가의 길 그림 연작 고르기: 선택 저장(shared_preferences)과 '연작 선택' 칩.
//
// 성당 밖(더보기 → 십자가의 길 목록·묵상 시트)에서만 쓴다. 성당 안 14처 판과 순례 시트는 언제나
// 그 성당에 배정된 연작이다. 그림 파일은 연작마다 따로 있고 화면에 보일 때만 읽는다.
import 'dart:async';

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../app/theme.dart';
import '../../domain/stations_series.dart';

/// 사용자가 고른 연작. `null` 이면 '자동'(마지막으로 들른 성당의 연작).
abstract final class StationsSeriesChoice {
  static const String prefsKey = 'stations_series_id';

  /// 고른 연작 id(자동이면 null). 바뀌면 목록·시트가 다시 그린다.
  static final ValueNotifier<String?> selected = ValueNotifier<String?>(null);

  static bool _loaded = false;

  /// 저장된 선택을 한 번 읽는다(여러 번 불러도 된다). 없는 연작 id 는 자동으로 돌린다.
  static Future<void> load() async {
    if (_loaded) return;
    _loaded = true;
    try {
      final p = await SharedPreferences.getInstance();
      final id = p.getString(prefsKey);
      if (id != null && StationsSeriesCatalog.all.any((s) => s.id == id)) {
        selected.value = id;
      }
    } catch (_) {
      // 저장소를 못 읽으면 자동으로 둔다.
    }
  }

  /// [id] 연작을 고른다(null 은 자동). 바로 반영하고 저장한다.
  static Future<void> select(String? id) async {
    _loaded = true;
    selected.value = id;
    try {
      final p = await SharedPreferences.getInstance();
      if (id == null) {
        await p.remove(prefsKey);
      } else {
        await p.setString(prefsKey, id);
      }
    } catch (_) {
      // 저장 실패: 이번 실행 동안만 유지된다.
    }
  }

  /// 보여 줄 연작: 고른 것이 있으면 그것, 없으면 [auto](없으면 기본 연작).
  static StationsSeries resolve(StationsSeries? auto) => selected.value == null
      ? (auto ?? StationsSeriesCatalog.fallback)
      : StationsSeriesCatalog.byId(selected.value);

  /// 시험용: 읽은 상태를 지운다.
  @visibleForTesting
  static void reset() {
    _loaded = false;
    selected.value = null;
  }
}

/// '연작 선택' 칩 묶음(M3 ChoiceChip, 줄바꿈). 첫 칩 '자동'은 [auto] 연작(마지막으로 들른 성당)을 쓴다.
class StationsSeriesChips extends StatelessWidget {
  const StationsSeriesChips({super.key, this.auto});

  /// '자동'일 때 쓰는 연작. null 이면 기본 연작.
  final StationsSeries? auto;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    return ValueListenableBuilder<String?>(
      valueListenable: StationsSeriesChoice.selected,
      builder: (context, sel, _) {
        Widget chip(String? id, String label, String hint) => ChoiceChip(
          key: ValueKey('stations-series-chip-${id ?? 'auto'}'),
          label: Text(label, overflow: TextOverflow.ellipsis),
          tooltip: hint,
          selected: sel == id,
          materialTapTargetSize: MaterialTapTargetSize.padded,
          onSelected: (_) => unawaited(StationsSeriesChoice.select(id)),
        );
        return Column(
          key: const ValueKey('stations-series-chips'),
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              '그림 연작',
              style: theme.textTheme.titleSmall?.copyWith(
                color: scheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: AppSpace.xxs),
            Wrap(
              spacing: AppSpace.xs,
              runSpacing: AppSpace.xxs,
              children: [
                chip(
                  null,
                  '자동',
                  '마지막으로 들른 성당의 연작'
                      '(${(auto ?? StationsSeriesCatalog.fallback).short})',
                ),
                for (final s in StationsSeriesCatalog.all)
                  chip(s.id, s.short, '${s.title}, ${s.year}'),
              ],
            ),
          ],
        );
      },
    );
  }
}

/// 묵상 시트용: 지금 연작 이름이 적힌 칩 하나. 누르면 [StationsSeriesChips] 시트가 열린다.
class StationsSeriesButton extends StatelessWidget {
  const StationsSeriesButton({super.key, this.auto});

  final StationsSeries? auto;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.centerLeft,
      child: ActionChip(
        key: const ValueKey('stations-series-button'),
        avatar: const Icon(Icons.palette_outlined, size: 18),
        label: Text(
          '그림 연작: ${StationsSeriesChoice.resolve(auto).short}',
          overflow: TextOverflow.ellipsis,
        ),
        tooltip: '그림 연작 고르기',
        onPressed: () => unawaited(
          showModalBottomSheet<void>(
            context: context,
            isScrollControlled: true,
            showDragHandle: true,
            useSafeArea: true,
            builder: (context) => SafeArea(
              top: false,
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(
                  AppSpace.md,
                  0,
                  AppSpace.md,
                  AppSpace.md,
                ),
                child: StationsSeriesChips(auto: auto),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
