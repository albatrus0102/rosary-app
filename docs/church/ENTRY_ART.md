# 성당 입구 화면 그림 자산 (2026-11)

성당 탭의 첫 화면('입구': 큰 카드 + '다른 성당 고르기' 캐러셀)과 앱 내비게이션 레일에 쓰는 그림.
대체 규칙은 코드 한 곳(`lib/church/church_entry_art.dart`)에 있고, **같은 이름의 파일만 바꾸면** 그림이 바뀐다
(가장자리 페이드·둥근 모서리·금색 테두리는 앱이 그리므로 그림 파일에는 넣지 않는다).

## 자산 슬롯 — `assets/images/church_entry/`

| 파일 | 쓰는 곳 | 권장 크기 | 없으면 |
|---|---|---|---|
| `bg_glow.webp` | 성당 탭 머리말 오른쪽 위 배경(스테인드글라스·빛 번짐) | 가로 1280, 약 7:4 | 그리지 않음 |
| `rail_decor.webp` | 넓은 화면 레일 아래 장식(아치·촛불·백합) | 가로 360, 약 1:5.6(세로로 김) | 그리지 않음 |
| `hero_<성당 id>.webp` | 큰 카드 대표 그림(성당 내부, 16:9) | 가로 1280 | `render_<id>.webp` → `assets/church_thumbs/<id>.webp` → 성당 아이콘 |
| `thumb_<성당 id>.webp` | 캐러셀 썸네일(성당 외관, 4:3) | 가로 480 | `assets/church_thumbs/<id>.webp` → `render_<id>.webp` → 성당 아이콘 |
| `render_<성당 id>.webp` | 우리 3D 성당을 찍은 내부 샷(권리 문제 없음) | 960×540 | — |

성당 id 는 `lib/church/church_catalog.dart` 의 id(`basic`, `stpeter`, `lateran`, `maggiore`, `stpaul`, `milan`,
`florence`, `myeongdong`, …). 새 성당이 카탈로그에 추가되고 들어갈 수 있게 되면(`ChurchSelectScreen.availableIds`)
그림이 없어도 캐러셀에 자동으로 나오고, 3D 렌더 샷이나 아이콘으로 대신한다.

## 지금 들어 있는 것 (2026-11-23, 합계 약 0.49MB)

| 파일 | 출처 | 비고 |
|---|---|---|
| `bg_glow.webp`, `rail_decor.webp`, `hero_milan.webp`, `thumb_{stpeter,maggiore,stpaul,milan,myeongdong}.webp` | **사용자가 올린 시안 이미지(AI 생성)에서 잘라 낸 임시 자산** | 시안이 1190×1322 라 해상도가 낮다(썸네일 약 158×113, 대표 그림 746×420). 고해상도 그림이 오면 교체 |
| `render_{basic,florence,lateran,maggiore,myeongdong,stpaul,stpeter}.webp` | 우리 3D 성당 렌더(`tools/church_web/entry_shots.mjs`) | 대표 그림이 없는 성당의 대체 |
| `thumb_{stpeter,lateran,maggiore,stpaul,florence,milan}.webp` | **사용자가 올린 AI 생성 외관 그림**(2026-11-24, Gemini — 오른쪽 아래 워터마크를 피해 4:3으로 잘라 480×360) | 사진이 아니라 생성 그림 |
| `thumb_assisi.webp` | **사용자가 올린 AI 생성 외관 그림**(2026-11-23, ChatGPT — 상부 대성당 정면·종탑·회랑, 두 안 가운데 실제 정면에 더 가까운 1안) | 4:3, 480×360. 사진이 아니라 그림(생성 이미지) — 실제 사진·작가 작품을 쓰지 않음 |
| `render_assisi.webp`, `assets/church_thumbs/assisi.webp` | 우리 3D 성당 렌더(2026-11-23, 밝기 조정 뒤 — 상부 신랑 입구에서 제대·궁륭 쪽, 낮 11시) | **사진이 아니라 렌더인 까닭**: 이탈리아 문화유산(벽화·내부) 사진은 권리 확인(쿠스토디아 허락·문화재법 검토, `interiors/assisi.md` §7)이 끝날 때까지 받지도 싣지도 않는다. 사용자가 AI 그림을 주면 `thumb_assisi.webp`(4:3, 폭 480)·`hero_assisi.webp`(16:9, 폭 1280) 이름으로 넣기만 하면 렌더 대신 그것이 나온다(코드 변경 없음 — 아래 대체 순서) |

