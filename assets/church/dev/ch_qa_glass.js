/* dev/ch_qa_glass.js — QA Gallery(E-4, church id 'qa_milan55'): 개발용 임시 시안 55장을 전부, 비율 그대로, 이름표와 함께 건 긴 방.
   ※ 개발 전용: 이 폴더는 일반(배포) APK 에 없고, URL 에 devglass=1 이 있을 때만(dev/devglass_boot.js) 등록된다. 카탈로그·서버·좌석·스테이션 없음.
   - 감상실(ch_glass.js)과 같은 종류의 빌더(viewing: true → 실시간 서버에 붙지 않는다). 걸어서 둘러본다(입구 +z → 안쪽 -z).
   - 그림은 이 빌더가 만든 anchor(key 'qa_<DEV id>') 위에 dev/devglass.js 가 성당 안과 **같은 경로**(같은 팩·셰이더·아틀라스·해제)로 건다
     → 여기서 UV 방향·알파 윤곽·밝기·출입 반복 해제를 55장 전부 확인할 수 있다. 성당 안에 걸리지 않는 것(위치 미확정 등)은 여기에만 있다.
   - 이름표: DEV id, 상태(색), P/V 번호, 성당 안 개구부 key, 근거, 원본 크기. 상태 색 = 바닥 띠 색.
       PLACED(초록)   성당 안에 걸림, 자리가 조사로 확인됨(certainty 'confirmed')
       PROBABLE(주황) 성당 안에 걸림, 자리가 개연·추정(certainty 'probable' | 'assumed')
       HOLD(파랑)     자리는 알지만 걸지 않음(hang:false; 예: 성구실 방 미구현)
       UNPLACED(빨강) 실제 위치 미확정 → 이 방에만 */
