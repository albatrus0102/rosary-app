/// 통계 화면에서 쓰는 한국어 표기 도우미.
library;

const List<String> _weekdays = ['월', '화', '수', '목', '금', '토', '일'];

/// [DateTime.weekday] (1=월 .. 7=일) → '월'..'일'.
String weekdayKo(int weekday) => _weekdays[(weekday - 1) % 7];

/// '11월 12일 (목)'.
String formatDateKo(DateTime d) =>
    '${d.month}월 ${d.day}일 (${weekdayKo(d.weekday)})';

/// 초 → '0분', '1분 미만', '12분', '1시간', '1시간 5분'.
String formatDurationKo(int seconds) {
  if (seconds <= 0) return '0분';
  final totalMinutes = seconds ~/ 60;
  if (totalMinutes < 1) return '1분 미만';
  final h = totalMinutes ~/ 60;
  final m = totalMinutes % 60;
  if (h == 0) return '$m분';
  if (m == 0) return '$h시간';
  return '$h시간 $m분';
}
