# 로사리움 다국어 — 한국어 문자열 재고(inventory)

> 작성: Claude Opus 5.5 (읽기 전용 조사, 저장소 파일 수정 없음) · 기준: `/home/user/rosary-app` 브랜치 `claude/rosary-app-voice-recognition-1uzxco`, HEAD `397c898` · 측정일 2026-11-23(UTC)

## 0. 한눈에

사용자에게 보이는 한국어 문자열은 **고유 6,365개(출현 7,000회), 약 11.5만 자**다(생성 사본·화면에 안 나오는 문자열은 뺐다). 이 가운데 **번역해서 될 UI 문구는 고유 1,634개(약 3.5만 자)**뿐이다. 나머지는 고유명사(세례명 3,788개가 대부분), 출처·복원 기록, 공식 기도문, 법률 문서다. 이것들은 번역이 아니라 **공식 형태를 찾거나 언어별로 새로 작성**해야 한다.

| 분류 | 고유 | 출현 | 글자 수 | 처리 방식 |
|---|---:|---:|---:|---|
| UI(고정 문구) | 1,424 | 1,857 | 31,981 | 번역(ARB) |
| 동적(DYN: 보간 `${}` 포함 UI) | 210 | 235 | 3,463 | 번역 + ICU 자리표시·복수형. 복수형 후보 49, 날짜 꼴 22 |
| 기도·전례 **공식 본문**(PRAYER_OFF) | 269 | 290 | 5,470 | **번역 금지.** 언어·국가별 공식 출처 본문으로 교체 |
| 기도·신심 **앱 자작 글**(PRAYER_APP) | 29 | 29 | 1,565 | 번역은 하되 사제·교구 검수(십자가의 길 묵상·청원 14×2 + 마침) |
| 고유명사(NAME: 세례명·성당·성인·작가·작품·지명) | 4,104 | 4,190 | 25,418 | 언어별 공식 표기(세례명 3,788개 + 별칭 153개 포함) |
| 출처·라이선스·복원 기록(CREDIT) | 226 | 255 | 32,661 | 이름은 원어 유지, 서술부는 번역(유리창 복원 기록이 대부분) |
| 법률(LEGAL) | 141 문단 | 144 | 14,861 | 법역별 재작성 + 변호사 검토(번역만으로는 안 됨) |
| (제외) 화면에 안 나옴(INTERNAL) | 213 | 232 | 4,240 | 개발용 화면·로그·`assert`·백업 등록부 `why` 칸 등 |

영역별(INTERNAL·생성 사본 제외 전 합계는 `tools/classify.py` 출력 그대로):

| 영역 | 고유 | 글자 수 | 주된 분류 |
|---|---:|---:|---|
| A. `lib/` Dart 화면 | 1,356 (그중 내부 104) | 21,207 | UI 1,062 · DYN 201 |
| B. `assets/church/*.js`(WebView) | 195 (그중 내부 107) | 3,200 | UI 67(층·자리 이름·「촛불 봉헌」 등) · NAME 21(성당 이름·소재지) |
| C. 데이터(기도·십자가의 길·세례명·전례 시기·성화 출처·유리창 카탈로그·묵주 소개) | 4,850 | 71,968 | NAME 4,051 · PRAYER_OFF 269 · UI 280 · CREDIT 223 · PRAYER_APP 29 |
| D. 네이티브(앱 이름·iOS 마이크 권한 문구) | 2 | 31 | Android `android:label="로사리움"`, iOS `NSMicrophoneUsageDescription` 한 줄. **알림 문구는 없다**(알림 패키지 없음) |
| E. 법률(`lib/auth/legal_docs.dart`·`legal_texts.dart`) | 141 문단 | 14,861 | 약관·개인정보처리방침 등 4개 문서(12,751자, `docs/legal/*.md`에서 생성) + 동의 항목 카드(약 2,100자) |
| F. 성당 카탈로그(`lib/church/church_catalog.dart`) | 84 | 8,392 | `modelNote` 11개 = **6,083자**(실제와 다른 점을 밝히는 안내문), 이름 19·소재지 19·분류 19·인물 10 |
| G. 스토어 등재 문구 | 0 | 0 | **없다.** `docs/legal/store_disclosures.md`는 데이터 보안 양식 답안 초안일 뿐, 제목·짧은 설명·전체 설명 원고가 아니다. 언어마다 새로 써야 한다 |

