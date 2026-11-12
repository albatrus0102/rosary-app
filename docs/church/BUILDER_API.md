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
3. 시험: 브라우저에서 `assets/church/test.html?church=<id>` (WASD 이동, 버튼으로 앉기·시간대). URL 파라미터: `church`, `hour`(0..24), `solo`(0/1), `quality`(low/high), `x`,`z`,`yaw`(도), `pitch`(도), `dist`(미터 배율), `peers`(수).
4. 스크린샷: `node tools/church_web/shot.mjs <id> [출력.png] [--hour 11] [--pos x,z] [--yaw 도] [--pitch 도] [--zoom 1] [--solo] [--peers 5] [--size 960x540]` (Playwright, swiftshader 자동). `콘솔 에러 0`이어야 한다. 스크립트가 JS 에러/`console.error`가 있으면 종료코드 1.
5. 레이아웃 내보내기: `node tools/church_web/export_layouts.mjs` → `server/church/src/layouts.json`. 썸네일: `node tools/church_web/thumbs.mjs [id…]` → `assets/church_thumbs/<id>.png`.
6. 단위 시험: `node --test tools/church_web/` (레이아웃 검증 시험이 모든 등록된 `ch_*.js`의 `layout`을 자동 검사: 좌석 id 형식·중복·경계 안·스폰이 장애물과 겹치지 않는지 등).

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
      ctx.window({ x: -7.95, z: -4, y: 2, face: [1, 0], w: 2, h: 3.2, top: 'pointed', seed: 3 });
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
- `wall({x0,z0,x1,z1,y=0,h,t=0.5,color,collide=true,tex?})` — 축에 맞춘(또는 사선) 벽 박스. `collide`면 충돌체 자동 등록.
- `column({x,z,y=0,h,r,style,base,capital,color,capColor,collide=true})`
  - `style`: `'round'`(기본) `'fluted'`(홈 기둥, 16각) `'square'`(각기둥) `'pier'`(다발 기둥/기둥 다발 4+4) `'twisted'`(솔로몬 나선 기둥) `'engaged'`(벽에 붙은 반기둥, `ry`로 방향).
  - `capital`: `'doric'|'ionic'|'corinthian'|'composite'|'block'|'none'`, `base`: `true|false`.
  - 충돌: 원형 충돌체 자동(`collide:false`로 끔).
- `arch({x,y,z,span,rise,t=.4,depth=.5,axis:'x'|'z',type:'round'|'pointed'|'segmental'|'horseshoe'|'trefoil',color,fill})`
  — `x,z`는 아치 가운데, `y`는 **시작선(springline)**, `axis:'x'`면 x 방향으로 벌어짐(평면 xy), `'z'`면 z 방향. `fill:true`면 아치 위쪽 반원 빈틈은 채우지 않는다(벽을 `wall`로 직접 쌓을 것). 연속 아케이드는 `arcade({x0,z0,x1,z1,spacing,...})` 로 한 번에.
- `arcade({x0,z0,x1,z1,y,h,span,pierR,type,color,collide})` — 직선 구간(x 또는 z 방향)을 기둥+아치로 채운다. 기둥 사이로 걷기 위해 충돌은 기둥 원만 등록.
- `vault({type,x0,x1,z0,z1,y,rise,profile,axis,ribs,ribColor,color,tex,bays})` — 천장 곡면(아래에서 보이는 면).
  - `type:'barrel'` 원통형(축 `axis:'z'`=앞뒤로 긴 통, 기본). `profile:'round'|'pointed'|'elliptic'|'segmental'`.
  - `type:'groin'` 교차 궁륭(칸마다 반복: `bays:[nx,nz]`), `type:'ribbed'` 늑골 궁륭(groin + 대각선/횡단 늑골 `ribColor`, `pointed:true` 가능), `type:'sail'` 돛형(작은 돔형 칸), `type:'flat'`.
  - `y` = 곡면 시작 높이(springline), `rise` = 정점까지의 높이. `ribs:{every:m}`로 횡단 늑골/띠(나무보·돌띠) 추가, `tex`는 개별 메쉬 대신 정점색 줄무늬/격자(`coffer:true`)로 근사.
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
- 레이아웃 `candles.stands[i]`: `{x,z,slots,reach=1.8,cols=8,face:[-1,0],pitch=.7,step=.35,y0=.8}`. `face` = 촛불대에서 사람 쪽으로 향하는 법선. 슬롯 위치(전역 번호): `row=floor(s/cols)`, `col=s%cols`, 위치 = `(x,z) + perp*(col-(cols-1)/2)*pitch - face*step*(rows-1-row)`, 높이 `y0 + 0.35*(rows-1-row)`. (basic: 3×8)
- **초(컵·불꽃·촛불 빛)는 코어가 자동 렌더**한다(빌더는 호출 불필요). `ctx.candleStand(i,{wood,metal,width})`는 받침대/선반 가구와 충돌체만 그린다. 호출하지 않으면 초만 공중에 보이므로 호출 권장.

### 3.8 충돌·바닥·카메라
- `ctx.addCollider({x0,x1,z0,z1})`(AABB) / `ctx.addCollider({x,z,r})`(원). 아바타 반경 0.3 m. 문·벽·기둥·제대·조각 받침 등 **걸어서 통과하면 안 되는 모든 것**. 도형 도우미 중 `collide` 옵션이 있는 것은 자동 등록.
- `ctx.floorZone({x0,x1,z0,z1,y})` 걷는 높이. `ctx.steps(...)` 가 같이 처리.
- `bounds` 밖으로는 못 나간다(걷기 영역은 반경만큼 안쪽). 바깥 벽·문 앞 등은 충돌체로 막는다.
- 카메라: 기본은 걷기 영역 + 여유. `ctx.setCameraBounds({x0,x1,z0,z1,yMax})` — 예: 입구 문 밖으로 카메라가 나가는 것을 허용(`z1`을 늘림), 낮은 천장이면 `yMax`를 천장 아래로. **천장이 낮은(< 7 m) 성당은 반드시 yMax 지정.**

### 3.9 조명·시간대·효과
- `ctx.addLight({x,y,z,color,intensity=1,distance=14,kind:'lamp'|'candle'|'always'})` — **점광원은 성당당 1개만**(성능; 촛불대용 1개는 코어가 별도로 가짐). 둘째 호출은 경고 후 무시. `kind:'lamp'`는 밤/황혼에 강하게, 낮에는 약하게.
- 기본 조명(반구광+방향광+안개)과 하늘/해/달/별/구름은 **코어가 시간대별로 자동 처리**한다. 빌더가 신경 쓸 것 없음.
- `ctx.addGlow({x,y,z,size,color,pulse})` — 부드러운 후광 sprite(점광원 아님, 값싸다). `ctx.addFlame({x,y,z,scale})` — 깜빡이는 불꽃(제대 촛불 등).
- `ctx.addWindowBeam({x,y,z,face:[nx,nz],w,h,colors:[…],reach})` — 창 하나의 햇빛 기둥을 직접 등록(보통 `window({beam:true})`가 대신).
- `ctx.onHour(fn(env))` — 시간대가 바뀔 때 호출. `env = {hour, day(0..1), dusk, night, sunDir:[x,y,z]}`.
- `ctx.onUpdate(fn(dt,t))` — 매 프레임(할당 없이 가볍게).
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
