import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../church/avatar/avatar_config.dart';
import '../church/church_catalog.dart';
import '../domain/prayer_data.dart';
import '../domain/prayer_mode.dart';
import 'leader_voice.dart';
import 'rosary_style.dart';

/// 사이버 성당 3D 화면 품질.
enum ChurchQuality { low, high }

/// 이어서 기도하기를 위해 저장해 두는 진행 상태.
class SavedPrayer {
  const SavedPrayer({
    required this.mysterySet,
    required this.stepIndex,
    required this.savedAt,
  });

  final MysterySet mysterySet;

  /// `buildRosarySequence(mysterySet)`의 스텝 인덱스.
  final int stepIndex;
  final DateTime savedAt;
}

/// 앱 설정. `shared_preferences`에 저장된다(신비 선택은 제외).
class AppSettings extends ChangeNotifier {
  AppSettings._(this._prefs) {
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
      LeaderVoiceSource.bundled,
    );
    _leaderPersona = _enumByName(
      LeaderVoicePersona.values,
      _prefs.getString(_kLeaderPersona),
      LeaderVoicePersona.sister,
    );
    _ttsRate = (_prefs.getDouble(_kTtsRate) ?? defaultTtsRate).clamp(
      minTtsRate,
      maxTtsRate,
    );
    // 글꼴 선택(고딕/명조)은 없어졌다(시스템 글꼴만 쓴다). 이전 설치가 남긴 값은 지운다.
    if (_prefs.containsKey(_kLegacyPrayerFont)) {
      _prefs.remove(_kLegacyPrayerFont);
    }
    _chimeVolume = (_prefs.getDouble(_kChimeVolume) ?? defaultChimeVolume)
        .clamp(minChimeVolume, maxChimeVolume);
    _hapticOnAdvance = _prefs.getBool(_kHaptic) ?? true;
    _useDynamicColor = _prefs.getBool(_kUseDynamicColor) ?? false;
    _volumeKeyAdvance = _prefs.getBool(_kVolumeKeyAdvance) ?? false;
    _prayerTextScale = (_prefs.getDouble(_kTextScale) ?? defaultTextScale)
        .clamp(minTextScale, maxTextScale);
    _shortPrayers = _prefs.getBool(_kShortPrayers) ?? false;
    _shortPrayersAsked = _prefs.getBool(_kShortPrayersAsked) ?? false;
    _savedPrayer = _readSavedPrayer();
    _churchAvatar = AvatarConfig.fromJsonString(
      _prefs.getString(_kChurchAvatar),
    );
    _churchAvatarChosen = _prefs.getBool(_kChurchAvatarChosen) ?? false;
    _churchAmbient = _prefs.getBool(_kChurchAmbient) ?? true;
    _churchId = ChurchCatalog.resolve(_prefs.getString(_kChurchId)).id;
    _churchFavorites = {
      for (final id
          in _prefs.getStringList(_kChurchFavorites) ?? const <String>[])
        if (ChurchCatalog.byId.containsKey(id)) id,
    };
    _churchQuality = _enumByName(
      ChurchQuality.values,
      _prefs.getString(_kChurchQuality),
      ChurchQuality.high,
    );
    _mysterySet = mysterySetForWeekday(DateTime.now().weekday);
  }

  static const _kChime = 'chime_ten';
  static const _kTick = 'tick_bead';
  static const _kStyle = 'rosary_style';
  static const _kMode = 'prayer_mode';
  static const _kLeaderAudio = 'leader_audio';
  static const _kLeaderVoiceSource = 'leader_voice_source';
  static const _kLeaderPersona = 'leader_persona';
  static const _kTtsRate = 'tts_rate';
  static const _kLegacyPrayerFont = 'prayer_font';
  static const _kChimeVolume = 'chime_volume';
  static const _kHaptic = 'haptic';
  static const _kUseDynamicColor = 'use_dynamic_color';
  static const _kVolumeKeyAdvance = 'volume_key_advance';
  static const _kTextScale = 'prayer_text_scale';
  static const _kShortPrayers = 'short_prayers';
  static const _kShortPrayersAsked = 'short_prayers_asked';
  static const _kResumeSet = 'resume_set';
  static const _kResumeIndex = 'resume_index';
  static const _kResumeAt = 'resume_at';
  static const _kChurchAvatar = 'church_avatar';
  static const _kChurchAvatarChosen = 'church_avatar_chosen';
  static const _kChurchAmbient = 'church_ambient';
  static const _kChurchQuality = 'church_quality';
  static const _kChurchId = 'church_id';
  static const _kChurchFavorites = 'church_favorites';

  /// 기도문 글자 크기 배율(1.0이 기본 24sp).
  static const double minTextScale = 0.85;
  static const double maxTextScale = 2.0;
  static const double defaultTextScale = 1.0;

  static const double minTtsRate = 0.3;
  static const double maxTtsRate = 0.7;
  static const double defaultTtsRate = 0.45;

  static const double minChimeVolume = 0.1;
  static const double maxChimeVolume = 1.0;
  static const double defaultChimeVolume = 0.5;

  final SharedPreferences _prefs;

  late bool _hapticOnAdvance;
  late bool _useDynamicColor;
  late bool _volumeKeyAdvance;
  late double _prayerTextScale;
  late bool _shortPrayers;
  late bool _shortPrayersAsked;
  SavedPrayer? _savedPrayer;

  SavedPrayer? _readSavedPrayer() {
    final set = _prefs.getString(_kResumeSet);
    final index = _prefs.getInt(_kResumeIndex);
    final at = _prefs.getInt(_kResumeAt);
    if (set == null || index == null || at == null) return null;
    final match = MysterySet.values.where((m) => m.name == set);
    if (match.isEmpty) return null;
    return SavedPrayer(
      mysterySet: match.first,
      stepIndex: index,
      savedAt: DateTime.fromMillisecondsSinceEpoch(at),
    );
  }

  late bool _chimeOnTenHailMarys;
  late bool _tickPerBead;
  late RosaryStyle _rosaryStyle;
  late PrayerMode _prayerMode;
  late bool _leaderAudioEnabled;
  late LeaderVoiceSource _leaderVoiceSource;
  late LeaderVoicePersona _leaderPersona;
  late double _ttsRate;
  late double _chimeVolume;
  late MysterySet _mysterySet;
  late AvatarConfig _churchAvatar;
  late bool _churchAvatarChosen;
  late bool _churchAmbient;
  late ChurchQuality _churchQuality;
  late String _churchId;
  late Set<String> _churchFavorites;

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

  bool get chimeOnTenHailMarys => _chimeOnTenHailMarys;
  bool get tickPerBead => _tickPerBead;
  RosaryStyle get rosaryStyle => _rosaryStyle;
  PrayerMode get prayerMode => _prayerMode;

  /// 후창 모드에서 녹음된 선창(앞단) 음성을 재생할지 여부.
  bool get leaderAudioEnabled => _leaderAudioEnabled;

  /// 후창 모드의 선창 소스(기본: 자연스러운 음성).
  LeaderVoiceSource get leaderVoiceSource => _leaderVoiceSource;

  /// 'AI 음성(고품질)'의 화자(기본: 여성 목소리).
  LeaderVoicePersona get leaderPersona => _leaderPersona;

  /// 기기 음성 말하기 속도(0.3~0.7).
  double get ttsRate => _ttsRate;

  /// 종소리/구슬 소리 크기(0.1~1.0).
  double get chimeVolume => _chimeVolume;

  /// 이번 세션에서 선택한 신비(저장하지 않음).
  MysterySet get mysterySet => _mysterySet;

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

  set leaderPersona(LeaderVoicePersona v) {
    if (v == _leaderPersona) return;
    _leaderPersona = v;
    _prefs.setString(_kLeaderPersona, v.name);
    notifyListeners();
  }

  set ttsRate(double v) {
    final clamped = v.clamp(minTtsRate, maxTtsRate);
    if (clamped == _ttsRate) return;
    _ttsRate = clamped;
    _prefs.setDouble(_kTtsRate, clamped);
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

  /// 다음으로 넘어갈 때 가볍게 진동한다.
  bool get hapticOnAdvance => _hapticOnAdvance;

  /// 기도문 글자 크기 배율 (minTextScale..maxTextScale).
  double get prayerTextScale => _prayerTextScale;

  /// '외운 기도 짧게 보기'(기본 꺼짐). 켜면 반복되는 기도(성모송 등)를 첫머리만 보여 준다.
  /// 성호경·사도신경·신비 안내·영광송은 늘 전문이다(`prayer_text_short.dart`).
  bool get shortPrayers => _shortPrayers;

  /// '짧게 보기'를 권하는 안내에 사용자가 이미 답했는지(켜기/그대로, 또는 직접 설정).
  bool get shortPrayersAsked => _shortPrayersAsked;

  /// 사용자가 직접 바꾸면 이미 답한 것으로 보고 더는 권하지 않는다.
  set shortPrayers(bool v) {
    if (v == _shortPrayers && _shortPrayersAsked) return;
    _shortPrayers = v;
    _shortPrayersAsked = true;
    _prefs.setBool(_kShortPrayers, v);
    _prefs.setBool(_kShortPrayersAsked, true);
    notifyListeners();
  }

  /// 권유 안내를 한 번 보여 줬음을 기록한다(어느 쪽으로 답하든 다시 묻지 않는다).
  void markShortPrayersAsked() {
    if (_shortPrayersAsked) return;
    _shortPrayersAsked = true;
    _prefs.setBool(_kShortPrayersAsked, true);
    notifyListeners();
  }

  /// 중단한 기도가 있으면 그 상태, 없으면 null.
  SavedPrayer? get savedPrayer => _savedPrayer;

  /// 기기 배경화면 색(Material You 동적 색상)을 쓸지 여부. 기본은 끔(앱 고유 테라코타).
  bool get useDynamicColor => _useDynamicColor;

  /// 기도 화면에서 볼륨 키(↑ 다음, ↓ 이전)로 넘기기(P-02). 기본은 끔.
  bool get volumeKeyAdvance => _volumeKeyAdvance;

  set volumeKeyAdvance(bool v) {
    if (v == _volumeKeyAdvance) return;
    _volumeKeyAdvance = v;
    _prefs.setBool(_kVolumeKeyAdvance, v);
    notifyListeners();
  }

  set useDynamicColor(bool v) {
    if (v == _useDynamicColor) return;
    _useDynamicColor = v;
    _prefs.setBool(_kUseDynamicColor, v);
    notifyListeners();
  }

  set hapticOnAdvance(bool v) {
    if (v == _hapticOnAdvance) return;
    _hapticOnAdvance = v;
    _prefs.setBool(_kHaptic, v);
    notifyListeners();
  }

  set prayerTextScale(double v) {
    final clamped = v.clamp(minTextScale, maxTextScale);
    if (clamped == _prayerTextScale) return;
    _prayerTextScale = clamped;
    _prefs.setDouble(_kTextScale, clamped);
    notifyListeners();
  }

  /// 기도 중 위치를 저장한다(이어서 기도하기). 화면을 다시 그리지 않도록 알림은 보내지 않는다.
  void saveProgress(MysterySet set, int stepIndex) {
    _savedPrayer = SavedPrayer(
      mysterySet: set,
      stepIndex: stepIndex,
      savedAt: DateTime.now(),
    );
    _prefs.setString(_kResumeSet, set.name);
    _prefs.setInt(_kResumeIndex, stepIndex);
    _prefs.setInt(_kResumeAt, _savedPrayer!.savedAt.millisecondsSinceEpoch);
  }

  /// 저장된 진행 상태를 지운다(기도를 마쳤거나 처음부터 다시 할 때).
  void clearProgress() {
    if (_savedPrayer == null) return;
    _savedPrayer = null;
    _prefs.remove(_kResumeSet);
    _prefs.remove(_kResumeIndex);
    _prefs.remove(_kResumeAt);
    notifyListeners();
  }

  /// 사이버 성당 내 아바타.
  AvatarConfig get churchAvatar => _churchAvatar;

  /// 아바타 편집기에서 한 번이라도 저장했는지.
  bool get churchAvatarChosen => _churchAvatarChosen;

  /// 성당 배경음(환경음) 켜기.
  bool get churchAmbient => _churchAmbient;

  /// 성당 3D 화면 품질.
  ChurchQuality get churchQuality => _churchQuality;

  /// 마지막으로 고른 성당 id(카탈로그에 없으면 'basic').
  String get churchId => _churchId;

  /// 즐겨찾기한 성당 id들.
  Set<String> get churchFavorites => Set.unmodifiable(_churchFavorites);

  bool isChurchFavorite(String id) => _churchFavorites.contains(id);

  /// 즐겨찾기를 켜고 끈다.
  void toggleChurchFavorite(String id) {
    if (!ChurchCatalog.byId.containsKey(id)) return;
    if (!_churchFavorites.remove(id)) _churchFavorites.add(id);
    _prefs.setStringList(_kChurchFavorites, _churchFavorites.toList()..sort());
    notifyListeners();
  }

  set churchId(String v) {
    final id = ChurchCatalog.resolve(v).id;
    if (id == _churchId) return;
    _churchId = id;
    _prefs.setString(_kChurchId, id);
    notifyListeners();
  }

  set churchAvatar(AvatarConfig v) {
    if (v == _churchAvatar) return;
    _churchAvatar = v;
    _prefs.setString(_kChurchAvatar, v.toJsonString());
    notifyListeners();
  }

  set churchAvatarChosen(bool v) {
    if (v == _churchAvatarChosen) return;
    _churchAvatarChosen = v;
    _prefs.setBool(_kChurchAvatarChosen, v);
    notifyListeners();
  }

  set churchAmbient(bool v) {
    if (v == _churchAmbient) return;
    _churchAmbient = v;
    _prefs.setBool(_kChurchAmbient, v);
    notifyListeners();
  }

  set churchQuality(ChurchQuality v) {
    if (v == _churchQuality) return;
    _churchQuality = v;
    _prefs.setString(_kChurchQuality, v.name);
    notifyListeners();
  }
}
