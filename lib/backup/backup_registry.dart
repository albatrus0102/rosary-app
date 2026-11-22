/// 백업 등록부: 이 앱이 `SharedPreferences`에 쓰는 **모든** 키를 한 곳에서 분류한다.
///
/// 키마다 「백업에 싣는가(backup)·전용 구역으로 싣는가(records)·빼는가(exclude)」와 그 이유를
/// 적는다(독서공방 plainDB 원칙: 토큰·비밀·기기 고유 값은 백업 파일 밖). 새 키를 쓰는 코드를
/// 더하면 `test/backup_registry_test.dart`가 소스를 훑어 **분류되지 않은 키를 찾아 실패한다** —
/// 이 표에 한 줄 더하는 것이 그 키를 백업에 태우는 유일한 길이다.
///
/// 실행 중에는 표에 없는 키도 비밀처럼 보이지 않으면 백업에 싣는다([shouldExport]) — 등록을
/// 잊어도 사용자 값이 조용히 빠지지 않게 하는 안전망이다(시험이 먼저 잡는 것이 원칙).
library;

/// 키가 백업에서 맡는 역할.
enum PrefRole {
  /// 백업 파일의 `data.prefs`에 값 그대로 싣고, 가져오면 그 값으로 바꾼다(설정).
  backup,

  /// 전용 구역으로 싣는다(기도 기록 → `data.prayerRecords`, 중복 없이 합친다).
  records,

  /// 싣지 않는다. [PrefSpec.why]에 이유가 있다.
  exclude,
}

/// 저장된 값의 모양. 가져올 때 이 모양이 아니면 그 키만 건너뛴다(앱이 읽다 던지지 않게).
enum PrefType { boolean, integer, decimal, text, textList }

/// 키(또는 접두사) 하나의 분류.
class PrefSpec {
  const PrefSpec(
    this.key,
    this.role,
    this.why, {
    this.type,
    this.prefix = false,
    this.label,
  });

  /// 키 이름. [prefix]이면 이 문자열로 시작하는 모든 키.
  final String key;
  final PrefRole role;

  /// 왜 이렇게 분류했는가(사람이 읽는 한 줄).
  final String why;

  /// [PrefRole.backup] 키의 값 모양(필수).
  final PrefType? type;
  final bool prefix;

  /// 가져오기 미리보기에서 보일 이름(없으면 '기타 설정'으로 묶는다).
  final String? label;

  bool matches(String k) => prefix ? k.startsWith(key) : k == key;
}

const _b = PrefRole.backup;
const _x = PrefRole.exclude;
const _bool = PrefType.boolean;
const _int = PrefType.integer;
const _dbl = PrefType.decimal;
const _str = PrefType.text;
const _list = PrefType.textList;

abstract final class BackupRegistry {
  /// 기도 기록 저장 키(PrayerStatsStore.prefsKey와 같은 값).
  static const String prayerRecordsKey = 'prayer_stats_v1';

  /// 백업 기능 자신의 상태(자동 백업 폴더 사용 여부·마지막 백업 시각·안내 닫은 시각·금고 표식).
  /// 기기마다 다른 것이라 백업 파일에 싣지 않는다.
  static const String internalPrefix = 'backup.';

  /// 사용자가 **일부러** 기록을 줄였다는 표식(밀리초). 기록 지우기·계정 전환·계정 삭제가
  /// `PrayerStatsStore.clear()` 한 곳에서 적는다 — 금고가 그 줄어듦을 사고로 보지 않게.
  static const String intentDropKey = '${internalPrefix}vault.intent_drop_at';

