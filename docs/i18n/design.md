# 로사리움 다국어 설계(권장안)

> 작성: Claude Opus 5.5 (설계 조사, 코드 수정 없음) · 2026-11-23(UTC) · 근거 수치: inventory.md, reuse.md · 기도문 출처: prayer_sources.md
> 이 문서에 반영한 사용자 결정 4건:
> ① 대상 언어: 영어(필수), 스페인어, 포르투갈어, 이탈리아어. 라틴어는 기도 언어로만.
> ② **포르투갈어는 승인을 받은 뒤 넣는다.** 관문 뒤에서 준비만 하고, 순서는 맨 뒤(보류).
> ③ **라틴어는 설정 토글 「라틴어로 기도」 하나로 넣는다**(기본 꺼짐). 기도 언어 선택기를 따로 두지 않는다.
> ④ **한국어가 아닌 기도문과 라틴어는 소리 내어 읽지 않는다.** 글로만 보여 준다. 한국어 선창 음성은 그대로 둔다.

## 1. 한 줄 결론

**Flutter `gen-l10n`(ARB) + 독서공방식 마스터 TSV 한 장으로 UI를 다국어화한다. 기도문은 번역 체계와 분리해 「언어·국가 변종별 공식 본문 파일(출처·허락 상태 포함)」로 따로 싣는다.** 언어와 기도 변종은 `ReleaseGate`에 관문을 둬서 준비 중인 것은 배포 빌드에 보이지도, 실리지도 않게 한다.

## 2. UI 문구: gen-l10n + 마스터 TSV

### 2-1. 고른 이유
| 안 | 장점 | 단점 | 판정 |
|---|---|---|---|
| **`flutter gen-l10n` + ARB**(권장) | 공식 도구이고 이미 `flutter_localizations` 의존이 있다. **키 누락이 컴파일 시점에 잡힌다**(독서공방의 동적 키 사고가 구조적으로 준다). ICU 복수형·성별·자리표시를 쓸 수 있고, ARB는 번역 도구·외부 검토자가 읽는 표준 형식이다 | ARB(JSON)는 사람이 표로 보기 불편하다. 빠진 키는 템플릿 언어 값으로 채워진다(아래 2-3) | **채택.** 표는 TSV로 따로 둔다 |
| `slang` | 타입 안전, CSV/JSON, 기본 언어 대체 전략 | 서드파티라 Flutter 판을 올릴 때 위험이 있다. ARB 생태계 밖이다 | 보류 |
| `easy_localization` | 실행 중 JSON | 문자열 키라 누락이 실행 중에야 드러난다. 독서공방 `tr()`의 약점을 그대로 옮긴다 | 기각 |

### 2-2. 파일 배치
```
l10n/strings.tsv          # 마스터: key  ko  en  es  it  pt  (+ @meta 열: 설명·product 표시·최대 길이)
l10n/product_names.json   # 제품 객체 명칭표(언어별)
tools/l10n/tsv2arb.py     # TSV → lib/l10n/app_<lang>.arb 생성(직접 고치지 않음)
tools/l10n/church_js.py   # TSV의 church.* 키 → assets/church/i18n_<lang>.js
lib/l10n/app_ko.arb       # template-arb-file (한국어가 원본)
l10n.yaml                 # arb-dir, template-arb-file: app_ko.arb, output-class: L10n, nullable-getter: false
```
독서공방처럼 **사람이 보는 정본은 TSV 한 장**이고, ARB와 JS 사전은 생성물이다. 「원본 하나 → 생성기」라는 로사리움의 기존 관례(`build_stations.py`·`gen_legal_docs.py`)와 같다.

### 2-3. 한국어 출력을 바이트 그대로 지키기(시험으로 강제)
1. **사람(모델)이 한국어를 다시 타이핑하지 않는다.** 이관 도구(코드모드, Sonnet이 작성)가 소스 리터럴의 **바이트를 그대로** `ko` 열에 옮기고, 그 자리를 `L10n.of(context).<key>`로 바꾼다. 보간 `'$n번'`은 `{n}번`으로 바꾸고 자리표시 순서와 문장 조각은 그대로 둔다.
2. **한국어 말뭉치 보존 시험**(`test/l10n_ko_corpus_test.dart`): 이관 전에 `tools/extract.py`로 뜬 한국어 UI 문자열의 다중집합을 `test/fixtures/ko_corpus_before.json`에 얼려 둔다. 이관 후 「`app_ko.arb` 값 + 아직 소스에 남은 리터럴」의 다중집합과 **바이트까지 같아야** 통과한다. 보간 자리는 `{}`로 맞춰 비교한다.
3. **한국어 렌더 스냅샷**: 주요 화면을 `Locale('ko')`로 위젯 시험에서 띄우고, 모든 `Text`/`RichText` 글자를 화면별 JSON으로 저장해 비교한다. 독서공방 `ko-render-snapshot`과 같은 규칙으로 **`--update`로 덮지 않는다.** 대표 화면 몇 개는 골든 이미지로도 비교한다.
4. 한국어 기기의 언어 결정 경로가 지금과 같은지(→ `ko`)도 시험으로 못박는다(§3).
5. 템플릿을 `ko`로 둔 결과, 다른 언어에서 키가 빠지면 **한국어가 새어 나온다**(gen-l10n은 빠진 메시지를 템플릿 값으로 채운다 — 착수 때 실측으로 확인할 것). 그래서 **출시 언어는 빠진 키 0을 시험으로 강제**한다. 관문 뒤의 준비 중 언어는 생성기가 빈칸을 `en` 값으로 채워 개발용 빌드에서도 한국어가 보이지 않게 한다(채운 목록은 `l10n/untranslated_<lang>.txt`에 남긴다).

