import 'dart:async';

import 'package:flutter/material.dart';

import '../../domain/stations_of_cross.dart';
import '../stations_sheet.dart';

/// 사순 시기(재의 수요일~성금요일)에 '오늘' 탭에 뜨는 작은 제안 카드: 십자가의 길 목록을 연다.
class StationsLentCard extends StatelessWidget {
  const StationsLentCard({super.key});

  /// 오늘 날짜(시험에서 바꾼다).
  @visibleForTesting
  static DateTime Function() clock = DateTime.now;

  /// 지금 카드를 보일 때인가.
  static bool get inSeason => isStationsSeason(clock());

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Card.outlined(
      key: const ValueKey('lent-stations-card'),
      margin: EdgeInsets.zero,
      clipBehavior: Clip.antiAlias,
      child: ListTile(
        minTileHeight: 64,
        leading: Icon(Icons.directions_walk, color: scheme.primary),
        title: const Text('사순 시기 · 십자가의 길'),
        subtitle: const Text('14처를 따라 짧게 묵상해 보세요'),
        trailing: const Icon(Icons.chevron_right),
        onTap: () => unawaited(
          Navigator.of(context).push(
            MaterialPageRoute<void>(
              settings: const RouteSettings(
                name: StationsOfCrossScreen.routeName,
              ),
              builder: (_) =>
                  const StationsOfCrossScreen(from: StationsFrom.today),
            ),
          ),
        ),
      ),
    );
  }
}