  static const List<PrefSpec> specs = [
    // ---- 기도 기록 ---------------------------------------------------------
    PrefSpec(
      prayerRecordsKey,
      PrefRole.records,
      '기도 기록. data.prayerRecords 구역으로 싣고 id로 중복 없이 합친다',
    ),

    // ---- 소리·진동 ---------------------------------------------------------
    PrefSpec('chime_ten', _b, '설정: 10번째 종소리', type: _bool, label: '종소리'),
    PrefSpec('tick_bead', _b, '설정: 구슬 소리', type: _bool, label: '구슬 소리'),
    PrefSpec('chime_volume', _b, '설정: 신호음 크기', type: _dbl, label: '신호음 크기'),
    PrefSpec('haptic', _b, '설정: 넘길 때 진동', type: _bool, label: '진동'),
    PrefSpec(
      'volume_key_advance',
      _b,
      '설정: 볼륨 키로 넘기기',
      type: _bool,
      label: '볼륨 키로 넘기기',
    ),

    // ---- 기도 화면 ---------------------------------------------------------
    PrefSpec('rosary_style', _b, '설정: 옛 묵주 스타일', type: _str, label: '묵주'),
    PrefSpec('prayer_mode', _b, '설정: 혼자/후창 모드', type: _str, label: '기도 방식'),
    PrefSpec('prayer_font', _b, '설정: 기도문 글꼴', type: _str, label: '글꼴'),
    PrefSpec(
      'prayer_text_scale',
      _b,
      '설정: 기도문 글자 크기',
      type: _dbl,
      label: '글자 크기',
    ),
    PrefSpec('short_prayers', _b, '설정: 외운 기도 짧게', type: _bool, label: '짧게 보기'),
    PrefSpec('short_prayers_asked', _b, '안내에 이미 답함(다시 묻지 않기)', type: _bool),
    PrefSpec(
      'prayer_background',
      _b,
      '설정: 기도 배경 그림',
      type: _bool,
      label: '배경 그림',
    ),
    PrefSpec(
      'use_dynamic_color',
      _b,
      '설정: 기기 배경 색 쓰기',
      type: _bool,
      label: '화면 색',
    ),
    PrefSpec('prayer_view', _b, '설정: 기도 화면 모양', type: _str, label: '기도 화면'),

    // ---- 3D 묵주 -----------------------------------------------------------
    PrefSpec('rosary3d_id', _b, '고른 3D 묵주', type: _str, label: '묵주'),
    PrefSpec(
      'rosary3d_favorites',
      _b,
      '즐겨찾는 묵주',
      type: _list,
      label: '즐겨찾는 묵주',
    ),
    PrefSpec('rosary3d_text_expanded', _b, '묵주 화면 기도문 펼침', type: _bool),
    PrefSpec('rosary3d_hand', _b, '묵주 위치', type: _str, label: '묵주 위치'),
    PrefSpec('rosary3d_backdrop', _b, '묵주 화면 바탕', type: _str, label: '묵주 바탕'),
    PrefSpec(
      'rosary3d_feedback',
      _b,
      '묵주 화면 알림 방식',
      type: _str,
      label: '묵주 알림',
    ),
    PrefSpec('rosary3d_vibe', _b, '진동 세기', type: _dbl, label: '진동 세기'),
    PrefSpec('rosary3d_decade_only', _b, '단 끝에만 알림', type: _bool),
    PrefSpec('rosary3d_voice_title', _b, '음성 제목 안내', type: _bool),

    // ---- 상대 목소리 -------------------------------------------------------
    PrefSpec('leader_audio', _b, '설정: 선창 음성 재생', type: _bool, label: '상대 목소리'),
    PrefSpec(
      'leader_voice_source',
      _b,
      '설정: 목소리 종류',
      type: _str,
      label: '상대 목소리',
    ),
    PrefSpec('leader_persona', _b, '설정: 목소리 화자', type: _str, label: '상대 목소리'),
    PrefSpec('tts_rate', _b, '설정: 말하기 속도', type: _dbl, label: '말하기 속도'),

    // ---- 기도 음악 ---------------------------------------------------------
    PrefSpec('prayer_music', _b, '기도 중 성가', type: _bool, label: '기도 음악'),
    PrefSpec('prayer_music_track', _b, '성가 곡', type: _str, label: '기도 음악'),
    PrefSpec('prayer_music_volume', _b, '성가 음량', type: _dbl, label: '기도 음악'),
    PrefSpec(
      'prayer_music_church',
      _b,
      '성당에서도 성가',
      type: _bool,
      label: '기도 음악',
    ),

    // ---- 성당 ---------------------------------------------------------------
    PrefSpec(
      'church_avatar',
      _b,
      '아바타(JSON, 세례명 포함 — 사용자 본인의 값)',
      type: _str,
      label: '아바타',
    ),
    PrefSpec('church_avatar_chosen', _b, '아바타를 정했음', type: _bool),
    PrefSpec('church_name_chosen', _b, '앱 소개에서 세례명을 골랐음', type: _bool),
    PrefSpec('church_ambient', _b, '성당 환경음', type: _bool, label: '성당 소리'),
    PrefSpec('church_quality', _b, '성당 화질', type: _str, label: '성당 화질'),
    PrefSpec(
      'church_cam_auto_zoom',
      _b,
      '카메라 자동 줌',
      type: _bool,
      label: '성당 카메라',
    ),
    PrefSpec('church_cam_dist', _b, '카메라 거리', type: _str, label: '성당 카메라'),
    PrefSpec('church_cam_follow', _b, '카메라 따라가기', type: _bool, label: '성당 카메라'),
    PrefSpec('church_hud_collapsed', _b, '성당 위쪽 메뉴 접기', type: _bool),
    PrefSpec('skin_id', _b, '앱 스킨', type: _str, label: '스킨'),
    PrefSpec('skin_seen', _b, '새 스킨 표시를 본 것', type: _list),
    PrefSpec('skin_customs', _b, '내가 만든 스킨(JSON)', type: _str, label: '내가 만든 스킨'),
    PrefSpec('stats_day_start_hour', _b, '하루의 시작 시각', type: _int, label: '하루의 시작 시각'),
    PrefSpec('stats_goal_decades', _b, '오늘의 기도 목표(단)', type: _int, label: '기도 목표'),
    PrefSpec('stats_goal_minutes', _b, '오늘의 기도 목표(분)', type: _int, label: '기도 목표'),
    PrefSpec('stats_goal_prompted', _b, '목표 안내를 본 것', type: _bool),
    PrefSpec(
      'church_stick_right',
      _b,
      '이동 손잡이 위치',
      type: _bool,
      label: '이동 손잡이',
    ),
    PrefSpec('prayerPosture', _b, '앉아/무릎 꿇고', type: _str, label: '기도 자세'),
    PrefSpec('churchPrayerChoice', _b, '마지막 기도하기 선택', type: _str),
    PrefSpec('churchRosaryBig', _b, '성당 묵주기도: 마지막에 고른 화면(큰/작은)', type: _bool),
    PrefSpec('beadSwipeLearned', _b, '묵주 내리기 안내를 익힌 횟수', type: _int),
    PrefSpec('prayerScreenTourDone', _b, '기도 화면 첫 사용 안내를 마침', type: _bool),
    PrefSpec('appIntroDone', _b, '앱 소개(첫 실행 안내)를 마침', type: _bool),
    PrefSpec('churchTourDone', _b, '성당 첫 입장 안내를 마침', type: _bool),
    PrefSpec('guideTtsOn', _b, '안내 글을 소리로 읽기', type: _bool, label: '안내 읽어 주기'),
    PrefSpec('appTextScale', _b, '앱 전체 글자 크기 배율', type: _dbl, label: '글자 크기(앱 전체)'),
    PrefSpec('church_id', _b, '마지막으로 고른 성당', type: _str, label: '성당'),
    PrefSpec('church_favorites', _b, '즐겨찾는 성당', type: _list, label: '즐겨찾는 성당'),
    PrefSpec(
      'church_solo_candles_v1',
      _b,
      '혼자 모드에서 켠 봉헌초(하루 지나면 읽을 때 저절로 빠진다)',
      type: _str,
      label: '봉헌초',
    ),
    PrefSpec('church_candle_color_v1', _b, '봉헌초 색', type: _int, label: '봉헌초 색'),
    PrefSpec('church_walk_hint_seen', _b, '첫 방문 안내를 봤음(다시 안 띄우기)', type: _bool),
    PrefSpec(
      'stations_series_id',
      _b,
      '십자가의 길 그림 연작',
      type: _str,
      label: '십자가의 길',
    ),

    // ---- 뺀 것(이유) -------------------------------------------------------
    PrefSpec(
      'church_resume_state',
      _x,
      '성당 재진입용 임시 자리(30분만 믿는다) — 되살려도 쓸모없고 다른 기기에서 엉뚱한 자리로 연다',
    ),
    PrefSpec(
      'resume_',
      _x,
      '이어서 기도하기의 지금 위치(resume_set·index·at) — 기기의 지금 상태. 옛 백업으로 덮으면 진행이 뒤로 간다',
      prefix: true,
    ),
    PrefSpec('church_perf_hud', _x, '진단용 성능 표시 — 기기별'),
    PrefSpec('stats_owner_uid', _x, '이 기기 기록의 주인 계정 id — 계정에 묶인 값'),
    PrefSpec('synced_prayer_ids_v1', _x, '서버에 올린 기록 id 장부 — 계정·기기에 묶인 동기화 상태'),
    PrefSpec('synced_prayer_user_v1', _x, '동기화 장부의 계정 id — 계정에 묶인 값'),
    PrefSpec('church_client_id', _x, '성당 서버 접속용 기기 id — 기기 고유'),
    PrefSpec('device_id_v1', _x, '분석용 기기 id — 기기 고유'),
    PrefSpec(
      'auth.consent.v1.',
      _x,
      '약관·개인정보 동의 기록 — 법적 동의는 그 계정·기기에서 직접 받는다(서버가 원본)',
      prefix: true,
    ),
    PrefSpec(
      'rosary.auth.',
      _x,
      '로그인 세션·PKCE(키스토어 대체 저장소) — 토큰·비밀',
      prefix: true,
    ),
    PrefSpec('guest.', _x, '게스트 계정 연결 권유 시점 — 계정·기기 상태', prefix: true),
    PrefSpec(
      internalPrefix,
      _x,
      '백업 기능 자신의 상태(폴더 권한은 기기마다) — 기기별',
      prefix: true,
    ),
  ];