(function () {
  'use strict';
  var root = window;
  var ID = 'qa_milan55', SRC = 'milan';
  var HW = 3.4, RH = 5.8, Y0 = 1.25, BOX_W = 1.6, BOX_H = 3.4, GAP = 0.55, LEAD_IN = 3.2;
  var STATUS = {
    placed: { tag: 'PLACED', ko: '배치', color: 0x3f9d5a, css: '#3f9d5a' },
    probable: { tag: 'PROBABLE', ko: '배치(개연·추정)', color: 0xd9962b, css: '#d9962b' },
    hold: { tag: 'HOLD', ko: '보류', color: 0x5f7fbf, css: '#5f7fbf' },
    unplaced: { tag: 'UNPLACED', ko: '위치 미확정', color: 0xb8493f, css: '#b8493f' }
  };
  function statusOf(r) { return !r.anchor ? 'unplaced' : (r.hang === false ? 'hold' : (r.certainty === 'confirmed' ? 'placed' : 'probable')); }
  // 전시 크기: 그림 비율 그대로(늘리지 않음). 큰 상자 1.6×3.4m 안에 넣되, 세로 화소가 적은 그림(58×112 등)은 그만큼 작게.
  function sizeOf(px) {
    var bh = Math.min(BOX_H, Math.max(2.0, px[1] * 0.02)), a = px[0] / px[1];
    return a > BOX_W / bh ? { w: BOX_W, h: BOX_W / a } : { w: bh * a, h: bh };
  }
  // 55장의 자리(순수 계산; Node 시험에서도 쓴다): 오른쪽 벽(+x)에 앞 절반, 왼쪽 벽(-x)에 뒤 절반. 입구(+z)에서 안쪽(-z)으로 번호 순.
  function slots(rows) {
    var half = Math.ceil(rows.length / 2), out = [], len = [0, 0];
    rows.forEach(function (r, i) {
      var side = i < half ? 1 : -1, k = side > 0 ? 0 : 1, s = sizeOf(r.px), pitch = Math.max(s.w, 1.05) + GAP;
      out.push({ row: r, status: statusOf(r), side: side, w: s.w, h: s.h, along: len[k] + pitch / 2, pitch: pitch });
      len[k] += pitch;
    });
    var L = Math.max(len[0], len[1]) + LEAD_IN + 1.0;
    out.forEach(function (o) {
      o.key = 'qa_' + o.row.dev_id;
      o.z = L - LEAD_IN - o.along;                     // 방은 z 0(안쪽 끝 벽) … L(입구 벽)
      o.x = o.side * (HW - 0.05); o.nx = -o.side; o.nz = 0;
    });
    return { list: out, L: L };
  }

  function table() { return (root.ChurchDevGlassTables || {})[SRC] || null; }

  // 성당 안과 같은 로더가 읽을 표: 모든 행을 이 방의 anchor 에 건다(가운데 맞춤, 뒤판은 납틀색)
  function registerTable() {
    var t = table(), DG = root.ChurchDevGlass;
    if (!t || !DG || !DG.register) return;
    DG.register({
      church: ID, set: t.set, pack: t.pack, packs: t.packs, qa: true, texture_matches_historical_work: false, release_approved: false,
      rows: t.rows.map(function (r) {
        return { dev_id: r.dev_id, texture: r.texture, px: r.px, anchor: 'qa_' + r.dev_id, fit: 'contain', align: 'center', rest: 'lead', certainty: r.certainty,
          placement_evidence: r.placement_evidence, texture_matches_historical_work: false, release_approved: false };
      })
    });
  }
  registerTable();

  var layout = {
    id: ID, scalePercent: 100, viewing: true,
    bounds: { x0: -HW + 0.5, x1: HW - 0.5, z0: 0.6, z1: 40 },
    spawn: { x: 0, z: 38, r: 0 },
    seatGroups: [], candles: { stands: [] },
    info: { name: 'QA Gallery · 밀라노 시안 55 (개발용)' }
  };

  function drawLabel(g, x, y, w, h, o, n) {
    var r = o.row, st = STATUS[o.status];
    g.fillStyle = '#f3ede2'; g.fillRect(x, y, w, h);
    g.fillStyle = st.css; g.fillRect(x, y, 14, h);
    g.fillStyle = '#231a12'; g.textBaseline = 'alphabetic'; g.textAlign = 'left';
    g.font = '700 34px sans-serif'; g.fillText(r.dev_id, x + 24, y + 40);
    g.font = '700 17px sans-serif';
    var tw = Math.max(60, g.measureText(st.tag).width + 16);
    g.fillStyle = st.css; g.fillRect(x + w - tw - 8, y + 12, tw, 28);
    g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.fillText(st.tag, x + w - tw / 2 - 8, y + 33);
    g.textAlign = 'left'; g.fillStyle = '#231a12';
    g.font = '600 19px sans-serif';
    g.fillText((r.v_id || '-') + '   ' + (r.anchor || 'no anchor (QA only)') + (r.hang === false ? ' (not built)' : ''), x + 24, y + 68);
    g.font = '400 16px sans-serif'; g.fillStyle = '#5a4a3a';
    g.fillText(String(r.placement_evidence || ''), x + 24, y + 91);
    g.fillText(r.px[0] + 'x' + r.px[1] + ' px   #' + n + '   ' + st.ko + (r.subject_ko ? '   ' + r.subject_ko : ''), x + 24, y + 114);
  }

  root.ChurchBuilders[ID] = {
    layout: layout,
    viewing: true,
    devOnly: true,
    slots: slots, statusOf: statusOf, sizeOf: sizeOf, STATUS: STATUS,
    build: function (ctx) {
      var T = ctx.THREE, t = table(), rows = t ? t.rows : [];
      var P = slots(rows), L = P.L, WT = 0.4;
      var STONE = 0xcfc8bd, STONE_D = 0x968f85, FLOOR = 0xb6ada1;
      layout.bounds = { x0: -HW + 0.6, x1: HW - 0.6, z0: 0.7, z1: L - 0.7 };
      layout.spawn = { x: 0, z: L - 1.6, r: 0 };
      ctx.boxAABB({ x0: -HW, x1: HW, z0: -WT, z1: L + WT, y0: -0.3, y1: 0, surf: 'stone_grey', color: FLOOR });
      ctx.boxAABB({ x0: -HW, x1: HW, z0: -WT, z1: L + WT, y0: RH, y1: RH + 0.3, surf: 'stone_grey', color: STONE });
      ctx.boxAABB({ x0: -HW - WT, x1: -HW, z0: -WT, z1: L + WT, y0: 0, y1: RH, surf: 'stone_grey', color: STONE });
      ctx.boxAABB({ x0: HW, x1: HW + WT, z0: -WT, z1: L + WT, y0: 0, y1: RH, surf: 'stone_grey', color: STONE });
      ctx.boxAABB({ x0: -HW, x1: HW, z0: -WT, z1: 0, y0: 0, y1: RH, surf: 'stone_grey', color: STONE });
      ctx.boxAABB({ x0: -HW, x1: HW, z0: L, z1: L + WT, y0: 0, y1: RH, surf: 'stone_grey', color: STONE });
      // 걸레받이 + 상태 색 바닥 띠
      [-1, 1].forEach(function (s) { ctx.boxAABB({ x0: s > 0 ? HW - 0.05 : -HW, x1: s > 0 ? HW : -HW + 0.05, z0: 0, z1: L, y0: 0, y1: 0.18, color: STONE_D }); });
      var anchors = [];
      P.list.forEach(function (o) {
        var st = STATUS[o.status], x0 = o.side > 0 ? HW - 0.5 : -HW + 0.08, x1 = o.side > 0 ? HW - 0.08 : -HW + 0.5;
        ctx.boxAABB({ x0: x0, x1: x1, z0: o.z - o.pitch / 2 + 0.08, z1: o.z + o.pitch / 2 - 0.08, y0: 0, y1: 0.025, color: st.color, vary: 0 });
        anchors.push({ key: o.key, kind: 'glass', x: o.x, y: Y0 + o.h / 2, z: o.z, nx: o.nx, nz: o.nz, yaw: Math.atan2(o.nx, o.nz),
          w: o.w, h: o.h, sill: Y0, spring: Y0 + o.h, apex: Y0 + o.h, lights: 1, photoH: 0, qa: o.row.dev_id, status: o.status });
      });
      if (ctx._) ctx._.glassAnchors = anchors;

      // 이름표: 한 장의 캔버스(8 × 7 칸)에 그려 draw call 1
      var CW = 256, CH = 128, COLS = 8, cv = document.createElement('canvas');
      cv.width = CW * COLS; cv.height = 1024;
      var g = cv.getContext('2d');
      g.clearRect(0, 0, cv.width, cv.height);
      var n = P.list.length, pos = new Float32Array((n + 1) * 12), uv = new Float32Array((n + 1) * 8), idx = [];
      function quad(i, cx, cy, cz, rx, rz, w, h, u0, v0, u1, v1) {
        var c = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
        for (var k = 0; k < 4; k++) {
          pos[i * 12 + k * 3] = cx + rx * w / 2 * c[k][0]; pos[i * 12 + k * 3 + 1] = cy + h / 2 * c[k][1]; pos[i * 12 + k * 3 + 2] = cz + rz * w / 2 * c[k][0];
          uv[i * 8 + k * 2] = c[k][0] > 0 ? u1 : u0; uv[i * 8 + k * 2 + 1] = c[k][1] > 0 ? v1 : v0;
        }
        idx.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3);
      }
      P.list.forEach(function (o, i) {
        var cx = (i % COLS) * CW, cy = Math.floor(i / COLS) * CH;
        drawLabel(g, cx + 2, cy + 2, CW - 4, CH - 4, o, i + 1);
        // 판의 가로축 = (nz, -nx): 실내에서 볼 때 왼→오(dev/devglass.js·glass_place.js 와 같은 규약 → 글자가 뒤집히지 않는다)
        quad(i, o.x + o.nx * 0.02, 0.72, o.z, o.nz, -o.nx, 1.0, 0.5, (cx + 2) / cv.width, 1 - (cy + CH - 2) / cv.height, (cx + CW - 2) / cv.width, 1 - (cy + 2) / cv.height);
      });
      // 안쪽 끝 벽의 안내판(범례)
      var ly = 7 * CH, cnt = { placed: 0, probable: 0, hold: 0, unplaced: 0 };
      P.list.forEach(function (o) { cnt[o.status]++; });
      g.fillStyle = '#2a1c12'; g.fillRect(0, ly, cv.width, 1024 - ly);
      g.fillStyle = '#ffdcc2'; g.font = '700 44px sans-serif'; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillText('QA Gallery  milan55  DEV-ONLY PLACEHOLDERS (not the real windows)', 28, ly + 52);
      g.font = '600 26px sans-serif';
      var lx = 28;
      ['placed', 'probable', 'hold', 'unplaced'].forEach(function (k) {
        var st = STATUS[k], txt = st.tag + ' ' + cnt[k] + '  ' + st.ko;
        g.fillStyle = st.css; g.fillRect(lx, ly + 72, 30, 30);
        g.fillStyle = '#ffdcc2'; g.fillText(txt, lx + 40, ly + 97);
        lx += 60 + g.measureText(txt).width + 30;
      });
      quad(n, 0, 3.0, 0.02, 1, 0, 6.0, 6.0 * (1024 - ly) / cv.width, 0, 0, 1, 1 - ly / 1024);
      var geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('uv', new T.BufferAttribute(uv, 2)); geo.setIndex(idx);
      var ltex = new T.CanvasTexture(cv);
      ltex.encoding = T.sRGBEncoding; ltex.anisotropy = 4;
      var labels = new T.Mesh(geo, new T.MeshBasicMaterial({ map: ltex, fog: false, toneMapped: false }));
      labels.name = 'qa-labels'; labels.frustumCulled = false; labels.userData.noAO = true;
      ctx.add(labels);

      // 조명: 감상실의 기준광(부드러운 반구광, 직사광·빛줄기 없음). 유리는 발광 판이라 조명과 무관하다.
      ctx.envOverride(function (env) {
        env.di = 0; env.beam = 0; env.amb = 0; env.candle = 0; env.lamp = 0; env.night = 0;
        env.hor.setHex(0x1a1612); env.fog.setHex(0x1a1612);
        env.hs.setHex(0xfff6ee); env.hg.setHex(0x8f877c); env.hi = 1.5; env.envK = 0.5; env.exp = 1.0;
      });
      ctx.setCameraBounds({ x0: -HW + 0.3, x1: HW - 0.3, z0: 0.3, z1: L - 0.3, yMax: RH - 0.3 });
      ctx.setSky({ outside: false });
    }
  };
})();
