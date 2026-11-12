/* ch_glass.js — 감상실(G-08, church id 'glass_room'): 사진 창 하나를 실제 크기로 동쪽 벽(-z)에 끼운 작은 석조 경당.
   - 좌석·촛불대·스테이션·아바타 없음(혼자 보는 방, 실시간 서버에 붙지 않는다: builder.viewing = true).
   - 창 크기·빛 상태는 ctx.view = {w, h, light:'ref'|'sun'|'night', hour} (GlassView 가 소유하고 바꾸면 world.setHour 로 다시 적용).
   - 창 자리: 벽에 뚫은 직사각 개구부(창 외곽 + 여백) 안쪽 깊이 DR 의 돌 뒤판. 사진 창 판은 GlassView 가 그 앞 1.2cm 에 놓는다.
   - 조명은 유리 색을 바꾸지 않는다(유리는 발광 판). 돌은 따뜻한 회색, 기준광은 부드러운 반구광 + 창에서 나오는 약한 빛. */
(function () {
  'use strict';
  var layout = {
    id: 'glass_room', scalePercent: 100, viewing: true,
    bounds: { x0: -3, x1: 3, z0: 0.3, z1: 8 },
    spawn: { x: 0, z: 6, r: 0 },
    seatGroups: [],
    candles: { stands: [] },
    info: { name: '감상실' }
  };

  ChurchBuilders['glass_room'] = {
    layout: layout,
    viewing: true,
    build: function (ctx) {
      var T = ctx.THREE, M = window.ChurchGlassMath;
      var V = ctx.view || {};
      var ww = V.w > 0 ? V.w : 2.0, wh = V.h > 0 ? V.h : 3.2;
      var big = Math.max(ww, wh);
      // 창 중심 높이: 작은 창은 눈높이(1.55m) 근처, 큰 창은 바닥에서 0.9m 띄운다
      var cy = wh <= 2.6 ? Math.max(1.55, wh / 2 + 0.6) : wh / 2 + 0.9;
      var mg = Math.min(0.6, Math.max(0.12, big * 0.06));              // 개구부 여백(돌 테두리)
      var DR = Math.min(0.7, Math.max(0.25, big * 0.06));              // 개구부 깊이(reveal)
      var ox0 = -ww / 2 - mg, ox1 = ww / 2 + mg, oy0 = cy - wh / 2 - mg, oy1 = cy + wh / 2 + mg;
      var RW = Math.max(3.2, ww / 2 + mg + 2.2), RH = Math.max(4.8, oy1 + 1.6);
      // 세로 화면(비율 0.42)에서도 창 전체가 들어오는 거리 + 여유. 카메라가 방 안에 있어야 한다.
      var dFar = M ? M.frameDistance(ww, wh, 0.42, 35, 0.84) : big * 4;
      var RD = Math.min(90, Math.max(8, dFar * 1.06 + 1.6));
      var WT = 0.3, zb = -DR - WT;                                    // 동쪽 벽 두께(개구부 뒤판 포함)
      var STONE = 0xd2cbc0, STONE_D = 0x9a9389, FLOOR = 0xbdb4a8;   // 따뜻한 회색 돌(채도 낮게, 창보다 어둡게)
      layout.bounds = { x0: -RW + 0.4, x1: RW - 0.4, z0: 0.4, z1: RD - 0.4 };
      layout.spawn = { x: 0, z: Math.min(RD - 1, 4), r: 0 };

      // 바닥·천장(무광, 반사 없음)
      ctx.boxAABB({ x0: -RW, x1: RW, z0: zb, z1: RD + 0.3, y0: -0.3, y1: 0, surf: 'stone_grey', color: FLOOR });
      ctx.boxAABB({ x0: -RW, x1: RW, z0: zb, z1: RD + 0.3, y0: RH, y1: RH + 0.3, surf: 'stone_grey', color: STONE });
      // 옆벽·뒷벽
      ctx.boxAABB({ x0: -RW - 0.4, x1: -RW, z0: zb, z1: RD + 0.3, y0: 0, y1: RH, surf: 'stone_grey', color: STONE });
      ctx.boxAABB({ x0: RW, x1: RW + 0.4, z0: zb, z1: RD + 0.3, y0: 0, y1: RH, surf: 'stone_grey', color: STONE });
      ctx.boxAABB({ x0: -RW, x1: RW, z0: RD, z1: RD + 0.4, y0: 0, y1: RH, surf: 'stone_grey', color: STONE });
      // 동쪽 벽: 개구부 둘레 4조각 + 개구부 안쪽 돌 뒤판(깊이 DR)
      ctx.boxAABB({ x0: -RW, x1: ox0, z0: zb, z1: 0, y0: 0, y1: RH, surf: 'stone_grey', color: STONE });
      ctx.boxAABB({ x0: ox1, x1: RW, z0: zb, z1: 0, y0: 0, y1: RH, surf: 'stone_grey', color: STONE });
      ctx.boxAABB({ x0: ox0, x1: ox1, z0: zb, z1: 0, y0: 0, y1: oy0, surf: 'stone_grey', color: STONE });
      ctx.boxAABB({ x0: ox0, x1: ox1, z0: zb, z1: 0, y0: oy1, y1: RH, surf: 'stone_grey', color: STONE });
      ctx.boxAABB({ x0: ox0, x1: ox1, z0: zb, z1: -DR, y0: oy0, y1: oy1, surf: 'stone_grey', color: STONE_D });
      // 창턱·몰딩(얇은 돌 띠, 어두운 테두리 역할)
      var lip = Math.min(0.08, mg * 0.4);
      ctx.boxAABB({ x0: ox0 - lip, x1: ox1 + lip, z0: 0, z1: 0.05, y0: oy0 - lip, y1: oy0, surf: 'stone_grey', color: STONE_D });
      ctx.boxAABB({ x0: ox0 - lip, x1: ox1 + lip, z0: 0, z1: 0.05, y0: oy1, y1: oy1 + lip, surf: 'stone_grey', color: STONE_D });
      ctx.boxAABB({ x0: ox0 - lip, x1: ox0, z0: 0, z1: 0.05, y0: oy0, y1: oy1, surf: 'stone_grey', color: STONE_D });
      ctx.boxAABB({ x0: ox1, x1: ox1 + lip, z0: 0, z1: 0.05, y0: oy0, y1: oy1, surf: 'stone_grey', color: STONE_D });
      // 걸레받이
      ctx.boxAABB({ x0: -RW, x1: RW, z0: 0, z1: 0.06, y0: 0, y1: 0.22, surf: 'stone_grey', color: STONE_D });

      // 밤·촛불: 창 양옆 바닥 촛대 2개(밤에만 불꽃·빛)
      var cx = Math.min(RW - 0.6, ox1 + 0.45), flames = [];
      [-1, 1].forEach(function (s) {
        ctx.cyl({ x: s * cx, y: 0, z: 0.7, r: 0.16, rTop: 0.05, h: 1.0, seg: 10, color: 0x6b5638, metal: true });
        ctx.cyl({ x: s * cx, y: 1.0, z: 0.7, r: 0.045, h: 0.32, seg: 8, color: 0xf6efe0 });
        flames.push(ctx.addFlame({ x: s * cx, y: 1.42, z: 0.7, scale: 1.2 }));
      });
      var candle = new T.PointLight(0xffa860, 0, 9, 2); candle.position.set(0, 1.5, 1.0); ctx.add(candle);
      // 창에서 들어오는 부드러운 빛(유리 색에는 영향 없음, 돌만 비춘다)
      var winLight = new T.PointLight(0xfff1df, 0, Math.max(8, big * 3), 2); winLight.position.set(0, cy, Math.max(0.8, big * 0.25)); ctx.add(winLight);
      var BIG2 = Math.max(1, big * big * 0.35);

      ctx.envOverride(function (env) {
        var L = V.light || 'ref', st = M ? M.lightState(L, V.hour) : { stone: 1, k: 1, tint: [1, 1, 1] };
        env.di = 0; env.beam = 0; env.amb = 0; env.candle = 0; env.lamp = 0; env.night = L === 'night' ? 1 : 0;
        env.hor.setHex(0x1a1612); env.fog.setHex(0x1a1612);
        if (L === 'night') { env.hs.setHex(0x3a4058); env.hg.setHex(0x1c1814); env.hi = 0.22; env.envK = 0.06; env.exp = 1.0; }
        else if (L === 'sun') { env.hs.setHex(0xfff4e8); env.hg.setHex(0x8f877c); env.hi = 0.3 + 1.1 * st.stone; env.envK = 0.1 + 0.4 * st.stone; env.exp = 1.0; }
        else { env.hs.setHex(0xfff6ee); env.hg.setHex(0x8f877c); env.hi = 1.3; env.envK = 0.45; env.exp = 1.0; }
      });
      ctx.onHour(function () {
        var L = V.light || 'ref', st = M ? M.lightState(L, V.hour) : { k: 1, tint: [1, 1, 1] };
        var night = L === 'night';
        flames.forEach(function (f) { f.visible = night; });
        candle.intensity = night ? 2.2 : 0;
        winLight.intensity = night ? 0 : 2.4 * BIG2 * Math.min(2.2, st.k);
        winLight.color.setRGB(st.tint[0], st.tint[1], st.tint[2]);
      });

      ctx.setViewSlot({ x: 0, y: cy, z: -DR + 0.012, nx: 0, nz: 1, w: ww, h: wh, depth: DR, backZ: -DR, open: { x0: ox0, x1: ox1, y0: oy0, y1: oy1 }, room: { w: RW * 2, h: RH, d: RD } });
      ctx.setCameraBounds({ x0: -RW + 0.3, x1: RW - 0.3, z0: 0.3, z1: RD - 0.3, yMax: RH - 0.2 });
      ctx.setSky({ outside: false });
      ctx.addCollider({ x0: -RW - 1, x1: RW + 1, z0: zb - 1, z1: 0.2 });
    }
  };
})();
