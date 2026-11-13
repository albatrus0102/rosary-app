import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';

import '../church_constants.dart';

/// 성당별 접속 인원(`성당 id → 명`)을 가져오는 함수. 실패하면 던진다.
typedef ChurchLoadFetcher = Future<Map<String, int>> Function();

/// 접속 주소(`wss://host/ws`)에서 현황 주소(`https://host/stats`)를 만든다.
Uri churchStatsUri(String serverUrl) {
  final base = Uri.parse(serverUrl.trim());
  final scheme = switch (base.scheme) {
    'ws' || 'http' => 'http',
    _ => 'https',
  };
  var path = base.path;
  while (path.endsWith('/')) {
    path = path.substring(0, path.length - 1);
  }
  if (path.endsWith('/ws')) path = path.substring(0, path.length - 3);
  return Uri(
    scheme: scheme,
    host: base.host,
    port: base.hasPort ? base.port : null,
    path: '$path/stats',
  );
}

/// 서버 `/stats` 응답에서 성당별 접속 인원(`churches[id].live`)만 읽는다.
/// 형식이 틀리면 null. 사람 이름 같은 개인 정보는 이 응답에 없다(숫자뿐).
Map<String, int>? parseChurchLoads(Object? raw) {
  try {
    final Object? json = raw is String ? jsonDecode(raw) : raw;
    if (json is! Map) return null;
    final churches = json['churches'];
    if (churches is! Map) return null;
    final out = <String, int>{};
    churches.forEach((id, v) {
      if (id is! String || v is! Map) return;
      final live = v['live'];
      if (live is num && live.isFinite && live > 0) out[id] = live.toInt();
    });
    return out;
  } catch (_) {
    return null;
  }
}

Future<Map<String, int>> _fetchStats(Uri uri) async {
  final client = HttpClient()..connectionTimeout = const Duration(seconds: 5);
  try {
    final req = await client.getUrl(uri).timeout(const Duration(seconds: 5));
    final res = await req.close().timeout(const Duration(seconds: 5));
    if (res.statusCode != 200) throw HttpException('status ${res.statusCode}');
    final body = await res
        .transform(utf8.decoder)
        .join()
        .timeout(const Duration(seconds: 5));
    final loads = parseChurchLoads(body);
    if (loads == null) throw const FormatException('bad stats');
    return loads;
  } finally {
    client.close(force: true);
  }
}

/// 성당별 '지금 접속 중' 인원. 접속자 시트의 '전체' 보기와 성당 고르기 카드가 같이 쓴다.
///
/// 보는 화면이 있을 때만([watch]..[unwatch]) [interval]마다 다시 가져온다.
/// 서버 주소가 없으면(혼자 모드 빌드) [available]이 false이고 아무것도 가져오지 않는다.
class ChurchLoads extends ChangeNotifier {
  ChurchLoads({this.fetcher, this.interval = const Duration(seconds: 8)});

  /// 서버 주소([ChurchConfig.serverUrl] 또는 [serverUrl])에 맞는 것을 만든다.
  factory ChurchLoads.forServer([String? serverUrl]) {
    final url = (serverUrl ?? ChurchConfig.serverUrl).trim();
    if (url.isEmpty) return ChurchLoads();
    final uri = churchStatsUri(url);
    return ChurchLoads(fetcher: () => _fetchStats(uri));
  }

  /// 앱 전체가 같이 쓰는 인스턴스(마지막으로 받은 값을 화면 사이에 이어 쓴다).
  static final ChurchLoads shared = ChurchLoads.forServer();

  /// 인원을 가져오는 함수. null이면 서버가 없는 것이다.
  final ChurchLoadFetcher? fetcher;
  final Duration interval;

  Map<String, int>? _counts;
  bool _failed = false;
  bool _loading = false;
  bool _disposed = false;
  int _watchers = 0;
  Timer? _timer;

  /// 서버가 있어 인원을 가져올 수 있는지.
  bool get available => fetcher != null;

  /// 마지막으로 받은 값(0명인 성당은 빠져 있다). 아직 못 받았으면 null.
  Map<String, int>? get counts => _counts;

  /// 가장 최근 시도가 실패했는지([counts]에는 그 전 값이 남아 있을 수 있다).
  bool get failed => _failed;
  bool get loading => _loading;

  int of(String churchId) => _counts?[churchId] ?? 0;

  Future<void> refresh() async {
    final fetch = fetcher;
    if (fetch == null || _loading || _disposed) return;
    _loading = true;
    notifyListeners();
    try {
      final next = await fetch();
      if (_disposed) return;
      _counts = Map.unmodifiable(next);
      _failed = false;
    } catch (_) {
      if (_disposed) return;
      _failed = true;
    } finally {
      _loading = false;
      if (!_disposed) notifyListeners();
    }
  }

  /// 보는 화면이 생겼다: 바로 한 번 가져오고 주기적으로 갱신한다.
  void watch() {
    if (_disposed) return;
    _watchers++;
    if (fetcher == null) return;
    unawaited(refresh());
    _timer ??= Timer.periodic(interval, (_) => unawaited(refresh()));
  }

  /// 보는 화면이 사라졌다: 아무도 안 보면 갱신을 멈춘다.
  void unwatch() {
    if (_watchers > 0) _watchers--;
    if (_watchers == 0) {
      _timer?.cancel();
      _timer = null;
    }
  }

  @override
  void dispose() {
    _disposed = true;
    _timer?.cancel();
    _timer = null;
    super.dispose();
  }
}
