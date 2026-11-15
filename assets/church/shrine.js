/* shrine.js — 성당마다 한 곳 '성모 기도 자리': 성모상(받침·뒤판) + 작은 봉헌초 받침 + 무릎틀.
   자리 표는 shrine_places.js. 빌더(ch_*.js)는 고치지 않는다.
   - applyLayout(layout): 봉헌초 받침을 layout.candles.stands 의 **맨 끝**에 붙인다(기존 슬롯 번호는 그대로, 새 슬롯은 그 뒤 14개).
     layouts.js 뒤에 실리면 ChurchLayouts.register 를 감싸 모든 성당에 자동 적용된다(서버 layouts.json 도 같은 경로).
     → 기존 봉헌초 체계(scene_logic.candleSlots · stations.js candle 스테이션 · world.js 초 인스턴스)가 그대로 쓴다.
   - build(ctx, layout): 빌더가 끝난 뒤(world.js) 가구를 kit 배치에 더하고 충돌체를 넣는다. 실시간 조명 없음.
   치수(성상 중심에서 바라보는 쪽으로 d): 뒤판 -0.27, 받침 0, 초 받침 0.6, 무릎틀 책상 1.0, 무릎 방석 1.3, 서는 자리 1.6. */
(function (root) {
  'use strict';
  var SLOTS = 14, COLS = 7, STAND_D = 0.6, HALF_W = 0.62, FRONT_D = 1.07;
  function places() { return root.ChurchShrinePlaces || (typeof require === 'function' ? require('./shrine_places.js') : {}); }
  function placeOf(id) { var p = places()[id]; return p && !p.pending ? p : null; }
  function face(p) { var a = (p.yaw || 0) * Math.PI / 180; return [Math.round(Math.sin(a)), Math.round(Math.cos(a))]; }
  function standOf(p) {
    var f = face(p);
    return { x: +(p.x + f[0] * STAND_D).toFixed(3), z: +(p.z + f[1] * STAND_D).toFixed(3), slots: SLOTS, reach: 1.8, cols: COLS, face: f, pitch: 0.15, step: 0.14, ystep: 0.07, y0: (p.y || 0) + 0.74, shrine: true, label: p.label_ko || '성모상 앞' };
  }
  // 아바타가 지나가지 못하는 자리(성상~무릎틀 책상). existing 은 성상 쪽을 빌더 충돌체가 이미 막는다.
  function footprint(p) {
    var f = face(p), d0 = p.kind === 'existing' ? 0.3 : -0.3, a = [p.x + f[0] * d0, p.z + f[1] * d0], b = [p.x + f[0] * FRONT_D, p.z + f[1] * FRONT_D];
    var lx = Math.abs(f[1]) * HALF_W, lz = Math.abs(f[0]) * HALF_W;
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
  function build(ctx, layout) {
    var sh = layout && layout.shrine, p = sh && placeOf(layout.id);
    if (!p) return null;
    var f = face(p), y = p.y || 0, alongX = Math.abs(f[0]) > 0.5;
    function B(d, l, yy, sd, sl, h, color, mat) {
      ctx.box({ x: p.x + f[0] * d + f[1] * l, y: y + yy, z: p.z + f[1] * d - f[0] * l, w: alongX ? sd : sl, h: h, d: alongX ? sl : sd, color: color, mat: mat });
    }
    var STONE = 0xe9e3d6, IRON = 0x2e2a26, WOOD = 0x5a3a24;
    if (p.kind !== 'existing') {
      B(-0.27, 0, 0, 0.05, 1.1, 2.55, 0x26365c);                 // 뒤판(짙은 남색)
      B(-0.26, 0, 2.55, 0.09, 1.2, 0.07, 0xc9a24a, 'metal');     // 금빛 갓
      B(0, 0, 0, 0.5, 0.62, 0.85, STONE, 'gloss');               // 받침
      B(0, 0, 0.85, 0.56, 0.7, 0.06, STONE, 'gloss');
      var plain = p.kind === 'plain';
      ctx.statue({ x: p.x, z: p.z, y: y + 0.91, h: 1.35, ry: Math.atan2(f[0], f[1]) + Math.PI, kind: plain ? 'saint' : 'mary', robe: plain ? 0xe4ddd0 : undefined, mantle: plain ? 0xe4ddd0 : undefined, skin: plain ? 0xe4ddd0 : undefined, halo: !plain });
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
  var S = { SLOTS: SLOTS, placeOf: placeOf, standOf: standOf, footprint: footprint, applyLayout: applyLayout, build: build, face: face };
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
