// 후창(뒷단) 문구를 tools/leader_voice/responder_cues.json 으로 내보낸다.
//
// 사용법 (저장소 루트에서):
//   dart run tools/leader_voice/export_responder.dart
//
// 선창 모드(사용자가 앞단을 말하고 AI가 뒷단을 받는 경우)에 쓸 문구다.
// 뒷단이 있는 기도만 나온다(성호경은 모두 함께 바치므로 제외).
import 'dart:convert';
import 'dart:io';

import 'package:rosary_app/domain/prayer_data.dart';
import 'package:rosary_app/domain/prayer_splits.dart';

void main() {
  final scriptDir = File.fromUri(Platform.script).parent;
  final out = File('${scriptDir.path}/responder_cues.json');
  final list = <Map<String, String>>[];
  for (final p in Prayers.all) {
    final split = splitPrayer(p);
    if (split.responder.isEmpty) continue;
    list.add({
      'id': 'resp_${p.id}',
      'title': '${p.title} 뒷단',
      'text': split.responder,
    });
  }
  out.writeAsStringSync('${const JsonEncoder.withIndent('  ').convert(list)}\n');
  stdout.writeln('${list.length}개 후창 문구를 ${out.path} 에 썼습니다.');
}
