# ChatGPT 이미지 생성용 텍스처 프롬프트 묶음 (2026-11-15)

용도: 성당 3D 장면(`assets/church`)의 질감을 **ChatGPT(이미지 생성)로 만들어 채우기 위한 요청서**다. 구매·외부 라이선스 없음.
사용자가 아래 프롬프트로 이미지를 만들어 올려 주면, **자르기·심리스 보정·노말/러프니스 유도·JPEG 변환·번들 반영은 후속 작업**(저희가 한다)이다.
진단 근거는 [LOOK_DEV.md](LOOK_DEV.md) §1·§5(격차: 재질 미세 변조·줄눈·금박·촛불 번짐), 질감 번들 구조는 [ASSET_LICENSES.md](ASSET_LICENSES.md) 머리말.

프롬프트 본문은 **영어**(생성기 인식률이 높다), 설명은 한국어. 영어 본문을 그대로 복사해 붙이면 된다.

---

## 0. 먼저 읽기 — 공통 규칙

### 0-1. 왜 이 목록인가 (현재 상태와 격차)

| 지금 있는 것 | 한계 | 이 문서의 대응 |
|---|---|---|
| 공용 사진 질감 12종(대리석 5·석회암·회반죽·회색 돌·벽돌·어두운/체리 나무, 모두 CC0, 1024px 이하) + 금 모자이크·프레스코·금 부조 | 같은 질감이 넓은 면에 반복돼 '복제 도장'처럼 보임, 성당마다 개성이 약함 | 성당별 대리석·돌·나무 변형(T-01~T-12) |
| 천(제대 보·카펫·벨벳)과 성 베드로 입구 반암 원반은 **단색** | 천 결·광택이 없어 '색 종이'처럼 보임 | 천·반암(T-13~T-16) |
| 금·청동은 금속 재질 값만 | 금박·청동 청록 녹·긁힘이 없어 단조로움 | 금속(T-17~T-18) |
| 촛불·먼지·빛줄기는 코드 스프라이트(원형 그라데이션) | 불꽃 모양·후광이 단순 | 스프라이트(T-19~T-21) |
| 벽 석재 줄눈·모서리 때·바닥 마모 없음 | 벽이 '매끈한 판' | 데칼(T-22~T-24) |
| 환경광 HDR 1장(512×256, CC0) | 반사 맥락이 모든 성당에 동일 | 환경 파노라마(T-25, 선택) |

### 0-2. 규격 — 이대로 요청하세요

| 항목 | 값 | 이유 |
|---|---|---|
| 비율·크기 | **정사각 1024×1024**(기본). ChatGPT 가 허용하면 1536×1536 이상도 OK, 대신 저희가 1024~2048 로 줄여 쓴다 | 질감은 정사각 타일이어야 UV 가 단순 |
| 파일 형식 | PNG 로 받기(재압축 손실 방지). 저희가 JPEG(q80~85) 로 변환 | 번들은 data URI JPEG |
| 보내는 개수 | 항목마다 **2장씩 변형**(A·B) → 저희가 더 심리스한 쪽을 고른다 | 심리스 성공률이 100% 가 아님 |
| **4096 은 쓰지 않는다** | 4096² RGBA + 밉맵 ≈ **90MB** GPU 메모리(질감 1장). 현재 성 베드로 장면 전체 질감이 ≈ 91MB | 모바일 렌더 프로세스 종료 위험 |
| 권장 사용 크기 | 대부분 **1024²**(≈ 5.6MB GPU, JPEG 100~250KB). 눈에 띄는 대형 면(성 베드로 바닥 중앙 등)만 **2048²**(≈ 22MB, JPEG 0.5~1MB) | 해상도·화질은 낮추지 않되 메모리 예산 안 |
| APK 용량 | 공용 질감 지금 2.5MB(tex_pack.js). 아래 전체(25종, 1024 기준 알베도+노말+러프니스)를 모두 넣으면 **+약 6~9MB**, 2048 은 1장당 +0.5~1MB. 반영 전에 항목별 확정 크기를 보고한다 | 사용자 결정 사항 |

### 0-3. 공통 원칙(모든 프롬프트 앞에 이미 들어 있음)

