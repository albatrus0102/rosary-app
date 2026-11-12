# 성당 빌더 API (BUILDER_API)

여러 성당 내부를 서로 다른 에이전트가 동시에 만들 수 있도록, 월드 구성은 **빌더 파일 하나(`assets/church/ch_<id>.js`)** 로 분리되어 있다.
빌더는 W1 파일(`world.js`, `kit.js`, `scene_logic.js`, `main.js` …)을 **수정하지 않는다**. 모든 것은 `ctx` 도구 모음으로 한다.
기준 구현: `assets/church/ch_basic.js` (우리 본당) — 실제 사용 예로 먼저 읽을 것.

---------------------------------------------------------------------
## 0. 한눈에 보는 절차
1. `assets/church/ch_<id>.js` 작성 (`<id>`는 소문자 영문). 아래 1절 틀을 복사.
2. 빌더 등록: `node tools/church_web/register_builders.mjs` — `assets/church/ch_*.js`를 찾아 `index.html`/`test.html`의 **BUILDERS 블록**을 다시 쓴다(수동 편집 금지, 충돌 방지). 
   블록 모양(참고):
   ```html
   <!-- BUILDERS:BEGIN (자동 생성: node tools/church_web/register_builders.mjs) -->
   <script src="ch_basic.js"></script>
   <script src="ch_stpeter.js"></script>
   <!-- BUILDERS:END -->
   ```
3. 시험: 브라우저에서 `assets/church/test.html?church=<id>` (등록 전 개발 중이면 `&builder=../../tools/church_web/ch_x.js` 로 임의 빌더 파일을 먼저 읽힐 수 있다; WASD 이동, 버튼으로 앉기·시간대). URL 파라미터: `church`, `hour`(0..24), `solo`(0/1), `quality`(low/high), `x`,`z`(내 시작 위치), `yaw`,`pitch`(도), `zoom`(배율), `peers`(시험용 피어 수), `candles`(켠 초 수), `sit`(1이면 앉기), `hideui`(1이면 시험 UI 숨김), `thumb`(1이면 빌더의 `thumb` 카메라와 아바타 숨김).
4. 스크린샷: `node tools/church_web/shot.mjs <id> [출력.png] [--hour 11] [--pos x,z] [--yaw 도] [--pitch 도] [--zoom 1] [--solo] [--peers 5] [--size 960x540]` (Playwright, swiftshader 자동). `콘솔 에러 0`이어야 한다. 스크립트가 JS 에러/`console.error`가 있으면 종료코드 1.
5. 종합 점검: `node tools/church_web/e2e.mjs`(API·이벤트·AOI·성능). 레이아웃 내보내기: `node tools/church_web/export_layouts.mjs` → `server/church/src/layouts.json`. 썸네일: `node tools/church_web/thumbs.mjs [id…]` → `assets/church_thumbs/<id>.png`.
6. 단위 시험: `node --test "tools/church_web/*.test.mjs"` (Node 22 는 디렉터리 인자를 못 받으므로 글롭; 레이아웃 검증 시험이 모든 등록된 `ch_*.js`의 `layout`을 자동 검사: 좌석 id 형식·중복·경계 안·스폰이 장애물과 겹치지 않는지 등).

---------------------------------------------------------------------
## 1. 빌더 파일 틀

```js
/* ch_example.js — 예시: 작은 직사각 성당 */
(function () {
  'use strict';
  // (A) 레이아웃: 순수 데이터. THREE를 쓰지 말 것(서버 내보내기 스크립트가 Node에서 이 파일을 실행한다).
  var layout = {
    id: 'example', scalePercent: 100,
    bounds: { x0: -8, x1: 8, z0: -16, z1: 14 },
    spawn: { x: 0, z: 12, r: 0 },
    seatGroups: [
      { g: 'L', rows: 8, perRow: 4, origin: { x: -2.6, z: -6.65 }, dx: -1.0, dz: 1.9, rowDx: 0, yaw: 0 },
      { g: 'R', rows: 8, perRow: 4, origin: { x: 2.6, z: -6.65 }, dx: 1.0, dz: 1.9, rowDx: 0, yaw: 0 }
    ],
    candles: { stands: [{ x: 6.5, z: 0, slots: 16, cols: 8, face: [-1, 0] }] },
    info: { name: '예시 성당' }               // 선택. 자유 필드(서버는 무시)
  };
  ChurchLayouts.register(layout);          // layouts.js 의 단일 원본에 등록 (basic 외에는 이렇게)

  // (B) 빌더
  ChurchBuilders['example'] = {
    layout: layout,
    thumb: { x: 0, z: 10, yaw: 0, pitch: 14, zoom: 1, hour: 11 },   // 썸네일 카메라(선택)
    build: function (ctx) {
      var T = ctx.THREE;
      ctx.floor({ x0: -8, x1: 8, z0: -16, z1: 14, tex: ctx.tex.checker({ c1: 0xf4efe6, c2: 0xd9cfc0 }), tile: 2 });
      ctx.wall({ x0: -8, z0: -16, x1: 8, z1: -16, h: 8, t: 0.6, color: 0xf2e6cf });    // 후면 벽
      ctx.wall({ x0: -8, z0: -16, x1: -8, z1: 14, h: 8, t: 0.6, color: 0xf2e6cf });
      ctx.wall({ x0: 8, z0: -16, x1: 8, z1: 14, h: 8, t: 0.6, color: 0xf2e6cf });
      ctx.wall({ x0: -8, z0: 14, x1: 8, z1: 14, h: 8, t: 0.6, color: 0xf2e6cf });
      ctx.vault({ type: 'barrel', profile: 'round', x0: -8, x1: 8, z0: -16, z1: 14, y: 8, rise: 4, color: 0xf6eedc });
      ctx.window({ x: -7.7, z: -4, y: 2, face: [1, 0], w: 2, h: 3.2, top: 'pointed', seed: 3 });
      ctx.renderSeats(layout, 'bench');
      ctx.altar({ x: 0, z: -13, y: 0 });
      ctx.candleStand(0, {});
      ctx.addLight({ x: 0, y: 3, z: -12, color: 0xffc27a, intensity: 1.0, distance: 16 });
    }
  };
})();
```

