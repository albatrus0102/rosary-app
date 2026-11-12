import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/auth/auth_state.dart';
import 'package:rosary_app/auth/consent_screen.dart';
import 'package:rosary_app/auth/consent_store.dart';
import 'package:rosary_app/auth/fake_auth_service.dart';
import 'package:rosary_app/auth/legal_screen.dart';

import 'auth_test_support.dart';

FakeAuthService _signedIn([String uid = 'u1']) => FakeAuthService(
  initial: AuthState.signedIn(userId: uid, email: 'a@b.co'),
);

Future<void> _pump(
  WidgetTester tester,
  FakeAuthService auth,
  ConsentStore store,
) async {
  setScreen(tester, const Size(700, 2400));
  await tester.pumpWidget(
    authHost(ConsentScreen(authService: auth, consentStore: store)),
  );
  await tester.pumpAndSettle();
}

bool _submitEnabled(WidgetTester tester) =>
    tester
        .widget<FilledButton>(find.byKey(const Key('consent-submit')))
        .onPressed !=
    null;

void main() {
  group('ConsentScreen', () {
    testWidgets('아무것도 미리 체크되어 있지 않고 시작 버튼은 꺼져 있다', (tester) async {
      final auth = _signedIn();
      final store = await makeConsentStore(auth);
      await _pump(tester, auth, store);
      for (final k in ConsentKind.required) {
        expect(
          tester.widget<CheckboxListTile>(find.byKey(Key('consent-$k'))).value,
          isFalse,
        );
      }
      for (final k in ConsentKind.optional) {
        expect(
          tester.widget<SwitchListTile>(find.byKey(Key('consent-$k'))).value,
          isFalse,
        );
      }
      expect(_submitEnabled(tester), isFalse);
      expect(find.text('필수 동의'), findsOneWidget);
      expect(find.text('선택 동의'), findsOneWidget);
    });

    testWidgets('필수 3개를 모두 체크해야 버튼이 켜진다', (tester) async {
      final auth = _signedIn();
      final store = await makeConsentStore(auth);
      await _pump(tester, auth, store);
      await tester.tap(find.byKey(const Key('consent-terms')));
      await tester.tap(find.byKey(const Key('consent-privacy')));
      await tester.pump();
      expect(_submitEnabled(tester), isFalse);
      await tester.tap(find.byKey(const Key('consent-age14')));
      await tester.pump();
      expect(_submitEnabled(tester), isTrue);
      // 선택은 여전히 꺼짐.
      expect(
        tester
            .widget<SwitchListTile>(find.byKey(const Key('consent-sync')))
            .value,
        isFalse,
      );
    });

    testWidgets('전체 동의는 선택 항목까지 켜고 다시 누르면 모두 끈다', (tester) async {
      final auth = _signedIn();
      final store = await makeConsentStore(auth);
      await _pump(tester, auth, store);
      await tester.tap(find.byKey(const Key('consent-all')));
      await tester.pump();
      expect(
        tester
            .widget<SwitchListTile>(find.byKey(const Key('consent-church')))
            .value,
        isTrue,
      );
      expect(_submitEnabled(tester), isTrue);
      await tester.tap(find.byKey(const Key('consent-all')));
      await tester.pump();
      expect(_submitEnabled(tester), isFalse);
    });

    testWidgets('제출하면 선택하지 않은 선택 항목은 거부로 기록된다', (tester) async {
      final auth = _signedIn();
      final backend = FakeConsentBackend();
      final store = await makeConsentStore(auth, backend: backend);
      await _pump(tester, auth, store);
      await tester.tap(find.byKey(const Key('consent-all')));
      await tester.pump();
      await tester.tap(find.byKey(const Key('consent-usage')));
      await tester.pump();
      await tester.tap(find.byKey(const Key('consent-submit')));
      await tester.pumpAndSettle();
      expect(store.isRequiredComplete, isTrue);
      expect(store.has(ConsentKind.usage), isFalse);
      expect(store.has(ConsentKind.sync), isTrue);
      expect(backend.server[ConsentKind.usage]!.granted, isFalse);
      expect(backend.server[ConsentKind.sync]!.granted, isTrue);
      expect(backend.received.length, 7);
    });

    testWidgets('보기는 LegalScreen, 자세히는 네 요소를 담은 시트를 연다', (tester) async {
      final auth = _signedIn();
      final store = await makeConsentStore(auth);
      await _pump(tester, auth, store);
      await tester.tap(find.byKey(const Key('consent-view-terms')));
      await tester.pumpAndSettle();
      expect(find.byType(LegalScreen), findsOneWidget);
      await tester.pageBack();
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('consent-detail-sync')));
      await tester.pumpAndSettle();
      for (final s in [
        '수집·이용 목적',
        '수집 항목(서버로 전송되는 정보)',
        '보유·이용 기간',
        '동의를 거부할 권리와 불이익',
        '철회 방법',
        '민감정보 안내',
        '국외 저장',
      ]) {
        expect(find.text(s), findsOneWidget, reason: s);
      }
      expect(find.textContaining('신비 종류(환희/빛/고통/영광)'), findsOneWidget);
      expect(find.textContaining('수집하지 않는 정보'), findsWidgets);
      expect(find.textContaining('Supabase'), findsWidgets);
    });

    testWidgets('상단 고지에 전송·저장, 수집하지 않는 정보, 국외 저장이 있다', (tester) async {
      final auth = _signedIn();
      final store = await makeConsentStore(auth);
      await _pump(tester, auth, store);
      expect(
        find.textContaining('서비스 서버(Supabase)로 전송되어 저장됩니다'),
        findsOneWidget,
      );
      expect(find.textContaining('수집하지 않는 정보'), findsOneWidget);
      expect(find.textContaining('국외'), findsOneWidget);
    });

    testWidgets('로그아웃 버튼이 signOut을 부른다', (tester) async {
      final auth = _signedIn();
      final store = await makeConsentStore(auth);
      await _pump(tester, auth, store);
      await tester.tap(find.byKey(const Key('consent-logout')));
      await tester.pumpAndSettle();
      expect(auth.calls, ['signOut']);
    });
  });

  group('ConsentStore', () {
    test('grant/revoke는 즉시 반영되고 변경 스트림이 나온다', () async {
      final auth = _signedIn();
      final store = await makeConsentStore(auth, backend: FakeConsentBackend());
      final seen = <ConsentChange>[];
      store.changes.listen(seen.add);
      expect(store.needsConsent, isTrue);
      await store.grantRequired();
      expect(store.isRequiredComplete, isTrue);
      expect(store.needsConsent, isFalse);
      await store.grant(ConsentKind.sync);
      expect(store.has(ConsentKind.sync), isTrue);
      await store.revoke(ConsentKind.sync);
      expect(store.has(ConsentKind.sync), isFalse);
      await Future<void>.delayed(Duration.zero);
      expect(seen.last.kind, ConsentKind.sync);
      expect(seen.last.granted, isFalse);
      expect(seen.length, 5);
    });

    test('동의는 재시작(같은 prefs) 뒤에도 남는다', () async {
      final auth = _signedIn();
      SharedPreferencesHolder.reset();
      final prefs = await SharedPreferencesHolder.get();
      final a = await makeConsentStore(auth, prefs: prefs);
      await a.grantRequired();
      await a.grant(ConsentKind.church);
      a.dispose();
      final b = await makeConsentStore(auth, prefs: prefs);
      expect(b.isRequiredComplete, isTrue);
      expect(b.has(ConsentKind.church), isTrue);
      expect(b.has(ConsentKind.usage), isFalse);
    });

    test('다른 사용자는 서로의 동의를 보지 못한다', () async {
      final auth = _signedIn('u1');
      final store = await makeConsentStore(auth);
      await store.grantRequired();
      expect(store.needsConsent, isFalse);
      auth.emit(const AuthState.signedIn(userId: 'u2'));
      expect(store.needsConsent, isTrue);
      auth.emit(const AuthState.signedIn(userId: 'u1'));
      expect(store.needsConsent, isFalse);
      auth.emit(const AuthState.signedOut());
      expect(store.has(ConsentKind.terms), isFalse);
    });

    test('버전이 바뀌면 다시 동의가 필요하다', () async {
      final auth = _signedIn();
      SharedPreferencesHolder.reset();
      final prefs = await SharedPreferencesHolder.get();
      final v1 = await makeConsentStore(auth, prefs: prefs);
      await v1.grantRequired();
      await v1.grant(ConsentKind.sync);
      v1.dispose();
      final v2 = await makeConsentStore(
        auth,
        prefs: prefs,
        version: '2027-01-v2',
      );
      expect(v2.needsConsent, isTrue);
      expect(v2.has(ConsentKind.sync), isFalse);
      await v2.grantRequired();
      expect(v2.needsConsent, isFalse);
    });

    test('오프라인 쓰기는 큐에 쌓이고 온라인이 되면 순서대로 올라간다', () async {
      final auth = _signedIn();
      final backend = FakeConsentBackend()..online = false;
      final store = await makeConsentStore(auth, backend: backend);
      await store.grantRequired();
      await store.grant(ConsentKind.sync);
      await store.revoke(ConsentKind.sync);
      await Future<void>.delayed(Duration.zero);
      expect(store.has(ConsentKind.terms), isTrue);
      expect(store.pendingCount, 5);
      expect(backend.received, isEmpty);

      backend.online = true;
      await store.flush();
      expect(store.pendingCount, 0);
      expect(backend.received.map((c) => '${c.kind}:${c.granted}').toList(), [
        'terms:true',
        'privacy:true',
        'age14:true',
        'sync:true',
        'sync:false',
      ]);
      expect(backend.receivedVersions.toSet(), {consentVersion});
    });

    test('대기열은 재시작 뒤에도 남아 다음 동기화에 올라간다', () async {
      final auth = _signedIn();
      SharedPreferencesHolder.reset();
      final prefs = await SharedPreferencesHolder.get();
      final offline = FakeConsentBackend()..online = false;
      final a = await makeConsentStore(auth, backend: offline, prefs: prefs);
      await a.grantRequired();
      a.dispose();

      final online = FakeConsentBackend();
      final b = await makeConsentStore(auth, backend: online, prefs: prefs);
      await b.sync();
      expect(b.pendingCount, 0);
      expect(online.server.keys, containsAll(ConsentKind.required));
    });

    test('새 기기: 서버의 기존 동의를 가져오고, 가져오는 동안 isCheckingServer', () async {
      final backend = FakeConsentBackend();
      for (final k in [...ConsentKind.required, ConsentKind.sync]) {
        backend.server[k] = ConsentRecord(
          kind: k,
          granted: true,
          version: consentVersion,
          at: DateTime(2026, 11, 1),
        );
      }
      final auth = _signedIn();
      final store = await makeConsentStore(auth, backend: backend);
      expect(store.isCheckingServer, isTrue);
      await store.sync();
      expect(store.isCheckingServer, isFalse);
      expect(store.needsConsent, isFalse);
      expect(store.has(ConsentKind.sync), isTrue);
    });

    test('서버가 오프라인이면 확인을 끝내고 동의를 요구한다', () async {
      final backend = FakeConsentBackend()..online = false;
      final auth = _signedIn();
      final store = await makeConsentStore(auth, backend: backend);
      await store.sync();
      expect(store.isResolved, isTrue);
      expect(store.needsConsent, isTrue);
    });

    test('대기 중인 로컬 변경은 서버 값보다 우선한다', () async {
      final backend = FakeConsentBackend();
      backend.server[ConsentKind.sync] = ConsentRecord(
        kind: ConsentKind.sync,
        granted: true,
        version: consentVersion,
        at: DateTime(2026, 11, 1),
      );
      final auth = _signedIn();
      final store = await makeConsentStore(auth, backend: backend);
      await store.sync();
      expect(store.has(ConsentKind.sync), isTrue);
      backend.online = false;
      await store.revoke(ConsentKind.sync);
      backend.online = true;
      // 철회가 아직 올라가지 않은 상태에서 가져오기만 하면 로컬이 이긴다.
      expect(store.pendingCount, 1);
      await store.sync();
      expect(store.has(ConsentKind.sync), isFalse);
      expect(backend.server[ConsentKind.sync]!.granted, isFalse);
    });

    test('로그아웃 상태에서 grant는 아무것도 하지 않는다', () async {
      final auth = FakeAuthService();
      final store = await makeConsentStore(auth);
      await store.grant(ConsentKind.sync);
      expect(store.has(ConsentKind.sync), isFalse);
      expect(store.pendingCount, 0);
    });

    test('clearLocalData는 캐시를 지운다', () async {
      final auth = _signedIn();
      SharedPreferencesHolder.reset();
      final prefs = await SharedPreferencesHolder.get();
      final a = await makeConsentStore(auth, prefs: prefs);
      await a.grantRequired();
      await a.clearLocalData();
      a.dispose();
      final b = await makeConsentStore(auth, prefs: prefs);
      expect(b.needsConsent, isTrue);
    });
  });
}
