import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/auth/account_screen.dart';
import 'package:rosary_app/auth/auth_gate.dart';
import 'package:rosary_app/auth/auth_state.dart';
import 'package:rosary_app/auth/consent_screen.dart';
import 'package:rosary_app/auth/consent_store.dart';
import 'package:rosary_app/auth/fake_auth_service.dart';
import 'package:rosary_app/auth/guest_link_card.dart';
import 'package:rosary_app/auth/guest_start.dart';
import 'package:rosary_app/auth/login_screen.dart';
import 'package:rosary_app/auth/supabase_auth_service.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart' hide AuthState;

import 'auth_test_support.dart';

const _child = Text('앱 본문', key: Key('app-child'));

Widget _gate(
  FakeAuthService auth,
  ConsentStore store, {
  double textScale = 1.0,
}) => authHost(
  AuthGate(
    authService: auth,
    consentStore: store,
    backendConfigured: true,
    child: _child,
  ),
  textScale: textScale,
);

Future<void> _acceptRequired(WidgetTester tester) async {
  for (final k in ConsentKind.required) {
    await tester.ensureVisible(find.byKey(Key('consent-$k')));
    await tester.tap(find.byKey(Key('consent-$k')));
  }
  await tester.pump();
  await tester.ensureVisible(find.byKey(const Key('consent-submit')));
  await tester.tap(find.byKey(const Key('consent-submit')));
  await tester.pumpAndSettle();
}

