import '../church/dev_glass.dart';

/// 검수용(출시) 빌드에서 숨기는 것들의 **단 하나의 관문**.
/// 근거: `docs/legal/LEGAL_REVIEW_2026-11.md` 「검수용(출시) 빌드에서 숨긴 것」, `docs/BACKLOG.md`.
///
/// 교회 검토·법률 확인을 받는 동안 문제가 될 수 있는 것은 일반(배포) 빌드에서 보이지도, 번들에 들어가지도
/// 않는다. 개발용 빌드(`tools/build_dev_apk.sh`, `--dart-define=ROSARIUM_DEV_GLASS=true`)에서는 전부 그대로 켜진다.
///
/// * [showAll]은 컴파일 상수다(= [DevGlass.enabled]). 일반 빌드에서 false 라 숨김 분기 밖의 코드는 트리 셰이킹된다.
/// * 번들에서 빼는 파일은 `tools/release_hidden_assets.txt` 에 적혀 있고, `pubspec.yaml` 에는 없다. 개발용 빌드 스크립트만
///   그 목록을 임시로 pubspec 에 더한다. `tools/check_release_apk.sh` 가 배포 APK 에 그 경로들이 없는지 검사한다.
/// * 웹(성당 장면) 쪽은 주소에 `devglass=1` 이 있을 때만 숨김을 푼다(개발용 빌드만 그 표시를 붙인다). `assets/church/way_cross.js`.
///
/// 항목을 다시 열려면 아래 각 항목의 '풀리는 조건'이 채워진 뒤 해당 값을 바꾸고,
/// `tools/release_hidden_assets.txt`·`pubspec.yaml` 에서 그 자산을 되돌린다.
abstract final class ReleaseGate {
  /// 개발용 빌드인가: 켜면 아래 항목이 모두 보인다.
  static const bool showAll = DevGlass.enabled;

  // ── 1. AI 선창·후창 음성(ElevenLabs 62개) ─────────────────────────────────────────────
  /// 숨기는 이유: 생성 당시 ElevenLabs 플랜(무료면 비상업·표기 조건)과 두 목소리의 종류가 미확인이고(법률 검토 M2),
  /// 주교회의가 AI 서비스를 조심스럽게 본다(2023 규정 제8조). 대신 기기 음성(flutter_tts)이 읽어 주고,
  /// 음성 제목 안내는 원래 기기 음성이라 그대로다.
  /// 풀리는 조건: 사용자가 결제 내역으로 유료 플랜·목소리 종류 확인(또는 유료로 재생성) + 주교회의 회신에서 합성 음성 허용.
  static const bool aiVoiceClips = showAll;

  // ── 2. 동의 전 성당(당고개·여의도동·아시시) ──────────────────────────────────────────────────
  /// 숨기는 이유: 성지·본당·서울대교구의 서면 동의 전이다(법률 검토 M6, 3D 실내 모형 = 2차적저작물 판례).
  /// 목록에는 '준비 중'으로만 보이고 들어갈 수 없다(여의도동의 임시 그리스도상도 그 안이라 함께 숨는다).
  /// 풀리는 조건: 당고개 — 성지·서울대교구(·설계자) 서면 동의, 여의도동 — 본당·서울대교구 동의,
  /// (아시시는 2026-11-23 사용자 결정으로 열었다 — 다른 오래된 대성전처럼 이의 없음·이름 사용만 여쭙는 경우, 08 요청서는 보낸다.)
  /// 동의를 받으면 해당 id 를 이 집합에서 빼고 `ChurchSelectScreen.releaseIds` 에 넣는다.
  static const Set<String> pendingConsentChurchIds = {
    'danggogae',
    'yeouido',
  };

  // ── 2-1. 주인 확인 전 성당(앱이 지은 가상의 성당) ───────────────────────────────────────
  /// 새로 짓는 가상 성당을 주인이 확인하기 전까지 일반(배포) 빌드의 목록에서 **'준비 중'으로도 빼 두는** 자리([churchListed]).
  /// 그 성당의 자산 폴더는 `tools/release_hidden_assets.txt`에 올려 번들에서도 뺀다. 개발용 빌드에서는 열린다.
  /// 빛의 성당(`light`)은 2026-11-24 사용자 결정으로 공개했다 — `ChurchSelectScreen.releaseIds`로 옮기고 창 팩 폴더를 번들에 넣었다.
  static const Set<String> unreleasedChurchIds = {};

  // ── 2-2. 성당 측이 「앱에 싣지 말아 달라」고 한 성당 ──────────────────────────────────────
  /// 성당(관리 주체)이 앱에 나오지 않기를 요청해 일반(배포) 빌드·웹 데모에서 **목록에도 '준비 중'으로도 나오지 않게** 뺀 성당
  /// ([churchListed]). 이름·썸네일·장면·성화 출처 줄이 하나도 보이지 않는다.
  /// 성 마리아 마조레 대성전(`maggiore`): 2026-11-25 회신 ③ 「La Basilica … ha deciso di non comparire nella app.
  /// Le chiedo quindi di toglierla.」 — 허락 요청 편지에서 뺀다고 약속했다(`docs/legal/church_permission/README.md` §8-1).
  /// 개발용 빌드에서 남길지는 사용자가 아직 정하지 않았다(그동안은 개발용 빌드에서만 열린다).
  /// 번들에서 뺀 자산은 `tools/release_hidden_assets.txt`의 '2-2' 항목.
  /// 풀리는 조건: 없음(성당 측이 다시 허락해 줄 때만).
  static const Set<String> withdrawnChurchIds = {'maggiore'};