## 만드는 법

```sh
# 1) 시안에서 임시 자산 자르기(상태 바 아이콘은 지우고, 글자·책갈피 버튼·둥근 모서리는 피한다)
python3 -I tools/design/crop_entry_assets.py <시안.png>

# 2) 3D 렌더 샷(대표 그림 hero_<id>.webp 가 없는 성당만. --all 이면 전부). 성당당 1장, 순차, 한 장에 약 1~2분.
#    렌더 코드(assets/church/*.js)가 바뀌면 다시 돌린다. 시점은 각 빌더의 thumb(ChurchBuilders.<id>.thumb).
#    thumb.cam = {pos, look, fov} 가 있으면 앱 카메라 리그 대신 그 고정 시점(tools/church_web/thumb_cam.mjs — 여러 층 성당 아시시: 리그가 궁륭 쪽으로 올라가 바닥만 찍혔다).
#    고르기 화면 썸네일(assets/church_thumbs/<id>.webp, 400×240)은 node tools/church_web/thumbs.mjs <id> (같은 thumb 시점, 15시).
node tools/church_web/entry_shots.mjs                 # 전부
node tools/church_web/entry_shots.mjs stpeter milan   # 일부(이름을 주면 hero 가 있어도 찍는다)
#    옵션: --width 960 --quality 72 --scale 2

# 3) ChatGPT 등으로 만든 3×3 시트를 성당별 파일로 자르기
python3 -I tools/design/slice_entry_sheets.py exterior <외관 시트.png>   # -> thumb_<id>.webp (4:3, 폭 480)
python3 -I tools/design/slice_entry_sheets.py interior <내부 시트.png>   # -> hero_<id>.webp  (16:9, 폭 1280)
python3 -I tools/design/slice_entry_sheets.py bg <배경 장식.png>          # -> bg_glow.webp
python3 -I tools/design/slice_entry_sheets.py rail <레일 장식.png>        # -> rail_decor.webp
#    칸 순서(왼쪽 위부터): 1 우리 본당 2 성 베드로 3 라테라노 4 성 마리아 마조레 5 성 밖의 성 바오로
#    6 밀라노 7 피렌체 8 명동 9 당고개 순교성지(danggogae). 순서가 다르면 --ids a,b,c,… (건너뛸 칸은 -)
#    격자 선·여백은 --inset(칸 크기 대비 비율, 기본 0.02)로 잘라 낸다.
```

시트로 `hero_<id>.webp` 가 생긴 성당의 `render_<id>.webp` 는 더 이상 쓰이지 않으니 지워도 된다(성당당 약 40KB).
그림을 바꾼 뒤에는 `flutter test test/church_entry_test.dart` 와 스크린샷 하니스
(`flutter test test/zz_entry_shots_test.dart --dart-define=ENTRY_SHOTS=<폴더>`)로 확인한다.

## 용량

- 지금: 0.49MB(시안 조각 0.13MB + 렌더 8장 0.33MB + 아시시 고르기 썸네일 0.03MB). WebP 는 APK 안에서 다시 압축되지 않으므로 APK 증가도 거의 같다.
- 고해상도 교체 뒤 예상(대표 그림 9장 × 약 120KB + 썸네일 9장 × 약 25KB + 배경·레일 약 150KB): 약 1.4MB, 목표 1.5MB 이하.

## 그림 그릴 때 주의(교체용 그림 주문서)

- `bg_glow`: 오른쪽 위가 가장 진하고 왼쪽·아래로 갈수록 비어도 된다(앱이 왼쪽 60%·아래 70%를 옅게 지운다). 글자 금지.
- `rail_decor`: 짙은 갈색(#2B1F19 근처) 바탕, 아래쪽에 촛불·백합, 위쪽은 비워 둔다(앱이 위 35%를 레일 바탕으로 지운다).
- `hero`: 입구에서 제대 쪽을 본 내부, 16:9, 가운데 구도(넓은 화면에서는 위아래가 조금 잘려 9:4 로 보인다). 오른쪽 위에 책갈피 버튼이 놓인다.
- `thumb`: 정면 외관, 4:3, 건물이 가운데. 둥근 모서리·테두리·글자 금지.
