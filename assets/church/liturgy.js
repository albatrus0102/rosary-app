/* liturgy.js — 전례 시기 장식(SPEC §33, docs/church/LITURGICAL_DECOR.md).
   ChurchAPI.setLiturgy({season, color, week?, feast?, memorial?}) → 제대 앞 보·독서대 보·감실 보의 전례 색 천과
   시기별 장식(대림환 / 성탄 트리·구유·포인세티아 / 사순 가림천·보라 천 두른 십자가 / 부활초·백합 / 위령 성월 추모 촛불)을 짓는다.
   - 모두 절차적 지오메트리. 새 텍스처·에셋 없음. 그리는 물체는 천 1 + 소품 1 + 빛 점(Points) 1 = 최대 3
     (높음 화질의 그리기 호출: 천 2(본·반사) + 소품 3(본·반사·AO 법선) + 빛 점 2 = +7 이하, 보통·간단은 +3 이하).
   - 자리는 성당별 표(PLACES)가 정한다: 주 제대(altar), 독서대(ambo), 감실(tab), 십자고상(cross), 장식 자리 둘(L: 시기 표지, R: 구유).
   - plan(id, state, low) 는 three.js 없이 도는 순수 함수(무엇을 어디에 놓는지 + 충돌체). Node 시험이 통로·좌석·스테이션과 겹치지 않는지 본다.
   window.ChurchLiturgy / Node require 둘 다 지원. */
