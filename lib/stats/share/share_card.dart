import 'package:flutter/material.dart';

import '../../app/theme.dart';
import '../prayer_goal.dart';
import '../stats_logic.dart';
import '../stats_painters.dart';
import '../text_fit.dart';

/// 공유 이미지 카드. 독서공방 카드 갤러리(`cgCardBg` 배경 8종 · `cgCardLayout` 조판 3종 ·
/// `cgFitCard` 글자 맞춤)의 Flutter 판이다.
///
/// 카드는 **앱 테마·글자 배율과 무관하게** 같은 그림이어야 한다(기기마다 다른 이미지가 나가면
/// 안 된다). 그래서 번들 글꼴 Pretendard 를 이름으로 고정하고, 글자 배율을 1로 고정하며,
/// 색은 아래 [ShareInk]/[ShareBg] 고정 팔레트(밝은 앱 색 구성의 값에서 뽑음)만 쓴다.

/// 카드 배경 8종(독서공방 `CG_BG_SWATCHES`).
enum ShareBg {
  paper('기본 종이빛'),
  ivory('웜 아이보리'),
  burgundy('딥 버건디'),
  night('밤빛 네이비'),
  mist('안개 그라데이션'),
  rainbow('톤다운 파스텔 무지개'),
  dots('미세 점 패턴'),
  grid('밤빛 격자');

  const ShareBg(this.label);
  final String label;

  bool get dark => this == burgundy || this == night || this == grid;
}

/// 조판 3종(독서공방 `CG_LAYOUTS`).
enum ShareLayout {
  center('가운데'),
  left('왼쪽 정렬'),
  grid('칸 나누기');

  const ShareLayout(this.label);
  final String label;
}

/// 이미지 비율: 정사각 1080×1080, 스토리 9:16 1080×1920(논리 360 × 3배).
enum ShareFormat {
  square('정사각', 360, 360),
  story('스토리 9:16', 360, 640);

  const ShareFormat(this.label, this.width, this.height);
  final String label;
  final double width;
  final double height;
}

/// 배경 위 글자·강조 색.
class ShareInk {
  const ShareInk({
    required this.text,
    required this.sub,
    required this.accent,
    required this.hair,
    required this.panel,
    required this.onAccent,
  });

  final Color text;
  final Color sub;
  final Color accent;
  final Color hair;
  final Color panel;
  final Color onAccent;

  static final ColorScheme _l = AppTheme.seedScheme(Brightness.light);
  static final ColorScheme _d = AppTheme.seedScheme(Brightness.dark);

  static ShareInk of(ShareBg bg) => bg.dark
      ? ShareInk(
          text: const Color(0xFFF7EBDA),
          sub: const Color(0xFFD8C3AB),
          accent: _d.primary,
          hair: const Color(0x33F7EBDA),
          panel: const Color(0x1FFFFFFF),
          onAccent: _d.onPrimary,
        )
      : ShareInk(
          text: _l.onSurface,
          sub: _l.onSurfaceVariant,
          accent: _l.primary,
          hair: _l.primary.withValues(alpha: 0.22),
          panel: const Color(0x80FFFFFF),
          onAccent: _l.onPrimary,
        );

  /// 배경 칠(독서공방 `xtPaintBg` 와 같은 값).
  static BoxDecoration decoration(ShareBg bg) {
    LinearGradient lin(List<Color> c, [List<double>? stops]) => LinearGradient(
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
      colors: c,
      stops: stops,
    );
    switch (bg) {
      case ShareBg.paper:
        return BoxDecoration(
          gradient: lin([_l.surfaceBright, _l.surfaceContainerHighest]),
        );
      case ShareBg.mist:
        return BoxDecoration(
          gradient: lin(const [Color(0xFFD8E1DF), Color(0xFFE9DED5)]),
        );
      case ShareBg.rainbow:
        return BoxDecoration(
          gradient: lin(
            const [
              Color(0xFFD8C9D7),
              Color(0xFFD9DFC7),
              Color(0xFFEAD8BF),
              Color(0xFFC9D7DF),
            ],
            const [0, .34, .68, 1],
          ),
        );
      case ShareBg.ivory:
        return const BoxDecoration(color: Color(0xFFE9D8BD));
      case ShareBg.burgundy:
        return const BoxDecoration(color: Color(0xFF4B1F2D));
      case ShareBg.night:
        return const BoxDecoration(color: Color(0xFF1B2031));
      case ShareBg.dots:
        return const BoxDecoration(color: Color(0xFFEADFCD));
      case ShareBg.grid:
        return const BoxDecoration(color: Color(0xFF283047));
    }
  }
}

