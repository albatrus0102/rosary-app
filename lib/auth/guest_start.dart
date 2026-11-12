import 'dart:async';

import 'package:flutter/foundation.dart';

import 'auth_service.dart';
import 'auth_state.dart';
import 'supabase_auth_service.dart' show guestUnavailableMessage;

/// 게스트 시작의 진행 상태.
enum GuestStartStatus {
  /// 아직 시도하지 않았거나(또는 로그인되어 끝남).
  idle,

  /// `signInAnonymously` 진행 중.
  starting,

  /// 서버가 게스트 시작을 막았다(익명 로그인 꺼짐·CAPTCHA 등). 사용자가 고른다:
  /// 다시 시도 / 이 기기에서만 쓰기.
  failed,

  /// 오프라인 등으로 서버에 연결하지 못해 이 기기에서만 쓰는 중. 온라인이 되면
  /// 백그라운드에서 다시 시도한다. 로컬에 저장된 동의는 게스트가 만들어질 때 올라간다.
  offline,
}

/// 동의를 마친 첫 실행에서 `signInAnonymously`를 부르고 실패를 정리한다.
/// [AuthGate]가 소유하며, 사용자가 로그아웃하면(상태가 signedOut) 다시 새 게스트를 만든다.
class GuestStartController extends ChangeNotifier {
  GuestStartController(
    this.authService, {
    this.timeout = const Duration(seconds: 10),
  }) {
    authService.state.addListener(_onAuth);
  }

  final AuthService authService;

  /// 이 시간 안에 응답이 없으면 오프라인으로 본다.
  final Duration timeout;

  GuestStartStatus _status = GuestStartStatus.idle;
  String? _errorMessage;
  bool _disposed = false;
  bool _busy = false;

  GuestStartStatus get status => _status;

  /// 실패 화면에 보여 줄 한국어 문구([GuestStartStatus.failed]일 때).
  String? get errorMessage => _errorMessage;

  void _set(GuestStartStatus s, {String? message}) {
    if (_disposed) return;
    if (_status == s && _errorMessage == message) return;
    _status = s;
    _errorMessage = message;
    notifyListeners();
  }

  void _onAuth() {
    // 로그인되면 끝. 로그아웃(signedOut)되면 처음 상태로 돌아가 새 게스트를 만든다.
    if (authService.state.value.isSignedIn &&
        _status != GuestStartStatus.idle) {
      _set(GuestStartStatus.idle);
    }
  }

  /// 게스트로 시작한다. 이미 로그인되어 있으면 아무것도 하지 않는다.
  /// [silent]이면 화면을 바꾸지 않는다(오프라인으로 쓰는 중의 백그라운드 재시도).
  Future<void> start({bool silent = false}) async {
    if (_status == GuestStartStatus.starting || _busy) return;
    if (authService.state.value.isSignedIn) return;
    if (silent) {
      _busy = true;
      try {
        await authService.signInAnonymously().timeout(timeout);
      } catch (_) {
        // 계속 오프라인으로 쓴다.
      } finally {
        _busy = false;
      }
      return;
    }
    _set(GuestStartStatus.starting);
    try {
      await authService.signInAnonymously().timeout(
        timeout,
        onTimeout: () => throw const AuthFailure(
          '네트워크에 연결할 수 없어요.',
          kind: AuthFailureKind.network,
        ),
      );
      // 성공: 상태 변화(signedIn)가 [_onAuth]로 들어와 idle이 된다. 들어오지 않으면
      // (로그인되지 않은 채 끝남) 같은 시도를 되풀이하지 않도록 오프라인으로 둔다.
      if (_status == GuestStartStatus.starting &&
          !authService.state.value.isSignedIn) {
        _set(GuestStartStatus.offline);
      }
    } on AuthFailure catch (e) {
      if (e.kind == AuthFailureKind.network) {
        _set(GuestStartStatus.offline);
      } else {
        _set(
          GuestStartStatus.failed,
          message: e.kind == AuthFailureKind.guestUnavailable
              ? guestUnavailableMessage
              : e.message,
        );
      }
    } catch (_) {
      _set(GuestStartStatus.failed, message: '문제가 생겼어요. 잠시 후 다시 시도해 주세요.');
    }
  }

  /// 실패 화면의 '다시 시도'.
  Future<void> retry() {
    _set(GuestStartStatus.idle);
    return start();
  }

  /// 실패 화면의 '이 기기에서만 사용하기'.
  void continueOffline() => _set(GuestStartStatus.offline);

  /// 앱이 다시 앞으로 나올 때 등: 오프라인이던 중이면 조용히 다시 시도한다.
  Future<void> retryIfOffline() async {
    if (_status != GuestStartStatus.offline) return;
    if (authService.state.value.isSignedIn) return;
    await start(silent: true);
  }

  @override
  void dispose() {
    _disposed = true;
    authService.state.removeListener(_onAuth);
    super.dispose();
  }
}
