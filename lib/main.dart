import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'app/app.dart';
import 'app/app_bootstrap.dart';
import 'app/app_services.dart';
import 'app/licenses.dart';
import 'app/theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // 서비스 준비(저장소·로그인·분석)가 끝나기 전에도 바로 첫 화면을 그린다.
  // 그동안 흰 화면이 길게 보이지 않도록 앱 배경색의 시작 화면을 먼저 보여 준다.
  runApp(const _Launcher());
}

class _Launcher extends StatefulWidget {
  const _Launcher();

  @override
  State<_Launcher> createState() => _LauncherState();
}

class _LauncherState extends State<_Launcher> {
  AppServices? _services;
  Object? _error;

  @override
  void initState() {
    super.initState();
    _start();
  }

  Future<void> _start() async {
    try {
      // Android 15부터 edge-to-edge가 기본/강제다. 모든 버전에서 같게 동작하도록
      // 명시하고, 시스템 바 색은 앱(AnnotatedRegion/AppBar)이 정한다.
      await SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
      registerFontLicenses();
      // Supabase(설정된 경우) → 설정·기록 → 인증/동의 → 분석·동기화. 미설정이면 로그인 없이 열린다.
      final services = await bootstrapServices();
      if (mounted) setState(() => _services = services);
    } catch (e) {
      // 시작 실패도 빈 화면 대신 알려 준다(내용은 화면에 쓰지 않는다).
      debugPrint('app: bootstrap failed (${e.runtimeType})');
      if (mounted) setState(() => _error = e);
    }
  }

  @override
  Widget build(BuildContext context) {
    final services = _services;
    if (services != null) {
      return RosaryApp(services.settings, services: services);
    }
    return _LaunchScreen(failed: _error != null, onRetry: _retry);
  }

  void _retry() {
    setState(() => _error = null);
    _start();
  }
}

/// 서비스가 준비되기 전의 시작 화면. MaterialApp 밖이라 필요한 것만 직접 지정한다.
class _LaunchScreen extends StatelessWidget {
  const _LaunchScreen({required this.failed, required this.onRetry});

  final bool failed;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final dark = MediaQuery.platformBrightnessOf(context) == Brightness.dark;
    final bg = dark ? const Color(0xFF1E1A18) : const Color(0xFFFFF8F5);
    final fg = dark ? const Color(0xFFF1DFD9) : const Color(0xFF4A2A1E);
    return Directionality(
      textDirection: TextDirection.ltr,
      child: ColoredBox(
        color: bg,
        child: Center(
          child: DefaultTextStyle(
            style: TextStyle(
              fontFamily: AppTheme.sansFamily,
              color: fg,
              fontSize: 28,
              fontWeight: FontWeight.w600,
              decoration: TextDecoration.none,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text('묵주기도'),
                const SizedBox(height: 24),
                if (failed) ...[
                  const Text(
                    '시작하지 못했어요',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w400),
                  ),
                  const SizedBox(height: 12),
                  GestureDetector(
                    onTap: onRetry,
                    child: Container(
                      constraints: const BoxConstraints(
                        minWidth: 120,
                        minHeight: 48,
                      ),
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: fg,
                        borderRadius: BorderRadius.circular(24),
                      ),
                      child: Text(
                        '다시 시도',
                        style: TextStyle(
                          fontFamily: AppTheme.sansFamily,
                          color: bg,
                          fontSize: 16,
                          decoration: TextDecoration.none,
                        ),
                      ),
                    ),
                  ),
                ] else
                  SizedBox(
                    width: 28,
                    height: 28,
                    child: CircularProgressIndicator(strokeWidth: 3, color: fg),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
