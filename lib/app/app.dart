import 'package:dynamic_color/dynamic_color.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import '../ui/app_shell.dart';
import 'settings.dart';
import 'theme.dart';

class RosaryApp extends StatelessWidget {
  const RosaryApp(this.settings, {super.key});

  final AppSettings settings;

  @override
  Widget build(BuildContext context) {
    // DynamicColorBuilder는 항상 트리에 두어(설정을 켜고 꺼도 내비게이터 상태가
    // 유지되도록) 기기 색을 비동기로 한 번만 읽는다. 지원하지 않는 기기에서는
    // 두 구성이 null이라 시드(테라코타) 구성으로 돌아간다.
    return DynamicColorBuilder(
      builder: (lightDynamic, darkDynamic) => ListenableBuilder(
        listenable: settings,
        builder: (context, _) {
          final dynamicOn = settings.useDynamicColor;
          return MaterialApp(
            title: '묵주기도',
            debugShowCheckedModeBanner: false,
            themeMode: ThemeMode.system,
            theme: AppTheme.light(
              dynamicScheme: dynamicOn ? lightDynamic?.harmonized() : null,
            ),
            darkTheme: AppTheme.dark(
              dynamicScheme: dynamicOn ? darkDynamic?.harmonized() : null,
            ),
            locale: const Locale('ko', 'KR'),
            supportedLocales: const [Locale('ko')],
            localizationsDelegates: const [
              GlobalMaterialLocalizations.delegate,
              GlobalWidgetsLocalizations.delegate,
              GlobalCupertinoLocalizations.delegate,
            ],
            // edge-to-edge: 투명한 시스템 바 + 테마 밝기에 맞는 아이콘 색.
            builder: (context, child) => AnnotatedRegion<SystemUiOverlayStyle>(
              value: AppTheme.systemOverlayStyle(Theme.of(context).brightness),
              child: child ?? const SizedBox.shrink(),
            ),
            home: AppShell(settings: settings),
          );
        },
      ),
    );
  }
}
