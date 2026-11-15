# 피렌체 두오모 — 창 시안 요청문

대상(계획서 §1.5): 자유 라이선스 사진이 없는 창. **임시 AI 시안이며 실제 작품이 아니다.** ID 는 `FLO-DEV-###`.
먼저 아래 "공통 지시"를 한 번 붙여 넣고, 이어서 묶음을 하나씩 요청한다.

## 공통 지시 (영어, 그대로 붙여 넣기)

```
You are producing DEVELOPMENT PLACEHOLDER textures for a 3D church app. These are original
AI concept designs in the general manner of early-15th-century Florentine stained glass
(strong leaded outlines, deep blue and ruby grounds, gold-yellow architecture canopies,
standing figures in niches). They are NOT reproductions of any existing window; do not
copy any specific historical work. No text, no inscriptions, no signatures, no dates,
no coats of arms.

Output rules for every image:
- One window per image. Transparent PNG. Everything outside the glass outline must be
  fully transparent (alpha 0). Do not draw stone frames, walls, shadows or a background.
- Draw only the glass: coloured pieces, lead lines, and the iron saddle bars as thin
  dark horizontal lines.
- Flat, frontal, evenly back-lit, no perspective, no glare, no reflections.
- The window outline must fill the canvas height exactly, be horizontally centred,
  and have the width/height ratio I give for each item.
- Keep the same drawing style and palette across the whole batch.
After generating, crop each PNG to the bounding box of its non-transparent pixels and
give me a zip with textures/<ID>.png and a manifest.json (fields: id, texture_file,
width, height, church:"florence", bundle, slot_group, target_aspect_w_over_h,
subject_hint, kind:"AI_generated_prototype", historical_window_id:null,
restoration_verified:false, release_approved:false, notes).
```

## 묶음 A — 정면 측랑 끝 오큘러스 1장 (`florence-A`)

실제 창: 「옥좌의 성 스테파노와 천사들」(기베르티 밑그림, 1412–15). 짝인 「성 라우렌시오」는 PD 사진이 있어 시안이 필요 없다.

```
Batch florence-A (1 image). Canvas 1024x1024, circular window (ratio 1.00), the circle
touches all four canvas edges.
FLO-DEV-001  slot_group "facade_side_oculus": a young deacon saint in a dalmatic seated
on a throne, facing front, holding a palm branch and a book, with two angels standing
on each side; a circular border of stylised flowers; blue ground, red and gold-yellow
robes. Divide the circle with a dark iron cross-frame into about twelve panels.
```

## 묶음 B — 측랑 이련창 4장 (`florence-B`, 선택)

실제 창: 아뇰로 가디 귀속 밑그림의 「성인들」 이련창 4점(1394–96), 약 1.9 × 9.0 m. CC BY 2.0 사진 2장(어느 창인지 미확인)이 있고 CC BY-SA 로는 4창 전부가 있다 → **사진을 쓰기로 하면 이 묶음은 필요 없다.**

```
Batch florence-B (4 images). Canvas 1024x1536. Each window is a tall two-light pointed
window: ratio width/height = 0.22 (so about 338 px wide at full 1536 px height),
two narrow lights side by side separated by a dark mullion, each light ending in a
pointed trefoil head, with a small quatrefoil in the top between them.
Each light has three (FLO-DEV-004: four) stacked niches; each niche holds one standing
saint under a gold-yellow Gothic canopy on alternating blue and red grounds, with an
ornamental border.
FLO-DEV-002  six standing saints (bishops, deacons, apostles), cool palette
FLO-DEV-003  six standing saints, warm palette, more red
FLO-DEV-004  eight standing saints in four registers
FLO-DEV-005  six standing saints including two female saints
```

## 묶음 C — 트리부나 경당 창 15장 (`florence-C1` ~ `C3`, 5장씩)

실제 창: 경당마다 이련창 1점, 약 1.8 × 6.3 m(가로/세로 0.286), 2단. 주제는 ICCD 기록의 인물 이름만 옮겼다(도상은 창작). **어느 경당이 몇 번째인지는 미확정**이므로 ID 는 주제 순서일 뿐 자리 번호가 아니다.

