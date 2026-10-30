import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../domain/prayer_data.dart';
import '../domain/prayer_mode.dart';
import 'leader_voice.dart';
import 'rosary_style.dart';

/// 기도문 본문 글꼴: 고딕(Pretendard) 또는 명조(Noto Serif KR).
enum PrayerFont { sans, serif }

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
    _leaderAudioEnabled = _prefs.getBool(_kLeaderAudio) ?? true;
    _leaderVoiceSource = _enumByName(
      LeaderVoiceSource.values,
      _prefs.getString(_kLeaderVoiceSource),
      LeaderVoiceSource.tts,
    );
    _ttsRate = (_prefs.getDouble(_kTtsRate) ?? defaultTtsRate).clamp(
      minTtsRate,
      maxTtsRate,
    );
    _prayerFont = _enumByName(
      PrayerFont.values,
      _prefs.getString(_kPrayerFont),
      PrayerFont.sans,
    );
    _showTranscript = _prefs.getBool(_kShowTranscript) ?? false;
    _highSensitivity = _prefs.getBool(_kHighSensitivity) ?? false;
    _chimeVolume = (_prefs.getDouble(_kChimeVolume) ?? defaultChimeVolume)
        .clamp(minChimeVolume, maxChimeVolume);
    _mysterySet = mysterySetForWeekday(DateTime.now().weekday);
  }

  static const _kVoice = 'voice_enabled';
  static const _kChime = 'chime_ten';
  static const _kTick = 'tick_bead';
  static const _kStyle = 'rosary_style';
  static const _kMode = 'prayer_mode';
  static const _kLeaderAudio = 'leader_audio';
  static const _kLeaderVoiceSource = 'leader_voice_source';
  static const _kTtsRate = 'tts_rate';
  static const _kShowTranscript = 'show_transcript';
  static const _kPrayerFont = 'prayer_font';
  static const _kHighSensitivity = 'high_sensitivity';
  static const _kChimeVolume = 'chime_volume';

  static const double minTtsRate = 0.3;
  static const double maxTtsRate = 0.7;
  static const double defaultTtsRate = 0.45;

  static const double minChimeVolume = 0.1;
  static const double maxChimeVolume = 1.0;
  static const double defaultChimeVolume = 0.5;

  final SharedPreferences _prefs;

  late bool _voiceEnabled;
  late bool _chimeOnTenHailMarys;
  late bool _tickPerBead;
  late RosaryStyle _rosaryStyle;
  late PrayerMode _prayerMode;
  late bool _leaderAudioEnabled;
  late LeaderVoiceSource _leaderVoiceSource;
  late double _ttsRate;
  late PrayerFont _prayerFont;
  late bool _showTranscript;
  late bool _highSensitivity;
  late double _chimeVolume;
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

  /// 후창 모드에서 녹음된 선창(앞단) 음성을 재생할지 여부.
  bool get leaderAudioEnabled => _leaderAudioEnabled;

  /// 후창 모드의 선창 소스(기본: AI 음성).
  LeaderVoiceSource get leaderVoiceSource => _leaderVoiceSource;

  /// AI 음성 말하기 속도(0.3~0.7).
  double get ttsRate => _ttsRate;

  /// 기도 화면 본문 글꼴.
  PrayerFont get prayerFont => _prayerFont;

  /// 기도 화면에 음성 인식 진단 패널(인식 내용 등)을 보일지 여부.
  bool get showTranscript => _showTranscript;

  /// 인식 민감도 높임: "아"로만 끝나는 발화도 아멘으로 센다.
  bool get highSensitivity => _highSensitivity;

  /// 종소리/구슬 소리 크기(0.1~1.0).
  double get chimeVolume => _chimeVolume;

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

  set leaderAudioEnabled(bool v) {
    if (v == _leaderAudioEnabled) return;
    _leaderAudioEnabled = v;
    _prefs.setBool(_kLeaderAudio, v);
    notifyListeners();
  }

  set leaderVoiceSource(LeaderVoiceSource v) {
    if (v == _leaderVoiceSource) return;
    _leaderVoiceSource = v;
    _prefs.setString(_kLeaderVoiceSource, v.name);
    notifyListeners();
  }

  set ttsRate(double v) {
    final clamped = v.clamp(minTtsRate, maxTtsRate);
    if (clamped == _ttsRate) return;
    _ttsRate = clamped;
    _prefs.setDouble(_kTtsRate, clamped);
    notifyListeners();
  }

  set prayerFont(PrayerFont v) {
    if (v == _prayerFont) return;
    _prayerFont = v;
    _prefs.setString(_kPrayerFont, v.name);
    notifyListeners();
  }

  set showTranscript(bool v) {
    if (v == _showTranscript) return;
    _showTranscript = v;
    _prefs.setBool(_kShowTranscript, v);
    notifyListeners();
  }

  set highSensitivity(bool v) {
    if (v == _highSensitivity) return;
    _highSensitivity = v;
    _prefs.setBool(_kHighSensitivity, v);
    notifyListeners();
  }

  set chimeVolume(double v) {
    final clamped = v.clamp(minChimeVolume, maxChimeVolume);
    if (clamped == _chimeVolume) return;
    _chimeVolume = clamped;
    _prefs.setDouble(_kChimeVolume, clamped);
    notifyListeners();
  }

  set mysterySet(MysterySet v) {
    if (v == _mysterySet) return;
    _mysterySet = v;
    notifyListeners();
  }
}