class _PatternPainter extends CustomPainter {
  _PatternPainter(this.bg);
  final ShareBg bg;

  @override
  void paint(Canvas canvas, Size size) {
    final u = size.width / 360;
    if (bg == ShareBg.dots) {
      final p = Paint()..color = const Color(0x4D5A4B3E);
      for (var y = 6 * u; y < size.height; y += 12 * u) {
        for (var x = 6 * u; x < size.width; x += 12 * u) {
          canvas.drawCircle(Offset(x, y), 1.2 * u, p);
        }
      }
    } else if (bg == ShareBg.grid) {
      final p = Paint()
        ..color = const Color(0x24E9D9BB)
        ..strokeWidth = u;
      for (var x = 0.0; x < size.width; x += 14 * u) {
        canvas.drawLine(Offset(x, 0), Offset(x, size.height), p);
      }
      for (var y = 0.0; y < size.height; y += 14 * u) {
        canvas.drawLine(Offset(0, y), Offset(size.width, y), p);
      }
    }
  }

  @override
  bool shouldRepaint(_PatternPainter old) => old.bg != bg;
}

// ---------------------------------------------------------------- 내용

sealed class ShareVisual {
  const ShareVisual();
}

class HeatVisual extends ShareVisual {
  const HeatVisual({
    required this.grid,
    required this.days,
    required this.goal,
    required this.today,
    this.streak,
  });
  final HeatmapGrid grid;
  final Map<String, DayAgg> days;
  final PrayerGoal goal;
  final String today;
  final StreakSpan? streak;
}

class BarsVisual extends ShareVisual {
  const BarsVisual({required this.values, required this.labels});
  final List<int> values;
  final List<String> labels;
}

class DonutVisual extends ShareVisual {
  const DonutVisual(this.slices);
  final List<DonutSlice> slices;
}

/// 카드에 들어갈 글과 그림. 한 카드 = 한 가지 이야기.
class ShareCardContent {
  const ShareCardContent({
    required this.eyebrow,
    required this.period,
    required this.bigNumber,
    required this.bigUnit,
    this.caption,
    this.rows = const [],
    this.visual,
  });

  /// '이번 주의 기도' 같은 머리글.
  final String eyebrow;

  /// '11월 9일 ~ 11월 15일'.
  final String period;
  final String bigNumber;
  final String bigUnit;
  final String? caption;

  /// (이름, 값) 최대 4개.
  final List<(String, String)> rows;
  final ShareVisual? visual;
}

// ---------------------------------------------------------------- 위젯

/// 공유 카드. 논리 크기는 [ShareFormat.width]×[ShareFormat.height] 로 고정(3배로 내보낸다).
class ShareCard extends StatelessWidget {
  const ShareCard({
    super.key,
    required this.content,
    this.bg = ShareBg.paper,
    this.layout = ShareLayout.center,
    this.format = ShareFormat.square,
  });

  final ShareCardContent content;
  final ShareBg bg;
  final ShareLayout layout;
  final ShareFormat format;

  static const String brand = '로사리움';
  static const double _pad = 28;

  TextStyle _t(double size, Color c, {FontWeight w = FontWeight.w400, double? h}) =>
      TextStyle(
        fontFamily: AppTheme.sansFamily,
        fontSize: size,
        color: c,
        fontWeight: w,
        height: h ?? 1.25,
        decoration: TextDecoration.none,
      );