`build(ctx)` 는 반환값이 없어도 된다(있으면 `{group?, colliders?, floorZones?}` 를 합친다). 월드 그룹과 충돌체는 `ctx`가 모은다.

---------------------------------------------------------------------
## 2. 좌표·단위·규칙 (SPEC 1·13절과 동일)
- 미터, x 오른쪽, y 위, z 입구 쪽(+z). **정면 = -z, 신자는 기본적으로 -z(제대) 쪽을 본다**. yaw 0 = -z를 봄, 앞 벡터 `f = (-sin yaw, -cos yaw)` (xz).
- 바닥 높이 기본 0. 단(성소 등)은 `ctx.floorZone`/`ctx.steps`로 등록하면 걷는 높이가 올라간다.
- 아바타 키 ≈ 1.6 m(머리 위 이름표 2.0 m). 통로 폭은 최소 1.0 m, 좌석 줄 사이 최소 1.2 m(권장 1.5–1.9).
- 축소(`layout.scalePercent`): 빌더는 **이미 축소된 최종 미터 좌표**로 짓는다. 실제 치수를 쓰려면 `ctx.S(realMeters)` (= `m * scalePercent/100`).
- 가장 긴 변 ≈ 70 m 이하. 걷는 영역(`bounds`) 안에서 좌석·통로가 막히지 않게 한다.
- 지오메트리는 **합쳐진 배치**(`ctx.solid`)에 들어가므로 수천 개 도형도 한 번의 draw call. 개별 `Mesh`(ctx.plane/ctx.mesh)는 draw call이 1개씩 늘어나므로 20개 이내로 쓴다. 전체 목표: 정점 < 250k, draw call < 60.
- 질감은 `ctx.tex.*`(캔버스 생성) 만. 외부 이미지·폰트·모델 금지.
- 재질: `ctx.mats.solid`(Lambert + 정점색, 빛 받음), `ctx.mats.glass`(스테인드글라스: 발광, 시간대에 따라 자동 밝기), `ctx.mats.glow`(빛 안 받는 발광, 등불/촛불 몸체).
- 색: 16진수 숫자(`0xf2e6cf`) 또는 CSS 문자열(`'#f2e6cf'`). 정점색은 자동으로 약간(±4%) 흔들린다(`vary:0`으로 끔).
- 모든 도형 도우미의 공통 옵션: `x,y,z`(**y는 바닥(아래쪽) 기준**, 구/타원은 중심), `ry`(Y축 회전 라디안), `color`, `flat`(면 단위 음영, 기본 true; 구·돔은 false), `vary`.

---------------------------------------------------------------------
## 3. ctx 필드 목록

### 3.1 기본
| 이름 | 설명 |
|---|---|
| `ctx.THREE` | three 네임스페이스 |
| `ctx.layout` | 이 성당의 레이아웃 |
| `ctx.scale` / `ctx.S(m)` | 축소 비율 0..1 / 실제 미터→월드 미터 |
| `ctx.quality` | `'low'`/`'high'` (low에서는 분할 수를 줄여도 됨) |
| `ctx.root` | 월드 `Group` (직접 `ctx.add(obj)`) |
| `ctx.rng(seed)` | 결정적 난수 함수 `()=>0..1` |
| `ctx.color(c)` → `THREE.Color`, `ctx.mix(a,b,t)` → 16진수, `ctx.shade(c,k)` → 16진수(k<1 어둡게, >1 밝게) | 색 도우미 |
| `ctx.add(obj3d)`, `ctx.mesh(geometry, material)` | 임의 객체 추가 |

### 3.2 질감 `ctx.tex.*` (반복 가능한 `CanvasTexture`, 같은 인자면 캐시)
- `checker({c1,c2,veins=true,size=256})` — 대리석 체스판 한 타일(2×2칸). 사용 시 `tile`(미터)로 크기를 정한다.
- `pattern(kind,{c1,c2,c3,size})` — `kind`: `'diamond'`(마름모), `'stripes'`, `'herringbone'`, `'stone'`(불규칙 판석), `'octagon'`, `'cosmati'`(코스마티 원·띠), `'terrazzo'`.
- `brick({brick,mortar,cols=6,rows=12,vary=.08,size})`, `ashlar({base,mortar})`(큰 석재 블록).
- `wood({base,dark,planks=4,direction:'x'|'y',size})` — 나뭇결/마루.
- `mosaic({base,accent,gold=true,size,tesserae=24})` — 금빛 모자이크(후진·돔 내부).
- `plaster({base,noise=.05})` — 회벽.
- `coffer({base,gold,border,n=3})` — 격자(coffered) 천장 한 타일.
- `custom(w,h,draw)` — `draw(ctx2d,w,h)`.

