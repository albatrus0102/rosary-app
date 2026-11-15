# 명동대성당 — 창 시안 요청문

대상(계획서 §2.5): 후진 5 · 익랑 2 · 무늬창 4종. **임시 AI 시안이며 실제 창의 모사가 아니다.** ID 는 `MYD-DEV-###`.
이남규의 1989년 창(가운데 문 위)은 저작권이 살아 있으므로 **요청하지 않는다**.

## 공통 지시 (영어, 그대로 붙여 넣기)

```
You are producing DEVELOPMENT PLACEHOLDER textures for a 3D church app. These are original
AI concept designs in the general manner of late-19th-century French neo-Gothic workshop
stained glass (bright cobalt blue grounds, ruby red, amber-yellow borders, painted
figure scenes inside medallions, grisaille ornament). They are NOT reproductions of any
existing window; do not copy any specific work or workshop. No text, no inscriptions,
no signatures, no dates.

Output rules for every image:
- One window per image. Transparent PNG. Everything outside the glass outline must be
  fully transparent. Do not draw stone frames, tracery stonework, walls or background.
- Draw only the glass: coloured pieces, lead lines, thin dark horizontal saddle bars.
- Flat, frontal, evenly back-lit, no perspective, no glare.
- The outline must fill the canvas height exactly, be horizontally centred, and have
  the width/height ratio given for each item.
- Keep one consistent drawing style and palette across the batch.
After generating, crop each PNG to the bounding box of its non-transparent pixels and
give me a zip with textures/<ID>.png and a manifest.json (fields: id, texture_file,
width, height, church:"myeongdong", bundle, slot_group, target_aspect_w_over_h,
subject_hint, kind:"AI_generated_prototype", historical_window_id:null,
restoration_verified:false, release_approved:false, notes).
```

## 묶음 A — 후진 랜싯 5장 (`myeongdong-A`)

실제: 제대 뒤 다섯 긴 창이 묵주기도 15단(환희·고통·영광)을 담는다. **어느 창에 어느 신비가 있는지는 확인하지 못했다.** 그래서 시안은 "창마다 원형 장면 3개"만 지키고, 장면 배정은 아래의 **임시 순서**(왼쪽 창부터 1~3, 4~6 …, 창 안에서는 아래 → 위)를 쓴다. manifest 의 `notes` 에 "scene order provisional" 을 적는다.
모델 창(2026-11-15 구조 수정 I-1 뒤): 1.26 × 7.78 m(가로/세로 0.162), 가운데 1.46 × 8.18 m(0.178). (그 전: 1.26 × 6.78 / 1.46 × 7.68)

```
Batch myeongdong-A (5 images). Canvas 1024x1536. Very tall single pointed lancet,
ratio width/height = 0.17 (about 260 px wide at 1536 px height), pointed arch top.
Each lancet: cobalt-blue diaper ground, amber and ruby border, and THREE circular
medallions stacked vertically (bottom, middle, top), each medallion a small painted
scene with 2-4 figures.
MYD-DEV-001 (bottom to top): Annunciation; Visitation; Nativity
MYD-DEV-002: Presentation in the Temple; Finding of the Child Jesus in the Temple;
             Agony in the Garden
MYD-DEV-003 (centre window, ratio 0.19): Scourging at the Pillar; Crowning with
             Thorns; Carrying of the Cross
MYD-DEV-004: Crucifixion; Resurrection; Ascension
MYD-DEV-005: Descent of the Holy Spirit; Assumption of Mary; Coronation of Mary
```

## 묶음 B — 익랑 큰 창 2장 (`myeongdong-B`)

모델 창: 3.66 × 9.03 m(가로/세로 0.405). 실제 창의 분할(몇 연창인지)은 확인하지 못했다 → 세 연창으로 가정(manifest `notes`: "light count assumed").

```
Batch myeongdong-B (2 images). Canvas 1024x1536. Large pointed window, ratio
width/height = 0.405 (about 622 px wide at 1536 px height), divided by thin dark lines
into three tall lights with a traceried head of three small circles; do not draw stone,
only the glass shapes with dark gaps between them.
MYD-DEV-006: lower half - the Nativity (Mary, Joseph, the Child in the manger, ox and
             ass); upper half - the Adoration of the Magi (three kings with gifts,
             a star). Blue ground, ruby and amber borders.
MYD-DEV-007: Christ standing in the centre light blessing, with the twelve apostles
             arranged in the side lights and below (six on each side), each with a
             simple attribute; blue ground, ruby and amber borders.
```

## 묶음 C — 무늬창 4장 (`myeongdong-C`)

측랑 "신자석 창"·고측창 "광창"·측랑 끝 작은 장미창. 인물 없는 장식 무늬. 비율은 I-1 구조 수정 뒤의 개구부에 맞췄다(측랑 2연 첨두 + 원창 2.2 × 4.4 m = 0.50, 고측창 단일 첨두 1.06 × 4.48 m = 0.24, 측랑 끝 장미창 지름 1.32 m). 같은 그림을 여러 창에 **반복**해서 쓴다(반복이라는 것을 개발 표에 적는다).

```
Batch myeongdong-C (4 images). Ornamental windows, no figures.
MYD-DEV-008  Canvas 1024x1536, ratio width/height = 0.50 (about 768 px wide): a pair of
             narrow pointed lights side by side with one circle above them (plate
             tracery layout); each light filled with a repeating quatrefoil-and-flower
             pattern in blue, red and amber with a pearl border; the circle holds a
             six-petal rosette.
MYD-DEV-009  Same layout as 008 but a different pattern: interlaced vine and leaf
             grisaille on pale glass with coloured bosses and a red-blue border.
MYD-DEV-010  Canvas 1024x1536, ratio width/height = 0.24 (about 365 px wide): single
             pointed clerestory light, simple geometric lozenge pattern in pale
             grisaille with amber border and small blue/red squares (to be seen from
             far away, keep it simple and luminous).
MYD-DEV-011  Canvas 1024x1024, circular (ratio 1.00): small rose, eight petals around a
             central boss, blue and ruby with amber rings.
```

## 받은 뒤

- `art/glass_dev/myeongdong/textures/MYD-DEV-###.png` + `manifest.json`.
- 자리(계획서 §2.4): 001~005 → `apse_L2`, `apse_L1`, `apse_C`, `apse_R1`, `apse_R2`(왼쪽부터) · 006 → `trEndL` · 007 → `trEndR` · 008/009 → `aisleL/R_n1…n6` 번갈아 · 010 → `clereL/R_n0…n6` · 011 → 측랑 끝 장미창(뚫은 뒤).
