# 개발용 임시 유리 체계 (E-4)

> 2026-11-15. 성당 창에 **개발용 임시 시안 그림**을 걸어 보는 체계다. 모든 성당이 같은 구조를 쓴다(첫 적용: 밀라노 55장).
> 시안은 실제 작품이 아니다. **일반(배포) APK 에는 0KB — 들어가지도, 보이지도 않는다.** 진본 사진 창(G-29, `GLASS_PLACEMENTS.md`)과는 완전히 따로다.
> 밀라노 적용 결과는 `MILAN_55_RESULT.md`(자동 생성), 계획은 `MILAN_55_PLACEMENT.md`, 실제 창 조사는 `MILAN_GLASS_RESEARCH.md`.

## 1. 구조

```
art/glass_<세트>/textures/DEV-0xx.png        시안 원본(번들 밖)
        │  python3 tools/glass_bundle/devglass_pack.py <세트>      원본 해상도 그대로 WebP → data URI
        ▼
assets/church/dev/                           ← pubspec.yaml 의 assets 에 없다(개발용 APK 빌드만 임시로 넣는다)
  gpack_dev_<세트>.js      그림 팩  window.ChurchDevGlassPack['gpack_dev_<세트>.js'] = {set, kind:'orig', images:{'DEV-001':{w,h,src}}}
  devglass_<성당>.js       대응표   어느 DEV 를 어느 개구부(anchor key)에 거는가 — **배치의 유일한 원본**
  devglass.js              로더     ChurchWorld.create 에 끼어들어 판을 걸고, world.dispose 직전에 해제
  ch_qa_glass.js           QA Gallery 빌더(성당 id 'qa_milan55')
  devglass_boot.js         진입점   index.html·test.html 이 URL 에 devglass=1 이 있을 때만 읽는다

성당 빌더(ch_<성당>.js)  ──  ctx._.glassAnchors = [{key, kind:'glass'|'door', x, y, z, nx, nz, yaw, w, h, sill, spring, apex, lights, photoH}]
                              개구부마다 하나. x·z = 유리 평면 가운데, (nx, nz) = 실내 쪽 법선. 빌더는 devglass 를 모른다(플래그와 무관하게 늘 내보낸다).
```

- **빌더는 anchor 만 내보낸다.** 유리는 한 배치로 합쳐져 창별 Mesh 가 없으므로, 창별 판은 anchor 의 위치·방향·크기로 따로 붙인다.
  밀라노: `windowPanel({key, …})` 이 `anchorAdd()` 로 등록한다. key 체계는 `node tools/church_web/milan_openings.mjs`.
- **로더(`dev/devglass.js`)** 는 `world.js`·`main.js` 를 고치지 않는다. `ChurchWorld.create` 를 감싸 성당을 지은 직후 붙고, `world.update` 에서 페이드·밤 밝기를, `world.dispose` 직전에 판·질감·재질 해제를 한다.
  - 판: 그림 비율 그대로(`contain`, 늘리지 않음), 유리 평면에서 실내 쪽 3cm. 가로축 = (nz, −nx) → 실내에서 볼 때 왼→오(뒤집히지 않음).
  - 그림이 덮지 못한 곳: `rest:'lead'`(어두운 납틀색 뒤판, 1.8cm 앞) 또는 `'glass'`(기존 절차적 유리가 보임). 기본은 덮는 비율 75% 이상 lead.
  - 재질: 사진 창과 같은 유리 셰이더(`ChurchGlassView.shaders`) — 조명·안개·톤매핑 없음, 밤에는 어둡게.
  - 그리기: 긴 변 512px 이하 그림은 실행 중 아틀라스 한 장으로 묶어 draw call 1, 그보다 큰 그림은 1씩, 뒤판 1.
  - 모델의 창틀·문설주·가로대·몰딩은 그대로다(판은 문설주보다 뒤). 빛줄기 색도 절차적 유리의 색 그대로다.