- **seamless tileable**(상하좌우 이음매 없음), **flat even lighting**(조명·그림자·비네트를 그림에 굽지 않는다. 조명은 3D 장면이 한다), **top-down orthographic**(정면에서 본 평면 질감, 원근 없음).
- 글자·로고·사람·워터마크 금지(**No text, no logos, no people, no watermark**).
- 한 장 안에서 **큰 무늬가 한 군데에 몰리지 않게**(눈에 띄는 얼룩·큰 균열이 하나 있으면 타일마다 반복돼 눈에 띈다).
- 색은 **중간 밝기**로(너무 어둡거나 하얗게 날아가지 않게). 밝기는 3D 조명·톤이 정한다.

### 0-4. PBR(알베도·노말·러프니스) 요청 방법

ChatGPT 이미지는 **물리적으로 정확한 노말·러프니스 맵을 만들어 주지 못한다**(분위기만 비슷한 보라색 그림이 나온다). 그래서 이렇게 한다.

1. **알베도(색)만 요청**한다 — 이 문서의 모든 프롬프트가 알베도용이다.
2. **노말·러프니스는 저희가 후처리로 유도**한다: 알베도 → 밝기에서 높이맵 → Sobel 노말, 러프니스 = 반전·대비 조정(돌·나무·천 종류별 프리셋). 기존 CC0 질감의 `_n`/`_r` 과 같은 규격(노말 GL, 러프니스는 회색조 JPEG).
3. (선택, 결이 분명한 나무·천·돌에서 더 좋아짐) 같은 대화에서 방금 만든 이미지를 첨부하고 아래 **높이맵 후속 요청**을 한다. 같은 구조를 유지해 주는 편이다. 결과가 어긋나면 쓰지 않고 2번만 쓴다.

> **높이맵 후속 요청(선택, 알베도를 첨부해 보냄)**
> `Using the attached image as the exact reference, produce a grayscale height map of the very same surface: identical layout, identical size, pixel-aligned, seamless tileable. White = highest, black = lowest. Grout lines, cracks and grain grooves must be dark. No color, no text, no shading, no lighting, flat top-down.`
>
> 한국어: 첨부한 알베도와 같은 구조로 흑백 높이맵을 만들어 달라는 요청. 줄눈·균열·나뭇결 홈은 어둡게.

### 0-5. 올려 주실 때

- 파일 이름: `T-번호_이름_A.png`, `T-번호_이름_B.png` (예: `T-01_marble_white_A.png`).
- 이미지 생성 직후 **'저장'**(ChatGPT 가 만든 미리보기가 아니라 원본 다운로드).
- 후속 작업(저희): ① 이음매 점검·오프셋 블렌드 심리스 보정 ② 1024 로 자르기·리사이즈 ③ 노말·러프니스 유도 ④ `art/church_tex_src/tex_<이름>.jpg/_n/_r` 로 두고 `build_texpack.mjs` 실행 → `kit.js` SURFACES 연결 ⑤ 장면 스크린샷 전/후 + 용량 보고 ⑥ [ASSET_LICENSES.md](ASSET_LICENSES.md) 에 '사용자가 ChatGPT 로 생성, 날짜, 프롬프트 번호' 기록.
- AI 생성물 라이선스: 사용자가 만든 이미지의 이용 권한은 ChatGPT 이용약관에 따른다(상업 이용 가능 여부는 사용 중인 요금제 약관을 한 번 확인해 주세요).

---

## 1. 공통 앞머리(Style header) — 모든 개별 프롬프트 맨 앞에 붙는다

```
Create a SQUARE, SEAMLESS, TILEABLE material texture for a 3D game asset. Perfectly flat top-down orthographic view of the surface, no perspective. Flat, even, diffuse lighting only: NO baked shadows, NO highlights, NO vignette, NO gradient across the image, NO borders or frame. The pattern must wrap seamlessly on all four edges (left matches right, top matches bottom). Mid-range brightness, high detail, photorealistic, sharp. No text, no letters, no logos, no people, no watermark. Output a single image, 1:1 square, as large as you can.
```

한국어: 정사각·이음매 없음·평면 정면·그림자/하이라이트/비네트 금지·글자 금지. 아래 개별 프롬프트는 이 앞머리 + "Surface: …" 한 줄이다.

