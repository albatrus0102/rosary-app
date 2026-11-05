// 선창 큐 26개를 tools/leader_voice/cues.json 으로 내보낸다.
//
// 사용법 (저장소 루트에서):
//   dart run tools/leader_voice/export_cues.dart
//
// lib/domain 의 세 파일은 순수 Dart(Flutter 의존성 없음)이므로 상대 경로 import 로
// 패키지 해석(pub get) 없이도 동작한다.
import 'dart:convert';
import 'dart:io';

import 'package:rosary_app/domain/leader_cues.dart';

void main() {
  final scriptDir = File.fromUri(Platform.script).parent;
  final out = File('${scriptDir.path}/cues.json');
  final list = [
    for (final c in allLeaderCues)
      {'id': c.id, 'title': c.title, 'text': c.text},
  ];
  final ids = list.map((e) => e['id']).toSet();
  if (list.length != 26 || ids.length != list.length) {
    stderr.writeln('큐가 26개가 아니거나 id가 중복됩니다: ${list.length} / ${ids.length}');
    exit(1);
  }
  out.writeAsStringSync(
    '${const JsonEncoder.withIndent('  ').convert(list)}\n',
  );
  stdout.writeln('${list.length}개 큐를 ${out.path} 에 썼습니다.');
}