생성 사본(번역 단위를 다시 세지 않음): `assets/church/baptismal_names.js`(세례명, 3,449), `assets/church/glass_catalog.js`(81, `glass_catalog.json`과 같은 내용), `assets/church/cross_data.js`(37, `data/stations_of_cross.json` → `tools/stations/build_stations.py`). **원본 하나를 고치면 생성기가 Dart·JS 양쪽을 만든다**는 기존 구조를 다국어에서도 그대로 써야 한다.

## 1. 영역별 상세

### A. `lib/` 화면 문구 — 상위 파일(UI+DYN 출현 수 / 글자 수)
`backup/backup_ui.dart` 122/2,485 · `glass/glass_catalog.dart` 115/686(유리창 분류 enum·필터) · `ui/settings_screen.dart` 111/1,634 · `rosary3d/rosary_model.dart` 63/1,013(묵주 상품 소개) · `stats/stats_sections.dart` 61/496 · `church/church_select_screen.dart` 54/321 · `app/skins.dart` 50/331 · `auth/account_screen.dart` 49/692 · `backup/backup_registry.dart` 47/244(설정 이름 `label`만) · `church/church_hud.dart` 42/292 · `ui/prayer_screen.dart` 40/450 · `ui/more_screen.dart` 36/409 · `church/avatar/avatar_config.dart` 36/127(피부·머리 모양 이름).

한국어 문법을 코드로 다루는 자리가 있다(번역만으로는 안 됨):
- `lib/ui/home_screen.dart:451`, `lib/ui/prayer_screen.dart:606`, `lib/rosary3d/rosary_prayer_view.dart:289` — 신비 묵상문에서 정규식 `[을를] 묵상합시다\.$`을 잘라 짧은 제목을 만든다. 다른 언어에서는 **데이터에 짧은 제목 칸을 따로 둬야** 한다.
- `lib/stats/stats_format.dart` — 요일 `['월','화',…]`을 손으로 박아 두었다 → `intl` `DateFormat`으로.
- `lib/app/leader_voice.dart:94`, `lib/app/guide_voice.dart:24`, `lib/rosary3d/rosary_feedback.dart:188` — TTS 언어가 `ko-KR`로 고정돼 있다.
- `lib/domain/prayer_splits.dart` — 선창·후창 경계를 **한국어 본문의 줄 번호**로 정한다(사도신경 9, 주님의 기도 5, 성모송 3, 영광송 1, 구원송 2). 언어·변종마다 값이 다르다.
- 로그인 화면의 카카오 로그인(`lib/auth/login_screen.dart`)은 한국 전용 수단이다. 언어가 아니라 시장의 문제라, 다른 언어에서 숨길지는 따로 정해야 한다.