### 3.3 재질 `ctx.mats.*`
`solid`, `glass`, `glow`(위), `lambert({tex,tile?,color,side,opacity})`, `basic({...})`.

### 3.4 개별 면(질감 사용, 각각 draw call 1)
- `ctx.floor({x0,x1,z0,z1,y=0,tex|color,tile=2,zone=false})` — 바닥판. `zone:true`면 `floorZone`도 같이 등록(y>0일 때).
- `ctx.ceilingFlat({x0,x1,z0,z1,y,tex|color,tile=2})` — 평천장(아래를 향함). `tex: ctx.tex.coffer(...)` 로 격자 천장.
- `ctx.wallFace({x0,z0,x1,z1,y0,y1,facing:[nx,nz],tex|color,tile=2})` — 한 줄 벽면에 질감 붙이기(벽 박스 앞에 얇게 겹쳐 둔다).
- `ctx.plane({x,y,z,rx,ry,rz,w,h,tex|color,tile,side,mat})` — 일반 평면(중심 기준).
- `ctx.carpet({x0,x1,z0,z1,y=0,color,border})` — 양탄자(정점색 배치, draw call 없음).

### 3.5 구조 도형 (모두 `ctx.solid` 배치에 합쳐짐)
- `box({x,y,z,w,h,d,ry,color})` — x,z 중심, y 바닥. `boxAABB({x0,x1,y0,y1,z0,z1,color})`.
- `cyl({x,y,z,r,rTop=r,h,seg=10,color})`, `cone({x,y,z,r,h,seg,color})`, `sphere({x,y,z,r,sx,sy,sz,color,w=12,h=8})`(중심), `ico({x,y,z,r,detail=0,color})`.
- `wall({x0,z0,x1,z1,y=0,h,t=0.5,color,collide=true,tex?})` — 축에 맞춘(또는 사선) 벽 박스. **선분이 벽 두께의 가운데**다(안쪽 면 = 선 ± t/2). 창·벽감·프리즈는 벽의 *안쪽 면* 좌표에 붙인다(예: x=-8 에 t=.6 벽이면 창 x=-7.7). `collide`면 충돌체 자동 등록.
- `column({x,z,y=0,h,r,style,base,capital,color,capColor,collide=true})`
  - `style`: `'round'`(기본) `'fluted'`(홈 기둥, 16각) `'square'`(각기둥) `'pier'`(다발 기둥/기둥 다발 4+4) `'twisted'`(솔로몬 나선 기둥) `'engaged'`(벽에 붙은 반기둥, `ry`로 방향).
  - `capital`: `'doric'|'ionic'|'corinthian'|'composite'|'block'|'none'`, `base`: `true|false`.
  - 충돌: 원형 충돌체 자동(`collide:false`로 끔).
- `arch({x,y,z,span,rise,t=.4,depth=.5,axis:'x'|'z',type:'round'|'pointed'|'segmental'|'horseshoe',color})`
  — `x,z`는 아치 가운데, `y`는 **시작선(springline)**, `axis:'x'`면 x 방향으로 벌어짐(평면 xy), `'z'`면 z 방향. 아치 링(쐐기돌 상자)만 만든다. 아치 위 벽은 `wall`로 직접 쌓거나 `arcade({topY})` 를 쓴다. 연속 아케이드는 `arcade({x0,z0,x1,z1,spacing,...})` 로 한 번에.
- `arcade({x0,z0,x1,z1,y,h,span,pierR,type,color,collide})` — 직선 구간(x 또는 z 방향)을 기둥+아치로 채운다. 기둥 사이로 걷기 위해 충돌은 기둥 원만 등록.
- `vault({type,x0,x1,z0,z1,y,rise,profile,axis,ribs,ribColor,color,tex,bays})` — 천장 곡면(아래에서 보이는 면).
  - `type:'barrel'` 원통형(축 `axis:'z'`=앞뒤로 긴 통, 기본). `profile:'round'|'pointed'|'elliptic'|'segmental'`.
  - `type:'groin'` 교차 궁륭(칸마다 반복: `bays:[nx,nz]`, 지붕돌 높이 `rise`), `type:'ribbed'` 늑골 궁륭(groin + 대각선/횡단 늑골 `ribColor`/`ribT`/`crossRibs`, 정점 장식 `bossColor`, `pointed:true` 가능), `type:'sail'` 돛형(작은 돔형 칸), `type:'flat'`.
  - `y` = 곡면 시작 높이(springline), `rise` = 정점까지의 높이. `ribs:{every:m,t,d}`로 횡단 늑골/띠(나무보·돌띠) 추가. 격자(coffer) 천장은 곡면이 아니라 `ceilingFlat({tex:ctx.tex.coffer(..)})`(평천장)로 만든다. 늑골 하나만 따로 놓으려면 `ctx.vaultRib({axis,center,pos,y,a,rise,profile,t,d,color})`.
- `dome({x,z,y,r,rise,seg=20,rings=7,ribs=16,color,ribColor,bands,drum:{h,windows,w,colors},lantern:{h,r},oculus:false})`
  — 안쪽에서 보이는 반구형 돔(`y`=돔 시작 높이). `drum`을 주면 `y`에서 `y+h` 까지 원통 드럼(창 N개, 스테인드글라스 칸)을 먼저 세우고 그 위에 돔. `lantern`은 정상 채광탑(원통+창+작은 지붕). `bands:[c1,c2,…]` 고리별 띠 색.