- **창 정보 시트·'이 창:' 칩·감상 모드와 연결하지 않는다.** 시안 판은 `glass_place.js` 의 자리 목록에 없고 `glassNear`/`glassTap` 을 보내지 않는다.
- 이벤트: `{e:'devGlass', church, set, placed, total, probable, assumed, on}` — Flutter 는 `SceneEvent` 로 만들지 않고 `DevGlass.handleRaw` 가 배지 상태만 바꾼다.

## 2. 대응표 (`dev/devglass_<성당>.js`)

행 하나 = 시안 한 장. 조사 결과가 바뀌면 **행의 `anchor`·`certainty`·`evidence_ko` 만** 고친다(코드·빌더는 그대로). 그 뒤 `node tools/church_web/milan55_report.mjs`.

| 필드 | 뜻 |
|---|---|
| `dev_id`, `texture`, `px` | 시안 id, 팩 안의 그림 이름, 원본 크기(판 크기는 실행 때 팩의 실제 크기로 다시 계산) |
| `anchor` | 개구부 key. `null` = 성당 안에 걸지 않는다(QA Gallery 에만) |
| `hang:false`, `hold_ko` | 자리는 알지만 걸지 않는다(보류)와 그 까닭. 예: 성구실 방 미구현 |
| `fit` | `'contain'`(기본) \| `'cover'`(상자를 채우고 넘치는 쪽을 자름. 늘리지는 않는다) |
| `align` | `'top'`(기본: 그림 꼭대기 = 개구부 꼭대기) \| `'center'` \| `'bottom'` |
| `rest` | `'lead'` \| `'glass'` (없으면 덮는 비율로 자동) |
| `region` | `'above_photo'` = 그 창 아랫부분의 진본 사진은 두고 그 위에만 |
| `certainty` | `'confirmed'` \| `'probable'` \| `'assumed'` \| `'unplaced'` |
| `placement_evidence`, `evidence_ko` | 지시서의 근거 상태 그대로 / 이 자리에 건 근거 |
| `v_id`, `subject_ko` | 그 자리의 실제 창 번호와 주제 **후보**(텍스처 내용이 아니다) |
| `real_work_copyrighted` | 그 자리의 실제 작품이 저작권 존속 → 진본 교체 대상에서 뺀다 |
| `release_approved`, `texture_matches_historical_work` | 늘 `false`. 로더는 `release_approved !== true` 인 행을 개발 플래그 없이는 걸지 않는다 |

한 anchor 에는 한 행만(둘째는 `duplicate_anchor` 로 건너뛴다). 진본 대응표(`glass_placements.js`, authentic 전용)에는 넣지 않는다 — 시험이 고정한다.

## 3. 릴리스 차단 (세 겹 + 검사)

| 겹 | 막는 것 | 어디 |
|---|---|---|
| ① 포장 | 파일이 일반 APK 에 없다 | `assets/church/dev/` 는 `pubspec.yaml` 에 없다(Flutter 는 `- assets/church/` 로 그 폴더의 파일만 싣고 하위 폴더는 싣지 않는다). `tools/build_dev_apk.sh` 만 빌드하는 동안 한 줄을 더했다가 되돌린다 |
| ② 컴파일 플래그 | Flutter 가 켜지 않는다 | `DevGlass.enabled = bool.fromEnvironment('ROSARIUM_DEV_GLASS')`(`lib/church/dev_glass.dart`). true 일 때만 장면을 `?devglass=1` 로 열고, 배지와 '더보기 > QA Gallery' 를 그린다. 일반 빌드에서는 컴파일 상수 false 라 그 코드가 빠진다 |
| ③ 실행 | 웹이 걸지 않는다 | `index.html` 은 `devglass=1` 일 때만 `dev/devglass_boot.js` 를 읽는다(없으면 그냥 건너뜀). 로더는 플래그 + 그 성당의 표 + 팩이 있어야 붙고, 행의 `release_approved !== true` 이면 플래그가 있어야만 건다. 걸리면 화면에 **'개발용 임시 시안 · 실제 작품 아님 · n/N'** |
| 검사 | 실수로 들어가면 실패 | `tools/church_web/devglass.test.mjs`(pubspec·번들 폴더·페이지 훅·코어가 dev 를 모름), `test/dev_glass_test.dart`(일반 빌드의 자산 목록·플래그), `tools/check_release_apk.sh <apk>`(APK 안의 파일·문자열·Dart 표시; CI `build-apk.yml` 이 빌드 뒤에 돌린다) |

