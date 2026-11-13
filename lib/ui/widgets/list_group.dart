import 'package:flutter/material.dart';

import 'section_header.dart';

/// 앱 전체에서 같은 모양으로 쓰는 목록 묶음: M3 채운 카드(`surfaceContainerLow`, medium 12dp)
/// 안에 [ListTile]·스위치 타일 등을 세로로 담는다.
///
/// 설정·더보기·계정·동의·기록 화면이 모두 이 한 가지 컨테이너를 쓴다(윤곽선 카드와 섞지 않는다).
class ListGroup extends StatelessWidget {
  const ListGroup({super.key, required this.children, this.padding});

  final List<Widget> children;

  /// 안쪽 여백. 목록 타일은 자체 여백이 있으므로 기본은 없음.
  final EdgeInsetsGeometry? padding;

  @override
  Widget build(BuildContext context) {
    final column = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: children,
    );
    return Card.filled(
      color: Theme.of(context).colorScheme.surfaceContainerLow,
      child: padding == null
          ? column
          : Padding(padding: padding!, child: column),
    );
  }
}

/// M3 목록 소제목([SectionHeader]) + [ListGroup]. 아래에 16dp 간격을 둔다.
class ListSection extends StatelessWidget {
  const ListSection({
    super.key,
    required this.title,
    required this.children,
    this.trailing,
    this.padding,
  });

  final String title;
  final List<Widget> children;
  final Widget? trailing;
  final EdgeInsetsGeometry? padding;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SectionHeader(title, trailing: trailing),
          ListGroup(padding: padding, children: children),
        ],
      ),
    );
  }
}
