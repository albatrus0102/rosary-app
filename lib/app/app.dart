import 'package:dynamic_color/dynamic_color.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import '../analytics/analytics_observer.dart';
import '../auth/auth_gate.dart';
import '../backup/backup_ui.dart';
import '../diag/diag_send_sheet.dart';
import '../diag/diag_sources.dart';
import '../ui/app_intro.dart';
import '../ui/app_shell.dart';
import '../ui/skin_picker.dart';
import 'app_services.dart';
import 'settings.dart';
import 'theme.dart';

/// 앱 전체 글자 크기([AppSettings.appTextScale])를 기기의 글자 크기 위에 곱한다.
/// 곱한 값이 [maxAppTextScale]을 넘지 않게 눌러서 화면이 깨지지 않게 한다(기기 값이 이미 그보다 크면 그대로 둔다).
@visibleForTesting
MediaQueryData scaledForApp(MediaQueryData data, double appScale) {
  if (appScale == 1.0) return data;
  final system = data.textScaler.scale(100) / 100;
  final target = (system * appScale).clamp(
    system,
    system > maxAppTextScale ? system : maxAppTextScale,
  );
  return data.copyWith(textScaler: TextScaler.linear(target.toDouble()));
}

/// 앱 전체 글자 배율의 상한(기기 글자 크기와 곱한 뒤).
const double maxAppTextScale = 2.0;

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

  /// 오류 기록의 화면 이동 발자취(기기 안에만, lib/diag).
  final DiagNavigatorObserver _diagObserver = DiagNavigatorObserver();

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
                    child: MediaQuery(
                      data: scaledForApp(
                        MediaQuery.of(context),
                        settings.appTextScale,
                      ),
                      child: SkinPreviewHost(
                        settings: settings,
                        child: child ?? const SizedBox.shrink(),
                      ),
                    ),
                  ),
              navigatorObservers: [
                _analyticsObserver,
                _skinObserver,
                _diagObserver,
              ],
              home: AuthGate(
                authService: services.auth,
                consentStore: services.consent,
                backendConfigured: services.backendConfigured,
                child: BackupOfferWatcher(
                  service: services.backup,
                  // 예상하지 못한 오류가 나면 실행마다 한 번 「문제가 생겼어요 · 기록 보내기」.
                  child: DiagErrorWatcher(
                    // 첫 실행이면 첫 탭 전에 앱 소개(동의 화면을 마친 뒤).
                    child: AppIntroGate(
                      settings: settings,
                      child: AppShell(settings: settings),
                    ),
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
