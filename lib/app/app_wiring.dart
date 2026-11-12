import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../analytics/analytics.dart';
import '../auth/auth_state.dart';
import '../auth/consent_store.dart';
import 'app_services.dart';
import 'track.dart';

/// 서비스들 사이의 연결(로그인 사용자 → 분석, 동의 변경 → 분석 큐, 동기화 시점)을 맡는다.
///
/// 백엔드가 설정되지 않은 빌드에서도 부를 수 있다. `Analytics.instance`가 초기화 전에는
/// 아무것도 하지 않고, [AppServices.sync]가 없으면 동기화도 하지 않는다.
class AppWiring with WidgetsBindingObserver {
  AppWiring(this.services, {this.reportDevice});

  final AppServices services;

  /// 기기 정보 올리기(동의가 켜지면 다시 시도한다). 백엔드 미설정이면 null.
  final Future<void> Function()? reportDevice;

  StreamSubscription<ConsentChange>? _consentSub;
  AuthStatus? _prevStatus;
  String? _lastUid;
  bool _started = false;

  /// 이 기기의 기도 기록을 소유한 계정 id를 적어 두는 키.
  static const statsOwnerKey = 'stats_owner_uid';

  /// 가장 최근에 로그인했던 사용자 id(계정 삭제 뒤 그 사용자의 로컬 캐시를 지우는 데 쓴다).
  String? get lastUserId => _lastUid;

  void start() {
    if (_started) return;
    _started = true;
    final s = services.auth.current;
    _prevStatus = s.status;
    _lastUid = s.isSignedIn ? s.userId : null;
    services.auth.state.addListener(_onAuth);
    services.consent.addListener(_onConsentNotified);
    _consentSub = services.consent.changes.listen(_onConsentChange);
    WidgetsBinding.instance.addObserver(this);

    final sync = services.sync;
    sync?.start();
    unawaited(_guardStatsOwner(_lastUid).then((_) => sync?.syncNow()));
    final report = reportDevice;
    if (report != null) unawaited(report());
  }

  /// 다른 계정이 같은 기기에 로그인하면 이전 사용자의 기도 기록이 새 계정으로 올라가지
  /// 않도록 로컬 기록을 비운다. 처음 로그인한 계정은 기존(로그인 기능 이전) 기록을 이어받는다.
  Future<void> _guardStatsOwner(String? uid) async {
    if (uid == null) return;
    try {
      final prefs = await SharedPreferences.getInstance();
      final owner = prefs.getString(statsOwnerKey);
      if (owner == null) {
        await prefs.setString(statsOwnerKey, uid);
      } else if (owner != uid) {
        await services.stats.clear();
        await prefs.setString(statsOwnerKey, uid);
      }
    } catch (e) {
      debugPrint('stats owner guard failed (${e.runtimeType})');
    }
  }

  void dispose() {
    if (!_started) return;
    _started = false;
    services.auth.state.removeListener(_onAuth);
    services.consent.removeListener(_onConsentNotified);
    unawaited(_consentSub?.cancel());
    WidgetsBinding.instance.removeObserver(this);
  }

  // ---- 로그인 상태 --------------------------------------------------------

  void _onAuth() {
    final s = services.auth.current;
    final uid = s.isSignedIn ? s.userId : null;
    final becameSignedIn = s.isSignedIn && _prevStatus == AuthStatus.signedOut;
    _prevStatus = s.status;
    if (uid != null) _lastUid = uid;
    // 사용자가 바뀌면(로그아웃 포함) 올라가지 않은 이전 사용자 이벤트는 버려진다.
    try {
      Analytics.instance.setUserId(uid);
    } catch (_) {}
    if (becameSignedIn) {
      // 저장된 세션 복원(loading → signedIn)은 로그인이 아니다.
      final provider = s.provider?.id;
      Track.event('login_success', {'provider': ?provider});
    }
    unawaited(_guardStatsOwner(uid).then((_) => _syncSoon()));
  }

  // ---- 동의 ----------------------------------------------------------------

  void _onConsentChange(ConsentChange c) {
    // 철회: 그 범주의 올라가지 않은 이벤트를 즉시 버린다(서버 삭제는 set_consent RPC).
    if (!c.granted) {
      try {
        Analytics.instance.purgeCategory(c.kind);
      } catch (_) {}
    }
    // 필수 동의는 분석 대상이 아니다. usage가 꺼져 있으면 자동으로 버려진다.
    if (ConsentKind.optional.contains(c.kind)) {
      Track.event('consent_change', {'kind': c.kind, 'granted': c.granted});
    }
  }

  void _onConsentNotified() {
    final report = reportDevice;
    if (report != null) unawaited(report());
    _syncSoon();
  }

  void _syncSoon() {
    final sync = services.sync;
    if (sync != null) unawaited(sync.syncNow());
  }

  // ---- 계정 삭제 -----------------------------------------------------------

  /// 계정 삭제 뒤 이 기기에 남은 이 사용자의 데이터를 지운다: 올라가지 않은 분석 이벤트,
  /// 기도 기록, 동의 캐시. (`SupabaseAuthService.onLocalDataCleared`에 연결한다.)
  Future<void> onAccountDeleted() async {
    try {
      Analytics.instance.setUserId(null);
    } catch (_) {}
    try {
      await services.stats.clear();
    } catch (e) {
      debugPrint('account cleanup: stats clear failed (${e.runtimeType})');
    }
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(statsOwnerKey);
    } catch (_) {}
    try {
      await services.consent.clearLocalData(_lastUid);
    } catch (e) {
      debugPrint('account cleanup: consent clear failed (${e.runtimeType})');
    }
    _lastUid = null;
  }

  // ---- 앱 생명주기 ----------------------------------------------------------

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // 오프라인 중 쌓인 동의 기록을 올린다.
    if (state == AppLifecycleState.resumed) {
      unawaited(services.consent.flush());
    }
  }
}
