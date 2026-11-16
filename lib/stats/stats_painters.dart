import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../domain/prayer_data.dart';
import 'logical_day.dart';
import 'prayer_goal.dart';
import 'prayer_record.dart';
import 'stats_logic.dart';

/// 그래프 범주 색(신비 4종·기도 종류). 앱 색 구성(ColorScheme)에는 서로 구별되는 범주색이 없어
/// (primary·secondary·tertiary 가 모두 갈색 계열) 여기 한 곳에 밝게/어둡게 값을 둔다. 값은
/// `test/stats_logic_test.dart` 가 카드 표면(`surfaceContainerLow`) 대비 3:1 이상임을 확인한다.
/// 이미지 카드는 이 색을 쓰지 않고 카드 고정 팔레트를 쓴다(`share_card.dart`).
abstract final class StatsColors {
  static const Map<MysterySet, Color> mysteryLight = {
    MysterySet.joyful: Color(0xFF9A6A00),
    MysterySet.luminous: Color(0xFF1F7A82),
    MysterySet.sorrowful: Color(0xFF7B4A86),
    MysterySet.glorious: Color(0xFFB0432B),
  };
  static const Map<MysterySet, Color> mysteryDark = {
    MysterySet.joyful: Color(0xFFE7C46C),
    MysterySet.luminous: Color(0xFF6CC3C9),
    MysterySet.sorrowful: Color(0xFFD0A4DA),
    MysterySet.glorious: Color(0xFFF09A82),
  };

  static Color mystery(MysterySet s, Brightness b) =>
      (b == Brightness.dark ? mysteryDark : mysteryLight)[s]!;

  /// 기도 종류 색: 묵주기도·십자가의 길·짧은 기도(위 범주색을 다시 쓴다).
  static Color kind(String k, Brightness b) {
    final order = switch (k) {
      PrayerRecord.kindStations => MysterySet.sorrowful,
      PrayerRecord.kindShort => MysterySet.luminous,
      _ => MysterySet.joyful,
    };
    return mystery(order, b);
  }

  static Color forSlice(DonutSlice s, Brightness b) {
    for (final m in MysterySet.values) {
      if (m.name == s.key) return mystery(m, b);
    }
    return kind(s.key, b);
  }
}

/// 히트맵 색 묶음.
class HeatColors {
  const HeatColors({
    required this.empty,
    required this.levels,
    required this.ring,
    required this.streakRing,
    required this.metDot,
  });

  final Color empty;

  /// 농도 1~4.
  final List<Color> levels;
  final Color ring;
  final Color streakRing;
  final Color metDot;

  factory HeatColors.of(ColorScheme s, Color gold) => HeatColors(
    empty: s.outlineVariant.withValues(alpha: 0.35),
    levels: [
      for (final a in const [0.32, 0.52, 0.76, 1.0])
        s.primary.withValues(alpha: a),
    ],
    ring: s.onSurface,
    streakRing: gold,
    metDot: s.onPrimary,
  );
}

/// 기도 히트맵(일요일 시작 주 열 × 7행). 칸 12·간격 2 = 14dp 격자.
class HeatmapPainter extends CustomPainter {
  HeatmapPainter({
    required this.grid,
    required this.days,
    required this.goal,
    required this.colors,
    required this.today,
    this.streak,
  });

  static const double cell = 12;
  static const double gap = 2;
  static const double pitch = cell + gap;

  final HeatmapGrid grid;
  final Map<String, DayAgg> days;
  final PrayerGoal goal;
  final HeatColors colors;
  final String today;
  final StreakSpan? streak;

  static Size sizeFor(HeatmapGrid g) =>
      Size(g.weeks.length * pitch - gap, 7 * pitch - gap);