---

## 2. 개별 프롬프트 (항목별 복사용)

표기: **우선순위** A = 먼저(효과 큼) / B = 다음 / C = 선택. **크기** 는 저희가 쓸 최종 크기이며, 요청은 항상 정사각 최대 크기로 한다.

### 2-1. 바닥·벽 석재 (T-01 ~ T-12)

#### T-01 흰 대리석 바닥 (A, 1024 → 중앙부는 2048 가능)
용도: 성 베드로·라테라노·성 바오로 바닥, 제대 계단. 지금은 CC0 `marble_white` 1종이 전부 반복.
```
[Style header] Surface: polished Carrara white marble, soft grey veining running diagonally, a few thin darker veins, subtle warm cream undertone, no large dark blotches, veining distributed evenly across the whole tile.
```
한국어: 흰 카라라 대리석, 회색 결이 대각선으로 고르게. 큰 얼룩 금지.

#### T-02 흑백 체스판 대리석 (A, 2048)
용도: 라테라노·피렌체·밀라노 바닥 체스판. 지금 `marble_checker`는 2×2 합성본.
```
[Style header] Surface: a 2x2 checkerboard of large polished marble tiles, two white Carrara marble tiles and two nero marquina black marble tiles with fine white veins, thin warm-grey grout lines between tiles, the grout lines must align exactly with the image edges so the checkerboard repeats seamlessly (each tile exactly 50% of the width/height).
```
한국어: 흰·검은 대리석 2×2 체스판, 줄눈이 이미지 가장자리와 정확히 맞게.

#### T-03 베이지·황금빛 대리석 (B, 1024)
용도: 성모 대성전·성 베드로 기둥 아랫부분·벽판.
```
[Style header] Surface: polished warm beige travertine-marble, creamy golden tone, gentle wavy cloud-like veins in light brown, small occasional pores, no dark spots.
```

#### T-04 분홍·장미빛 대리석 (B, 1024)
용도: 라테라노·성 베드로 장식 띠, 제대 장식판.
```
[Style header] Surface: polished rose-pink marble (rosso verona style), soft pink-salmon base, white and pale cream branching veins, fine and elegant, no dark blotches.
```

#### T-05 녹색 대리석(베르데 안티코) (B, 1024)
용도: 피렌체·성 베드로 띠 장식 — 지금 '초록'은 단색.
```
[Style header] Surface: polished verde antico dark green marble with irregular pale white-green veining and cloudy lighter patches, rich deep emerald-green, subtle.
```

#### T-06 트래버틴·사암 벽돌색 석재(성 베드로 벽체) (A, 1024)
용도: 성 베드로 벽·피어(기둥) 외벽 - 지금 `limestone` 로 따뜻한 느낌이 부족.
```
[Style header] Surface: large ashlar blocks of warm honey-colored travertine stone wall, 1 block = about 1/2 of the image width, thin recessed mortar joints running horizontally and vertically, the joints must align with the image edges so the pattern repeats seamlessly, natural pitting and subtle tonal variation between blocks, no moss, no stains.
```
한국어: 꿀색 트래버틴 석재 벽(줄눈 포함). 줄눈이 가장자리와 맞아야 한다. 벽 줄눈 격차(LOOK_DEV §5)를 직접 메운다.

#### T-07 회색 고딕 석재(밀라노·성 바오로) (A, 1024)
```
[Style header] Surface: cool grey granite-limestone ashlar wall for a gothic cathedral, rectangular blocks about 1/3 of the image width, fine recessed mortar joints aligned to the image edges, soft tonal variation block to block, light pitting, very subtle darker mineral speckles, no moss, no stains.
```

#### T-08 붉은 벽돌(명동) (B, 1024)
```
[Style header] Surface: traditional Korean-colonial red-brown clay brick wall, running bond, each brick about 1/8 of the image width, slightly uneven brick colors from orange-red to dark brown, pale grey-beige mortar joints, tiny chips, joints aligned to the image edges so the pattern repeats seamlessly.
```

