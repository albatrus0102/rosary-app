/// 창 묵상 글(`meditation`)을 보여 줄지. 지도 신부 1명이 승인하기 전에는 **꺼 둔다**
/// (GLASS_APP_PLAN Q6). 카탈로그에 묵상 필드가 생겨도 이 값이 true가 되기 전에는
/// 어떤 화면에도 나오지 않는다.
const bool kWindowMeditationsEnabled = false;

/// 사진 보정 내역(CC BY 표시의 '변경 여부'). 카탈로그 `GLASS_CATALOG.md` 「출처 표기」와 같은 문구.
const String kGlassChangeNote = '크롭·투시/색 보정함';

/// 공식 서비스가 아님을 알리는 짧은 고지.
const String kGlassUnofficialNote = '이 앱은 가톨릭 교회의 공식 서비스가 아닙니다.';

/// 이탈리아·바티칸 소재 문화재 고지(GLASS_APP_PLAN §5). 무료·광고 없음이 전제다.
const String kGlassHeritageNote =
    '이탈리아·바티칸 소재 문화재 이미지는 비상업적 감상·신심 용도로, 무료이고 광고가 없는 앱에서만 사용합니다.';

/// 진본/참고 구분 설명.
const String kGlassAuthenticMeaning =
    '원래 자리: 그 창이 실제로 있는 성당의 3D 모형 안 자리에 둔 창입니다.';
const String kGlassReferenceMeaning =
    '참고 배치: 같은 양식의 다른 성당에 있는 실제 창을 참고로 둔 것입니다. 원래 자리는 창 정보에 적혀 있습니다.';

/// 사진 보정 원칙(GLASS_CATALOG.md 「새것 같은」 복원의 범위).
const String kGlassRetouchPolicy =
    '창 사진은 투시·색 균형·노출 등을 충실하게 손질한 것이며, 유리를 새로 그리거나 '
    '지워 넣지 않았습니다. 색은 사진가의 카메라가 본 색을 넘지 못하므로 실제와 다를 수 있습니다.';
