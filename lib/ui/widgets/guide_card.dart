import 'dart:async';

import 'package:flutter/material.dart';

import '../../app/guide_voice.dart';
import '../../app/settings.dart';
import '../../app/theme.dart';
import '../../stats/text_fit.dart';

/// 첫 사용 안내(앱 소개·성당 안내·묵주기도 화면 안내)가 함께 쓰는 큰 글 규격.
/// 누구나 한눈에 읽도록 본문 20sp·제목 24sp·단추 높이 56dp·단추 글자 18sp.
abstract final class GuideStyle {
  static const double bodySize = 20;
  static const double titleSize = 24;
  static const double labelSize = 18;
  static const double buttonHeight = 56;

  /// 안내 글이 따르는 시스템 글자 배율의 상한(틀이 깨지지 않게).
  static const double maxScale = 1.3;

  static TextStyle body(BuildContext context) =>
      Theme.of(context).textTheme.bodyLarge!.copyWith(
        fontSize: bodySize,
        height: 1.45,
        fontWeight: FontWeight.w500,
      );

  static TextStyle title(BuildContext context) =>
      Theme.of(context).textTheme.titleLarge!.copyWith(
        fontSize: titleSize,
        height: 1.3,
        fontWeight: FontWeight.w700,
      );

  static TextStyle count(BuildContext context) =>
      Theme.of(context).textTheme.titleMedium!.copyWith(
        fontSize: 18,
        fontWeight: FontWeight.w700,
        color: Theme.of(context).colorScheme.primary,
      );

  static TextStyle _label(BuildContext context, FontWeight w) =>
      Theme.of(context).textTheme.labelLarge!.copyWith(
        fontSize: labelSize,
        fontWeight: w,
        height: 1.2,
      );

  static ButtonStyle primaryButton(BuildContext context) =>
      FilledButton.styleFrom(
        minimumSize: const Size(96, buttonHeight),
        padding: const EdgeInsets.symmetric(horizontal: AppSpace.md),
        textStyle: _label(context, FontWeight.w700),
      );

  static ButtonStyle secondaryButton(BuildContext context) =>
      TextButton.styleFrom(
        minimumSize: const Size(80, buttonHeight),
        padding: const EdgeInsets.symmetric(horizontal: AppSpace.sm),
        textStyle: _label(context, FontWeight.w600),
      );
}

/// 자식이 보이는 동안 [text]를 기기 목소리로 읽어 준다(켜져 있을 때만).
/// [text]가 바뀌면(단계가 바뀌면) 새 글을 읽고, 사라지면 읽기를 멈춘다.
/// [blocked]가 true 면(기도 소리 중) 읽지 않는다.
class GuideNarration extends StatefulWidget {
  const GuideNarration({
    super.key,
    required this.settings,
    required this.text,
    required this.child,
    this.blocked,
  });

  final AppSettings? settings;
  final String text;
  final bool Function()? blocked;
  final Widget child;

  @override
  State<GuideNarration> createState() => _GuideNarrationState();
}

class _GuideNarrationState extends State<GuideNarration> {
  bool? _wasOn;

  @override
  void initState() {
    super.initState();
    widget.settings?.addListener(_onSettings);
    _wasOn = widget.settings?.guideTtsOn;
    _speak();
  }

  @override
  void didUpdateWidget(GuideNarration old) {
    super.didUpdateWidget(old);
    if (old.settings != widget.settings) {
      old.settings?.removeListener(_onSettings);
      widget.settings?.addListener(_onSettings);
      _wasOn = widget.settings?.guideTtsOn;
    }
    if (old.text != widget.text) _speak();
  }

  void _onSettings() {
    final on = widget.settings?.guideTtsOn;
    if (on == _wasOn) return;
    _wasOn = on;
    if (on == true) {
      _speak();
    } else {
      unawaited(GuideVoice.stop());
    }
  }

  void _speak() {
    final s = widget.settings;
    if (s == null || !s.guideTtsOn) return;
    unawaited(GuideVoice.speak(widget.text, blocked: widget.blocked));
  }

  @override
  void dispose() {
    widget.settings?.removeListener(_onSettings);
    unawaited(GuideVoice.stop());
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => widget.child;
}

/// 안내 카드의 작은 스피커 단추: 소리로 읽기 켜기/끄기(기기에 저장된다). 누를 자리는 48dp.
class GuideSpeakerButton extends StatelessWidget {
  const GuideSpeakerButton({
    super.key,
    required this.settings,
    this.color,
  });