#### T-09 회반죽·석회 벽(밝은 성당, 우리 본당) (B, 1024)
```
[Style header] Surface: matte warm-white lime plaster wall, very subtle hand-troweled variations, faint hairline cracks (very few and small), faint tonal clouds, no stains, no paint drips.
```

#### T-10 어두운 나무(신자석·문·제의실) (A, 1024)
```
[Style header] Surface: dark walnut wood planks laid side by side, each plank about 1/4 of the image height and running horizontally, straight fine grain with occasional knots, subtle plank gaps aligned to the image edges, warm dark brown, satin finish look but with NO light reflection painted in.
```
한국어: 호두나무 널판. 널판 간격이 가장자리와 맞아야.

#### T-11 체리·밝은 나무(제대 난간, 의자 일부) (B, 1024)
```
[Style header] Surface: warm cherry wood planks, horizontal grain, rich reddish-brown, fine pores, subtle plank joints aligned to the image edges, no reflection painted in.
```

#### T-12 오래된 바닥 나무(우리 본당 마루) (C, 1024)
```
[Style header] Surface: worn oak parquet strip floor, narrow planks laid in a straight pattern, honey-brown color with gentle wear, plank gaps aligned to the image edges, no reflection painted in.
```

### 2-2. 천·반암 (T-13 ~ T-16)

#### T-13 붉은 벨벳·카펫 (A, 1024)
용도: 성 베드로 입구 붉은 원반 대신 카펫, 제대 앞 보, 기도석 쿠션, 사순·성탄 장식 천(색은 저희가 틴트로 바꾼다 → 채도 높은 붉은색 한 장이면 충분).
```
[Style header] Surface: deep crimson woven velvet fabric, extremely fine pile with subtle directional sheen variations painted as slight tonal shifts only (no highlights), tight weave, slight nap irregularities, rich saturated red.
```

#### T-14 금실 자수 직물(제의·제대 보) (B, 1024)
```
[Style header] Surface: ivory-white brocade fabric with a small repeating damask pattern woven in pale gold thread (fleur-de-lis and diamond lattice), the pattern repeats exactly with the image edges (the motif centers at the corners and the middle), elegant church vestment cloth, no text.
```

#### T-15 린넨 제대 보(흰 천) (B, 1024)
```
[Style header] Surface: plain white-ivory linen cloth with a visible fine plain weave, slight natural slubs, no pattern, no folds, no wrinkles, soft matte.
```

#### T-16 붉은 반암(성 베드로 입구 원반 'Rota Porphyretica') (B, 1024)
```
[Style header] Surface: polished imperial porphyry stone, deep purple-red base with scattered small pale pink and white feldspar speckles, dense and fine granular crystalline texture, uniform across the tile, not too dark (mid-dark brightness).
```
한국어: 지금 이 원반이 '거의 검정'으로 보이는 문제를 이 질감 + 아주 약한 광택으로 해결.

### 2-3. 금속 (T-17 ~ T-18)

#### T-17 금박·도금 (A, 1024)
용도: 코퍼 천장 틀, 발다키노 금 장식, 제대 촛대, 모자이크 사이 금.
```
[Style header] Surface: hammered antique gold leaf gilding, warm yellow-gold, fine crinkled leaf micro-texture with tiny irregular seams, slight tone variation between leaves (some slightly more orange, some slightly more green-yellow), very subtle fine scratches. Avoid baked-in bright highlights; keep tonal range narrow.
```
한국어: 금박. 하이라이트를 그림에 굽지 않는다(반사는 3D 가 한다).

#### T-18 청동·구리 청록 녹(발다키노·문) (B, 1024)
```
[Style header] Surface: dark antique bronze metal with subtle brown-black patina, faint verdigris traces in tiny recesses only, fine casting texture, faint scratches, tonal range narrow, no highlights painted in.
```

### 2-4. 스프라이트(알파가 필요한 것) (T-19 ~ T-21)

ChatGPT 는 투명 배경을 확실히 내주지 못한다 → **검은 배경 위에서 발광**하게 만들고, 저희가 **밝기를 알파로 변환**(가산 합성)해 쓴다.