- `apse({cx,cz,r,y=0,h,rise,dir:[0,-1],color,tex?,mosaic:true,ribs})` — 반원 후진: 반원 벽 + 반구형 반돔. `dir`은 열린 쪽에서 안쪽(후진 끝) 방향(제대 뒤쪽이면 `[0,-1]`). 반원 벽은 충돌체(여러 AABB)로 자동 등록.
- `window({x,y,z,face:[nx,nz],w,h,top:'round'|'pointed'|'flat'|'none'|'trefoil',pattern:'lancet'|'grid'|'tracery'|'solid',colors:[…],seed,frame:true,beam:true,glassDepth})`
  — `x,z`는 창 중심(벽면), `y`는 아래 틀(sill), `w` 폭, `h` 사각 부분 높이(위에 아치 `w/2`가 더 얹힘), `face`는 **실내를 향한 벽 법선**(왼쪽 벽 창은 `[1,0]`, 오른쪽 벽 `[-1,0]`, 입구 벽 `[0,-1]`, 후면 벽 `[0,1]`). 스테인드글라스는 `ctx.mats.glass`(발광)이고 `beam:true`면 낮에 빛줄기+바닥 빛무늬 자동 등록.
- `rose({x,y,z,face,r,petals=12,colors,seed,frame:true,beam:false})` — 원형 장미창(y는 중심).
- `statueNiche({x,y,z,face,w,h,kind:'mary'|'saint'|'christ'|'angel'|'generic',robe,mantle,skin,halo:true})` — 벽감(오목한 틀)+간단한 조각상(원뿔 옷, 구 머리, 후광). `statue({x,y,z,ry,h,kind,robe,mantle})`는 틀 없이 조각상만. (조각·프레스코는 색 면으로 대체한다는 SPEC 13절 방침)
- `altar({x,z,y=0,w=2.6,d=1.1,h=1,style:'table'|'block'|'tomb',color,cloth=true,candles=2,flowers=true,collide=true,ry})` — 제대(상판+발+제단보+촛대+불꽃, 충돌체 자동).
- `baldachin({x,z,y=0,w,d,h,canopyH,columns=4,style:'twisted'|'round',color,gold,cross=true})` — 발다키노(네 기둥+덮개). 기둥 충돌 자동.
- `pulpit({x,z,y=0,ry,h,style:'ambo'|'tall'|'round',color})` — 독서대/강론대.
- `tabernacle({x,z,y=0,ry,lamp:true})` — 감실 + 붉은 성소등(깜빡임 후광 자동).
- `crucifix({x,y,z,ry,h,glow=true})`, `chandelier({x,y,z,chain,r,tiers})`(y는 램프 중심, chain 길이만큼 위에서 매달림, 발광 구+후광 sprite), `lantern({x,y,z,chain})`.
- `holyFont({x,z,ry,y})`, `pew`는 `renderSeats` 로 대체, `steps({x0,x1,z0,z1,y0,y1,n=2,dir:[0,-1],color})` — 계단(+ 걷는 높이 자동), `floorZone({x0,x1,z0,z1,y})` — 높은 바닥 영역(여럿이면 가장 높은 값).
- `trees`/바깥: `ground({color,y=-0.05,size=600})`, `path({x0,x1,z0,z1,color})`, `scatterTrees({x0,x1,z0,z1,count,seed,minH,maxH,exclude:[{x0,x1,z0,z1}],palette})`, `hills({color,count,radius})`.

### 3.6 좌석 (레이아웃에서 그려진다)
`ctx.renderSeats(layout, style, opts)` — `layout.seatGroups` 전체를 그린다.
- `style`: `'bench'`(긴 의자, 줄 전체가 하나) 또는 `'chair'`(개별 의자). `opts`: `{wood,seat,back,cushion,kneeler,accent}` 색.
- **좌석 규칙(SPEC 1절 일반화)**: 좌석 줄마다 앉는 사람 **앞(f 방향)** 0.1–0.6 m 에 *앞줄 등받이 띠* 가 있고 이것이 충돌체(AABB)다. 앉는 사람은 그 띠 바로 뒤 공간(줄과 줄 사이 통로)에 앉는다. 일어서면 좌석 뒤쪽 `-f` 방향 통로로 나온다. 줄 사이(`dz`)는 ≥ 1.2 m, 권장 1.5–1.9. 방향 `yaw`는 90° 단위만 쓰면 충돌체가 정확하다(그 밖의 각도는 AABB 외접으로 근사).
- 좌석 높이 = 바닥 + 0.45 m. 좌석/띠 충돌체는 `ChurchLogic.rowBands(layout)`와 **동일한 순수 함수**로 계산되므로 서버·시험과 일치한다.

### 3.7 촛불대 `ctx.candleStand(i, opts)`
- 레이아웃 `candles.stands[i]`: `{x,z,slots,reach=1.8,cols=8,face:[-1,0],pitch=.7,step=.35,ystep=.35,y0=.8}` (basic: 96칸 = 16열 × 6행, `pitch .5, step .25, ystep .3`). `face` = 촛불대에서 사람 쪽으로 향하는 법선. 슬롯 위치(전역 번호): `row=floor(s/cols)`, `col=s%cols`, 위치 = `(x,z) + perp*(col-(cols-1)/2)*pitch - face*step*(rows-1-row)`, 높이 `y0 + 0.35*(rows-1-row)`. (basic: 3×8)
- **초(컵·불꽃·촛불 빛)는 코어가 자동 렌더**한다(빌더는 호출 불필요). `ctx.candleStand(i,{wood,metal,width})`는 받침대/선반 가구와 충돌체만 그린다. 호출하지 않으면 초만 공중에 보이므로 호출 권장.

