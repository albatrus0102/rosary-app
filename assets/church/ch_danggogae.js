/* ch_danggogae.js — 당고개 순교성지(서울 용산, 2011년 봉헌) 지하 성당 + 입구 홀.
   설계: docs/church/interiors/danggogae.md §6. 치수는 사진에서 추정한 값이다(실측 아님, scalePercent 100).
   - 기둥 없는 직사각 홀(안폭 14.5m, 제대 벽~뒷벽 22m), 옅은 황토 미장 벽·얕은 곡면 천장, 나무 마루, 쪼갠 돌 제대 벽(5면).
   - 지하라 햇빛이 없다: 창은 '뒤에서 불을 밝힌 한지 빛 상자' 28판(옆벽마다 한 쌍 3무리 + 한 줄)이고 항상 같은 밝기다.
   - 권리(§4): 성지의 성화·한지 유리화·14처·조각은 생존 작가의 작품이라 복제·모사·화풍 흉내를 하지 않는다.
     창 = 무늬 없는 한지 빛 + 전통 창살, 감실·기둥·제대·독서대 = 문양 없는 일반 형태, 로비 옹기 벽 = 임의 배치(가운데 원판 없음).
   - 재질: 전용 사진 질감(D-01~D-07)이 아직 없어 절차 생성으로 만든다(아래 '재질' 한 곳). 같은 이름의 사진 묶음
     (tex_pack_danggogae.js 의 tex_dg_*.jpg)이 있으면 그것을 쓰고 생성은 건너뛴다. */