#### T-19 촛불 불꽃 시트 (A, 1024×1024 = 4×4 칸)
```
Create a sprite sheet on a PURE BLACK background (#000000), 4 columns by 4 rows of equal square cells, 16 frames in total, of a single small candle flame burning on nothing (no candle, no wick, no holder), each frame a slightly different flickering shape (tall, leaning left, leaning right, squat, wavering), centered in its cell, glowing: bright white-yellow core, warm orange outer layer, soft transparent edges fading to black. Flat 2D, no smoke, no glow halo beyond the cell, no cell borders, no text. Square 1:1 image.
```
한국어: 검은 배경 4×4 칸 촛불 불꽃 16종(심지·초 없이). 가산 합성용. 촛불 '후광'(LOOK_DEV_HANDOFF §2-5)과 불꽃 모양 개선.

#### T-20 먼지·빛 입자 (B, 1024 = 4×4 칸)
```
Create a sprite sheet on a PURE BLACK background (#000000), 4 columns by 4 rows of equal square cells, 16 different tiny floating dust motes seen in a sunbeam: each a very soft round or slightly irregular warm-white glowing speck with a soft falloff to black, different sizes and brightness, centered in its cell, no cell borders, no text. Square 1:1 image.
```

#### T-21 햇빛 광선(god ray) 띠 (B, 세로 1024×2048 또는 1024×1024)
```
Create a texture of a single soft vertical shaft of warm golden sunlight on a PURE BLACK background: a very soft-edged vertical beam, brightest in the center, fading smoothly to black on the left, right, top and bottom edges, with faint hazy dust particles inside the beam, volumetric light, no sharp lines, no source visible. Image 1:1 square, as large as you can.
```
한국어: 지금 빛줄기(`beamK`)는 단순 평면 그라데이션. 가산 합성으로 겹쳐 쓸 부드러운 광선.

### 2-5. 데칼(겹쳐 붙이는 때·줄눈) (T-22 ~ T-24)

흰 배경 위의 **회색조 불투명도 맵**으로 요청 → 저희가 '곱하기(어둡게)' 데칼로 사용.

#### T-22 모서리·바닥 때(AO·그을음) (B)
```
Create a seamless tileable grayscale grime and ambient-occlusion overlay texture on a PURE WHITE background: soft smoky dark-grey cloudy stains and gentle dirt accumulation patterns, mostly white with soft grey clouds (maximum darkness about 55% grey), no hard edges, no objects, no text, evenly distributed across the whole tile, square 1:1.
```
한국어: 흰 바탕에 부드러운 회색 때 구름. 벽 아래·기둥 머리 근처에 곱해 '벽이 매끈한 판' 문제를 줄인다.

#### T-23 석재 줄눈 데칼(타일 가능) (A)
```
Create a seamless tileable grayscale mortar-joint overlay on a PURE WHITE background: thin dark grey lines forming a staggered ashlar masonry grid of rectangular blocks (each block about 1/2 of the image width and 1/4 of the height), slightly irregular wobble in the lines, soft darker shading just beside the lines, the lines align with the image edges so it tiles perfectly, no color, no text, square 1:1.
```
한국어: 흰 바탕에 어긋난 석재 줄눈선. 단색 벽(성 베드로 피어 등)에 곱해 줄눈을 낸다.

#### T-24 바닥 마모·광택 얼룩(러프니스용) (C)
```
Create a seamless tileable grayscale surface-wear texture on a PURE BLACK-to-WHITE midtone range: faint foot-traffic scuff clouds and fine micro-scratches in lighter and darker mid-greys, no strong contrast, no pattern, no text, evenly distributed, square 1:1.
```
용도: 바닥 러프니스에 곱해 '사람이 걸은 광택 변화'를 줌.

### 2-6. 환경 파노라마 (T-25, 선택)

#### T-25 성당 내부 360° 파노라마(환경 반사 보조) (C, 2048×1024)
ChatGPT 는 **HDR(밝기 범위 넓은 이미지)을 만들지 못하고 360° 이음매도 보장하지 못한다.** 현재 Poly Haven CC0 HDRI(`env_church.js`)를 **빛(조명)**으로 계속 쓰고, AI 파노라마는 **색 분위기(금·대리석)만 약하게 섞는 보조**로만 쓴다. 효과가 불확실하므로 마지막 순위.
```
Create an equirectangular 360-degree panorama in 2:1 aspect ratio of the interior of a grand baroque cathedral nave seen from the center of the floor: warm golden light from high clerestory windows, white and cream marble pilasters, gilded coffered barrel vault, dark marble floor. The left and right edges must connect seamlessly. Low contrast, evenly exposed, no people, no text, no dominant sun disc, soft haze. Output as large as possible, 2:1.
```
한국어: 2:1 파노라마, 좌우 이음매 맞게. 가로 2048 이하로만 쓴다(1024×512 도 충분).