```
Batch florence-C1 (5 images). Canvas 1024x1536. Tall two-light pointed window, ratio
width/height = 0.286 (about 440 px wide at 1536 px height). Two lights with pointed
heads and a small oculus between them at the top. Two registers: lower register one
larger standing saint spanning feeling across both lights is NOT wanted - instead put
one standing figure in each light per register (so four figures), each under a
gold-yellow canopy, blue/red alternating grounds, ornamental border.
FLO-DEV-006  an apostle with a carpenter's square (Thomas) and three other saints
FLO-DEV-007  an evangelist with a book and an angel symbol (Matthew), a crowned king
             saint, a crowned queen saint holding roses, one more saint
FLO-DEV-008  an old hermit abbot with a T-shaped staff and a bell (Anthony the Abbot),
             a bishop with wool combs, another bishop, one more saint
FLO-DEV-009  John the Baptist in camel skin with a lamb, two apostles (Jude, Simon),
             one more saint
FLO-DEV-010  an apostle (Barnabas), a young martyr holding his own crown (Minias),
             a young female martyr with a palm and a banner (Reparata), one more saint
```

```
Batch florence-C2 (5 images). Same canvas, ratio and layout as florence-C1.
FLO-DEV-011  a bishop saint in mitre blessing (Zenobius) with two deacon saints
FLO-DEV-012  Saint Peter with keys and two Roman soldier martyrs
FLO-DEV-013  Saint Paul with a sword, a pope saint with a dove at his ear, another pope
FLO-DEV-014  the Virgin and Child, and two apostles (James the Less with a club,
             Philip with a cross)
FLO-DEV-015  an apostle holding a knife (Bartholomew) and three other saints
```

```
Batch florence-C3 (5 images). Same canvas and layout. FLO-DEV-018 and FLO-DEV-019 are
half-height windows: ratio width/height = 0.60 (about 920 px wide at 1536 px height),
ONE register only, one figure per light.
FLO-DEV-016  a young deacon martyr with stones (Stephen) and three other saints
FLO-DEV-017  an apostle pilgrim with staff and shell (James the Greater) and three
             prophets holding scrolls
FLO-DEV-018  an evangelist/apostle with a book (half-height window)
FLO-DEV-019  Saint Andrew with an X-shaped cross (half-height window)
FLO-DEV-020  John the Evangelist with an eagle, and two physician saints holding
             medicine boxes (Cosmas and Damian)
```

## 묶음 D — 트리부나 윗창 15장 (`florence-D1` ~ `D3`, 5장씩)

실제 창: 경당 아치 위의 이련창 15점, 약 1.9 × 6.1 m(가로/세로 0.31), 2단 14~16패널, 주제는 예언자·구약의 임금·성조. **모델에 이 창이 없으므로(뚫아야 함) 가장 나중에 만들어도 된다.**

```
Batch florence-D1 (5 images). Canvas 1024x1536. Tall two-light pointed window, ratio
width/height = 0.31 (about 476 px wide at 1536 px height), two registers, one standing
Old Testament figure per light per register (four figures per window), each holding a
long blank scroll (no writing), under gold-yellow canopies, on blue/red grounds.
FLO-DEV-021  four prophets, bearded, in green and red mantles
FLO-DEV-022  four prophets, two of them young and beardless
FLO-DEV-023  two prophets above, two crowned kings below
FLO-DEV-024  four crowned Old Testament kings with sceptres
FLO-DEV-025  four patriarchs with turbans and staffs
```

```
Batch florence-D2 (5 images). Same as florence-D1; vary poses, robe colours and canopy
designs so that no two windows look alike.
FLO-DEV-026 … FLO-DEV-030: four prophets each (mix of old and young, some pointing,
some looking up).
```

```
Batch florence-D3 (5 images). Same as florence-D1.
FLO-DEV-031  two bishop saints above, two prophets below
FLO-DEV-032 … FLO-DEV-035: prophets and kings mixed, four figures each.
```

## 받은 뒤

- `art/glass_dev/florence/textures/FLO-DEV-###.png` + `manifest.json` 으로 올린다(번들 밖).
- 계획서 §1.4 의 자리 묶음: 001 → `facade_N`/`facade_S` 중 하나(좌우 미확정), 002~005 → `aisleN/S_b3·b4`, 006~020 → `tribE/S/N_c1…c5`(순서 추정), 021~035 → 윗창을 뚫은 뒤.
- 모든 시안은 QA 갤러리에도 함께 건다.
