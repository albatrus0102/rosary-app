import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/auth/auth_bootstrap.dart';
import 'package:rosary_app/auth/auth_state.dart';
import 'package:rosary_app/auth/auth_validators.dart';
import 'package:rosary_app/auth/backend_config.dart';
import 'package:rosary_app/auth/consent_store.dart';
import 'package:rosary_app/auth/legal_screen.dart';
import 'package:rosary_app/auth/legal_texts.dart';
import 'package:rosary_app/auth/secure_session_storage.dart';
import 'package:rosary_app/auth/supabase_auth_service.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart' hide AuthState;

class _BrokenKeystore implements SecureKeyValue {
  @override
  Future<String?> read(String key) async => throw Exception('no keystore');
  @override
  Future<void> write(String key, String value) async =>
      throw Exception('no keystore');
  @override
  Future<void> delete(String key) async => throw Exception('no keystore');
}

class _MemoryKeystore implements SecureKeyValue {
  final Map<String, String> data = {};
  @override
  Future<String?> read(String key) async => data[key];
  @override
  Future<void> write(String key, String value) async => data[key] = value;
  @override
  Future<void> delete(String key) async => data.remove(key);
}

void main() {
  group('검증', () {
    test('이메일', () {
      expect(validateEmail(''), isNotNull);
      expect(validateEmail('abc'), isNotNull);
      expect(validateEmail('a@b'), isNotNull);
      expect(validateEmail(' a@b.co '), isNull);
    });
    test('비밀번호', () {
      expect(validatePassword(''), isNotNull);
      expect(validatePassword('1234567'), isNotNull);
      expect(validatePassword('12345678'), isNull);
    });
  });

  group('설정', () {
    test('백엔드 미설정(기본)', () {
      expect(BackendConfig.isConfigured, isFalse);
      expect(BackendConfig.redirectUrl, 'kr.rosary.rosaryapp://login-callback');
    });
    test('AuthBootstrap.init은 미설정이면 false이고 두 번 불러도 안전', () async {
      expect(await AuthBootstrap.init(), isFalse);
      expect(await AuthBootstrap.init(), isFalse);
    });
    test('동의 종류·버전 상수는 SPEC 그대로', () {
      expect(consentVersion, '2026-11-v1');
      expect(ConsentKind.required, ['terms', 'privacy', 'age14']);
      expect(ConsentKind.optional, ['usage', 'sync', 'church', 'diagnostics']);
    });
  });

  group('오류 문구', () {
    test('Supabase 오류 코드를 한국어로 바꾼다', () {
      expect(
        localizeAuthError(
          const AuthApiException(
            'x',
            statusCode: '400',
            code: 'invalid_credentials',
          ),
        ),
        contains('올바르지 않아요'),
      );
      expect(
        localizeAuthError(
          const AuthApiException(
            'x',
            statusCode: '422',
            code: 'user_already_exists',
          ),
        ),
        contains('이미 가입'),
      );
      expect(
        localizeAuthError(AuthRetryableFetchException()),
        contains('네트워크'),
      );
      expect(
        localizeAuthError(Exception('secret-token-123')),
        isNot(contains('secret')),
      );
    });
  });

  group('키스토어 저장소', () {
    setUp(() => SharedPreferences.setMockInitialValues({}));

    test('키스토어에 저장하고 읽는다', () async {
      final ks = _MemoryKeystore();
      final storage = SecureSessionStorage(
        store: SecureWithFallback(secure: ks),
      );
      expect(await storage.hasAccessToken(), isFalse);
      await storage.persistSession('{"s":1}');
      expect(ks.data[SecureSessionStorage.defaultKey], '{"s":1}');
      expect(await storage.accessToken(), '{"s":1}');
      expect(await storage.hasAccessToken(), isTrue);
      await storage.removePersistedSession();
      expect(await storage.hasAccessToken(), isFalse);
    });

    test('키스토어를 쓸 수 없으면 기본 저장소로 대체한다', () async {
      final store = SecureWithFallback(secure: _BrokenKeystore());
      final storage = SecureSessionStorage(store: store);
      await storage.persistSession('{"s":2}');
      expect(store.usingFallback, isTrue);
      expect(await storage.accessToken(), '{"s":2}');
      final prefs = await SharedPreferences.getInstance();
      expect(prefs.getString(SecureSessionStorage.defaultKey), '{"s":2}');
    });

    test('PKCE 저장소도 같은 방식', () async {
      final ks = _MemoryKeystore();
      final pkce = SecureGotrueAsyncStorage(
        store: SecureWithFallback(secure: ks),
      );
      await pkce.setItem(key: 'verifier', value: 'abc');
      expect(await pkce.getItem(key: 'verifier'), 'abc');
      await pkce.removeItem(key: 'verifier');
      expect(await pkce.getItem(key: 'verifier'), isNull);
    });
  });

  group('세션 → 상태(오프라인 복원)', () {
    Session session({required int expiresAt, String provider = 'kakao'}) {
      final s = Session(
        accessToken: 'a',
        refreshToken: 'r',
        tokenType: 'bearer',
        user: User(
          id: 'uid-1',
          appMetadata: {'provider': provider},
          userMetadata: const {},
          aud: 'authenticated',
          createdAt: '2026-11-01T00:00:00Z',
          email: 'a@b.co',
        ),
      );
      s.expiresAt = expiresAt;
      return s;
    }

    test('세션이 없으면 로그아웃', () {
      expect(authStateFromSession(null).isSignedOut, isTrue);
    });

    test('만료된 세션도 로그인 상태로 본다(오프라인에서 앱을 열 수 있게)', () {
      final expired = session(expiresAt: 1000);
      expect(expired.isExpired, isTrue);
      final s = authStateFromSession(expired);
      expect(s.isSignedIn, isTrue);
      expect(s.userId, 'uid-1');
      expect(s.provider, LoginProvider.kakao);
      expect(s.email, 'a@b.co');
    });
  });

  group('LegalScreen 파서', () {
    test('제목·목록·인용·표를 블록으로 나눈다', () {
      final blocks = parseLegalBlocks(
        '# 제목\n\n## 소제목\n- 항목\n> 안내\n| a | b |\n|---|---|\n| 1 | 2 |\n본문 **굵게**',
      );
      final types = blocks.map((b) => b.type).toList();
      expect(types.first, LegalBlockType.h1);
      expect(types, contains(LegalBlockType.h2));
      expect(types, contains(LegalBlockType.quote));
      expect(blocks.where((b) => b.type == LegalBlockType.bullet).length, 3);
      expect(blocks.any((b) => b.text.contains('---')), isFalse);
    });

    test('문구 상수에 SPEC의 필수 요소가 들어 있다', () {
      expect(consentNotCollectedLine, contains('광고 식별자'));
      expect(consentCrossBorderNotice, contains('국외'));
      for (final k in ConsentKind.optional) {
        final t = consentItemTexts[k]!;
        expect(t.fields, isNotEmpty);
        expect(t.purpose, isNotEmpty);
        expect(t.retention, isNotEmpty);
      }
    });
  });
}