### 2-7. 아시시 질감 (T-26~T-28, 2026-11-22 대화에서 받음 — 원본 `art/gpt_1122/tex/`)

| 번호 | 내용 | 받은 판 | 적용(2026-11-22) |
|---|---|---|---|
| T-26 | 수바시오 분홍 돌(분홍·흰 석회석 어긋쌓기) | A·B(이음매 없음), C~F(두 장 시트를 자른 것 — 이음매 있음) | **A** → `tex_assisi_stone`(+_n/_r) |
| T-27 | 파란 바탕 금별 궁륭 | A(이음매 조금), B(이음매 없음) | **B** → `tex_assisi_vault`(+_n) |
| T-28 | 인물 없는 빛바랜 민 프레스코 회벽 | A·B | **A** → `tex_assisi_fresco`(+_n) |

처리·권리: [ASSET_LICENSES.md](ASSET_LICENSES.md) '아시시 질감', 스크립트 `tools/church_web/tex_ingest_assisi.py`, 성당 전용 팩 `tex_pack_assisi.js`.

---

## 3. 한 번에 요청하는 묶음 프롬프트(세션 시작용)

아래 **한 덩어리를 새 ChatGPT 대화에 붙여넣고**, 그다음 `next` 라고 쓰면 항목마다 한 장씩 만든다. 긴 목록을 한 번에 이미지 25장으로 내려고 하면 품질이 떨어지므로 **'한 번에 한 장'** 방식이다. 마음에 안 들면 `redo` 라고 쓰면 같은 항목을 다시 만든다.

### 3-1. 묶음 A — 우선순위 A 8종 (먼저 이것만 올려도 룩이 크게 바뀐다)

```
You are my texture artist for a 3D cathedral game. I will ask you for seamless, tileable, flat top-down material textures, ONE IMAGE PER REPLY, 1:1 square, as large as you can (PNG). Global rules for every texture: perfectly seamless on all four edges; flat even diffuse lighting only; NO baked shadows, highlights, vignette, gradient or borders; mid-range brightness; photorealistic and sharp; no text, no logos, no people, no watermark; no perspective.

I will say "next" and you create the next item in the list. If I say "redo", create the same item again with a new variation. Before each image, write one line: the item number and name. After the image, write one line saying whether the edges are seamless.

List:
T-01 Polished Carrara white marble, soft grey diagonal veining, warm cream undertone, evenly distributed, no big dark blotches.
T-02 A 2x2 checkerboard of large polished marble tiles (two white Carrara, two nero marquina black with fine white veins), thin warm-grey grout lines aligned with the image edges so it repeats seamlessly; each tile exactly 50% of width and height.
T-06 Large ashlar blocks of warm honey-colored travertine stone wall, each block about 1/2 of the image width, thin recessed mortar joints aligned to the image edges, natural pitting, subtle tonal variation between blocks, no moss, no stains.
T-07 Cool grey granite-limestone gothic cathedral ashlar wall, rectangular blocks about 1/3 of the image width, fine recessed mortar joints aligned with the image edges, soft tonal variation, no moss, no stains.
T-10 Dark walnut wood planks, horizontal, each plank about 1/4 of the image height, fine straight grain with a few knots, plank gaps aligned to the image edges, no reflection painted in.
T-13 Deep crimson woven velvet fabric, extremely fine pile, tonal shifts only (no painted highlights), rich saturated red.
T-17 Hammered antique gold leaf gilding, warm yellow-gold, fine crinkled micro-texture with tiny irregular seams, slight tone variation between leaves, narrow tonal range, no painted highlights.
T-23 (grayscale on PURE WHITE background) thin dark-grey staggered ashlar mortar-joint lines forming a masonry grid (each block about 1/2 of image width, 1/4 of height), slightly wobbly lines, soft shading next to the lines, lines aligned to the edges, no color.

Start now with T-01 only, then wait for me to say "next".
```