### 3.7b 기타 도우미 (구현됨)
- `medallionFrieze({x0,z0,x1,z1,y,h,facing,color,gold,inner,spacing})` — 벽 위쪽 원형 메달리온 띠(색 면 + 금테 원판; 초상 대신 색 면).
- `cornice({x0,z0,x1,z1,y,h,facing,depth,color})` — 벽면을 따라 튀어나온 띠/몰딩.
- `pilaster({x,z,y,h,r,capital,color,capColor,ry})` — 벽에 붙은 기둥(`column` 단축).
- `beam3(p0,p1,t,d,color)` — 임의 두 점 사이의 보(상자).
- `ctx.solid / ctx.glass / ctx.glow` — 정점색 배치 직접 접근: `add(geometry,color,{x,y,z,rx,ry,rz,sx,sy,sz,flat,vary,c2})`, `addQuad(a,b,c,d,color,hintPoint)`, `addTris(flatVerts,color|[Color…],hintPoint)`, `addBeam(p0,p1,t,d,color)`. `hintPoint`(앞면이 향할 쪽 점)를 주면 면 방향이 자동으로 맞춰진다.
- `column({tex})` / `wall({tex})` — 질감이 필요한 경우만(개별 Mesh, draw call 1). 벽돌 기둥은 `ctx.tex.brick`.
- `ctx.loadTexture(url, fallbackFactory)` — **외부 CC0/MIT 질감**(아래 3.10).

### 3.8 충돌·바닥·카메라
- `ctx.addCollider({x0,x1,z0,z1})`(AABB) / `ctx.addCollider({x,z,r})`(원). 아바타 반경 0.3 m. 문·벽·기둥·제대·조각 받침 등 **걸어서 통과하면 안 되는 모든 것**. 도형 도우미 중 `collide` 옵션이 있는 것은 자동 등록.
- `ctx.floorZone({x0,x1,z0,z1,y})` 걷는 높이. `ctx.steps(...)` 가 같이 처리.
- `bounds` 밖으로는 못 나간다(걷기 영역은 반경만큼 안쪽). 바깥 벽·문 앞 등은 충돌체로 막는다.
- 카메라: 기본은 걷기 영역 + 여유. `ctx.setCameraBounds({x0,x1,z0,z1,yMax})` — 예: 입구 문 밖으로 카메라가 나가는 것을 허용(`z1`을 늘림), 낮은 천장이면 `yMax`를 천장 아래로. **천장이 낮은(< 7 m) 성당은 반드시 yMax 지정.**

### 3.10 외부 질감 (선택, 온라인일 때만)
사용자 결정으로 앱은 인터넷이 있어도 된다. 그래서 **CC0/MIT 라이선스 질감**(ambientCG, Poly Haven 등)을 HTTPS로 불러 쓸 수 있다.
```js
var marble = ctx.loadTexture('https://…/Marble_Color.jpg', function () { return ctx.tex.checker({}); });   // 즉시 대체 질감을 돌려주고, 로드되면 그림이 교체된다
ctx.floor({ x0:…, tex: marble, tile: 4 });
```
- 규칙: **CC0 또는 MIT 출처만.** 쓰는 URL마다 `docs/church/ASSET_LICENSES.md` 에 URL·출처·라이선스를 기록한다. 이미지는 1k(1024px) 이하 JPG.
- 실패해도(오프라인·차단) 대체 질감으로 장면이 정상 동작해야 한다(첫 프레임을 막지 않는다). 필수 요소를 외부 자산에 의존하지 말 것. three.js 는 계속 로컬 번들.
- 반복 질감이어야 한다(이음매 없는 타일). 서로 다른 repeat 가 필요하면 `ctx.floor/plane/wall({tex,tile})` 가 복제해 준다.

### 3.9 조명·시간대·효과
- `ctx.addLight({x,y,z,color,intensity=1,distance=14,kind:'lamp'|'candle'|'always'})` — **점광원은 성당당 1개만**(성능; 촛불대용 1개는 코어가 별도로 가짐). 둘째 호출은 경고 후 무시. `kind:'lamp'`는 밤/황혼에 강하게, 낮에는 약하게.
- 기본 조명(반구광+방향광+안개)과 하늘/해/달/별/구름은 **코어가 시간대별로 자동 처리**한다. 빌더가 신경 쓸 것 없음.
- `ctx.addGlow({x,y,z,size,color,pulse})` — 부드러운 후광 sprite(점광원 아님, 값싸다). `ctx.addFlame({x,y,z,scale})` — 깜빡이는 불꽃(제대 촛불 등).
- `ctx.addWindowBeam({x,y,z,face:[nx,nz],w,h,colors:[…],reach})` — 창 하나의 햇빛 기둥을 직접 등록(보통 `window({beam:true})`가 대신).
- `ctx.onHour(fn(env))` — 시간대가 바뀔 때 호출. `env = {hour, day(0..1), dusk, night, sunDir:[x,y,z]}`.
- `ctx.onUpdate(fn(dt,t))` — 매 프레임(할당 없이 가볍게).
- `ctx.addGlow` 의 `kind`: `'lamp'`(밤에 밝음)·`'always'`·`'none'`.
- `ctx.setSky({outside:true|false})` — 문이 열려 바깥이 보이는 성당만 `ground/path/scatterTrees`를 쓰고, 그렇지 않으면 쓰지 않는다(하늘 돔은 항상 있음).