### 2-4. 작업 단위
- UI 1,424 + 동적 210 = **고유 1,634 → ARB 키 약 1,500~1,700개.** 출현 2,092곳(UI 1,857 + DYN 235)을 약 100개 파일에서 바꾼다.
- 동적 문구 중 **복수형 후보 49개**(`{n}번`·`{n}일`·`{n}단`·`{n}명` 등)는 ICU `plural`로 바꾼다. 한국어는 `other` 하나만 써서 출력이 같게 유지한다. **날짜 꼴 22개**는 `DateFormat`으로 옮긴다(§8).
- 한국어 문법을 코드로 다루는 세 곳(`[을를] 묵상합시다` 정규식)은 데이터 칸(`short`)으로 바꾼다(§5).

## 3. 언어 결정·대체 규칙

| 단계 | 규칙 |
|---|---|
| UI 언어 후보 | `ko`, `en`, `es`, `it`, (`pt`: 관문 뒤) |
| 결정 | ① 안드로이드 13+ 앱별 언어(시스템 설정, `res/xml/locales_config.xml`) 또는 기기 언어 목록을 순서대로 본다 ② **언어 코드로 맞춘다**(es-MX → es) ③ 맞는 것이 없으면 **`en`**(한국어가 아니다) ④ 관문 뒤 언어(`pt`)는 배포 빌드에서 「없는 언어」로 취급 → en |
| 한국어 기기 | 지금과 같이 `ko` |
| **기존 설치 사용자**(권장안 — 결정 내용과 영향) | 지금까지 한국어 전용 앱이었으므로, **업데이트 첫 실행 때 이미 기록이 있는 설치는 UI를 `ko`로 고정**(`ui_locale=ko` 저장)한다. 새 설치만 기기 언어를 따른다. 영향: 영어 기기를 쓰던 한국인 사용자가 갑자기 영어 화면을 보지 않는다. 되돌리는 법: 이 고정을 빼면 모두 기기 언어를 따른다. 고정을 넣으면 앱 안에 「앱 언어」 항목이 있어야 사용자가 바꿀 수 있다. 이 항목은 **UI 변경이라 시안을 보이고 허락을 받는다**(§5-0-2). 안드로이드 13+에서는 시스템의 앱별 언어 설정만으로도 바꿀 수 있다 |
| 기도 변종(UI 언어 + 기기 국가) | ko→`ko-KR` · en: GB·IE→`en-GB`, 그 밖→`en-US` · es: ES→`es-ES`, 그 밖→`es-419` · it→`it-IT` · pt: BR→`pt-BR`, 그 밖→`pt-PT`(앙골라·모잠비크 등은 유럽 포르투갈어 표기) |
| 라틴어 토글 켬 | UI 언어와 상관없이 기도 변종 = `la`(§6) |
| 변종 안 항목이 빠졌을 때 | **같은 언어 안에서만** 대체한다(en-GB → en-US, es-419 → es-ES). **다른 언어나 한국어로는 절대 넘어가지 않는다.** 언어 전체의 기도문이 없으면 그 언어는 출시할 수 없다(시험) |

## 4. WebView(성당 장면) 문구 경로

**권장: TSV의 `church.*` 키 → 생성 파일 `assets/church/i18n_<lang>.js`(`window.ChurchI18n.dict[lang] = {...}`) + Flutter가 언어를 알려 준다.**
1. `index.html`이 `i18n_ko.js`·`i18n_en.js`·… 를 `<script>`로 싣는다. 관문 뒤 언어 파일은 `tools/release_hidden_assets.txt`에 넣어 배포 번들에서 뺀다.
2. Flutter는 장면을 초기화하기 전에 기존 `ChurchAPI` 호출 경로(`church_scene_controller.dart`의 `runJavaScript(churchApiScript(...))`, `bridge.js`가 이미 호출을 줄 세운다)로 `ChurchAPI.setLang('en')`을 보낸다. 주소창 인자는 `loadFlutterAsset`이 받지 않으므로 쓰지 않는다.
3. JS는 `T(key, fallbackKo)`로 읽는다. 지금의 `label_ko`·`go_ko` 칸은 **한국어 원본으로 남겨 두고**, 키는 `church.<성당id>.level.<levelId>`처럼 id에서 만든다(데이터 파일을 언어마다 복제하지 않는다).
4. 캔버스 글자(`world.js` 「내 초」)와 3D 라벨은 `label_fit.js`가 길이를 맞춘다. Pretendard에는 라틴 문자가 들어 있어 글꼴은 바꾸지 않아도 된다. 다만 **악센트(á ñ ã ç à)는 착수 때 실측**해야 한다.
5. 성당 이름·소재지(`ch_*.js`의 `info`)는 Dart `church_catalog.dart`와 겹친다. **고유명은 Dart 쪽 하나를 정본**으로 두고 JS에 내려 준다.
6. 진단용 `perf_hud.js`(68개)는 **영어 한 벌만** 두기를 권한다. 진단 기능이라 번역 가치가 낮다. 한국어 화면에는 지금 문구를 그대로 둔다.
7. 시험: `assets/church/*.js` 한글 리터럴 래칫(독서공방 `i18n-scan`의 JS판을 거의 그대로) + en으로 띄운 장면에서 라벨 한글 0.

