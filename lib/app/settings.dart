import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../domain/prayer_data.dart';
import '../domain/prayer_mode.dart';
import 'rosary_style.dart';

/// 앱 설정. `shared_preferences`에 저장된다(신비 선택은 제외).
class AppSettings extends ChangeNotifier {
  AppSettings._(this._prefs) {
    _voiceEnabled = _prefs.getBool(_kVoice) ?? true;
    _chimeOnTenHailMarys = _prefs.getBool(_kChime) ?? true;
    _tickPerBead = _prefs.getBool(_kTick) ?? false;
    _rosaryStyle = _enumByName(
      RosaryStyle.values,
      _prefs.getString(_kStyle),
      RosaryStyle.bead,
    );
    _prayerMode = _enumByName(
      PrayerMode.values,
      _prefs.getString(_kMode),
      PrayerMode.solo,
    );
    _mysterySet = mysterySetForWeekday(DateTime.now().weekday);
  }

  static const _kVoice = 'voice_enabled';
  static const _kChime = 'chime_ten';
  static const _kTick = 'tick_bead';
  static const _kStyle = 'rosary_style';
  static const _kMode = 'prayer_mode';

  final SharedPreferences _prefs;

  late bool _voiceEnabled;
  late bool _chimeOnTenHailMarys;
  late bool _tickPerBead;
  late RosaryStyle _rosaryStyle;
  late PrayerMode _prayerMode;
  late MysterySet _mysterySet;

  static Future<AppSettings> load() async {
    final prefs = await SharedPreferences.getInstance();
    return AppSettings._(prefs);
  }

  static T _enumByName<T extends Enum>(
    List<T> values,
    String? name,
    T fallback,
  ) {
    for (final v in values) {
      if (v.name == name) return v;
    }
    return fallback;
  }

  bool get voiceEnabled => _voiceEnabled;
  bool get chimeOnTenHailMarys => _chimeOnTenHailMarys;
  bool get tickPerBead => _tickPerBead;
  RosaryStyle get rosaryStyle => _rosaryStyle;
  PrayerMode get prayerMode => _prayerMode;

  /// 이번 세션에서 선택한 신비(저장하지 않음).
  MysterySet get mysterySet => _mysterySet;

  set voiceEnabled(bool v) {
    if (v == _voiceEnabled) return;
    _voiceEnabled = v;
    _prefs.setBool(_kVoice, v);
    notifyListeners();
  }

  set chimeOnTenHailMarys(bool v) {
    if (v == _chimeOnTenHailMarys) return;
    _chimeOnTenHailMarys = v;
    _prefs.setBool(_kChime, v);
    notifyListeners();
  }

  set tickPerBead(bool v) {
    if (v == _tickPerBead) return;
    _tickPerBead = v;
    _prefs.setBool(_kTick, v);
    notifyListeners();
  }

  set rosaryStyle(RosaryStyle v) {
    if (v == _rosaryStyle) return;
    _rosaryStyle = v;
    _prefs.setString(_kStyle, v.name);
    notifyListeners();
  }

  set prayerMode(PrayerMode v) {
    if (v == _prayerMode) return;
    _prayerMode = v;
    _prefs.setString(_kMode, v.name);
    notifyListeners();
  }

  set mysterySet(MysterySet v) {
    if (v == _mysterySet) return;
    _mysterySet = v;
    notifyListeners();
  }
}