### B. WebView(`assets/church/*.js`)
- 화면에 나오는 것: 층 이름(`ch_assisi.js`의 `label_ko` 「상부 성당」·「지하 묘소(성 프란치스코 무덤)」, `ch_yeouido.js`의 「성가대석(3층)」), 자리 이름(`markers.js` 「촛불 봉헌」·「제대 앞」·「성수대」, `shrine*.js` 「성모상 앞」), 동상 이름(`scan3d.js`), 머리 모양 이름(`palette.js`), 캔버스 글자(`world.js` `fillText('내 초')`), 성당 이름·소재지(`ch_*.js`의 `info.name/place`), WebGL 미지원 안내(`main.js`).
- 이미 `label_ko`·`go_ko`·`where_ko`처럼 **`_ko` 접미 칸 규약**이 있다. `label_<lang>`으로 늘리거나 키를 두고 Flutter가 사전을 내려주는 방식으로 바꿀 수 있다(design.md §4).
- 내부로 분류한 것: `perf_hud.js`(진단용 성능 표시, 설정에서 켜는 개발 기능 68개), `ao_fx.js`·`gi_fx.js`·`avatar_glb.js`의 `console.warn`/`Error`, `shrine_places.js`의 `note`, `glass_gen.js`의 `era`, `glass_placements.js`의 `where_ko`(배치 근거 메모).
  ⚠️ `perf_hud.js`는 일반 사용자도 설정에서 켤 수 있다(`lib/ui/settings_screen.dart:722`). 진단 기능이라 영어 하나로만 두는 안도 있다(결정 필요 사항 아님, design.md에 추천만).

### C. 데이터
| 파일 | 내용 | 분류 |
|---|---|---|
| `lib/domain/prayer_data.dart` | 묵주기도 기본 기도 8편(성호경·사도신경·주님의 기도·성모송·영광송·구원을 비는 기도·성모 찬송·성모 찬송 마침 기도) + 20단 제목·묵상문 + 신비 이름 4 = 60 | PRAYER_OFF(『가톨릭 기도서』) |
| `lib/app/prayer_text_short.dart` | 「외운 기도 짧게」 첫 줄 6 | PRAYER_OFF(파생) |
| `lib/domain/stations_prayers_data.dart` (원본 `data/stations_prayers.json`) | 십자가의 길 공식 기도문 125줄 | PRAYER_OFF. **한국 『가톨릭 기도서』 고유 형식**이라 다른 언어에 같은 구조의 공식 본문이 없을 수 있다(prayer_sources.md §6) |
| `lib/domain/stations_of_cross_data.dart` (원본 `data/stations_of_cross.json`) | 14처 명칭·짧은 이름·성경 장절 42 + **앱 자작 묵상·청원 29** + 그림 출처 1 | 명칭은 PRAYER_OFF, 묵상·청원은 PRAYER_APP(「사제·교구 검수 필요」라고 파일에 적혀 있음) |
| `lib/domain/liturgical_season.dart` | 전례 시기·대축일 이름 54 | PRAYER_OFF(각국 전례력 공식 명칭) |
| `lib/church/baptismal_names_data.dart` (원본 `data/baptismal_names.tsv`, 축일 포함) | **세례명 3,788** | NAME |
| `lib/church/church_constants.dart` | 세례명 검색 별칭 153(「루치아→루시아」 등 한국어 표기 변이) + 가상 성당 안내 1 | NAME / UI. 별칭은 한국어 표기 변이라 언어마다 따로 만들어야 한다 |
| `assets/church/glass_catalog.json` | 유리창 46장: 제목·위치·제작(138 NAME), 형태·해설(UI), 미확인·복원·한계 기록(171 CREDIT) | **`title_en`이 46장 모두 이미 있다**(영어 제목 재사용 가능) |
| `lib/domain/art_credits.dart`·`stations_series_data.dart`·`prayer_music_tracks.dart` | 성화·연작·성가 출처 줄, 작가·작품·소장처 | CREDIT / NAME |
| `lib/rosary3d/rosary_model.dart`·`lib/app/rosary_style.dart` | 묵주 이름·재질·소개문 | UI(소개문 일부에 신심 설명이 섞여 있다. 「"로사리오"는 "장미 화관"이라는 뜻」처럼 번역할 때 사실 확인이 필요) |

### D. 네이티브
- `android/app/src/main/AndroidManifest.xml:6` `android:label="로사리움"` → `res/values-*/strings.xml`의 `app_name`으로 옮겨야 한다. 지금은 `values/`에 문자열 자원이 하나도 없다.
- `ios/Runner/Info.plist:6` 마이크 권한 문구 → `InfoPlist.strings`(언어별).
- 알림·위젯·토스트(Kotlin) 문구: **없음**(Kotlin 소스에 한글 문자열 없음, 매니페스트 주석만).

