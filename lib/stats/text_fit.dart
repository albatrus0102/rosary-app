import 'package:flutter/material.dart';

/// 글자 맞춤 도구. 독서공방 `fitCanvasText`(한 줄: 글자 크기를 줄이다가 안 되면 …) 와
/// `cgFitCard`(여러 글자 칸을 함께 줄이고, 그래도 안 되면 줄 수 제한) 의 이식.
///
/// 규칙: 넘치면 먼저 글자 크기를 [minSize]까지 줄이고, 그래도 안 되면 말줄임표(…)를 쓴다.
/// 낱말은 글자 중간에서 끊지 않는다([keepAll]).

/// 낱말 사이(공백)에서만 줄이 바뀌게 한다(CSS `word-break: keep-all`). 글자 사이에
/// 폭 없는 붙임 표시(U+2060)를 넣어 한글이 음절 중간에서 꺾이지 않게 한다. 화면 표시와 이미지
/// 카드의 여러 줄 글에 쓰고, 읽어 주는 라벨에는 쓰지 않는다.
String keepAll(String s) {
  final b = StringBuffer();
  final runes = s.runes.toList();
  for (var i = 0; i < runes.length; i++) {
    final c = String.fromCharCode(runes[i]);
    b.write(c);
    if (i + 1 < runes.length && c != ' ' && c != '\n') {
      final n = runes[i + 1];
      if (n != 0x20 && n != 0x0A) b.write('⁠');
    }
  }
  return b.toString();
}

/// [text]가 [maxWidth] 안에 [maxLines]줄로 들어가는 가장 큰 글자 크기(0.5 단위로 줄임).
/// [minSize]에서도 안 들어가면 [minSize]를 돌려준다(그때는 [FitText]가 …로 자른다).
double fitFontSize({
  required String text,
  required TextStyle style,
  required double maxWidth,
  required double size,
  required double minSize,
  int maxLines = 1,
  TextScaler scaler = TextScaler.noScaling,
  TextDirection direction = TextDirection.ltr,
}) {
  var s = size;
  while (s > minSize) {
    if (_fits(text, style.copyWith(fontSize: s), maxWidth, maxLines, scaler, direction)) {
      return s;
    }
    s -= 0.5;
  }
  return minSize;
}

bool _fits(
  String text,
  TextStyle style,
  double maxWidth,
  int maxLines,
  TextScaler scaler,
  TextDirection direction,
) {
  final tp = TextPainter(
    text: TextSpan(text: keepAll(text), style: style),
    textDirection: direction,
    textScaler: scaler,
    maxLines: maxLines,
  )..layout(maxWidth: maxWidth);
  final ok = !tp.didExceedMaxLines && tp.width <= maxWidth + 0.5;
  // 줄 중 가장 긴 것도 폭 안인지(낱말이 통째로 넘치는 경우).
  final lines = tp.computeLineMetrics();
  final wide = lines.any((l) => l.width > maxWidth + 0.5);
  tp.dispose();
  return ok && !wide;
}

/// 폭에 맞춰 글자 크기를 줄이고, 그래도 넘치면 …로 자르는 글자. 큰 글씨 설정에서도 이미지
/// 카드처럼 글자 배율을 [scaler]로 고정해 쓸 수 있다(기본은 화면 설정을 따른다).
class FitText extends StatelessWidget {
  const FitText(
    this.text, {
    super.key,
    required this.style,
    this.minSize,
    this.maxLines = 1,
    this.textAlign,
    this.scaler,
    this.keepWords = true,
  });

  final String text;
  final TextStyle style;

  /// 줄일 수 있는 가장 작은 크기(기본: 시작 크기의 60%).
  final double? minSize;
  final int maxLines;
  final TextAlign? textAlign;

  /// null 이면 [MediaQuery] 의 글자 배율.
  final TextScaler? scaler;
  final bool keepWords;

  @override
  Widget build(BuildContext context) {
    final sc = scaler ?? MediaQuery.textScalerOf(context);
    final base = (style.fontSize ?? 14);
    return LayoutBuilder(
      builder: (context, c) {
        final w = c.maxWidth.isFinite ? c.maxWidth : 10000.0;
        final size = fitFontSize(
          text: text,
          style: style,
          maxWidth: w,
          size: base,
          minSize: minSize ?? base * 0.6,
          maxLines: maxLines,
          scaler: sc,
          direction: Directionality.of(context),
        );
        return Text(
          keepWords ? keepAll(text) : text,
          style: style.copyWith(fontSize: size),
          maxLines: maxLines,
          overflow: TextOverflow.ellipsis,
          textAlign: textAlign,
          textScaler: sc,
          semanticsLabel: text,
        );
      },
    );
  }
}
