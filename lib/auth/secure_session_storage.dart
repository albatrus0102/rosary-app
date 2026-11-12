import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// 키-값 저장소 추상(키스토어 구현을 테스트에서 바꿔 끼우기 위함).
abstract class SecureKeyValue {
  Future<String?> read(String key);
  Future<void> write(String key, String value);
  Future<void> delete(String key);
}

/// 플랫폼 키스토어(Android Keystore / iOS Keychain)에 저장한다.
class PlatformSecureKeyValue implements SecureKeyValue {
  const PlatformSecureKeyValue([
    this._storage = const FlutterSecureStorage(
      iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
    ),
  ]);

  final FlutterSecureStorage _storage;

  @override
  Future<String?> read(String key) => _storage.read(key: key);

  @override
  Future<void> write(String key, String value) =>
      _storage.write(key: key, value: value);

  @override
  Future<void> delete(String key) => _storage.delete(key: key);
}

/// 키스토어를 먼저 쓰고, 쓸 수 없으면(예: 테스트·키스토어 손상) shared_preferences로
/// 대신한다. 어느 쪽이든 값은 토큰이므로 로그에 남기지 않는다.
class SecureWithFallback {
  SecureWithFallback({SecureKeyValue? secure, this._prefs})
    : _secure = secure ?? const PlatformSecureKeyValue();

  final SecureKeyValue _secure;
  SharedPreferences? _prefs;
  bool _secureBroken = false;

  /// 키스토어를 쓸 수 없어 대체 저장소로 내려갔는지(테스트·진단용).
  bool get usingFallback => _secureBroken;

  Future<SharedPreferences> _fallback() async =>
      _prefs ??= await SharedPreferences.getInstance();

  Future<String?> read(String key) async {
    if (!_secureBroken) {
      try {
        final v = await _secure.read(key);
        if (v != null) return v;
        // 키스토어가 비어 있어도, 이전에 대체 저장소에 쓴 값이 있을 수 있다.
        return (await _fallback()).getString(key);
      } catch (_) {
        _secureBroken = true;
        debugPrint('auth: keystore unavailable, using fallback');
      }
    }
    return (await _fallback()).getString(key);
  }

  Future<void> write(String key, String value) async {
    if (!_secureBroken) {
      try {
        await _secure.write(key, value);
        // 대체 저장소에 남은 옛 사본이 있으면 지운다.
        final p = await _fallback();
        if (p.containsKey(key)) await p.remove(key);
        return;
      } catch (_) {
        _secureBroken = true;
        debugPrint('auth: keystore unavailable, using fallback');
      }
    }
    await (await _fallback()).setString(key, value);
  }

  Future<void> delete(String key) async {
    if (!_secureBroken) {
      try {
        await _secure.delete(key);
      } catch (_) {
        _secureBroken = true;
      }
    }
    final p = await _fallback();
    if (p.containsKey(key)) await p.remove(key);
  }

  Future<bool> contains(String key) async => (await read(key)) != null;
}

/// Supabase 세션(JSON) 저장소 — 플랫폼 키스토어 사용.
class SecureSessionStorage extends LocalStorage {
  SecureSessionStorage({SecureWithFallback? store, this.key = defaultKey})
    : _store = store ?? SecureWithFallback();

  static const String defaultKey = 'rosary.auth.session';

  final SecureWithFallback _store;
  final String key;

  @override
  Future<void> initialize() async {}

  @override
  Future<bool> hasAccessToken() async => (await _store.read(key)) != null;

  @override
  Future<String?> accessToken() => _store.read(key);

  @override
  Future<void> removePersistedSession() => _store.delete(key);

  @override
  Future<void> persistSession(String persistSessionString) =>
      _store.write(key, persistSessionString);
}

/// PKCE code verifier 저장소 — 같은 키스토어를 쓴다.
class SecureGotrueAsyncStorage extends GotrueAsyncStorage {
  SecureGotrueAsyncStorage({SecureWithFallback? store})
    : _store = store ?? SecureWithFallback();

  final SecureWithFallback _store;

  String _k(String key) => 'rosary.auth.pkce.$key';

  @override
  Future<String?> getItem({required String key}) => _store.read(_k(key));

  @override
  Future<void> setItem({required String key, required String value}) =>
      _store.write(_k(key), value);

  @override
  Future<void> removeItem({required String key}) => _store.delete(_k(key));
}
