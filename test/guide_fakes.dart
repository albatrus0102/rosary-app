import 'package:rosary_app/app/guide_voice.dart';

/// 읽은 글과 멈춘 횟수를 기록하는 가짜 안내 음성 엔진.
class RecordingGuideEngine implements GuideEngine {
  final List<String> spoken = [];
  int stops = 0;

  @override
  Future<void> speak(String text) async => spoken.add(text);

  @override
  Future<void> stop() async => stops++;
}