---------------------------------------------------------------------
## 4. 레이아웃 스키마 (단일 원본 `assets/church/layouts.js` → `window.ChurchLayouts`)
```json
{ "id":"basic", "scalePercent":100,
  "bounds":{"x0":-12,"x1":12,"z0":-20,"z1":20},
  "spawn":{"x":0,"z":17,"r":0},
  "seatGroups":[{"g":"L","rows":12,"perRow":6,"origin":{"x":-3.2,"z":-9.65},"dx":-1.0,"dz":1.9,"rowDx":0,"yaw":0}],
  "candles":{"stands":[{"x":10.5,"z":0,"slots":24,"reach":1.8}]} }
```
- 좌석 id `${g}${row2}-${idx}`, 위치 `x = origin.x + dx*idx + rowDx*row`, `z = origin.z + dz*row (+ dzIdx*idx)`. 확장 필드(선택): `dzIdx`(줄이 z 방향으로 놓일 때), `pad:[시작쪽,끝쪽]`(띠 여백, 기본 [0.6,0.6]).
- 좌석 수 60–200/성당. 좌석 id 그룹 문자 g는 성당 안에서 유일한 대문자 1–2자.
- `ChurchLayouts.register(layout)`로 등록. `ch_<id>.js` 맨 위에서 호출(THREE 없이 실행되어야 함).
- 서버용 JSON은 `export_layouts.mjs`가 **좌석 목록을 미리 계산해** (`seats:[{id,x,z,yaw}]`, 촛불 슬롯 위치 `slotPos`) 함께 쓴다.
- 레이아웃 시험(`tools/church_web/layouts.test.mjs`)이 자동 검사: 좌석 id 형식/중복, 좌석·스폰이 `bounds` 안, 촛불대 `slots`≥1, 스폰이 좌석 띠와 겹치지 않음.

---------------------------------------------------------------------
## 4b. 참고 시안(§14)에서 표현 가능한 것과 제약
| 시안 요소 | 도구 |
|---|---|
| 금빛+남색 코퍼 천장 | `ceilingFlat({tex: tex.coffer({base,gold,border})})` |
| 이오니아 기둥(볼류트) | `column({capital:'ionic', style:'fluted'})`, 줄 전체는 `arcade` |
| 반원 후진 + 금 모자이크 반돔 | `apse({mosaic:true, domeColor, bands})` + 정점색 띠 (그림은 색 면) |
| 청동 꼬임 기둥 발다키노 | `baldachin({style:'twisted'})`, `column({style:'twisted'})` |
| 기둥/벽의 사도 벽감 | `statueNiche`(단순 조각), 벽면 전체는 `wall`+`arch` |
| 코스마테스크 바닥 | `tex.pattern('cosmati'|'octagon'|'diamond'…)`, `tex.checker` |
| 메달리온 프리즈 | `medallionFrieze` |
| 회색 벽돌 기둥 + 흰 늑골 궁륭 | `column({tex: tex.brick({…})})`(개별 메쉬) 또는 `style:'pier'`(정점색), `vault({type:'ribbed', pointed:true})` |
| 키 큰 스테인드글라스 | `window({top:'pointed', w:1.2, h:5})`, `pattern:'lancet'|'grid'`, 큰 후진 창 `window` 여러 개 |
| 돔에서 내려오는 빛줄기 | `dome({drum:{windows,…}, lantern:{}})`(자동 빔) + `addWindowBeam({dome:true})` |
| 고딕 치보리움/닫집 | 상자·원뿔·`arch`·`beam3` 조합(전용 도우미 없음) |
| 합창석/제의실 목재 | `box`+`tex.wood` 면 (전용 도우미 없음) |

## 5. 성능·품질 체크리스트
- 정점 수(`__church.world.stats`): `console.log(__church.world.stats)` 로 확인. 목표 정점 < 250k, 메쉬 < 60.
- 돔·궁륭 분할은 `ctx.quality==='low'`에서 절반으로.
- 창 스테인드글라스 칸 수가 많으면(창 30개 이상) `pattern:'solid'` 또는 `seg` 감소.
- 충돌체 개수 < 300(아바타 한 명당 프레임마다 검사).
- 걷기 영역에 막다른 틈이 없는지(스폰에서 모든 좌석 줄까지 갈 수 있는지) 스크린샷·`test.html`에서 직접 걸어 본다.

## 6. 흔한 실수
- `window`의 `face` 방향을 반대로 주면 창이 벽 안쪽(안 보임)을 향한다. 실내를 향하는 방향이 맞다.
- 벽을 `ctx.wall`로 막고 창을 벽면(`x = 벽 안쪽 면 ± 0.02`)에 정확히 붙이지 않으면 깜빡임(z-fighting).
- 기둥 충돌 반경이 좌석 띠와 겹치면 길이 막힌다. 줄 끝에서 기둥까지 ≥ 1.0 m.
- `layout`에서 `THREE` 참조 금지. 빌더 파일 최상위에서 `THREE`를 건드리지 말 것(모든 THREE 사용은 `build` 안).
- 빌더 안에서 전역(`window`) 상태를 만들지 말 것. `build`는 성당을 바꿀 때마다 새로 호출된다.


---------------------------------------------------------------------
## 7. 사실감 도구 (Realism toolkit, v3) — 기존 빌더는 그대로 동작하고 자동으로 더 좋아 보인다
엔진이 **PBR 재질·HDRI 환경광·태양 그림자·창 개구부·후처리(AO/블룸)·ACES 톤매핑**을 처리한다. 빌더는 *어떤 표면인지*만 알려 주면 된다. 아래는 모두 **선택 옵션**이며 `color`만 쓰던 코드는 변함없이 돈다(금색은 자동으로 금속 처리).

