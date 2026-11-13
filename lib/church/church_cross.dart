import 'package:flutter/material.dart';

import '../app/theme.dart';
import '../domain/stations_of_cross.dart';
import 'church_hud.dart';

/// 성당 안 십자가의 길 판 앞에 서면 뜨는 칩: '십자가의 길 n처 · 명칭 — 묵상하기'.
///
/// 자리는 HUD 열의 진본 창 칩(`ChurchGlassChip`) 바로 아래 줄(같은 줄에 두지 않아 겹치지 않는다).
/// 최소 높이 48, 한 줄 말줄임(글자 2배에서도 한 줄), 누르면 묵상 시트를 연다.
class ChurchCrossChip extends StatelessWidget {
  const ChurchCrossChip({super.key, required this.n, required this.onTap});

  /// 1..14
  final int n;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    final fg = scheme.onInverseSurface;
    final st = StationsOfCross.byNumber(n);
    return Semantics(
      button: true,
      label: '십자가의 길 $n처, ${st.title}. 묵상하기',
      excludeSemantics: true,
      child: Material(
        color: scheme.inverseSurface,
        shape: AppShape.smallBorder,
        clipBehavior: Clip.antiAlias,
        elevation: ChurchHudStyle.elevation,
        child: InkWell(
          onTap: onTap,
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 48),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpace.sm),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.menu_book_outlined, size: 20, color: fg),
                  const SizedBox(width: AppSpace.xs),
                  Flexible(
                    child: Text(
                      '십자가의 길 $n처 · ${st.title}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: text.labelLarge?.copyWith(color: fg),
                    ),
                  ),
                  const SizedBox(width: AppSpace.xs),
                  Text(
                    '묵상하기',
                    style: text.labelMedium?.copyWith(
                      color: scheme.inversePrimary,
                    ),
                  ),
                  Icon(Icons.chevron_right, size: 18, color: fg),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// 성당 안 순례에 필요한 판 개수(웹 `stations.cross`가 이 값이어야 '가기'에 십자가의 길이 나온다).
abstract final class StationsOfCrossWalk {
  static final int count = StationsOfCross.all.length;
}