  final AppSettings settings;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: settings,
      builder: (context, _) {
        final on = settings.guideTtsOn;
        final tip = on ? '소리로 읽기 끄기' : '소리로 읽기 켜기';
        return IconButton(
          tooltip: tip,
          constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
          isSelected: on,
          color: color ?? Theme.of(context).colorScheme.primary,
          icon: Icon(on ? Icons.volume_up : Icons.volume_off, size: 26),
          onPressed: () => settings.guideTtsOn = !on,
        );
      },
    );
  }
}

/// 큰 안내 카드: 단계 표시(2 / 5) · 제목(선택) · 큰 글 · 스피커 · 단추(기본 56dp 단추 + 보조 단추).
///
/// [keyPrefix]로 시험용 키(`-card`·`-count`·`-text`·`-tts`)를 만든다. 글은 [GuideNarration]이 읽어 준다.
class GuideCard extends StatelessWidget {
  const GuideCard({
    super.key,
    required this.keyPrefix,
    required this.counter,
    required this.text,
    required this.primaryLabel,
    required this.onPrimary,
    this.primaryKey,
    this.secondaryLabel,
    this.onSecondary,
    this.secondaryKey,
    this.title,
    this.settings,
    this.speakBlocked,
    this.semanticsLabel,
    this.maxWidth = 440,
  });

  final String keyPrefix;
  final String counter;
  final String? title;
  final String text;
  final String primaryLabel;
  final VoidCallback onPrimary;
  final Key? primaryKey;
  final String? secondaryLabel;
  final VoidCallback? onSecondary;
  final Key? secondaryKey;

  /// 있으면 스피커 단추와 읽어 주기를 쓴다.
  final AppSettings? settings;
  final bool Function()? speakBlocked;
  final String? semanticsLabel;
  final double maxWidth;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final spoken = title == null ? text : '$title. $text';
    final s = settings;
    Widget card = ConstrainedBox(
      constraints: BoxConstraints(maxWidth: maxWidth),
      child: Semantics(
        container: true,
        liveRegion: true,
        label: semanticsLabel ?? '$counter. $spoken',
        child: Material(
          key: ValueKey('$keyPrefix-card'),
          color: scheme.surfaceContainerHigh,
          elevation: 6,
          shape: RoundedRectangleBorder(borderRadius: AppShape.large),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(
              AppSpace.sm,
              AppSpace.xs,
              AppSpace.sm,
              AppSpace.sm,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: ExcludeSemantics(
                        child: Text(
                          counter,
                          key: ValueKey('$keyPrefix-count'),
                          style: GuideStyle.count(context),
                        ),
                      ),
                    ),
                    if (s != null)
                      GuideSpeakerButton(
                        key: ValueKey('$keyPrefix-tts'),
                        settings: s,
                      ),
                  ],
                ),
                if (title != null) ...[
                  ExcludeSemantics(
                    child: Text(
                      keepAll(title!),
                      key: ValueKey('$keyPrefix-title'),
                      style: GuideStyle.title(context),
                    ),
                  ),
                  const SizedBox(height: AppSpace.xs),
                ],
                ExcludeSemantics(
                  child: Text(
                    keepAll(text),
                    key: ValueKey('$keyPrefix-text'),
                    style: GuideStyle.body(context),
                  ),
                ),
                const SizedBox(height: AppSpace.sm),
                Row(
                  children: [
                    if (secondaryLabel != null) ...[
                      TextButton(
                        key: secondaryKey,
                        style: GuideStyle.secondaryButton(context),
                        onPressed: onSecondary,
                        child: Text(secondaryLabel!),
                      ),
                      const SizedBox(width: AppSpace.xs),
                    ],
                    Expanded(
                      child: FilledButton(
                        key: primaryKey,
                        style: GuideStyle.primaryButton(context),
                        onPressed: onPrimary,
                        child: Text(primaryLabel),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
    card = MediaQuery.withClampedTextScaling(
      maxScaleFactor: GuideStyle.maxScale,
      child: card,
    );
    if (s == null) return card;
    return GuideNarration(
      settings: s,
      text: spoken,
      blocked: speakBlocked,
      child: card,
    );
  }
}