(function (root) {
  'use strict';
  var PI = Math.PI;

  var SEASONS = ['advent', 'christmas', 'ordinary', 'lent', 'triduum', 'easter'];
  // 전례 색(sRGB). em: 천의 약한 자체 발광(밤에도 색이 읽히게)
  var COLORS = {
    violet: { hex: 0x5b2a7c, em: 0.09 },
    white: { hex: 0xf4e8c6, em: 0.05 },
    green: { hex: 0x2c7a3f, em: 0.08 },
    red: { hex: 0xb3202c, em: 0.08 },
    rose: { hex: 0xd88aa8, em: 0.07 }
  };
  var GOLD = 0xd9b45a, WOOD = 0x5a3822, WOOD_L = 0x7a5536, IVORY = 0xfff6e0, PINE = 0x1f5a34, PINE_L = 0x34804a;

  // ---- 성당별 자리 ----
  // k: 장식 크기 배율(큰 성당일수록 크게). altar: 주 제대(앞면이 +z). ambo/tab/cross: 있으면 천을 건다.
  // L: 시기 표지 자리(대림환·트리·십자가·부활초·추모 촛불), R: 구유 자리. pots: 제대 앞 화분 자리(없으면 제대 앞 두 모서리).
  var PLACES = {
    basic: {
      k: 1.15, altar: { x: 0, z: -17, y: 0.5, w: 2.6, d: 1.1, h: 1.0 },
      ambo: { x: -4.6, z: -16, y: 0.5 }, tab: { x: 5, z: -18.4, y: 0.5 }, cross: { x: 0, y: 3.4, z: -19.7, h: 3.4 },
      L: { x: 3.4, z: -16.2, y: 0.5 }, R: { x: -3.05, z: -16.25, y: 0.5 }
    },
    florence: {
      k: 1.05, altar: { x: 0, z: -15.7, y: 0.75, w: 2.6, d: 1.0, h: 1.0 },
      ambo: { x: 3.0, z: -14.9, y: 0.75 }, cross: { x: 0, y: 4.0, z: -17.2, h: 3.6 },
      L: { x: -3.55, z: -12.9, y: 0.3 }, R: { x: 3.55, z: -12.9, y: 0.3 }
    },
    lateran: {
      k: 1.2, altar: { x: 0, z: -10.65, y: 0.5, w: 2.2, d: 1.0, h: 1.0, off: 0.05 },
      L: { x: -3.75, z: -9.0, y: 0.3 }, R: { x: 3.75, z: -9.0, y: 0.3 }, pots: [[-1.45, -8.45, 0.5], [1.45, -8.45, 0.5]]
    },
    maggiore: {
      k: 1.3, altar: { x: 0, z: -21.2, y: 0.4, w: 2.2, d: 1.0, h: 1.0, off: 0.05 },
      L: { x: -4.7, z: -17.4, y: 0.4 }, R: { x: 4.7, z: -17.4, y: 0.4 }, pots: [[-1.5, -20.3, 0.4], [1.5, -20.3, 0.4]]
    },
    milan: {
      k: 1.0, altar: { x: 0, z: -18.2, y: 0.8, w: 3.0, d: 1.25, h: 1.0 },
      L: { x: -1.62, z: -16.8, y: 0.8, s: 0.68 }, R: { x: 1.62, z: -16.8, y: 0.8, s: 0.6 }, pots: []
    },
    myeongdong: {
      k: 1.1, altar: { x: 0, z: -14.2, y: 0.6, w: 2.4, d: 1.0, h: 1.0 },
      ambo: { x: 1.9, z: -12.2, y: 0.6 }, cross: { x: 3.5, y: 1.15, z: -13.0, h: 4.4 },
      L: { x: -2.9, z: -15.3, y: 0.6 }, R: { x: 2.9, z: -15.3, y: 0.6 }, pots: [[-1.2, -13.35, 0.6], [1.2, -13.35, 0.6]]
    },
    stpaul: {
      k: 1.25, altar: { x: 0, z: -18.5, y: 0.82, w: 2.3, d: 1.0, h: 1.0, off: 0.04 },
      ambo: { x: -4.2, z: -17.0, y: 0.5 },
      L: { x: 3.7, z: -15.9, y: 0.5 }, R: { x: -3.7, z: -15.2, y: 0.5 }, pots: [[-2.15, -14.7, 0.5], [2.15, -14.7, 0.5]]
    },
    stpeter: {
      k: 1.6, altar: { x: 0, z: -9.15, y: 0.5, w: 3.0, d: 1.3, h: 1.05 },
      L: { x: -5.4, z: -8.3, y: 0 }, R: { x: 5.4, z: -8.3, y: 0 }, pots: [[-0.75, -7.0, 0.5], [0.75, -7.0, 0.5]]
    }
  };

  // ---- 상태 ----
  function norm(o) {
    o = o || {};
    var season = SEASONS.indexOf(o.season) >= 0 ? o.season : 'none';
    var color = COLORS[o.color] ? o.color : ({ advent: 'violet', lent: 'violet', triduum: 'violet', christmas: 'white', easter: 'white', ordinary: 'green' })[season] || 'green';
    var week = Math.max(0, Math.min(7, Math.round(+o.week || 0)));
    return { season: season, color: color, week: week, feast: typeof o.feast === 'string' ? o.feast : '', memorial: !!o.memorial && season === 'ordinary' };
  }
  function keyOf(s) { return [s.season, s.color, s.week, s.feast, s.memorial ? 1 : 0].join('|'); }

  // ---- 계획(순수 함수): 무엇을 어디에 ----
  // 돌려주는 값: {items:[{kind, x,y,z, k, ...}], colliders:[{x,z,r} | {x0,x1,z0,z1}]}
  function plan(id, state, low) {
    var P = PLACES[id], s = norm(state), items = [], colliders = [];
    if (!P || s.season === 'none') return { items: items, colliders: colliders, state: s };
    var k = P.k, A = P.altar, c = s.color;
    function spot(S, kind, r, extra) {
      var kk = k * (S.s || 1), it = { kind: kind, x: S.x, y: S.y, z: S.z, k: kk, color: c };
      if (extra) for (var q in extra) it[q] = extra[q];
      items.push(it);
      if (r && r.w) colliders.push({ x0: S.x - r.w * kk / 2, x1: S.x + r.w * kk / 2, z0: S.z - r.d * kk / 2, z1: S.z + r.d * kk / 2 });
      else if (r) colliders.push({ x: S.x, z: S.z, r: r * kk });
      return it;
    }
    function pots(kind) {
      var list = P.pots || [[A.x - A.w / 2 - 0.3, A.z + A.d / 2 + 0.42, A.y], [A.x + A.w / 2 + 0.3, A.z + A.d / 2 + 0.42, A.y]];
      for (var i = 0; i < list.length; i++) {
        items.push({ kind: kind, x: list[i][0], y: list[i][2], z: list[i][1], k: Math.min(1.25, k), color: c });
        colliders.push({ x: list[i][0], z: list[i][1], r: 0.2 });
      }
    }
    // 1) 전례 색 천: 제대 앞 보 + 독서대 보 + 감실 보(성금요일은 제대를 벗긴다: 천 없음)
    var bare = s.season === 'triduum' && c === 'red';
    if (!bare) {
      items.push({ kind: 'frontal', x: A.x, y: A.y, z: A.z, w: A.w, d: A.d, h: A.h, off: A.off || 0, color: c, festive: c === 'white' });
      if (P.ambo) items.push({ kind: 'fall', x: P.ambo.x, y: P.ambo.y, z: P.ambo.z, color: c });
      if (P.tab) items.push({ kind: 'tabveil', x: P.tab.x, y: P.tab.y, z: P.tab.z, color: c });
    }
    // 2) 시기 표지
    if (s.season === 'advent') {
      spot(P.L, 'wreath', 0.56, { lit: Math.max(1, Math.min(4, s.week || 1)) });
    } else if (s.season === 'christmas') {
      spot(P.L, 'tree', 0.72);
      spot(P.R, 'crib', { w: 1.6, d: 1.0 });
      pots('poinsettia');
    } else if (s.season === 'lent' || s.season === 'triduum') {
      // 십자고상을 가리고(성금요일은 붉은 천), 보라 천을 두른 십자가를 세운다. 꽃은 두지 않는다.
      if (P.cross) items.push({ kind: 'veil', x: P.cross.x, y: P.cross.y, z: P.cross.z, h: P.cross.h, color: c === 'rose' || c === 'white' ? 'violet' : c });
      spot(P.L, 'lentcross', 0.42, { color: c === 'rose' || c === 'white' ? 'violet' : c });
    } else if (s.season === 'easter') {
      spot(P.L, 'paschal', 0.45);
      pots('lily');
    } else if (s.memorial) {
      spot(P.L, 'memorial', { w: 1.35, d: 1.05 }, { n: low ? 6 : 11 });
    }
    return { items: items, colliders: colliders, state: s };
  }

  // ---- 짓기(three.js) ----
  function build(pl, world, low) {
    var T = root.THREE, G = root.ChurchGeo, Geo = G.Geo, ctx = world.ctx;
    // 금색 장식도 소품 배치에 넣는다(그리기 호출을 아끼려고 금속 재질을 따로 쓰지 않는다)
    var cloth = new G.Batch(71), solid = new G.Batch(72), metal = solid;
    var pts = [], rnd = G.rng(4242);
    var cHex = COLORS[pl.state.color].hex;
    function col(name) { return COLORS[name].hex; }
    function box(b, c, x, y, z, w, h, d, o) { o = o || {}; b.add(Geo.box(), c, { x: x, y: y, z: z, sx: w, sy: h, sz: d, rx: o.rx, ry: o.ry, rz: o.rz, flat: true, vary: o.vary === undefined ? 0.03 : o.vary, c2: o.c2 }); }
    function cyl(b, c, x, y, z, r, rTop, h, seg, o) { o = o || {}; seg = low ? Math.max(5, Math.round(seg * 0.6)) : seg; b.add(Geo.cyl(seg, r > 0 ? rTop / r : 1), c, { x: x, y: y, z: z, sx: r, sy: h, sz: r, rx: o.rx, ry: o.ry, rz: o.rz, flat: !!o.flat, vary: o.vary === undefined ? 0.03 : o.vary, c2: o.c2 }); }
    function ball(b, c, x, y, z, r, o) { o = o || {}; b.add(low ? Geo.ico(0) : Geo.sph(8, 6), c, { x: x, y: y, z: z, sx: o.sx === undefined ? r : o.sx, sy: o.sy === undefined ? r : o.sy, sz: o.sz === undefined ? r : o.sz, rx: o.rx, ry: o.ry, rz: o.rz, flat: !!low, vary: o.vary === undefined ? 0.04 : o.vary }); }
    function ico(b, c, x, y, z, r, o) { o = o || {}; b.add(Geo.ico(o.detail || 0), c, { x: x, y: y, z: z, sx: o.sx === undefined ? r : o.sx, sy: o.sy === undefined ? r : o.sy, sz: o.sz === undefined ? r : o.sz, rx: o.rx, ry: o.ry, rz: o.rz, flat: true, vary: o.vary === undefined ? 0.1 : o.vary }); }
    // 빛 점: 밝기 b(0..1.4)로 크기 느낌을 낸다
    function light(x, y, z, r, g, b2, n) { for (var i = 0; i < (n || 1); i++) pts.push(x, y, z, r, g, b2); }
    // 촛불: 작은 물방울꼴 불꽃(낮에도 보인다) + 빛 점(밤에 번진다). s: 크기
    function flame(x, y, z, s, big) {
      solid.add(Geo.ico(low ? 0 : 1), 0xffc04a, { x: x, y: y, z: z, sx: 0.02 * s, sy: 0.05 * s, sz: 0.02 * s, flat: !!low, vary: 0 });
      light(x, y + 0.01 * s, z, 1.0, 0.72, 0.36, big ? 3 : 2);
    }
    // 얇은 천 한 장(주름: 세로 띠가 앞뒤로 엇갈린다). 아래에서 위로 hw(t) 반폭. 앞면이 +z.
    function drape(c, x, y0, y1, z, hw, o) {
      o = o || {};
      var N = low ? 4 : (o.n || 8), M = o.rows || 4, amp = low ? 0 : (o.amp === undefined ? 0.02 : o.amp);
      for (var j = 0; j < M; j++) {
        var ta = j / M, tb = (j + 1) / M, ya = y0 + (y1 - y0) * ta, yb = y0 + (y1 - y0) * tb, wa = hw(ta), wb = hw(tb);
        for (var i = 0; i < N; i++) {
          var ua = i / N * 2 - 1, ub = (i + 1) / N * 2 - 1, za = z + ((i % 2) ? amp : -amp), zb = z + (((i + 1) % 2) ? amp : -amp);
          cloth.addQuad([x + ua * wa, ya, za], [x + ub * wa, ya, zb], [x + ub * wb, yb, zb], [x + ua * wb, yb, za], c, [x, (ya + yb) / 2, z + 50], { vary: 0.03 });
        }
      }
    }

    var B = {
      // 제대 앞 보(antependium): 전례 색 천 + 금 띠 + 가운데 금 십자가
      frontal: function (it) {
        var zf = it.z + it.d / 2 + 0.08 + it.off, w = it.w * 0.94, h = it.h - 0.05, y = it.y + 0.03;
        box(cloth, cHex, it.x, y, zf, w, h, 0.03);
        box(metal, GOLD, it.x, y + h - 0.17, zf + 0.014, w, 0.05, 0.02);
        [-1, 1].forEach(function (s) { box(metal, GOLD, it.x + s * w * 0.3, y, zf + 0.014, it.festive ? 0.1 : 0.06, h - 0.17, 0.02); });
        if (it.festive) box(metal, GOLD, it.x, y + 0.04, zf + 0.014, w, 0.035, 0.02);
        var cy = y + (h - 0.17) * 0.5;
        box(metal, GOLD, it.x, cy - 0.17, zf + 0.016, 0.05, 0.36, 0.02);
        box(metal, GOLD, it.x, cy + 0.04, zf + 0.016, 0.24, 0.05, 0.02);
      },
      // 독서대 보: 앞으로 늘어뜨린 천 + 금 술
      fall: function (it) {
        var zf = it.z + 0.25 + 0.035, y1 = it.y + 1.08, y0 = y1 - 0.78;
        box(cloth, cHex, it.x, y0, zf, 0.46, y1 - y0, 0.025);
        box(metal, GOLD, it.x, y0, zf + 0.012, 0.46, 0.04, 0.02);
        box(metal, GOLD, it.x, y0 + 0.3, zf + 0.012, 0.035, 0.24, 0.02);
        box(metal, GOLD, it.x, y0 + 0.44, zf + 0.012, 0.15, 0.035, 0.02);
      },
      // 감실 보(conopaeum)
      tabveil: function (it) {
        var zf = it.z + 0.25 + 0.03;
        box(cloth, cHex, it.x, it.y + 1.11, zf, 0.56, 0.5, 0.02);
        box(metal, GOLD, it.x, it.y + 1.11, zf + 0.012, 0.56, 0.03, 0.02);
        box(metal, GOLD, it.x, it.y + 1.31, zf + 0.012, 0.03, 0.2, 0.02);
        box(metal, GOLD, it.x, it.y + 1.42, zf + 0.012, 0.13, 0.03, 0.02);
      },
      // 십자고상 가림천: 꼭대기에서 팔까지 넓어지고 아래로 드리운다
      veil: function (it) {
        var h = it.h, c = col(it.color), zf = it.z + h * 0.115;
        var yB = it.y + h * 0.14, yA = it.y + h * 0.66, yT = it.y + h * 1.03;
        drape(c, it.x, yB, yA, zf, function (t) { return h * (0.27 + 0.05 * t); }, { rows: 3, amp: h * 0.008 });
        drape(c, it.x, yA, yT, zf, function (t) { return h * (0.32 - 0.25 * t); }, { rows: 2, amp: h * 0.008 });
        // 옆으로 감싼 면(옆에서 보아도 뜬 종이처럼 보이지 않게)
        [-1, 1].forEach(function (s) {
          var xa = it.x + s * h * 0.27, xb = it.x + s * h * 0.32, zb = it.z - h * 0.04;
          cloth.addQuad([xa, yB, zf], [xa, yB, zb], [xb, yA, zb], [xb, yA, zf], c, [it.x + s * 50, yA, zf], { vary: 0.03 });
          cloth.addQuad([xb, yA, zf], [xb, yA, zb], [it.x + s * h * 0.07, yT, zb], [it.x + s * h * 0.07, yT, zf], c, [it.x + s * 50, yT + 50, zf], { vary: 0.03 });
        });
      },
      // 보라(성금요일: 붉은) 천을 두른 나무 십자가
      lentcross: function (it) {
        var k = it.k, x = it.x, y = it.y, z = it.z, c = col(it.color), ah = 1.62 * k, aw = 1.1 * k;
        box(solid, WOOD, x, y, z, 0.62 * k, 0.1 * k, 0.5 * k); box(solid, WOOD_L, x, y + 0.1 * k, z, 0.4 * k, 0.1 * k, 0.34 * k);
        box(solid, WOOD, x, y + 0.2 * k, z, 0.1 * k, 2.1 * k, 0.08 * k);
        box(solid, WOOD, x, y + ah, z, aw, 0.1 * k, 0.08 * k);
        // 팔 위로 걸친 천 + 양 끝으로 드리운 자락 + 가운데 늘어진 자락
        var ty = y + ah + 0.1 * k;
        box(cloth, c, x, ty, z, aw * 0.96, 0.02 * k, 0.15 * k);
        drape(c, x - aw * 0.4, ty - 0.62 * k, ty, z + 0.08 * k, function (t) { return k * (0.12 - 0.03 * t); }, { n: 4, rows: 2, amp: 0.012 * k });
        drape(c, x + aw * 0.4, ty - 0.85 * k, ty, z + 0.08 * k, function (t) { return k * (0.13 - 0.04 * t); }, { n: 4, rows: 2, amp: 0.012 * k });
        var z2 = z + 0.085 * k;
        cloth.addBeam([x - aw * 0.34, ty - 0.02 * k, z2], [x, ty - 0.4 * k, z2], 0.11 * k, 0.02 * k, c, { flat: true });
        cloth.addBeam([x + aw * 0.34, ty - 0.02 * k, z2], [x, ty - 0.4 * k, z2], 0.11 * k, 0.02 * k, c, { flat: true });
      },
      // 대림환: 받침대 위 푸른 고리 + 초 넷(자색 셋·장미색 하나). lit 개만 켠다.
      wreath: function (it) {
        var k = it.k, x = it.x, y = it.y, z = it.z, R = 0.44 * k, wy = y + 1.0 * k, i;
        box(solid, WOOD, x, y, z, 0.5 * k, 0.07 * k, 0.5 * k);
        cyl(solid, WOOD_L, x, y + 0.07 * k, z, 0.1 * k, 0.075 * k, 0.8 * k, 10);
        cyl(solid, WOOD, x, y + 0.87 * k, z, R + 0.1 * k, R + 0.1 * k, 0.04 * k, 16);
        solid.add(low ? torus(T, 5, 10) : torus(T, 7, 18), PINE, { x: x, y: wy, z: z, s: R, rx: PI / 2, vary: 0.06 });
        var nb = low ? 0 : 16;
        for (i = 0; i < nb; i++) { var a = i / nb * PI * 2; ico(solid, i % 2 ? PINE_L : PINE, x + Math.cos(a) * R, wy + 0.04 * k, z + Math.sin(a) * R, 0.12 * k, { ry: a, sy: 0.085 * k }); }
        for (i = 0; i < (low ? 0 : 8); i++) { var a2 = (i + 0.5) / 8 * PI * 2; ball(solid, 0xb3242c, x + Math.cos(a2) * (R + 0.07 * k), wy + 0.07 * k, z + Math.sin(a2) * (R + 0.07 * k), 0.034 * k); }
        // 초: 앞 왼쪽부터 시계 반대 방향으로 1·2·3·4주. 3주(기뻐하여라)가 장미색. 먼저 켠 초일수록 짧다.
        var ang = [PI * 0.75, PI * 0.25, -PI * 0.25, -PI * 0.75];
        for (i = 0; i < 4; i++) {
          var cx = x + Math.cos(ang[i]) * R, cz = z + Math.sin(ang[i]) * R, ch = (0.4 - (i < it.lit ? (it.lit - i) * 0.035 : 0)) * k;
          cyl(solid, i === 2 ? col('rose') : col('violet'), cx, wy + 0.06 * k, cz, 0.045 * k, 0.045 * k, ch, 8, { vary: 0 });
          if (i < it.lit) flame(cx, wy + 0.06 * k + ch + 0.045 * k, cz, k);
        }
        // 앞으로 드리운 자색 리본
        box(cloth, col('violet'), x, wy - 0.42 * k, z + R + 0.1 * k, 0.13 * k, 0.36 * k, 0.015 * k);
      },
      // 성탄 트리: 층층이 원뿔 + 꼭대기 별 + 작은 방울 + 빛 점
      tree: function (it) {
        var k = it.k, x = it.x, y = it.y, z = it.z, tiers = 5, i;
        cyl(solid, 0x7a1f24, x, y, z, 0.3 * k, 0.26 * k, 0.1 * k, 12);
        cyl(solid, 0x4a3220, x, y + 0.1 * k, z, 0.085 * k, 0.07 * k, 0.4 * k, 8);
        function tier(n) { return { y0: y + (0.36 + n * 0.43) * k, r: (0.8 - n * 0.145) * k, h: 0.66 * k }; }
        for (i = 0; i < tiers; i++) { var t = tier(i); cyl(solid, PINE, x, t.y0, z, t.r, 0, t.h, 12, { c2: PINE_L, flat: true, ry: i * 0.5, vary: 0.05 }); }
        var top = tier(tiers - 1), ty = top.y0 + top.h;
        ico(metal, 0xf0c95a, x, ty + 0.05 * k, z, 0.1 * k, { sz: 0.04 * k, vary: 0 });
        ico(metal, 0xf0c95a, x, ty + 0.05 * k, z, 0.1 * k, { sz: 0.04 * k, rz: PI / 5, vary: 0 });
        light(x, ty + 0.05 * k, z, 1.0, 0.85, 0.5, 3);
        function onTree(fn, n) {
          for (var q = 0; q < n; q++) {
            var tr = tier(q % tiers), u = 0.12 + rnd() * 0.6, a = rnd() * PI * 2, rr = tr.r * (1 - u) + 0.015 * k;
            // 앞(+z)·옆에서 잘 보이게 뒤쪽 것은 앞으로 넘긴다
            var sz = Math.sin(a); if (sz < -0.35) sz = -sz;
            fn(x + Math.cos(a) * rr, tr.y0 + tr.h * u, z + sz * rr, q);
          }
        }
        if (!low) onTree(function (px, py, pz, q) { ball(q % 3 === 1 ? metal : solid, [0xb3202a, 0xe0b24a, 0xf4ecd8][q % 3], px, py - 0.03 * k, pz, 0.05 * k, { vary: 0 }); }, 24);
        onTree(function (px, py, pz, q) { var w = q % 4 === 0; light(px, py, pz, w ? 0.75 : 0.9, w ? 0.75 : 0.62, w ? 0.7 : 0.28); }, low ? 14 : 40);
      },
      // 구유: 마구간(지붕·기둥·뒷벽·짚) + 성모·요셉·아기 예수 + 별
      crib: function (it) {
        var k = it.k, x = it.x, y = it.y, z = it.z;
        box(solid, 0x6b4a2e, x, y, z, 1.56 * k, 0.1 * k, 0.96 * k);
        box(solid, 0xd2b062, x, y + 0.1 * k, z, 1.46 * k, 0.04 * k, 0.86 * k, { vary: 0.08 });
        box(solid, 0x5d4028, x, y + 0.1 * k, z - 0.4 * k, 1.4 * k, 0.86 * k, 0.05 * k);
        [-1, 1].forEach(function (s) {
          box(solid, 0x6b4a2e, x + s * 0.68 * k, y + 0.1 * k, z + 0.36 * k, 0.07 * k, 0.86 * k, 0.07 * k);
          box(solid, 0x6b4a2e, x + s * 0.68 * k, y + 0.1 * k, z - 0.36 * k, 0.07 * k, 0.86 * k, 0.07 * k);
          // 지붕널(가운데가 높다)
          solid.add(Geo.boxC(), 0x8a6a3a, { x: x + s * 0.41 * k, y: y + 1.13 * k, z: z, sx: 0.95 * k, sy: 0.05 * k, sz: 1.04 * k, rz: -s * 0.4, flat: true, vary: 0.08 });
        });
        // 구유와 아기 예수
        box(solid, 0x7a5536, x, y + 0.14 * k, z + 0.02 * k, 0.32 * k, 0.13 * k, 0.2 * k);
        box(solid, 0xe2c878, x, y + 0.27 * k, z + 0.02 * k, 0.3 * k, 0.03 * k, 0.18 * k, { vary: 0.08 });
        ball(solid, 0xfbf6ea, x, y + 0.33 * k, z + 0.02 * k, 0.1 * k, { sx: 0.12 * k, sy: 0.05 * k, sz: 0.065 * k, vary: 0 });
        ball(solid, 0xf0d2b8, x - 0.11 * k, y + 0.345 * k, z + 0.02 * k, 0.04 * k, { vary: 0 });
        light(x, y + 0.42 * k, z + 0.06 * k, 1.0, 0.82, 0.5, 2);
        // 성모(푸른 겉옷·흰 너울), 요셉(갈색 옷·지팡이)
        cyl(solid, 0x3f62a8, x - 0.34 * k, y + 0.14 * k, z - 0.08 * k, 0.14 * k, 0.06 * k, 0.4 * k, 10);
        ball(solid, 0xf0d2b8, x - 0.34 * k, y + 0.58 * k, z - 0.08 * k, 0.062 * k, { vary: 0 });
        ball(solid, 0xf6f2ea, x - 0.345 * k, y + 0.6 * k, z - 0.095 * k, 0.07 * k, { sy: 0.066 * k, vary: 0 });
        cyl(solid, 0x7a5638, x + 0.36 * k, y + 0.14 * k, z - 0.1 * k, 0.15 * k, 0.07 * k, 0.5 * k, 10);
        ball(solid, 0xe6c2a4, x + 0.36 * k, y + 0.69 * k, z - 0.1 * k, 0.066 * k, { vary: 0 });
        ball(solid, 0x5a4030, x + 0.36 * k, y + 0.715 * k, z - 0.115 * k, 0.068 * k, { sy: 0.05 * k, vary: 0 });
        cyl(solid, 0x4a3220, x + 0.53 * k, y + 0.14 * k, z - 0.04 * k, 0.014 * k, 0.014 * k, 0.72 * k, 5);
        if (!low) {   // 양 한 마리
          ball(solid, 0xf2eee4, x + 0.14 * k, y + 0.2 * k, z + 0.26 * k, 0.07 * k, { sx: 0.1 * k, sy: 0.065 * k, sz: 0.065 * k, vary: 0 });
          ball(solid, 0x3a3230, x + 0.24 * k, y + 0.24 * k, z + 0.28 * k, 0.035 * k, { vary: 0 });
        }
        // 지붕 위 별
        ico(metal, 0xf0c95a, x, y + 1.42 * k, z + 0.1 * k, 0.085 * k, { sz: 0.035 * k, vary: 0 });
        ico(metal, 0xf0c95a, x, y + 1.42 * k, z + 0.1 * k, 0.085 * k, { sz: 0.035 * k, rz: PI / 5, vary: 0 });
        light(x, y + 1.42 * k, z + 0.12 * k, 1.0, 0.9, 0.6, 3);
      },
      // 포인세티아 화분
      poinsettia: function (it) {
        var k = it.k, x = it.x, y = it.y, z = it.z, i, a;
        cyl(metal, 0xc9a04a, x, y, z, 0.1 * k, 0.14 * k, 0.17 * k, 10);
        for (i = 0; i < (low ? 4 : 6); i++) { a = i / (low ? 4 : 6) * PI * 2; ico(solid, 0x2a6a38, x + Math.cos(a) * 0.13 * k, y + 0.24 * k, z + Math.sin(a) * 0.13 * k, 0.12 * k, { sy: 0.035 * k, ry: -a, rz: 0.35 }); }
        for (i = 0; i < (low ? 5 : 7); i++) { a = (i + 0.5) / (low ? 5 : 7) * PI * 2; ico(solid, i % 2 ? 0xc0202c : 0xa81824, x + Math.cos(a) * 0.085 * k, y + 0.33 * k, z + Math.sin(a) * 0.085 * k, 0.1 * k, { sy: 0.03 * k, sz: 0.06 * k, ry: -a, rz: 0.45, vary: 0.06 }); }
        ico(solid, 0xe8c84a, x, y + 0.36 * k, z, 0.03 * k, { vary: 0 });
      },
      // 흰 백합 화분
      lily: function (it) {
        var k = it.k, x = it.x, y = it.y, z = it.z, n = low ? 3 : 5;
        cyl(metal, 0xc9a04a, x, y, z, 0.11 * k, 0.15 * k, 0.2 * k, 10);
        for (var j = 0; j < (low ? 3 : 5); j++) { var b0 = j * 1.26; ico(solid, j % 2 ? 0x3f8444 : 0x2f6e38, x + Math.cos(b0) * 0.1 * k, y + 0.27 * k, z + Math.sin(b0) * 0.1 * k, 0.13 * k, { sy: 0.03 * k, sz: 0.05 * k, ry: -b0, rz: 0.5 }); }
        for (var i = 0; i < n; i++) {
          var a = i / n * PI * 2 + 0.4, lean = 0.2 + (i % 2) * 0.12, hh = (0.5 + (i % 3) * 0.1) * k;
          var dx = Math.cos(a), dz = Math.sin(a);
          var tx = x + dx * Math.sin(lean) * hh, tz = z + dz * Math.sin(lean) * hh, tyy = y + 0.2 * k + Math.cos(lean) * hh;
          solid.addBeam([x + dx * 0.03 * k, y + 0.2 * k, z + dz * 0.03 * k], [tx, tyy, tz], 0.022 * k, 0.022 * k, 0x3a7a3e, { flat: true });
          ico(solid, 0x3f8444, (x + tx) / 2 + dz * 0.05 * k, (y + 0.2 * k + tyy) / 2, (z + tz) / 2 - dx * 0.05 * k, 0.12 * k, { sy: 0.022 * k, sz: 0.04 * k, ry: -a, rz: 0.9 });
          // 나팔 모양 꽃: 바깥·위로 벌어진다 + 벌어진 꽃잎
          solid.add(Geo.cyl(low ? 5 : 7, 3.4), 0xfffdf6, { x: tx, y: tyy, z: tz, sx: 0.028 * k, sy: 0.17 * k, sz: 0.028 * k, ry: -a, rz: -(lean + 0.7), flat: !!low, vary: 0.02 });
          var ex = Math.sin(lean + 0.7) * 0.17 * k;
          ico(solid, 0xfffdf6, tx + dx * ex, tyy + Math.cos(lean + 0.7) * 0.17 * k, tz + dz * ex, 0.1 * k, { sy: 0.03 * k, ry: -a, rz: -(lean + 0.7), vary: 0.02 });
        }
      },
      // 부활초: 금 촛대 + 큰 초(붉은 십자 표) + 발치의 백합 둘
      paschal: function (it) {
        var k = it.k, x = it.x, y = it.y, z = it.z;
        cyl(metal, GOLD, x, y, z, 0.22 * k, 0.13 * k, 0.09 * k, 12);
        cyl(metal, GOLD, x, y + 0.09 * k, z, 0.045 * k, 0.035 * k, 0.95 * k, 10);
        ball(metal, GOLD, x, y + 0.5 * k, z, 0.07 * k, { vary: 0 });
        cyl(metal, GOLD, x, y + 1.04 * k, z, 0.05 * k, 0.11 * k, 0.09 * k, 10);
        cyl(solid, IVORY, x, y + 1.13 * k, z, 0.055 * k, 0.055 * k, 0.86 * k, 10, { vary: 0 });
        box(solid, 0xb3202c, x, y + 1.5 * k, z + 0.05 * k, 0.016 * k, 0.17 * k, 0.014 * k, { vary: 0 });
        box(solid, 0xb3202c, x, y + 1.585 * k, z + 0.05 * k, 0.085 * k, 0.016 * k, 0.014 * k, { vary: 0 });
        flame(x, y + 2.04 * k, z, k * 1.5, true);
        [-1, 1].forEach(function (s) { B.lily({ x: x + s * 0.3 * k, y: y, z: z + 0.16 * k, k: k * 0.8 }); });
      },
      // 위령 성월: 천을 덮은 두 단 탁자 + 작은 촛불 여럿 + 흰 국화 + 작은 십자가
      memorial: function (it) {
        var k = it.k, x = it.x, y = it.y, z = it.z, n = it.n, i;
        box(cloth, cHex, x, y, z - 0.18 * k, 1.3 * k, 0.62 * k, 0.5 * k);
        box(cloth, cHex, x, y, z + 0.24 * k, 1.3 * k, 0.34 * k, 0.4 * k);
        box(solid, 0xf6f0e2, x, y + 0.62 * k, z - 0.18 * k, 1.1 * k, 0.012 * k, 0.4 * k, { vary: 0 });
        box(solid, 0xf6f0e2, x, y + 0.34 * k, z + 0.25 * k, 1.1 * k, 0.012 * k, 0.3 * k, { vary: 0 });
        box(metal, GOLD, x, y + 0.632 * k, z - 0.3 * k, 0.035 * k, 0.4 * k, 0.03 * k); box(metal, GOLD, x, y + 0.9 * k, z - 0.3 * k, 0.2 * k, 0.035 * k, 0.03 * k);
        var top = Math.ceil(n / 2), bot = n - top;
        function candle(cx, cy, cz) {
          cyl(solid, 0xb8862e, cx, cy, cz, 0.042 * k, 0.046 * k, 0.07 * k, 8, { vary: 0 });
          cyl(solid, IVORY, cx, cy + 0.02 * k, cz, 0.032 * k, 0.032 * k, 0.085 * k, 8, { vary: 0 });
          flame(cx, cy + 0.145 * k, cz, k * 0.8);
        }
        for (i = 0; i < top; i++) candle(x + ((i + 0.5) / top - 0.5) * 0.74 * k, y + 0.632 * k, z - 0.12 * k);
        for (i = 0; i < bot; i++) candle(x + ((i + 0.5) / bot - 0.5) * 0.9 * k, y + 0.352 * k, z + 0.27 * k);
        // 흰 국화(양 끝)
        [-1, 1].forEach(function (s) {
          var fx = x + s * 0.5 * k, fz = z - 0.22 * k, fy = y + 0.632 * k;
          cyl(solid, 0xe8e2d6, fx, fy, fz, 0.05 * k, 0.065 * k, 0.13 * k, 8);
          for (var q = 0; q < (low ? 3 : 6); q++) { var a = q * 2.1; ico(solid, q % 2 ? 0xfffdf4 : 0xf4f0e0, fx + Math.cos(a) * 0.055 * k, fy + (0.2 + (q % 3) * 0.045) * k, fz + Math.sin(a) * 0.055 * k, 0.055 * k, { detail: low ? 0 : 1, vary: 0.03 }); }
        });
      }
    };

    pl.items.forEach(function (it) { if (B[it.kind]) B[it.kind](it); });

    var group = new T.Group(); group.name = 'liturgy';
    var mats = [], em = COLORS[pl.state.color];
    function addBatch(b, mat, name, noAO) {
      if (!b.vertexCount) return;
      var g = b.build(mat, name, { cast: false, receive: true });
      if (noAO) g.userData.noAO = true;   // 제대·독서대에 붙은 얇은 천: AO 법선 패스에서 뺀다(그리기 호출 절약)
      group.add(g);
    }
    var clothMat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0, side: T.DoubleSide, emissive: new T.Color(em.hex), emissiveIntensity: em.em, envMapIntensity: 0.6 });
    mats.push(clothMat);
    addBatch(cloth, clothMat, 'liturgy-cloth', true);
    addBatch(solid, ctx.mats.solid, 'liturgy-props');          // 성당 재질을 그대로 쓴다(시간대·화질 따라 함께 바뀐다)
    var points = null;
    if (pts.length) {
      var n = pts.length / 6, pa = new Float32Array(n * 3), ca = new Float32Array(n * 3);
      for (var i = 0; i < n; i++) { pa[i * 3] = pts[i * 6]; pa[i * 3 + 1] = pts[i * 6 + 1]; pa[i * 3 + 2] = pts[i * 6 + 2]; ca[i * 3] = pts[i * 6 + 3]; ca[i * 3 + 1] = pts[i * 6 + 4]; ca[i * 3 + 2] = pts[i * 6 + 5]; }
      var pg = new T.BufferGeometry();
      pg.setAttribute('position', new T.BufferAttribute(pa, 3)); pg.setAttribute('color', new T.BufferAttribute(ca, 3));
      pg.computeBoundingSphere();
      var kk = (PLACES[world.id] || { k: 1 }).k;
      var pm = new T.PointsMaterial({ map: ctx._getGlowTex(), size: 0.2 * Math.sqrt(kk), sizeAttenuation: true, vertexColors: true, transparent: true, opacity: 0.9, blending: T.AdditiveBlending, depthWrite: false, fog: false });
      mats.push(pm);
      points = new T.Points(pg, pm); points.name = 'liturgy-lights'; points.renderOrder = 2;
      group.add(points);
    }
    var verts = cloth.vertexCount + solid.vertexCount, calls = 0;
    group.traverse(function (o) { if (o.isMesh || o.isPoints) calls++; });
    return { group: group, mats: mats, clothMat: clothMat, points: points, baseSize: points ? points.material.size : 0, stats: { items: pl.items.length, verts: verts, calls: calls, lights: pts.length / 6, colliders: pl.colliders.length } };
  }
  var _torus = {};
  function torus(T, rs, ts) { var key = rs + '_' + ts; return _torus[key] || (_torus[key] = new T.TorusGeometry(1, 0.25, rs, ts)); }

  // ---- 모듈 상태(장면 하나) ----
  var cur = { state: norm(null), world: null, built: null, tier: null, cols: [], key: '' };

  function teardown() {
    var b = cur.built, w = cur.world;
    if (b) {
      if (b.group.parent) b.group.parent.remove(b.group);
      b.group.traverse(function (o) { if (o.geometry && o.geometry.dispose) o.geometry.dispose(); });
      b.mats.forEach(function (m) { m.dispose(); });   // 지도(glowTex)와 성당 공용 재질은 성당 것이라 건드리지 않는다
    }
    if (w && cur.cols.length) {
      var list = w.logic.colliders;
      cur.cols.forEach(function (c) { var i = list.indexOf(c); if (i >= 0) list.splice(i, 1); });
    }
    cur.built = null; cur.cols = []; cur.key = '';
  }
  function rebuild() {
    teardown();
    var w = cur.world;
    if (!w || !root.THREE || w.builder.viewing) return;
    var low = w.tier === 'low';
    cur.tier = w.tier;
    var pl = plan(w.id, cur.state, low);
    cur.key = keyOf(pl.state);
    if (!pl.items.length) return;
    try { cur.built = build(pl, w, low); } catch (e) { if (root.console) console.error('[church] liturgy build failed', e); cur.built = null; return; }
    w.group.add(cur.built.group);
    // 충돌체: 걸어서 장식을 통과하지 않게(자동 걷기 경로는 이 자리들을 지나지 않는다: liturgy.test.mjs 가 확인)
    pl.colliders.forEach(function (c) {
      var nc = c.r !== undefined ? { k: 1, x: c.x, z: c.z, r: c.r } : { k: 0, x0: c.x0, x1: c.x1, z0: c.z0, z1: c.z1 };
      w.logic.colliders.push(nc); cur.cols.push(nc);
    });
  }

  var L = {
    SEASONS: SEASONS, COLORS: COLORS, PLACES: PLACES, plan: plan, normalize: norm,
    // 전례 시기를 정한다. 장면이 있으면 바로 다시 짓고, 없으면 기억해 두었다가 attach 때 짓는다.
    set: function (o) {
      var s = norm(o);
      var same = keyOf(s) === keyOf(cur.state);
      cur.state = s;
      if (cur.world && (!same || (o && o.force))) rebuild();
    },
    state: function () { return cur.state; },
    attach: function (world) { teardown(); cur.world = world; rebuild(); },
    detach: function () { teardown(); cur.world = null; },
    // 불꽃이 살짝 흔들린다 + 화질 단계가 바뀌면 다시 짓는다
    update: function (dt, t) {
      var w = cur.world, b = cur.built;
      if (!w) return;
      if (w.tier !== cur.tier) { rebuild(); b = cur.built; }
      if (!b) return;
      if (b.points) b.points.material.size = b.baseSize * (1 + 0.05 * Math.sin(t * 11) + 0.03 * Math.sin(t * 23.7));
      if (w.env) b.clothMat.envMapIntensity = 0.6 * (w.env.envK === undefined ? 1 : w.env.envK);
    },
    stats: function () { return cur.built ? cur.built.stats : { items: 0, verts: 0, calls: 0, lights: 0, colliders: 0 }; }
  };

  // 시험용: ?liturgy=advent|christmas|lent|easter|ordinary|souls (&lweek=3)
  try {
    var qs = root.location && root.location.search ? new URLSearchParams(root.location.search) : null, ql = qs && qs.get('liturgy');
    if (ql) cur.state = norm(ql === 'souls' ? { season: 'ordinary', color: 'violet', memorial: true } : { season: ql, week: +(qs.get('lweek') || 2), color: qs.get('lcolor') || undefined });
  } catch (e) { /* ignore */ }

  root.ChurchLiturgy = L;
  if (typeof module === 'object' && module.exports) module.exports = L;
})(typeof window !== 'undefined' ? window : this);
