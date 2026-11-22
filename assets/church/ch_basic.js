/* ch_basic.js — 우리 본당(basic): SPEC 1~7절 성당. 빌더 API 의 기준 구현. */
(function () {
  'use strict';
  var layout = ChurchLayouts.basic;

  ChurchBuilders['basic'] = {
    layout: layout,
    thumb: { x: 0, z: 13, yaw: 0, pitch: 16, zoom: 0.9, hour: 15.5 },
    build: function (ctx) {
      var T = ctx.THREE, PI = Math.PI;
      var CREAM = 0xf6ead6, WOOD_D = 0x7a5236, GOLD = 0xd9b45a, WAINS = 0xd7b392;
      var W = 12, Z0 = -20, ZF = 19.5, WH = 6.5, RISE = 3.6;

      // ----- 바닥: 광택 대리석(흰/검정 체스판) + 신자석 마루 + 성소 단 -----
      ctx.floor({ x0: -W, x1: W, z0: Z0, z1: 20.1, y: 0, surf: 'marble_checker', gloss: 0.9 });
      [-1, 1].forEach(function (s) {
        ctx.boxAABB({ x0: s < 0 ? -9.2 : 2.4, x1: s < 0 ? -2.4 : 9.2, z0: -10.9, z1: 12.1, y0: 0, y1: 0.02, surf: 'wood_dark', color: 0xb8a090 });
      });
      ctx.boxAABB({ x0: -W, x1: W, z0: Z0, z1: -14, y0: 0, y1: 0.49, surf: 'marble_white' });
      ctx.floor({ x0: -W, x1: W, z0: Z0, z1: -14, y: 0.5, surf: 'marble_white', gloss: 0.95, zone: true });
      // 계단은 제단 전폭(징두리 앞까지): 예전에는 x ±9 바깥 3m 가 계단 없는 0.5m 턱이었다(STRUCTURE_AUDIT_OTHERS §4 B4)
      ctx.steps({ x0: -W + 0.1, x1: W - 0.1, z0: -14, z1: -13.2, y0: 0, y1: 0.5, n: 2, dir: [0, -1], surf: 'marble_white' });
      // 중앙 통로(좌석 사이 5.4m, SPEC 고정)가 휑하지 않게 양탄자를 2.6m 로(B8)
      ctx.carpet({ x0: -1.3, x1: 1.3, z0: -13.2, z1: 19.2, y: 0, color: 0x8a2433, border: 0xb8963f });
      ctx.carpet({ x0: -1.5, x1: 1.5, z0: -18.2, z1: -14, y: 0.5, color: 0x8a2433, border: 0xb8963f });

      // ----- 벽: 회반죽 + 징두리 + 돌 몰딩(창 구멍이 뚫린 진짜 벽) -----
      var WS = 'plaster';
      ctx.wall({ x0: -W - 0.3, z0: Z0 - 0.3, x1: -W - 0.3, z1: 20.4, h: WH, t: 0.6, color: CREAM, surf: WS, collide: false });
      ctx.wall({ x0: W + 0.3, z0: Z0 - 0.3, x1: W + 0.3, z1: 20.4, h: WH, t: 0.6, color: CREAM, surf: WS, collide: false });
      ctx.wall({ x0: -W, z0: Z0 - 0.3, x1: W, z1: Z0 - 0.3, h: WH, t: 0.6, color: CREAM, surf: WS, collide: false });
      ctx.wall({ x0: -W, z0: ZF + 0.3, x1: -2.2, z1: ZF + 0.3, h: WH, t: 0.6, color: CREAM, surf: WS, collide: false });
      ctx.wall({ x0: 2.2, z0: ZF + 0.3, x1: W, z1: ZF + 0.3, h: WH, t: 0.6, color: CREAM, surf: WS, collide: false });
      ctx.wall({ x0: -2.2, z0: ZF + 0.3, x1: 2.2, z1: ZF + 0.3, y: 4.6, h: WH - 4.6, t: 0.6, color: CREAM, surf: WS, collide: false, plinth: false });
      ctx.addCollider({ x0: -W, x1: W, z0: ZF, z1: 21 });
      // 문틀(돌)과 열린 나무 문짝
      ctx.box({ x: -2.3, y: 0, z: ZF + 0.3, w: 0.26, h: 4.8, d: 0.74, surf: 'limestone' });
      ctx.box({ x: 2.3, y: 0, z: ZF + 0.3, w: 0.26, h: 4.8, d: 0.74, surf: 'limestone' });
      ctx.box({ x: 0, y: 4.6, z: ZF + 0.3, w: 4.9, h: 0.24, d: 0.74, surf: 'limestone' });
      [[-2.2, -1.3, 1], [2.2, 1.3, -1]].forEach(function (d) {
        var hx = d[0], ry = d[1], sg = d[2];
        var dirx = sg * Math.cos(ry * sg), dirz = Math.sin(Math.abs(ry));
        var cx = hx + dirx * 1.1, cz = ZF + 0.35 + dirz * 1.1;
        ctx.box({ x: cx, y: 0, z: cz, w: 2.2, h: 4.5, d: 0.14, ry: ry, surf: 'wood_dark' });
        ctx.box({ x: cx, y: 0.5, z: cz, w: 1.7, h: 1.6, d: 0.19, ry: ry, surf: 'wood_dark', color: 0xd8c0b0 });
        ctx.box({ x: cx, y: 2.4, z: cz, w: 1.7, h: 1.6, d: 0.19, ry: ry, surf: 'wood_dark', color: 0xd8c0b0 });
        ctx.sphere({ x: cx, y: 1.9, z: cz, r: 0.07, color: GOLD, w: 10, h: 8 });
      });
      ctx.window({ x: 0, y: 4.9, z: ZF, face: [0, -1], w: 3.6, h: 0.1, top: 'round', pattern: 'solid', seed: 17, frame: true, beam: false, painted: true, glass: 'parish' });

      // 박공(원통 궁륭 양 끝 채움)
      var pts = ChurchKit.profilePts('round', W, RISE, 24);
      [[Z0, 1], [ZF, -1]].forEach(function (g) {
        var tris = [];
        for (var i = 0; i < pts.length - 1; i++) tris.push(pts[i][0], WH, g[0], pts[i + 1][0], WH, g[0], pts[i][0], WH + pts[i][1], g[0], pts[i + 1][0], WH, g[0], pts[i + 1][0], WH + pts[i + 1][1], g[0], pts[i][0], WH + pts[i][1], g[0]);
        ctx.surfBatch(WS).addTris(tris, 0xffffff, [0, 7, g[0] + g[1] * 3]);
      });
      ctx.rose({ x: 0, y: 8.3, z: Z0 + 0.02, face: [0, 1], r: 1.5, petals: 12, seed: 5, beam: false, glass: 'parish' });
      ctx.rose({ x: 0, y: 8.4, z: ZF - 0.02, face: [0, -1], r: 1.3, petals: 10, seed: 9, beam: false, glass: 'parish' });

      // 징두리(어두운 나무 패널) + 몰딩
      [-1, 1].forEach(function (s) {
        ctx.boxAABB({ x0: s < 0 ? -W : W - 0.1, x1: s < 0 ? -W + 0.1 : W, z0: Z0, z1: ZF, y0: 0.3, y1: 1.35, surf: 'wood_cherry' });
        ctx.boxAABB({ x0: s < 0 ? -W : W - 0.16, x1: s < 0 ? -W + 0.16 : W, z0: Z0, z1: ZF, y0: 1.35, y1: 1.45, surf: 'wood_dark' });
      });
      ctx.boxAABB({ x0: -W, x1: W, z0: Z0, z1: Z0 + 0.1, y0: 0.3, y1: 1.35, surf: 'wood_cherry' });

      // 벽기둥(돌 반원 기둥)
      [-17.5, -10.5, -3.5, 3.5, 10.5, 17.5].forEach(function (z) {
        [-1, 1].forEach(function (s) {
          if (s > 0 && Math.abs(z) === 3.5) return;
          ctx.column({ x: s * 11.5, z: z, y: 0, h: WH - 0.35, r: 0.42, style: 'round', capital: 'doric', surf: 'limestone', collide: false, ao: false });
          ctx.addCollider({ x0: s < 0 ? -12 : 11.0, x1: s < 0 ? -11 : 12, z0: z - 0.5, z1: z + 0.5 });
        });
      });

      // ----- 천장: 회반죽 원통 궁륭 + 어두운 나무 보 -----
      ctx.vault({ type: 'barrel', profile: 'round', x0: -W, x1: W, z0: Z0, z1: ZF, y: WH, rise: RISE, color: 0xffffff, surf: WS });
      [-17.5, -10.5, -3.5, 3.5, 10.5, 17.5].forEach(function (z) { ctx.vaultRib({ axis: 'z', center: 0, pos: z, y: WH, a: W, rise: RISE, profile: 'round', t: 0.34, d: 0.5, color: 0xffffff, surf: 'wood_dark' }); });
      ctx.beam3([0, WH + RISE - 0.2, Z0 + 0.2], [0, WH + RISE - 0.2, ZF - 0.2], 0.3, 0.45, 0xffffff, ctx.surfBatch('wood_dark'));
      [-6.5, 6.5].forEach(function (x) {
        var yy = WH + RISE * Math.sqrt(1 - Math.pow(x / W, 2)) - 0.2;
        ctx.beam3([x, yy, Z0 + 0.2], [x, yy, ZF - 0.2], 0.22, 0.32, 0xe0d0c8, ctx.surfBatch('wood_dark'));
      });
      [-10, -3, 4, 11].forEach(function (z) { [-6, 6].forEach(function (x) { ctx.lantern({ x: x, y: 7.6, z: z, chain: 1.95 }); }); });
      [-6.5, 0.5, 7.5].forEach(function (z) { ctx.chandelier({ x: 0, y: 7.1, z: z, chain: 2.5, r: 0.85, tiers: 1 }); });

      // ----- 창: 벽에 뚫린 진짜 개구부 + 스테인드글라스 + 창살 -----
      [-14, -7, 0, 7, 14].forEach(function (z, i) {
        ctx.window({ x: -W, z: z, y: 3.0, face: [1, 0], w: 1.9, h: 1.9, top: 'pointed', seed: 11 + i, beamReach: 11, glass: 'parish' });
        ctx.window({ x: W, z: z, y: 3.0, face: [-1, 0], w: 1.9, h: 1.9, top: 'pointed', seed: 31 + i, beamReach: 11, glass: 'parish' });
      });

      // ----- 성소 -----
      var SY = 0.5;
      ctx.boxAABB({ x0: -3.3, x1: 3.3, z0: Z0, z1: Z0 + 0.12, y0: SY, y1: SY + 6.0, surf: 'marble_beige' });
      ctx.boxAABB({ x0: -3.3, x1: -3.16, z0: Z0, z1: Z0 + 0.16, y0: SY, y1: SY + 6.0, color: GOLD });
      ctx.boxAABB({ x0: 3.16, x1: 3.3, z0: Z0, z1: Z0 + 0.16, y0: SY, y1: SY + 6.0, color: GOLD });
      ctx.crucifix({ x: 0, y: SY + 2.9, z: Z0 + 0.3, h: 3.4, ry: 0, scan: true });   // 실물 스캔 십자고상(scan3d.js, 채색 목조 — 대용)
      ctx.altar({ x: 0, z: -17, y: SY, w: 2.6, d: 1.1, h: 1.0 });
      ctx.pulpit({ x: -4.6, z: -16, y: SY, ry: 0, style: 'ambo' });
      ctx.tabernacle({ x: 5, z: -18.4, y: SY, lamp: true });
      [-2.5, 2.5].forEach(function (x) {
        ctx.cyl({ x: x, y: SY, z: -17.3, r: 0.18, rTop: 0.07, h: 1.5, seg: 8, color: GOLD });
        ctx.cyl({ x: x, y: SY + 1.5, z: -17.3, r: 0.06, h: 0.5, seg: 6, color: 0xfff6e0 });
        ctx.addFlame({ x: x, y: SY + 2.2, z: -17.3, scale: 1.3 });
        ctx.addCollider({ x: x, z: -17.3, r: 0.25 });
      });
      // 성인상(받침 + 조각)
      [[-8.5, 'mary'], [8.5, 'saint']].forEach(function (s) {
        ctx.box({ x: s[0], y: SY, z: -18.4, w: 1.1, h: 0.8, d: 1.1, surf: 'marble_white' });
        ctx.statue({ x: s[0], y: SY + 0.8, z: -18.4, h: 1.9, kind: s[1], ry: 0 });
        ctx.addCollider({ x0: s[0] - 0.6, x1: s[0] + 0.6, z0: -19, z1: -17.8 });
      });
      ctx.addLight({ x: 0, y: 3.4, z: -15.5, color: 0xffc27a, intensity: 1.0, distance: 16, kind: 'lamp' });

      // ----- 제단 가구(전례 규정·한국 본당 관례, STRUCTURE_AUDIT_OTHERS §4): 주례석·복사석, 주수상, 세례대, 제의실 문 -----
      var RED = 0x8a2433, CUSHION = 0x9a2a3a;
      // 의자(등받이가 -z 쪽, 회중을 본다): 다리 4 + 좌판 + 방석 + 등받이 판·천·윗대. arms: 팔걸이와 머리 장식(주례석)
      function chair(x, z, y, w, d, backH, arms) {
        var hw = w / 2, hd = d / 2, sy = y + 0.44, k;
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (q) {
          ctx.box({ x: x + q[0] * (hw - 0.04), y: y, z: z + q[1] * (hd - 0.04), w: 0.07, h: q[1] < 0 ? backH : (arms ? 0.74 : 0.42), d: 0.07, surf: 'wood_dark' });
        });
        ctx.box({ x: x, y: sy - 0.1, z: z, w: w, h: 0.1, d: d, surf: 'wood_cherry' });                                   // 좌판 틀
        ctx.box({ x: x, y: sy, z: z + 0.02, w: w - 0.12, h: 0.07, d: d - 0.14, color: CUSHION });                         // 방석
        ctx.box({ x: x, y: sy + 0.14, z: z - hd + 0.04, w: w - 0.1, h: backH - 0.64, d: 0.05, surf: 'wood_cherry' });     // 등받이 판
        ctx.box({ x: x, y: sy + 0.2, z: z - hd + 0.075, w: w - 0.22, h: backH - 0.84, d: 0.03, color: CUSHION });         // 등받이 천
        ctx.box({ x: x, y: y + backH, z: z - hd + 0.04, w: w + 0.06, h: 0.09, d: 0.1, surf: 'wood_dark' });               // 윗대
        if (arms) {
          for (k = -1; k <= 1; k += 2) {
            ctx.box({ x: x + k * (hw - 0.04), y: y + 0.74, z: z + 0.02, w: 0.09, h: 0.06, d: d + 0.04, surf: 'wood_dark' });
            ctx.sphere({ x: x + k * (hw - 0.04), y: y + backH + 0.13, z: z - hd + 0.04, r: 0.055, color: GOLD, w: 8, h: 6 });
          }
          ctx.box({ x: x, y: y + backH + 0.09, z: z - hd + 0.04, w: 0.05, h: 0.3, d: 0.05, color: GOLD });               // 윗대 위 작은 금 십자
          ctx.box({ x: x, y: y + backH + 0.27, z: z - hd + 0.04, w: 0.19, h: 0.05, d: 0.05, color: GOLD });
        }
      }
      // 주례석(사제석, 총지침 310): 제대 뒤 벽 앞 가운데, 십자고상(y 3.4~) 아래. 한 단 높인 나무 받침 위. 좌우에 복사석.
      ctx.boxAABB({ x0: -0.95, x1: 0.95, z0: -19.86, z1: -18.5, y0: SY, y1: SY + 0.12, surf: 'wood_dark' });
      ctx.boxAABB({ x0: -0.8, x1: 0.8, z0: -19.8, z1: -18.56, y0: SY + 0.12, y1: SY + 0.13, color: RED });
      chair(0, -19.3, SY + 0.12, 0.84, 0.66, 1.62, true);
      [-1.45, 1.45].forEach(function (x) { chair(x, -19.36, SY, 0.5, 0.48, 1.0, false); });
      ctx.addCollider({ x0: -1.85, x1: 1.85, z0: -19.9, z1: -18.5 });
      // 주수상(제대 옆 작은 탁자): 흰 보 + 주수병 둘 + 성작
      ctx.box({ x: 3.4, y: SY, z: -18.75, w: 0.86, h: 0.76, d: 0.46, surf: 'wood_cherry' });
      ctx.box({ x: 3.4, y: SY + 0.76, z: -18.75, w: 0.96, h: 0.035, d: 0.56, color: 0xf6f1e6 });
      ctx.box({ x: 3.4, y: SY + 0.5, z: -18.47, w: 0.96, h: 0.27, d: 0.012, color: 0xf6f1e6 });
      [-0.24, -0.08].forEach(function (dx, i) { ctx.cyl({ x: 3.4 + dx, y: SY + 0.795, z: -18.78, r: 0.035, rTop: 0.02, h: 0.14, seg: 8, color: i ? 0xe8d9b0 : 0x7a1c28, mat: 'gloss' }); });
      ctx.cyl({ x: 3.62, y: SY + 0.795, z: -18.75, r: 0.04, rTop: 0.015, h: 0.09, seg: 8, color: GOLD });
      ctx.cyl({ x: 3.62, y: SY + 0.885, z: -18.75, r: 0.02, rTop: 0.05, h: 0.09, seg: 8, color: GOLD });
      ctx.addCollider({ x: 3.4, z: -18.75, r: 0.5 });
      // 세례대(성모상 곁): 팔각 석조 + 물
      (function () {
        var fx = -10.4, fz = -15.4;
        ctx.cyl({ x: fx, y: SY, z: fz, r: 0.4, rTop: 0.34, h: 0.14, seg: 8, surf: 'limestone', ry: PI / 8 });
        ctx.cyl({ x: fx, y: SY + 0.14, z: fz, r: 0.17, rTop: 0.15, h: 0.56, seg: 8, surf: 'limestone', ry: PI / 8 });
        ctx.cyl({ x: fx, y: SY + 0.7, z: fz, r: 0.3, rTop: 0.48, h: 0.3, seg: 8, surf: 'limestone', ry: PI / 8 });
        ctx.cyl({ x: fx, y: SY + 1.0, z: fz, r: 0.5, h: 0.05, seg: 8, surf: 'marble_white', ry: PI / 8 });
        ctx.cyl({ x: fx, y: SY + 1.035, z: fz, r: 0.42, h: 0.02, seg: 16, color: 0x9fd3f0, mat: 'glow' });
        ctx.addCollider({ x: fx, z: fz, r: 0.55 });
      })();
      // 제의실 문(왼쪽 벽, 닫힌 나무 문): 돌 문틀 + 판 두 장 + 손잡이. 징두리 띠를 끊고 그 앞에 선다
      (function () {
        var dz = -15.6, dw = 1.1, dh = 2.25, xw = -W;
        ctx.boxAABB({ x0: xw, x1: xw + 0.22, z0: dz - dw / 2 - 0.16, z1: dz - dw / 2, y0: SY, y1: SY + dh + 0.16, surf: 'limestone' });
        ctx.boxAABB({ x0: xw, x1: xw + 0.22, z0: dz + dw / 2, z1: dz + dw / 2 + 0.16, y0: SY, y1: SY + dh + 0.16, surf: 'limestone' });
        ctx.boxAABB({ x0: xw, x1: xw + 0.24, z0: dz - dw / 2 - 0.2, z1: dz + dw / 2 + 0.2, y0: SY + dh, y1: SY + dh + 0.18, surf: 'limestone' });
        ctx.boxAABB({ x0: xw, x1: xw + 0.18, z0: dz - dw / 2, z1: dz + dw / 2, y0: SY, y1: SY + dh, surf: 'wood_dark' });
        [[0.18, 0.8], [1.12, 0.95]].forEach(function (q) { ctx.boxAABB({ x0: xw + 0.18, x1: xw + 0.2, z0: dz - dw / 2 + 0.14, z1: dz + dw / 2 - 0.14, y0: SY + q[0], y1: SY + q[0] + q[1], surf: 'wood_dark', color: 0xd8c0b0 }); });
        ctx.sphere({ x: xw + 0.23, y: SY + 1.02, z: dz + dw / 2 - 0.1, r: 0.04, color: GOLD, w: 8, h: 6 });
      })();

      // ----- 성가대 자리(앞쪽 오른편, 조형만 — 앉는 좌석 아님): 낮은 나무 단 + 전자 오르간 + 의자 두 줄 + 보면대 -----
      (function () {
        var x0 = 9.15, x1 = 11.55, z0 = -12.75, z1 = -9.5, y = 0.1, i, j;
        ctx.boxAABB({ x0: x0, x1: x1, z0: z0, z1: z1, y0: 0, y1: y, surf: 'wood_dark' });
        // 오르간: 몸체 + 건반 2단 + 보면대 + 옆판, 연주자 의자. 연주자는 제대(-z)를 본다
        var ox = 10.35, oz = -12.3;
        ctx.boxAABB({ x0: ox - 0.7, x1: ox + 0.7, z0: oz - 0.3, z1: oz + 0.05, y0: y, y1: y + 1.12, surf: 'wood_cherry' });
        ctx.boxAABB({ x0: ox - 0.74, x1: ox - 0.66, z0: oz - 0.32, z1: oz + 0.42, y0: y, y1: y + 0.98, surf: 'wood_dark' });
        ctx.boxAABB({ x0: ox + 0.66, x1: ox + 0.74, z0: oz - 0.32, z1: oz + 0.42, y0: y, y1: y + 0.98, surf: 'wood_dark' });
        ctx.boxAABB({ x0: ox - 0.66, x1: ox + 0.66, z0: oz + 0.05, z1: oz + 0.4, y0: y + 0.7, y1: y + 0.76, surf: 'wood_cherry' });
        ctx.boxAABB({ x0: ox - 0.66, x1: ox + 0.66, z0: oz + 0.05, z1: oz + 0.2, y0: y + 0.76, y1: y + 0.82, surf: 'wood_dark' });  // 위 건반 받침
        ctx.boxAABB({ x0: ox - 0.6, x1: ox + 0.6, z0: oz + 0.2, z1: oz + 0.38, y0: y + 0.76, y1: y + 0.785, color: 0xf4f0e4 });     // 아래 건반
        ctx.boxAABB({ x0: ox - 0.6, x1: ox + 0.6, z0: oz + 0.06, z1: oz + 0.2, y0: y + 0.82, y1: y + 0.845, color: 0xf4f0e4 });     // 위 건반
        ctx.boxAABB({ x0: ox - 0.6, x1: ox + 0.6, z0: oz + 0.06, z1: oz + 0.12, y0: y + 0.845, y1: y + 0.86, color: 0x1c1a18 });
        ctx.boxAABB({ x0: ox - 0.6, x1: ox + 0.6, z0: oz + 0.2, z1: oz + 0.26, y0: y + 0.785, y1: y + 0.8, color: 0x1c1a18 });
        ctx.box({ x: ox, y: y + 1.12, z: oz - 0.1, w: 0.7, h: 0.34, d: 0.03, rx: -0.3, surf: 'wood_dark' });                 // 보면대
        ctx.box({ x: ox, y: y + 1.17, z: oz - 0.07, w: 0.5, h: 0.26, d: 0.012, rx: -0.3, color: 0xfaf7ee });                  // 악보
        ctx.boxAABB({ x0: ox - 0.5, x1: ox + 0.5, z0: oz + 0.62, z1: oz + 0.94, y0: y + 0.52, y1: y + 0.58, surf: 'wood_cherry' });   // 연주자 의자
        [[-0.44, 0.66], [0.44, 0.66], [-0.44, 0.9], [0.44, 0.9]].forEach(function (q) { ctx.box({ x: ox + q[0], y: y, z: oz + q[1], w: 0.06, h: 0.52, d: 0.06, surf: 'wood_dark' }); });
        // 성가대 의자 2줄 × 3 (제대를 본다 = 등받이가 +z 쪽)
        for (j = 0; j < 2; j++) for (i = 0; i < 3; i++) {
          var cx = 9.62 + i * 0.73, cz = -10.85 + j * 0.85;
          ctx.box({ x: cx, y: y + 0.4, z: cz, w: 0.46, h: 0.06, d: 0.44, surf: 'wood_cherry' });
          ctx.box({ x: cx, y: y + 0.46, z: cz - 0.01, w: 0.4, h: 0.04, d: 0.36, color: CUSHION });
          ctx.box({ x: cx, y: y + 0.6, z: cz + 0.2, w: 0.46, h: 0.34, d: 0.04, surf: 'wood_cherry' });
          [[-0.2, -0.19, 0.4], [0.2, -0.19, 0.4], [-0.2, 0.2, 0.94], [0.2, 0.2, 0.94]].forEach(function (q) { ctx.box({ x: cx + q[0], y: y, z: cz + q[1], w: 0.045, h: q[2], d: 0.045, surf: 'wood_dark' }); });
        }
        // 지휘자 보면대
        ctx.cyl({ x: 9.5, y: y, z: -11.75, r: 0.16, rTop: 0.03, h: 0.05, seg: 8, color: 0x2e2a26, mat: 'metal' });
        ctx.cyl({ x: 9.5, y: y + 0.05, z: -11.75, r: 0.018, h: 1.05, seg: 6, color: 0x2e2a26, mat: 'metal' });
        ctx.box({ x: 9.5, y: y + 1.08, z: -11.75, w: 0.46, h: 0.3, d: 0.02, rx: 0.35, color: 0x2e2a26, mat: 'metal' });
        // 충돌체는 둘로 나눈다(각 2.9m 미만): 길쭉한 상자 하나면 십자가의 길 유도(way_cross.js)가 벽으로 보고 그 옆면에 판을 건다
        var zm = (z0 + z1) / 2;
        ctx.addCollider({ x0: x0 - 0.05, x1: W, z0: z0 - 0.05, z1: zm });
        ctx.addCollider({ x0: x0 - 0.05, x1: W, z0: zm, z1: z1 + 0.05 });
      })();

      // ----- 고해소 2(뒤쪽 좌우, 입구 벽에 붙인 나무 방): 문 둘(고해자·사제) + 문 위 표시등 + 처마 위 십자 -----
      [-1, 1].forEach(function (s) {
        var x0 = s > 0 ? 8.0 : -11.0, x1 = s > 0 ? 11.0 : -8.0, zf = 18.05, zb = ZF, H = 2.62, xc = (x0 + x1) / 2;
        ctx.boxAABB({ x0: x0 - 0.05, x1: x1 + 0.05, z0: zf - 0.05, z1: zb, y0: 0, y1: 0.14, surf: 'wood_dark' });           // 받침
        ctx.boxAABB({ x0: x0, x1: x1, z0: zf, z1: zb, y0: 0.14, y1: H, surf: 'wood_cherry' });                             // 몸체
        ctx.boxAABB({ x0: x0 - 0.08, x1: x1 + 0.08, z0: zf - 0.08, z1: zb, y0: H, y1: H + 0.16, surf: 'wood_dark' });       // 처마
        ctx.boxAABB({ x0: x0 - 0.04, x1: x1 + 0.04, z0: zf - 0.04, z1: zb, y0: H + 0.16, y1: H + 0.23, surf: 'wood_cherry' });
        // 모서리 기둥(앞 두 곳) + 옆면 판
        [x0, x1].forEach(function (px) { ctx.box({ x: px, y: 0.14, z: zf, w: 0.12, h: H - 0.14, d: 0.12, surf: 'wood_dark' }); });
        // 옆면: 무광 나무 판(광택 표면은 열린 문의 바깥빛을 받아 하얗게 뜬다) + 가운데 가로대
        [x0 - 0.012, x1 + 0.012].forEach(function (px) {
          ctx.box({ x: px, y: 0.3, z: (zf + zb) / 2 + 0.03, w: 0.024, h: H - 0.46, d: zb - zf - 0.2, color: 0x5c3526 });
          ctx.box({ x: px, y: 1.3, z: (zf + zb) / 2 + 0.03, w: 0.05, h: 0.1, d: zb - zf - 0.2, surf: 'wood_dark' });
        });
        // 문 두 짝: 틀 + 문짝 + 아래 돋을새김 판 + 위 간유리 창(살) + 손잡이 + 표시등
        [-0.72, 0.72].forEach(function (dx, di) {
          var dxc = xc + dx, dwd = 0.84, dh = 2.02, zF = zf - 0.02;
          ctx.box({ x: dxc - dwd / 2 - 0.04, y: 0.14, z: zF, w: 0.08, h: dh + 0.06, d: 0.07, surf: 'wood_dark' });
          ctx.box({ x: dxc + dwd / 2 + 0.04, y: 0.14, z: zF, w: 0.08, h: dh + 0.06, d: 0.07, surf: 'wood_dark' });
          ctx.box({ x: dxc, y: 0.14 + dh, z: zF, w: dwd + 0.24, h: 0.1, d: 0.08, surf: 'wood_dark' });
          ctx.box({ x: dxc, y: 0.14, z: zF, w: dwd, h: dh, d: 0.05, surf: 'wood_cherry', color: 0xead8cc });
          ctx.box({ x: dxc, y: 0.34, z: zF - 0.03, w: dwd - 0.24, h: 0.72, d: 0.025, surf: 'wood_cherry', color: 0xd8c0b0 });
          ctx.box({ x: dxc, y: 1.3, z: zF - 0.03, w: dwd - 0.26, h: 0.62, d: 0.02, color: 0xe9e4d4, mat: 'gloss' });       // 간유리
          ctx.box({ x: dxc, y: 1.3, z: zF - 0.045, w: 0.03, h: 0.62, d: 0.02, surf: 'wood_dark' });
          ctx.box({ x: dxc, y: 1.595, z: zF - 0.045, w: dwd - 0.26, h: 0.03, d: 0.02, surf: 'wood_dark' });
          ctx.sphere({ x: dxc + (dx < 0 ? 1 : -1) * (dwd / 2 - 0.09), y: 1.12, z: zF - 0.06, r: 0.035, color: GOLD, w: 8, h: 6 });
          ctx.box({ x: dxc, y: 0.14 + dh + 0.14, z: zF, w: 0.2, h: 0.1, d: 0.06, surf: 'wood_dark' });                    // 표시등 갓
          ctx.sphere({ x: dxc, y: 0.14 + dh + 0.19, z: zF - 0.04, r: 0.035, color: di === 0 ? 0x7ee89a : 0xffd9a0, mat: 'glow', w: 8, h: 6 });
        });
        // 두 문 사이: 작은 금 십자
        ctx.box({ x: xc, y: 1.25, z: zf - 0.02, w: 0.045, h: 0.36, d: 0.03, color: GOLD });
        ctx.box({ x: xc, y: 1.47, z: zf - 0.02, w: 0.2, h: 0.045, d: 0.03, color: GOLD });
        // 처마 위 머리 장식 + 십자
        ctx.box({ x: xc, y: H + 0.23, z: zf + 0.06, w: 1.0, h: 0.2, d: 0.12, surf: 'wood_dark' });
        ctx.box({ x: xc, y: H + 0.43, z: zf + 0.06, w: 0.6, h: 0.1, d: 0.1, surf: 'wood_cherry' });
        ctx.box({ x: xc, y: H + 0.53, z: zf + 0.06, w: 0.05, h: 0.34, d: 0.05, color: GOLD });
        ctx.box({ x: xc, y: H + 0.74, z: zf + 0.06, w: 0.2, h: 0.05, d: 0.05, color: GOLD });
        ctx.addCollider({ x0: s > 0 ? x0 - 0.1 : -W, x1: s > 0 ? W : x1 + 0.1, z0: zf - 0.1, z1: 21 });
      });

      // ----- 입구 성수대 + 촛불대 + 좌석 -----
      ctx.holyFont({ x: -3.3, z: 18.5 });
      ctx.holyFont({ x: 3.3, z: 18.5 });
      ctx.candleStand(0, {});
      ctx.renderSeats(layout, 'bench', {});

      // ----- 바깥 풍경(열린 문으로 보인다) -----
      ctx.setSky({ outside: true });
      ctx.setCameraBounds({ x0: -11.65, x1: 11.65, z0: -19.65, z1: 25, yMax: 9.4 });
      ctx.ground({ color: 0x6f9a5c, y: -0.05 });
      ctx.path({ x0: -1.8, x1: 1.8, z0: 20, z1: 90 });
      ctx.scatterTrees({ x0: -90, x1: 90, z0: 27, z1: 120, count: 70, seed: 3, minH: 4, maxH: 8.5, exclude: [{ x0: -6, x1: 6, z0: 0, z1: 130 }] });
      ctx.scatterTrees({ x0: -30, x1: 30, z0: 24, z1: 60, count: 12, seed: 8, minH: 3, maxH: 5.5, exclude: [{ x0: -7, x1: 7, z0: 0, z1: 130 }] });
      ctx.scatterTrees({ x0: -16, x1: 16, z0: 24, z1: 50, count: 22, seed: 12, minH: 4, maxH: 7, exclude: [{ x0: -5.5, x1: 5.5, z0: 0, z1: 130 }] });
      ctx.hills({ color: 0x6f8f70, count: 16, radius: 200 });
      for (var f = 0; f < 8; f++) {
        var fx = (f % 2 ? 1 : -1) * (3.5 + (f * 0.37) % 1.6), fz = 22 + f * 1.9;
        ctx.ico({ x: fx, y: 0.25, z: fz, r: 0.5, color: 0x4f7a47, detail: 1, mat: 'outside' });
      }
    }
  };
})();
