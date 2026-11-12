/* avatar.js — 부드럽고 말랑한 "3D 클레이/비닐 토이" 스타일 스킨드 아바타(약 5.6등신, 키 약 1.82m).
   - 매끈하고 둥근 형태, 하드 에지 없음. 점 눈 + 알약 눈썹 + 둥근 코 + 가는 미소 + 볼터치, 머리카락은 매끈한 덩어리.
   - 재질은 모두 MeshStandardMaterial(거칠기 0.74~0.82, metalness 0, 정점 색 사용).
   - 근접(LOD0) <= 약 6k 삼각형, 중간(LOD1) <= 약 1.5k, 원거리(LOD2)는 비스킨 임포스터(약 300).
   - 공개 API(변경 없음): new Avatar(cfg, {showTag}), root, setConfig, setLod(0|1|2), lod, setWalk, setSeated, setPray, playEmote(0 인사|1 성호|2 절),
     setPose(x,y,z,yaw), snapPose(), update(dt,t), nod/nodPh, seatLift, ChurchAvatar.tagMaterial/HEIGHT.
   좌표: 앞 = -z, 위 = +y, +x = 아바타의 오른쪽. 휴식 자세(팔이 아래로 늘어진 자세)로 모델링하고 뼈 회전으로 포즈를 만든다. */