void main() {
  group('AuthState', () {
    test('게스트는 로그인 상태이고 isAnonymous, 연결하면 같은 id로 실제 계정', () {
      const guest = AuthState.signedIn(userId: 'u', isAnonymous: true);
      expect(guest.isSignedIn, isTrue);
      expect(guest.isAnonymous, isTrue);
      expect(guest.isRealAccount, isFalse);
      expect(guest.accountLabel, '게스트');
      const linked = AuthState.signedIn(
        userId: 'u',
        provider: LoginProvider.kakao,
      );
      expect(linked.isAnonymous, isFalse);
      expect(linked.isRealAccount, isTrue);
      expect(linked.accountLabel, '카카오');
      expect(const AuthState.signedOut().accountLabel, '로그인하지 않음');
      expect(guest == linked, isFalse);
    });

    test('authStateFromSession: 익명 사용자 / 연결 뒤 identity에서 공급자', () {
      Session session({required bool anonymous, List<UserIdentity>? ids}) =>
          Session(
            accessToken: 'a',
            tokenType: 'bearer',
            user: User(
              id: 'uid-9',
              appMetadata: {'provider': anonymous ? 'anonymous' : 'anonymous'},
              userMetadata: const {},
              aud: 'authenticated',
              createdAt: '2026-11-01T00:00:00Z',
              isAnonymous: anonymous,
              identities: ids,
            ),
          );
      final g = authStateFromSession(session(anonymous: true));
      expect(g.isSignedIn, isTrue);
      expect(g.isAnonymous, isTrue);
      expect(g.provider, isNull);
      final linked = authStateFromSession(
        session(
          anonymous: false,
          ids: [
            UserIdentity(
              id: 'i1',
              userId: 'uid-9',
              identityData: const {},
              identityId: 'i1',
              provider: 'kakao',
              createdAt: '2026-11-02T00:00:00Z',
              lastSignInAt: '2026-11-02T00:00:00Z',
            ),
          ],
        ),
      );
      expect(linked.userId, 'uid-9');
      expect(linked.isAnonymous, isFalse);
      expect(linked.provider, LoginProvider.kakao);
    });
  });

  group('FakeAuthService 게스트', () {
    test('signInAnonymously → 게스트, 로그아웃 뒤에는 새 게스트', () async {
      final auth = FakeAuthService();
      await auth.signInAnonymously();
      expect(auth.current.isAnonymous, isTrue);
      final first = auth.current.userId;
      await auth.signInAnonymously(); // 이미 로그인: 아무 일도 없다
      expect(auth.current.userId, first);
      await auth.signOut();
      await auth.signInAnonymously();
      expect(auth.current.userId, isNot(first));
    });

    test('연결: 같은 userId 유지, 게스트가 아니면 실패, 이메일은 확인 메일 옵션', () async {
      final auth = FakeAuthService();
      await expectLater(auth.linkWithKakao(), throwsA(isA<AuthFailure>()));
      await auth.signInAnonymously();
      final uid = auth.current.userId;
      await auth.linkWithGoogle();
      expect(auth.current.userId, uid);
      expect(auth.current.isAnonymous, isFalse);
      expect(auth.current.provider, LoginProvider.google);

      final auth2 = FakeAuthService(
        initial: const AuthState.signedIn(userId: 'g', isAnonymous: true),
      )..linkEmailOutcome = EmailSignUpOutcome.confirmationRequired;
      final outcome = await auth2.linkWithEmail('a@b.co', 'pw123456');
      expect(outcome, EmailSignUpOutcome.confirmationRequired);
      expect(auth2.current.isAnonymous, isTrue, reason: '메일 확인 전에는 게스트');
      auth2.completeLink(LoginProvider.email, email: 'a@b.co');
      expect(auth2.current.userId, 'g');
      expect(auth2.current.email, 'a@b.co');
    });
  });

  group('AuthGate 게스트 우선 흐름', () {
    testWidgets('첫 실행: 동의 한 화면 → 게스트 시작 → 본문, 동의는 서버로 올라간다', (tester) async {
      setScreen(tester, const Size(700, 1800));
      final backend = FakeConsentBackend();
      final auth = FakeAuthService();
      final store = await makeConsentStore(auth, backend: backend);
      await tester.pumpWidget(_gate(auth, store));
      await tester.pumpAndSettle();
      expect(find.byType(ConsentScreen), findsOneWidget);
      expect(find.byType(LoginScreen), findsNothing);
      expect(find.text('동의하고 시작하기'), findsOneWidget);
      expect(auth.calls, isEmpty, reason: '동의 전에는 사용자 행을 만들지 않는다');
      // 선택 4개는 모두 꺼짐
      for (final k in ConsentKind.optional) {
        final sw = tester.widget<SwitchListTile>(find.byKey(Key('consent-$k')));
        expect(sw.value, isFalse);
      }

      // 선택 항목 하나만 따로 켠다.
      await tester.tap(find.byKey(const Key('consent-usage')));
      await _acceptRequired(tester);

      expect(auth.calls, ['signInAnonymously']);
      expect(auth.current.isAnonymous, isTrue);
      expect(find.byKey(const Key('app-child')), findsOneWidget);
      expect(store.has(ConsentKind.terms), isTrue);
      expect(store.has(ConsentKind.usage), isTrue);
      expect(store.has(ConsentKind.sync), isFalse);
      // 로컬에 있던 동의가 새 게스트로 옮겨져 서버로 올라갔다.
      await store.flush();
      expect(store.pendingCount, 0);
      expect(backend.server[ConsentKind.age14]?.granted, isTrue);
      expect(backend.server[ConsentKind.usage]?.granted, isTrue);
      expect(backend.server[ConsentKind.sync]?.granted, isFalse);
      expect(backend.receivedVersions.toSet(), {consentVersion});
    });

    testWidgets('저장된 게스트 세션 복원: 동의 완료면 바로 본문, signInAnonymously 없음', (
      tester,
    ) async {
      final auth = FakeAuthService(
        initial: const AuthState.signedIn(userId: 'g1', isAnonymous: true),
      );
      final store = await makeConsentStore(auth);
      await store.grantRequired();
      await tester.pumpWidget(_gate(auth, store));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('app-child')), findsOneWidget);
      expect(auth.calls, isEmpty);
    });

    testWidgets('게스트 로그아웃 → 다시 동의 → 새 게스트(다른 id)', (tester) async {
      setScreen(tester, const Size(700, 1800));
      final auth = FakeAuthService();
      final store = await makeConsentStore(auth);
      await tester.pumpWidget(_gate(auth, store));
      await tester.pumpAndSettle();
      await _acceptRequired(tester);
      final first = auth.current.userId;
      expect(find.byKey(const Key('app-child')), findsOneWidget);

      await auth.signOut();
      await tester.pumpAndSettle();
      expect(find.byType(ConsentScreen), findsOneWidget);
      await _acceptRequired(tester);
      expect(auth.current.isAnonymous, isTrue);
      expect(auth.current.userId, isNot(first));
      expect(find.byKey(const Key('app-child')), findsOneWidget);
    });

    testWidgets('익명 로그인이 꺼진 서버: 한국어 오류 + 다시 시도 + 기기에서만 사용', (tester) async {
      setScreen(tester, const Size(700, 1800));
      final auth = FakeAuthService()
        ..failNextWith = 'x'
        ..failNextKind = AuthFailureKind.guestUnavailable;
      final store = await makeConsentStore(auth);
      await tester.pumpWidget(_gate(auth, store));
      await tester.pumpAndSettle();
      await _acceptRequired(tester);

      expect(find.text('게스트로 시작하지 못했어요'), findsOneWidget);
      expect(find.text(guestUnavailableMessage), findsOneWidget);
      expect(find.byKey(const Key('app-child')), findsNothing);
      // 동의는 로컬에 남아 있다.
      expect(store.needsConsent, isFalse);

      // 다시 시도 → 성공
      await tester.tap(find.byKey(const Key('guest-retry')));
      await tester.pumpAndSettle();
      expect(auth.current.isAnonymous, isTrue);
      expect(find.byKey(const Key('app-child')), findsOneWidget);
    });

    testWidgets('막힌 서버에서 "이 기기에서만 사용하기" → 본문이 로컬로 열린다', (tester) async {
      setScreen(tester, const Size(700, 1800));
      final auth = FakeAuthService()
        ..failNextWith = 'x'
        ..failNextKind = AuthFailureKind.guestUnavailable;
      final store = await makeConsentStore(auth);
      await tester.pumpWidget(_gate(auth, store));
      await tester.pumpAndSettle();
      await _acceptRequired(tester);
      await tester.tap(find.byKey(const Key('guest-continue-offline')));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('app-child')), findsOneWidget);
      expect(auth.current.isSignedOut, isTrue);
      expect(store.has(ConsentKind.terms), isFalse, reason: '사용자 없이 서버 기능은 닫힘');
      expect(store.needsConsent, isFalse, reason: '로컬 동의는 유지');
    });

    testWidgets('오프라인 첫 실행: 오류 화면 없이 본문, 돌아오면 조용히 게스트가 되고 동의가 올라간다', (
      tester,
    ) async {
      setScreen(tester, const Size(700, 1800));
      final backend = FakeConsentBackend();
      final auth = FakeAuthService()
        ..failNextWith = 'offline'
        ..failNextKind = AuthFailureKind.network;
      final store = await makeConsentStore(auth, backend: backend);
      await tester.pumpWidget(_gate(auth, store));
      await tester.pumpAndSettle();
      await _acceptRequired(tester);
      expect(find.byKey(const Key('app-child')), findsOneWidget);
      expect(find.text('게스트로 시작하지 못했어요'), findsNothing);
      expect(auth.current.isSignedOut, isTrue);
      expect(backend.received, isEmpty);

      // 앱이 다시 앞으로 나올 때 조용히 재시도.
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      await tester.pumpAndSettle();
      expect(auth.current.isAnonymous, isTrue);
      expect(find.byKey(const Key('app-child')), findsOneWidget);
      await store.flush();
      expect(backend.server[ConsentKind.terms]?.granted, isTrue);
      expect(store.pendingCount, 0);
    });

    testWidgets('재시작: 로컬 동의가 있고 로그아웃 상태면 동의를 다시 묻지 않고 게스트로 시작', (tester) async {
      SharedPreferencesHolder.reset();
      final prefs = await SharedPreferencesHolder.get();
      final auth = FakeAuthService();
      final first = await makeConsentStore(auth, prefs: prefs);
      await first.grantRequired(); // 오프라인 첫 실행에서 받아 둔 동의
      first.dispose();

      final store = await makeConsentStore(auth, prefs: prefs);
      expect(store.needsConsent, isFalse);
      await tester.pumpWidget(_gate(auth, store));
      await tester.pumpAndSettle();
      expect(find.byType(ConsentScreen), findsNothing);
      expect(auth.calls, ['signInAnonymously']);
      expect(find.byKey(const Key('app-child')), findsOneWidget);
    });

    testWidgets('동의 버전이 바뀌면 게스트에게도 동의 화면(로그아웃 버튼 없음)', (tester) async {
      final auth = FakeAuthService(
        initial: const AuthState.signedIn(userId: 'g', isAnonymous: true),
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
      expect(find.byKey(const Key('consent-logout')), findsNothing);
    });

    testWidgets('백엔드가 있어도 로그인 화면은 게이트에 나오지 않는다', (tester) async {
      final auth = FakeAuthService();
      final store = await makeConsentStore(auth);
      await tester.pumpWidget(_gate(auth, store));
      await tester.pumpAndSettle();
      expect(find.byType(LoginScreen), findsNothing);
    });
  });

  group('동의 한 화면 360x640 · 글자 1.5배', () {
    testWidgets('넘침 없이 스크롤되고 주 버튼은 하나', (tester) async {
      setScreen(tester, const Size(360, 640));
      final auth = FakeAuthService();
      final store = await makeConsentStore(auth);
      await tester.pumpWidget(_gate(auth, store, textScale: 1.5));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      expect(find.byType(ConsentScreen), findsOneWidget);
      expect(find.byType(FilledButton), findsOneWidget);
      // 필수 3 + 선택 4가 모두 이 화면에 있다(스크롤).
      for (final k in ConsentKind.all) {
        await tester.ensureVisible(find.byKey(Key('consent-$k')));
        await tester.pump();
        expect(find.byKey(Key('consent-$k')), findsOneWidget);
      }
      await tester.ensureVisible(
        find.byKey(const Key('consent-not-collected')),
      );
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      // 필수를 채우기 전에는 비활성.
      expect(
        tester
            .widget<FilledButton>(find.byKey(const Key('consent-submit')))
            .onPressed,
        isNull,
      );
    });

    testWidgets('오류 화면도 넘치지 않는다', (tester) async {
      setScreen(tester, const Size(360, 640));
      final auth = FakeAuthService()
        ..failNextWith = 'x'
        ..failNextKind = AuthFailureKind.guestUnavailable;
      final store = await makeConsentStore(auth);
      await store.grantRequired();
      await tester.pumpWidget(_gate(auth, store, textScale: 1.5));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('guest-retry')), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });

  group('ConsentStore: 로그인 전 동의', () {
    test('기기에 저장 → 새 사용자로 옮겨 올림, 기기 캐시는 비운다', () async {
      final backend = FakeConsentBackend();
      final auth = FakeAuthService();
      final store = await makeConsentStore(auth, backend: backend);
      await store.setAll({
        for (final k in ConsentKind.required) k: true,
        ConsentKind.church: true,
      });
      expect(store.has(ConsentKind.terms), isFalse);
      expect(store.needsConsent, isFalse);
      expect(backend.received, isEmpty);
      auth.emit(const AuthState.signedIn(userId: 'g1', isAnonymous: true));
      expect(store.has(ConsentKind.church), isTrue);
      await store.sync();
      expect(backend.server.keys.toSet(), {...ConsentKind.required, 'church'});
      // 같은 기기의 다른 사용자는 이어받지 못한다.
      auth.emit(const AuthState.signedOut());
      auth.emit(const AuthState.signedIn(userId: 'g2', isAnonymous: true));
      expect(store.needsConsent, isTrue);
    });

    test('서버에 이미 동의가 있는 사용자는 기기 동의로 덮어쓰지 않는다', () async {
      SharedPreferencesHolder.reset();
      final prefs = await SharedPreferencesHolder.get();
      final auth = FakeAuthService();
      final a = await makeConsentStore(auth, prefs: prefs);
      await a.grantRequired();
      auth.emitSignedIn(userId: 'u1');
      await a.revoke(ConsentKind.terms); // u1은 이미 자기 캐시를 가졌다
      a.dispose();
      auth.emit(const AuthState.signedOut());
      final b = await makeConsentStore(auth, prefs: prefs);
      await b.grantRequired(); // 기기 캐시 새로 생김
      auth.emitSignedIn(userId: 'u1'); // u1 캐시: terms 철회됨 → 필수 미완 → 기기 동의를 합친다
      expect(b.has(ConsentKind.privacy), isTrue);
    });
  });

  group('AccountScreen · 기록 지키기', () {
    Future<(FakeAuthService, ConsentStore)> guest(WidgetTester tester) async {
      setScreen(tester, const Size(700, 2400));
      final auth = FakeAuthService(
        initial: const AuthState.signedIn(userId: 'g1', isAnonymous: true),
      );
      final store = await makeConsentStore(auth);
      await store.grantRequired();
      await tester.pumpWidget(
        authHost(AccountScreen(authService: auth, consentStore: store)),
      );
      await tester.pumpAndSettle();
      return (auth, store);
    }

    testWidgets('게스트는 기록 지키기 카드와 연결 버튼 3개를 본다', (tester) async {
      await guest(tester);
      expect(find.byKey(const Key('guest-link-card')), findsOneWidget);
      expect(find.text('기록 지키기'), findsOneWidget);
      expect(find.text('게스트'), findsOneWidget);
      expect(find.byKey(const Key('link-kakao')), findsOneWidget);
      expect(find.byKey(const Key('link-google')), findsOneWidget);
      expect(find.byKey(const Key('link-email')), findsOneWidget);
      // 동기화 동의가 꺼져 있으면 안내가 나온다.
      expect(find.byKey(const Key('guest-link-sync-hint')), findsOneWidget);
    });

    testWidgets('카카오 연결: 같은 userId로 일반 로그인 화면이 되고 카드가 사라진다', (tester) async {
      final (auth, _) = await guest(tester);
      await tester.tap(find.byKey(const Key('link-kakao')));
      await tester.pumpAndSettle();
      expect(auth.calls, ['linkWithKakao']);
      expect(auth.current.userId, 'g1');
      expect(auth.current.isAnonymous, isFalse);
      expect(find.byKey(const Key('guest-link-card')), findsNothing);
      expect(find.text('카카오로 로그인'), findsOneWidget);
    });

    testWidgets('연결 실패는 SnackBar로 알리고 카드는 그대로', (tester) async {
      final (auth, _) = await guest(tester);
      auth.failNextWith = '이미 다른 계정에 연결된 로그인이에요.';
      await tester.tap(find.byKey(const Key('link-google')));
      await tester.pumpAndSettle();
      expect(find.text('이미 다른 계정에 연결된 로그인이에요.'), findsOneWidget);
      expect(find.byKey(const Key('guest-link-card')), findsOneWidget);
      expect(auth.current.isAnonymous, isTrue);
    });

    testWidgets('이메일 연결: 시트에서 가입 전용, 확인 메일이면 안내하고 게스트 유지', (tester) async {
      final (auth, _) = await guest(tester);
      auth.linkEmailOutcome = EmailSignUpOutcome.confirmationRequired;
      await tester.tap(find.byKey(const Key('link-email')));
      await tester.pumpAndSettle();
      expect(find.text('이메일 연결'), findsWidgets);
      expect(find.byKey(const Key('email-mode')), findsNothing);
      await tester.enterText(find.byKey(const Key('email-field')), 'a@b.co');
      await tester.enterText(
        find.byKey(const Key('password-field')),
        'abcd1234',
      );
      await tester.tap(find.byKey(const Key('email-submit')));
      await tester.pumpAndSettle();
      expect(auth.calls, ['linkWithEmail:a@b.co']);
      expect(find.textContaining('확인 메일을 보냈어요'), findsOneWidget);
      expect(auth.current.isAnonymous, isTrue);
    });

    testWidgets('이메일 연결 즉시 완료되면 시트가 닫히고 카드가 사라진다', (tester) async {
      final (auth, _) = await guest(tester);
      await tester.tap(find.byKey(const Key('link-email')));
      await tester.pumpAndSettle();
      await tester.enterText(find.byKey(const Key('email-field')), 'a@b.co');
      await tester.enterText(
        find.byKey(const Key('password-field')),
        'abcd1234',
      );
      await tester.tap(find.byKey(const Key('email-submit')));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('email-field')), findsNothing);
      expect(find.byKey(const Key('guest-link-card')), findsNothing);
      expect(find.text('a@b.co'), findsOneWidget);
    });

    testWidgets('"이미 계정이 있어요": 경고 뒤 로그인 화면, 로그인되면 닫힌다', (tester) async {
      final (auth, _) = await guest(tester);
      await tester.tap(find.byKey(const Key('guest-existing-account')));
      await tester.pumpAndSettle();
      expect(find.textContaining('사라지고'), findsOneWidget);
      await tester.tap(find.byKey(const Key('guest-existing-confirm')));
      await tester.pumpAndSettle();
      expect(find.byType(LoginScreen), findsOneWidget);
      await tester.tap(find.byKey(const Key('login-kakao')));
      await tester.pumpAndSettle();
      expect(find.byType(LoginScreen), findsNothing);
      expect(auth.current.isRealAccount, isTrue);
      expect(auth.current.userId, isNot('g1'));
    });

    testWidgets('게스트 로그아웃은 기록이 사라진다는 경고를 보인다', (tester) async {
      final (auth, _) = await guest(tester);
      await tester.ensureVisible(find.byKey(const Key('account-logout')));
      await tester.tap(find.byKey(const Key('account-logout')));
      await tester.pumpAndSettle();
      expect(find.text('게스트 기록을 지울까요?'), findsOneWidget);
      await tester.tap(find.byKey(const Key('logout-confirm')));
      await tester.pumpAndSettle();
      expect(auth.current.isSignedOut, isTrue);
    });

    testWidgets('게스트 계정 삭제: RPC 호출 후 로그아웃·로컬 동의 삭제', (tester) async {
      final (auth, store) = await guest(tester);
      await tester.ensureVisible(find.byKey(const Key('account-delete')));
      await tester.tap(find.byKey(const Key('account-delete')));
      await tester.pumpAndSettle();
      await tester.enterText(
        find.byKey(const Key('delete-confirm-field')),
        '삭제',
      );
      await tester.pump();
      await tester.tap(find.byKey(const Key('delete-confirm')));
      await tester.pumpAndSettle();
      expect(auth.accountDeleted, isTrue);
      expect(auth.current.isSignedOut, isTrue);
      expect(store.needsConsent, isTrue);
    });

    testWidgets('실제 계정이면 카드가 없고, 로그아웃 상태면 다시 연결 버튼', (tester) async {
      setScreen(tester, const Size(700, 2400));
      final auth = FakeAuthService(
        initial: const AuthState.signedIn(
          userId: 'u',
          email: 'a@b.co',
          provider: LoginProvider.email,
        ),
      );
      final store = await makeConsentStore(auth);
      await tester.pumpWidget(
        authHost(AccountScreen(authService: auth, consentStore: store)),
      );
      await tester.pumpAndSettle();
      expect(find.byType(GuestLinkCard), findsNothing);
      auth.emit(const AuthState.signedOut());
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('account-reconnect')), findsOneWidget);
      await tester.tap(find.byKey(const Key('account-reconnect')));
      await tester.pumpAndSettle();
      expect(auth.current.isAnonymous, isTrue);
    });

    testWidgets('360x640 · 글자 1.5배에서 넘치지 않는다', (tester) async {
      setScreen(tester, const Size(360, 640));
      final auth = FakeAuthService(
        initial: const AuthState.signedIn(userId: 'g1', isAnonymous: true),
      );
      final store = await makeConsentStore(auth);
      await store.grantRequired();
      await tester.pumpWidget(
        authHost(
          AccountScreen(authService: auth, consentStore: store),
          textScale: 1.5,
        ),
      );
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      await tester.ensureVisible(
        find.byKey(const Key('guest-existing-account')),
      );
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
    });
  });

  group('GuestStartController', () {
    test('실패 종류별 상태: network → offline, guestUnavailable → failed', () async {
      final auth = FakeAuthService()
        ..failNextWith = 'x'
        ..failNextKind = AuthFailureKind.network;
      final c = GuestStartController(auth);
      await c.start();
      expect(c.status, GuestStartStatus.offline);
      await c.retryIfOffline();
      expect(auth.current.isAnonymous, isTrue);
      expect(c.status, GuestStartStatus.idle);

      final auth2 = FakeAuthService()
        ..failNextWith = 'x'
        ..failNextKind = AuthFailureKind.guestUnavailable;
      final c2 = GuestStartController(auth2);
      await c2.start();
      expect(c2.status, GuestStartStatus.failed);
      expect(c2.errorMessage, guestUnavailableMessage);
      c.dispose();
      c2.dispose();
    });

    test('응답이 없으면 시간 초과로 오프라인 처리', () async {
      final auth = FakeAuthService(latency: const Duration(seconds: 5));
      final c = GuestStartController(
        auth,
        timeout: const Duration(milliseconds: 10),
      );
      await c.start();
      expect(c.status, GuestStartStatus.offline);
      c.dispose();
    });
  });
}
