import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/auth/account_screen.dart';
import 'package:rosary_app/auth/auth_state.dart';
import 'package:rosary_app/auth/consent_screen.dart';
import 'package:rosary_app/auth/consent_store.dart';
import 'package:rosary_app/auth/consent_detail_sheet.dart';
import 'package:rosary_app/auth/email_auth_sheet.dart';
import 'package:rosary_app/auth/fake_auth_service.dart';
import 'package:rosary_app/auth/legal_screen.dart';
import 'package:rosary_app/auth/legal_texts.dart';
import 'package:rosary_app/auth/login_screen.dart';

import 'auth_test_support.dart';

const _sizes = {
  '360x640 · 글자 1.5배': (Size(360, 640), 1.5),
  '360x640 · 글자 1.0배': (Size(360, 640), 1.0),
  '1000x800 넓은 화면': (Size(1000, 800), 1.0),
};

void main() {
  for (final entry in _sizes.entries) {
    final (size, scale) = entry.value;
    group(entry.key, () {
      Future<(FakeAuthService, ConsentStore)> setup() async {
        final auth = FakeAuthService(
          initial: const AuthState.signedIn(
            userId: 'u1',
            email: 'long.email.address.for.overflow.test@example.com',
            provider: LoginProvider.email,
          ),
        );
        final store = await makeConsentStore(auth);
        return (auth, store);
      }

      testWidgets('LoginScreen', (tester) async {
        setScreen(tester, size);
        await tester.pumpWidget(
          authHost(
            LoginScreen(authService: FakeAuthService()),
            textScale: scale,
          ),
        );
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
        // 아래 링크까지 스크롤해도 문제가 없다.
        await tester.ensureVisible(find.byKey(const Key('login-privacy')));
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
      });

      testWidgets('LoginScreen 이메일 시트', (tester) async {
        setScreen(tester, size);
        await tester.pumpWidget(
          authHost(
            LoginScreen(authService: FakeAuthService()),
            textScale: scale,
          ),
        );
        await tester.tap(find.byKey(const Key('login-email')));
        await tester.pumpAndSettle();
        expect(find.byType(EmailAuthSheet), findsOneWidget);
        expect(tester.takeException(), isNull);
      });

      testWidgets('ConsentScreen', (tester) async {
        setScreen(tester, size);
        final (auth, store) = await setup();
        await tester.pumpWidget(
          authHost(
            ConsentScreen(authService: auth, consentStore: store),
            textScale: scale,
          ),
        );
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
        await tester.ensureVisible(
          find.byKey(const Key('consent-diagnostics')),
        );
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
        // 시작 버튼이 항상 화면 안에 보인다.
        final bottom = tester
            .getBottomLeft(find.byKey(const Key('consent-submit')))
            .dy;
        expect(bottom, lessThanOrEqualTo(size.height));
      });

      testWidgets('ConsentScreen 자세히 시트', (tester) async {
        setScreen(tester, size);
        final (auth, store) = await setup();
        await tester.pumpWidget(
          authHost(
            ConsentScreen(authService: auth, consentStore: store),
            textScale: scale,
          ),
        );
        await tester.ensureVisible(
          find.byKey(const Key('consent-detail-church')),
        );
        await tester.pumpAndSettle();
        await tester.tap(find.byKey(const Key('consent-detail-church')));
        await tester.pumpAndSettle();
        expect(find.byType(ConsentDetailContent), findsOneWidget);
        expect(tester.takeException(), isNull);
      });

      testWidgets('AccountScreen', (tester) async {
        setScreen(tester, size);
        final (auth, store) = await setup();
        await tester.pumpWidget(
          authHost(
            AccountScreen(authService: auth, consentStore: store),
            textScale: scale,
          ),
        );
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
        await tester.scrollUntilVisible(
          find.byKey(const Key('account-delete')),
          200,
          scrollable: find.byType(Scrollable).first,
        );
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
        await tester.tap(find.byKey(const Key('account-delete')));
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
      });

      testWidgets('LegalScreen', (tester) async {
        setScreen(tester, size);
        await tester.pumpWidget(
          authHost(
            const LegalScreen(title: legalPrivacyTitle, body: legalPrivacyBody),
            textScale: scale,
          ),
        );
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
      });
    });
  }

  testWidgets('본문 최대 폭은 560dp', (tester) async {
    setScreen(tester, const Size(1000, 800));
    await tester.pumpWidget(
      authHost(LoginScreen(authService: FakeAuthService())),
    );
    await tester.pumpAndSettle();
    final w = tester.getSize(find.byKey(const Key('login-kakao'))).width;
    expect(w, lessThanOrEqualTo(560));
  });
}