### 7.1 색과 재질 라우팅
- 색은 지금처럼 sRGB 16진수. 엔진이 선형으로 변환하고 sRGB 로 출력한다(`ChurchGeo`가 `ColorManagement` 를 켠다). 아바타·스프라이트·캔버스 질감도 같은 규칙.
- 모든 도형 도우미(`box/boxAABB/cyl/cone/sphere/ico/arch/arcade/column/wall/vault/dome/apse/steps/...`)가 받는 새 옵션:
  | 옵션 | 뜻 |
  |---|---|
  | `mat:'solid'` | 무광 돌/회반죽 (기본, 거칠기 .84) |
  | `mat:'gloss'` 또는 `gloss:true` | 광택 대리석/유약: 거칠기 .16 + 클리어코트 .8 |
  | `mat:'wood'` | 옻칠 나무: 거칠기 .5 + 클리어코트 .55 |
  | `mat:'metal'` 또는 `metal:true` | 금속(금/청동): metalness 1, 거칠기 .3, 환경광 반사 |
  | `mat:'outside'` | 바깥 풍경(그림자 안 드리움, AO 안 구움) |
  | `surf:'이름'` | **표면(사진 질감 PBR)**: 아래 7.2. 이때 `color` 는 곱해지는 색조(기본 흰색) |
- 금색 자동 감지: 색이 금빛(색상 36–52°, 채도 높음)이면 `mat:'metal'` 이 된다. 도금이 아니면 `mat:'solid'` 로 막을 수 있다.
- 직접 접근: `ctx.solid / ctx.gloss / ctx.woodB / ctx.metalB / ctx.glass / ctx.glow / ctx.outsideB` 배치(`add/addQuad/addTris/addBeam`). 재질: `ctx.mats.solid|gloss|wood|metal|glass|glow` 와 `ctx.mats.surface(name)`(PBR 재질 한 개 새로 만들기), `ctx.mats.standard({...})`.

### 7.2 표면(Surfaces) — 사진 질감 + PBR
`surf:'marble_white'` 처럼 이름만 주면 색/법선/거칠기 사진이 월드 좌표 박스 투영 UV 로 자동 입혀진다(타일 크기 미터는 사전에 정의). 같은 표면은 **하나의 draw call** 로 합쳐진다.

| 이름 | 느낌 | 타일(m) | 비고 |
|---|---|---|---|
| `marble_white` | 흰 대리석(칼라라풍) | 1.6 | 광택, 클리어코트 |
| `marble_black` | 검은 대리석(흰 맥) | 1.6 | 광택 |
| `marble_beige` | 베이지 대리석 | 1.6 | 광택 |
| `marble_rose` | 분홍빛 대리석 | 1.6 | 광택 |
| `marble_checker` | 흰/검정 2×2 체스판 | 2.4 | 한 장이 2×2칸 |
| `limestone` | 연한 석회암 블록 | 1.8 | 반무광 |
| `plaster` | 회반죽 벽/천장 | 2.6 | 무광 |
| `stone_grey` | 회색 석재/화강암풍 | 2.6 | 무광 |
| `brick_grey` | 회색 벽돌 | 2.4 | 명동·밀라노 풍 |
| `wood_dark` | 짙은 마호가니 나무 | 1.4 | 옻칠 |
| `wood_cherry` | 매우 어두운 체리 나무 | 1.4 | 옻칠 |
| `mosaic_gold` | 금빛 모자이크(반금속, 약한 자체발광) | 1.6 | 후진 반돔·개선문 |
| `gold_relief` | 금박 장식 | 3.0 | |
| `fresco_dome` | 바로크 천장화(사진) | 6.0 | 돔 안쪽, `dome({surf, surfRepeat})` |
- 새 표면 정의: `ctx.defineSurface('stpeter_floor', { photo:'stpeter_floor', tile:[2.4,2.4], clearcoat:0.8, ccRough:0.06, normalScale:0.4, metalness:0, roughness:0.7, envK:1.2, color:0xffffff, emissive:0 })`. `photo` 는 `tex_<photo>.jpg`(+ 선택 `_n.jpg` 법선, `_r.jpg` 거칠기). 사진이 없으면 절차 생성 대체 질감(`fb:'marble'|'plaster'|'brick'|'wood'|'mosaic'`)을 쓴다.
- **성당별 사진 추가 규칙**: `assets/church/tex_<성당id>_*.jpg`(≤1024px, JPEG q≈80)로 두고 `node tools/church_web/build_texpack.mjs --church <성당id>` 를 실행하면 `tex_pack_<성당id>.js`(data URI)가 만들어진다. 그 뒤 `node tools/church_web/register_builders.mjs` 가 그 JS 를 페이지에 등록한다. 출처·작가·라이선스·표시 문구는 `docs/church/licenses/<성당id>.md` 에 쓰고 공용 목록 `docs/church/ASSET_LICENSES.md` 규칙(CC0/PD/CC-BY만)을 지킨다.
- 사진 질감 직접 쓰기: `ctx.photoTex(name, {repeat:[rx,ry], enc:'srgb'|'linear', fallback:()=>ctx.tex.plaster({})})` → `THREE.Texture`(그림은 비동기로 교체, 호출마다 새 인스턴스). `ctx.hasPhoto(name)`.
- 개별 면: `ctx.floor/ceilingFlat/plane/wallFace({surf, tile, gloss, color})`. `gloss`(0..1, 질감 면 기본 .75). `ctx.floor({reflect:true|0..1})` 로 **평면 반사**(고화질에서 거울처럼 기둥·창이 비친다; 광택≥.6 바닥은 자동, 성당당 바닥 2장까지).

