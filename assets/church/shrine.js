/* shrine.js — 성당마다 한 곳 '성모 기도 자리': 성모상(받침·뒤판) + 작은 봉헌초 받침 + 무릎틀.
   자리 표는 shrine_places.js. 빌더(ch_*.js)는 고치지 않는다.
   - applyLayout(layout): 봉헌초 받침을 layout.candles.stands 의 **맨 끝**에 붙인다(기존 슬롯 번호는 그대로, 새 슬롯은 그 뒤 14개).
     layouts.js 뒤에 실리면 ChurchLayouts.register 를 감싸 모든 성당에 자동 적용된다(서버 layouts.json 도 같은 경로).
     → 기존 봉헌초 체계(scene_logic.candleSlots · stations.js candle 스테이션 · world.js 초 인스턴스)가 그대로 쓴다.
   - build(ctx, layout): 빌더가 끝난 뒤(world.js) 가구를 kit 배치에 더하고 충돌체를 넣는다. 실시간 조명 없음.
   kind 'pond'(당고개): 받침·무릎틀 대신 성모상 앞 지름 1.5m 둥근 연못에 초를 띄운다(원형 슬롯 18, scene_logic ring 배치).
   치수(성상 중심에서 바라보는 쪽으로 d): 뒤판 -0.27, 받침 0, 초 받침 0.6, 무릎틀 책상 1.0, 무릎 방석 1.3, 서는 자리 1.6. */
