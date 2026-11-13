import 'package:flutter/material.dart';

import '../../app/window_class.dart';

/// 스크롤 화면 본문용 슬리버: 창 크기 분류별 좌우 여백(16/24dp), 최대 폭 제한과
/// 가운데 정렬, 노치·제스처 영역 보호(SafeArea), 키보드 이동 그룹을 한데 묶는다.
///
/// 본문은 [RepaintBoundary] 안에 둔다. SliverToBoxAdapter는 (SliverList와 달리) 자식에
/// 다시 그리기 경계를 두지 않아서, 경계가 없으면 스크롤하는 매 프레임마다 본문 전체
/// (카드·글자·그림·차트)의 그리기 명령을 다시 만든다. 경계가 있으면 스크롤 중에는 이미
/// 만든 레이어의 위치만 옮긴다.
class SliverPageBody extends StatelessWidget {
  const SliverPageBody({
    super.key,
    required this.child,
    this.maxWidth = 720,
    this.bottomPadding = 24,
  });

  final Widget child;
  final double maxWidth;
  final double bottomPadding;

  @override
  Widget build(BuildContext context) {
    final margin = windowClassOf(context).margin;
    return SliverSafeArea(
      top: false,
      sliver: SliverToBoxAdapter(
        child: RepaintBoundary(
          child: FocusTraversalGroup(
            child: Center(
              child: ConstrainedBox(
                constraints: BoxConstraints(maxWidth: maxWidth),
                child: Padding(
                  padding: EdgeInsets.fromLTRB(
                    margin,
                    0,
                    margin,
                    bottomPadding,
                  ),
                  child: child,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
