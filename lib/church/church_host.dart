import 'package:flutter/widgets.dart';

/// 성당 보기를 품은 쪽(성당 탭)이 아래 성당 화면들에 알려 주는 것.
///
/// 성당 화면([ChurchTab]·[ChurchScreen])은 다른 탭·'창' 보기로 가도 사라지지 않고 그대로 남는다.
/// 대신 [visible]이 false인 동안 장면 그리기와 소리를 멈추고(일시정지), 오래 안 보이면 접속을
/// 끊었다가 돌아오면 같은 자리로 복원한다. 이 위젯이 없으면(단독 화면·테스트) 항상 보이는 것으로 본다.
class ChurchHost extends InheritedWidget {
  const ChurchHost({
    super.key,
    required this.visible,
    this.onInChurchChanged,
    required super.child,
  });

  /// 성당 보기가 지금 화면에 보이는가(성당 탭이 선택돼 있고 '성당' 보기일 때).
  final bool visible;

  /// 성당 장면 안에 들어갔는지(true)/나왔는지(false).
  final ValueChanged<bool>? onInChurchChanged;

  /// 보이는지 여부(바뀌면 다시 빌드된다). 호스트가 없으면 true.
  static bool visibleOf(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<ChurchHost>()?.visible ?? true;

  /// 의존 관계를 만들지 않고 읽는다(콜백을 부를 때).
  static ChurchHost? read(BuildContext context) =>
      context.getInheritedWidgetOfExactType<ChurchHost>();

  @override
  bool updateShouldNotify(ChurchHost old) => old.visible != visible;
}
