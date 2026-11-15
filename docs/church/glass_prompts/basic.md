# 우리 본당(가상) — 창 그림 요청문

우리 본당은 실제 건물이 없는 가상의 성당이다. 여기 그림은 **임시 대역이 아니라 이 본당을 위한 창작**이다(계획서 §7). 그래도 사용자가 승인하기 전에는 `release_approved: false`. ID 는 `BAS-DEV-###`.
방향: 한국 현대 본당에 흔한 **추상 색면 + 단순한 상징**(인물 없음). 특정 작가의 이름이나 화풍을 지목하지 않는다.

## 공통 지시 (영어)

```
You are designing original stained-glass windows for a fictional modern Korean Catholic
parish church in a 3D app. Style: contemporary abstract colour-field glass - large
irregular pieces of saturated glass, bold dark lead lines, soft gradients of blue,
violet, amber and green, with ONE simple symbol integrated into each window. No human
figures, no faces, no text, no signatures. Do not imitate any named artist.

Output rules for every image:
- One window per image. Transparent PNG. Everything outside the glass outline must be
  fully transparent. No stone frame, no wall, no background.
- Flat, frontal, evenly back-lit, no perspective, no glare.
- The outline must fill the canvas exactly as described and have the given
  width/height ratio.
- The ten side windows must read as one family (same hand, same lead-line weight),
  moving gradually from cool blues near the entrance to warm ambers near the altar.
After generating, crop each PNG to the bounding box of its non-transparent pixels and
give me a zip with textures/<ID>.png and a manifest.json (fields: id, texture_file,
width, height, church:"basic", bundle, slot_group, target_aspect_w_over_h,
subject_hint, kind:"AI_generated_original", historical_window_id:null,
restoration_verified:false, release_approved:false, notes).
```

## 묶음 A — 측면 첨두창 10장 (`basic-A1`, `basic-A2`, 5장씩)

모델 창: 1.9 × 3.27 m(가로/세로 0.58), 첨두 아치. 왼쪽 벽 5 + 오른쪽 벽 5, 입구 → 제대 순.

```
Batch basic-A1 (5 images, left wall, entrance to altar). Canvas 1024x1536, single
pointed-arch window, ratio width/height = 0.58 (about 890 px wide at 1536 px height).
BAS-DEV-001  flowing water and a descending dove (Baptism) - deep blues and white
BAS-DEV-002  a single bright star over dark hills (Morning Star) - indigo and silver
BAS-DEV-003  white lilies rising from green (purity) - blue-green and white
BAS-DEV-004  five loaves and two fish (sharing) - teal and amber
BAS-DEV-005  wheat ears and a grape cluster (Eucharist) - amber and wine red
```

```
Batch basic-A2 (5 images, right wall, entrance to altar). Same canvas and ratio.
BAS-DEV-006  a boat on waves with a net (the Church) - blues and grey
BAS-DEV-007  a burning bush / tongues of flame (the Spirit) - red-orange on violet
BAS-DEV-008  a lamb on a hill with a small banner (Lamb of God) - soft gold and white
BAS-DEV-009  a plain cross wound with a ring of thorns turning into blossoms -
             violet to rose
BAS-DEV-010  palm branches and rose-of-Sharon (mugunghwa) flowers, a quiet tribute to
             the Korean martyrs - warm amber, rose and green
```

## 묶음 B — 장미창 2장 + 반원창 1장 (`basic-B`)

```
Batch basic-B (3 images).
BAS-DEV-011  Canvas 1024x1024, circular (ratio 1.00), touches all four edges: altar-wall
             rose - a white dove at the centre with twelve rays of amber and gold
             spreading through rings of blue.
BAS-DEV-012  Canvas 1024x1024, circular: entrance rose - a stylised ten-petal rose
             (rosary) in ruby and rose pink on deep blue, with a ring of ten small
             round beads.
BAS-DEV-013  Canvas 1536x1024, semicircular fanlight above a door (flat bottom, round
             top), ratio width/height = 1.89, the semicircle spans the full canvas
             width: a rising sun with rays in amber, orange and pale blue.
```

## 받은 뒤

- `art/glass_dev/basic/textures/BAS-DEV-###.png` + `manifest.json`.
- 자리(계획서 §7.1): 001~005 → `sideL_b1…b5` · 006~010 → `sideR_b1…b5` · 011 → `apse_rose` · 012 → `entrance_rose` · 013 → `entrance_transom`.