2026-11-15 확인: 일반 APK(arm64) 29,366,670 bytes — 시안 파일 0·문자열 0·Dart 표시 0. 개발용 APK 31,498,828 bytes(+2.13MB).

## 4. 개발용 APK

```
bash tools/build_dev_apk.sh            # → build/dev-apk/rosarium-dev-<버전>-arm64-v8a.apk  (배포 금지)
bash tools/check_release_apk.sh build/app/outputs/flutter-apk/app-arm64-v8a-release.apk     # 일반 APK 에 시안이 없는지
```

- 스크립트가 하는 일: 팩이 없으면 만든다 → `pubspec.yaml` 에 `- assets/church/dev/` 를 임시로 더한다 → `flutter build apk --release --split-per-abi --target-platform android-arm64 --dart-define=ROSARIUM_DEV_GLASS=true` → `pubspec.yaml` 원복(실패·중단 때도 trap 이 되돌린다) → APK 를 `build/dev-apk/` 로 옮기고 개발용 자산이 들어갔는지 확인 → 빌드 중간물의 dev 자산을 지운다(다음 일반 빌드에 남지 않게).
- 서명·applicationId 는 일반 빌드와 같다(디버그 키, `kr.rosary.rosary_app`) → 기기에서 일반 APK 를 **덮어쓴다**. 따로 깔려면 applicationId 접미사를 주는 작업이 더 필요하다(`BACKLOG.md`).
- 안드로이드에서만 동작한다(장면을 `file:///android_asset/flutter_assets/assets/church/index.html?devglass=1` 로 연다. `loadFlutterAsset` 은 질의 문자열을 받지 않는다). **실기기 확인 필요**: 이 주소 방식은 이 환경에서 기기로 돌려 보지 못했다.
- GitHub Actions: `.github/workflows/build-dev-apk.yml`(수동 실행 전용)이 같은 스크립트를 돌려 `rosarium-dev-apk` 로 올린다.
- PC 에서 보기: `assets/church/test.html?church=milan&devglass=1`, QA Gallery 는 `?church=qa_milan55&devglass=1`.

## 5. QA Gallery (`qa_milan55`)

- 감상실과 같은 종류의 빌더(`viewing:true`: 서버·좌석·스테이션 없음), `dev/` 에만 있다. 긴 방의 양쪽 벽에 55장을 비율 그대로 건다.
- 그림은 성당 안과 **같은 로더·팩·셰이더·해제 경로**로 걸린다(이 방이 `qa_<DEV id>` anchor 를 내보낸다) → UV 방향·알파 윤곽·밝기·출입 반복 해제를 55장 전부 확인할 수 있다.
- 이름표: DEV id, 상태, 실제 창 번호(V), 성당 안 개구부 key, 근거 상태, 원본 크기. 상태 색 = 바닥 띠 색.
  PLACED(초록, 확인된 자리에 배치) · PROBABLE(주황, 개연·추정 자리에 배치) · HOLD(파랑, 자리는 알지만 보류) · UNPLACED(빨강, 위치 미확정).
- 들어가는 길: 개발용 APK 의 **더보기 > QA Gallery · 밀라노 시안 55**(일반 빌드에는 항목이 없다). 웹 조작기를 그대로 쓴다(왼쪽 끌기 = 걷기, 오른쪽 끌기 = 둘러보기).

