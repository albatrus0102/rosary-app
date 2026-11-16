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

  // ── 2. 동의 전 성당(당고개·여의도동) ──────────────────────────────────────────────────
  /// 숨기는 이유: 성지·본당·서울대교구의 서면 동의 전이다(법률 검토 M6, 3D 실내 모형 = 2차적저작물 판례).
  /// 목록에는 '준비 중'으로만 보이고 들어갈 수 없다(여의도동의 임시 그리스도상도 그 안이라 함께 숨는다).
  /// 풀리는 조건: 당고개 — 성지·서울대교구(·설계자) 서면 동의, 여의도동 — 본당·서울대교구 동의.
  /// 동의를 받으면 해당 id 를 이 집합에서 빼고 `ChurchSelectScreen.releaseIds` 에 넣는다.
  static const Set<String> pendingConsentChurchIds = {'danggogae', 'yeouido'};

  /// [releaseIds]에 더해 지금 빌드에서 열리는 성당 id.
  static Set<String> openChurchIds(Set<String> releaseIds) =>
      showAll ? {...releaseIds, ...pendingConsentChurchIds} : releaseIds;

  // ── 3. 프레비아티 〈십자가의 길〉(바티칸 박물관 소장품 사진) ────────────────────────────
  /// 숨기는 이유: 바티칸 박물관의 촬영물 이용 규정이 미확인이다(법률 검토 M8). 성 베드로 성당은 다른 공공 소유 연작을 건다.
  /// 풀리는 조건: 바티칸 박물관 이미지·저작권 사무실(`id.musei@scv.va`)의 회신(허락). 거절·무응답이면 이대로 영구 교체.
  static const Set<String> hiddenStationSeriesIds = {'previati'};

  /// 숨긴 연작을 배정받았던 성당의 대체 연작(성당 id → 연작 id). `oreilly`는 라테라노와 함께 쓴다(공유 예외).
  static const Map<String, String> stationSeriesOverrides = {
    'stpeter': 'oreilly',
  };

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
