import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/speech/amen_detector.dart';
import 'package:rosary_app/speech/mic_capture.dart';
import 'package:rosary_app/ui/mic_test_screen.dart';
import 'package:rosary_app/ui/widgets/speech_debug_panel.dart';

class _FakeDiag implements DiagnosticAmenDetector {
  final _phrases = StreamController<String>.broadcast();
  final _amens = StreamController<int>.broadcast();
  final stateN = ValueNotifier(DetectorState.preparingModel);
  final levelN = ValueNotifier<double>(0);
  final dbfsN = ValueNotifier<double>(-90);
  final gainN = ValueNotifier<double>(20);
  final transcriptN = ValueNotifier<String>('');
  final phraseN = ValueNotifier<int>(0);
  final amenN = ValueNotifier<int>(0);
  bool started = false;
  bool stopped = false;

  @override
  Stream<String> get phraseEvents => _phrases.stream;
  @override
  Stream<int> get amenEvents => _amens.stream;
  @override
  ValueListenable<DetectorState> get state => stateN;
  @override
  ValueListenable<double> get inputLevel => levelN;
  @override
  ValueListenable<double> get inputDbfs => dbfsN;
  @override
  ValueListenable<double> get currentGainDb => gainN;
  @override
  ValueListenable<String> get transcript => transcriptN;
  @override
  ValueListenable<int> get phraseCount => phraseN;
  @override
  ValueListenable<int> get amenCount => amenN;
  @override
  String? get lastTranscript => transcriptN.value;
  @override
  String? get lastError => null;
  @override
  Future<void> start() async => started = true;
  @override
  Future<void> stop() async => stopped = true;
  @override
  Future<void> dispose() async {}
}

void main() {
  test('levelOf maps silence to 0 and loud audio near 1', () {
    expect(MicCapture.levelOf(Float32List(0)), 0);
    expect(MicCapture.levelOf(Float32List(100)), 0);
    final loud = Float32List.fromList(List.filled(100, 0.5));
    expect(MicCapture.levelOf(loud), closeTo(0.9, 0.05));
    final quiet = Float32List.fromList(List.filled(100, 0.001));
    expect(MicCapture.levelOf(quiet), closeTo(0.0, 0.01));
  });

  testWidgets('MicTestScreen shows preparing, then counter and transcript', (
    tester,
  ) async {
    final d = _FakeDiag();
    await tester.pumpWidget(MaterialApp(home: MicTestScreen(detector: d)));
    expect(d.started, isTrue);
    expect(find.text('모델 준비 중…'), findsOneWidget);

    d.stateN.value = DetectorState.listening;
    d.transcriptN.value = '아 멘';
    d.amenN.value = 3;
    d.dbfsN.value = -42.4;
    d.gainN.value = 17.6;
    await tester.pump();
    expect(find.text('듣는 중'), findsOneWidget);
    expect(find.text('-42 dBFS  +18 dB'), findsOneWidget);
    expect(find.text('3'), findsOneWidget);
    expect(find.text('아 멘'), findsOneWidget);

    await tester.pumpWidget(const SizedBox());
    expect(d.stopped, isTrue);
  });

  testWidgets('SpeechDebugPanel shows state, tail of transcript and count', (
    tester,
  ) async {
    final d = _FakeDiag()..stateN.value = DetectorState.listening;
    d.transcriptN.value = '가' * 100;
    d.phraseN.value = 2;
    d.dbfsN.value = -61.0;
    d.gainN.value = -3.2;
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(body: SpeechDebugPanel(detector: d)),
      ),
    );
    expect(find.text('state: listening'), findsOneWidget);
    expect(find.text('phrases: 2'), findsOneWidget);
    expect(find.text('-61 dBFS  -3 dB'), findsOneWidget);
    d.dbfsN.value = -20;
    d.gainN.value = 0;
    await tester.pump();
    expect(find.text('-20 dBFS  0 dB'), findsOneWidget);
    expect(find.text('text: ${'가' * 80}'), findsOneWidget);
  });
}
