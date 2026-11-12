import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/auth/account_screen.dart';
import 'package:rosary_app/auth/auth_state.dart';
import 'package:rosary_app/auth/consent_store.dart';
import 'package:rosary_app/auth/fake_auth_service.dart';
import 'package:rosary_app/auth/legal_screen.dart';

import 'auth_test_support.dart';

Future<(FakeAuthService, ConsentStore, FakeConsentBackend)> _pump(
  WidgetTester tester, {
  AuthState? initial,
}) async {
  setScreen(tester, const Size(700, 2000));
  final auth = FakeAuthService(
    initial:
        initial ??
        const AuthState.signedIn(
          userId: 'u1',
          email: 'tester@example.com',
          provider: LoginProvider.email,
        ),
  );
  final backend = FakeConsentBackend();
  final store = await makeConsentStore(auth, backend: backend);
  await store.grantRequired();
  await tester.pumpWidget(
    authHost(
      Builder(
        builder: (context) => Scaffold(
          body: Center(
            child: FilledButton(
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) =>
                      AccountScreen(authService: auth, consentStore: store),
                ),
              ),
              child: const Text('열기'),
            ),
          ),
        ),
      ),
    ),
  );
  await tester.tap(find.text('열기'));
  await tester.pumpAndSettle();
  return (auth, store, backend);
}

void main() {
  testWidgets('프로필 카드에 이메일과 로그인 방식이 보인다', (tester) async {
    await _pump(tester);
    expect(find.text('계정'), findsWidgets);
    expect(find.text('tester@example.com'), findsOneWidget);
    expect(find.text('이메일로 로그인'), findsOneWidget);
  });

  testWidgets('이메일이 없으면 "소셜 계정"', (tester) async {
    await _pump(
      tester,
      initial: const AuthState.signedIn(
        userId: 'u1',
        provider: LoginProvider.kakao,
      ),
    );
    expect(find.text('소셜 계정'), findsOneWidget);
    expect(find.text('카카오로 로그인'), findsOneWidget);
  });

  testWidgets('선택 동의 스위치는 즉시 grant/revoke하고 SnackBar로 안내한다', (tester) async {
    final (_, store, backend) = await _pump(tester);
    final sw = find.byKey(const Key('account-consent-sync'));
    expect(tester.widget<SwitchListTile>(sw).value, isFalse);

    await tester.tap(sw);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));
    expect(store.has(ConsentKind.sync), isTrue);
    expect(find.textContaining('서버로 전송되어 저장돼요'), findsOneWidget);

    await tester.tap(sw);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));
    expect(store.has(ConsentKind.sync), isFalse);
    expect(find.textContaining('서버에 저장된 기도 기록이(가) 삭제돼요'), findsOneWidget);
    await tester.pumpAndSettle();
    expect(backend.server[ConsentKind.sync]!.granted, isFalse);
  });

  testWidgets('내 데이터 내려받기: 크기를 보여 주고 복사한다', (tester) async {
    final (auth, _, _) = await _pump(tester);
    auth.exportJson = '{"profile":{"id":"x"}}';
    String? clip;
    tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
      SystemChannels.platform,
      (call) async {
        if (call.method == 'Clipboard.setData') {
          clip = (call.arguments as Map)['text'] as String?;
        }
        return null;
      },
    );
    addTearDown(
      () => tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
        SystemChannels.platform,
        null,
      ),
    );
    await tester.tap(find.byKey(const Key('account-export')));
    await tester.pumpAndSettle();
    expect(auth.calls, contains('exportMyData'));
    expect(find.byKey(const Key('export-size')), findsOneWidget);
    expect(find.textContaining('22바이트'), findsOneWidget);
    await tester.tap(find.byKey(const Key('export-copy')));
    await tester.pumpAndSettle();
    expect(clip, '{"profile":{"id":"x"}}');
  });

  testWidgets('법적 문서 링크', (tester) async {
    await _pump(tester);
    await tester.tap(find.byKey(const Key('account-privacy')));
    await tester.pumpAndSettle();
    expect(find.byType(LegalScreen), findsOneWidget);
  });

  testWidgets('로그아웃은 확인 대화상자를 거친다', (tester) async {
    final (auth, _, _) = await _pump(tester);
    await tester.tap(find.byKey(const Key('account-logout')));
    await tester.pumpAndSettle();
    expect(find.text('로그아웃할까요?'), findsOneWidget);
    await tester.tap(find.text('취소'));
    await tester.pumpAndSettle();
    expect(auth.calls, isNot(contains('signOut')));

    await tester.tap(find.byKey(const Key('account-logout')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('logout-confirm')));
    await tester.pumpAndSettle();
    expect(auth.calls, contains('signOut'));
    expect(find.byType(AccountScreen), findsNothing);
  });

  testWidgets('계정 삭제는 "삭제"를 입력해야 확인 버튼이 켜진다', (tester) async {
    final (auth, store, _) = await _pump(tester);
    await tester.tap(find.byKey(const Key('account-delete')));
    await tester.pumpAndSettle();
    expect(find.text('계정을 삭제할까요?'), findsOneWidget);
    expect(find.textContaining('기도 기록'), findsWidgets);

    FilledButton confirm() =>
        tester.widget<FilledButton>(find.byKey(const Key('delete-confirm')));
    expect(confirm().onPressed, isNull);

    await tester.enterText(find.byKey(const Key('delete-confirm-field')), '삭');
    await tester.pump();
    expect(confirm().onPressed, isNull);
    await tester.enterText(
      find.byKey(const Key('delete-confirm-field')),
      '삭제 ',
    );
    await tester.pump();
    expect(confirm().onPressed, isNotNull);

    await tester.tap(find.byKey(const Key('delete-confirm')));
    await tester.pumpAndSettle();
    expect(auth.calls, contains('deleteAccount'));
    expect(auth.accountDeleted, isTrue);
    expect(find.byType(AccountScreen), findsNothing);
    // 삭제한 사용자의 로컬 동의 캐시도 지워진다.
    auth.emit(const AuthState.signedIn(userId: 'u1'));
    expect(store.needsConsent, isTrue);
  });

  testWidgets('계정 삭제 취소는 아무것도 하지 않는다', (tester) async {
    final (auth, _, _) = await _pump(tester);
    await tester.tap(find.byKey(const Key('account-delete')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('취소'));
    await tester.pumpAndSettle();
    expect(auth.calls, isNot(contains('deleteAccount')));
    expect(find.byType(AccountScreen), findsOneWidget);
  });
}