  /// 비밀처럼 보이는 키 — 등록부에 없어도 절대 내보내지 않는다(안전망).
  static final RegExp _secretLike = RegExp(
    r'(token|secret|session|passw|pkce|credential|api[_-]?key|private|auth\.)',
    caseSensitive: false,
  );

  static bool looksSecret(String key) => _secretLike.hasMatch(key);

  /// 키의 분류(정확한 키가 접두사보다 먼저). 없으면 null(= 분류되지 않음).
  static PrefSpec? specFor(String key) {
    for (final s in specs) {
      if (!s.prefix && s.key == key) return s;
    }
    PrefSpec? best;
    for (final s in specs) {
      if (s.prefix && key.startsWith(s.key)) {
        if (best == null || s.key.length > best.key.length) best = s;
      }
    }
    return best;
  }

  /// 이 키를 `data.prefs`에 싣는가. 등록부에 없는 키는 비밀처럼 보이지 않을 때만 싣는다.
  static bool shouldExport(String key) {
    final s = specFor(key);
    if (s != null) return s.role == PrefRole.backup;
    return !looksSecret(key);
  }

  /// 가져온 파일의 이 키를 이 기기에 써도 되는가(뺀 키·비밀은 파일에 있어도 무시한다).
  static bool shouldImport(String key) => shouldExport(key);

  /// 등록된 backup 키 전부.
  static Iterable<PrefSpec> get backupSpecs =>
      specs.where((s) => s.role == PrefRole.backup && !s.prefix);
}
