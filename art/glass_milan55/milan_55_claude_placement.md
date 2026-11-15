# 로사리움 밀라노 55개 창문 배치 지시서 (개발용 v0.4)

## Claude Code 작업 지시
기존 Flutter/Three.js의 밀라노 성당 씬을 먼저 분석하고, 창틀의 실제 opening mesh에 `milan_55_claude_placement.json`의 anchor_key를 연결한다. DEV 이미지와 실제 작품의 동일성을 주장하지 않는다. 55개는 테스트 텍스처 55개이며 실제 위치 55개가 확정된 것은 아니다. 아래 매핑은 개발 테스트용 임시 할당이다.

### 방향 / 좌표
- 정문에서 제대를 바라볼 때 오른쪽=남측, 왼쪽=북측. 정문을 돌아보는 경우 반대가 된다. 도면은 정문 아래, 제대 위로 읽는다.
- 기존 씬 좌표계를 우선한다. 신규 좌표 예시: +Z 제대, +X 북측, -X 남측, +Y 위. 카메라가 +Z를 보면 오른쪽은 -X다.
- 실좌표 x/y/z 및 rotation은 현재 GLB/생성 코드에서 측정한다. 임의 좌표·창 높이·개수를 정하지 않는다.
- P01~P39는 아래 공개 평면도의 표기, V는 아카이브 표기, MIL/DEV는 별도 내부 ID. CVMA 번호는 중앙 후진부터 별도로 매겨져 있다. 번호 혼용 금지.
- 도면의 하단 파사드 번호 순서는 왼쪽부터 P40, P41, P45, P42, P43이다. 공식 V40의 내부에서 바라본 좌측 첫 창 설명과 방향 충돌 가능성이 있어 P40=V40을 강제하지 않는다.

