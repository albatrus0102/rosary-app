import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../church/avatar/avatar_config.dart';
import '../church/church_catalog.dart';
import '../church/church_diagnostics.dart';
import '../church/church_resume_state.dart';
import '../domain/prayer_data.dart';
import '../domain/prayer_mode.dart';
import '../domain/prayer_music_tracks.dart';
import '../rosary3d/rosary_model.dart';
import 'leader_voice.dart';
import 'rosary_style.dart';

/// 기도문 본문 글꼴: 고딕(번들 Pretendard, 기본) 또는 기기 시스템 글꼴.
enum PrayerFont { gothic, system }

/// 사이버 성당 3D 화면 품질(저장 키 `church_quality`, 값은 이름).
///
/// [auto] 자동(기본): 높음으로 시작해 느리면 보통 → 간단으로 스스로 낮춘다(해상도는 유지).
/// [high] 높음(그림자·반사·AO·빛 번짐), [mid] 보통(AO·바닥 반사 끔, 빛 번짐 가볍게),
/// [low] 간단(후처리 없음). 예전 저장값 'low'·'high'는 그대로 읽힌다.
enum ChurchQuality { auto, high, mid, low }

/// 성당 3인칭 카메라 거리(저장 키 `church_cam_dist`). 핀치 확대·축소는 이 거리 위에서 곱해진다.
enum ChurchCamDist { near, normal, far }

/// 성당 '기도하기'에서 마지막으로 고른 것(SPEC §32). 저장 키 `churchPrayerChoice`.
///
/// [brief] 잠시 기도하기(제대 앞 고개 숙임), [rosary] 묵주기도 하기(자리에 앉아 묵주기도 카드).
enum ChurchPrayerChoice { brief, rosary }

/// 성당에서 앉아 기도할 때의 자세(SPEC §28.4). 저장 키 `prayerPosture`.
enum PrayerPosture {
  /// 앉아서(기본).
  sit,

  /// 무릎 꿇고(앞줄 무릎틀 위).
  kneel,
}

/// 기도 화면 모양(T-81). [rosary] 손안의 묵주(3D, 새 기본), [classic] 기도문 중심(기존 화면).
enum PrayerView { rosary, classic }

/// 묵주 화면에서 묵주를 둘 위치(엄지 쪽). 가운데가 기본.
enum RosaryHand { center, left, right }

/// 묵주 화면 바탕: 짙은 네이비(기본) · 검정(어두운 집중) · 웜 아이보리.
enum RosaryBackdrop { navy, black, ivory }