### 3-2. 묶음 B — 우선순위 B·C 이어서

```
Continue the same job (same global rules: seamless, flat even lighting, no baked shadows/highlights, 1:1 square PNG, one image per reply, I say "next"). New list:
T-03 Polished warm beige travertine-marble, creamy golden tone, gentle wavy cloud-like light-brown veins, small pores.
T-04 Polished rose-pink marble (rosso verona style), soft salmon base, white and pale cream branching veins, elegant and fine.
T-05 Polished verde antico dark green marble, irregular pale white-green veining, cloudy lighter patches.
T-08 Red-brown clay brick wall, running bond, each brick about 1/8 of the image width, varied orange-red to dark brown, grey-beige mortar joints aligned with the edges.
T-09 Matte warm-white lime plaster wall, very subtle hand-troweled variation, almost no cracks.
T-11 Warm cherry wood planks, horizontal grain, reddish-brown, plank joints aligned with the edges, no painted reflection.
T-14 Ivory brocade fabric with a small repeating damask pattern in pale gold thread (fleur-de-lis and diamond lattice) that repeats exactly at the image edges, no text.
T-15 Plain white-ivory linen cloth with a visible fine plain weave and slight slubs, no folds, matte.
T-16 Polished imperial porphyry stone, deep purple-red with small pale pink and white feldspar speckles, dense fine granular texture, mid-dark brightness (not black).
T-18 Dark antique bronze metal, brown-black patina, faint verdigris only in tiny recesses, fine casting texture, narrow tonal range, no painted highlights.
T-22 (grayscale on PURE WHITE background) soft smoky grey grime and ambient-occlusion clouds, maximum darkness about 55% grey, no hard edges, no objects.
Start with T-03 and wait for "next".
```

### 3-3. 묶음 C — 스프라이트 시트(검은 배경)

스프라이트는 앞머리 규칙이 다르므로(타일 아님, 검은 배경) **별도 대화**로 요청한다. T-19, T-20, T-21 의 프롬프트(위 §2-4)를 각각 한 장씩 보내면 된다.

---

## 4. 후처리·적용(저희 쪽, 한 줄 요약)

| 단계 | 한 줄 |
|---|---|
| 심리스 보정 | 이미지를 가로·세로 절반씩 어긋나게(offset) 이어 붙여 이음매를 확인하고, 보이면 중앙 십자 영역을 크로스 블렌드·클론으로 지운다 |
| 크기 | 1024² 로 리사이즈(대형 면만 2048²), 알베도는 sRGB JPEG q82 |
| 노말 | 알베도 → 밝기 → 가우시안 → Sobel, 강도는 SURFACES `normalScale`(대리석 0.3~0.35, 돌 0.6~0.9) 에 맞춤 → `_n.jpg` |
| 러프니스 | 밝기를 반전·대비 조정(대리석은 낮게, 돌·천은 높게) → 회색조 `_r.jpg` |
| 번들 | `art/church_tex_src/` 에 두고 `node tools/church_web/build_texpack.mjs` → `tex_pack.js`, `kit.js` SURFACES 에 항목 추가 후 성당 빌더가 `surf:` 이름으로 사용 |
| 스프라이트 | 밝기 → 알파(가산 합성), 4×4 시트는 캔버스 아틀라스 1장으로 번들 |
| 확인 | `look_shots.mjs` 전/후 + `perf_compare.mjs` 로 질감 MB·프레임 비용 기록, 사진 창 색 ΔE(`glassplace.mjs --only color`) 불변 확인 |

---

## 5. 사용자에게 필요한 결정

1. 질감 확장 범위: **묶음 A(8종)만 먼저** 할지, 25종 전부 할지(용량 +6~9MB 예상, 항목별 확정치는 변환 뒤 보고).
2. 성 베드로 바닥 같은 큰 면에 **2048** 을 허용할지(질감 +17MB GPU, APK +0.5~1MB/장).
3. 이미지를 올리는 방식: 폴더에 `T-번호_이름_A/B.png` 로 올리면 된다.