멀티플레이 프로토콜(`lib/church/net/church_protocol.dart`)은 글을 주고받지 않는다. 세례명은 **인덱스**로 오간다. 그래서 언어가 다른 사용자끼리 같은 방에 있어도 각자 자기 언어로 이름을 본다. 서버는 바꿀 것이 없다(확인: 프로토콜 소스에 한글·자유 문장 칸 없음).

## 5. 기도문: 언어·변종별 공식 본문 파일

### 5-1. 원칙
- **한국어에서 번역하지 않는다.** 언어·변종마다 공식 출처의 본문을 글자 그대로 싣는다(prayer_sources.md).
- 구조(어떤 기도가 어떤 순서로 나오는지)는 언어 공통이고, **본문·제목·선창/후창 경계·짧은 형태는 변종마다 다르다.** 예: 한국어 구원을 비는 기도에는 「연옥 영혼을 돌보시며」가 있지만, 영어 공통형(「O my Jesus…」)에는 그 구절이 없다. 그래서 줄 수도 경계도 다르다.

### 5-2. 스키마(`data/prayers/<variant>.json` → 생성 Dart `lib/domain/prayers/gen/prayers_<variant>.g.dart`)
```json
{
  "variant": "en-US", "language": "en", "schema": 1,
  "release": "released | hidden",
  "prayers": {
    "our_father": {
      "title": "The Lord's Prayer",
      "lines": ["Our Father, who art in heaven,", "…"],
      "responder_start": 5,
      "short": {"leader": "Our Father, who art in heaven, …", "responder": "Give us this day our daily bread, …"},
      "ends_with_amen": true,
      "source": {
        "url": "https://…", "publisher": "…", "authority": "USCCB | ICEL | CBCK | LEV | CEI | …",
        "work": "Compendium of the CCC, Appendix A", "edition": "2005", "section": "…",
        "retrieved": "2026-11-23", "text_sha256": "…"
      },
      "license": {
        "status": "public_domain | official_free_use | permission_granted | permission_requested | unknown",
        "holder": "…", "basis": "traditional text predating 1900 / written permission dated …",
        "contact": "…", "evidence": "docs/legal/permissions/<file>", "checked_by": "…", "checked_at": "…"
      },
      "verify": {"verifier": "사람 이름 또는 모델 이름", "method": "출처와 글자 단위 대조", "date": "…", "result": "일치"}
    }
  },
  "mysteries": {
    "joyful": {"name": "The Joyful Mysteries", "days": "…",
      "items": [{"title": "The Annunciation", "short": "Annunciation", "announce": null, "scripture": "Lk 1:26-38", "source": {…}}]}
  },
  "stations": {"titles": [...], "versicle": "…", "response": "…", "opening": null, "source": {…}},
  "liturgical": {"advent": "Advent", "…": "…"}
}
```
- `announce`: 한국어의 「…을 묵상합시다」처럼 **공식 신비 선포문이 있는 변종만** 채운다. 없으면 `null`이고 화면은 제목만 보여 준다. `short` 칸이 지금의 정규식(`[을를] 묵상합시다`)을 대신한다.
- `responder_start`: `lib/domain/prayer_splits.dart`의 줄 번호를 변종마다 옮긴 것이다.
- **한국어 `ko-KR.json`은 지금 `prayer_data.dart`·`prayer_text_short.dart`·`prayer_splits.dart`·`stations_prayers.json`·`liturgical_season.dart`에서 기계적으로 만든다.** 생성 Dart가 지금 상수와 **바이트까지 같은지** 시험으로 비교한다. 출처 칸은 이미 있는 `docs/church/PRAYER_VERIFICATION.md`(대조일 2026-11-15)의 내용을 옮긴다.
- 지문 잠금: `text_sha256`이 본문과 다르면 시험이 실패한다. 본문을 고치려면 출처를 다시 대조하고 `verify`를 새로 써야 한다.
- 출시 조건(시험): `release: released`인 변종은 모든 항목의 `license.status`가 `public_domain`·`official_free_use`·`permission_granted` 가운데 하나여야 하고, `source.url`·`retrieved`·`verify`가 비어 있으면 안 된다.