/// 묵주 화면의 촉각·소리 알림: 둘 다(기본) · 진동만 · 소리만 · 모두 끔.
enum RosaryFeedback { both, vibrate, sound, off }

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
    // 예전 저장값 'sans'/'serif'(명조는 없어짐)와 알 수 없는 값은 고딕으로 읽는다.
    _prayerFont = _enumByName(
      PrayerFont.values,
      _prefs.getString(_kPrayerFont),
      PrayerFont.gothic,
    );
    _chimeVolume = (_prefs.getDouble(_kChimeVolume) ?? defaultChimeVolume)
        .clamp(minChimeVolume, maxChimeVolume);
    _hapticOnAdvance = _prefs.getBool(_kHaptic) ?? true;
    _useDynamicColor = _prefs.getBool(_kUseDynamicColor) ?? false;
    _volumeKeyAdvance = _prefs.getBool(_kVolumeKeyAdvance) ?? false;
    _prayerTextScale = (_prefs.getDouble(_kTextScale) ?? defaultTextScale)
        .clamp(minTextScale, maxTextScale);
    _shortPrayers = _prefs.getBool(_kShortPrayers) ?? false;
    _shortPrayersAsked = _prefs.getBool(_kShortPrayersAsked) ?? false;
    _prayerBackground = _prefs.getBool(_kPrayerBackground) ?? true;
    _savedPrayer = _readSavedPrayer();
    final storedAvatar = _prefs.getString(_kChurchAvatar);
    _churchAvatar = AvatarConfig.fromJsonString(storedAvatar);
    // 옛 형식(성별별 세례명 인덱스)으로 저장돼 있으면 통합 목록 형식으로 한 번만 옮겨 적는다.
    if (!AvatarConfig.isCurrentFormat(storedAvatar)) {
      _prefs.setString(_kChurchAvatar, _churchAvatar.toJsonString());
    }
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
      ChurchQuality.auto,
    );
    _churchPerfHud = _prefs.getBool(_kChurchPerfHud) ?? false;
    _churchCamAutoZoom = _prefs.getBool(_kChurchCamAutoZoom) ?? true;
    _churchCamDist = _enumByName(
      ChurchCamDist.values,
      _prefs.getString(_kChurchCamDist),
      ChurchCamDist.normal,
    );
    _churchCamFollow = _prefs.getBool(_kChurchCamFollow) ?? true;
    _churchHudCollapsed = _prefs.getBool(_kChurchHudCollapsed) ?? true;
    _churchStickRight = _prefs.getBool(_kChurchStickRight) ?? false;
    ChurchDiagnostics.perfHud.value = _churchPerfHud;
    _prayerPosture = _enumByName(
      PrayerPosture.values,
      _prefs.getString(_kPrayerPosture),
      PrayerPosture.sit,
    );
    _churchPrayerChoice = _enumByName(
      ChurchPrayerChoice.values,
      _prefs.getString(_kChurchPrayerChoice),
      ChurchPrayerChoice.brief,
    );
    _mysterySet = mysterySetForWeekday(DateTime.now().weekday);
    _prayerView = _enumByName(
      PrayerView.values,
      _prefs.getString(_kPrayerView),
      defaultPrayerView,
    );
    // 묵주 목록 통합(2026-11-15): 3D id 가 없고 옛 스타일만 저장돼 있으면 가장 가까운 3D 묵주로 이전한다.
    // 옛 스타일 값(_rosaryStyle)은 그대로 두어 옛 화면·성당 카드의 색이 바뀌지 않는다.
    final storedId = _prefs.getString(_kRosaryId);
    final storedStyle = _prefs.getString(_kStyle);
    if (storedId != null) {
      _rosaryId = storedId;
    } else if (storedStyle != null) {
      _rosaryId = legacyStyleTo3d[_rosaryStyle] ?? 'olive';
      _prefs.setString(_kRosaryId, _rosaryId);
    } else {
      _rosaryId = 'olive';
    }
    if (storedStyle == null) _rosaryStyle = representativeStyleFor(_rosaryId);
    _rosaryFavorites = {...?_prefs.getStringList(_kRosaryFavorites)};
    _rosaryTextExpanded = _prefs.getBool(_kRosaryTextExpanded) ?? false;
    _rosaryHand = _enumByName(
      RosaryHand.values,
      _prefs.getString(_kRosaryHand),
      RosaryHand.center,
    );
    _rosaryBackdrop = _enumByName(
      RosaryBackdrop.values,
      _prefs.getString(_kRosaryBackdrop),
      RosaryBackdrop.navy,
    );
    _rosaryFeedback = _enumByName(
      RosaryFeedback.values,
      _prefs.getString(_kRosaryFeedback),
      RosaryFeedback.both,
    );
    _rosaryVibeStrength = (_prefs.getDouble(_kRosaryVibe) ?? 0.7).clamp(
      0.2,
      1.0,
    );
    _rosaryDecadeOnly = _prefs.getBool(_kRosaryDecadeOnly) ?? false;
    _rosaryVoiceTitle = _prefs.getBool(_kRosaryVoiceTitle) ?? false;
    _prayerMusic = _prefs.getBool(_kPrayerMusic) ?? false;
    _prayerMusicTrack = _prefs.getString(_kPrayerMusicTrack) ?? kMusicShuffle;
    _prayerMusicVolume =
        (_prefs.getDouble(_kPrayerMusicVolume) ?? defaultPrayerMusicVolume)
            .clamp(minPrayerMusicVolume, maxPrayerMusicVolume);
    _prayerMusicInChurch = _prefs.getBool(_kPrayerMusicInChurch) ?? false;
  }

  static const _kPrayerMusic = 'prayer_music';
  static const _kPrayerMusicTrack = 'prayer_music_track';
  static const _kPrayerMusicVolume = 'prayer_music_volume';
  static const _kPrayerMusicInChurch = 'prayer_music_church';

  static const double minPrayerMusicVolume = 0.05;
  static const double maxPrayerMusicVolume = 1.0;
  static const double defaultPrayerMusicVolume = 0.3;

  late bool _prayerMusic;
  late String _prayerMusicTrack;
  late double _prayerMusicVolume;
  late bool _prayerMusicInChurch;

  /// 기도 중 배경 성가(오르간). 기본 꺼짐.
  bool get prayerMusic => _prayerMusic;
  set prayerMusic(bool v) =>
      _setBool(v, _prayerMusic, _kPrayerMusic, () => _prayerMusic = v);

  /// 들을 곡의 id, 또는 [kMusicShuffle](섞어 듣기, 기본).
  String get prayerMusicTrack => _prayerMusicTrack;
  set prayerMusicTrack(String v) {
    if (v == _prayerMusicTrack) return;
    _prayerMusicTrack = v;
    _prefs.setString(_kPrayerMusicTrack, v);
    notifyListeners();
  }

  /// 성가 음량(0.05..1.0). 기본은 낮게.
  double get prayerMusicVolume => _prayerMusicVolume;
  set prayerMusicVolume(double v) {
    final c = v.clamp(minPrayerMusicVolume, maxPrayerMusicVolume).toDouble();
    if (c == _prayerMusicVolume) return;
    _prayerMusicVolume = c;
    _prefs.setDouble(_kPrayerMusicVolume, c);
    notifyListeners();
  }

  /// 성당 안을 걸을 때도 성가를 듣는다(묵주기도 중이 아니어도). 기본 꺼짐.
  bool get prayerMusicInChurch => _prayerMusicInChurch;
  set prayerMusicInChurch(bool v) => _setBool(
    v,
    _prayerMusicInChurch,
    _kPrayerMusicInChurch,
    () => _prayerMusicInChurch = v,
  );

  /// 새 설치의 기도 화면. 앱은 묵주 화면(T-81)이고, 기존 위젯 테스트는 test/flutter_test_config.dart 가
  /// 기도문 중심 화면으로 돌려 그대로 검증한다(새 화면은 test/rosary3d_*_test.dart).
  static PrayerView defaultPrayerView = PrayerView.rosary;

  static const _kPrayerView = 'prayer_view';
  static const _kRosaryId = 'rosary3d_id';
  static const _kRosaryFavorites = 'rosary3d_favorites';
  static const _kRosaryTextExpanded = 'rosary3d_text_expanded';
  static const _kRosaryHand = 'rosary3d_hand';
  static const _kRosaryBackdrop = 'rosary3d_backdrop';
  static const _kRosaryFeedback = 'rosary3d_feedback';
  static const _kRosaryVibe = 'rosary3d_vibe';
  static const _kRosaryDecadeOnly = 'rosary3d_decade_only';
  static const _kRosaryVoiceTitle = 'rosary3d_voice_title';

  late PrayerView _prayerView;
  late String _rosaryId;
  late Set<String> _rosaryFavorites;
  late bool _rosaryTextExpanded;
  late RosaryHand _rosaryHand;
  late RosaryBackdrop _rosaryBackdrop;
  late RosaryFeedback _rosaryFeedback;
  late double _rosaryVibeStrength;
  late bool _rosaryDecadeOnly;
  late bool _rosaryVoiceTitle;

  /// 기도 화면 모양(묵주 | 기도문 중심).
  PrayerView get prayerView => _prayerView;
  set prayerView(PrayerView v) =>
      _setEnum(v, _prayerView, _kPrayerView, () => _prayerView = v);

  /// 쓰는 3D 묵주 id(assets/rosary3d/defs.js). 갤러리·기도 화면·전체 보기가 같은 묵주를 쓴다.
  String get rosaryId => _rosaryId;
  set rosaryId(String v) {
    if (v == _rosaryId) return;
    _rosaryId = v;
    _prefs.setString(_kRosaryId, v);
    // 그림·색을 쓰는 옛 화면도 같은 묵주의 대표 스타일을 따른다.
    _rosaryStyle = representativeStyleFor(v);
    _prefs.setString(_kStyle, _rosaryStyle.name);
    notifyListeners();
  }

  Set<String> get rosaryFavorites => Set.unmodifiable(_rosaryFavorites);
  void toggleRosaryFavorite(String id) {
    if (!_rosaryFavorites.remove(id)) _rosaryFavorites.add(id);
    _prefs.setStringList(_kRosaryFavorites, _rosaryFavorites.toList()..sort());
    notifyListeners();
  }

  /// 묵주 화면에서 기도문을 펼쳐 두었는지(다음에도 그대로). 입문자는 켜 두면 '항상 표시'.
  bool get rosaryTextExpanded => _rosaryTextExpanded;
  set rosaryTextExpanded(bool v) => _setBool(
    v,
    _rosaryTextExpanded,
    _kRosaryTextExpanded,
    () => _rosaryTextExpanded = v,
  );

  RosaryHand get rosaryHand => _rosaryHand;
  set rosaryHand(RosaryHand v) =>
      _setEnum(v, _rosaryHand, _kRosaryHand, () => _rosaryHand = v);

  RosaryBackdrop get rosaryBackdrop => _rosaryBackdrop;
  set rosaryBackdrop(RosaryBackdrop v) =>
      _setEnum(v, _rosaryBackdrop, _kRosaryBackdrop, () => _rosaryBackdrop = v);

  RosaryFeedback get rosaryFeedback => _rosaryFeedback;
  set rosaryFeedback(RosaryFeedback v) =>
      _setEnum(v, _rosaryFeedback, _kRosaryFeedback, () => _rosaryFeedback = v);

  /// 진동 세기(0.2..1.0).
  double get rosaryVibeStrength => _rosaryVibeStrength;
  set rosaryVibeStrength(double v) {
    final c = v.clamp(0.2, 1.0).toDouble();
    if (c == _rosaryVibeStrength) return;
    _rosaryVibeStrength = c;
    _prefs.setDouble(_kRosaryVibe, c);
    notifyListeners();
  }

  /// 성모송 10번 완료(단의 끝) 알림만 받기.
  bool get rosaryDecadeOnly => _rosaryDecadeOnly;
  set rosaryDecadeOnly(bool v) => _setBool(
    v,
    _rosaryDecadeOnly,
    _kRosaryDecadeOnly,
    () => _rosaryDecadeOnly = v,
  );

  /// 음성 제목 안내('성모송 열 번째입니다' 등, 기기 음성).
  bool get rosaryVoiceTitle => _rosaryVoiceTitle;
  set rosaryVoiceTitle(bool v) => _setBool(
    v,
    _rosaryVoiceTitle,
    _kRosaryVoiceTitle,
    () => _rosaryVoiceTitle = v,
  );

  void _setBool(bool v, bool old, String key, void Function() assign) {
    if (v == old) return;
    assign();
    _prefs.setBool(key, v);
    notifyListeners();
  }

  void _setEnum<E extends Enum>(
    E v,
    E old,
    String key,
    void Function() assign,
  ) {
    if (v == old) return;
    assign();
    _prefs.setString(key, v.name);
    notifyListeners();
  }

  static const _kChime = 'chime_ten';
  static const _kTick = 'tick_bead';
  static const _kStyle = 'rosary_style';
  static const _kMode = 'prayer_mode';
  static const _kLeaderAudio = 'leader_audio';
  static const _kLeaderVoiceSource = 'leader_voice_source';
  static const _kLeaderPersona = 'leader_persona';
  static const _kTtsRate = 'tts_rate';
  static const _kPrayerFont = 'prayer_font';
  static const _kChimeVolume = 'chime_volume';
  static const _kHaptic = 'haptic';
  static const _kUseDynamicColor = 'use_dynamic_color';
  static const _kVolumeKeyAdvance = 'volume_key_advance';
  static const _kTextScale = 'prayer_text_scale';
  static const _kShortPrayers = 'short_prayers';
  static const _kShortPrayersAsked = 'short_prayers_asked';
  static const _kPrayerBackground = 'prayer_background';
  static const _kResumeSet = 'resume_set';
  static const _kResumeIndex = 'resume_index';
  static const _kResumeAt = 'resume_at';
  static const _kChurchAvatar = 'church_avatar';
  static const _kChurchAvatarChosen = 'church_avatar_chosen';
  static const _kChurchAmbient = 'church_ambient';
  static const _kChurchQuality = 'church_quality';
  static const _kChurchPerfHud = 'church_perf_hud';
  static const _kChurchCamAutoZoom = 'church_cam_auto_zoom';
  static const _kChurchCamDist = 'church_cam_dist';
  static const _kChurchCamFollow = 'church_cam_follow';
  static const _kChurchHudCollapsed = 'church_hud_collapsed';
  static const _kChurchStickRight = 'church_stick_right';
  static const _kPrayerPosture = 'prayerPosture';
  static const _kChurchPrayerChoice = 'churchPrayerChoice';
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
  late bool _prayerBackground;
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
  late PrayerFont _prayerFont;
  late double _chimeVolume;
  late MysterySet _mysterySet;
  late AvatarConfig _churchAvatar;
  late bool _churchAvatarChosen;
  late bool _churchAmbient;
  late ChurchQuality _churchQuality;
  late bool _churchPerfHud;
  late bool _churchCamAutoZoom;
  late ChurchCamDist _churchCamDist;
  late bool _churchCamFollow;
  late bool _churchHudCollapsed;
  late bool _churchStickRight;
  late PrayerPosture _prayerPosture;
  late ChurchPrayerChoice _churchPrayerChoice;
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

  /// 기도 화면 본문 글꼴.
  PrayerFont get prayerFont => _prayerFont;

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

  /// 옛 스타일로 고르면(이전 호환) 매핑된 3D 묵주도 함께 바뀐다.
  set rosaryStyle(RosaryStyle v) {
    if (v == _rosaryStyle) return;
    _rosaryStyle = v;
    _prefs.setString(_kStyle, v.name);
    _rosaryId = legacyStyleTo3d[v] ?? _rosaryId;
    _prefs.setString(_kRosaryId, _rosaryId);
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

  set prayerFont(PrayerFont v) {
    if (v == _prayerFont) return;
    _prayerFont = v;
    _prefs.setString(_kPrayerFont, v.name);
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

  /// '기도 배경 그림'(기본 켜짐): 기도 화면 뒤에 그 단의 성화를 낮은 대비로 깐다(`prayer_background.dart`).
  bool get prayerBackground => _prayerBackground;

  set prayerBackground(bool v) {
    if (v == _prayerBackground) return;
    _prayerBackground = v;
    _prefs.setBool(_kPrayerBackground, v);
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

  /// 기기 배경화면 색(Material You 동적 색상)을 쓸지 여부. 기본은 끔(앱 고유 상아색·갈색·금색).
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

  /// 카메라 '자동 줌(벽 피하기)': 켜면 벽·천장 앞에서만 부드럽게 당긴다(기둥은 비침). 끄면 거리를 바꾸지 않고 사이 벽을 비춘다.
  bool get churchCamAutoZoom => _churchCamAutoZoom;

  /// 카메라 거리(가까이/보통/멀리).
  ChurchCamDist get churchCamDist => _churchCamDist;

  /// 걸을 때 카메라가 천천히 뒤로 정렬되는지. 끄면 사용자가 돌린 방향을 유지한다.
  bool get churchCamFollow => _churchCamFollow;

  /// 웹(three.js) 카메라 설정 인자(`setCamera`, init 의 `camera`).
  Map<String, Object> get churchCameraArgs => {
    'autoZoom': _churchCamAutoZoom,
    'dist': _churchCamDist.name,
    'follow': _churchCamFollow,
  };

  /// 성당 성능 표시(진단: fps·프레임 ms·해상도·화질 단계). 기본 꺼짐.
  bool get churchPerfHud => _churchPerfHud;

  /// 성당 안에서 마지막으로 있던 자리(성당 화면이 보이지 않게 될 때 저장된다). 없거나 깨졌으면 null.
  /// 앱이 백그라운드에서 정리된 뒤 다시 열렸을 때 같은 성당으로 바로 들어가는 데 쓴다.
  ChurchResumeState? get churchResume =>
      ChurchResumeState.decode(_prefs.getString(ChurchResumeState.prefsKey));

  /// 성당 화면 위쪽 메뉴(이름판·도구 줄)를 접어 두었는가. 접으면 이름 한 줄과 작은 단추만 남는다.
  bool get churchHudCollapsed => _churchHudCollapsed;

  set churchHudCollapsed(bool v) {
    if (v == _churchHudCollapsed) return;
    _churchHudCollapsed = v;
    _prefs.setBool(_kChurchHudCollapsed, v);
    notifyListeners();
  }

  /// 성당의 이동 손잡이(조이스틱)를 오른쪽 아래에 두는가(왼손으로 시점을 돌리는 분). 기본은 왼쪽.
  bool get churchStickRight => _churchStickRight;

  set churchStickRight(bool v) {
    if (v == _churchStickRight) return;
    _churchStickRight = v;
    _prefs.setBool(_kChurchStickRight, v);
    notifyListeners();
  }

  set churchPerfHud(bool v) {
    if (v == _churchPerfHud) return;
    _churchPerfHud = v;
    ChurchDiagnostics.perfHud.value = v;
    _prefs.setBool(_kChurchPerfHud, v);
    notifyListeners();
  }

  /// 성당에서 앉아 기도할 때의 자세(앉아서 | 무릎 꿇고).
  PrayerPosture get prayerPosture => _prayerPosture;

  set prayerPosture(PrayerPosture v) {
    if (v == _prayerPosture) return;
    _prayerPosture = v;
    _prefs.setString(_kPrayerPosture, v.name);
    notifyListeners();
  }

  /// 성당 '기도하기' 시트에서 마지막으로 고른 것(다음에 그 항목을 강조한다). 기본은 잠시 기도하기.
  ChurchPrayerChoice get churchPrayerChoice => _churchPrayerChoice;

  set churchPrayerChoice(ChurchPrayerChoice v) {
    if (v == _churchPrayerChoice) return;
    _churchPrayerChoice = v;
    _prefs.setString(_kChurchPrayerChoice, v.name);
    notifyListeners();
  }

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

  set churchCamAutoZoom(bool v) {
    if (v == _churchCamAutoZoom) return;
    _churchCamAutoZoom = v;
    _prefs.setBool(_kChurchCamAutoZoom, v);
    notifyListeners();
  }

  set churchCamDist(ChurchCamDist v) {
    if (v == _churchCamDist) return;
    _churchCamDist = v;
    _prefs.setString(_kChurchCamDist, v.name);
    notifyListeners();
  }

  set churchCamFollow(bool v) {
    if (v == _churchCamFollow) return;
    _churchCamFollow = v;
    _prefs.setBool(_kChurchCamFollow, v);
    notifyListeners();
  }

  set churchQuality(ChurchQuality v) {
    if (v == _churchQuality) return;
    _churchQuality = v;
    _prefs.setString(_kChurchQuality, v.name);
    notifyListeners();
  }
}