### E. 법률
- `lib/auth/legal_docs.dart`: 이용약관·개인정보처리방침·계정 삭제 안내 등 4개 문서(raw 문자열, 12,751자). 원본은 `docs/legal/*.md`, 생성기는 `lib/auth/tool/gen_legal_docs.py`. **문서 머리에 「초안, 법률 검토 필요」라고 적혀 있다.**
- `lib/auth/legal_texts.dart`: 동의 항목 카드(제목·요약·목적·보관·거부·철회) 62.
- 한국 개인정보보호법 기준 문안이라 EU·영국(GDPR), 미국(CCPA·COPPA), 브라질(LGPD)은 **번역이 아니라 법역별 문안**이 필요하다(design.md §10).

### F. 성당 카탈로그 `modelNote`
- 11개 성당, 6,083자. 「실제와 이렇게 다르다」를 밝히는 법적 고지 성격의 안내문이라 **의미가 정확해야** 한다(번역 + 원어민 검수 필수).
- 성당 이름은 그 나라 공식 이름을 쓴다(design.md §9). 예를 들어 「성 밖의 성 바오로 대성전」은 it `Basilica di San Paolo fuori le Mura`, en `Basilica of Saint Paul Outside the Walls`.
- 「우리 본당」(가상 본당)·「명동대성당」 등 한국 성당의 영어 표기는 천주교 서울대교구 공식 영문 표기를 확인해야 한다.

## 2. 방법(재현 가능)

스크립트는 전부 `/tmp/claude-0/-home-user/127c52ad-6e6f-576e-8168-2e8eda5aa1ed/scratchpad/i18n/tools/`에 있다.

1. `extract.py <dart|js> <파일…>`: 직접 짠 렉서로 문자열 리터럴(`'…'`·`"…"`·`'''…'''`·`r'…'`·JS 템플릿)을 뽑는다. `//`와 `/* */` 주석은 건너뛰고, 보간 `${…}`/`$name`은 `{}`로 바꿔 표시한다. **Dart에서 이어 붙인 인접 리터럴은 하나로 합친다**(`'a' 'b'`). 한글(가–힣, 자모)이 한 글자라도 든 것만 남긴다.
   → `dart.jsonl` 2,767건, `js.jsonl` 437건(`three.min.js` 제외)
2. `classify.py`: 파일 기본값 + 앞 문맥(인자 이름 `label:`·`title:`·`modelNote:` 등, `debugPrint(`·`assert(`·`console.warn(` 등)으로 분류한다. 덩어리 문자열은 펼쳐서 센다. 세례명은 줄 단위, 법률 문서는 빈 줄 기준 문단 단위다. `glass_catalog.json`은 화면에 쓰이는 칸만 넣었다(`lib/glass/glass_catalog.dart`의 파서와 `glass_info_sheet.dart`가 읽는 칸 기준). 네이티브 2건은 손으로 더했다.
   → `classified.json`
3. `overlap.py`: reuse.md의 겹침 측정 → `overlap.tsv`

**한계(정직하게):**
- 분류는 규칙 기반이다. 파일·칸마다 표본을 눈으로 확인했지만 낱개 오분류는 있을 수 있다. 예를 들어 `stats_format.dart`의 요일 한 글자는 UI로 셌고, `liturgical_season.dart` 54개를 전부 공식 명칭으로 셌지만 그 안에 설명문이 몇 개 섞였을 수 있다.
- 한글이 없는 사용자 문구(`OK`, 숫자+기호)와, 한글 없이 데이터를 받아 그리는 JS는 세지 않았다.
- 같은 문장을 조각으로 이어 붙이는 자리(`'$a · $b'` 등)는 조각 단위로 셌다. 실제 ARB 키 수는 조각을 문장으로 합치면 조금 줄고, 복수형을 나누면 조금 는다. **예상 키 수: 약 1,500~1,700개.**