### 55개 이미지 개별 배치표
| PNG | 대상 ID | 실제 작품 주제 후보(텍스처 내용 아님) | 위치 / 임시 할당 | 근거 상태 |
|---|---|---|---|---|
| DEV-001.png | P01 / V01 | 성 요한 사도의 생애 | 남측 외벽(제대 바라볼 때 오른쪽), 입구에서 제대 방향 1번째 번호 창 | plan_and_archive_supported |
| DEV-002.png | P02 / V02 | 구약과 그리스도 수난 | 남측 외벽(제대 바라볼 때 오른쪽), 입구에서 제대 방향 2번째 번호 창 | plan_position_candidate |
| DEV-003.png | P03 / V03 | 구약 | 남측 외벽(제대 바라볼 때 오른쪽), 입구에서 제대 방향 3번째 번호 창 | plan_position_candidate |
| DEV-004.png | P04 / V04 | 구약 | 남측 외벽(제대 바라볼 때 오른쪽), 입구에서 제대 방향 4번째 번호 창 | plan_position_candidate |
| DEV-005.png | P05 / V05 | 신약성경 이야기 | 남측 외벽(제대 바라볼 때 오른쪽), 입구에서 제대 방향 5번째 번호 창 | plan_position_candidate |
| DEV-006.png | P06 / V06 | 성 엘리지오 | 남측 외벽(제대 바라볼 때 오른쪽), 입구에서 제대 방향 6번째 번호 창 | plan_position_candidate |
| DEV-007.png | P07 / V07 | 복자 페라리·슈스터 추기경 | 남측 외벽(제대 바라볼 때 오른쪽), 입구에서 제대 방향 7번째 번호 창 | plan_and_archive_supported |
| DEV-008.png | P08 / V08 | 성녀 아녜스·테클라·성 마리아 마조레 | 남측 외벽(제대 바라볼 때 오른쪽), 입구에서 제대 방향 8번째 번호 창 | plan_position_candidate |
| DEV-009.png | P09 / V09 | 성 제르바시오·프로타시오 | 남익랑 서쪽으로 접근하는 벽의 P09 (P08 다음, P11 앞) | plan_position_candidate |
| DEV-010.png | P10 / V10 | 성 야고보(대) | 남익랑 서쪽으로 접근하는 벽의 P10 (P08 다음, P11 앞) | plan_position_candidate |
| DEV-011.png | P11 / V11 | 성 요한 보노: 교구 치유·아리우스파 추방·로마 여행·장례 | 남익랑 끝 성 요한 보노 경당, 도면 P11 (측면) | plan_position_candidate |
| DEV-012.png | P12 / V12 | 성 요한 보노의 영광 | 남익랑 끝 성 요한 보노 경당, 도면 P12 (끝 중앙) | plan_position_candidate |
| DEV-013.png | P13 / V13 | 성 요한 보노: 주교 서품·밀라노 귀환·데시오 성당·로마 공의회 | 남익랑 끝 성 요한 보노 경당, 도면 P13 (측면) | plan_position_candidate |
| DEV-014.png | P14 / V14 | 알렉산드리아의 성녀 카타리나 | 남익랑 동쪽/제대 쪽 복귀 구간 도면 P14 | plan_position_candidate |
| DEV-015.png | P15 / V15 | 성 마르티노·성모 봉헌 | 남익랑 동쪽/제대 쪽 복귀 구간 도면 P15 | plan_position_candidate |
| DEV-016.png | P16 / — | 미확인 | 제대 남측 동쪽 회랑·제의실 인근 도면 P16 | plan_position_subject_unknown |
| DEV-017.png | P17 / — | 미확인 | 제대 남측 동쪽 회랑·제의실 인근 도면 P17 | plan_position_subject_unknown |
| DEV-018.png | P18 / V18 | 네 성인 | 제대 남측 동쪽 회랑·제의실 인근 도면 P18 | plan_position_candidate |
| DEV-019.png | P19 / V19 | 신약성경 | 제대 뒤 대형 후진창 오른쪽(남측, 입구에서 제대 방향) | plan_and_archive_supported |
| DEV-020.png | P20 / V20 | 요한 묵시록 | 제대 뒤 대형 후진창 정중앙 | plan_and_archive_supported |
| DEV-021.png | P21 / V21 | 구약성경 | 제대 뒤 대형 후진창 왼쪽(북측, 입구에서 제대 방향) | plan_and_archive_supported |
| DEV-022.png | P22 / — | 미확인 | 제대 북측 회랑·제의실 인근 도면 P22 | plan_position_subject_unknown |
| DEV-023.png | P23 / — | 미확인 | 제대 북측 회랑·제의실 인근 도면 P23 | plan_position_subject_unknown |
| DEV-024.png | P24 / — | 미확인 | 제대 북측 회랑·제의실 인근 도면 P24 | plan_position_subject_unknown |
| DEV-025.png | P25 / V25 | 다마스쿠스의 성 요한 | 북익랑 동쪽/제대 쪽 접근 구간 도면 P25 | plan_position_candidate |
| DEV-026.png | P26 / V26 | 성 카를로 보로메오의 생애 | 북익랑 동쪽/제대 쪽 접근 구간 도면 P26 | plan_position_candidate |
| DEV-027.png | P27 / — | 성모 생애 연작 1 | 북익랑 끝 Madonna dell’Albero 경당 도면 P27 (측면) | plan_position_candidate |
| DEV-028.png | P28 / — | 성모 생애 연작 2 | 북익랑 끝 Madonna dell’Albero 경당 도면 P28 (끝 중앙) | plan_position_candidate |
| DEV-029.png | P29 / — | 성모 생애 연작 3 | 북익랑 끝 Madonna dell’Albero 경당 도면 P29 (측면) | plan_position_candidate |
| DEV-030.png | P30 / — | 시에나의 성녀 카타리나·성모 생애 | 북익랑 서쪽/입구 쪽 복귀 구간 도면 P30 | plan_position_candidate |
| DEV-031.png | P31 / — | 사도들 | 북익랑 서쪽/입구 쪽 복귀 구간 도면 P31 | plan_position_candidate |
| DEV-032.png | P32 / V32 | 성 암브로시오의 생애 | 북측 외벽(제대 바라볼 때 왼쪽), 입구에서 제대 방향 8번째 번호 창 | plan_position_candidate |
| DEV-033.png | P33 / V33 | 성 요셉의 생애 | 북측 외벽(제대 바라볼 때 왼쪽), 입구에서 제대 방향 7번째 번호 창 | plan_position_candidate |
| DEV-034.png | P34 / — | 성녀 헬레나 | 북측 외벽(제대 바라볼 때 왼쪽), 입구에서 제대 방향 6번째 번호 창 | plan_position_candidate |
| DEV-035.png | P35 / V35 | 성모의 영광 | 북측 외벽(제대 바라볼 때 왼쪽), 입구에서 제대 방향 5번째 번호 창 | plan_position_candidate |
| DEV-036.png | P36 / — | 네 관을 쓴 순교 성인 | 북측 외벽(제대 바라볼 때 왼쪽), 입구에서 제대 방향 4번째 번호 창 | plan_position_candidate |
| DEV-037.png | P37 / V37 | 성 미카엘과 악마들의 전투 | 북측 외벽(제대 바라볼 때 왼쪽), 입구에서 제대 방향 3번째 번호 창 | plan_position_candidate |
| DEV-038.png | P38 / — | 신약·그리스도 수난 | 북측 외벽(제대 바라볼 때 왼쪽), 입구에서 제대 방향 2번째 번호 창 | plan_position_candidate |
| DEV-039.png | P39 / V39 | 다윗의 생애 | 북측 외벽(제대 바라볼 때 왼쪽), 입구에서 제대 방향 1번째 번호 창 | plan_and_archive_supported |
| DEV-040.png | — / V12bis | 구세주 그리스도와 복음사가·교부·성인 | 남익랑 성 요한 보노 경당 상부 V12bis 후보 | provisional |
| DEV-041.png | — / V40 | 성녀 테클라의 순교 | 정문 안쪽 하단, 성당 안에서 정문을 바라볼 때 맨 왼쪽 (공식 V40 설명 기준; P40 도면과 방향 대조 필요) | orientation_conflict |
| DEV-042.png | P42 / V42 | 성 카를로 보로메오의 오리아 영지 매각 | 정문 안쪽 하단, 도면 P42 후보(공식 V42와 같은 물리 창인지 확인 후 적용) | orientation_conflict |
| DEV-043.png | — / — | 성 암브로시오 | 정문 안쪽 하단의 나머지 측면 창 A; 성 암브로시오 대상 후보, 좌우 미확정 | hold_until_anchor_match |
| DEV-044.png | — / — | 성 미카엘 | 정문 안쪽 하단의 나머지 측면 창 B; 성 미카엘 대상 후보, 좌우 미확정 | hold_until_anchor_match |
| DEV-045.png | P45 / V45 | 성모 승천 | 정문 안쪽 하단 중앙 성모 승천 V45 | provisional |
| DEV-046.png | — / — | 교회(Ecclesia) | 정문 안쪽 상단 측면 A, 교회 주제; 정확한 좌우 미확정 | hold_until_anchor_match |
| DEV-047.png | — / — | 삼위일체 | 정문 안쪽 상단 중앙, 삼위일체 | provisional |
| DEV-048.png | — / — | 시나고가(Synagoga) | 정문 안쪽 상단 측면 B, 시나고가 주제; 정확한 좌우 미확정 | hold_until_anchor_match |
| DEV-049.png | — / — | 미확인 | 실제 위치 미확인. 별도 테스트 씬 QA Gallery에만 배치; 교차부 상부 등의 후보 조사 후 이관 | test_only_unplaced |
| DEV-050.png | — / — | 미확인 | 실제 위치 미확인. 별도 테스트 씬 QA Gallery에만 배치; 교차부 상부 등의 후보 조사 후 이관 | test_only_unplaced |
| DEV-051.png | — / — | 미확인 | 실제 위치 미확인. 별도 테스트 씬 QA Gallery에만 배치; 교차부 상부 등의 후보 조사 후 이관 | test_only_unplaced |
| DEV-052.png | — / — | 미확인 | 실제 위치 미확인. 별도 테스트 씬 QA Gallery에만 배치; 교차부 상부 등의 후보 조사 후 이관 | test_only_unplaced |
| DEV-053.png | — / — | 미확인 | 실제 위치 미확인. 별도 테스트 씬 QA Gallery에만 배치; 교차부 상부 등의 후보 조사 후 이관 | test_only_unplaced |
| DEV-054.png | — / — | 미확인 | 실제 위치 미확인. 별도 테스트 씬 QA Gallery에만 배치; 교차부 상부 등의 후보 조사 후 이관 | test_only_unplaced |
| DEV-055.png | — / — | 미확인 | 실제 위치 미확인. 별도 테스트 씬 QA Gallery에만 배치; 교차부 상부 등의 후보 조사 후 이관 | test_only_unplaced |