### 7.3 벽과 진짜 창 (실제 개구부)
- `ctx.wall()` 은 이제 **지연 생성**된다: 같은 면에 놓인 `ctx.window()` 마다 벽에 **실제 구멍**(반원/뾰족 아치 상부 포함, 구멍 옆면·아치 소핏)을 뚫는다. 그래서 태양빛이 창으로 들어와 바닥/신자석/기둥에 창 모양 빛 무늬를 그린다(고화질). 창 `face` 와 벽이 나란하고 창이 벽 안쪽 면 ±0.45m 이내·벽 높이 안이면 자동 매칭. 매칭 안 되면 벽면에 그려진 창(painted)이 된다(`painted:true` 로 강제 가능, 돔 드럼 창은 painted).
- 창은 구멍 안에 **스테인드글라스(발광, 낮에 밝고 밤에 어두움) + 납선 + 가는 창살(`pattern:'lancet'|'grid'`) + 돌 틀·창턱 + 얇은 반사 유리막**이 들어간다. 창의 컬러 `colors:[...]` 는 보석톤이 기본.
- `wall({plinth, crown, plinthColor, crownColor})`: 걸레받이·처마 돌림띠를 자동 생성(기본: 높이≥2.5m 바닥 벽은 걸레받이, ≥3.5m 는 돌림띠). `false` 로 끈다.
- 벽 주변 접촉 AO 는 자동. 직접: `ctx.aoDecal({x0,x1,z0,z1,y,pad})`, `ctx.aoDecalCircle({x,z,r,y})`. 정점 AO 굽기(바닥 근처 세로면·아래향 면 어둡게)는 기본 켜짐: `ctx.setAO(false)` 또는 `ctx.setAO({floor:.36, under:.28, height:.5})`.

### 7.4 시간대·조명·그림자 (자동)
- 해가 뜨고 지는 경로(아침 제대 뒤→정오 오른쪽(+x, 남쪽) 높이→저녁 입구 쪽)에 따라 **태양 방향광(그림자맵 2048, PCFSoft)**, 하늘, 안개, 환경광 세기, 노출이 바뀐다. 유리 빛줄기(볼륨 샤프트 + 바닥 색 빛무늬)도 실제 태양 방향으로 정렬된다(태양이 창 뒤에 있을 때만).
- `ctx.addLight` 점광원은 여전히 성당당 1개(+ 촛불대용 코어 1개). 동적 광원 합계는 반구광+태양+점광 2 = 4. 점광 `intensity` 는 1.0 이 보통(코어가 물리 단위로 환산).
- `ctx.addGlow/addFlame` 의 불꽃·후광은 블룸을 받는다. 램프·촛불 몸체를 더 빛나게 하려면 `ctx.glow.add(geometry, new THREE.Color(0xffd78a).multiplyScalar(2.2), ...)` 처럼 색을 1 보다 크게(HDR).
- 금속(`metal`)은 환경 HDRI 반사에 의존한다 → 창 쪽/어두운 쪽 모두에서 금빛이 살아 있다. 거친 돌은 `mat:'solid'`.

### 7.5 화질 단계와 자동 하향
- `quality:'high'`(기본): 그림자 + 평면 반사 + 블룸 + SSAO + 클리어코트 + MSAA. `'low'`: 후처리 없음, 그림자 없음, 반사 없음, 클리어코트 없음(굽기 AO·환경 반사·PBR 은 유지).
- 프레임 시간 평균(3초)이 45ms 를 넘으면 자동으로 `low` 로 내려간다(`perf` 이벤트에 `tier` 필드: `{"e":"perf","fps":..,"tier":"low"}`). 정점 < 250k, draw call < 약 300 을 지킬 것(고화질은 반사/그림자로 장면을 2~3번 그린다).
- 시험용 URL 파라미터: `frames=N`(N 프레임 그린 뒤 정지 — 스크린샷용), `autotier=0`(자동 하향 끔; 소프트웨어 렌더에서는 필수), `msaa=0`, `ao=0`, `quality=low|high`.

### 7.6 현실감 체크리스트(빌더용)
1. 큰 면은 `surf` 로 사진 질감: 바닥·벽·천장·기둥. 단색 박스 덩어리를 피한다.
2. 바닥은 광택(`gloss:.9`), 금속은 `metal`, 나무는 `wood`/`wood_dark`.
3. 벽에는 몰딩: `wall` 의 걸레받이·돌림띠, `cornice`, 기둥 `base/capital`, `arch` 두께 .35–.5.
4. 창은 반드시 `ctx.wall` 에 놓인 벽 위에(안쪽 면 좌표) — 진짜 구멍·빛줄기·그림자가 생긴다.
5. 양탄자는 실제 성당에 있을 때만(`ctx.carpet` 은 천 질감·테두리 무늬). 없는 성당이면 쓰지 않는다.
6. 신자석은 `ctx.renderSeats(layout,'bench'|'chair')` 가 실제 비율(등받이 판·상단 레일·기도대·좌석판·둥근 옆판)로 그린다.
7. 색은 채도 낮은 따뜻한 돌색, 깊은 나무색, 진한 금색. 파스텔 장난감 색 금지.