### 5-3. 십자가의 길
- 14처 **명칭**은 전통 명칭이 언어마다 있다(전통 명칭은 공유 저작물, 출처는 각 주교회의·교구 기도서).
- **기도문**(`data/stations_prayers.json` 125줄)은 한국 『가톨릭 기도서』 고유 구성이다. 다른 언어에는 「같은 구조의 단일 공식본」이 없을 수 있다. 권장안: 다른 언어는 **어디서나 공통인 계응**(en 「We adore you, O Christ, and we praise you. / Because by your holy cross you have redeemed the world.」 형태) + 주님의 기도·성모송·영광송만 공식 본문으로 싣고, 처별 묵상은 앱 자작 묵상(PRAYER_APP 29개, 번역 + 사제 검수)을 쓴다.
- 한국어 화면은 지금 그대로다.

## 6. 라틴어: 토글 「라틴어로 기도」

| 항목 | 설계 |
|---|---|
| 설정 | `prayer_latin`(bool, 기본 false). 자리는 설정의 기도 묶음. **위치·문구는 UI 변경이라 시안을 보이고 허락을 받는다**(토글이 있다는 것 자체는 사용자가 정했다) |
| 켜면 | 기도 변종 = `la`. 기도 본문과 **기도 제목**(「Pater Noster」·「Ave Maria」·「Gloria Patri」·「Salve Regina」·「Symbolum Apostolorum」), **신비 이름**(「Mysteria gaudiosa」 등, Compendium 부록의 라틴어)이 라틴어가 된다. 메뉴·버튼·안내 같은 **UI는 UI 언어 그대로**다 |
| 신비 묵상문 | **권장: 라틴어 제목 + UI 언어의 보조 줄.** 라틴어에는 한국어 「…을 묵상합시다」에 해당하는 공식 선포문이 없다(확인한 범위). 그래서 단 제목은 라틴어(예: 「Primum mysterium gaudiosum: Annuntiatio」 형태, 출처 확인 필요)로 쓰고, 그 아래 작은 글씨로 UI 언어의 짧은 제목을 둔다. 한국어 UI면 지금의 「마리아께서 예수님을 잉태하심을 묵상합시다」를 보조 줄로 둔다. 영향: 라틴어를 모르는 사용자도 어느 단인지 안다. 되돌리는 법: 보조 줄을 끄면 라틴어 제목만 남는다 |
| 십자가의 길 | 라틴어 계응(「Adoramus te, Christe, et benedicimus tibi. / Quia per sanctam crucem tuam redemisti mundum.」 — 전통문, 공유 저작물 추정)과 Pater·Ave·Gloria만 라틴어로 하고, 처 명칭과 묵상은 UI 언어로 둔다 |
| 구원을 비는 기도(파티마) | 라틴어 본문은 **출처를 확정하지 못했다**(prayer_sources.md §7). 확정 전에는 이 기도만 UI 언어 기본 변종으로 보이고, 화면에 「라틴어 본문 준비 중」을 작게 표시한다. 다른 언어로 섞여 보이는 것을 숨기지 않는다 |
| 음성 | 사용자 결정 ④대로 **소리 내어 읽지 않는다**(§7). 이탈리아어 TTS로 라틴어를 읽는 대체안은 **채택하지 않는다** |
| 백업 | `lib/backup/backup_registry.dart`에 `PrefSpec('prayer_latin', _b, '설정: 라틴어로 기도', type: _bool, label: '라틴어로 기도')` 한 줄. 이 표에 넣는 것이 백업에 태우는 유일한 길이고, 빠지면 `test/backup_registry_test.dart`가 잡는다. 앱 안 언어 고정(`ui_locale`)을 넣으면 그것도 같은 방식으로 등록한다 |
| 통계·기록 | 기록(`PrayerRecord`)은 신비 id·횟수만 담아 언어와 무관하다(확인: `lib/stats/prayer_record.dart`). 바꿀 것이 없다 |

## 7. 목소리(사용자 결정 ④ 반영)

