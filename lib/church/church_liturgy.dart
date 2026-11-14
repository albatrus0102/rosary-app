import 'dart:async';

import 'package:flutter/material.dart';

import '../app/theme.dart';
import '../app/track.dart';
import '../domain/liturgical_season.dart';

/// 성당의 전례 시기 장식(SPEC §33, docs/church/LITURGICAL_DECOR.md) 연결.
///
/// 오늘(KST)의 전례 시기를 계산해 장면(`ChurchAPI.setLiturgy`)과 HUD 상태 칩 부제에 준다.
/// 설정의 '전례 시기 미리 보기'([preview])를 바꾸면 다른 시기의 장식을 바로 볼 수 있다
/// (저장하지 않는다: 앱을 다시 켜면 오늘 날짜로 돌아간다).
abstract final class ChurchLiturgy {
  /// 미리 보기 선택. 기본은 오늘 날짜.
  static final ValueNotifier<LiturgyPreview> preview = ValueNotifier(
    LiturgyPreview.today,
  );

  /// 지금 시각(시험에서 바꾼다).
  @visibleForTesting
  static DateTime Function() clock = DateTime.now;

  /// 지금 성당에 보여 줄 전례 정보(미리 보기 반영).
  static LiturgicalDay current() => preview.value.resolve(clock());
}

/// 전례 색의 화면 표시 색(칩의 색 점·미리 보기 목록).
Color liturgicalColor(LiturgicalColor c) => switch (c) {
  LiturgicalColor.violet => const Color(0xFF6A3D9A),
  LiturgicalColor.white => const Color(0xFFF4EEDD),
  LiturgicalColor.green => const Color(0xFF2E7D32),
  LiturgicalColor.red => const Color(0xFFC62828),
  LiturgicalColor.rose => const Color(0xFFD98AA8),
};

/// 상태 칩 부제(예: '사순 시기', '연중 시기 · 위령 성월', '주님 부활 대축일').
/// [now]는 시각(기본: 지금). KST 날짜로 계산하고 미리 보기는 반영하지 않는다.
String liturgicalChipLabel([DateTime? now]) =>
    LiturgicalDay.now(now ?? ChurchLiturgy.clock()).chipLabel;

/// 전례 색 점(●). 흰색은 바탕과 구별되게 테두리를 둔다.
class LiturgicalColorDot extends StatelessWidget {
  const LiturgicalColorDot({super.key, required this.color, this.size = 10});

  final LiturgicalColor color;
  final double size;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return ExcludeSemantics(
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: liturgicalColor(color),
          shape: BoxShape.circle,
          border: Border.all(color: scheme.outline, width: 1),
        ),
      ),
    );
  }
}

/// 성당 화면이 쓰는 묶음: 지금의 전례 정보를 들고 있다가, KST 자정이 지나거나
/// 미리 보기가 바뀌면 [onChanged]를 부른다.
class ChurchLiturgyBinding {
  ChurchLiturgyBinding({required this.onChanged}) {
    _day = ChurchLiturgy.current();
    ChurchLiturgy.preview.addListener(_refresh);
    _arm();
  }

  final VoidCallback onChanged;
  late LiturgicalDay _day;
  Timer? _timer;
  bool _disposed = false;

  /// 지금 성당에 보여 주는 전례 정보.
  LiturgicalDay get day => _day;

  /// 상태 칩 부제.
  String get chipLabel => _day.chipLabel;

  /// 장면 `setLiturgy` 인자.
  Map<String, Object?> get sceneArgs => _day.toSceneArgs();

  void _arm() {
    _timer?.cancel();
    // 자정 직후(1초 여유)에 다시 계산한다.
    final wait =
        untilNextKstMidnight(ChurchLiturgy.clock()) +
        const Duration(seconds: 1);
    _timer = Timer(wait, () {
      _refresh();
      _arm();
    });
  }

  /// 다시 계산한다(앱이 오래 멈췄다 돌아왔을 때도 부른다). 바뀌었으면 [onChanged].
  void refresh() => _refresh();

  void _refresh() {
    if (_disposed) return;
    final d = ChurchLiturgy.current();
    if (d.toString() == _day.toString() && d.chipLabel == _day.chipLabel) {
      return;
    }
    _day = d;
    onChanged();
  }

  void dispose() {
    _disposed = true;
    _timer?.cancel();
    _timer = null;
    ChurchLiturgy.preview.removeListener(_refresh);
  }
}

/// 설정 '성당' 구역의 '전례 시기 미리 보기' 항목. 누르면 고르는 창이 열린다.
class ChurchLiturgyPreviewTile extends StatelessWidget {
  const ChurchLiturgyPreviewTile({super.key});

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<LiturgyPreview>(
      valueListenable: ChurchLiturgy.preview,
      builder: (context, value, _) {
        final day = ChurchLiturgy.current();
        final now = value == LiturgyPreview.today
            ? '오늘 날짜대로 · ${day.chipLabel}'
            : '${value.labelKo} 장식을 보는 중 · 앱을 다시 켜면 오늘 날짜로 돌아가요';
        return ListTile(
          key: const ValueKey('settings-church-liturgy'),
          leading: const Icon(Icons.event_outlined),
          title: const Text('전례 시기 미리 보기'),
          subtitle: Text('성당 장식을 다른 전례 시기로 바꿔 봅니다\n$now'),
          isThreeLine: true,
          trailing: LiturgicalColorDot(color: day.decorColor, size: 14),
          onTap: () => _pick(context, value),
        );
      },
    );
  }

  Future<void> _pick(BuildContext context, LiturgyPreview current) async {
    final picked = await showDialog<LiturgyPreview>(
      context: context,
      builder: (context) => _LiturgyPreviewDialog(current: current),
    );
    if (picked == null || picked == ChurchLiturgy.preview.value) return;
    ChurchLiturgy.preview.value = picked;
    // 어떤 설정인지만 기록한다(고른 시기는 보내지 않는다).
    Track.setting('church_liturgy_preview');
  }
}

class _LiturgyPreviewDialog extends StatelessWidget {
  const _LiturgyPreviewDialog({required this.current});

  final LiturgyPreview current;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return AlertDialog(
      title: const Text('전례 시기 미리 보기'),
      contentPadding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
      content: SizedBox(
        width: 320,
        child: RadioGroup<LiturgyPreview>(
          groupValue: current,
          onChanged: (v) {
            if (v != null) Navigator.of(context).pop(v);
          },
          child: ListView(
            shrinkWrap: true,
            children: [
              for (final p in LiturgyPreview.values)
                RadioListTile<LiturgyPreview>(
                  key: ValueKey('liturgy-preview-${p.name}'),
                  value: p,
                  dense: true,
                  selected: p == current,
                  selectedTileColor: scheme.secondaryContainer,
                  shape: const RoundedRectangleBorder(
                    borderRadius: AppShape.large,
                  ),
                  title: Text(p.labelKo),
                  secondary: p == LiturgyPreview.today
                      ? null
                      : LiturgicalColorDot(
                          color: p.resolve(ChurchLiturgy.clock()).decorColor,
                          size: 14,
                        ),
                ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('닫기'),
        ),
      ],
    );
  }
}