  @override
  void paint(Canvas canvas, Size size) {
    final fill = Paint();
    final ring = Paint()..style = PaintingStyle.stroke;
    for (var wi = 0; wi < grid.weeks.length; wi++) {
      for (var di = 0; di < 7; di++) {
        final k = grid.weeks[wi][di];
        if (k == null) continue;
        final r = RRect.fromRectAndRadius(
          Rect.fromLTWH(wi * pitch, di * pitch, cell, cell),
          const Radius.circular(3),
        );
        final agg = days[k];
        final lv = heatLevel(agg, goal);
        fill.color = lv == 0 ? colors.empty : colors.levels[lv - 1];
        canvas.drawRRect(r, fill);
        if (agg != null && goal.isMet(decades: agg.decades, seconds: agg.seconds)) {
          fill.color = colors.metDot;
          canvas.drawCircle(r.center, 1.3, fill);
        }
        final inStreak = streak != null &&
            k.compareTo(streak!.s) >= 0 &&
            k.compareTo(streak!.e) <= 0;
        if (inStreak) {
          ring
            ..color = colors.streakRing
            ..strokeWidth = 1.5;
          canvas.drawRRect(r.deflate(0.25), ring);
        }
        if (k == today) {
          ring
            ..color = colors.ring
            ..strokeWidth = 1.5;
          canvas.drawRRect(r.inflate(0.5), ring);
        }
      }
    }
  }

  @override
  bool shouldRepaint(HeatmapPainter old) =>
      old.grid != grid ||
      old.days != days ||
      old.goal != goal ||
      old.streak?.s != streak?.s ||
      old.streak?.e != streak?.e ||
      old.today != today ||
      old.colors.levels.first != colors.levels.first ||
      old.colors.empty != colors.empty;
}

/// 도넛(가운데 글자 없음 — 합계는 범례가 말한다. 큰 글씨에서도 구멍 안에서 겹칠 글자가 없다).
class DonutPainter extends CustomPainter {
  DonutPainter({
    required this.values,
    required this.colors,
    required this.track,
    this.strokeFraction = 0.2,
  });

  final List<int> values;
  final List<Color> colors;
  final Color track;
  final double strokeFraction;

  @override
  void paint(Canvas canvas, Size size) {
    final d = math.min(size.width, size.height);
    final stroke = d * strokeFraction;
    final rect = Rect.fromCenter(
      center: size.center(Offset.zero),
      width: d - stroke,
      height: d - stroke,
    );
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke
      ..color = track;
    canvas.drawArc(rect, 0, math.pi * 2, false, paint);
    final total = values.fold<int>(0, (a, b) => a + b);
    if (total <= 0) return;
    var start = -math.pi / 2;
    const gapAngle = 0.03;
    final nonZero = values.where((v) => v > 0).length;
    for (var i = 0; i < values.length; i++) {
      if (values[i] <= 0) continue;
      final sweep = values[i] / total * math.pi * 2;
      final g = nonZero > 1 ? gapAngle : 0.0;
      paint.color = colors[i];
      canvas.drawArc(rect, start + g / 2, math.max(0.001, sweep - g), false, paint);
      start += sweep;
    }
  }

  @override
  bool shouldRepaint(DonutPainter old) =>
      old.values.toString() != values.toString() ||
      old.colors.toString() != colors.toString() ||
      old.track != track;
}

/// 기간 막대(축 글자 포함). 글자 배율을 반영해 축 글자가 겹치지 않게 일부만 찍는다.
class BarsPainter extends CustomPainter {
  BarsPainter({
    required this.values,
    required this.labels,
    required this.bar,
    required this.selectedBar,
    required this.axis,
    required this.labelStyle,
    required this.scaler,
    this.selected,
    this.goalLine,
    this.goalColor,
  });

  final List<int> values;
  final List<String> labels;
  final Color bar;
  final Color selectedBar;
  final Color axis;
  final TextStyle labelStyle;
  final TextScaler scaler;
  final int? selected;

  /// 하루 목표선(막대와 같은 단위일 때만).
  final int? goalLine;
  final Color? goalColor;

  /// 축 글자 줄 높이.
  static double labelHeight(TextStyle s, TextScaler sc) =>
      sc.scale(s.fontSize ?? 11) * (s.height ?? 1.3) + 6;

