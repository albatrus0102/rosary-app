import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import '../ui/home_screen.dart';
import 'settings.dart';

class RosaryApp extends StatelessWidget {
  const RosaryApp(this.settings, {super.key});

  final AppSettings settings;

  static const _seed = Color(0xFF1F3A68);

  @override
  Widget build(BuildContext context) {
    final light = ColorScheme.fromSeed(seedColor: _seed);
    final dark = ColorScheme.fromSeed(
      seedColor: _seed,
      brightness: Brightness.dark,
    );
    return MaterialApp(
      title: '묵주기도',
      debugShowCheckedModeBanner: false,
      themeMode: ThemeMode.system,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: light,
        scaffoldBackgroundColor: const Color(0xFFF5EFE6),
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFFF5EFE6),
          surfaceTintColor: Colors.transparent,
        ),
      ),
      darkTheme: ThemeData(useMaterial3: true, colorScheme: dark),
      locale: const Locale('ko', 'KR'),
      supportedLocales: const [Locale('ko')],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      home: HomeScreen(settings: settings),
    );
  }
}