(function () {
  'use strict';

  // ---------- 치수(m) ----------
  var HW = 7.25;                 // 안폭의 반
  var ZA = -11.0;                // 제대 벽(가운데 면은 -10.8)
  var ZS = -6.4, ZSTEP = -5.8;   // 제단 앞 가장자리, 계단 앞
  var ZB = 11.0, ZBO = 11.4;     // 뒷벽 실내 면 / 로비 면
  var ZL = 15.6;                 // 로비 뒷벽
  var ZT = 22.0;                 // 로비 뒷벽 뒤 '카메라 통로' 끝(걷지 못한다)
  var WH = 4.5, RISE = 0.6;      // 옆벽 높이, 천장 오름(가운데 5.1)
  var LH = 4.2;                  // 로비 평천장
  var SY = 0.34;                 // 제단 높이
  // 한 줄 창(란셋) 중심 z: S(한 줄) + G1·G2·G3(두 줄 한 쌍). 좌우 대칭 → 14줄 × (아래 판 + 위 아치 판) = 28판
  var LANCETS = [-5.0, -2.7, -2.1, 1.9, 2.5, 6.5, 7.1];
  var WIN = { w: 0.5, sill: 0.75, h: 1.9, sill2: 2.95, h2: 0.55, rise: 0.36 };   // 위 판 꼭대기 = 2.95 + 0.55 + 0.36 = 3.86

  // (A) 레이아웃 — 순수 데이터(THREE 사용 금지)
  var layout = {
    id: 'danggogae', scalePercent: 100,
    bounds: { x0: -HW, x1: HW, z0: ZA, z1: ZL },
    spawn: { x: 0, z: 14.4, r: 0 },   // 입구 홀 가운데: 쌍여닫이문·중앙 통로·제대가 일직선
    seatGroups: [
      // 중앙 통로(2.0m) 좌우 7줄 × 6석 = 84석. 줄 간격 1.9m 는 앱 공통값(실제 13~14줄이 7줄이 된다)
      { g: 'L', rows: 7, perRow: 6, origin: { x: -1.35, z: -2.4 }, dx: -0.7, dz: 1.9, rowDx: 0, yaw: 0, pad: [0.35, 0.3] },
      { g: 'R', rows: 7, perRow: 6, origin: { x: 1.35, z: -2.4 }, dx: 0.7, dz: 1.9, rowDx: 0, yaw: 0, pad: [0.35, 0.3] }
    ],
    // 봉헌초: 입구 홀 오른쪽 끝(실제 자리는 확인하지 못해 연출). 낮은 계단식 받침에 6줄 × 8칸
    candles: { stands: [{ x: 5.9, z: 13.5, slots: 48, reach: 1.8, cols: 8, face: [-1, 0], pitch: 0.34, step: 0.2, ystep: 0.05, y0: 0.8 }] },
    // 14처: 실제처럼 제대를 바라볼 때 왼쪽 벽의 제대 쪽에서 1처(§2.2 사진 배열에서 추정)
    crossWay: { start: 'L' },
    info: { name: '당고개 순교성지', place: '서울 용산구 신계동', builtYear: 2011 }
  };
  ChurchLayouts.register(layout);

  // =====================================================================
  // 재질(절차 생성) — 사진 질감으로 바꿀 때는 이 구역만 보면 된다.
  //   이름               쓰는 곳                         사진으로 바꿀 파일(assets/church/)
  //   dg_ocher (+_n)     옆벽·뒷벽·천장 황토 미장(D-01)   tex_dg_ocher.jpg, tex_dg_ocher_n.jpg
  //   dg_stone (+_n)     제대 벽·기둥·감실 받침(D-02)     tex_dg_stone.jpg, tex_dg_stone_n.jpg
  //   dg_floor_dark(+_n) 신자석 아래·제단·로비 마루(D-03) tex_dg_floor_dark.jpg, …_n.jpg
  //   dg_floor_light(+_n) 통로 밝은 마루(D-04)            tex_dg_floor_light.jpg, …_n.jpg
  //   dg_hanji           한지 빛 창(D-05, 발광)           tex_dg_hanji.jpg
  //   dg_onggi (+_n)     로비 뒷벽 옹기 조각 벽(D-06)      tex_dg_onggi.jpg, …_n.jpg
  //   dg_granite         제대·독서대·성수대 화강암(D-07)   tex_dg_granite.jpg
  //   dg_wood            신자석 붉은 갈색 나무             tex_dg_wood.jpg
  //   → node tools/church_web/build_texpack.mjs --church danggogae 로 tex_pack_danggogae.js 를 만들면
  //     ensureTextures() 가 그 이름을 건너뛴다(코드 변경 없음). 타일 크기·광택은 SURF 표에서 고친다.
  // =====================================================================
  var SURF = {
    dg_ocher: { tile: 2.6, roughness: 0.95, normalScale: 0.5, envK: 0.9, fb: 'plaster', tint: 0xE3C48A },
    dg_stone: { tile: [2.0, 2.0], roughness: 0.92, normalScale: 1.1, envK: 0.8, fb: 'brick', tint: 0xEADFC2 },
    dg_floor_dark: { tile: [1.28, 2.56], roughness: 0.5, clearcoat: 0.3, ccRough: 0.3, normalScale: 0.35, envK: 1.0, fb: 'wood', tint: 0xb0705a },
    dg_floor_light: { tile: [1.28, 2.56], roughness: 0.55, clearcoat: 0.25, ccRough: 0.35, normalScale: 0.35, envK: 1.0, fb: 'wood', tint: 0xffd9a0 },
    dg_onggi: { tile: [2.4, 2.4], roughness: 0.8, normalScale: 0.9, envK: 0.9, fb: 'plaster', tint: 0xcfae78 },
    dg_granite: { tile: 0.9, roughness: 0.82, envK: 0.9, fb: 'plaster', tint: 0xC9A79A },
    dg_wood: { tile: [1.2, 1.2], roughness: 0.5, clearcoat: 0.5, ccRough: 0.25, normalScale: 0.3, envK: 1.0, fb: 'wood', tint: 0xd49a78 }
  };
  var TEX_NAMES = ['dg_ocher', 'dg_ocher_n', 'dg_stone', 'dg_stone_n', 'dg_floor_dark', 'dg_floor_dark_n', 'dg_floor_light', 'dg_floor_light_n',
    'dg_hanji', 'dg_onggi', 'dg_onggi_n', 'dg_granite', 'dg_wood'];

  // 캔버스 도구(이음매 없는 타일). build 안에서만 부른다.
  function texTools(rngF) {
    var doc = window.document;
    function canvas(w, h) { var c = doc.createElement('canvas'); c.width = w; c.height = h; return c; }
    // 값 노이즈(격자 cx×cy 가 가장자리에서 이어진다) 0..1
    function noise(w, h, cx, cy, rnd) {
      var g = new Float32Array(cx * cy), i, out = new Float32Array(w * h);
      for (i = 0; i < g.length; i++) g[i] = rnd();
      for (var y = 0; y < h; y++) {
        var fy = y / h * cy, y0 = fy | 0, ty = fy - y0, y1 = (y0 + 1) % cy; ty = ty * ty * (3 - 2 * ty);
        for (var x = 0; x < w; x++) {
          var fx = x / w * cx, x0 = fx | 0, tx = fx - x0, x1 = (x0 + 1) % cx; tx = tx * tx * (3 - 2 * tx);
          var a = g[y0 * cx + x0], b = g[y0 * cx + x1], c = g[y1 * cx + x0], d = g[y1 * cx + x1];
          out[y * w + x] = (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
        }
      }
      return out;
    }
    function fbm(w, h, cx, cy, oct, rnd) {
      var out = new Float32Array(w * h), amp = 1, tot = 0, i;
      for (var o = 0; o < oct; o++) { var n = noise(w, h, cx << o, cy << o, rnd); for (i = 0; i < out.length; i++) out[i] += n[i] * amp; tot += amp; amp *= 0.5; }
      for (i = 0; i < out.length; i++) out[i] /= tot;
      return out;
    }
    // fn(i, x, y, px) 가 px[0..2] 에 0..255 를 쓴다
    function paint(w, h, fn) {
      var c = canvas(w, h), g = c.getContext('2d'), im = g.createImageData(w, h), d = im.data, px = [0, 0, 0];
      for (var y = 0, i = 0; y < h; y++) for (var x = 0; x < w; x++, i++) { fn(i, x, y, px); d[i * 4] = px[0]; d[i * 4 + 1] = px[1]; d[i * 4 + 2] = px[2]; d[i * 4 + 3] = 255; }
      g.putImageData(im, 0, 0);
      return c;
    }
    function heightOf(c) {
      var w = c.width, h = c.height, d = c.getContext('2d').getImageData(0, 0, w, h).data, H = new Float32Array(w * h);
      for (var i = 0; i < H.length; i++) H[i] = d[i * 4] / 255;
      return H;
    }
    // 높이 → 탄젠트 공간 법선(초록 = 위). 캔버스 위쪽이 v 가 큰 쪽이다(flipY).
    function normalMap(H, w, h, k) {
      return paint(w, h, function (i, x, y, px) {
        var l = H[y * w + (x + w - 1) % w], r = H[y * w + (x + 1) % w], u = H[((y + h - 1) % h) * w + x], dn = H[((y + 1) % h) * w + x];
        var nx = (l - r) * k, ny = (dn - u) * k, il = 1 / Math.sqrt(nx * nx + ny * ny + 1);
        px[0] = (nx * il * 0.5 + 0.5) * 255; px[1] = (ny * il * 0.5 + 0.5) * 255; px[2] = (il * 0.5 + 0.5) * 255;
      });
    }
    // 위에서 비추는 빛을 색에 조금 구워 넣는 값(요철이 고른 실내 조명에서도 읽히게)
    function topLight(H, w, h, i, x, y) { return H[((y + 1) % h) * w + x] - H[((y + h - 1) % h) * w + x]; }
    // 가장자리를 넘는 그림을 반대편에도 그린다
    function wrapDraw(g, w, h, fn) { for (var ox = -1; ox <= 1; ox++) for (var oy = -1; oy <= 1; oy++) { g.save(); g.translate(ox * w, oy * h); fn(g); g.restore(); } }
    function cl(v) { return v < 0 ? 0 : (v > 255 ? 255 : v); }

    // D-01 황토 미장: 넓은 얼룩 + 흙손 자국 + 고운 모래알 + 짚 섬유 몇 가닥
    function ocher(seed, light, dark, S) {
      var rnd = rngF(seed), w = S, h = S, i;
      var hc = canvas(w, h), g = hc.getContext('2d');
      g.fillStyle = '#808080'; g.fillRect(0, 0, w, h);
      g.lineCap = 'round';
      for (i = 0; i < 54; i++) {
        var x = rnd() * w, y = rnd() * h, r = 50 + rnd() * 150, a0 = rnd() * 6.283, a1 = a0 + 0.4 + rnd() * 1.0;
        g.strokeStyle = (rnd() < 0.5 ? 'rgba(255,255,255,' : 'rgba(0,0,0,') + (0.05 + rnd() * 0.07) + ')';
        g.lineWidth = 8 + rnd() * 30;
        (function (x, y, r, a0, a1) { wrapDraw(g, w, h, function (q) { q.beginPath(); q.arc(x, y, r, a0, a1); q.stroke(); }); })(x, y, r, a0, a1);
      }
      var Ht = heightOf(hc), n1 = fbm(w, h, 3, 3, 4, rnd), n2 = fbm(w, h, 28, 28, 3, rnd), H = new Float32Array(w * h);
      for (i = 0; i < H.length; i++) H[i] = (Ht[i] - 0.5) * 1.5 + n1[i] * 0.45 + n2[i] * 0.25 + rnd() * 0.06;
      var col = paint(w, h, function (i, x, y, px) {
        var t = n1[i] * 1.5 - 0.25; t = t < 0 ? 0 : (t > 1 ? 1 : t);
        var k = 1 + (Ht[i] - 0.5) * 0.3 + (n2[i] - 0.5) * 0.1 + (rnd() - 0.5) * 0.045 + topLight(H, w, h, i, x, y) * 0.5;
        px[0] = cl((dark[0] + (light[0] - dark[0]) * t) * k); px[1] = cl((dark[1] + (light[1] - dark[1]) * t) * k); px[2] = cl((dark[2] + (light[2] - dark[2]) * t) * k);
      });
      var cg = col.getContext('2d');
      for (i = 0; i < 90; i++) {   // 짚 섬유
        var fx = rnd() * w, fy = rnd() * h, fa = rnd() * 6.283, fl = 5 + rnd() * 12;
        cg.strokeStyle = rnd() < 0.7 ? 'rgba(250,232,180,' + (0.25 + rnd() * 0.3) + ')' : 'rgba(110,80,40,' + (0.2 + rnd() * 0.2) + ')';
        cg.lineWidth = 0.8 + rnd() * 0.8;
        cg.beginPath(); cg.moveTo(fx, fy); cg.lineTo(fx + Math.cos(fa) * fl, fy + Math.sin(fa) * fl); cg.stroke();
      }
      return { c: col, H: H, n: function () { return normalMap(H, w, h, 2.2); } };
    }

    // D-02 쪼갠 돌 쌓기: 높이가 조금씩 다른 가로 켜 + 길이가 제각각인 거친 돌(면이 저마다 기울고 튀어나온다)
    function stone(seed, S) {
      var rnd = rngF(seed), w = S, h = S, H = new Float32Array(w * h), E = new Float32Array(w * h), TR = new Float32Array(w * h), TG = new Float32Array(w * h), TB = new Float32Array(w * h);
      var PAL = [[234, 223, 194], [224, 209, 174], [240, 232, 210], [216, 200, 164], [229, 214, 186], [208, 190, 156], [244, 238, 222]];
      var y = 0;
      while (y < h) {
        var ch = 19 + ((rnd() * 15) | 0);
        if (h - y - ch < 17) ch = h - y;
        var off = (rnd() * 90) | 0, xs = off;
        while (xs < off + w) {
          var len = 34 + ((rnd() * 100) | 0);
          if (off + w - xs - len < 30) len = off + w - xs;
          var pc = PAL[(rnd() * PAL.length) | 0], tk = 0.9 + rnd() * 0.17, p = 0.4 + rnd() * 0.6, tx = (rnd() - 0.5) * 0.7, ty = (rnd() - 0.5) * 0.6;
          for (var py = y; py < y + ch; py++) for (var qx = xs; qx < xs + len; qx++) {
            var i = py * w + (qx % w), ed = Math.min(qx - xs, xs + len - 1 - qx, py - y, y + ch - 1 - py), e = Math.min(1, (ed + 0.6) / 2.6);
            e = e * e * (3 - 2 * e);
            E[i] = e; H[i] = (p + tx * ((qx - xs) / len - 0.5) + ty * ((py - y) / ch - 0.5)) * e;
            TR[i] = pc[0] * tk; TG[i] = pc[1] * tk; TB[i] = pc[2] * tk;
          }
          xs += len;
        }
        y += ch;
      }
      var n1 = fbm(w, h, 48, 48, 3, rnd), n2 = fbm(w, h, 10, 10, 2, rnd), i2;
      for (i2 = 0; i2 < H.length; i2++) H[i2] += (n1[i2] - 0.5) * 0.5 * E[i2] + (n2[i2] - 0.5) * 0.25 * E[i2];
      var col = paint(w, h, function (i, x, yy, px) {
        var e = E[i], k = (0.86 + 0.26 * n1[i]) * (0.74 + 0.26 * e) * (1 + topLight(H, w, h, i, x, yy) * 1.1);
        if (k < 0.55) k = 0.55; if (k > 1.22) k = 1.22;
        px[0] = cl(TR[i] * k); px[1] = cl(TG[i] * k * (0.985 + 0.015 * e)); px[2] = cl(TB[i] * k * (0.95 + 0.05 * e));
      });
      return { c: col, n: function () { return normalMap(H, w, h, 5.0); } };
    }

    // D-03/D-04 마루: 좁은 널 n 줄(결은 v 방향), 널마다 색·결이 조금 다르고 끝 이음이 엇갈린다
    function planks(seed, S, n, base, dark, o) {
      o = o || {};
      var tv = o.tone === undefined ? 0.16 : o.tone, gaps = o.gaps !== false;
      var rnd = rngF(seed), w = S, h = S, pw = w / n, H = new Float32Array(w * h);
      var g1 = noise(w, h, 96, 3, rnd), g2 = noise(w, h, 200, 10, rnd), g3 = fbm(w, h, 6, 6, 2, rnd);
      var tone = [], joint = [], shift = [];
      for (var p = 0; p < n; p++) {
        var j0 = (rnd() * h) | 0, j1 = (j0 + h * (0.35 + rnd() * 0.3)) % h | 0;
        joint.push([Math.min(j0, j1), Math.max(j0, j1)]);
        tone.push([1 - tv / 2 + rnd() * tv, 1 - tv / 2 + rnd() * tv, (rnd() - 0.5) * tv * 0.3, (rnd() - 0.5) * tv * 0.3]);
        shift.push(((rnd() * w) | 0));
      }
      var col = paint(w, h, function (i, x, y, px) {
        var p = Math.min(n - 1, (x / pw) | 0), xl = x - p * pw, ed = Math.min(xl, pw - 1 - xl), J = joint[p];
        var seg = (y >= J[0] && y < J[1]) ? 0 : 1, jd = Math.min(Math.abs(y - J[0]), Math.abs(y - J[1]));
        var gi = y * w + ((x + shift[p] + seg * 131) % w);
        var gr = g1[gi] * 0.6 + g2[gi] * 0.4;
        var t = tone[p][seg] * (0.92 + 0.16 * gr) * (0.97 + 0.06 * g3[i]), warm = tone[p][2 + seg];
        var gap = ed < 0.9 ? 0.62 : (ed < 1.9 ? 0.86 : 1); if (jd < 1) gap = Math.min(gap, 0.66);
        if (!gaps) { gap = 1; ed = 9; jd = 9; }
        H[i] = Math.min(1, ed / 2.2) * (jd < 1 ? 0.3 : 1) * 0.7 + gr * 0.16;
        var m = gr * gr;
        px[0] = cl((dark[0] + (base[0] - dark[0]) * (0.45 + 0.55 * m)) * t * gap * (1 + warm));
        px[1] = cl((dark[1] + (base[1] - dark[1]) * (0.45 + 0.55 * m)) * t * gap);
        px[2] = cl((dark[2] + (base[2] - dark[2]) * (0.45 + 0.55 * m)) * t * gap * (1 - warm));
      });
      return { c: col, n: function () { return normalMap(H, w, h, 2.6); } };
    }
    function rot90(c) { var o = canvas(c.height, c.width), g = o.getContext('2d'); g.translate(o.width / 2, o.height / 2); g.rotate(Math.PI / 2); g.drawImage(c, -c.width / 2, -c.height / 2); return o; }

    // D-07 분홍빛 화강암: 회색·흰색·분홍 알갱이
    function granite(seed, S) {
      var rnd = rngF(seed), n1 = fbm(S, S, 5, 5, 3, rnd);
      var col = paint(S, S, function (i, x, y, px) {
        var r = rnd(), k = 0.93 + 0.14 * n1[i], c = [201, 167, 154];
        if (r < 0.09) c = [118, 104, 102]; else if (r < 0.2) c = [238, 228, 222]; else if (r < 0.36) c = [214, 158, 144]; else if (r < 0.46) c = [168, 150, 146];
        k *= 0.94 + rnd() * 0.12;
        px[0] = cl(c[0] * k); px[1] = cl(c[1] * k); px[2] = cl(c[2] * k);
      });
      var g = col.getContext('2d');
      for (var i = 0; i < 520; i++) {
        var q = rnd();
        g.fillStyle = q < 0.3 ? 'rgba(96,84,84,0.55)' : (q < 0.6 ? 'rgba(244,236,230,0.6)' : 'rgba(216,150,138,0.5)');
        g.fillRect(rnd() * S, rnd() * S, 1.5 + rnd() * 2, 1.5 + rnd() * 2);
      }
      return { c: col };
    }

    // D-06 옹기 조각을 박은 황토벽: 깨진 옹기 조각(모난 다각형)을 촘촘히 박고 사이는 황토 줄눈. 가운데 문양 없음.
    // 보로노이 칸을 조각으로 쓴다(칸 경계에서 일정 거리 안쪽만 조각) → 곧은 변의 깨진 조각처럼 보인다
    function onggi(seed, S) {
      var rnd = rngF(seed), w = S, h = S, base = ocher(seed + 1, [222, 190, 134], [196, 160, 106], S);
      var N = 120, sx = [], sy = [], tone = [], skip = [], gx = [], gy = [], i;
      for (i = 0; i < N; i++) {
        sx.push(rnd() * w); sy.push(rnd() * h);
        var q = rnd(), c = q < 0.5 ? [52, 42, 36] : (q < 0.78 ? [82, 54, 38] : (q < 0.92 ? [34, 30, 30] : [112, 74, 48])), k = 0.8 + rnd() * 0.5;
        tone.push([c[0] * k, c[1] * k, c[2] * k]); skip.push(rnd() < 0.16);
        var a = rnd() * 6.283; gx.push(Math.cos(a)); gy.push(Math.sin(a));
      }
      var H = new Float32Array(w * h), ID = new Int16Array(w * h), ED = new Float32Array(w * h);
      for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
        var d1 = 1e9, d2 = 1e9, b = 0;
        for (i = 0; i < N; i++) {
          var dx = Math.abs(sx[i] - x), dy = Math.abs(sy[i] - y); if (dx > w / 2) dx = w - dx; if (dy > h / 2) dy = h - dy;
          var d = dx * dx + dy * dy;
          if (d < d1) { d2 = d1; d1 = d; b = i; } else if (d < d2) d2 = d;
        }
        var e = (Math.sqrt(d2) - Math.sqrt(d1)) * 0.5 - 2.6;   // 줄눈 반폭(px)만큼 안쪽이면 조각
        var p = y * w + x;
        ID[p] = (e > 0 && !skip[b]) ? b : -1; ED[p] = e;
        H[p] = ID[p] >= 0 ? 0.55 + Math.min(1, e / 2.5) * 0.45 : base.H[p] * 0.25;
      }
      var n2 = fbm(w, h, 40, 40, 2, rnd), bd = base.c.getContext('2d').getImageData(0, 0, w, h).data;
      var col = paint(w, h, function (p, x, y, px) {
        var id = ID[p];
        if (id < 0) { var sh = ED[p] > -1.5 && ED[p] <= 0 ? 0.8 : 1; px[0] = bd[p * 4] * sh; px[1] = bd[p * 4 + 1] * sh; px[2] = bd[p * 4 + 2] * sh; return; }
        var dx = x - sx[id], dy = y - sy[id]; if (dx > w / 2) dx -= w; if (dx < -w / 2) dx += w; if (dy > h / 2) dy -= h; if (dy < -h / 2) dy += h;
        var gl = (dx * gx[id] + dy * gy[id]) / 34, t = tone[id];
        var k = (0.86 + 0.28 * n2[p]) * (1 + 0.28 * gl) * (0.8 + 0.2 * Math.min(1, ED[p] / 2)) * (1 + topLight(H, w, h, p, x, y) * 0.9);
        var hl = Math.max(0, 1 - Math.abs(gl - 0.45) * 5) * 34;   // 유약의 반짝임 한 줄
        px[0] = cl(t[0] * k + hl); px[1] = cl(t[1] * k + hl * 0.92); px[2] = cl(t[2] * k + hl * 0.8);
      });
      return { c: col, n: function () { return normalMap(H, w, h, 3.0); } };
    }

    // D-05 불 켜진 한지: 얼룩진 반투명 + 닥 섬유. 무늬·그림 없음(색은 창 판의 정점색이 정한다)
    function hanji(seed, S) {
      var rnd = rngF(seed), n1 = fbm(S, S, 4, 4, 4, rnd), n2 = fbm(S, S, 36, 36, 2, rnd);
      var col = paint(S, S, function (i, x, y, px) {
        var v = 0.8 + 0.17 * n1[i] + 0.07 * n2[i] + (rnd() - 0.5) * 0.02;
        px[0] = cl(255 * v); px[1] = cl(244 * v); px[2] = cl(216 * v);
      });
      var g = col.getContext('2d');
      g.lineCap = 'round';
      for (var i = 0; i < 520; i++) {
        var x = rnd() * S, y = rnd() * S, a = rnd() * 6.283, l = 12 + rnd() * 60, bend = (rnd() - 0.5) * l * 0.5, q = rnd();
        g.strokeStyle = q < 0.68 ? 'rgba(255,252,240,' + (0.18 + rnd() * 0.25) + ')' : 'rgba(150,104,48,' + (0.1 + rnd() * 0.14) + ')';
        g.lineWidth = 0.6 + rnd() * 1.1;
        (function (x, y, a, l, bend) {
          wrapDraw(g, S, S, function (c) {
            c.beginPath(); c.moveTo(x, y);
            c.quadraticCurveTo(x + Math.cos(a) * l * 0.5 - Math.sin(a) * bend, y + Math.sin(a) * l * 0.5 + Math.cos(a) * bend, x + Math.cos(a) * l, y + Math.sin(a) * l);
            c.stroke();
          });
        })(x, y, a, l, bend);
      }
      for (i = 0; i < 260; i++) { g.fillStyle = 'rgba(120,80,30,' + (0.12 + rnd() * 0.2) + ')'; g.fillRect(rnd() * S, rnd() * S, 1 + rnd(), 1 + rnd()); }
      return { c: col };
    }
    return { ocher: ocher, stone: stone, planks: planks, rot90: rot90, granite: granite, onggi: onggi, hanji: hanji };
  }

  // 사진 묶음(window.ChurchTexPack)에 없는 이름만 절차 생성해 data URI 로 넣는다(한 번만). ChurchPhotos 가 사진처럼 읽는다.
  // 시험용 가짜 캔버스(Node)에서는 아무것도 하지 않는다 → 표면은 kit 의 대체 질감 + 색조(SURF.tint)로 지어진다.
  function ensureTextures(ctx) {
    var P = window.ChurchTexPack = window.ChurchTexPack || {};
    function miss(n) { return !P['tex_' + n + '.jpg']; }
    if (!TEX_NAMES.some(miss)) return;
    var probe = window.document.createElement('canvas');
    if (!probe.toDataURL || !probe.toDataURL()) return;
    var M = texTools(ctx.rng), S = 512;
    function put(n, mk, q) { if (miss(n)) { try { P['tex_' + n + '.jpg'] = mk().toDataURL('image/jpeg', q || 0.9); } catch (e) { /* 대체 질감으로 남는다 */ } } }
    function pair(n, gen) { if (miss(n) || miss(n + '_n')) { var r = gen(); put(n, function () { return r.c; }); put(n + '_n', r.n, 0.92); } }
    pair('dg_ocher', function () { return M.ocher(11, [238, 214, 168], [218, 188, 138], S); });
    pair('dg_stone', function () { return M.stone(23, S); });
    pair('dg_floor_dark', function () { return M.planks(31, S, 16, [134, 82, 56], [96, 58, 40], { tone: 0.14 }); });
    pair('dg_floor_light', function () { return M.planks(37, S, 16, [216, 180, 124], [184, 146, 94], { tone: 0.1 }); });
    pair('dg_onggi', function () { return M.onggi(41, S); });
    put('dg_hanji', function () { return M.hanji(53, 256).c; });
    put('dg_granite', function () { return M.granite(61, 256).c; });
    put('dg_wood', function () { return M.rot90(M.planks(67, 256, 2, [190, 112, 70], [152, 84, 52], { tone: 0.05, gaps: false }).c); });
  }
  function defineSurfaces(ctx) {
    Object.keys(SURF).forEach(function (k) {
      var d = SURF[k], has = ctx.hasPhoto(k);
      ctx.defineSurface(k, { photo: k, tile: d.tile, roughness: d.roughness, clearcoat: d.clearcoat, ccRough: d.ccRough, normalScale: d.normalScale, envK: d.envK, fb: d.fb, color: has ? 0xffffff : d.tint });
    });
  }

  // (B) 빌더
  ChurchBuilders['danggogae'] = {
    layout: layout,
    lancets: LANCETS, win: WIN,   // 시험이 14처 판과 창 자리를 견줄 때 쓴다
    thumb: { x: 0, z: 9.4, yaw: 0, pitch: 9, zoom: 0.9, hour: 11 },
    build: function (ctx) {
      var T = ctx.THREE, KIT = ChurchKit, G = ChurchGeo, Geo = G.Geo, PI = Math.PI, low = ctx.quality === 'low';
      var min = Math.min, max = Math.max, cos = Math.cos, sin = Math.sin, sqrt = Math.sqrt;
      ensureTextures(ctx);
      defineSurfaces(ctx);
      var ocher = ctx.surfBatch('dg_ocher'), stone = ctx.surfBatch('dg_stone'), fdark = ctx.surfBatch('dg_floor_dark'), flight = ctx.surfBatch('dg_floor_light');
      var granite = ctx.surfBatch('dg_granite'), wood = ctx.woodB, glow = ctx.glow, solid = ctx.solid;
      var C = {
        frame: 0x4f3220, lattice: 0x5f3f27, base: 0x4a2e1c, door: 0x94683f, doorD: 0x7a5232, chair: 0xc79a62, onggi: 0x2b2420, bronze: 0x6b5a32,
        lamp: new T.Color(0xffd9a0), amber: new T.Color(0xffc266)
      };
      var vf = KIT.profileFn('segmental', HW, RISE);
      function vy(x) { return WH + vf(x); }   // 천장 높이
      function hdr(c, k) { return (c.isColor ? c : new T.Color(c)).clone().multiplyScalar(k); }

      // ---------- 바닥 ----------
      function flr(b, x0, x1, z0, z1, y, c) { b.addQuad([x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], c === undefined ? 0xffffff : c, [(x0 + x1) / 2, y + 5, (z0 + z1) / 2], { vary: 0 }); }
      var PX0 = 0.92, PX1 = 5.24, PZ0 = -5.25, PZ1 = 9.62;     // 신자석 아래 짙은 마루
      flr(flight, -PX0, PX0, ZSTEP, ZB, 0);                      // 중앙 통로
      [-1, 1].forEach(function (s) {
        var a = s < 0 ? -HW : PX1, b = s < 0 ? -PX1 : HW;
        flr(flight, a, b, ZSTEP, ZB, 0);                         // 옆 통로
        flr(flight, s < 0 ? -HW : 5.7, s < 0 ? -5.7 : HW, -6.9, ZSTEP, 0);   // 계단 옆(기둥 앞)
        var c = s < 0 ? -PX1 : PX0, d = s < 0 ? -PX0 : PX1;
        flr(flight, c, d, ZSTEP, PZ0, 0); flr(flight, c, d, PZ1, ZB, 0);     // 앞·뒤 통로
        flr(fdark, c, d, PZ0, PZ1, 0);
      });
      flr(fdark, -HW, HW, ZB, ZBO, 0, 0xd8c8c0);                 // 뒷벽 아래(문턱)
      flr(fdark, -HW, HW, ZBO, ZT, 0);                           // 입구 홀(+ 카메라 통로)
      flr(fdark, -6.35, 6.35, ZA, ZS, SY);                       // 제단
      ctx.floorZone({ x0: -6.35, x1: 6.35, z0: ZA, z1: ZS, y: SY });
      [-1, 1].forEach(function (s) { fdark.addQuad([s * 5.7, 0, ZS], [s * 6.35, 0, ZS], [s * 6.35, SY, ZS], [s * 5.7, SY, ZS], 0xd0c0b8, [s * 6, 0.2, 0], { vary: 0 }); });
      ctx.steps({ x0: -5.7, x1: 5.7, z0: ZS, z1: ZSTEP, y0: 0, y1: SY, n: 2, dir: [0, -1], surf: 'dg_floor_dark', color: 0xf4e8e0 });
      ctx.aoDecal({ x0: -5.7, x1: 5.7, z0: ZSTEP - 0.02, z1: ZSTEP + 0.02, y: 0, pad: 0.22 });

      // ---------- 벽 ----------
      var OC = 'dg_ocher';
      // 뒷벽(성당과 입구 홀 사이)은 따로 묶는다(rearO·rearW): 카메라와 아바타가 이 벽의 서로 반대편에 있으면 숨겨서
      // 벽 너머 시점(입구 홀의 카메라 → 성당 안의 아바타, 또는 그 반대)에서 아바타가 벽에 가리지 않게 한다(맨 아래 onUpdate).
      var rearO = new G.Batch(213), rearW = new G.Batch(214);
      rearO.enableUV(SURF.dg_ocher.tile, SURF.dg_ocher.tile);
      function rbox(b, x0, x1, y0, y1, z0, z1, col) { b.add(Geo.box(), col, { x: (x0 + x1) / 2, y: y0, z: (z0 + z1) / 2, sx: x1 - x0, sy: y1 - y0, sz: z1 - z0, flat: true, vary: 0.03 }); }
      [-1, 1].forEach(function (s) {
        var x = s * (HW + 0.2);
        ctx.wall({ x0: x, z0: -6.9, x1: x, z1: ZBO, h: WH, t: 0.4, surf: OC, collide: false, plinth: false });
        // 입구 홀: 한쪽(왼쪽)은 흰 돌 느낌 벽, 한쪽은 황토 벽(§2.1 사진). 로비 뒷벽 뒤로 같은 마감을 이어 카메라 통로를 만든다
        ctx.wall({ x0: x, z0: ZBO, x1: x, z1: ZT, h: LH, t: 0.4, surf: s < 0 ? 'dg_stone' : OC, collide: false, plinth: false, crown: s > 0 });
        // 기둥 뒤 모서리(옆벽과 제대 벽 사이)
        ctx.wall({ x0: s * 6.15, z0: -7.1, x1: s * (HW + 0.4), z1: -7.1, h: 5.3, t: 0.4, surf: OC, collide: false, plinth: false, crown: false });
        ctx.addCollider({ x0: s < 0 ? -HW : 6.35, x1: s < 0 ? -6.35 : HW, z0: ZA, z1: ZS });
        // 걸레받이(짙은 나무)
        ctx.boxAABB({ x0: s < 0 ? -HW : HW - 0.025, x1: s < 0 ? -HW + 0.025 : HW, z0: -6.9, z1: ZB, y0: 0, y1: 0.12, color: C.base, mat: 'wood' });
        ctx.boxAABB({ x0: s < 0 ? -HW : HW - 0.025, x1: s < 0 ? -HW + 0.025 : HW, z0: ZBO, z1: ZL, y0: 0, y1: 0.12, color: C.base, mat: 'wood' });
        // 뒷벽(문 구멍 2.0m 양옆). 천장 곡면 위까지 올려 박공을 따로 채우지 않는다
        var wx0 = s < 0 ? -HW : 1.0, wx1 = s < 0 ? -1.0 : HW;
        rbox(rearO, wx0, wx1, 0, 5.3, ZB, ZBO, 0xffffff);
        ctx.addCollider({ x0: wx0, x1: wx1, z0: ZB, z1: ZBO });
        rbox(rearW, s < 0 ? -HW : 1.06, s < 0 ? -1.06 : HW, 0, 0.12, ZB - 0.025, ZB, C.base);
        rbox(rearW, s < 0 ? -HW : 1.06, s < 0 ? -1.06 : HW, 0, 0.12, ZBO, ZBO + 0.025, C.base);
      });
      rbox(rearO, -1.0, 1.0, 2.4, 5.3, ZB, ZBO, 0xffffff);
      // 입구 홀 뒷벽: 황토에 옹기 조각을 박은 벽. 실제로는 전시관 입구 벽의 마감을 옮겨 온 연출이다(§6.5).
      // 실내를 보는 한 면만 짓는다 → 카메라가 벽 뒤(카메라 통로)로 물러나면 벽이 비쳐 입구 홀과 성당 문이 보인다
      ctx.surfBatch('dg_onggi').addQuad([-HW, 0, ZL], [HW, 0, ZL], [HW, LH, ZL], [-HW, LH, ZL], 0xffffff, [0, 2, 0], { vary: 0 });
      wood.addQuad([-HW, 0, ZL - 0.02], [HW, 0, ZL - 0.02], [HW, 0.14, ZL - 0.02], [-HW, 0.14, ZL - 0.02], C.base, [0, 0.1, 0], { vary: 0 });
      ocher.addQuad([-HW, LH - 0.16, ZL - 0.03], [HW, LH - 0.16, ZL - 0.03], [HW, LH, ZL - 0.03], [-HW, LH, ZL - 0.03], 0xe6dccb, [0, 4, 0], { vary: 0 });
      // 입구 홀 평천장(+ 카메라 통로)
      ocher.addQuad([-HW, LH, ZBO], [HW, LH, ZBO], [HW, LH, ZT], [-HW, LH, ZT], 0xffffff, [0, 0, 13.5], { vary: 0 });

      // 제대 벽: 흰(크림색) 쪼갠 돌을 켜켜이 쌓은 5면 오목 벽. 위에서 내려오는 간접 조명은 정점색 + 빛 번짐으로 흉내 낸다
      var AV = [[-6.35, -6.9], [-4.7, -9.5], [-1.7, -10.8], [1.7, -10.8], [4.7, -9.5], [6.35, -6.9]];
      var YB = [0, 1.3, 2.6, 3.7, 4.5, 5.3], KB = [0.92, 0.95, 1.0, 1.08, 1.2, 1.2];
      var stTile = SURF.dg_stone.tile, cum = 0;
      var kcol = KB.map(function (k) { return new T.Color(k, k, k); });
      for (var ai = 0; ai < 5; ai++) {
        var a = AV[ai], b = AV[ai + 1], adx = b[0] - a[0], adz = b[1] - a[1], aL = sqrt(adx * adx + adz * adz), anx = -adz / aL, anz = adx / aL;
        var hint = [(a[0] + b[0]) / 2 + anx * 5, 2, (a[1] + b[1]) / 2 + anz * 5], ua = cum / stTile[0], ub = (cum + aL) / stTile[0];
        for (var bj = 0; bj < YB.length - 1; bj++) {
          var y0 = YB[bj], y1 = YB[bj + 1], va = y0 / stTile[1], vb = y1 / stTile[1];
          stone.addTris([a[0], y0, a[1], b[0], y0, b[1], b[0], y1, b[1], a[0], y0, a[1], b[0], y1, b[1], a[0], y1, a[1]],
            [kcol[bj], kcol[bj], kcol[bj + 1], kcol[bj], kcol[bj + 1], kcol[bj + 1]], hint, { uvs: [ua, va, ub, va, ub, vb, ua, va, ub, vb, ua, vb] });
        }
        // 벽 머리의 간접등 띠(천장 곡면을 따라)
        for (var q = 0; q < 4; q++) {
          var t0 = q / 4, t1 = (q + 1) / 4, xa = a[0] + adx * t0, za = a[1] + adz * t0, xb = a[0] + adx * t1, zb = a[1] + adz * t1, ox = anx * 0.03, oz = anz * 0.03;
          glow.addQuad([xa + ox, vy(xa) - 0.1, za + oz], [xb + ox, vy(xb) - 0.1, zb + oz], [xb + ox, vy(xb) - 0.03, zb + oz], [xa + ox, vy(xa) - 0.03, za + oz], hdr(C.lamp, 1.9), hint, { vary: 0 });
        }
        cum += aL;
      }
      function apseZ(x) { for (var i = 0; i < 5; i++) if (x >= AV[i][0] - 1e-9 && x <= AV[i + 1][0] + 1e-9) return AV[i][1] + (AV[i + 1][1] - AV[i][1]) * (x - AV[i][0]) / (AV[i + 1][0] - AV[i][0]); return ZA; }
      // 충돌체: 사선 면을 0.4m 간격으로 자른 계단형 상자(§6.9)
      ctx.addCollider({ x0: -1.7, x1: 1.7, z0: ZA - 0.4, z1: -10.8 });
      [-1, 1].forEach(function (s) {
        for (var x = 1.7; x < 6.35 - 1e-6; x += 0.4) {
          var xe = min(6.35, x + 0.4), zf = max(apseZ(s * x), apseZ(s * xe));
          ctx.addCollider({ x0: s < 0 ? -xe : x, x1: s < 0 ? -x : xe, z0: ZA - 0.4, z1: zf });
        }
      });

      // ---------- 천장: 얕은 곡면(황토 미장) + 가운데 빛 띠 + 매입등 ----------
      ctx.vault({ type: 'barrel', profile: 'segmental', axis: 'z', x0: -HW, x1: HW, z0: ZA, z1: ZBO, y: WH, rise: RISE, surf: OC, color: 0xffffff, seg: low ? 12 : 20 });
      // 빛 띠: 앞뒤로 긴 틀 안에 가로 널이 계단처럼 겹치고, 널 사이로 그 위의 간접등(한지 빛 판)이 보인다
      var BX = 1.6, BZ0 = -5.6, BZ1 = 9.7, slats = low ? 9 : 18, BSTEP = (BZ1 - BZ0) / (slats - 1), bandY = vy(BX) - 0.22, BE = 0.5;
      [-1, 1].forEach(function (s) { ctx.boxAABB({ x0: s < 0 ? -BX - 0.09 : BX, x1: s < 0 ? -BX : BX + 0.09, z0: BZ0 - BE - 0.09, z1: BZ1 + BE + 0.09, y0: bandY, y1: vy(BX) + 0.02, surf: OC, color: 0xe2d2ba }); });
      [BZ0 - BE - 0.045, BZ1 + BE + 0.045].forEach(function (z) { ctx.boxAABB({ x0: -BX, x1: BX, z0: z - 0.045, z1: z + 0.045, y0: bandY, y1: vy(0) + 0.02, surf: OC, color: 0xe2d2ba }); });
      var SLD = min(0.6, BSTEP * 0.66), SLT = -0.17;   // 널 깊이, 기울기(입구 쪽 끝이 위)
      for (var si = 0; si < slats; si++) ocher.add(Geo.box(), 0xe9dcc6, { x: 0, y: bandY + 0.03, z: BZ0 + BSTEP * si, rx: SLT, sx: BX * 2, sy: 0.04, sz: SLD, flat: true, vary: 0.02 });
      // 매입등(좌우 2줄 × 6): 작은 원판(발광) — 점광원이 아니다
      var DLX = [3.3, 5.7], DLZ = [-4.4, -1.8, 0.8, 3.4, 6.0, 8.6], downs = [];
      [-1, 1].forEach(function (s) { DLX.forEach(function (x) { DLZ.forEach(function (z) { downs.push([s * x, vy(x) - 0.012, z]); }); }); });
      [[-4.6, 12.6], [0, 12.6], [4.6, 12.6], [-4.6, 14.6], [0, 14.6], [4.6, 14.6]].forEach(function (p) { downs.push([p[0], LH - 0.012, p[1]]); });
      downs.forEach(function (p) {
        glow.add(Geo.cyl(low ? 8 : 12, 1), hdr(0xfff0d2, 2.4), { x: p[0], y: p[1] - 0.012, z: p[2], sx: 0.075, sy: 0.012, sz: 0.075, flat: true, vary: 0 });
        ocher.add(Geo.cyl(low ? 8 : 12, 1), 0xf4ead8, { x: p[0], y: p[1] - 0.006, z: p[2], sx: 0.11, sy: 0.012, sz: 0.11, flat: true, vary: 0 });
      });

      // ---------- 창: 한지 빛 상자 28판 ----------
      // 자리 등록은 ctx.window(painted, 벽을 뚫지 않음): 14처 유도가 창으로 알고 피한다. 키트 유리(시간대에 따라 밝기가 바뀜)는
      // 벽 앞 4cm 에 생기므로 그 앞 5.5cm 에 항상 같은 밝기의 한지 판을, 다시 그 앞에 나무 창살·틀을 짓는다(같은 평면 금지).
      var hanji = new G.Batch(211); hanji.enableUV(0.9, 0.9);
      var HK = 2.3, cIn = hdr(0xffd27a, HK), cEd = hdr(0xf0a23c, HK * 0.72);
      // 천장 빛 띠의 간접등 면(널 위): 가운데가 밝고 가장자리로 갈수록 짙다
      (function () {
        var y = vy(BX) - 0.035, xs = [-BX, -BX * 0.55, BX * 0.55, BX], ks = [0.5, 0.82, 0.82, 0.5], n = low ? 4 : 8, c0 = hdr(0xffe2a6, 1.5);
        for (var j = 0; j < n; j++) for (var i = 0; i < 3; i++) {
          var z0 = BZ0 - BE + (BZ1 - BZ0 + BE * 2) * j / n, z1 = BZ0 - BE + (BZ1 - BZ0 + BE * 2) * (j + 1) / n, ca = c0.clone().multiplyScalar(ks[i]), cb = c0.clone().multiplyScalar(ks[i + 1]);
          hanji.addTris([xs[i], y, z0, xs[i + 1], y, z0, xs[i + 1], y, z1, xs[i], y, z0, xs[i + 1], y, z1, xs[i], y, z1], [ca, cb, cb, ca, cb, ca], [0, 0, (z0 + z1) / 2]);
        }
      })();
      var pfW = KIT.profileFn('pointed', WIN.w / 2, WIN.rise), archPts = KIT.profilePts('pointed', WIN.w / 2, WIN.rise, low ? 6 : 8);
      var DP = 0.055, DL0 = 0.058, DL1 = 0.076, DF = 0.092, hw = WIN.w / 2, FT = 0.045, LT = 0.016;
      function lancet(s, zc, seed) {
        var xw = s * HW, face = [-s, 0];
        ctx.window({ x: xw, z: zc, y: WIN.sill, face: face, w: WIN.w, h: WIN.h, top: 'flat', pattern: 'solid', colors: [0xf2b84a], frame: false, beam: false, painted: true, seed: seed });
        ctx.window({ x: xw, z: zc, y: WIN.sill2, face: face, w: WIN.w, h: WIN.h2, top: 'pointed', pattern: 'solid', colors: [0xf2b84a], frame: false, beam: false, painted: true, seed: seed + 50 });
        function P(u, y, d) { return [xw - s * d, y, zc + u]; }
        var hintP = [xw - s * 5, 2, zc];
        function bar(u0, u1, y0, y1, d0, d1, col) { ctx.boxAABB({ x0: min(xw - s * d0, xw - s * d1), x1: max(xw - s * d0, xw - s * d1), z0: zc + min(u0, u1), z1: zc + max(u0, u1), y0: y0, y1: y1, color: col, mat: 'wood', vary: 0.03 }); }
        // 아래 판(직사각)
        var us = [-hw, -hw + 0.11, hw - 0.11, hw], vs = [0, 0.15, WIN.h - 0.15, WIN.h], i, j;
        for (j = 0; j < 3; j++) for (i = 0; i < 3; i++) {
          var cs = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]].map(function (q) { return (q[0] === 0 || q[0] === 3 || q[1] === 0 || q[1] === 3) ? cEd : cIn; });
          var pa = P(us[i], WIN.sill + vs[j], DP), pb = P(us[i + 1], WIN.sill + vs[j], DP), pc = P(us[i + 1], WIN.sill + vs[j + 1], DP), pd = P(us[i], WIN.sill + vs[j + 1], DP);
          hanji.addTris([].concat(pa, pb, pc, pa, pc, pd), [cs[0], cs[1], cs[2], cs[0], cs[2], cs[3]], hintP);
        }
        // 위 판(뾰족 아치): 가운데에서 부채꼴
        var y2 = WIN.sill2, poly = [[-hw, 0], [hw, 0], [hw, WIN.h2]];
        for (i = archPts.length - 2; i >= 1; i--) poly.push([archPts[i][0], WIN.h2 + archPts[i][1]]);
        poly.push([-hw, WIN.h2]);
        var cen = P(0, y2 + WIN.h2 * 0.75, DP);
        for (i = 0; i < poly.length; i++) {
          var q0 = poly[i], q1 = poly[(i + 1) % poly.length];
          hanji.addTris([].concat(cen, P(q0[0], y2 + q0[1], DP), P(q1[0], y2 + q1[1], DP)), [cIn, cEd, cEd], hintP);
        }
        // 틀(짙은 나무): 벽 면에서 9cm 나와 한지 판 가장자리를 가린다
        var ya = WIN.sill, yb = WIN.sill + WIN.h;
        bar(-hw - FT, -hw, ya - FT, yb + FT, 0, DF, C.frame); bar(hw, hw + FT, ya - FT, yb + FT, 0, DF, C.frame);
        bar(-hw, hw, ya - FT, ya, 0, DF, C.frame); bar(-hw, hw, yb, yb + FT, 0, DF, C.frame);
        bar(-hw - 0.08, hw + 0.08, ya - FT - 0.04, ya - FT, 0, 0.13, C.frame);                  // 창턱
        bar(-hw - FT, -hw, y2 - FT, y2 + WIN.h2, 0, DF, C.frame); bar(hw, hw + FT, y2 - FT, y2 + WIN.h2, 0, DF, C.frame);
        bar(-hw, hw, y2 - FT, y2, 0, DF, C.frame);
        for (i = 0; i < archPts.length - 1; i++) {
          var p0 = archPts[i], p1 = archPts[i + 1], du = p1[0] - p0[0], dv = p1[1] - p0[1], l = sqrt(du * du + dv * dv), ou = -dv / l * FT / 2, ov = du / l * FT / 2;
          wood.addBeam(P(p0[0] + ou, y2 + WIN.h2 + p0[1] + ov, DF / 2), P(p1[0] + ou, y2 + WIN.h2 + p1[1] + ov, DF / 2), FT, DF, C.frame, { vary: 0.03, overlap: 1.12 });
        }
        // 창살(전통 격자): 아래 판은 가장자리 띠만 두르고 가운데는 비운다. 아래 0.3m 에 가로 살 3줄(무늬 없음)
        var iu = hw - 0.08, v0 = 0.38, v1 = WIN.h - 0.08, h2 = LT / 2;
        [0.1, 0.2, 0.3].forEach(function (v) { bar(-hw, hw, ya + v - h2, ya + v + h2, DL0, DL1, C.lattice); });
        bar(-iu - h2, -iu + h2, ya + v0, ya + v1, DL0, DL1, C.lattice); bar(iu - h2, iu + h2, ya + v0, ya + v1, DL0, DL1, C.lattice);
        bar(-iu, iu, ya + v0 - h2, ya + v0 + h2, DL0, DL1, C.lattice); bar(-iu, iu, ya + v1 - h2, ya + v1 + h2, DL0, DL1, C.lattice);
        var nt = low ? 2 : 5;
        for (i = 0; i < nt; i++) { var tv = ya + v0 + (v1 - v0) * (i + 0.5) / nt; bar(-hw, -iu, tv - h2, tv + h2, DL0, DL1, C.lattice); bar(iu, hw, tv - h2, tv + h2, DL0, DL1, C.lattice); }
        [-0.07, 0.07].forEach(function (u) { bar(u - h2, u + h2, ya + v1, yb, DL0, DL1, C.lattice); bar(u - h2, u + h2, ya + 0.3, ya + v0, DL0, DL1, C.lattice); });
        // 위 판: 세로 살 2 + 가로 살(아치 안은 폭에 맞춰)
        [-0.085, 0.085].forEach(function (u) { bar(u - h2, u + h2, y2, y2 + WIN.h2 + pfW(u) - 0.01, DL0, DL1, C.lattice); });
        [0.18, 0.37, 0.55].forEach(function (v) { bar(-hw, hw, y2 + v - h2, y2 + v + h2, DL0, DL1, C.lattice); });
        if (!low) { var av = 0.17, au = 0; while (au < hw && pfW(au + 0.01) > av) au += 0.01; bar(-au, au, y2 + WIN.h2 + av - h2, y2 + WIN.h2 + av + h2, DL0, DL1, C.lattice); }
      }
      [-1, 1].forEach(function (s) { LANCETS.forEach(function (z, i) { lancet(s, z, (s < 0 ? 100 : 200) + i); }); });

      // ---------- 빛 번짐(가짜 반사광): 더하기 혼합 사각형을 한 메시로. 실시간 조명이 아니다 ----------
      var spill = new G.Batch(212); spill.enableUV(1, 1);
      var UV_R = [0, 0, 1, 0, 1, 1, 0, 1], UV_H = [0, 0.5, 1, 0.5, 1, 1, 0, 1], UV_V = [0.5, 0.5, 0.5, 0.5, 0.5, 1, 0.5, 1];
      function sp(a, b, c, d, col, hintS, uv) { spill.addQuad(a, b, c, d, col, hintS, { vary: 0 }, uv); }
      [-1, 1].forEach(function (s) {
        var xw = s * HW;
        // 창 무리마다: 벽의 빛 번짐 + 옆 통로 바닥의 빛 웅덩이
        [[-5.0, 0.9], [-2.4, 1.25], [2.2, 1.25], [6.8, 1.25]].forEach(function (g) {
          var z = g[0], r = g[1], x1 = xw - s * 0.014, hi = [xw - s * 5, 2.3, z];
          sp([x1, 0.2, z - r - 0.9], [x1, 0.2, z + r + 0.9], [x1, 4.45, z + r + 0.9], [x1, 4.45, z - r - 0.9], hdr(C.amber, 0.34), hi, UV_R);
          sp([xw - s * 0.02, 0.016, z - r - 0.7], [xw - s * 0.02, 0.016, z + r + 0.7], [xw - s * 2.3, 0.016, z + r + 0.7], [xw - s * 2.3, 0.016, z - r - 0.7], hdr(C.amber, 0.42), [xw - s, 3, z], UV_H);
        });
      });
      // 빛 띠의 널 아랫면: 널 사이 간접등이 비추는 쪽(입구 쪽 높은 끝)이 밝다
      for (si = 0; si < slats; si++) {
        var szc = BZ0 + BSTEP * si, zh = SLD / 2, yh = bandY + 0.03 - sin(SLT) * zh - 0.003, yl = bandY + 0.03 + sin(SLT) * zh - 0.003;
        sp([-BX, yh, szc + cos(SLT) * zh], [BX, yh, szc + cos(SLT) * zh], [BX, yl, szc - cos(SLT) * zh], [-BX, yl, szc - cos(SLT) * zh], hdr(C.lamp, 0.62), [0, 0, szc], [0, 0.5, 1, 0.5, 1, 0.93, 0, 0.93]);
      }
      // 빛 띠 아래 중앙 통로, 매입등 둘레 천장, 제대 벽 위쪽, 십자가 뒤
      sp([-2.6, 0.016, 10.4], [2.6, 0.016, 10.4], [2.6, 0.016, -5.9], [-2.6, 0.016, -5.9], hdr(C.lamp, 0.16), [0, 3, 2], [0, 0.5, 1, 0.5, 1, 0.5, 0, 0.5]);
      downs.forEach(function (p) { var r = 0.55, y = p[1] - 0.004; sp([p[0] - r, y, p[2] - r], [p[0] + r, y, p[2] - r], [p[0] + r, y, p[2] + r], [p[0] - r, y, p[2] + r], hdr(C.lamp, 0.3), [p[0], 0, p[2]], UV_R); });
      for (ai = 0; ai < 5; ai++) {
        var wa = AV[ai], wb = AV[ai + 1], wdx = wb[0] - wa[0], wdz = wb[1] - wa[1], wl = sqrt(wdx * wdx + wdz * wdz), wnx = -wdz / wl * 0.016, wnz = wdx / wl * 0.016;
        sp([wa[0] + wnx, 4.6, wa[1] + wnz], [wb[0] + wnx, 4.6, wb[1] + wnz], [wb[0] + wnx, 1.6, wb[1] + wnz], [wa[0] + wnx, 1.6, wa[1] + wnz], hdr(C.lamp, 0.34), [wnx * 400, 3, -8], UV_V);
      }
      var CRY = SY + 1.85, CRH = 1.9;
      sp([-1.9, CRY - 0.8, -10.78], [1.9, CRY - 0.8, -10.78], [1.9, CRY + CRH + 0.7, -10.78], [-1.9, CRY + CRH + 0.7, -10.78], hdr(0xffe6b8, 0.26), [0, 3, 0], UV_R);
      // 입구 홀: 매입등 아래 바닥의 빛 웅덩이, 문 쪽 벽과 옹기 벽을 훑는 빛
      [[-4.6, 12.6], [0, 12.6], [4.6, 12.6], [-4.6, 14.6], [0, 14.6], [4.6, 14.6]].forEach(function (p) { sp([p[0] - 1.9, 0.016, p[1] - 1.5], [p[0] + 1.9, 0.016, p[1] - 1.5], [p[0] + 1.9, 0.016, p[1] + 1.5], [p[0] - 1.9, 0.016, p[1] + 1.5], hdr(C.lamp, 0.2), [p[0], 3, p[1]], UV_R); });
      sp([-HW, LH, ZBO + 0.05], [HW, LH, ZBO + 0.05], [HW, 1.0, ZBO + 0.05], [-HW, 1.0, ZBO + 0.05], hdr(C.lamp, 0.16), [0, 2, 20], UV_V);
      sp([-HW, LH, ZL - 0.016], [HW, LH, ZL - 0.016], [HW, 1.2, ZL - 0.016], [-HW, 1.2, ZL - 0.016], hdr(C.lamp, 0.22), [0, 2, 0], UV_V);

      // ---------- 상징 기둥 2(돌 쌓기, 어두운 조약돌 물결 띠 — 십자가·문양 없음) ----------
      [-1, 1].forEach(function (s) {
        var cx = s * 6.35, cz = -6.65, cr = 0.55;
        ctx.column({ x: cx, z: cz, y: 0, h: 4.02, r: cr, style: 'round', capital: 'none', base: false, surf: 'dg_stone', collide: true });
        ctx.cyl({ x: cx, y: 4.0, z: cz, r: 0.6, rTop: 0.8, h: 0.75, seg: low ? 12 : 20, surf: OC, flat: false });
        glow.add(Geo.cyl(low ? 12 : 20, 1), hdr(C.lamp, 1.7), { x: cx, y: 3.975, z: cz, sx: 0.585, sy: 0.03, sz: 0.585, flat: true, vary: 0 });
        // 세로로 흐르는 물결 띠: 어두운 조약돌·옹기 조각을 박은 자리(문양·십자가 없음). 면에 붙은 얇은 조각 두 줄
        var n = low ? 16 : 34, a0 = Math.atan2(0.8, -s * 0.6);   // 신자석 가운데를 향한 면
        for (var i = 0; i < n; i++) for (var k = 0; k < 2; k++) {
          var t = i / (n - 1), y = 0.4 + t * 3.35, a = a0 + 0.3 * sin(t * 6.6 + 0.4) + (k ? 0.075 : -0.075), rr = cr * (1 - 0.1 * (y / 4.02)) + 0.004;
          solid.add(Geo.box(), ctx.shade(0x54463b, 0.72 + ((i * 7 + k * 3) % 5) * 0.14), { x: cx + cos(a) * rr, y: y, z: cz + sin(a) * rr, ry: PI / 2 - a, sx: 0.07, sy: 0.075 + ((i + k) % 3) * 0.008, sz: 0.022, flat: true, vary: 0.06 });
        }
      });

      // ---------- 제단(y = SY) ----------
      // 제대: 분홍빛 화강암. 위가 평평한 함지박 모양 상판 + 아치가 뚫린 받침(무늬 없음). 앞면 = +z
      var AX = 0, AZ = -8.6;
      granite.add(new T.SphereGeometry(1, low ? 14 : 22, low ? 5 : 8, 0, PI * 2, PI / 2, PI / 2), 0xffffff, { x: AX, y: SY + 0.89, z: AZ, sx: 1.2, sy: 0.46, sz: 0.55, flat: false, vary: 0 });
      granite.add(Geo.cyl(low ? 16 : 28, 1), 0xffffff, { x: AX, y: SY + 0.885, z: AZ, sx: 1.2, sy: 0.065, sz: 0.55, flat: false, vary: 0 });
      [-0.335, 0.335].forEach(function (x) { ctx.box({ x: AX + x, y: SY, z: AZ, w: 0.23, h: 0.36, d: 0.5, surf: 'dg_granite' }); });
      ctx.box({ x: AX, y: SY + 0.36, z: AZ, w: 0.9, h: 0.1, d: 0.5, surf: 'dg_granite' });
      ctx.arch({ x: AX, y: SY + 0.16, z: AZ, span: 0.44, rise: 0.2, t: 0.07, depth: 0.5, axis: 'x', type: 'round', surf: 'dg_granite', seg: 8 });
      ctx.box({ x: AX, y: SY + 0.95, z: AZ, w: 1.7, h: 0.012, d: 0.62, color: 0xf7f1e4, mat: 'solid', vary: 0 });   // 제대포
      [-0.62, 0.62].forEach(function (x) {
        ctx.cyl({ x: AX + x, y: SY + 0.962, z: AZ - 0.12, r: 0.05, rTop: 0.035, h: 0.05, seg: 8, color: 0x8a6a3a, mat: 'metal' });
        ctx.cyl({ x: AX + x, y: SY + 1.012, z: AZ - 0.12, r: 0.028, h: 0.2, seg: 8, color: 0xfff6e0, mat: 'solid', flat: false });
        glow.add(Geo.ico(low ? 0 : 1), hdr(0xffc04a, 2.4), { x: AX + x, y: SY + 1.245, z: AZ - 0.12, sx: 0.016, sy: 0.04, sz: 0.016, flat: true, vary: 0 });
      });
      ctx.addCollider({ x0: AX - 1.2, x1: AX + 1.2, z0: AZ - 0.55, z1: AZ + 0.55 });
      ctx.aoDecal({ x0: AX - 0.5, x1: AX + 0.5, z0: AZ - 0.3, z1: AZ + 0.3, y: SY, pad: 0.4 });

      // 십자가: 제대 벽 가운데. 짙은 나무 십자가 + 밝은 나무색 예수상(키트 기본 비례), 뒤에서 은은한 빛
      (function () {
        var x = 0, y = CRY, z = -10.72, h = CRH, cw = 0x3a2114, body = 0xdcbf94, f = z + h * 0.05;
        ctx.box({ x: x, y: y, z: z, w: h * 0.095, h: h, d: h * 0.05, color: cw, mat: 'wood' });
        ctx.box({ x: x, y: y + h * 0.615, z: z, w: h * 0.58, h: h * 0.085, d: h * 0.05, color: cw, mat: 'wood' });
        ctx.sphere({ x: x, y: y + h * 0.7, z: f, r: h * 0.045, color: body, w: 10, h: 8, mat: 'wood' });
        ctx.box({ x: x, y: y + h * 0.42, z: f, w: h * 0.09, h: h * 0.26, d: h * 0.04, color: body, mat: 'wood' });
        ctx.box({ x: x, y: y + h * 0.64, z: f, w: h * 0.44, h: h * 0.035, d: h * 0.035, color: body, mat: 'wood' });
        ctx.box({ x: x, y: y + h * 0.36, z: f, w: h * 0.1, h: h * 0.07, d: h * 0.05, color: 0xf2e6d0, mat: 'wood' });
        ctx.box({ x: x, y: y + h * 0.22, z: f, w: h * 0.06, h: h * 0.16, d: h * 0.035, color: body, mat: 'wood' });
      })();

      // 감실: 돌 쌓기 받침(가운데 둥근 구멍에 붉은 성체등) + 무늬 없는 청동 팔각함. 제대 왼쪽 뒤
      (function () {
        var x = -2.4, z = -10.0, y = SY;
        ctx.box({ x: x, y: y, z: z, w: 0.62, h: 1.1, d: 0.52, surf: 'dg_stone' });
        solid.add(Geo.cyl(16, 1), 0x1a1412, { x: x, y: y + 0.62, z: z + 0.262, rx: PI / 2, sx: 0.115, sy: 0.006, sz: 0.115, flat: true, vary: 0 });
        glow.add(Geo.sph(8, 6), hdr(0xff4a3a, 2.2), { x: x, y: y + 0.62, z: z + 0.285, sx: 0.045, sy: 0.06, sz: 0.03, flat: false, vary: 0 });
        sp([x - 0.4, y + 0.22, z + 0.275], [x + 0.4, y + 0.22, z + 0.275], [x + 0.4, y + 1.02, z + 0.275], [x - 0.4, y + 1.02, z + 0.275], hdr(0xff5040, 0.5), [x, y + 0.6, 0], UV_R);
        ctx.cyl({ x: x, y: y + 1.1, z: z, r: 0.3, h: 0.03, seg: 8, ry: PI / 8, color: C.bronze, mat: 'metal' });
        ctx.cyl({ x: x, y: y + 1.13, z: z, r: 0.27, h: 0.47, seg: 8, ry: PI / 8, color: C.bronze, mat: 'metal' });
        ctx.cyl({ x: x, y: y + 1.6, z: z, r: 0.3, rTop: 0.04, h: 0.17, seg: 8, ry: PI / 8, color: ctx.shade(C.bronze, 1.15), mat: 'metal' });
        ctx.sphere({ x: x, y: y + 1.8, z: z, r: 0.04, color: C.bronze, mat: 'metal', w: 8, h: 6 });
        ctx.addCollider({ x: x, z: z, r: 0.4 });
        ctx.aoDecal({ x0: x - 0.31, x1: x + 0.31, z0: z - 0.26, z1: z + 0.26, y: y, pad: 0.25 });
      })();

      // 독서대: 화강암 기둥 + 위로 넓어지는 받침판(무늬 없음). 제대 왼쪽 앞
      (function () {
        var x = -2.7, z = -7.5, y = SY;
        ctx.box({ x: x, y: y, z: z, w: 0.62, h: 0.06, d: 0.56, surf: 'dg_granite' });
        ctx.box({ x: x, y: y + 0.06, z: z, w: 0.5, h: 0.98, d: 0.5, surf: 'dg_granite' });
        ctx.box({ x: x, y: y + 1.04, z: z + 0.02, w: 0.8, h: 0.09, d: 0.56, rx: -0.22, surf: 'dg_granite' });
        ctx.box({ x: x, y: y + 1.14, z: z + 0.01, w: 0.46, h: 0.035, d: 0.34, rx: -0.22, color: 0xf6f0e0, mat: 'solid' });
        ctx.addCollider({ x: x, z: z, r: 0.5 });
        ctx.aoDecal({ x0: x - 0.31, x1: x + 0.31, z0: z - 0.28, z1: z + 0.28, y: y, pad: 0.22 });
      })();

      // 사제석 3(등받이가 둥근 밝은 나무 의자), 제대 오른쪽 뒤에서 제대 쪽을 본다
      [[3.0, -9.9], [3.8, -9.5], [4.5, -8.9]].forEach(function (p, i) {
        var x = p[0], z = p[1], y = SY, ry = Math.atan2(AX - x, (AZ + 1.6) - z), ca = cos(ry), sa = sin(ry), w = i === 0 ? 0.6 : 0.52;
        function at(lx, lz) { return [x + lx * ca + lz * sa, z - lx * sa + lz * ca]; }
        ctx.box({ x: x, y: y + 0.4, z: z, w: w, h: 0.07, d: 0.5, ry: ry, color: C.chair, mat: 'wood' });
        ctx.box({ x: x, y: y + 0.47, z: z, w: w - 0.08, h: 0.035, d: 0.42, ry: ry, color: 0x9c3f2e, mat: 'solid' });
        var bk = at(0, -0.23);
        ctx.box({ x: bk[0], y: y + 0.4, z: bk[1], w: w, h: i === 0 ? 0.62 : 0.5, d: 0.05, ry: ry, color: C.chair, mat: 'wood' });
        wood.add(Geo.cyl(low ? 10 : 16, 1), C.chair, { x: bk[0] - sa * 0.025, y: y + 0.4 + (i === 0 ? 0.62 : 0.5), z: bk[1] - ca * 0.025, ry: ry, rx: PI / 2, sx: w / 2, sy: 0.05, sz: w * 0.3, flat: true, vary: 0.03 });
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (q) { var l = at(q[0] * (w / 2 - 0.04), q[1] * 0.2); ctx.box({ x: l[0], y: y, z: l[1], w: 0.05, h: 0.4, d: 0.05, ry: ry, color: C.chair, mat: 'wood' }); });
        ctx.addCollider({ x: x, z: z, r: 0.35 });
        ctx.aoDecalCircle({ x: x, z: z, r: 0.32, y: y });
      });

      // 해설대(왼쪽 기둥 앞)와 피아노(오른쪽 앞) — 홀 바닥
      ctx.box({ x: -5.3, y: 0, z: -5.3, w: 0.6, h: 1.06, d: 0.45, color: C.chair, mat: 'wood' });
      ctx.box({ x: -5.3, y: 1.06, z: -5.28, w: 0.68, h: 0.05, d: 0.52, rx: -0.2, color: ctx.shade(C.chair, 1.08), mat: 'wood' });
      ctx.addCollider({ x0: -5.6, x1: -5.0, z0: -5.55, z1: -5.05 });
      ctx.aoDecal({ x0: -5.6, x1: -5.0, z0: -5.53, z1: -5.07, y: 0, pad: 0.2 });
      ctx.box({ x: 5.3, y: 0, z: -5.4, w: 1.45, h: 1.14, d: 0.36, color: 0x17110f, mat: 'wood' });
      ctx.box({ x: 5.3, y: 0, z: -5.12, w: 1.45, h: 0.6, d: 0.2, color: 0x17110f, mat: 'wood' });
      ctx.box({ x: 5.3, y: 0.6, z: -5.1, w: 1.36, h: 0.07, d: 0.3, color: 0x1d1613, mat: 'wood' });
      ctx.box({ x: 5.3, y: 0.672, z: -5.04, w: 1.22, h: 0.012, d: 0.14, color: 0xf2ece0, mat: 'solid', vary: 0 });
      ctx.box({ x: 5.3, y: 0, z: -4.62, w: 0.56, h: 0.46, d: 0.32, color: 0x17110f, mat: 'wood' });
      ctx.addCollider({ x0: 4.55, x1: 6.05, z0: -5.6, z1: -4.45 });
      ctx.aoDecal({ x0: 4.57, x1: 6.03, z0: -5.58, z1: -4.46, y: 0, pad: 0.22 });

      // ---------- 문: 뒷벽 가운데 쌍여닫이(로비 쪽으로 100° 열어 둠) + 양옆 닫힌 외여닫이(장식) ----------
      [-1, 1].forEach(function (s) {
        rbox(rearW, s < 0 ? -1.0 : 0.94, s < 0 ? -0.94 : 1.0, 0, 2.4, ZB - 0.03, ZBO + 0.03, C.doorD);   // 문설주
        var th = 100 * PI / 180, dx = -s * cos(th), dz = sin(th), hx = s * 0.97, hz = ZBO + 0.05, ry = Math.atan2(-dz, dx);
        var mx = hx + dx * 0.5, mz = hz + dz * 0.5, nx = -dz * s, nz = dx * s;   // 문짝 가운데, 문짝 면의 법선(문 구멍 쪽)
        ctx.box({ x: mx, y: 0.02, z: mz, w: 1.0, h: 2.3, d: 0.05, ry: ry, color: C.door, mat: 'wood' });
        [[0.25, 0.85], [1.25, 0.85]].forEach(function (pn) {
          [-1, 1].forEach(function (side) { ctx.box({ x: mx + nx * side * 0.03, y: pn[0], z: mz + nz * side * 0.03, w: 0.74, h: pn[1], d: 0.014, ry: ry, color: C.doorD, mat: 'wood' }); });
        });
        ctx.cyl({ x: hx + dx * 0.88 - nx * 0.05, y: 1.02, z: hz + dz * 0.88 - nz * 0.05, r: 0.022, h: 0.24, seg: 8, color: 0x7a6a48, mat: 'metal' });
        ctx.addCollider({ x0: s < 0 ? -1.25 : 0.95, x1: s < 0 ? -0.95 : 1.25, z0: ZBO, z1: ZBO + 1.06 });
        // 옆문(닫힘, 장식): 벽 양면에 붙인 나무 판
        [[ZB, -1], [ZBO, 1]].forEach(function (f) {
          var za = f[0], zb = f[0] + f[1] * 0.035, zc = f[0] + f[1] * 0.055, zd = f[0] + f[1] * 0.067, sx = s * 4.3;
          rbox(rearW, sx - 0.56, sx + 0.56, 0, 2.3, min(za, zb), max(za, zb), C.doorD);
          rbox(rearW, sx - 0.475, sx + 0.475, 0.02, 2.22, min(zb, zc), max(zb, zc), C.door);
          [[0.25, 0.85], [1.25, 0.85]].forEach(function (pn) { rbox(rearW, sx - 0.35, sx + 0.35, pn[0], pn[0] + pn[1], min(zc, zd), max(zc, zd), C.doorD); });
        });
      });
      rbox(rearW, -1.0, 1.0, 2.34, 2.4, ZB - 0.03, ZBO + 0.03, C.doorD);

      // ---------- 입구 홀: 성수대(키트 기본 모양의 화강암 수반 — 실제 석상은 짓지 않는다), 봉헌초, 옹기 독 ----------
      ctx.cyl({ x: -1.7, y: 0, z: 12.0, r: 0.26, rTop: 0.18, h: 0.84, seg: low ? 10 : 14, surf: 'dg_granite', flat: false });
      ctx.cyl({ x: -1.7, y: 0.84, z: 12.0, r: 0.36, rTop: 0.47, h: 0.18, seg: low ? 12 : 16, surf: 'dg_granite', flat: false });
      glow.add(Geo.cyl(12, 1), 0x8fb8cc, { x: -1.7, y: 1.005, z: 12.0, sx: 0.4, sy: 0.018, sz: 0.4, flat: true, vary: 0 });
      ctx.addCollider({ x: -1.7, z: 12.0, r: 0.42 });
      ctx.aoDecalCircle({ x: -1.7, z: 12.0, r: 0.45, y: 0 });
      ctx.candleStand(0, { wood: C.onggi });
      [[-6.35, 14.95, 1.0], [-5.55, 15.05, 0.78], [-6.5, 14.1, 0.7]].forEach(function (p) {   // 옹기 독(장식)
        var k = p[2], x = p[0], z = p[1], sg = low ? 10 : 16;
        ctx.sphere({ x: x, y: 0.5 * k, z: z, sx: 0.42 * k, sy: 0.52 * k, sz: 0.42 * k, color: C.onggi, mat: 'wood', w: sg, h: low ? 6 : 10 });
        ctx.cyl({ x: x, y: 0.93 * k, z: z, r: 0.25 * k, rTop: 0.29 * k, h: 0.1 * k, seg: sg, color: ctx.shade(C.onggi, 1.15), mat: 'wood', flat: false });
        ctx.cyl({ x: x, y: 1.03 * k, z: z, r: 0.33 * k, rTop: 0.1 * k, h: 0.1 * k, seg: sg, color: ctx.shade(C.onggi, 0.9), mat: 'wood', flat: false });
        ctx.addCollider({ x: x, z: z, r: 0.42 * k });
        ctx.aoDecalCircle({ x: x, z: z, r: 0.4 * k, y: 0 });
      });

      // ---------- 신자석 84석: 붉은 갈색 긴 의자 + 붉은 방석. 한 블록을 긴 의자 둘처럼 보이게 가운데 옆판 ----------
      ctx.renderSeats(layout, 'bench', { surf: 'dg_wood', wood: 0xb86a3c, seat: 0xb86a3c, back: 0xa85c34, kneelerColor: 0x8c3a2b });
      var PW = ChurchLogic.PEW, pewB = ctx.hasPhoto('dg_wood') ? ctx.surfBatch('dg_wood') : wood, pewC = ctx.hasPhoto('dg_wood') ? 0xffffff : 0xb86a3c;
      ChurchLogic.rowBands(layout).forEach(function (bd) {
        if (bd.front) return;
        var mx = (bd.start[0] + bd.end[0]) / 2, mz = (bd.start[1] + bd.end[1]) / 2, len = Math.abs(bd.end[0] - bd.start[0]);
        solid.add(Geo.box(), 0x9c3f2e, { x: mx, y: PW.SEAT_TOP, z: mz + 0.045, sx: len - 0.18, sy: 0.03, sz: 0.4, flat: true, vary: 0.04 });
        pewB.add(Geo.box(), pewC, { x: mx, y: 0, z: mz - (PW.END_U0 + PW.END_U1) / 2, sx: PW.END_T, sy: PW.END_ARM, sz: PW.END_U1 - PW.END_U0, flat: true, vary: 0.03 });
      });

      // ---------- 전용 메시 둘: 한지 빛 판(항상 같은 밝기, 조명 계산 없음) + 빛 번짐(더하기 혼합) ----------
      var hanjiMat = new T.MeshBasicMaterial({ map: ctx.photoTex('dg_hanji', { fallback: function () { return ctx.tex.plaster({ base: 0xfff4d8 }); } }), vertexColors: true, fog: false });
      var hanjiGrp = hanji.build(hanjiMat, 'dg_hanji', { cast: false, receive: false });
      ctx.add(hanjiGrp); ctx.stats.meshes += hanjiGrp.children.length;
      var spTex = ctx.tex.custom(64, 64, function (g, w, h) {
        var im = g.createImageData(w, h);
        for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
          var dx = (x + 0.5) / w - 0.5, dy = (y + 0.5) / h - 0.5, r = min(1, sqrt(dx * dx + dy * dy) * 2), v = Math.pow(1 - r, 1.7), o = (y * w + x) * 4;
          im.data[o] = im.data[o + 1] = im.data[o + 2] = Math.round(255 * v); im.data[o + 3] = 255;
        }
        g.putImageData(im, 0, 0);
      });
      spTex.wrapS = spTex.wrapT = T.ClampToEdgeWrapping;
      var spMat = new T.MeshBasicMaterial({ map: spTex, vertexColors: true, transparent: true, blending: T.AdditiveBlending, depthWrite: false, fog: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
      var spGrp = spill.build(spMat, 'dg_spill', { cast: false, receive: false });
      spGrp.children.forEach(function (m) { m.renderOrder = 3; });
      spGrp.userData.noAO = true;
      ctx.add(spGrp); ctx.stats.meshes += spGrp.children.length;

      // 뒷벽 묶음(위 '벽' 참고): 아바타와 카메라가 벽의 같은 쪽에 있을 때만 보인다. 아바타를 숨긴 화면(썸네일)은 늘 보인다.
      rearO.bakeAO(ctx._.aoOpts); rearW.bakeAO(ctx._.aoOpts);
      var rearGrp = new T.Group(); rearGrp.name = 'dg_rearwall';
      rearGrp.add(rearO.build(ctx.mats.surface(OC, { vertex: true }), 'dg_rear_plaster', { cast: true, receive: true }));
      rearGrp.add(rearW.build(ctx.mats.wood, 'dg_rear_wood', { cast: true, receive: true }));
      ctx.add(rearGrp); ctx.stats.meshes += 2;
      ctx.onUpdate(function () {
        var A = window.__church, vis = true;
        if (A && A.me && A.camera && A.meAv && A.meAv.root.visible && A.world && A.world.id === 'danggogae') vis = (A.me.z > ZB + 0.2) === (A.camera.position.z > ZB + 0.2);
        if (rearGrp.visible !== vis) rearGrp.visible = vis;
      });

      // ---------- 조명·카메라 ----------
      ctx.addLight({ x: 0, y: 3.8, z: -7.4, color: 0xffd9a0, intensity: 0.9, distance: 15, kind: 'always' });
      // 천장이 낮다: yMax 필수. z1 은 로비 뒷벽(15.6) 뒤 카메라 통로까지: 입구 홀이 4.2m 로 얕아 카메라(아바타 뒤 7m)가 벽 안에 갇히지 않게
      ctx.setCameraBounds({ x0: -6.95, x1: 6.95, z0: -10.7, z1: ZT - 0.3, yMax: 3.9 });
    }
  };
})();
