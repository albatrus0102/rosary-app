# PC 라이트맵 굽기 (Blender · CPU)

작성: Claude Opus 5.5 · 2026-11-26 UTC · 사실감 계획 ① 단계

## 0. 내 Blender 판 확인 (한 줄)

PowerShell:
```
& "C:\Program Files\Blender Foundation\Blender 5.3\blender.exe" --version
```
cmd:
```
"C:\Program Files\Blender Foundation\Blender 5.3\blender.exe" --version
```
첫 줄에 `Blender 5.3.0` 처럼 나오면 된다(3.6 이상이면 굽기가 돈다 — 주 대상은 5.3, 4.2 LTS 도 된다).
다른 곳(Steam 등)에 깔았어도 굽기 실행기가 Program Files · Steam · 레지스트리 · PATH 를 스스로 찾는다.

## 1. 굽기 — 명령 하나

먼저 브라우저(GitHub 에 로그인한 채)로 이 주소를 열어 zip 을 받는다(받은 파일 폴더 = `다운로드`):
```
https://github.com/albatrus0102/rosary-app/archive/refs/heads/share/reading-journal-house.zip
```
그다음 아래 **한 줄**을 그대로 붙여 넣는다(풀기 + 굽기 시작, 낮·밤 둘 다, 보통 화질).

PowerShell:
```
$dl=(New-Object -ComObject Shell.Application).NameSpace('shell:Downloads').Self.Path; Expand-Archive -Force "$dl\rosary-app-share-reading-journal-house.zip" "$env:USERPROFILE\house_bake"; powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\house_bake\rosary-app-share-reading-journal-house\pc_bake\run_bake.ps1"
```
cmd:
```
mkdir "%USERPROFILE%\house_bake" 2>nul & tar -xf "%USERPROFILE%\Downloads\rosary-app-share-reading-journal-house.zip" -C "%USERPROFILE%\house_bake" & "%USERPROFILE%\house_bake\rosary-app-share-reading-journal-house\pc_bake\run_bake.cmd"
```

**먼저 5분 연기 시험(권장)** — 작은 대상 2개(창가 책상 + 실내 바닥)만 아주 적은 표본으로. 위 한 줄을 한 번 돌려 풀어 둔 뒤:

PowerShell:
```
powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\house_bake\rosary-app-share-reading-journal-house\pc_bake\run_bake.ps1" -Quality smoke
```
cmd:
```
"%USERPROFILE%\house_bake\rosary-app-share-reading-journal-house\pc_bake\run_bake.cmd" smoke
```
(위 굽기 한 줄을 처음 돌리면 바로 보통 화질 굽기가 시작된다 — 연기 시험부터 하려면 그 창을 Ctrl+C 로 멈추고 연기 시험 줄을 붙인다. 멈춰도 다시 돌리면 이어진다.)

화질을 고르려면 같은 실행기에 `-Quality fast` · `-Quality high`(cmd 는 `run_bake.cmd fast` · `run_bake.cmd high`), 낮만·밤만은 `-Time day` · `-Time night`(cmd 는 `run_bake.cmd normal day`).

### Blender 를 못 찾을 때 — blender.exe 를 직접 알려 주기

PowerShell(창에서 blender.exe 를 고른다, 한 번만 — 기억한다):
```
powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\house_bake\rosary-app-share-reading-journal-house\pc_bake\run_bake.ps1" -PickBlender
```
cmd:
```
"%USERPROFILE%\house_bake\rosary-app-share-reading-journal-house\pc_bake\run_bake.cmd" pick
```
기본 자리에 깐 5.3 을 그대로 적어 두려면 — PowerShell:
```
Set-Content "$env:USERPROFILE\house_bake\rosary-app-share-reading-journal-house\pc_bake\blender_path.txt" "C:\Program Files\Blender Foundation\Blender 5.3\blender.exe"
```
cmd:
```
echo C:\Program Files\Blender Foundation\Blender 5.3\blender.exe> "%USERPROFILE%\house_bake\rosary-app-share-reading-journal-house\pc_bake\blender_path.txt"
```
찾은 Blender 와 판만 보기: PowerShell `... run_bake.ps1 -CheckOnly` · cmd `run_bake.cmd check`.

## 2. 걸리는 시간(추정)

**추정이다.** 이 키트를 bpy 5.3.0(리눅스, Xeon 2.1 GHz 4코어)으로 실제로 구워 잰 처리량 **약 1.5 M 표본·텍셀/초**(fast 낮+밤 전체 3분 20초)를
바탕으로 `텍셀 수 × (표본 + 해/달 표본)` ÷ 처리량 + 대상마다 약 1.5초로 셈했다. 보통 4코어 PC 는 약 1.2 M/초, 8코어는 약 3 M/초로 보았다.
PC·발열에 따라 ½~2배 날 수 있다 — 굽는 동안 진행 줄에 실제 남은 시간(ETA)이 계속 나온다.