  /// 위 성당의 실제 작품 사진 출처 줄(`ArtCredit.use`). 성당을 뺐으므로 출처 줄도 뺀다.
  static const Set<String> withdrawnChurchArtCreditUses = {
    '성 마리아 마조레 대성전 · 파올리나 경당의 성화',
  };

  /// 이 성당을 지금 빌드의 목록(성당 고르기·입구 캐러셀)에 보여도 되는가.
  static bool churchListed(String id) =>
      showAll ||
      !(unreleasedChurchIds.contains(id) || withdrawnChurchIds.contains(id));

  /// [releaseIds]에 더해 지금 빌드에서 열리는 성당 id.
  static Set<String> openChurchIds(Set<String> releaseIds) => showAll
      ? {
          ...releaseIds,
          ...pendingConsentChurchIds,
          ...unreleasedChurchIds,
          ...withdrawnChurchIds,
        }
      : releaseIds;

  // ── 3. 프레비아티 〈십자가의 길〉(바티칸 박물관 소장품 사진) ────────────────────────────
  /// 숨기는 이유: 바티칸 박물관의 촬영물 이용 규정이 미확인이다(법률 검토 M8). 성 베드로 성당은 다른 공공 소유 연작을 건다.
  /// 풀리는 조건: 바티칸 박물관 이미지·저작권 사무실(`id.musei@scv.va`)의 회신(허락). 거절·무응답이면 이대로 영구 교체.
  static const Set<String> hiddenStationSeriesIds = {'previati'};

  /// 숨긴 연작을 배정받았던 성당의 대체 연작(성당 id → 연작 id). `oreilly`는 라테라노와 함께 쓴다(공유 예외).
  static const Map<String, String> stationSeriesOverrides = {
    'stpeter': 'oreilly',
  };

  /// 성당 안내문([ChurchInfo.modelNote])의 연작 설명도 바꾼 연작에 맞춘다(성당 id → (원래 문구, 대체 문구)).
  /// 대체 문구는 라테라노 안내문과 같은 `oreilly`(1897년 석판화) 설명이다.
  static const Map<String, (String, String)> churchNoteOverrides = {
    'stpeter': ('옛 그림 연작(프레비아티, 1901~1902년)', '옛 석판화 연작(1897년)'),
  };

  /// [note]에 검수용(출시) 빌드의 대체 문구를 적용한다.
  static String churchNote(String churchId, String note) {
    final o = churchNoteOverrides[churchId];
    return showAll || o == null ? note : note.replaceAll(o.$1, o.$2);
  }

  /// 이 연작을 지금 빌드에서 보여도 되는가.
  static bool stationSeriesVisible(String id) =>
      showAll || !hiddenStationSeriesIds.contains(id);

  // ── 4. 기도 배경 그림: 바티칸·이탈리아 공공 소장품 7점 ────────────────────────────────
  /// 숨기는 이유: 라파엘로 〈거룩한 변모〉(바티칸 미술관)와 이탈리아 국립·시립 미술관 소장 6점(프라 안젤리코 2,
  /// 알베르티넬리, 베로키오, 카라바조, 피에로 델라 프란체스카)은 이탈리아 문화유산법 107–108조·박물관 규정 확인 전이다(M8, §1·§2).
  /// 해당 단의 기도 배경은 그림 없이 표면색만 쓴다.
  /// 풀리는 조건: 바티칸 박물관·각 미술관의 허락 또는 이탈리아 변호사의 108조 3-bis(비영리 자유 이용) 적용 확인.
  static const Set<String> hiddenMysteryArt = {
    'assets/images/mysteries/joyful_1.webp',
    'assets/images/mysteries/joyful_2.webp',
    'assets/images/mysteries/joyful_4.webp',
    'assets/images/mysteries/luminous_1.webp',
    'assets/images/mysteries/luminous_4.webp',
    'assets/images/mysteries/sorrowful_2.webp',
    'assets/images/mysteries/glorious_1.webp',
  };

  /// 위 7점의 성화 출처 줄(`ArtCredit.use`). 그림을 숨기면 출처 줄도 같이 숨긴다.
  static const Set<String> hiddenMysteryArtCreditUses = {
    '환희 1단',
    '환희 2단',
    '환희 4단',
    '빛 1단',
    '빛 4단',
    '고통 2단',
    '영광 1단',
  };

  static bool mysteryArtVisible(String asset) =>
      showAll || !hiddenMysteryArt.contains(asset);

  // ── 5. 출처 미확인 묵주 그림 25장 ─────────────────────────────────────────────────────
  /// 숨기는 이유: 누가 어떤 도구로 만들었는지, 실물 상품 사진을 본떴는지 기록이 없다(M5,
  /// `docs/legal/ROSARY_IMAGES_PROVENANCE.md`). 그림 자리에는 묵주 색의 단순한 도형(구슬 고리와 십자가)을 그린다.
  /// 3D 묵주 렌더(`assets/rosary3d/`)는 영향 없다.
  /// 풀리는 조건: 사용자가 생성 도구·약관·참고 이미지 여부를 확인하거나(문서 '확인 기록'), 3D 렌더 정지 컷·새 그림으로 교체.
  static const bool rosaryPhotos = showAll;

  // ── 6. 밀라노 개발용 유리(AI 시안 55장) ───────────────────────────────────────────────
  /// 이미 개발용 전용이다(`DevGlass.enabled`, `assets/church/dev/`). 이 관문은 같은 값을 가리키기만 한다.
  /// 풀리는 조건: 실제 작품 도안·권리 확인(`docs/church/GLASS_DEV_PIPELINE.md`).
  static const bool devGlass = DevGlass.enabled;
}
