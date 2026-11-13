import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/auth/auth_state.dart';
import 'package:rosary_app/auth/email_auth_sheet.dart';
import 'package:rosary_app/auth/fake_auth_service.dart';
import 'package:rosary_app/auth/legal_screen.dart';
import 'package:rosary_app/auth/login_screen.dart';

import 'auth_test_support.dart';

Future<FakeAuthService> _pumpLogin(
  WidgetTester tester, {
  FakeAuthService? auth,
}) async {
  setScreen(tester, const Size(500, 1000));
  final service = auth ?? FakeAuthService(autoCompleteSignIn: false);
  await tester.pumpWidget(authHost(LoginScreen(authService: service)));
  await tester.pumpAndSettle();
  return service;
}

void main() {
  testWidgets('제공자 버튼이 순서대로 있고 문구가 맞다', (tester) async {
    await _pumpLogin(tester);
    expect(find.text('로사리움'), findsOneWidget);
    final ys = [
      for (final k in ['login-kakao', 'login-google', 'login-email'])
        tester.getTopLeft(find.byKey(Key(k))).dy,
    ];
    expect(ys, [...ys]..sort());
    expect(find.text('카카오로 시작하기'), findsOneWidget);
    expect(find.text('Google로 시작하기'), findsOneWidget);
    expect(find.text('이메일로 시작하기'), findsOneWidget);
  });

  testWidgets('로그인 버튼은 정확히 카카오·Google·이메일 세 개', (tester) async {
    await _pumpLogin(tester);
    for (final k in ['login-kakao', 'login-google', 'login-email']) {
      expect(find.byKey(Key(k)), findsOneWidget, reason: k);
    }
    expect(find.byType(FilledButton), findsNWidgets(2)); // 카카오, 이메일(tonal)
    expect(find.byType(OutlinedButton), findsOneWidget); // Google
    expect(find.textContaining('Apple'), findsNothing);
    expect(find.textContaining('애플'), findsNothing);
  });

  testWidgets('카카오 버튼은 브랜드 노란색/검정 글자', (tester) async {
    await _pumpLogin(tester);
    final button = tester.widget<FilledButton>(
      find.byKey(const Key('login-kakao')),
    );
    final bg = button.style!.backgroundColor!.resolve({});
    final fg = button.style!.foregroundColor!.resolve({});
    expect(bg, const Color(0xFFFEE500));
    expect(fg, const Color(0xFF191919));
  });

  testWidgets('각 버튼이 알맞은 제공자를 호출한다', (tester) async {
    final auth = await _pumpLogin(tester);
    await tester.tap(find.byKey(const Key('login-kakao')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('login-google')));
    await tester.pumpAndSettle();
    expect(auth.calls, ['signInWithKakao', 'signInWithGoogle']);
  });

  testWidgets('진행 중에는 버튼이 잠기고 진행 표시가 보인다', (tester) async {
    final auth = FakeAuthService(
      latency: const Duration(seconds: 2),
      autoCompleteSignIn: false,
    );
    await _pumpLogin(tester, auth: auth);
    await tester.tap(find.byKey(const Key('login-kakao')));
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
    expect(
      tester
          .widget<OutlinedButton>(find.byKey(const Key('login-google')))
          .onPressed,
      isNull,
    );
    await tester.pump(const Duration(seconds: 3));
    await tester.pumpAndSettle();
    expect(find.byType(CircularProgressIndicator), findsNothing);
  });

  testWidgets('로그인 실패는 SnackBar로 알린다', (tester) async {
    final auth = await _pumpLogin(tester);
    auth.failNextWith = '브라우저를 열 수 없어요.';
    await tester.tap(find.byKey(const Key('login-google')));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.text('브라우저를 열 수 없어요.'), findsOneWidget);
    expect(find.byType(SnackBar), findsOneWidget);
  });

  testWidgets('서비스 상태의 오류 문구(콜백 실패)도 SnackBar로 알린다', (tester) async {
    final auth = await _pumpLogin(tester);
    auth.emit(const AuthState.signedOut(errorMessage: '로그인을 완료하지 못했어요.'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.text('로그인을 완료하지 못했어요.'), findsOneWidget);
  });

  testWidgets('약관·개인정보처리방침 링크가 LegalScreen을 연다', (tester) async {
    await _pumpLogin(tester);
    await tester.tap(find.byKey(const Key('login-terms')));
    await tester.pumpAndSettle();
    expect(find.byType(LegalScreen), findsOneWidget);
    await tester.pageBack();
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('login-privacy')));
    await tester.pumpAndSettle();
    expect(find.byType(LegalScreen), findsOneWidget);
    expect(find.text('개인정보처리방침'), findsWidgets);
  });

  group('이메일 폼', () {
    Future<FakeAuthService> openEmail(WidgetTester tester) async {
      final auth = await _pumpLogin(tester);
      await tester.tap(find.byKey(const Key('login-email')));
      await tester.pumpAndSettle();
      expect(find.byType(EmailAuthSheet), findsOneWidget);
      return auth;
    }

    testWidgets('빈 입력과 잘못된 이메일에 한국어 검증 메시지', (tester) async {
      final auth = await openEmail(tester);
      await tester.tap(find.byKey(const Key('email-submit')));
      await tester.pumpAndSettle();
      expect(find.text('이메일을 입력해 주세요.'), findsOneWidget);
      expect(find.text('비밀번호를 입력해 주세요.'), findsOneWidget);

      await tester.enterText(find.byKey(const Key('email-field')), 'abc');
      await tester.tap(find.byKey(const Key('email-submit')));
      await tester.pumpAndSettle();
      expect(find.textContaining('이메일 형식이 올바르지 않아요'), findsOneWidget);
      expect(auth.calls, isEmpty);
    });

    testWidgets('가입 모드는 비밀번호 8자 이상을 요구한다', (tester) async {
      final auth = await openEmail(tester);
      await tester.tap(find.text('가입'));
      await tester.pumpAndSettle();
      await tester.enterText(find.byKey(const Key('email-field')), 'a@b.co');
      await tester.enterText(find.byKey(const Key('password-field')), '1234');
      await tester.tap(find.byKey(const Key('email-submit')));
      await tester.pumpAndSettle();
      expect(find.text('비밀번호는 8자 이상이어야 해요.'), findsOneWidget);
      expect(auth.calls, isEmpty);

      await tester.enterText(
        find.byKey(const Key('password-field')),
        '12345678',
      );
      await tester.tap(find.byKey(const Key('email-submit')));
      await tester.pumpAndSettle();
      expect(auth.calls, ['signUpWithEmail:a@b.co']);
    });

    testWidgets('로그인 제출은 signInWithEmail을 부르고 시트가 닫힌다', (tester) async {
      final auth = await openEmail(tester);
      await tester.enterText(find.byKey(const Key('email-field')), 'a@b.co');
      await tester.enterText(find.byKey(const Key('password-field')), 'secret');
      await tester.tap(find.byKey(const Key('email-submit')));
      await tester.pumpAndSettle();
      expect(auth.calls, ['signInWithEmail:a@b.co']);
      expect(find.byType(EmailAuthSheet), findsNothing);
    });

    testWidgets('서버 오류는 인라인 오류로 보이고 시트가 유지된다', (tester) async {
      final auth = await openEmail(tester);
      auth.failNextWith = '이메일 또는 비밀번호가 올바르지 않아요.';
      await tester.enterText(find.byKey(const Key('email-field')), 'a@b.co');
      await tester.enterText(find.byKey(const Key('password-field')), 'secret');
      await tester.tap(find.byKey(const Key('email-submit')));
      await tester.pumpAndSettle();
      expect(find.text('이메일 또는 비밀번호가 올바르지 않아요.'), findsOneWidget);
      expect(find.byType(EmailAuthSheet), findsOneWidget);
    });

    testWidgets('비밀번호 보기 토글', (tester) async {
      await openEmail(tester);
      EditableText field() => tester.widget<EditableText>(
        find.descendant(
          of: find.byKey(const Key('password-field')),
          matching: find.byType(EditableText),
        ),
      );
      expect(field().obscureText, isTrue);
      await tester.tap(find.byKey(const Key('password-toggle')));
      await tester.pump();
      expect(field().obscureText, isFalse);
    });

    testWidgets('비밀번호 재설정: 이메일 없으면 안내, 있으면 호출', (tester) async {
      final auth = await openEmail(tester);
      await tester.tap(find.byKey(const Key('email-reset')));
      await tester.pumpAndSettle();
      expect(find.textContaining('먼저 이메일을 입력'), findsOneWidget);
      expect(auth.calls, isEmpty);

      await tester.enterText(find.byKey(const Key('email-field')), 'a@b.co');
      await tester.tap(find.byKey(const Key('email-reset')));
      await tester.pumpAndSettle();
      expect(auth.calls, ['resetPassword:a@b.co']);
      expect(find.textContaining('재설정 메일을 보냈어요'), findsOneWidget);
    });
  });
}