| 화질 | 텍셀(한 시각) | 표본 | 4코어 낮+밤 | 8코어 낮+밤 |
|---|---|---|---|---|
| smoke(연기 시험) | 약 4 천(대상 2) | 16 + 4 | 1 분 안(대부분 Blender 시작) | 1 분 안 |
| fast | 1.29 M | 64 + 16 | 약 5 분 | 약 3 분 |
| normal(기본) | 5.15 M | 256 + 32 | 약 45 분 | 약 20 분 |
| high | 20.6 M | 512 + 64 | 약 5.5 시간 | 약 2.5 시간 |

한 시각만이면 절반. 밤새 돌린다면 `high` 를 권한다(아침이면 끝난다).

## 3. 디스크

- 풀어 둔 저장소 약 20 MB(Blender 는 이미 깔려 있다고 본다).
- 결과: fast 약 5 MB(실측) · normal 약 20 MB · high 약 80 MB(PNG) + 같은 크기의 zip. 노이즈 제거 중 임시 EXR 최대 약 270 MB(high).
- 여유 공간: normal 은 **0.5 GB**, high 는 **1.5 GB** 이상이면 넉넉하다. 메모리는 high 에서 2~3 GB 쓴다.

## 4. 끝나면 보낼 것

끝나면 탐색기가 `house_bake\rosary-app-share-reading-journal-house\pc_bake\out\` 를 열고 **`house_normal.zip`**(화질 이름)을 가리킨다.
그 zip 하나를 **채팅에 올려 주면** 된다(안에 낮·밤 라이트맵 PNG + manifest.json + uv2.bin + bake_log.txt).

## 5. 꺼졌을 때 이어 굽기

PC 가 꺼지거나 창을 닫았으면 **같은 명령을 다시 붙여 넣으면 된다.** 대상 하나가 끝날 때마다 바로 저장하고 `out\house_<화질>\state\` 에 적어 두므로
끝난 대상은 건너뛰고(로그에 `skipped`) 남은 것부터 굽는다. 풀기(`Expand-Archive -Force`·`tar`)는 `out\` 을 지우지 않는다.
`house_bake` 폴더를 지우지만 않으면 된다. 굽는 동안 실행기가 PC 절전을 막는다(화면은 꺼져도 된다).

---

## 6. 무엇을 굽는가 (기술 메모)

- 내보내기(이 저장소, Node): `node tools/lm_export.mjs` → `pc_bake/scene/`(`--check` = 최신인지만; `test/lightmap.test.mjs` 가 막는다).
  - `house.glb`: 굽기 묶음마다 메시 1(배치 `solid`·`wood`·`surf_*` …, 빌더 판 `plane_*`, 그네 `swing_*`). TEXCOORD_0 = TEXCOORD_1 = 라이트맵 uv2,
    COLOR_0 = 반사율(정점 색 × 재질 색 × 사진 질감 평균). 유리·발광·데칼·식물 카드·앱 정원은 뺐다(창은 실제 구멍이라 빛이 들어온다).
  - uv2: `tools/lm_unwrap.mjs` — 평면에 가까운 이웃 삼각형을 조각으로 묶어 투영, 32 텍셀/m(normal), 집에서 6 m 밖은 거리에 반비례로 줄임, 조각 둘레 4 px 여백, 선반 싣기(겹침 없음 — 시험).
  - `house_lights.json`: 등불 18(펜던트 2·천장 다운라이트 7·처마 다운라이트 3·간판 벽등·헛간 등·가로등·책상 등·플로어 스탠드·카운터 펜던트) — 종류·자리·색·낮/밤 세기·원뿔,
    창 포털 3(통창·정면 창·문), 해(낮 11시)·달(밤 22시) 방향·조도, 하늘 위/아래 복사휘도. 등 종류는 `ch_house.js` 의 `addGlow({bake})` 에 적혀 있다.
- 굽기(`bake.py`): Cycles CPU, 확산(직접+간접, 색 없음). 해/달은 앱이 실시간 그림자로 그리므로 해/달 직접광만 따로 구워 뺀다(그래서 걷는 사람 그림자가 남는다).
  ×π(확산 패스 = 조도/π) → OpenImageDenoise → RGBM 8비트 PNG(범위 64, 감마 2.2). 단위: 점·원뿔 W = 4π × three 세기, 해 W/m² = 조도.
  판마다 다른 API(합성기 노드 트리 5.x/4.x, 굽기 인자, glTF 가져오기 인자, 포털 속성)는 hasattr/try 로 고른다.
- 앱(`web/lightmap.js`): `web/lightmaps/house/` 에 zip 안 `house_<화질>/` 내용(manifest.json·uv2.bin·day/·night/)을 풀면 붙는다(지금 있는 빈 manifest.json 을 덮어쓴다).
  빈 manifest 면 지금의 구운 AO·빛 번짐 그대로. 이 키트로 fast 를 실제로 구워 앱에 붙여 33 대상 모두 붙고 셰이더 오류 0 인 것을 헤드리스 Chromium 에서 확인했다
  (`docs/shots/lightmap-fast-check.jpg`: 왼쪽 위 = 굽기 전 실내 낮, 그다음 = fast 라이트맵 실내 낮 · 실내 밤 · 외관 낮 · 외관 밤).