  @override
  Widget build(BuildContext context) {
    final ink = ShareInk.of(bg);
    final w = format.width, h = format.height;
    final story = format == ShareFormat.story;
    final contentW = w - _pad * 2;
    const scaler = TextScaler.noScaling;
    return MediaQuery(
      data: MediaQuery.of(context).copyWith(textScaler: scaler),
      child: Directionality(
        textDirection: TextDirection.ltr,
        child: SizedBox(
          width: w,
          height: h,
          child: DecoratedBox(
            decoration: ShareInk.decoration(bg),
            child: CustomPaint(
              painter: _PatternPainter(bg),
              child: Padding(
                padding: EdgeInsets.fromLTRB(_pad, story ? 56 : _pad, _pad, story ? 56 : _pad),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.add, size: 16, color: ink.accent),
                        const SizedBox(width: 6),
                        Expanded(
                          child: FitText(
                            '$brand · ${content.eyebrow}',
                            style: _t(14, ink.sub, w: FontWeight.w600),
                            minSize: 10,
                            scaler: scaler,
                          ),
                        ),
                      ],
                    ),
                    Expanded(
                      child: Padding(
                        padding: EdgeInsets.only(top: story ? 24 : 14, bottom: 8),
                        child: Center(
                        child: FittedBox(
                          fit: BoxFit.scaleDown,
                          child: SizedBox(
                            width: contentW,
                            child: _body(ink, contentW, story),
                          ),
                        ),
                      ),
                      ),
                    ),
                    Container(height: 1, color: ink.hair),
                    const SizedBox(height: 8),
                    FitText(
                      content.period,
                      style: _t(12, ink.sub),
                      minSize: 9,
                      scaler: scaler,
                      textAlign: layout == ShareLayout.left ? TextAlign.left : TextAlign.center,
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _body(ShareInk ink, double width, bool story) {
    final left = layout != ShareLayout.center;
    final align = left ? CrossAxisAlignment.start : CrossAxisAlignment.center;
    final ta = left ? TextAlign.left : TextAlign.center;
    final bigSize = layout == ShareLayout.grid ? 56.0 : (story ? 88.0 : 72.0);
    final big = SizedBox(
      width: width,
      child: FitText(
        content.bigNumber,
        style: _t(bigSize, ink.accent, w: FontWeight.w700, h: 1.05),
        minSize: 28,
        scaler: TextScaler.noScaling,
        textAlign: ta,
      ),
    );
    final unit = SizedBox(
      width: width,
      child: FitText(
        content.bigUnit,
        style: _t(story ? 22 : 19, ink.text, w: FontWeight.w600),
        minSize: 13,
        maxLines: 2,
        scaler: TextScaler.noScaling,
        textAlign: ta,
      ),
    );
    final caption = content.caption == null
        ? const SizedBox.shrink()
        : Padding(
            padding: const EdgeInsets.only(top: 10),
            child: SizedBox(
              width: width,
              child: FitText(
                content.caption!,
                style: _t(14, ink.sub, h: 1.4),
                minSize: 11,
                maxLines: 3,
                scaler: TextScaler.noScaling,
                textAlign: ta,
              ),
            ),
          );
    final visual = content.visual == null
        ? const SizedBox.shrink()
        : Padding(
            padding: const EdgeInsets.only(top: 18),
            child: _visual(ink, width, story),
          );
    final rows = _rows(ink, width);
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: align,
      children: [
        big,
        unit,
        caption,
        visual,
        if (content.rows.isNotEmpty) Padding(padding: const EdgeInsets.only(top: 18), child: rows),
      ],
    );
  }

  Widget _rows(ShareInk ink, double width) {
    final rows = content.rows.take(4).toList();
    switch (layout) {
      case ShareLayout.center:
        return SizedBox(
          width: width,
          child: Wrap(
            alignment: WrapAlignment.center,
            spacing: 22,
            runSpacing: 10,
            children: [
              for (final r in rows)
                ConstrainedBox(
                  constraints: BoxConstraints(maxWidth: width / 2 - 12),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      FitText(r.$2, style: _t(20, ink.text, w: FontWeight.w700), minSize: 12, scaler: TextScaler.noScaling, textAlign: TextAlign.center),
                      FitText(r.$1, style: _t(12, ink.sub), minSize: 9, scaler: TextScaler.noScaling, textAlign: TextAlign.center),
                    ],
                  ),
                ),
            ],
          ),
        );
      case ShareLayout.left:
        return SizedBox(
          width: width,
          child: Column(
            children: [
              for (final r in rows)
                Container(
                  padding: const EdgeInsets.symmetric(vertical: 7),
                  decoration: BoxDecoration(border: Border(top: BorderSide(color: ink.hair))),
                  child: Row(
                    children: [
                      Expanded(
                        flex: 5,
                        child: FitText(r.$1, style: _t(14, ink.sub), minSize: 10, scaler: TextScaler.noScaling),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        flex: 4,
                        child: FitText(r.$2, style: _t(16, ink.text, w: FontWeight.w700), minSize: 11, scaler: TextScaler.noScaling, textAlign: TextAlign.right),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        );
      case ShareLayout.grid:
        final tileW = (width - 10) / 2;
        return SizedBox(
          width: width,
          child: Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              for (final r in rows)
                Container(
                  width: tileW,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: ink.panel,
                    borderRadius: AppShape.medium,
                    border: Border.all(color: ink.hair),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      FitText(r.$2, style: _t(20, ink.text, w: FontWeight.w700), minSize: 12, scaler: TextScaler.noScaling),
                      FitText(r.$1, style: _t(12, ink.sub), minSize: 9, scaler: TextScaler.noScaling),
                    ],
                  ),
                ),
            ],
          ),
        );
    }
  }

  Widget _visual(ShareInk ink, double width, bool story) {
    final v = content.visual!;
    switch (v) {
      case HeatVisual():
        final size = HeatmapPainter.sizeFor(v.grid);
        final colors = HeatColors(
          empty: ink.text.withValues(alpha: 0.12),
          levels: [for (final a in const [0.32, 0.52, 0.76, 1.0]) ink.accent.withValues(alpha: a)],
          // 작게 줄여 그리는 카드에서는 고리·점이 얼룩이 되므로 농도만 쓴다.
          ring: Colors.transparent,
          streakRing: Colors.transparent,
          metDot: Colors.transparent,
        );
        return SizedBox(
          width: width,
          child: FittedBox(
            fit: BoxFit.fitWidth,
            child: CustomPaint(
              size: size,
              painter: HeatmapPainter(
                grid: v.grid,
                days: v.days,
                goal: v.goal,
                colors: colors,
                today: v.today,
                streak: v.streak,
              ),
            ),
          ),
        );
      case BarsVisual():
        return SizedBox(
          width: width,
          height: story ? 120 : 70,
          child: CustomPaint(
            painter: BarsPainter(
              values: v.values,
              labels: v.labels,
              bar: ink.accent,
              selectedBar: ink.accent,
              axis: ink.hair,
              labelStyle: _t(10, ink.sub),
              scaler: TextScaler.noScaling,
            ),
          ),
        );
      case DonutVisual():
        final shown = v.slices;
        final isDark = bg.dark;
        final colors = [
          for (final s in shown)
            StatsColors.forSlice(s, isDark ? Brightness.dark : Brightness.light),
        ];
        return Row(
          children: [
            SizedBox(
              width: story ? 110 : 84,
              height: story ? 110 : 84,
              child: CustomPaint(
                painter: DonutPainter(
                  values: [for (final s in shown) s.n],
                  colors: colors,
                  track: ink.text.withValues(alpha: 0.1),
                ),
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                children: [
                  for (var i = 0; i < shown.length; i++)
                    if (shown[i].n > 0)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 3),
                        child: Row(
                          children: [
                            Container(width: 9, height: 9, decoration: BoxDecoration(color: colors[i], shape: BoxShape.circle)),
                            const SizedBox(width: 7),
                            Expanded(
                              child: FitText(shown[i].label, style: _t(13, ink.text), minSize: 9, scaler: TextScaler.noScaling),
                            ),
                            const SizedBox(width: 6),
                            Text('${shown[i].pct}%', style: _t(13, ink.sub, w: FontWeight.w600), textScaler: TextScaler.noScaling),
                          ],
                        ),
                      ),
                ],
              ),
            ),
          ],
        );
    }
  }
}
