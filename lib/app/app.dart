import 'package:dynamic_color/dynamic_color.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import '../analytics/analytics_observer.dart';
import '../auth/auth_gate.dart';
import '../backup/backup_ui.dart';
import '../ui/app_shell.dart';
import '../ui/skin_picker.dart';
import 'app_services.dart';
import 'settings.dart';
import 'theme.dart';

class RosaryApp extends StatefulWidget {
  /// [services]가 없으면 네트워크·디스크를 쓰지 않는 기본 묶음(로그인 없음)으로 연다.
  const RosaryApp(this.settings, {super.key, this.services, this.clock});

  final AppSettings settings;
  final AppServices? services;

  /// 날짜 문(계절 스킨)에 쓰는 지금. 시험이 넣는다.
  final DateTime Function()? clock;

  @override
  State<RosaryApp> createState() => _RosaryAppState();
}

class _RosaryAppState extends State<RosaryApp> with WidgetsBindingObserver {
  late final AppServices _services =
      widget.services ?? AppServices.inMemory(widget.settings);
  final AnalyticsObserver _analyticsObserver = AnalyticsObserver(
    rootScreen: () => AppShell.currentScreenId,
  );

  late final SkinPreviewObserver _skinObserver = SkinPreviewObserver(
    widget.settings,
  );

  AppSettings get settings => widget.settings;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  /// 앱을 나갔다 돌아오면 미리 보던 스킨을 걷는다(저장은 하지 않았다).
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) settings.skinPreviewId = null;
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    if (widget.services == null) _services.disposeInMemory();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final services = _services;
    // DynamicColorBuilder는 항상 트리에 두어(설정을 켜고 꺼도 내비게이터 상태가
    // 유지되도록) 기기 색을 비동기로 한 번만 읽는다. 지원하지 않는 기기에서는
    // 두 구성이 null이라 앱 고유(상아색·갈색·금색) 구성으로 돌아간다.
    return AppServicesScope(
      services: services,
      child: DynamicColorBuilder(
        builder: (lightDynamic, darkDynamic) => ListenableBuilder(
          listenable: settings,
          builder: (context, _) {
            final dynamicOn = settings.useDynamicColor;
            // 스킨: 기본이 아닌 스킨을 고르면 기기 색보다 먼저다. 기본이면 지금까지처럼 기기 색 설정을 따른다.
            final skin = AppTheme.activeSkin(
              settings,
              widget.clock?.call() ?? DateTime.now(),
            );
            final useSkin = !skin.isDefault;
            return MaterialApp(
              title: '로사리움',
              debugShowCheckedModeBanner: false,
              themeMode: useSkin ? skin.themeMode : ThemeMode.system,
              theme: useSkin
                  ? AppTheme.forSkin(
                      skin,
                      Brightness.light,
                      font: settings.prayerFont,
                    )
                  : AppTheme.light(
                      dynamicScheme: dynamicOn
                          ? lightDynamic?.harmonized()
                          : null,
                      // 내비게이션(레일·하단 바)은 밝은 테마에서도 어두운 구성을 쓴다.
                      chromeScheme: dynamicOn
                          ? darkDynamic?.harmonized()
                          : null,
                      font: settings.prayerFont,
                    ),
              darkTheme: useSkin
                  ? AppTheme.forSkin(
                      skin,
                      Brightness.dark,
                      font: settings.prayerFont,
                    )
                  : AppTheme.dark(
                      dynamicScheme: dynamicOn
                          ? darkDynamic?.harmonized()
                          : null,
                      font: settings.prayerFont,
                    ),
              locale: const Locale('ko', 'KR'),
              supportedLocales: const [Locale('ko')],
              localizationsDelegates: const [
                GlobalMaterialLocalizations.delegate,
                GlobalWidgetsLocalizations.delegate,
                GlobalCupertinoLocalizations.delegate,
              ],
              // edge-to-edge: 투명한 시스템 바 + 테마 밝기에 맞는 아이콘 색.
              builder: (context, child) =>
                  AnnotatedRegion<SystemUiOverlayStyle>(
                    value: AppTheme.systemOverlayStyle(
                      Theme.of(context).brightness,
                    ),
                    child: SkinPreviewHost(
                      settings: settings,
                      child: child ?? const SizedBox.shrink(),
                    ),
                  ),
              navigatorObservers: [_analyticsObserver, _skinObserver],
              home: AuthGate(
                authService: services.auth,
                consentStore: services.consent,
                backendConfigured: services.backendConfigured,
                child: BackupOfferWatcher(
                  service: services.backup,
                  child: AppShell(settings: settings),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