## 6. 고해상도 그림으로 바꾸기

1. `art/glass_<세트>/textures/` 의 같은 이름 파일(`DEV-0xx.png`)을 바꾼다(RGBA, 위쪽 모서리 투명한 첨두 윤곽 권장).
2. `python3 tools/glass_bundle/devglass_pack.py <세트>` → 팩을 다시 만든다(`--check` 로 원본과 맞는지 확인).
3. 끝. 판 크기는 팩의 실제 크기로 계산하므로 대응표·코드는 그대로다(표의 `px` 는 시험용 기록이라 `devglass.test.mjs` 가 원본과 다르면 알려 준다 → 표의 `px` 를 고친다).

- 긴 변이 512px 를 넘는 그림은 아틀라스에 넣지 않고 그림마다 질감 1장·draw call 1이 된다. 1k 55장을 모두 올리면 GPU 약 84MB 다(`MILAN_55_PLACEMENT.md §3.5`) → 그 단계에서는 가까운 창만 올리는 스트리밍·압축 텍스처가 필요하다(이 체계의 범위 밖).
- **부하 시험용 리샘플 팩**(세부는 생기지 않는다, 로딩·메모리만 본다): `python3 tools/glass_bundle/devglass_pack.py milan --resample 1024` → `gpack_devrs_milan_1024.js`(그림마다 'LOAD TEST' 띠, `.gitignore` 로 커밋되지 않음). 보려면 URL 에 `devpack=rs1024`.
- 실제 작품(진본 사진)으로 바꾸는 것은 이 체계가 아니라 진본 경로(G-29: 카탈로그 + `glass_placements.js`)로 한다. 권리 확인이 먼저다(`MILAN_GLASS_RESEARCH.md §5~6`).

## 7. 다른 성당에 적용하기

1. 빌더가 개구부 anchor 를 내보내게 한다: `ctx._.glassAnchors.push({key, kind:'glass', x, y, z, nx, nz, yaw, w, h, sill, spring, apex, lights, photoH})`.
   키트 창(`ctx.window`)을 쓰는 성당은 `S_.windows` 에서 같은 값을 만들어 넣으면 된다(자리 계산은 `world.windowSlots()` 와 같다).
2. `tools/glass_bundle/devglass_pack.py` 의 `SETS` 에 원본 폴더 한 줄 → 팩 생성.
3. `assets/church/dev/devglass_<성당>.js` 대응표를 쓴다(`ChurchDevGlass.register({church, set, pack, rows})`). `dev/devglass_boot.js` 의 목록에 파일 이름을 더한다.
4. 시험: `devglass.test.mjs` 의 밀라노 시험을 본떠 anchor 중복·행 분류·판 비율을 고정한다.

## 8. 시험

| 무엇 | 어디 |
|---|---|
| 대응표 55행·원본 대조·진본 표와 분리, 팩 = 원본 해상도 | `devglass.test.mjs` |
| anchor 78개 key 중복 없음 = 측정한 개구부, 아바타 시점 순서 | 같은 파일 |
| 55행 전부 배치 또는 QA, 중복 anchor 0, 판 비율 = 그림 비율, 진본 사진을 덮지 않음 | 같은 파일 |
| devglass 끔: 빌더 출력이 플래그와 무관, 코어가 dev 모듈을 모름, 릴리스 자산에 dev 없음 | 같은 파일 + `test/dev_glass_test.dart` |
| 해제: 밀라노 ↔ QA Gallery 6회 출입, 질감·재질·지오메트리 dispose 수 = 생성 수 | 같은 파일(가짜 렌더러) + `milan55_shots.mjs --leak 3`(실제 WebGL) |
| 경당 걷기·충돌, 정문 문·창과 벽기둥, 14처 판 자리 | 같은 파일 |
| 화면(뒤집힘·늘어남·삐져나옴·z-fighting·밝기) | `milan55_shots.mjs` 캡처를 눈으로 |
