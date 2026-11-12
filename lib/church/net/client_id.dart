import 'dart:math';

import 'package:shared_preferences/shared_preferences.dart';

const String churchClientIdKey = 'church_client_id';

final RegExp _uuidV4 = RegExp(
  r'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
);

/// 형식이 UUID v4인지.
bool isUuidV4(String s) => _uuidV4.hasMatch(s);

/// 무작위 UUID v4 문자열을 만든다.
String generateUuidV4([Random? random]) {
  final rng = random ?? Random.secure();
  final b = List<int>.generate(16, (_) => rng.nextInt(256));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  String hex(int from, int to) => b
      .sublist(from, to)
      .map((e) => e.toRadixString(16).padLeft(2, '0'))
      .join();
  return '${hex(0, 4)}-${hex(4, 6)}-${hex(6, 8)}-${hex(8, 10)}-${hex(10, 16)}';
}

/// 기기에 저장된 클라이언트 id를 읽고, 없으면 새로 만들어 저장한다.
Future<String> loadChurchClientId([Random? random]) async {
  try {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString(churchClientIdKey);
    if (saved != null && isUuidV4(saved)) return saved;
    final id = generateUuidV4(random);
    await prefs.setString(churchClientIdKey, id);
    return id;
  } catch (_) {
    return generateUuidV4(random);
  }
}