  /// 몇 칸마다 글자를 찍을지(가장 넓은 글자가 칸에 겹치지 않을 만큼).
  static int labelEvery(
    List<String> labels,
    double slot,
    TextStyle style,
    TextScaler sc,
  ) {
    var w = 0.0;
    for (final l in labels) {
      final tp = TextPainter(
        text: TextSpan(text: l, style: style),
        textDirection: TextDirection.ltr,
        textScaler: sc,
      )..layout();
      w = math.max(w, tp.width);
      tp.dispose();
    }
    return math.max(1, ((w + 4) / slot).ceil());
  }

  @override
  void paint(Canvas canvas, Size size) {
    final n = values.length;
    if (n == 0) return;
    final lh = labelHeight(labelStyle, scaler);
    final plotH = size.height - lh;
    final slot = size.width / n;
    final barW = math.max(2.0, math.min(slot * 0.62, 28.0));
    final mx = math.max(1, math.max(values.fold(0, math.max), goalLine ?? 0)).toDouble();
    final p = Paint();
    p
      ..color = axis
      ..strokeWidth = 1;
    canvas.drawLine(Offset(0, plotH), Offset(size.width, plotH), p);
    for (var i = 0; i < n; i++) {
      final h = values[i] <= 0 ? 0.0 : math.max(3.0, values[i] / mx * (plotH - 6));
      final x = i * slot + (slot - barW) / 2;
      p.color = i == selected ? selectedBar : bar;
      if (h > 0) {
        canvas.drawRRect(
          RRect.fromRectAndCorners(
            Rect.fromLTWH(x, plotH - h, barW, h),
            topLeft: const Radius.circular(3),
            topRight: const Radius.circular(3),
          ),
          p,
        );
      } else {
        p.color = axis;
        canvas.drawRect(Rect.fromLTWH(x, plotH - 2, barW, 2), p);
      }
    }
    if (goalLine != null && goalLine! > 0 && goalColor != null) {
      final y = plotH - goalLine! / mx * (plotH - 6);
      final gp = Paint()
        ..color = goalColor!
        ..strokeWidth = 1.5;
      for (var x = 0.0; x < size.width; x += 8) {
        canvas.drawLine(Offset(x, y), Offset(math.min(x + 4, size.width), y), gp);
      }
    }
    final every = labelEvery(labels, slot, labelStyle, scaler);
    for (var i = 0; i < n; i += every) {
      final tp = TextPainter(
        text: TextSpan(text: labels[i], style: labelStyle),
        textDirection: TextDirection.ltr,
        textScaler: scaler,
        maxLines: 1,
        ellipsis: '…',
      )..layout(maxWidth: slot * every);
      final cx = i * slot + slot / 2;
      var x = cx - tp.width / 2;
      x = x.clamp(0.0, math.max(0.0, size.width - tp.width));
      tp.paint(canvas, Offset(x, plotH + 4));
      tp.dispose();
    }
  }

  @override
  bool shouldRepaint(BarsPainter old) =>
      old.values.toString() != values.toString() ||
      old.selected != selected ||
      old.bar != bar ||
      old.goalLine != goalLine ||
      old.scaler != scaler;
}

/// 달 라벨 위치(격자에서 새 달이 시작되는 열). 라벨 사이 최소 26dp 를 둔다.
List<(int col, int month)> heatmapMonthLabels(HeatmapGrid g) {
  final out = <(int, int)>[];
  var prev = -1;
  var lastX = -99.0;
  for (var wi = 0; wi < g.weeks.length; wi++) {
    final first = g.weeks[wi].firstWhere((k) => k != null, orElse: () => null);
    if (first == null) continue;
    final m = parseDayKey(first).month;
    if (m != prev) {
      final x = wi * HeatmapPainter.pitch;
      if (x - lastX >= 30) {
        out.add((wi, m));
        lastX = x;
      }
      prev = m;
    }
  }
  return out;
}
