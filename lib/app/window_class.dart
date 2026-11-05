import 'package:flutter/widgets.dart';

/// Material 3 창 크기 분류(window size class). 폭(dp) 기준.
/// compact < 600 ≤ medium < 840 ≤ expanded.
enum WindowClass { compact, medium, expanded }

WindowClass windowClassOfWidth(double width) {
  if (width < 600) return WindowClass.compact;
  if (width < 840) return WindowClass.medium;
  return WindowClass.expanded;
}

WindowClass windowClassOf(BuildContext context) =>
    windowClassOfWidth(MediaQuery.sizeOf(context).width);

extension WindowClassX on WindowClass {
  bool get isCompact => this == WindowClass.compact;

  /// 폭이 600dp 이상(태블릿·폴더블 펼침·가로 모드).
  bool get isWide => this != WindowClass.compact;
}