| 경우 | 동작 |
|---|---|
| 기도 언어 = 한국어(ko UI, 라틴어 꺼짐) | **지금 그대로.** 번들 선창 음성(개발용 빌드의 AI 음성 포함, 관문 규칙 그대로), 기기 음성(`ko-KR`), 직접 녹음, 신비 제목 음성 안내(`rosary_feedback.dart` `announce`) |
| 기도 언어 ≠ 한국어(en/es/it/(pt) UI 또는 라틴어 켬) | **글로만.** 선창 음성·기기 음성·직접 녹음·신비 제목 음성 안내를 모두 끈다. 기도문 TTS 호출 경로(`leader_voice.dart`·`rosary_feedback.dart announce`)는 기도 언어가 ko가 아니면 **아무 소리도 내지 않는다**(코드에서 막고 시험으로 못박는다) |
| 선창 설정 화면 | 기도 언어가 한국어가 아니면 선창 목소리 항목(목소리 고르기·녹음·음량)을 **흐리게 하고 누를 수 없게** 하고, 그 아래 한 줄을 둔다. 예: 「이 언어의 기도문은 소리 없이 글로 보여요. 한국어 기도에서만 선창 목소리를 쓸 수 있어요.」(UI 문구라 번역 대상) 숨기지 않고 끄는 이유: 있던 기능이 사라진 것처럼 보이지 않게(결정 #512), 왜 안 되는지 알려 주기 위해. **모양은 UI 변경이라 시안 확인 필요** |
| 혼자 / 선창(앞단) / 후창(뒷단) | **글로 그대로 쓴다.** `responder_start`로 앞단·뒷단을 나눠 강조하고, 넘기기는 손(누르기·넘기기)으로 한다. ⚠️ **음성이 끝나면 다음으로 넘어가는 자동 진행이 있는 흐름**(`lib/domain/leader_cues.dart` 큐 시각, `leader_voice.dart`의 말하기 끝 대기)은 한국어 음성에 묶여 있다. 그래서 착수 때 「음성 없이 진행되는 경로가 모든 모드에 있는지」를 실제로 띄워 확인해야 한다(지금은 소스로만 봤다) |
| 직접 녹음 | 녹음 자체는 언어와 무관하지만 결정 ④(글로만)를 따라 함께 끈다. 나중에 「자기 목소리 녹음은 언어와 상관없이 허용」으로 풀 수 있다(선택지로만 적는다) |
| **안내 음성(`guide_voice.dart`, 앱 소개·둘러보기 낭독)** | 사용자가 없애라고 하지 않았으므로 **남긴다.** 권장: **UI 언어를 따라** 기기 TTS로 읽는다. 시작 전에 `isLanguageAvailable`로 그 언어 음성이 있는지 보고, 없으면 조용히 건너뛰고 글만 둔다. **위험:** 기기마다 음성 품질과 발음이 고르지 않고(특히 es-419·pt-PT·it 남성/여성 음성 유무), 기도문은 글로만인데 안내만 소리가 나면 일관성이 떨어진다. 언어마다 실기기로 들어 보고 **켤지 끌지 다시 묻는 항목**으로 남긴다 |
| iOS 마이크 권한 문구 | 녹음을 쓰는 언어가 한국어뿐이어도 `InfoPlist.strings`에 언어별로 둔다 |

## 8. 숫자·날짜

- `intl` `NumberFormat.decimalPattern(locale)`(en 1,234 · es 1234/12.345 · it 1.234 · pt-BR 1.234), `DateFormat.yMMMd/MMMEd(locale)`, 요일은 `DateFormat.E`. `lib/stats/stats_format.dart`의 손으로 박은 요일은 이것으로 바꾼다. **한국어 출력이 지금과 같은지 스냅샷으로 확인한다**(intl ko의 요일·월 표기가 지금 문구와 다르면 ko만 기존 문구를 유지).
- 주 시작: `MaterialLocalizations.firstDayOfWeekIndex`(en-US 일요일, 나머지 대개 월요일) → 통계 달력·히트맵에 반영. 시각은 `TimeOfDay.format`(12/24시간).
- 「어제·오늘·N일 전」 같은 상대 날짜는 ICU 복수형으로.
- ⚠️ **전례력이 나라마다 다르다**(공현·승천의 주일 이동, 나라별 대축일: 한국 순교자, 과달루페 성모, 아파레시다 성모 등). `lib/domain/liturgical_season.dart`는 지금 한국 기준이다. 시기 이름은 변종 파일에서 가져오고, 날짜 규칙은 **보편 전례력 + 나라별 덮어쓰기**로 나중에 늘린다(이번 범위에서는 이름만).

## 9. 글자 늘어남·배치

- 한국어 대비 예상 길이: es·pt 약 +30%(사용자 제시), it +20% 안팎, en은 글자 수는 늘지만 폭은 비슷하거나 약간 넓다. 단어가 길어 줄바꿈 단위가 커지는 것이 문제다.
- 위험한 자리(소스에서 고정 크기를 확인한 곳 위주): 성당 HUD 버튼(`church_hud.dart`), 기도 화면 구슬 띠·알약(`prayer_bead_strip.dart`·`pill.dart`), 통계 타일(`stats_widgets.dart`), **공유 카드**(이미지 크기 고정, `lib/stats/text_fit.dart`), 스킨 이름, 둘러보기 말풍선(`coach_tour.dart`), 3D 라벨(`label_fit.js`). 그리고 **신비 이름이 길다.** 예: 「The Coronation of Mary as Queen of Heaven and Earth」, 「La Coronación de María como Reina y Señora de todo lo creado」.
- 독서공방 결정 #357의 기준을 그대로 쓴다. 늘어나는 칸 → 줄바꿈 → 줄임말 → 「…」 순서이고, 고정 높이와 장평 압축은 쓰지 않는다. 라틴 문자는 하이픈(`hyphenation`)을 쓰고, 한국어 `keepAll`은 그대로 둔다(최근 커밋 `397c898` 「성당 이름이 낱말 가운데서 끊기지 않게」와 같은 원칙).
- **만들기 전에 잰다.** 가짜 긴 언어(모든 문구 +40%, 악센트 포함) × 글씨 85~200% × 폭 344/412dp로 위젯 시험 훑기를 돌린다. 판정: `RenderFlex overflowed` 예외 0, 허용 목록 밖 말줄임 0. 실제 언어가 들어오면 같은 훑기를 다시 돈다.

## 10. 고유명사 정책

| 대상 | 정책 | 방법 |
|---|---|---|
| 세례명 3,788 | **그 언어의 공식·관용 성인 이름**(예: 가롤로 보로메오 → en Charles Borromeo, es Carlos Borromeo, it Carlo Borromeo, la Carolus Borromaeus). 한국 성인은 시성 때 교황청이 쓴 표기(예: 「Andrew Kim Taegon」) | 인덱스(= 통신 값)는 그대로 둔다. 인덱스마다 **성인 식별자**(축일 `data/baptismal_names.tsv` + 이름 → Wikidata 항목)를 붙이고, 언어별 이름표는 Wikidata 라벨(CC0)에서 받는다. 동명이인·축일 여러 개는 모호 목록으로 남겨 사람이 정한다. 빈 칸은 라틴어형으로 대체하고, 그것도 없으면 그 이름을 그 언어 목록에서 숨기지 않고 한국어 로마자를 쓴다(결정 필요 시 추천안대로 진행) |
| 세례명 검색 별칭 | 한국어 별칭 153개는 한국어 전용. 언어별 변이(Teresa/Theresa, Giuseppe/Joseph 등)는 새로 만든다 | Wikidata 별칭(aliases) + 언어 규칙 |
| 성당 이름 | **그 성당·교구가 쓰는 공식 이름**을 쓴다. 그 언어로 굳어진 공식 이름이 있으면 그것(en St. Peter's Basilica, it Basilica di San Pietro in Vaticano). 한국 성당은 교구가 공표한 영문 표기(명동대성당 → 서울대교구 공식 영문명 확인 필요). 정보 화면에 현지 원어 이름을 함께 적는다 | `church_catalog.dart`에 `name: {ko, en, es, it, pt, local}` 칸 |
| 성인(카탈로그 인물 10명 등)·작가·작품 | 성인은 위와 같다. 작가는 미술사 표준형(Fra Angelico). 작품 제목은 소장처 공식 제목을 그 언어로 쓰고, 없으면 원제를 쓴다. **출처 줄의 라이선스 문구는 원문 그대로** 둔다(CC BY 표시 의무) | |
| 앱 이름 | **권장 「Rosarium」(라틴어, 모든 언어 같게)**, 한국어는 「로사리움」 그대로. 브랜드라 **사용자가 고른다**(독서공방 §10의 멈춤 자리와 같다) | ARB `appName` + 네이티브 `app_name` 하나의 출처 |

## 11. 법률 문서와 스토어 등재

- **법률은 번역이 아니라 법역별 문안이다.** 지금 문서는 한국 개인정보보호법 기준 초안이다(파일 머리에 「법률 검토 필요」). 기도 기록은 종교 정보라서, GDPR 제9조(특수 범주, 명시적 동의)·UK GDPR·브라질 LGPD(민감 정보)·미국 주법(CPRA 민감 정보)에 각각 맞춰야 한다. 순서: Sonnet이 법역별 초안을 쓴다 → **변호사 검토(사람 필수)** → 「언어별 판본과 한국어판이 다를 때 무엇이 우선하는지」 조항. 동의 화면 문구(`legal_texts.dart`)도 같은 검토를 받는다.
- **카카오 로그인**은 한국 시장 기능이다. 다른 언어에서 보일지는 언어가 아니라 시장 축으로 정한다(독서공방 §1-z ②의 「축 둘」).
- **스토어 등재**: 지금 원고가 없다. 언어마다 번역이 아니라 그 언어로 새로 쓴다(제목 30자·짧은 설명 80자·전체 설명). 데이터 보안 양식 답안(`store_disclosures.md`)은 언어 공통이다. 등재 로케일: en-US, en-GB, es-ES, es-419, it-IT, (pt-BR, pt-PT 보류). 캡처는 `integration_test`로 언어마다 찍는다. 제목과 짧은 설명은 **사용자가 고른다.**

## 12. 언어 관문(`ReleaseGate`) — 승인 전 언어를 숨긴 채 준비

`lib/app/release_gate.dart`의 동의 전 성당(`pendingConsentChurchIds`) 방식을 그대로 늘린다.
```dart
// ── 7. 승인 전 언어·기도 변종 ──
/// 숨기는 이유: 그 언어 공식 기도문의 사용 허락(주교회의·저작권자) 회신 전이다.
/// 풀리는 조건: 아래 표의 승인이 모두 `docs/legal/permissions/`에 기록되고 기도 파일의 license.status가 바뀐 뒤.
static const Set<String> hiddenUiLocales = {'pt'};
static const Set<String> hiddenPrayerVariants = {'pt-BR', 'pt-PT'};
static Iterable<Locale> uiLocales(Iterable<Locale> all) =>
    showAll ? all : all.where((l) => !hiddenUiLocales.contains(l.languageCode));
static bool prayerVariantVisible(String v) => showAll || !hiddenPrayerVariants.contains(v);
```
- 배포 빌드는 그 언어를 `supportedLocales`·`locales_config.xml`에서 뺀다. `locales_config.xml`은 빌드 때 생성하고, `tools/build_dev_apk.sh`가 개발용에서만 더한다.
- 기도 파일·`i18n_pt.js`는 `tools/release_hidden_assets.txt`에 넣는다. `tools/check_release_apk.sh`가 배포 APK에 없는지 이미 검사하는 구조다.
- 시험: `release: hidden`인 변종이 배포 빌드 목록에 없고, 그 언어의 ARB가 배포 `supportedLocales`에 없다.

### 언어별로 필요한 승인(상세 연락처는 prayer_sources.md)

| 언어·변종 | 필요한 승인 | 상태 |
|---|---|---|
| ko-KR(이미 출시 중) | 한국천주교주교회의: 『가톨릭 기도서』 전재 승인(cbck.or.kr/Copyright, 기존 법률 검토 항목) | 기존 과제 |
| en-US | 공유 저작물(전통문)만 쓰면 허락 불필요(추정). **ICEL 2010 사도신경·마침 기도를 쓰면 ICEL 허락**(permission@eliturgy.org). USCCB 웹 본문을 베끼면 USCCB 허락. 앱 출판물로서의 교회 인가(임프리마투르) 여부를 교구에 문의 권장 | 미요청 |
| en-GB/IE | 위와 같음 + 잉글랜드·웨일스 주교회의 전례국(Liturgy.Office@cbcew.org.uk), 아일랜드 주교회의 | 미요청 |
| es-ES | 스페인 주교회의(CEE) 전례위원회: 2016 『Misal Romano』 본문을 쓸 때 | 미요청 |
| es-419 | CELAM 전례부 / 멕시코 주교회의(CEM). 멕시코 전례서 저작권은 CEM·USCCB 공동 표기 사례가 있다 | 미요청 |
| it-IT | 이탈리아 주교회의(CEI) 전례국. 2020 『Messale Romano』 Padre nostro·Gloria 본문(© Fondazione di Religione Santi Francesco d'Assisi e Caterina da Siena) | 미요청 |
| la | 전통문은 공유 저작물. 교황청 문서(Compendium·『동정 마리아의 묵주기도』)에서 옮기면 바티칸 출판사(LEV) | 미요청 |
| 신비 이름(전 언어) | 『동정 마리아의 묵주기도』(2002)·Compendium = LEV 저작권. 짧은 이름은 사실 정보에 가깝지만 허락을 받아 두기를 권한다 | 미요청 |
| **pt-BR(보류)** | 브라질 주교회의(CNBB) 전례문 위원회(CETEL)·Edições CNBB: 2023 『Missal Romano』 본문 | **승인 후 출시** |
| **pt-PT(보류)** | 포르투갈 주교회의(CEP) 전국 전례 사무국(secretariado@liturgia.pt): 2022 『Missal Romano』 본문 | **승인 후 출시** |

## 13. 단계 계획(크기는 거친 추정)

크기: S = 하루 안, M = 2~4일, L = 1~2주(에이전트 작업 + 검수 기준, 외부 회신 대기는 뺌)

| 순서 | 묶음 | 크기 | 내용 | 끝났다는 판정 |
|---|---|---|---|---|
| 0 | **허락 요청 발송**(지금 바로, 다른 일과 나란히) | S | 위 표의 기관별 요청 편지 초안(Sonnet) → **사용자가 발송** | 발송 기록 `docs/legal/permissions/` |
| 1 | **기반**(한국어 화면 불변) | **L** | ① `l10n.yaml`·마스터 TSV·생성기 ② 코드모드로 출현 2,092곳 이관(기능별 묶음 8~10개, Sonnet) ③ 언어 결정·관문·`prayer_latin`·백업 등록 ④ 기도 변종 계층: `ko-KR.json` 생성, 지금 상수와 바이트 비교 ⑤ WebView `ChurchI18n` ⑥ 가드: 말뭉치 보존·소스 래칫·ARB 짝·한국어 렌더 스냅샷·배치 훑기(가짜 긴 언어)·기도 출처 시험 ⑦ 비한국어 기도 언어에서 음성 끄기 | **한국어 말뭉치·스냅샷 차이 0**, 소스 래칫 기준값 확정, 가짜 긴 언어 훑기 결과 목록 |
| 2 | **영어** | L | 명칭표(FABLE 안 3~4개 → 사용자 선택) → UI 1,634 번역(Sonnet 병렬 슬라이스, 독서공방 147개는 후보 표로) → 독립 검사(Opus) → en-US/en-GB 기도 파일(prayer_sources.md) → 세례명 3,788 Wikidata 대응(Sonnet 구축 + Opus 표본 검사 + 모호 목록) → 성당 이름·modelNote → 법률 초안 → 스토어 원고 → ⑤문장 외부 검토 → ⑥배치 | en 빠진 키 0, en 렌더 훑기 한글 0, 기도 파일 출처 칸 100%, 출시 스위치는 사용자 |
| 3 | **라틴어 토글** | S~M | `la.json`(전통문 + Compendium 라틴어 신비 이름), 토글 시안 → 허락 → 구축, 보조 줄 | 토글 켬/끔 두 상태 스냅샷, 백업 왕복 시험 |
| 4 | **스페인어** | M~L | UI 번역(es 하나, `tú`; 독서공방 147개 후보), es-ES·es-419 기도 파일, 세례명 es, 법률(스페인·중남미), 스토어 es-ES/es-419 | en과 같은 판정 |
| 5 | **이탈리아어** | M~L | 독서공방 재사용 0 → 번역량이 가장 많다. it-IT 기도 파일(CEI 2020), 세례명 it, 법률, 스토어 | 같음 |
| 6 | **포르투갈어(보류)** | M~L(준비) | 관문 뒤에서 UI 번역(독서공방 147개 후보)·pt-BR/pt-PT 기도 파일(허락 대기 상태로)·세례명 pt 준비. **CNBB·CEP 승인 회신 후** license.status 갱신 → 관문 해제 → 출시 스위치(사용자) | 승인 문서 + 같은 판정 |

**나란히 할 수 있는 것.**
- 0(허락 요청)은 처음부터 끝까지 나란히 간다.
- 세례명 대응표(언어 공통 식별자 작업)는 2와 나란히 간다.
- 법률 초안과 변호사 검토는 2~5와 나란히 간다.
- 1이 끝난 뒤에는 es·it·pt의 **번역 슬라이스 작성**도 한국어에서 직접 옮기므로 en과 나란히 띄울 수 있다. **단, 마스터 TSV 병합은 한 갈래씩 차례로 한다**(같은 파일 — 독서공방 결정 #659와 같은 이유).

**순서상 걸리는 것.**
- 1의 이관(코드모드)은 **기능 묶음마다 차례로** 한다. 같은 파일을 여러 에이전트가 만지지 않는다.
- 게이트·배치 훑기는 고칠 것이 없을 때 한 번 돈다.

## 14. 모델을 어디에 쓰나

| 일 | 모델 | 이유 |
|---|---|---|
| 문자열 추출·코드모드·TSV/ARB 생성기·관문·WebView 사전 구축 | **Sonnet** | 기계적 구축. 한국어 바이트 보존은 시험이 판정한다 |
| UI 번역(슬라이스 병렬, 한국어에서 직접) | **Sonnet** | 독서공방 실적 그대로 |
| **독립 검사**(자리표시·줄·한글 잔존·문장부호 전수, 호출부 확인) | **Opus**(만든 이와 다른 모델) | 「만든 이가 자기 것을 검증하면 같은 맹점을 두 번 통과한다」 |
| 기도 파일 작성(출처에서 본문 옮기기) | Sonnet이 옮기고 **Opus가 출처 원문과 글자 단위 대조** | 번역 금지 영역이라 대조가 전부다 |
| 제품 명칭표 후보·앱 이름·스토어 원고 시안 | FABLE(안 3~4개 나란히) → **사용자 선택** | 판단·시안 영역 |
| 세례명 Wikidata 대응 | Sonnet 구축 + Opus 표본·모호 판정 | 모호 목록은 사람에게 |
| 법률 문안 | Sonnet 초안 → **변호사(사람 필수)** | |
| 십자가의 길 앱 자작 묵상, 성당 `modelNote`, 묵주 소개문의 신심 서술 | Sonnet 번역 → **원어민 + 사제·교구 검토(사람 필수)** | 신앙 내용 |
| 공식 기도문의 출처·허락 상태 | **사람(공식 회신) 필수** | 기계로 잴 수 없다 |
| 문장 검토 ⑤ | 외부 검토(ChatGPT/Codex) + 원어민. **기도·전례는 원어민 가톨릭 신자 검토** 표시 | |

## 15. 주요 위험

1. **허락 회신이 일정을 정한다.** 기관 회신은 몇 주에서 몇 달 걸릴 수 있다(추정). 그래서 0단계를 지금 시작한다. 회신이 없으면 전통문(공유 저작물)만으로 출시하는 안이 대체로 남지만, 전례 개정문(it 2020 Padre nostro, pt 2022/2023 미사 경본 등)과 다른 옛 형태가 된다.
2. **세례명 3,788개**는 UI 전체보다 고유 항목이 많다. 자동 대응의 오류(동명이인)는 사용자가 「내 세례명」으로 쓰는 값이라 민감하다.
3. **기도 흐름이 한국어 음성에 묶인 자리**가 있다(자동 진행·큐 시각). 글로만 쓰는 흐름이 모든 모드에서 끊김 없는지 실제로 띄워 확인해야 한다.
4. **법률(종교 정보 = 특수 범주)**은 번역으로 해결되지 않는다.
5. **글자 늘어남**: 고정 크기 공유 카드와 3D 라벨이 먼저 깨질 것으로 예측한다(예측과 측정이 어긋나면 측정 도구부터 의심한다).
6. **기존 한국어 사용자 영향**: 언어 결정 규칙이 바뀌면 영어 기기를 쓰는 한국인 사용자가 영어 화면을 볼 수 있다. §3의 고정안으로 막는다.
