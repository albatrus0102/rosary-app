import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'backend_config.dart';
import 'secure_session_storage.dart';

/// 앱 시작 시 한 번 부르는 Supabase 초기화.
abstract final class AuthBootstrap {
  static Future<bool>? _pending;
  static bool _configured = false;

  /// [BackendConfig.isConfigured]일 때만 `Supabase.initialize`를 부른다.
  /// 두 번 불러도 안전하다. 설정되어 있으면 true.
  ///
  /// - 인증 흐름은 PKCE만 쓴다.
  /// - 세션과 PKCE 검증값은 플랫폼 키스토어에 저장한다
  ///   (불가하면 shared_preferences로 대체).
  /// - 토큰·이메일·사용자 ID는 로그에 남기지 않는다.
  static Future<bool> init() => _pending ??= _init();

  static bool get isInitialized => _configured;

  static Future<bool> _init() async {
    if (!BackendConfig.isConfigured) {
      debugPrint('auth: backend not configured, running without login');
      return false;
    }
    final store = SecureWithFallback();
    try {
      await Supabase.initialize(
        url: BackendConfig.supabaseUrl,
        publishableKey: BackendConfig.anonKey,
        authOptions: FlutterAuthClientOptions(
          authFlowType: AuthFlowType.pkce,
          localStorage: SecureSessionStorage(store: store),
          pkceAsyncStorage: SecureGotrueAsyncStorage(store: store),
        ),
      );
      _configured = true;
    } catch (e) {
      // 오프라인이어도 initialize는 저장된 세션으로 성공한다. 여기 오면 설정 오류.
      debugPrint('auth: Supabase.initialize failed (${e.runtimeType})');
      _pending = null;
      rethrow;
    }
    return true;
  }
}