(function (root) {
  'use strict';
  var SLOTS = 14, COLS = 7, STAND_D = 0.6, HALF_W = 0.62, FRONT_D = 1.07;
  function places() { return root.ChurchShrinePlaces || (typeof require === 'function' ? require('./shrine_places.js') : {}); }
  function placeOf(id) { var p = places()[id]; return p && !p.pending ? p : null; }
  function face(p) { var a = (p.yaw || 0) * Math.PI / 180; return [Math.round(Math.sin(a)), Math.round(Math.cos(a))]; }
  // 연못(kind 'pond'): 성모상 앞 지름 1.5m 둥근 연못에 초를 띄운다(당고개 — 사용자 제보). 슬롯은 동심원 2겹(6 + 12).
  var POND = { D: 1.5, R: 0.75, RIM: 0.12, RIM_H: 0.22, WATER_Y: 0.15, SLOTS: 18, RINGS: [{ r: 0.3, n: 6, a0: 0 }, { r: 0.56, n: 12, a0: Math.PI / 12 }] };
  function standOf(p) {
    var f = face(p);
    if (p.kind === 'pond') {
      return { x: +(p.x + f[0] * POND.D).toFixed(3), z: +(p.z + f[1] * POND.D).toFixed(3), slots: POND.SLOTS, reach: 2.1, face: f, ring: POND.RINGS, float: true, y0: (p.y || 0) + POND.WATER_Y, shrine: true, pond: true, label: p.label_ko || '성모상 앞' };
    }
    return { x: +(p.x + f[0] * STAND_D).toFixed(3), z: +(p.z + f[1] * STAND_D).toFixed(3), slots: SLOTS, reach: 1.8, cols: COLS, face: f, pitch: 0.15, step: 0.14, ystep: 0.07, y0: (p.y || 0) + 0.74, shrine: true, label: p.label_ko || '성모상 앞' };
  }
  // 아바타가 지나가지 못하는 자리(성상~무릎틀 책상). existing 은 성상 쪽을 빌더 충돌체가 이미 막는다.
  function footprint(p) {
    var pond = p.kind === 'pond', hw = pond ? POND.R + POND.RIM : HALF_W, fd = pond ? POND.D + POND.R + POND.RIM : FRONT_D;
    var f = face(p), d0 = p.kind === 'existing' ? 0.3 : -0.3, a = [p.x + f[0] * d0, p.z + f[1] * d0], b = [p.x + f[0] * fd, p.z + f[1] * fd];
    var lx = Math.abs(f[1]) * hw, lz = Math.abs(f[0]) * hw;
    return { x0: Math.min(a[0], b[0]) - lx, x1: Math.max(a[0], b[0]) + lx, z0: Math.min(a[1], b[1]) - lz, z1: Math.max(a[1], b[1]) + lz };
  }
  function applyLayout(layout) {
    if (!layout || layout.shrine) return layout;
    var p = placeOf(layout.id);
    if (!p) return layout;
    if (!layout.candles) layout.candles = { stands: [] };
    layout.candles.stands.push(standOf(p));
    layout.shrine = { x: p.x, z: p.z, y: p.y || 0, yaw: p.yaw || 0, kind: p.kind, label: p.label_ko || '성모상 앞', stand: layout.candles.stands.length - 1 };
    return layout;
  }
  // 그림 성모상: 살짝 굽힌 판(호 80°, 볼록한 쪽이 앞)에 알파 그림을 입힌다. alphaTest(혼합 아님) → 정렬 문제·겹쳐 그리기 없음, draw call 1.
  // 그림 묶음(art_statue_<img>.js)은 이 성당에 들어올 때만 읽고, 월드 해제 때 재질·질감이 함께 놓인다(world.dispose 가 map 을 놓는다).
  // 브라우저가 아니면(시험) false → kit 도형 성상을 쓴다.
  var STATUE = { H: 1.42, ARC: 80 * Math.PI / 180, SEG: 10, D0: -0.04 };
  function imageStatue(ctx, p, f, y0) {
    var T = ctx.THREE;
    if (!T || !T.BufferGeometry || typeof document === 'undefined' || !document.head || !document.head.appendChild || typeof Image === 'undefined') return false;
    var H = STATUE.H, W = H / 2, A = STATUE.ARC, N = STATUE.SEG, R = W / (2 * Math.sin(A / 2)), pos = [], nor = [], uv = [], idx = [];
    for (var i = 0; i <= N; i++) {
      var th = -A / 2 + A * i / N, lx = R * Math.sin(th), ld = STATUE.D0 + R * (Math.cos(th) - Math.cos(A / 2));
      var x = p.x + f[0] * ld + f[1] * lx, z = p.z + f[1] * ld - f[0] * lx, u = 0.5 + Math.sin(th) / (2 * Math.sin(A / 2));
      var nx = f[0] * Math.cos(th) + f[1] * Math.sin(th), nz = f[1] * Math.cos(th) - f[0] * Math.sin(th);
      pos.push(x, y0, z, x, y0 + H, z); nor.push(nx, 0, nz, nx, 0, nz); uv.push(u, 0, u, 1);
      if (i < N) { var a = i * 2; idx.push(a, a + 2, a + 3, a, a + 3, a + 1); }
    }
    var g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    var mat = new T.MeshStandardMaterial({ color: 0xb4b0aa, roughness: 0.95, metalness: 0, alphaTest: 0.5, side: T.DoubleSide, emissive: 0xffffff, emissiveIntensity: 0.07 });
    var mesh = new T.Mesh(g, mat); mesh.name = 'shrine_statue'; mesh.visible = false; mesh.userData.noCam = true; mesh.userData.noAO = true;
    var dead = false; mat.addEventListener('dispose', function () { dead = true; });
    ctx.add(mesh); if (ctx.stats) ctx.stats.meshes++;
    function apply() {
      var a = root.ChurchArt && root.ChurchArt.statues && root.ChurchArt.statues[p.img]; if (!a || dead) return;
      var im = new Image();
      im.onload = function () {
        if (dead) return;
        var tx = new T.Texture(im); tx.encoding = T.sRGBEncoding; tx.anisotropy = 4; tx.needsUpdate = true;
        mat.map = tx; mat.emissiveMap = tx; mat.needsUpdate = true; mesh.visible = true;
      };
      im.src = a.src;
    }
    if (root.ChurchArt && root.ChurchArt.statues && root.ChurchArt.statues[p.img]) apply();
    else { var sc = document.createElement('script'); sc.src = 'art_statue_' + p.img + '.js'; sc.async = true; sc.onload = apply; document.head.appendChild(sc); }
    return true;
  }
  function build(ctx, layout) {
    var sh = layout && layout.shrine, p = sh && placeOf(layout.id);
    if (!p) return null;
    var f = face(p), y = p.y || 0, alongX = Math.abs(f[0]) > 0.5;
    function B(d, l, yy, sd, sl, h, color, mat) {
      ctx.box({ x: p.x + f[0] * d + f[1] * l, y: y + yy, z: p.z + f[1] * d - f[0] * l, w: alongX ? sd : sl, h: h, d: alongX ? sl : sd, color: color, mat: mat });
    }
    var STONE = 0xe9e3d6, IRON = 0x2e2a26, WOOD = 0x5a3a24;
    if (p.kind !== 'existing') {
      var BACK = p.kind === 'pond' ? 0x8a6a4a : 0x26365c;         // 뒤판(짙은 남색 / 당고개는 옹기빛 갈색)
      B(-0.27, 0, 0, 0.05, 1.1, 2.55, BACK);
      if (p.img) { B(-0.12, -0.525, 0, 0.3, 0.05, 2.55, BACK); B(-0.12, 0.525, 0, 0.3, 0.05, 2.55, BACK); }   // 얕은 벽감(옆 날개): 그림 성상이 정면 위주로 보이게
      B(-0.26, 0, 2.55, 0.09, 1.2, 0.07, 0xc9a24a, 'metal');     // 금빛 갓
      B(0, 0, 0, 0.5, 0.62, 0.85, STONE, 'gloss');               // 받침
      B(0, 0, 0.85, 0.56, 0.7, 0.06, STONE, 'gloss');
      var plain = p.kind === 'plain' || p.kind === 'pond';
      if (!(p.img && imageStatue(ctx, p, f, y + 0.91))) ctx.statue({ x: p.x, z: p.z, y: y + 0.91, h: 1.35, ry: Math.atan2(f[0], f[1]) + Math.PI, kind: plain ? 'saint' : 'mary', robe: plain ? 0xe4ddd0 : undefined, mantle: plain ? 0xe4ddd0 : undefined, skin: plain ? 0xe4ddd0 : undefined, halo: !plain });
    }
    if (p.kind === 'pond') {
      // 둥근 연못: 낮은 돌 테두리(20조각, kit 묶음에 합쳐진다) + 어두운 바닥 + 물 표면(짙은 청록, 불투명 광택 — 실시간 반사·투명 없음)
      var cx = p.x + f[0] * POND.D, cz = p.z + f[1] * POND.D, N = 20, rm = POND.R + POND.RIM / 2, GR = 0xb9b2a6;
      for (var i = 0; i < N; i++) {
        var a = (i + 0.5) * 2 * Math.PI / N;
        ctx.box({ x: cx + Math.cos(a) * rm, y: y, z: cz + Math.sin(a) * rm, w: POND.RIM, h: POND.RIM_H, d: 2 * (POND.R + POND.RIM) * Math.tan(Math.PI / N) + 0.01, ry: -a, color: i % 2 ? GR : 0xaea79b, mat: 'gloss' });
      }
      ctx.cyl({ x: cx, y: y, z: cz, r: POND.R + 0.01, h: POND.WATER_Y - 0.012, seg: 24, color: 0x1c2a2c, flat: true });
      ctx.cyl({ x: cx, y: y + POND.WATER_Y - 0.012, z: cz, r: POND.R + 0.005, h: 0.012, seg: 24, color: 0x1f4a4c, mat: 'gloss', flat: true });
      if (ctx.aoDecalCircle) ctx.aoDecalCircle({ x: cx, z: cz, r: POND.R + POND.RIM + 0.05, y: y });
      ctx.addCollider(footprint(p));   // 성상 받침 ~ 연못 바깥 테두리를 한 상자로 막는다
      return sh;
    }
    // 봉헌초 받침(2단, 슬롯 높이 0.74 / 0.81 에 맞춤)
    B(STAND_D - 0.07, 0, 0.70, 0.36, 1.12, 0.04, IRON, 'metal');
    B(STAND_D - 0.14, 0, 0.74, 0.16, 1.12, 0.07, IRON, 'metal');
    B(STAND_D - 0.07, -0.5, 0, 0.3, 0.05, 0.70, IRON, 'metal');
    B(STAND_D - 0.07, 0.5, 0, 0.3, 0.05, 0.70, IRON, 'metal');
    // 무릎틀(책상 + 방석)
    B(1.0, 0, 0, 0.08, 0.9, 0.78, WOOD, 'wood');
    B(1.02, 0, 0.78, 0.22, 0.96, 0.04, WOOD, 'wood');
    B(1.2, 0, 0, 0.5, 0.9, 0.04, WOOD, 'wood');
    B(1.3, 0, 0.04, 0.3, 0.86, 0.1, 0x7a2630);
    var fp = footprint(p);
    if (ctx.aoDecal) ctx.aoDecal({ x0: fp.x0, x1: fp.x1, z0: fp.z0, z1: fp.z1, y: y, pad: 0.25 });
    ctx.addCollider(fp);
    return sh;
  }
  var S = { SLOTS: SLOTS, POND: POND, STATUE: STATUE, placeOf: placeOf, standOf: standOf, footprint: footprint, applyLayout: applyLayout, build: build, face: face };
  // 레이아웃 등록을 감싼다: 이미 등록된 것 + 앞으로 등록될 것 모두
  var L = root.ChurchLayouts;
  if (L && !L._shrineWrapped) {
    L._shrineWrapped = true;
    var reg = L.register;
    L.register = function (layout) { return applyLayout(reg(layout)); };
    L.ids().forEach(function (id) { applyLayout(L.byId[id]); });
  }
  root.ChurchShrine = S;
  if (typeof module === 'object' && module.exports) module.exports = S;
})(typeof window !== 'undefined' ? window : this);
