import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/auth/auth_gate.dart';
import 'package:rosary_app/auth/auth_state.dart';
import 'package:rosary_app/auth/consent_screen.dart';
import 'package:rosary_app/auth/consent_store.dart';
import 'package:rosary_app/auth/fake_auth_service.dart';
import 'package:rosary_app/auth/login_screen.dart';

import 'auth_test_support.dart';

const _child = Text('앱 본문', key: Key('app-child'));

Widget _gate(
  FakeAuthService auth,
  ConsentStore store, {
  bool requireLogin = true,
  bool configured = true,
}) => authHost(
  AuthGate(
    authService: auth,
    consentStore: store,
    requireLogin: requireLogin,
    backendConfigured: configured,
    child: _child,
  ),
);

void main() {
  testWidgets('백엔드 미설정이면 본문을 바로 보여 준다', (tester) async {
    final auth = FakeAuthService();
    final store = await makeConsentStore(auth);
    await tester.pumpWidget(_gate(auth, store, configured: false));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('app-child')), findsOneWidget);
    expect(find.byType(LoginScreen), findsNothing);
  });

  testWidgets('인증 확인 중에는 스플래시(진행 표시)', (tester) async {
    final auth = FakeAuthService(initial: const AuthState.loading());
    final store = await makeConsentStore(auth);
    await tester.pumpWidget(_gate(auth, store));
    await tester.pump();
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
    expect(find.byKey(const Key('app-child')), findsNothing);
  });

  testWidgets('로그아웃 + requireLogin → 로그인 화면', (tester) async {
    final auth = FakeAuthService();
    final store = await makeConsentStore(auth);
    await tester.pumpWidget(_gate(auth, store));
    await tester.pumpAndSettle();
    expect(find.byType(LoginScreen), findsOneWidget);
    expect(find.byKey(const Key('app-child')), findsNothing);
  });

  testWidgets('로그아웃 + requireLogin=false → 본문', (tester) async {
    final auth = FakeAuthService();
    final store = await makeConsentStore(auth);
    await tester.pumpWidget(_gate(auth, store, requireLogin: false));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('app-child')), findsOneWidget);
  });

  testWidgets('로그인 + 필수 동의 없음 → 동의 화면', (tester) async {
    final auth = FakeAuthService(
      initial: const AuthState.signedIn(userId: 'u1', email: 'a@b.co'),
    );
    final store = await makeConsentStore(auth);
    await tester.pumpWidget(_gate(auth, store));
    await tester.pumpAndSettle();
    expect(find.byType(ConsentScreen), findsOneWidget);
    expect(find.byKey(const Key('app-child')), findsNothing);
  });

  testWidgets('로그인 + 동의 완료 → 본문', (tester) async {
    final auth = FakeAuthService(
      initial: const AuthState.signedIn(userId: 'u1', email: 'a@b.co'),
    );
    final store = await makeConsentStore(auth);
    await store.grantRequired();
    await tester.pumpWidget(_gate(auth, store));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('app-child')), findsOneWidget);
  });

  testWidgets('로그인→동의→본문→로그아웃 전체 흐름', (tester) async {
    setScreen(tester, const Size(700, 1800));
    final auth = FakeAuthService();
    final store = await makeConsentStore(auth);
    await tester.pumpWidget(_gate(auth, store));
    await tester.pumpAndSettle();
    expect(find.byType(LoginScreen), findsOneWidget);

    await tester.tap(find.byKey(const Key('login-kakao')));
    await tester.pumpAndSettle();
    expect(find.byType(ConsentScreen), findsOneWidget);

    await tester.tap(find.byKey(const Key('consent-terms')));
    await tester.tap(find.byKey(const Key('consent-privacy')));
    await tester.tap(find.byKey(const Key('consent-age14')));
    await tester.pump();
    await tester.tap(find.byKey(const Key('consent-submit')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('app-child')), findsOneWidget);

    await auth.signOut();
    await tester.pumpAndSettle();
    expect(find.byType(LoginScreen), findsOneWidget);
  });

  testWidgets('동의 버전이 바뀌면 다시 동의 화면', (tester) async {
    final auth = FakeAuthService(
      initial: const AuthState.signedIn(userId: 'u1', email: 'a@b.co'),
    );
    SharedPreferencesHolder.reset();
    final prefs = await SharedPreferencesHolder.get();
    final v1 = await makeConsentStore(auth, prefs: prefs);
    await v1.grantRequired();
    v1.dispose();

    final v2 = await makeConsentStore(
      auth,
      prefs: prefs,
      version: '2027-01-v2',
    );
    await tester.pumpWidget(_gate(auth, v2));
    await tester.pumpAndSettle();
    expect(find.byType(ConsentScreen), findsOneWidget);
  });

  testWidgets('서버 확인 전(새 기기)에는 동의 화면 대신 스플래시, 기존 동의면 본문', (tester) async {
    final backend = FakeConsentBackend();
    for (final k in ConsentKind.required) {
      backend.server[k] = ConsentRecord(
        kind: k,
        granted: true,
        version: consentVersion,
        at: DateTime(2026, 11, 1),
      );
    }
    final auth = FakeAuthService(
      initial: const AuthState.signedIn(userId: 'u1', email: 'a@b.co'),
    );
    final store = await makeConsentStore(auth, backend: backend);
    await tester.pumpWidget(_gate(auth, store));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('app-child')), findsOneWidget);
    expect(find.byType(ConsentScreen), findsNothing);
  });

  testWidgets('오프라인에서도 저장된 세션과 동의로 본문이 열린다', (tester) async {
    final backend = FakeConsentBackend()..online = false;
    final auth = FakeAuthService(
      initial: const AuthState.signedIn(userId: 'u1', email: 'a@b.co'),
    );
    SharedPreferencesHolder.reset();
    final prefs = await SharedPreferencesHolder.get();
    final first = await makeConsentStore(auth, backend: backend, prefs: prefs);
    await first.grantRequired();
    first.dispose();
    // 앱 재시작: 같은 prefs, 서버 연결 없음.
    final store = await makeConsentStore(auth, backend: backend, prefs: prefs);
    await tester.pumpWidget(_gate(auth, store));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('app-child')), findsOneWidget);
    expect(store.pendingCount, 3);
  });

  testWidgets('resolveAuthGateStage는 순수 규칙대로 단계를 고른다', (tester) async {
    final auth = FakeAuthService();
    final store = await makeConsentStore(auth);
    AuthGateStage stage(AuthState s, {bool req = true, bool cfg = true}) =>
        resolveAuthGateStage(
          backendConfigured: cfg,
          requireLogin: req,
          auth: s,
          consentStore: store,
        );
    expect(stage(const AuthState.loading(), cfg: false), AuthGateStage.child);
    expect(stage(const AuthState.loading()), AuthGateStage.splash);
    expect(stage(const AuthState.signedOut()), AuthGateStage.login);
    expect(stage(const AuthState.signedOut(), req: false), AuthGateStage.child);
  });
}