(function (root) {
  'use strict';
  var T = root.THREE, G = root.ChurchGeo, P = root.ChurchPalette;
  var PI = Math.PI, TAU = PI * 2;

  // ------------------------------------------------------------------ 상수
  var HEIGHT = 1.7;
  var SEAT_BACK = 0.14;          // 앉을 때 골반을 좌석 중심에서 뒤로 이동(m). 앞줄 등받이와 무릎이 부딪히지 않도록.
  var SX = 0.18, HX = 0.095;     // 어깨/고관절 좌우 위치
  var LEN_T = 0.39, LEN_S = 0.41, ANKLE = 0.08;   // 허벅지, 종아리, 발목 높이
  var ARM_A = 0.29, ARM_B = 0.26, SH_Y = 0.20;    // 위팔, 아래팔 길이, 어깨의 가슴 뼈대 기준 높이
  var HIP_JOINT = 0.88, HIPS_Y = 0.93;
  var HC = 1.5785;               // 머리 중심 y (현실적인 성인 비율 유지)

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }
  function sm(t) { t = clamp01(t); return t * t * (3 - 2 * t); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function S(t, n) { var e = 2 / n, a = Math.abs(t); return (t < 0 ? -1 : 1) * Math.pow(a, e); }   // 슈퍼타원
  function dense(u, k) { return TAU * u - (k === undefined ? 0.26 : k) * Math.sin(TAU * u); }       // 앞쪽(a=0) 정점을 촘촘하게

  // 표(첫 열 = y)를 에르미트 보간하는 함수 생성: fn(y) -> [v1, v2, ...]
  function profile(tab) {
    var rows = tab.slice().sort(function (a, b) { return a[0] - b[0]; }), n = rows.length, m = rows[0].length - 1, tan = [], k, c;
    for (k = 0; k < n; k++) {
      var k0 = Math.max(0, k - 1), k1 = Math.min(n - 1, k + 1), dy = (rows[k1][0] - rows[k0][0]) || 1;
      tan[k] = [];
      for (c = 1; c <= m; c++) tan[k][c] = (rows[k1][c] - rows[k0][c]) / dy;
    }
    return function (y) {
      var out = [];
      if (y <= rows[0][0]) { for (c = 1; c <= m; c++) out.push(rows[0][c]); return out; }
      if (y >= rows[n - 1][0]) { for (c = 1; c <= m; c++) out.push(rows[n - 1][c]); return out; }
      var s = 0;
      while (s < n - 2 && y > rows[s + 1][0]) s++;
      var y0 = rows[s][0], y1 = rows[s + 1][0], h = y1 - y0, t = (y - y0) / h, t2 = t * t, t3 = t2 * t;
      var h00 = 2 * t3 - 3 * t2 + 1, h10 = t3 - 2 * t2 + t, h01 = -2 * t3 + 3 * t2, h11 = t3 - t2;
      for (c = 1; c <= m; c++) out.push(h00 * rows[s][c] + h10 * h * tan[s][c] + h01 * rows[s + 1][c] + h11 * h * tan[s + 1][c]);
      return out;
    };
  }

  // 뼈대 -------------------------------------------------------------------
  var BN = ['root', 'hips', 'spine', 'chest', 'neck', 'head', 'uaL', 'faL', 'haL', 'uaR', 'faR', 'haR', 'ulL', 'llL', 'ftL', 'ulR', 'llR', 'ftR', 'skirt', 'ckL', 'ckR'];
  var BI = {}; BN.forEach(function (n, i) { BI[n] = i; });
  var BPAR = [-1, 0, 1, 2, 3, 4, 3, 6, 7, 3, 9, 10, 1, 12, 13, 1, 15, 16, 1, 1, 1];
  var BABS = [[0, 0, 0], [0, HIPS_Y, 0], [0, 1.03, 0], [0, 1.20, 0], [0, 1.42, 0.012], [0, 1.50, 0],
    [-SX, 1.40, 0], [-SX, 1.11, 0], [-SX, 0.85, 0], [SX, 1.40, 0], [SX, 1.11, 0], [SX, 0.85, 0],
    [-HX, HIP_JOINT, 0], [-HX, 0.49, 0], [-HX, ANKLE, 0], [HX, HIP_JOINT, 0], [HX, 0.49, 0], [HX, ANKLE, 0], [0, HIP_JOINT, 0], [-HX, HIP_JOINT, 0], [HX, HIP_JOINT, 0]];
  var B = BI;

  // 영역 id (색 표로 변환)
  var R = { SKIN: 0, LIP: 1, EYE: 2, BROW: 5, HAIR: 6, SHOE: 7, SOLE: 8, COAT: 11, COATIN: 12, PANTS: 14, CUFF: 16, TIE: 17, POCKET: 18, PCUFF: 19 };
  var NREG = 20;

  // ------------------------------------------------------------------ 메시 빌더
  function MB() { this.pos = []; this.nor = []; this.si = []; this.sw = []; this.reg = []; this.ao = []; this.tn = []; this.idx = []; this.vc = 0; }
  MB.prototype.tris = function () { return this.idx.length / 3; };

  function normWeights(w) {
    var l = [], i;
    for (i = 0; i < w.length; i++) if (w[i][1] > 1e-4) l.push(w[i]);
    if (!l.length) return [[0, 1]];
    if (l.length > 4) { l.sort(function (a, b) { return b[1] - a[1]; }); l.length = 4; }
    var sum = 0;
    for (i = 0; i < l.length; i++) sum += l[i][1];
    var out = [];
    for (i = 0; i < l.length; i++) out.push([l[i][0], l[i][1] / sum]);
    return out;
  }

  // 매개변수 곡면: pt(i,j) -> [x,y,z]. closed 이면 열(i)이 순환. 법선은 유한차분으로 계산(부드러운 셰이딩).
  function surf(mb, o) {
    var nu = o.nu, nv = o.nv, closed = !!o.closed, cols = closed ? nu : nu + 1, rows = nv + 1, i, j, c;
    var N = cols * rows, Pt = new Array(N);
    for (j = 0; j < rows; j++) for (i = 0; i < cols; i++) Pt[j * cols + i] = o.pt(i, j);
    var inside = o.inside;
    if (!inside) {
      inside = [0, 0, 0];
      for (c = 0; c < N; c++) { inside[0] += Pt[c][0]; inside[1] += Pt[c][1]; inside[2] += Pt[c][2]; }
      inside[0] /= N; inside[1] /= N; inside[2] /= N;
    }
    var Nr = new Array(N), deg = new Array(N), sgn = 0;
    for (j = 0; j < rows; j++) {
      var j0 = Math.max(0, j - 1), j1 = Math.min(rows - 1, j + 1);
      for (i = 0; i < cols; i++) {
        var i0 = closed ? (i - 1 + cols) % cols : Math.max(0, i - 1), i1 = closed ? (i + 1) % cols : Math.min(cols - 1, i + 1);
        var a = Pt[j * cols + i1], b = Pt[j * cols + i0], d = Pt[j1 * cols + i], e = Pt[j0 * cols + i];
        var ux = a[0] - b[0], uy = a[1] - b[1], uz = a[2] - b[2], vx = d[0] - e[0], vy = d[1] - e[1], vz = d[2] - e[2];
        var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, l = Math.sqrt(nx * nx + ny * ny + nz * nz);
        c = j * cols + i;
        var p = Pt[c];
        if (l < 1e-13) {
          nx = p[0] - inside[0]; ny = p[1] - inside[1]; nz = p[2] - inside[2]; l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
          deg[c] = true;
        } else {
          deg[c] = false;
          sgn += (nx * (p[0] - inside[0]) + ny * (p[1] - inside[1]) + nz * (p[2] - inside[2])) / l;
        }
        Nr[c] = [nx / l, ny / l, nz / l];
      }
    }
    var flip = o.flip ? -1 : 1;
    if (sgn < 0) flip = -flip;
    var base = mb.vc;
    for (j = 0; j < rows; j++) for (i = 0; i < cols; i++) {
      c = j * cols + i;
      var pp = Pt[c], nn = Nr[c], f = deg[c] ? 1 : flip, wl = normWeights(typeof o.w === 'function' ? o.w(i, j, pp) : o.w), q;
      mb.pos.push(pp[0], pp[1], pp[2]);
      mb.nor.push(nn[0] * f, nn[1] * f, nn[2] * f);
      for (q = 0; q < 4; q++) { mb.si.push(q < wl.length ? wl[q][0] : 0); mb.sw.push(q < wl.length ? wl[q][1] : 0); }
      mb.reg.push(typeof o.reg === 'function' ? o.reg(i, j, pp) : o.reg);
      mb.ao.push(o.ao === undefined ? 1 : (typeof o.ao === 'function' ? o.ao(i, j, pp) : o.ao));
      mb.tn.push(o.tn ? o.tn(i, j, pp) : 0);
    }
    mb.vc += N;
    var ucount = closed ? nu : nu;
    for (j = 0; j < nv; j++) for (i = 0; i < ucount; i++) {
      var i1b = closed ? (i + 1) % cols : i + 1;
      var A = base + j * cols + i, Bv = base + j * cols + i1b, C = base + (j + 1) * cols + i, D = base + (j + 1) * cols + i1b;
      addTri(mb, A, Bv, C, flip < 0); addTri(mb, Bv, D, C, flip < 0);
    }
  }
  function addTri(mb, a, b, c, rev) {
    var p = mb.pos, ax = p[a * 3], ay = p[a * 3 + 1], az = p[a * 3 + 2];
    var ux = p[b * 3] - ax, uy = p[b * 3 + 1] - ay, uz = p[b * 3 + 2] - az, vx = p[c * 3] - ax, vy = p[c * 3 + 1] - ay, vz = p[c * 3 + 2] - az;
    var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    if (nx * nx + ny * ny + nz * nz < 1e-14) return;   // 퇴화 삼각형 제거
    if (rev) mb.idx.push(a, c, b); else mb.idx.push(a, b, c);
  }

  // 링 적층(loft). rings[j] = {c:[x,y,z], ru, rv, n, u:[..], v:[..], a0, a1}. 각 a=0 은 v 방향(기본: 앞 = -z).
  var UX = [1, 0, 0], VF = [0, 0, -1];
  function loft(mb, rings, o) {
    o = o || {};
    var nu = o.nu || 12, closed = !o.open;
    surf(mb, {
      nu: nu, nv: rings.length - 1, closed: closed, inside: o.inside, flip: o.flip,
      pt: function (i, j) {
        var r = rings[j], a;
        if (closed) a = o.dense === false ? TAU * i / nu : dense(i / nu, o.dk);
        else { var a0 = r.a0 === undefined ? 0 : r.a0, a1 = r.a1 === undefined ? TAU : r.a1; a = a0 + (a1 - a0) * i / nu; }
        var u = r.u || UX, v = r.v || VF, n = r.n || o.n || 2, su = r.ru * S(Math.sin(a), n), sv = r.rv * S(Math.cos(a), n), c = r.c;
        return [c[0] + u[0] * su + v[0] * sv, c[1] + u[1] * su + v[1] * sv, c[2] + u[2] * su + v[2] * sv];
      },
      w: o.w || function (i, j) { var r = rings[j]; return r.w || [[0, 1]]; },
      reg: o.reg, ao: o.ao, tn: o.tn
    });
  }

  // 임의 경로를 따라가는 관(손가락, 팔다리 임포스터). pts: [[x,y,z]...], rad: 반지름 배열. caps: 'end' | 'both'
  function tube(mb, pts, rad, o) {
    o = o || {};
    var rings = [], n = pts.length, j, t = [0, 0, 0];
    function tang(j) {
      var a = pts[Math.max(0, j - 1)], b = pts[Math.min(n - 1, j + 1)], x = b[0] - a[0], y = b[1] - a[1], z = b[2] - a[2], l = Math.sqrt(x * x + y * y + z * z) || 1;
      return [x / l, y / l, z / l];
    }
    function frame(t0) {
      var r = Math.abs(t0[2]) > 0.9 ? [1, 0, 0] : [0, 0, 1];
      var ux = t0[1] * r[2] - t0[2] * r[1], uy = t0[2] * r[0] - t0[0] * r[2], uz = t0[0] * r[1] - t0[1] * r[0], l = Math.sqrt(ux * ux + uy * uy + uz * uz) || 1;
      ux /= l; uy /= l; uz /= l;
      return [[ux, uy, uz], [uy * t0[2] - uz * t0[1], uz * t0[0] - ux * t0[2], ux * t0[1] - uy * t0[0]]];
    }
    if (o.caps === 'both') {
      t = tang(0); var f0 = frame(t), r0 = rad[0];
      rings.push({ c: [pts[0][0] - t[0] * r0 * 0.8, pts[0][1] - t[1] * r0 * 0.8, pts[0][2] - t[2] * r0 * 0.8], ru: 0.001, rv: 0.001, u: f0[0], v: f0[1] });
      rings.push({ c: [pts[0][0] - t[0] * r0 * 0.4, pts[0][1] - t[1] * r0 * 0.4, pts[0][2] - t[2] * r0 * 0.4], ru: r0 * 0.85, rv: r0 * 0.85, u: f0[0], v: f0[1] });
    }
    for (j = 0; j < n; j++) {
      t = tang(j); var f = frame(t), rr = rad[j];
      rings.push({ c: pts[j], ru: rr, rv: o.flat ? rr * o.flat : rr, u: f[0], v: f[1] });
    }
    if (o.caps) {
      var te = tang(n - 1), fe = frame(te), re = rad[n - 1], pe = pts[n - 1];
      rings.push({ c: [pe[0] + te[0] * re * 0.4, pe[1] + te[1] * re * 0.4, pe[2] + te[2] * re * 0.4], ru: re * 0.85, rv: re * 0.85, u: fe[0], v: fe[1] });
      rings.push({ c: [pe[0] + te[0] * re * 0.8, pe[1] + te[1] * re * 0.8, pe[2] + te[2] * re * 0.8], ru: 0.001, rv: 0.001, u: fe[0], v: fe[1] });
    }
    loft(mb, rings, { nu: o.nu || 6, w: o.w, reg: o.reg, ao: o.ao, tn: o.tn, dense: false });
  }

  var _rm = new T.Matrix4(), _re = new T.Euler(), _rv = new T.Vector3();
  // 타원체. r=[rx,ry,rz], rot=[rx,ry,rz] 오일러, o: nu, nv, w, reg, ao, tn, lo/hi(극각 범위), az0/az1(방위각 범위)
  function blob(mb, c, r, rot, o) {
    o = o || {};
    var nu = o.nu || 8, nv = o.nv || 6, th0 = o.th0 || 0, th1 = o.th1 === undefined ? PI : o.th1, open = o.az0 !== undefined;
    _re.set(rot ? rot[0] : 0, rot ? rot[1] : 0, rot ? rot[2] : 0, 'YXZ'); _rm.makeRotationFromEuler(_re);
    surf(mb, {
      nu: nu, nv: nv, closed: !open, inside: c, flip: o.flip,
      pt: function (i, j) {
        var th = th0 + (th1 - th0) * j / nv, ph = open ? o.az0 + (o.az1 - o.az0) * i / nu : TAU * i / nu;
        _rv.set(r[0] * Math.sin(th) * Math.cos(ph), r[1] * Math.cos(th), r[2] * Math.sin(th) * Math.sin(ph)).applyMatrix4(_rm);
        return [c[0] + _rv.x, c[1] + _rv.y, c[2] + _rv.z];
      },
      w: o.w || [[0, 1]], reg: o.reg === undefined ? R.SKIN : o.reg, ao: o.ao, tn: o.tn
    });
  }

  // ------------------------------------------------------------------ 머리 형상 (클레이: 큼직하고 둥근 머리)
  var HH = 0.160, WW = 0.136, DD = 0.130;       // 머리 반높이/반폭/반깊이
  function headWD(y) {
    var t = clamp(y / HH, -1, 1), p = t < 0 ? 2.3 : 2.0, s = Math.pow(Math.max(0, 1 - Math.pow(Math.abs(t), p)), 1 / p);
    var m = 1 + 0.025 * t - 0.12 * Math.pow(Math.max(0, -t - 0.15), 1.2);
    return [WW * s * m, DD * s * (1 + 0.02 * t)];
  }
  var HN = 2.1;
  // 머리 표면 점(머리 중심 기준). a=0 앞, +a 는 오른쪽(+x). off = 표면 바깥으로의 거리.
  function headPt(y, a, off) {
    var d = headWD(y), x0 = d[0] * S(Math.sin(a), HN), z0 = -d[1] * S(Math.cos(a), HN);
    if (!off) return [x0, y, z0];
    var gx = x0 / (WW * WW), gy = y / (HH * HH), gz = z0 / (DD * DD), l = Math.sqrt(gx * gx + gy * gy + gz * gz) || 1;
    return [x0 + gx / l * off, y + gy / l * off, z0 + gz / l * off];
  }
  function headFrontZ(x, y) {
    var d = headWD(y), t = clamp(Math.abs(x) / Math.max(d[0], 1e-5), 0, 0.999);
    return -d[1] * Math.pow(1 - Math.pow(t, HN), 1 / HN);
  }
  // 머리 표면 위 점 + 표면 방향 오일러(y,x)
  function onHead(x, y, off) {
    var z = headFrontZ(x, y), gx = x / (WW * WW), gy = y / (HH * HH), gz = z / (DD * DD), l = Math.sqrt(gx * gx + gy * gy + gz * gz) || 1;
    return { p: [x + gx / l * off, y + gy / l * off, z + gz / l * off], ry: -Math.atan2(gx, -gz), rx: Math.atan2(gy, -gz) * 0.9 };
  }
  var HEADW = [[B.head, 1]];
  function hc(p) { return [p[0], p[1] + HC, p[2]]; }

  var EYE_X = 0.060, EYE_Y = 0.002, BROW_Y = 0.056, NOSE_Y = -0.040, SMILE_Y = -0.088, CHEEK_X = 0.092, CHEEK_Y = -0.044;

  function buildHead(mb, q) {
    var near = q === 0, nv = near ? 18 : 8, nu = near ? 24 : 12, ys = [], k;
    for (k = 0; k <= nv; k++) { var tt = k / nv; ys.push(HH * Math.cos(PI * tt) * 0.9999); }
    surf(mb, {
      nu: nu, nv: nv, closed: true, inside: [0, HC, 0],
      pt: function (i, j) { var p = headPt(ys[j], dense(i / nu, 0.2), 0); return [p[0], p[1] + HC, p[2]]; },
      w: HEADW, reg: R.SKIN,
      ao: function (i, j, p) { var y = p[1] - HC; return y < -0.12 ? 0.94 + 0.06 * sm((y + 0.16) / 0.04) : 1; }
    });
  }

  function buildFace(mb, q) {
    var near = q === 0, e, k, i, j;
    // 눈: 납작한 짙은 타원 점
    for (e = -1; e <= 1; e += 2) {
      var oh = onHead(e * EYE_X, EYE_Y, -0.0016);
      blob(mb, hc(oh.p), [0.0125, 0.0155, 0.0075], [oh.rx * 0.0, oh.ry, 0], { nu: near ? 8 : 6, nv: near ? 4 : 3, w: HEADW, reg: R.EYE, ao: 1 });
    }
    // 눈썹: 알약 모양
    for (e = -1; e <= 1; e += 2) {
      if (!near) { var ob = onHead(0.063, BROW_Y + 0.002, 0.0), br = hc(ob.p); blob(mb, [e * br[0], br[1], br[2]], [0.030, 0.0068, 0.005], [0, -e * ob.ry, e * -0.08], { nu: 6, nv: 3, w: HEADW, reg: R.BROW, ao: 1 }); continue; }
      var pts = [], rad = [];
      for (k = 0; k < 4; k++) {
        var tq = k / 3, bx = 0.034 + 0.058 * tq, by = BROW_Y + 0.007 * Math.sin(tq * PI) - 0.004 * tq;
        var o2 = onHead(bx, by, 0.0006); pts.push([e * o2.p[0], o2.p[1] + HC, o2.p[2]]); rad.push(0.0068 * (k === 0 ? 0.92 : 1 - 0.12 * tq));
      }
      tube(mb, pts, rad, { caps: 'both', nu: 6, flat: 0.55, w: HEADW, reg: R.BROW, ao: 1 });
    }
    // 코: 둥근 혹
    var nz = headFrontZ(0, NOSE_Y);
    blob(mb, [0, NOSE_Y + HC, nz - 0.0045], [0.0185, 0.0165, 0.0215], [0.25, 0, 0], { nu: near ? 8 : 6, nv: near ? 5 : 4, w: HEADW, reg: R.SKIN, tn: function (ii, jj) { return 0.3; }, ao: 1 });
    if (!near) return;
    // 입: 가는 미소 선
    var mp = [], mr = [];
    for (k = 0; k < 6; k++) {
      var u = k / 5 * 2 - 1, mx = 0.046 * u, my = SMILE_Y + 0.016 * u * u, o3 = onHead(mx, my, -0.0004);
      mp.push([o3.p[0], o3.p[1] + HC, o3.p[2]]); mr.push(0.0019 * (1 - 0.3 * Math.abs(u)));
    }
    tube(mb, mp, mr, { caps: 'both', nu: 4, w: HEADW, reg: R.LIP, ao: 1 });
    // 볼터치(피부색에서 분홍으로 번지는 얇은 원판)
    for (e = -1; e <= 1; e += 2) {
      var NR = 3, NS = 8, RAD = 0.038;
      surf(mb, {
        nu: NS, nv: NR, closed: true, inside: [e * CHEEK_X, CHEEK_Y + HC, 0],
        pt: function (ii, jj) {
          var r = jj / NR, ph = TAU * ii / NS, x = e * CHEEK_X + Math.cos(ph) * RAD * r * 0.9, y = CHEEK_Y + Math.sin(ph) * RAD * r;
          var d = headWD(y), xx = clamp(x, -d[0] * 0.96, d[0] * 0.96), o4 = onHead(xx, y, 0.0009);
          return [o4.p[0], o4.p[1] + HC, o4.p[2]];
        },
        w: HEADW, reg: R.SKIN, ao: 1, tn: function (ii, jj) { var r = jj / NR; return 1 - r * r; }
      });
    }
    // 귀: 단순한 둥근 귀
    for (e = -1; e <= 1; e += 2) blob(mb, [e * (WW + 0.001), -0.012 + HC, 0.006], [0.0125, 0.031, 0.025], [0.0, 0, e * 0.22], { nu: 8, nv: 4, w: HEADW, reg: R.SKIN, tn: function () { return 0.55; }, ao: 0.97 });
  }

  // 목 (짧고 굵게)
  function neckW(y) {
    var t1 = sm((y - 1.385) / 0.05), t2 = sm((y - 1.435) / 0.05);
    return [[B.chest, 1 - t1], [B.neck, t1 * (1 - t2)], [B.head, t1 * t2]];
  }
  function buildNeck(mb, q) {
    var ys = q === 0 ? [1.38, 1.42, 1.46, 1.50] : [1.38, 1.44, 1.50], rings = [];
    ys.forEach(function (y) { rings.push({ c: [0, y, 0.006], ru: 0.060, rv: 0.058, w: neckW(y) }); });
    loft(mb, rings, { nu: q === 0 ? 12 : 6, dense: false, reg: R.SKIN, ao: function (i, j, p) { return 0.80 + 0.2 * sm((p[1] - 1.40) / 0.08); } });
  }

  // ------------------------------------------------------------------ 머리카락 (부드러운 덩어리)
  function fold(a) { return a > PI ? TAU - a : a; }
  function rimFn(tab) { var pf = profile(tab); return function (f) { return pf(f)[0]; }; }
  // 머리 표면을 감싸는 껍질. rim(f) = 방위각별 끝 y, thick(y,a,s,f) = 두께, w = 정점 가중치 함수(선택)
  function hairPatch(mb, o) {
    var nu = o.nu, nv = o.nv, ye = rimFn(o.rim), pw = o.pw || 1;
    surf(mb, {
      nu: nu, nv: nv, closed: true, inside: [0, HC + 0.02, 0.01],
      pt: function (i, j) {
        var a = dense(i / nu, 0.18), s = j / nv, f = fold(a), yEnd = ye(f), y = HH + (yEnd - HH) * Math.pow(s, pw), off = o.thick(y, a, s, f), p = o.shape ? o.shape(y, a, off, s, f) : headPt(Math.min(y, HH * 0.9999), a, off);
        return [p[0], p[1] + HC, p[2]];
      },
      w: o.w || HEADW, reg: R.HAIR,
      ao: function (i, j, p) { var y = p[1] - HC, s = j / nv; return 0.86 + 0.16 * sm((y + 0.08) / 0.2) - 0.05 * sm((s - 0.8) / 0.2); }
    });
  }
  // 끝 가장자리를 둥글게 말아주는 두께 감쇠
  function roundEnd(s, s0) { if (s <= s0) return 1; var u = (s - s0) / (1 - s0); return Math.sqrt(Math.max(0, 1 - u * u)) * 0.92 + 0.08 * (1 - u); }
  function spiral(mb, cx, cy, cz, R0, turns, rot, near) {   // 앞으로 말린 곱슬 한 줄기
    var pts = [], rad = [], n = near ? 14 : 9, k, cr = Math.cos(rot), sr = Math.sin(rot);
    for (k = 0; k < n; k++) {
      var t = k / (n - 1), ang = t * TAU * turns, r = R0 * (1 - 0.78 * t), lx = Math.cos(ang) * r, lz = Math.sin(ang) * r, ly = 0.006 * t;
      pts.push([cx + lx, cy + ly * cr - lz * sr, cz + ly * sr + lz * cr]);
      rad.push(0.0125 * (1 - 0.55 * t));
    }
    tube(mb, pts, rad, { caps: 'end', nu: near ? 6 : 5, w: HEADW, reg: R.HAIR, ao: 0.97 });
  }
  function buildHair(mb, style, q) {
    var near = q === 0, nu = near ? 24 : 10;
    if (style === 0) {            // 짧은 머리 + 앞머리 컬/퀴프
      hairPatch(mb, {
        nu: nu, nv: near ? 8 : 4, pw: 0.95,
        rim: [[0, 0.104], [0.45, 0.100], [0.8, 0.06], [1.1, 0.032], [1.7, 0.028], [2.15, 0.0], [2.6, -0.07], [PI, -0.085]],
        thick: function (y, a, s, f) {
          var t = 0.013 + 0.012 * sm((y - 0.05) / 0.1) + 0.006 * Math.exp(-Math.pow((f - 2.4) / 0.6, 2)); return t * roundEnd(s, 0.45);
        }
      });
      blob(mb, [0.012, 0.152 + HC, -0.062], [0.088, 0.040, 0.074], [-0.55, 0.0, 0.12], { nu: near ? 10 : 6, nv: near ? 6 : 3, w: HEADW, reg: R.HAIR, ao: 1 });
      if (near) spiral(mb, -0.024, 0.186 + HC, -0.098, 0.034, 1.55, -0.5, true);
    } else if (style === 1) {     // 단발 (귀 뒤로 넘기고 끝이 둥글게 부푼 보브)
      hairPatch(mb, {
        nu: near ? 26 : 10, nv: near ? 10 : 5, pw: 1,
        rim: [[0, 0.104], [0.5, 0.100], [0.85, 0.072], [1.15, 0.040], [1.55, 0.034], [1.9, -0.04], [2.3, -0.145], [2.8, -0.150], [PI, -0.150]],
        thick: function (y, a, s, f) {
          var flare = 0.038 * sm((0.0 - y) / 0.12) * sm((f - 1.5) / 0.4), t = 0.014 + 0.010 * sm((y - 0.05) / 0.1) + flare;
          return t * roundEnd(s, 0.55);
        }
      });
      blob(mb, [0.0, 0.150 + HC, -0.050], [0.082, 0.034, 0.066], [-0.5, 0.0, 0.0], { nu: near ? 10 : 6, nv: near ? 6 : 3, w: HEADW, reg: R.HAIR, ao: 1 });
    } else if (style === 2) {     // 높이 올린 올림머리(쪽)
      hairPatch(mb, {
        nu: nu, nv: near ? 8 : 4, pw: 0.95,
        rim: [[0, 0.104], [0.5, 0.100], [0.85, 0.060], [1.15, 0.034], [1.6, 0.034], [2.1, 0.026], [2.7, 0.012], [PI, 0.004]],
        thick: function (y, a, s, f) { return (0.013 + 0.010 * sm((y - 0.05) / 0.1)) * roundEnd(s, 0.5); }
      });
      blob(mb, [0, 0.222 + HC, 0.040], [0.072, 0.066, 0.070], [0.25, 0, 0], { nu: near ? 10 : 7, nv: near ? 7 : 4, w: HEADW, reg: R.HAIR, ao: 1 });
      blob(mb, [0, 0.168 + HC, 0.022], [0.056, 0.014, 0.054], [0.25, 0, 0], { nu: near ? 10 : 6, nv: near ? 4 : 3, w: HEADW, reg: R.TIE, ao: 1 });
      blob(mb, [0.0, 0.150 + HC, -0.050], [0.074, 0.030, 0.060], [-0.5, 0.0, 0.0], { nu: near ? 10 : 6, nv: near ? 6 : 3, w: HEADW, reg: R.HAIR, ao: 1 });
    } else {                      // 길고 물결치는 곱슬
      var ph0 = 0.7;
      hairPatch(mb, {
        nu: near ? 28 : 12, nv: near ? 14 : 7, pw: 1,
        rim: [[0, 0.104], [0.5, 0.100], [0.85, 0.072], [1.15, 0.040], [1.6, 0.030], [1.95, -0.10], [2.3, -0.255], [2.8, -0.270], [PI, -0.270]],
        thick: function (y, a, s, f) {
          var lo = sm((0.0 - y) / 0.15), t = 0.014 + 0.010 * sm((y - 0.05) / 0.1) + 0.030 * lo * sm((f - 1.35) / 0.5);
          return t * roundEnd(s, 0.7);
        },
        shape: function (y, a, off, s, f) {
          var yy = Math.max(y, -0.085), p = headPt(Math.min(yy, HH * 0.9999), a, off), lo = sm((-0.085 - y) / 0.18), k = f > 1.3 ? 1 : 0;
          var wv = near ? 0.007 * Math.sin(y * 62 + a * 3 + ph0) * sm((0.04 - y) / 0.1) : 0;
          p[0] *= 1 + 0.10 * lo * k + wv * 3; p[2] += (y < -0.085 ? 0.01 * lo : 0) + wv; p[1] = y;
          return p;
        },
        w: function (i, j, p) { var y = p[1] - HC, t = sm((-0.09 - y) / 0.14); return [[B.head, 1 - t], [B.chest, t]]; }
      });
      blob(mb, [0.0, 0.150 + HC, -0.050], [0.082, 0.034, 0.066], [-0.5, 0.0, 0.0], { nu: near ? 10 : 6, nv: near ? 6 : 3, w: HEADW, reg: R.HAIR, ao: 1 });
    }
  }

  // ------------------------------------------------------------------ 몸통(후디/재킷)
  var TORSO = profile([
    [1.444, 0.064, 0.068, 0.012], [1.432, 0.084, 0.078, 0.011], [1.416, 0.130, 0.092, 0.008], [1.395, 0.178, 0.106, 0.004], [1.372, 0.190, 0.112, 0.002],
    [1.300, 0.176, 0.120, -0.004], [1.200, 0.168, 0.126, -0.008], [1.080, 0.160, 0.120, -0.004], [0.980, 0.174, 0.124, 0.0],
    [0.880, 0.192, 0.132, 0.002], [0.800, 0.198, 0.138, 0.003], [0.700, 0.205, 0.146, 0.005]
  ]);
  var TORSO_N = 2.3;
  function torsoPt(y, a, off) {
    var d = TORSO(y);
    return [(d[0] + off) * S(Math.sin(a), TORSO_N), y, d[2] - (d[1] + off) * S(Math.cos(a), TORSO_N)];
  }
  function torsoW(p, y) {
    var cw = sm((y - 1.10) / 0.16), sw = sm((y - 0.98) / 0.13) * (1 - cw), hw = 1 - sm((y - 0.98) / 0.13);
    var tw = sm((0.93 - y) / 0.12) * (1 - sm(p[2] / 0.12));
    var sR = sm((p[0] + 0.07) / 0.14);
    var nk = sm((y - 1.43) / 0.03) * 0.25;
    var sk = sm((0.93 - y) / 0.15), rest = hw * (1 - tw);
    return [[B.chest, cw * (1 - nk)], [B.neck, cw * nk], [B.spine, sw], [B.hips, rest * (1 - sk)], [B.skirt, rest * sk], [B.ckR, hw * tw * sR], [B.ckL, hw * tw * (1 - sR)]];
  }
  var COAT_YS = [1.446, 1.430, 1.410, 1.380, 1.320, 1.230, 1.130, 1.030, 0.940, 0.860, 0.790];
  var COAT_YS_MID = [1.446, 1.400, 1.280, 1.100, 0.930, 0.790];
  function buildCoat(mb, q) {
    var ys = q === 0 ? COAT_YS : COAT_YS_MID, nu = q === 0 ? 18 : 10, rings = [];
    ys.forEach(function (y) { var d = TORSO(y); rings.push({ c: [0, y, d[2]], ru: d[0], rv: d[1], n: TORSO_N }); });
    loft(mb, rings, {
      nu: nu, inside: [0, 1.1, 0], w: function (i, j, p) { return torsoW(p, p[1]); }, reg: R.COAT,
      ao: function (i, j, p) { return 1.0 - 0.10 * sm((1.0 - p[1]) / 0.4); }
    });
    // 아랫단 밴드(둥글게 말린 리브)
    var hy = q === 0 ? [0.752, 0.764, 0.791, 0.818, 0.830] : [0.752, 0.778, 0.830], ho = q === 0 ? [0.002, 0.014, 0.017, 0.014, 0.003] : [0.004, 0.016, 0.004], hr = [];
    hy.forEach(function (y, k) { var d = TORSO(y); hr.push({ c: [0, y, d[2]], ru: d[0] + ho[k], rv: d[1] + ho[k], n: TORSO_N }); });
    loft(mb, hr, { nu: q === 0 ? 18 : 10, inside: [0, 0.8, 0], w: function (i, j, p) { return torsoW(p, p[1]); }, reg: R.COATIN, ao: 0.98 });
    // 목 칼라(둥글게 말린 후드 링) + 뒤 후드
    var cy = 1.446, cnu = q === 0 ? 18 : 10, cnv = q === 0 ? 5 : 3, crx = 0.080, crz = 0.077, cr = 0.023;
    surf(mb, {
      nu: cnu, nv: cnv, closed: true, inside: [0, cy, 0.01],
      pt: function (i, j) {
        var a = dense(i / cnu, 0.15), ph = -0.55 * PI + 1.9 * PI * j / cnv, co = Math.cos(ph), si = Math.sin(ph);
        return [(crx + cr * co) * S(Math.sin(a), 2.0), cy + cr * si * 0.9, 0.008 - (crz + cr * co) * S(Math.cos(a), 2.0)];
      },
      w: function (i, j, p) { return torsoW(p, Math.min(1.446, p[1])); }, reg: R.COATIN, ao: 1
    });
    blob(mb, [0, 1.412, 0.074], [0.092, 0.052, 0.050], [0.35, 0, 0], { nu: q === 0 ? 10 : 6, nv: q === 0 ? 5 : 3, w: torsoW([0, 1.41, 0.07], 1.41), reg: R.COAT, ao: 0.9 });
    // 앞주머니(캥거루 포켓)
    if (q === 0) {
      var PU = 7, PV = 4, yc = 0.935, hy2 = 0.075, ha = 0.52;
      surf(mb, {
        nu: PU, nv: PV, closed: false, inside: [0, yc, 0.0],
        pt: function (i, j) {
          var u = i / PU * 2 - 1, v = j / PV * 2 - 1, edge = Math.max(Math.pow(Math.abs(u), 4), Math.pow(Math.abs(v), 4)), m = Math.sqrt(Math.max(0, 1 - edge));
          // 아래가 약간 좁은 사다리꼴
          var uu = u * (1 - 0.06 * (v + 1) * 0.5), y = yc + v * hy2, a = uu * ha * (0.96 + 0.04 * v);
          return torsoPt(y, a, 0.002 + 0.017 * m);
        },
        w: function (i, j, p) { return torsoW(p, p[1]); }, reg: R.POCKET, ao: 1
      });
    }
  }

  // 소매 + 말아올린 소맷부리
  var SLV = [[1.405, 0.002, 0.002], [1.400, 0.030, 0.032], [1.389, 0.049, 0.052], [1.372, 0.056, 0.059], [1.33, 0.056, 0.058], [1.25, 0.054, 0.056], [1.17, 0.051, 0.054], [1.11, 0.049, 0.052],
    [1.05, 0.048, 0.051], [0.96, 0.046, 0.049], [0.90, 0.045, 0.048], [0.870, 0.044, 0.047]];
  function armW(side, y) {
    var ua = side > 0 ? B.uaR : B.uaL, fa = side > 0 ? B.faR : B.faL;
    var wt = sm((1.17 - y) / 0.13), wc = 0.55 * sm((y - 1.37) / 0.10);
    return [[ua, (1 - wt) * (1 - wc)], [B.chest, wc * (1 - wt)], [fa, wt]];
  }
  function buildSleeves(mb, q) {
    var side, sel = q === 0 ? [SLV[0], SLV[1], SLV[2], SLV[3], SLV[5], SLV[7], SLV[9], SLV[11]] : [SLV[0], SLV[2], SLV[5], SLV[8], SLV[11]];
    for (side = -1; side <= 1; side += 2) {
      (function (side) {
        var rings = sel.map(function (s) { return { c: [side * SX, s[0], 0.0], ru: s[1], rv: s[2], y: s[0] }; });
        loft(mb, rings, {
          nu: q === 0 ? 8 : 6, dense: false, inside: [side * SX, 1.15, 0], w: function (i, j, p) { return armW(side, p[1]); },
          reg: R.COAT, ao: function (i, j, p) { return 1.02 - 0.08 * sm((1.2 - p[1]) / 0.3); }
        });
        // 소맷부리(말아올린 리브)
        var cyv = q === 0 ? [0.842, 0.851, 0.872, 0.894, 0.903] : [0.842, 0.870, 0.903], cro = q === 0 ? [0.026, 0.044, 0.050, 0.044, 0.026] : [0.030, 0.050, 0.030], cr = cyv.map(function (y, k) { return { c: [side * SX, y, 0], ru: cro[k] * 0.98, rv: cro[k] }; });
        loft(mb, cr, { nu: q === 0 ? 8 : 6, dense: false, inside: [side * SX, 0.87, 0], w: function (i, j, p) { return armW(side, p[1]); }, reg: R.CUFF, ao: 1 });
      })(side);
    }
  }

  // 바지(통 넓은 와이드 팬츠) + 골반 + 말아올린 밑단
  var PANT = profile([
    [0.935, 0.088, 0.096, 0.003], [0.88, 0.094, 0.103, 0.003], [0.80, 0.092, 0.099, 0], [0.70, 0.087, 0.093, -0.002], [0.60, 0.080, 0.085, -0.003],
    [0.50, 0.074, 0.079, -0.004], [0.43, 0.072, 0.076, 0.0], [0.35, 0.070, 0.075, 0.004], [0.26, 0.069, 0.073, 0.004], [0.17, 0.068, 0.072, 0.002], [0.12, 0.068, 0.072, 0.0]
  ]);
  function legW(side, y) {
    var ul = side > 0 ? B.ulR : B.ulL, ll = side > 0 ? B.llR : B.llL, ft = side > 0 ? B.ftR : B.ftL;
    var th = sm((0.95 - y) / 0.10), kn = sm((0.55 - y) / 0.10), an = sm((0.13 - y) / 0.05) * 0.45;
    var wh = 1 - th, wu = th * (1 - kn), wl = kn * (1 - an), wf = kn * an;
    return [[B.hips, wh], [ul, wu], [ll, wl], [ft, wf]];
  }
  function buildPants(mb, q) {
    var ys = q === 0 ? [0.935, 0.85, 0.72, 0.60, 0.50, 0.40, 0.28, 0.13] : [0.935, 0.70, 0.48, 0.30, 0.13], side, nl = q === 0 ? 10 : 6;
    for (side = -1; side <= 1; side += 2) {
      (function (side) {
        var rings = ys.map(function (y) { var d = PANT(y); return { c: [side * HX, y, d[2]], ru: d[0], rv: d[1], y: y }; });
        loft(mb, rings, { nu: nl, dense: false, inside: [side * HX, 0.5, 0], w: function (i, j, p) { return legW(side, p[1]); }, reg: R.PANTS, ao: function (i, j, p) { return 0.93 + 0.07 * sm((p[1] - 0.2) / 0.5); } });
        // 말아올린 밑단
        var cy2 = q === 0 ? [0.108, 0.118, 0.150, 0.182, 0.194] : [0.108, 0.150, 0.194], co = q === 0 ? [0.002, 0.014, 0.018, 0.014, 0.002] : [0.004, 0.018, 0.004];
        loft(mb, cy2.map(function (y, k) { var d = PANT(y); return { c: [side * HX, y, d[2]], ru: d[0] + co[k], rv: d[1] + co[k] }; }),
          { nu: nl, dense: false, inside: [side * HX, 0.15, 0], w: function (i, j, p) { return legW(side, p[1]); }, reg: R.PCUFF, ao: 1 });
        // 발목(피부)
        if (q === 0) { var ar = [0.150, 0.110, 0.078].map(function (y) { return { c: [side * HX, y, 0.0], ru: 0.034, rv: 0.036, w: legW(side, y) }; });
        loft(mb, ar, { nu: 8, dense: false, reg: R.SKIN, ao: 0.9 }); }
      })(side);
    }
    var pr = [[1.00, 0.158, 0.118], [0.94, 0.172, 0.124], [0.86, 0.176, 0.124], [0.80, 0.11, 0.10]].map(function (r) { return { c: [0, r[0], 0], ru: r[1], rv: r[2] }; });
    loft(mb, pr, { nu: q === 0 ? 10 : 6, dense: false, w: [[B.hips, 1]], reg: R.PANTS, ao: 0.85 });
  }

  // 신발: 통통한 스니커즈(길이 방향 = z). 밑창은 별도의 납작한 둥근 덩어리.
  var SHOE = [[0.082, 0.0, 0.0], [0.078, 0.030, 0.030], [0.058, 0.046, 0.050], [0.020, 0.052, 0.058], [-0.030, 0.053, 0.056], [-0.090, 0.053, 0.050],
    [-0.150, 0.050, 0.042], [-0.200, 0.040, 0.030], [-0.232, 0.0, 0.0]];
  function buildShoes(mb, q) {
    var side, sel = q === 0 ? SHOE : [SHOE[0], SHOE[2], SHOE[4], SHOE[6], SHOE[8]];
    for (side = -1; side <= 1; side += 2) {
      var wf = [[B['ft' + (side > 0 ? 'R' : 'L')], 1]];
      var rings = sel.map(function (s, k) {
        var pole = s[1] === 0, cy = pole ? 0.046 : 0.022 + s[2] * 0.95;
        return { c: [side * HX, pole ? (k === 0 ? 0.046 : 0.040) : cy, s[0]], ru: Math.max(s[1], 0.001), rv: Math.max(s[2], 0.001), u: [1, 0, 0], v: [0, 1, 0], n: 2.2 };
      });
      loft(mb, rings, { nu: q === 0 ? 10 : 8, dense: false, inside: [side * HX, 0.05, -0.06], w: wf, reg: R.SHOE, ao: function (i, j, p) { return 0.88 + 0.14 * sm((p[1] - 0.03) / 0.08); } });
      blob(mb, [side * HX, 0.017, -0.074], [0.058, 0.019, 0.170], [0, 0, 0], { nu: q === 0 ? 10 : 6, nv: q === 0 ? 5 : 3, w: wf, reg: R.SOLE, ao: 0.95 });
    }
  }

  // 손: 둥근 벙어리장갑 모양(엄지 혹 포함). side=+1 오른손.
  var PALM = [[0.872, 0.021, 0.024, 0.0], [0.846, 0.022, 0.027, 0.0], [0.822, 0.026, 0.036, -0.002], [0.794, 0.028, 0.041, -0.002], [0.766, 0.026, 0.039, 0.0], [0.744, 0.019, 0.029, 0.0], [0.732, 0.008, 0.015, 0.0]];
  function handW(side, y) {
    var fa = side > 0 ? B.faR : B.faL, ha = side > 0 ? B.haR : B.haL, t = sm((0.866 - y) / 0.03);
    return [[fa, 1 - t], [ha, t]];
  }
  function buildHand(mb, side, q) {
    var ha = side > 0 ? B.haR : B.haL, near = q === 0;
    var pal = near ? PALM : [PALM[0], PALM[3], PALM[5], PALM[6]];
    var rings = pal.map(function (r) { return { c: [side * SX, r[0], r[3]], ru: r[1], rv: r[2], y: r[0] }; });
    loft(mb, rings, { nu: near ? 8 : 5, dense: false, inside: [side * SX, 0.8, 0], w: function (i, j, p) { return handW(side, p[1]); }, reg: R.SKIN, ao: 0.98, tn: function () { return 0.1; } });
    // 엄지(둥근 혹, 앞쪽-안쪽)
    blob(mb, [side * SX - side * 0.010, 0.800, -0.036], [0.015, 0.032, 0.016], [0.0, 0, side * 0.0], { nu: near ? 8 : 5, nv: near ? 5 : 3, w: [[ha, 1]], reg: R.SKIN, ao: 0.98 });
  }
  // 근거리/중거리 조립 -----------------------------------------------------
  function assemble(q, style) {
    var s = new MB(), c = new MB();
    buildHead(s, q); buildFace(s, q);
    buildHair(s, style, q);
    buildNeck(s, q);
    buildHand(s, -1, q); buildHand(s, 1, q); buildShoes(s, q);
    buildCoat(c, q); buildSleeves(c, q); buildPants(c, q);
    return { smooth: s, cloth: c };
  }
  // ------------------------------------------------------------------ 원거리 임포스터(스킨 없음, 포즈별 3종)
  function buildFar(variant) {   // 0 서기, 1 앉기, 2 앉아 기도
    var m = new MB(), sit = variant > 0, dy = sit ? -0.351 : 0, dz = sit ? SEAT_BACK : 0, side;
    function Wn() { return [[0, 1]]; }
    var yy = sit ? [1.455, 1.30, 1.10, 0.90] : [1.455, 1.30, 1.10, 0.90, 0.72], rings = [];
    yy.forEach(function (y) { var d = TORSO(y); rings.push({ c: [0, y + dy, d[2] + dz - (variant === 2 ? (y - 0.9) * 0.18 : 0)], ru: d[0], rv: d[1], n: 2.3 }); });
    loft(m, rings, { nu: 7, dense: false, w: Wn, reg: R.COAT, ao: 1, inside: [0, 1.1 + dy, dz] });
    for (side = -1; side <= 1; side += 2) {
      var pts = sit ? [[side * HX, 0.58, dz], [side * HX, 0.53, dz - 0.15], [side * HX, 0.50, dz - 0.36], [side * HX, 0.28, dz - 0.40], [side * HX, 0.07, dz - 0.40]]
        : [[side * HX, 0.90, 0], [side * HX, 0.60, 0], [side * HX, 0.35, 0], [side * HX, 0.07, 0]];
      tube(m, pts, sit ? [0.092, 0.08, 0.07, 0.07, 0.062] : [0.098, 0.078, 0.072, 0.068], { nu: 5, w: Wn, reg: R.PANTS, ao: 0.95, caps: 'end' });
      var ap = variant === 2 ? [[side * 0.185, 1.40 + dy, dz], [side * 0.16, 1.25 + dy, dz - 0.10], [side * 0.03, 1.28 + dy, dz - 0.19]] : [[side * 0.185, 1.40 + dy, dz], [side * 0.205, 1.10 + dy, dz - 0.02], [side * 0.20, 0.86 + dy, dz - 0.05]];
      if (sit && variant === 1) ap = [[side * 0.185, 1.40 + dy, dz], [side * 0.195, 1.12 + dy, dz - 0.03], [side * 0.10, 0.92 + dy, dz - 0.19]];
      tube(m, ap, [0.062, 0.052, 0.045], { nu: 5, w: Wn, reg: R.COAT, ao: 1, caps: 'end' });
    }
    var hy = HC + dy, hz = dz + (variant === 2 ? -0.05 : 0), hyy = variant === 2 ? hy - 0.02 : hy, hr = variant === 2 ? 0.5 : 0;
    blob(m, [0, hyy, hz], [WW, HH, DD], [hr, 0, 0], { nu: 8, nv: 5, w: Wn, reg: R.SKIN, ao: 1 });
    blob(m, [0, hyy + 0.006, hz + 0.012], [WW + 0.008, HH + 0.004, DD + 0.008], [hr - 0.4, 0, 0], { nu: 8, nv: 4, th1: PI * 0.55, w: Wn, reg: R.HAIR, ao: 0.95 });
    blob(m, [0, hyy - 0.12, hz + 0.0], [0.05, 0.05, 0.05], [0, 0, 0], { nu: 5, nv: 3, w: Wn, reg: R.SKIN, ao: 0.6 });
    return m;
  }

  // ------------------------------------------------------------------ 색 + 패킹
  function lin(hex) { var c = new T.Color(hex); return [c.r, c.g, c.b]; }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function mul(a, k) { return [a[0] * k, a[1] * k, a[2] * k]; }
  var colCache = {};
  function colors(cfg) {
    var key = cfg.skin + '_' + cfg.hair + '_' + cfg.outfit;
    if (colCache[key]) return colCache[key];
    var skin = lin(P.skin[cfg.skin]), hair = lin(P.hair[cfg.hair]), oc = lin(P.outfit[cfg.outfit]);
    var pants = lin((P.pants && P.pants[cfg.outfit]) || '#5C7FA8');
    var t = [];
    t[R.SKIN] = skin;
    t[R.LIP] = mix(mul(skin, 0.42), [0.22, 0.03, 0.03], 0.35);
    t[R.EYE] = lin('#2a2830');
    t[R.BROW] = mix(hair, [0.01, 0.01, 0.01], 0.12);
    t[R.HAIR] = hair;
    t[R.TIE] = mix(oc, [1, 1, 1], 0.12);
    t[R.SHOE] = mix(oc, [1, 1, 1], 0.42); t[R.SOLE] = lin('#f3eee6');
    t[R.COAT] = oc; t[R.COATIN] = mul(oc, 0.86); t[R.POCKET] = mul(oc, 0.93);
    t[R.CUFF] = mix(oc, [1, 1, 1], 0.10);
    t[R.PANTS] = pants; t[R.PCUFF] = mix(pants, [1, 1, 1], 0.10);
    t.blush = [Math.min(1, skin[0] * 1.05 + 0.05), skin[1] * 0.66, skin[2] * 0.70];
    colCache[key] = t;
    return t;
  }
  function colorAttr(mb, tab) {
    var n = mb.vc, arr = new Float32Array(n * 3), i, rg, c, ao, tn, bl = tab.blush;
    for (i = 0; i < n; i++) {
      rg = mb.reg[i]; c = tab[rg]; ao = mb.ao[i]; tn = mb.tn[i];
      var r = c[0], g = c[1], b = c[2];
      if (tn > 0 && rg === R.SKIN) { var k = Math.min(1, tn) * 0.62; r += (bl[0] - r) * k; g += (bl[1] - g) * k; b += (bl[2] - b) * k; }
      if (rg === R.SKIN) { r *= Math.min(1.05, ao + (1 - ao) * 0.5); g *= ao; b *= ao * 0.98; }
      else { r *= ao; g *= ao; b *= ao; }
      arr[i * 3] = r; arr[i * 3 + 1] = g; arr[i * 3 + 2] = b;
    }
    return new T.BufferAttribute(arr, 3);
  }
  // 기하(색 제외) 패킹: 위치·법선·스킨 가중치·인덱스는 모든 아바타가 공유한다
  function pack(mb, skinned) {
    var g = { mb: mb, tris: mb.tris(), attrs: {} };
    g.attrs.position = new T.BufferAttribute(new Float32Array(mb.pos), 3);
    g.attrs.normal = new T.BufferAttribute(new Float32Array(mb.nor), 3);
    if (skinned) {
      g.attrs.skinIndex = new T.BufferAttribute(new Uint16Array(mb.si), 4);
      g.attrs.skinWeight = new T.BufferAttribute(new Float32Array(mb.sw), 4);
    }
    g.index = new T.BufferAttribute(new Uint16Array(mb.idx), 1);
    g.colorCache = {};
    return g;
  }
  var BOUND = new T.Sphere(new T.Vector3(0, 0.85, 0), 1.25);
  function geomWithColor(packed, tab, key) {
    var hit = packed.colorCache[key];
    if (hit) return hit;
    var g = new T.BufferGeometry();
    for (var k in packed.attrs) g.setAttribute(k, packed.attrs[k]);
    g.setIndex(packed.index);
    g.setAttribute('color', colorAttr(packed.mb, tab));
    g.boundingSphere = BOUND.clone();
    packed.colorCache[key] = g;
    return g;
  }
  var packs = { near: {}, mid: {}, far: {} };
  function getPack(level, kind, style) {
    var key = kind === 'smooth' ? kind + style : kind, P0 = packs[level];
    if (!P0[key]) {
      var set = level === 'near' ? 0 : 1;
      if (kind === 'smooth') { var a = assemble(set, style); P0[key] = pack(a.smooth, true); P0.cloth = P0.cloth || pack(a.cloth, true); }
      else { var b = assemble(set, 0); P0.cloth = pack(b.cloth, true); }
    }
    return P0[key];
  }
  var farPacks = [];
  function getFar(variant) { return farPacks[variant] || (farPacks[variant] = pack(buildFar(variant), false)); }

  // 재질 --------------------------------------------------------------------
  var mats = null;
  function getMats() {
    if (mats) return mats;
    mats = {
      smooth: new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.74, metalness: 0, emissive: 0x24100a, emissiveIntensity: 0.4, envMapIntensity: 0.8, side: T.DoubleSide }),
      cloth: new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0, envMapIntensity: 0.75, side: T.DoubleSide }),
      far: new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0, envMapIntensity: 0.7 })
    };
    return mats;
  }

  // ------------------------------------------------------------------ 뼈대 공유 자료
  var BONE_INV = null, IDENT = new T.Matrix4();
  function makeBones() {
    var bones = [], i;
    for (i = 0; i < BN.length; i++) {
      var b = new T.Bone(); b.name = BN[i];
      var pa = BPAR[i] >= 0 ? BABS[BPAR[i]] : [0, 0, 0];
      b.position.set(BABS[i][0] - pa[0], BABS[i][1] - pa[1], BABS[i][2] - pa[2]);
      if (BPAR[i] >= 0) bones[BPAR[i]].add(b);
      bones.push(b);
    }
    return bones;
  }
  function boneInverses() {
    if (BONE_INV) return BONE_INV;
    var bones = makeBones(), inv = [], i;
    bones[0].updateMatrixWorld(true);
    for (i = 0; i < bones.length; i++) inv.push(bones[i].matrixWorld.clone().invert());
    BONE_INV = inv;
    return inv;
  }

  // ------------------------------------------------------------------ 이름표·그림자
  var tagCache = {};
  function tagMaterial(nameIdx) {
    if (tagCache[nameIdx]) return tagCache[nameIdx];
    var text = P.names[nameIdx] || '';
    var c = G.makeCanvas(256, 64), g = c.getContext('2d');
    g.font = '600 27px "Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",sans-serif';
    var w = Math.min(236, g.measureText(text).width + 34), x = (256 - w) / 2;
    g.fillStyle = 'rgba(250,246,238,0.80)';
    g.beginPath();
    if (g.roundRect) g.roundRect(x, 12, w, 40, 20); else g.rect(x, 12, w, 40);
    g.fill();
    g.lineWidth = 1.5; g.strokeStyle = 'rgba(90,70,55,0.25)'; g.stroke();
    g.fillStyle = '#3d312a'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, 128, 33);
    var t = new T.CanvasTexture(c);
    t.encoding = T.sRGBEncoding;
    var m = new T.SpriteMaterial({ map: t, transparent: true, depthWrite: false, fog: false });
    tagCache[nameIdx] = m;
    return m;
  }
  var shadowMat = null, shadowGeo = null;
  function getShadowMat() {
    if (shadowMat) return shadowMat;
    var t = G.canvasTexture(64, 64, function (g, w, h) {
      var gr = g.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
      gr.addColorStop(0, 'rgba(40,28,22,0.38)'); gr.addColorStop(0.55, 'rgba(40,28,22,0.18)'); gr.addColorStop(1, 'rgba(40,28,22,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    }, false);
    shadowMat = new T.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, fog: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    return shadowMat;
  }

  // ------------------------------------------------------------------ 포즈 계산 도우미
  var _q1 = new T.Quaternion(), _q2 = new T.Quaternion(), _q3 = new T.Quaternion(), _qa = new T.Quaternion(), _qb = new T.Quaternion(), _qc = new T.Quaternion();
  var _e = new T.Euler(), _v = new T.Vector3(), _m = new T.Matrix4(), _x = new T.Vector3(), _y = new T.Vector3(), _z = new T.Vector3();
  var DOWN = new T.Vector3(0, -1, 0);
  function setE(b, x, y, z) { _e.set(x, y, z, 'YXZ'); b.quaternion.setFromEuler(_e); }

  // 2관절 팔 IK (가슴 로컬). 어깨 = (side*SX, SH_Y, 0). 결과: qU(위팔), qF(아래팔; 위팔 기준)
  function arm2(side, tx, ty, tz, px, py, pz, qU, qF) {
    var sx = side * SX, sy = SH_Y, dx = tx - sx, dy = ty - sy, dz = tz, d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-4;
    var maxd = ARM_A + ARM_B - 0.004, mind = Math.abs(ARM_A - ARM_B) + 0.02;
    var dc = clamp(d, mind, maxd), ux = dx / d, uy = dy / d, uz = dz / d;
    var along = (ARM_A * ARM_A + dc * dc - ARM_B * ARM_B) / (2 * dc), h = Math.sqrt(Math.max(0, ARM_A * ARM_A - along * along));
    var dot = px * ux + py * uy + pz * uz, ox = px - dot * ux, oy = py - dot * uy, oz = pz - dot * uz, ol = Math.sqrt(ox * ox + oy * oy + oz * oz) || 1;
    ox /= ol; oy /= ol; oz /= ol;
    var ex = ux * along + ox * h, ey = uy * along + oy * h, ez = uz * along + oz * h;
    var wx = ux * dc, wy = uy * dc, wz = uz * dc;
    _v.set(ex, ey, ez).multiplyScalar(1 / ARM_A);
    qU.setFromUnitVectors(DOWN, _v);
    _v.set(wx - ex, wy - ey, wz - ez).multiplyScalar(1 / ARM_B).applyQuaternion(_q3.copy(qU).invert());
    qF.setFromUnitVectors(DOWN, _v);
  }
  // 손 방향(가슴 로컬): 손가락 방향 F, 손바닥이 향하는 방향 N. 오른쪽 손바닥은 로컬 -x, 왼쪽은 +x.
  function handQ(side, fx, fy, fz, nx, ny, nz, out) {
    _y.set(-fx, -fy, -fz).normalize();
    _x.set(-side * nx, -side * ny, -side * nz);
    _x.addScaledVector(_y, -_x.dot(_y)).normalize();
    _z.crossVectors(_x, _y);
    _m.makeBasis(_x, _y, _z);
    out.setFromRotationMatrix(_m);
  }

  // ------------------------------------------------------------------ 아바타
  var EMOTE_DUR = [2.4, 3.4, 1.7];
  // 성호 경로(오른손, 가슴 로컬): 이마 → 가슴 → 왼어깨 → 오른어깨. [손목 x,y,z, 손가락 F(x,y,z), 손바닥 N(x,y,z)]
  var CROSS = [
    [0.02, 0.37, -0.15, 0, 0.88, 0.48, 0, -0.48, 0.88],
    [0.03, 0.0, -0.17, -0.25, 0.9, -0.1, 0, 0.1, 1],
    [-0.115, 0.14, -0.16, -0.95, 0.3, 0.0, 0, 0.05, 1],
    [0.125, 0.15, -0.16, 0.95, 0.3, 0.0, 0, 0.05, 1]
  ];

  function Avatar(cfg, opts) {
    opts = opts || {};
    var M = getMats();
    this.root = new T.Group();
    this.bones = makeBones();
    this.skeleton = new T.Skeleton(this.bones, boneInverses());
    this.body = new T.Group(); this.body.add(this.bones[0]); this.root.add(this.body);
    this.meshes = { near: {}, mid: {} };
    this.imp = null; this.impKey = '';
    if (!shadowGeo) shadowGeo = new T.PlaneGeometry(1, 1).rotateX(-PI / 2);
    this.shadow = new T.Mesh(shadowGeo, getShadowMat()); this.shadow.scale.set(0.9, 1, 0.9); this.shadow.position.y = 0.03; this.shadow.renderOrder = 2;
    this.root.add(this.shadow);
    this.tag = null; this.showTag = opts.showTag !== false;
    this.walkTarget = 0; this.walkAmt = 0; this.phase = Math.random() * 6;
    this.sitTarget = 0; this.sitAmt = 0; this.prayTarget = 0; this.prayAmt = 0;
    this.emote = -1; this.emoteT = 0; this.nod = false; this.nodPh = Math.random() * 6;
    this.off = Math.random() * 6.28;
    this.cfg = null; this.key = '';
    this.lod = -1;
    this.qs = {}; this._init();
    this.setConfig(cfg);
    this.setLod(0);
  }
  Avatar.prototype._init = function () {
    // 팔 포즈 후보(서기 FK / 무릎 위 / 기도 / 이모트) 임시 쿼터니언
    var o = this.qs;
    ['U', 'F', 'H'].forEach(function (k) { o['b' + k] = [new T.Quaternion(), new T.Quaternion()]; o['l' + k] = [new T.Quaternion(), new T.Quaternion()]; o['p' + k] = [new T.Quaternion(), new T.Quaternion()]; o['e' + k] = new T.Quaternion(); });
    o.eF2 = new T.Quaternion();
  };
  Avatar.prototype.setConfig = function (cfg) {
    cfg = cfg || {};
    var c = { skin: (cfg.skin | 0) % 4, style: (cfg.style | 0) % 4, hair: (cfg.hair | 0) % 10, outfit: (cfg.outfit | 0) % 12, name: (cfg.name | 0) % 40 };
    if (c.skin < 0) c.skin = 0; if (c.style < 0) c.style = 0; if (c.hair < 0) c.hair = 0; if (c.outfit < 0) c.outfit = 0; if (c.name < 0) c.name = 0;
    this.cfg = c;
    this.key = c.skin + '_' + c.style + '_' + c.hair + '_' + c.outfit;
    this._applyGeom();
    if (this.showTag) {
      if (!this.tag) { this.tag = new T.Sprite(tagMaterial(c.name)); this.tag.scale.set(0.78, 0.195, 1); this.tag.position.y = 1.9; this.tag.renderOrder = 8; this.root.add(this.tag); this.tag.visible = this.lod <= 0; }
      else this.tag.material = tagMaterial(c.name);
    }
  };
  Avatar.prototype._mesh = function (level, kind) {
    var set = this.meshes[level];
    if (!set[kind]) {
      var m = new T.SkinnedMesh(new T.BufferGeometry(), kind === 'smooth' ? getMats().smooth : getMats().cloth);
      m.bind(this.skeleton, IDENT); m.castShadow = true; m.receiveShadow = true;
      m.frustumCulled = true;
      this.body.add(m); set[kind] = m;
    }
    return set[kind];
  };
  Avatar.prototype._applyGeom = function () {
    var c = this.cfg, tab = colors(c), l = this.lod;
    if (l < 0) return;
    if (l <= 1) {
      var level = l === 0 ? 'near' : 'mid';
      var ps = getPack(level, 'smooth', c.style), pc = getPack(level, 'cloth', 0);
      this._mesh(level, 'smooth').geometry = geomWithColor(ps, tab, 's' + c.style + '_' + c.skin + '_' + c.hair + '_' + c.outfit);
      this._mesh(level, 'cloth').geometry = geomWithColor(pc, tab, 'c' + c.skin + '_' + c.hair + '_' + c.outfit);
    } else {
      this._applyFar(this._variant());
    }
  };
  Avatar.prototype._variant = function () { return this.sitAmt > 0.5 ? (this.prayAmt > 0.5 ? 2 : 1) : 0; };
  Avatar.prototype._applyFar = function (v) {
    var c = this.cfg, key = v + '_' + c.skin + '_' + c.hair + '_' + c.outfit;
    if (!this.imp) { this.imp = new T.Mesh(new T.BufferGeometry(), getMats().far); this.imp.receiveShadow = true; this.imp.castShadow = false; this.root.add(this.imp); }
    if (this.impKey === key) return;
    this.impKey = key;
    this.imp.geometry = geomWithColor(getFar(v), colors(c), 'f' + key);
  };
  // 거리별 단계: 0 근접(이름표 O), 1 중간(이름표 X, 단순 형상), 2 원거리(임포스터)
  Avatar.prototype.setLod = function (l) {
    if (l === this.lod) return;
    var prev = this.lod; this.lod = l;
    if (this.tag) this.tag.visible = l === 0;
    this.shadow.visible = l < 2;
    if (l === 2) {
      if (this.body.parent) this.root.remove(this.body);
      this._fv = this._variant(); this._applyFar(this._fv);
      this.imp.visible = true;
    } else {
      if (!this.body.parent) this.root.add(this.body);
      if (this.imp) this.imp.visible = false;
      this._applyGeom();
      var near = this.meshes.near, mid = this.meshes.mid;
      if (near.smooth) near.smooth.visible = near.cloth.visible = l === 0;
      if (mid.smooth) mid.smooth.visible = mid.cloth.visible = l === 1;
    }
  };
  Avatar.prototype.lod = 0;
  Avatar.prototype.seatLift = 0.45;
  Avatar.prototype.setWalk = function (v) { this.walkTarget = v; };
  Avatar.prototype.setSeated = function (b) { this.sitTarget = b ? 1 : 0; };
  Avatar.prototype.setPray = function (b) { this.prayTarget = b ? 1 : 0; };
  Avatar.prototype.playEmote = function (e) { this.emote = e | 0; this.emoteT = 0; };
  Avatar.prototype.setPose = function (x, y, z, yaw) { this.root.position.set(x, y, z); this.root.rotation.y = yaw; };
  Avatar.prototype.snapPose = function () { this.sitAmt = this.sitTarget; this.prayAmt = this.prayTarget; this.walkAmt = this.walkTarget; };

  var LAP_T = [[0.095, -0.205, -0.19], [0.0, -1, 0]];   // 무릎 위 손목 목표(가슴 로컬)

  Avatar.prototype.update = function (dt, t) {
    var k = Math.min(1, dt * 10);
    this.walkAmt += (this.walkTarget - this.walkAmt) * k;
    this.sitAmt += (this.sitTarget - this.sitAmt) * Math.min(1, dt * 7);
    this.prayAmt += (this.prayTarget - this.prayAmt) * Math.min(1, dt * 5);
    var sa = this.sitAmt, w = this.walkAmt * (1 - sa), pa = this.prayAmt * sa;
    // 걸음 속도: 보폭과 주기를 맞춰 발이 미끄러지지 않게(이동속도 ≈ 3.2*walkAmt m/s)
    var A = (0.10 + 0.36 * w) * sm(w * 6);
    if (w > 0.01) {
      var vReal = 3.2 * w, stepLen = Math.max(0.25, 2 * 0.84 * Math.sin(Math.min(0.9, A)) * 0.95);
      this.phase += dt * PI * vReal / stepLen;
    }
    var emoting = this.emote >= 0, eU = 0, eEnv = 0;
    if (emoting) {
      this.emoteT += dt; eU = this.emoteT / EMOTE_DUR[this.emote];
      if (eU >= 1) { this.emote = -1; emoting = false; eU = 0; } else eEnv = Math.min(sm(eU / 0.12), sm((1 - eU) / 0.12));
    }
    var bow = emoting && this.emote === 2 ? Math.sin(eU * PI) : 0;
    if (this.lod === 2) {
      var fv = this._variant();
      if (fv !== this._fv) { this._fv = fv; this._applyFar(fv); }
      this.shadow.visible = false;
      return;
    }
    var bs = this.bones, ph = this.phase, thR = ph, thL = ph + PI;
    var sR = Math.sin(thR);
    var br = Math.sin(t * 1.6 + this.off);          // 숨쉬기
    var ws = Math.sin(t * 0.7 + this.off) * (1 - w) * (1 - sa);   // 체중 이동

    // ---- 다리 각도(서기: 보행/대기, 앉기: 90도 굽힘) ----
    function wrapA(a) { a = (a + PI) % TAU; if (a < 0) a += TAU; return a - PI; }
    function kneeFlex(th, Kmax) { var d1 = wrapA(th + 0.4) / 0.95, d2 = wrapA(th - PI / 2 - 0.55) / 0.5; return 0.06 + Kmax * Math.exp(-d1 * d1) + 0.22 * w * Math.exp(-d2 * d2); }
    var Kmax = 0.30 + 0.8 * w;
    var hR = A * Math.sin(thR) + 0.03 * w, hL = A * Math.sin(thL) + 0.03 * w;
    var kR = kneeFlex(thR, Kmax), kL = kneeFlex(thL, Kmax);
    var relax = Math.max(0, ws) * 0.06, relaxL = Math.max(0, -ws) * 0.06;
    kR += relax * (1 - w); kL += relaxL * (1 - w);
    var t1R = lerp(hR, 1.45, sa), t1L = lerp(hL, 1.45, sa);
    var t2R = lerp(-kR, -1.65, sa), t2L = lerp(-kL, -1.65, sa);
    // 발 피치(바닥과 평행 + 걸을 때 앞꿈치 들기/발끝 뒤꿈치)
    function footPitch(h, a, sw) { return (-0.5 * sm((-h / Math.max(a, 0.05) - 0.35) / 0.65) + 0.18 * sm((h / Math.max(a, 0.05) - 0.5) / 0.5)) * sw; }
    var pR = footPitch(hR, A, w), pL = footPitch(hL, A, w);
    var fR = pR - (t1R + t2R), fL = pL - (t1L + t2L);
    // 골반 높이: 발이 바닥 아래로 가지 않도록(더 낮은 쪽 다리에 맞춤)
    var hjR = ANKLE + LEN_T * Math.cos(t1R) + LEN_S * Math.cos(t1R + t2R), hjL = ANKLE + LEN_T * Math.cos(t1L) + LEN_S * Math.cos(t1L + t2L);
    var hipJ = Math.max(hjR, hjL);
    var bob = Math.sin(t * 2.1 + this.off) * 0.0015;
    var hips = bs[B.hips];
    hips.position.set(0.012 * ws + 0.008 * w * sR * 0.0, hipJ + (HIPS_Y - HIP_JOINT) + bob, SEAT_BACK * sa);
    setE(bs[B.ulR], t1R, 0, -0.019 * ws + 0.05 * sa + (-0.02) * w * 0);
    setE(bs[B.ulL], t1L, 0, -0.019 * ws - 0.05 * sa);
    setE(bs[B.llR], t2R, 0, 0); setE(bs[B.llL], t2L, 0, 0);
    setE(bs[B.ftR], fR, -0.12 * (1 - sa * 0.5), 0); setE(bs[B.ftL], fL, 0.12 * (1 - sa * 0.5), 0);

    // ---- 몸통 ----
    var turn = 0.075 * (0.5 + w) * sR * w;
    var lean = -0.04 * w;
    var hipsRy = turn, spineRy = -0.8 * turn, chestRy = -0.8 * turn;
    var spX = lerp(lean - 0.02, -0.02, sa) + (-0.10) * pa + (-0.40) * bow;
    var chX = lerp(-0.012 + br * 0.006, -0.03, sa) + (-0.07) * pa + (-0.25) * bow;
    setE(hips, 0, hipsRy, 0.0);
    setE(bs[B.skirt], -0.30 * sa, 0, 0); bs[B.skirt].scale.set(1, lerp(1, 0.30, sa), 1);
    var ck = 0.45 + 0.5 * sa;
    setE(bs[B.ckR], t1R * ck, 0, 0.04 * sa); setE(bs[B.ckL], t1L * ck, 0, -0.04 * sa);
    setE(bs[B.spine], spX, spineRy, -0.012 * ws * 0);
    setE(bs[B.chest], chX, chestRy, 0.012 * ws);
    bs[B.chest].scale.y = 1 + br * 0.005;
    // 머리·목
    var nodv = 0;
    if (this.nod && pa > 0.5) { var ph2 = Math.sin(t * 0.55 + this.nodPh); nodv = ph2 > 0.93 ? (ph2 - 0.93) * 4 : 0; }
    var gaze = Math.sin(t * 0.37 + this.off) * Math.sin(t * 0.11 + this.off * 2) * (1 - pa);
    setE(bs[B.neck], 0.02 - 0.20 * pa - 0.12 * bow - nodv * 0.4, (gaze * 0.12) * (1 - w) - (hipsRy + spineRy + chestRy) * 0.0, Math.sin(ph * 0.5) * 0.03 * w);
    setE(bs[B.head], -0.02 - 0.28 * pa - 0.10 * bow - nodv * 0.6 + 0.02 * Math.sin(t * 0.9 + this.off), (gaze * 0.2) * (1 - w) + (-(hipsRy + spineRy + chestRy)) * 0.5, 0);

    // ---- 팔 ----
    var armA = 0.12 + 0.5 * w, elb = 0.22 + 0.5 * w + 0.04 * br, side, qs = this.qs;
    var weightL = sa, weightP = pa;
    for (side = -1; side <= 1; side += 2) {
      var ua = bs[side > 0 ? B.uaR : B.uaL], fa = bs[side > 0 ? B.faR : B.faL], ha = bs[side > 0 ? B.haR : B.haL];
      var sw = (side > 0 ? -1 : 1) * sR;   // 오른팔은 오른다리 반대로
      var fwd = Math.max(0, sw);
      var idx = side > 0 ? 1 : 0;
      // 서기 FK
      var uxr = armA * sw * 1.0 + 0.55 * bow, uzr = side * (0.07 + 0.02 * w);
      _e.set(uxr, 0, uzr, 'YXZ'); qs.bU[idx].setFromEuler(_e);
      _e.set(elb + 0.35 * w * fwd, 0, 0, 'YXZ'); qs.bF[idx].setFromEuler(_e);
      _e.set(0.10, 0, side * 0.05, 'YXZ'); qs.bH[idx].setFromEuler(_e);
      // 포즈: 서기 → 무릎 위 → 기도 → 이모트
      var qU = _qa.copy(qs.bU[idx]), qF = _qb.copy(qs.bF[idx]), qH = _qc.copy(qs.bH[idx]);
      if (sa > 0.001) {
        arm2(side, side * 0.088, -0.20, -0.19, side * 0.5, -0.9, 0.5, qs.lU[idx], qs.lF[idx]);
        handQ(side, -side * 0.1, -0.25, -0.96, 0, -1, 0, _q1);
        qs.lH[idx].copy(_q2.copy(qs.lU[idx]).multiply(qs.lF[idx]).invert()).multiply(_q1);
        qU.slerp(qs.lU[idx], sa); qF.slerp(qs.lF[idx], sa); qH.slerp(qs.lH[idx], sa);
      }
      if (pa > 0.001) {
        arm2(side, side * 0.021, 0.065, -0.185, side * 0.55, -1, 0.35, qs.pU[idx], qs.pF[idx]);
        handQ(side, 0, 0.72, -0.69, -side, 0, 0, _q1);
        qs.pH[idx].copy(_q2.copy(qs.pU[idx]).multiply(qs.pF[idx]).invert()).multiply(_q1);
        qU.slerp(qs.pU[idx], pa); qF.slerp(qs.pF[idx], pa); qH.slerp(qs.pH[idx], pa);
      }
      if (emoting && side > 0 && eEnv > 0.001 && this.emote < 2) {
        var tx, ty, tz, fx, fy, fz, nx, ny, nz, px = 0.6, py = -1, pz = 0.3;
        if (this.emote === 0) {
          var wv = Math.sin(this.emoteT * 11) * 0.38;
          tx = 0.20; ty = 0.30; tz = -0.12; fx = Math.sin(wv); fy = Math.cos(wv); fz = -0.22; nx = 0; ny = 0; nz = -1; px = 0.9; py = -0.8; pz = 0.3;
        } else {
          var u = clamp((eU - 0.12) / 0.76, 0, 0.999) * 4, ix = Math.floor(u), f = sm(u - ix);
          var Ak = CROSS[Math.min(3, ix)], Bk = CROSS[Math.min(3, ix + 1)];
          tx = lerp(Ak[0], Bk[0], f); ty = lerp(Ak[1], Bk[1], f); tz = lerp(Ak[2], Bk[2], f);
          fx = lerp(Ak[3], Bk[3], f); fy = lerp(Ak[4], Bk[4], f); fz = lerp(Ak[5], Bk[5], f);
          nx = lerp(Ak[6], Bk[6], f); ny = lerp(Ak[7], Bk[7], f); nz = lerp(Ak[8], Bk[8], f);
        }
        arm2(1, tx, ty, tz, px, py, pz, qs.eU, qs.eF2);
        handQ(1, fx, fy, fz, nx, ny, nz, _q1);
        var eF2 = qs.eF2;
        qs.eH.copy(_q2.copy(qs.eU).multiply(eF2).invert()).multiply(_q1);
        qU.slerp(qs.eU, eEnv); qF.slerp(eF2, eEnv); qH.slerp(qs.eH, eEnv);
      }
      ua.quaternion.copy(qU); fa.quaternion.copy(qF); ha.quaternion.copy(qH);
    }
    // 이름표 높이
    if (this.tag) this.tag.position.y = 1.88 - 0.35 * sa - 0.15 * pa - 0.35 * bow - 0.015 * w;
    this.shadow.position.y = 0.03;
  };

  root.ChurchAvatar = {
    _dbg: { MB: MB, buildHead: buildHead, buildFace: buildFace, buildNeck: buildNeck, buildHair: buildHair, buildHand: buildHand, buildShoes: buildShoes, buildCoat: buildCoat, buildSleeves: buildSleeves, buildPants: buildPants, buildFar: buildFar },
    Avatar: Avatar, tagMaterial: tagMaterial, HEIGHT: HEIGHT, SEAT_BACK: SEAT_BACK,
    // 삼각형 수(검증용)
    stats: function () {
      var cfg = { skin: 1, style: 0, hair: 2, outfit: 6, name: 0 }, out = { near: {}, mid: {}, far: [] }, s;
      for (s = 0; s < 4; s++) {
        out.near['style' + s] = getPack('near', 'smooth', s).tris + getPack('near', 'cloth', 0).tris;
        out.mid['style' + s] = getPack('mid', 'smooth', s).tris + getPack('mid', 'cloth', 0).tris;
      }
      out.far = [getFar(0).tris, getFar(1).tris, getFar(2).tris];
      out.nearCloth = getPack('near', 'cloth', 0).tris; out.nearSmooth0 = getPack('near', 'smooth', 0).tris;
      return out;
    }
  };
})(typeof window !== 'undefined' ? window : this);