### 구현 및 검증
- JSON의 `texture_file`은 기존 ZIP 내부 상대 경로와 일치한다. `anchor_key`는 신규 제안 키이며 현재 코드에 존재하는 것이 아니다.
- P01~P39의 개구부를 확인한 후 임시 텍스처를 붙인다. P16·17·22·23·24의 주제는 미확인이다.
- 40~48은 경당 상부와 정문 안쪽 후보 위치를 대조한다. 위치가 확인되지 않으면 원래 씬 구조를 유지하고 QA 씬에서만 표시한다. 49~55는 실제 위치 미확정으로 QA Gallery에만 전시한다. 교차부에 7개가 있다고 가정하지 않는다.
- 창틀·트레이서리 메시와 재질은 유지. 텍스처를 안쪽으로 향하게 하고 UV 방향 확인. 원본 비율을 무리하게 늘리지 말고 실제 개구부별 적합한 마스크/분할을 구성한다.
- 아바타가 바라보는 방향 기준 남·북·후진 순서, 중복 anchor, UV, 광원, 리소스 해제를 테스트한다. 성당 출입 시 리소스 dispose. KTX2 변환은 별도 파이프라인에서 검증.
- 개발용 플래그/릴리스 차단을 유지한다. 실제 복원 텍스처로 교체하기 전 별도 원작/사진/문화유산 권리 확인.
- 결과 보고: 55개 DEV별 적용 상태, 실제 씬 mesh ID, world transform, 미배치 원인, 화면 캡처. 모델에 없는 창틀은 임의로 추가하지 않는다.

### 자료
- 공개 도면 (Carlo Dell’Orto, CC BY-SA 3.0): https://commons.wikimedia.org/wiki/File:Duomo_di_Milano,_pianta_con_elenco_delle_vetrate.jpg
- CVMA 학술 도면: https://corpusvitrearum.it/bivi/eng/schede/Lombardia/Duomo/piantaduomo.htm
- 공식 디지털 아카이브: https://artsandculture.google.com/project/milan-cathedral
- 각 작품 출처는 JSON 및 ZIP의 historical_research_v03.* 참고.
- 공식 V01 남측 첫 창: https://artsandculture.google.com/asset/stories-of-saint-john-the-apostle-cristoforo-de-mottis-and-frati-gesuati/cgEGZF3F6tBF7g
- 공식 V39 북측 첫 창: https://artsandculture.google.com/story/stories-of-david-veneranda-fabbrica-del-duomo-di-milano/3gURvX4QV6kJJg?hl=en
- 공식 V40: https://artsandculture.google.com/asset/the-martyrdom-of-saint-thecla/HAF9_VEhgkZGWQ
- 기존 자료를 재검토한 결과, 55개 실제 창과 55개 AI 시안의 일대일 역사적 매핑은 미확정.
