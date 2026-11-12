/// Supabase 연결 설정. 빌드 시 `--dart-define`으로 넣는다.
///
/// ```
/// flutter run --dart-define=SUPABASE_URL=https://xxxx.supabase.co \
///             --dart-define=SUPABASE_ANON_KEY=eyJ...
/// ```
/// anon(공개) 키는 비밀이 아니다. 데이터 보호는 서버의 RLS가 맡는다.
/// 서비스 롤 키는 절대 앱에 넣지 않는다.
abstract final class BackendConfig {
  static const String supabaseUrl = String.fromEnvironment('SUPABASE_URL');
  static const String anonKey = String.fromEnvironment('SUPABASE_ANON_KEY');

  /// 두 값이 모두 있어야 true. false이면 앱은 로그인 없이 열리고 서버로는
  /// 아무것도 보내지 않는다(개발용).
  static bool get isConfigured => supabaseUrl.isNotEmpty && anonKey.isNotEmpty;

  /// OAuth 완료 후 앱으로 돌아오는 딥링크.
  static const String callbackScheme = 'kr.rosary.rosaryapp';
  static const String callbackHost = 'login-callback';
  static const String redirectUrl = '$callbackScheme://$callbackHost';
}
