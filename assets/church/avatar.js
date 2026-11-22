/* avatar.js — 부드럽고 말랑한 "3D 클레이/비닐 토이" 스타일 스킨드 아바타(큰 머리 약 5등신, 키 약 1.8m). 외형 기준: docs/church/AVATAR_LOOK.md
   - 매끈하고 둥근 형태, 하드 에지 없음. 큰 머리(HEAD_S 배) + 작은 점 눈(반짝임) + 가는 눈썹 + 아주 작은 코·미소 + 볼 홍조, 머리카락은 윤기 띠·가르마 선이 있는 매끈한 덩어리.
   - 옷: 단색 + 가는 트림(깃·소맷부리 크림, 아랫단 금색). 여성은 무릎 길이 종 모양 원피스, 남성은 엉덩이 길이 단정한 웃옷 + 바지.
   - 재질은 모두 MeshStandardMaterial(거칠기 0.66~0.8, metalness 0, 정점 색 사용) + 약한 림 라이트(Fresnel; 장면과 분리).
   - 근접(LOD0) <= 약 6k 삼각형, 중간(LOD1) <= 약 1.5k, 원거리(LOD2)는 비스킨 임포스터(약 300).
   - 성별(cfg.g: 0 여성, 1 남성): 머리 모양 4종×2성별(사실적인 단발/어깨 길이/포니테일/낮은 쪽머리, 짧게 친 머리/가르마/웨이브/넓은 이마),
     체형(어깨·가슴·허리·엉덩이 폭), 턱선, 목, 눈썹 굵기가 조금씩 다르다. 뼈 길이와 자세는 그대로(스케일만 다름).
     세례명(cfg.name)은 통합 목록 인덱스(cfg.nv = 2). nv 없는 옛 설정은 setConfig 의 normalizeCfg 가 옮긴다(g 도 없으면 성별을 유추).
   - 공개 API(변경 없음): new Avatar(cfg, {showTag, self}), root, setConfig, setLod(0|1|2), lod, setWalk, setSeated, setPray, playEmote(0 인사|1 성호|2 절),
     setPose(x,y,z,yaw), snapPose(), update(dt,t), nod/nodPh, seatLift, ChurchAvatar.tagMaterial/HEIGHT.
     setRosary(bool, look?): 손에 묵주를 든다(SPEC §32). look(T-86)은 든 묵주의 색·재질(rosary_looks.js 항목) — 알 지오메트리·모습별 재질은 모든 아바타가 함께 쓰고, 든 아바타마다 draw call +2(알, 끈·십자가). 원거리(LOD2)에서는 그리지 않는다.
   좌표: 앞 = -z, 위 = +y, +x = 아바타의 오른쪽. 휴식 자세(팔이 아래로 늘어진 자세)로 모델링하고 뼈 회전으로 포즈를 만든다. */
(function (root) {
  'use strict';
  var T = root.THREE, G = root.ChurchGeo, P = root.ChurchPalette;
  var PI = Math.PI, TAU = PI * 2;

  // ------------------------------------------------------------------ 상수
  var HEIGHT = 1.7;
  var SEAT_BACK = 0.14;          // 앉을 때 골반을 좌석 중심에서 뒤로 이동(m). 앞줄 등받이와 무릎이 부딪히지 않도록.
  var SX = 0.17, HX = 0.095;     // 어깨/고관절 좌우 위치
  var LEN_T = 0.39, LEN_S = 0.41, ANKLE = 0.08;   // 허벅지, 종아리, 발목 높이
  var ARM_A = 0.29, ARM_B = 0.26, SH_Y = 0.20;    // 위팔, 아래팔 길이, 어깨의 가슴 뼈대 기준 높이
  var HIP_JOINT = 0.88, HIPS_Y = 0.93;
  var HC = 1.5785;               // 머리 중심 y (현실적인 성인 비율 유지)
  var GN = 0;                    // 지금 만들고 있는 성별(0 여성, 1 남성). assemble 이 만드는 동안만 설정한다.
  // 큰 머리: 머리·얼굴·머리카락을 원래 크기로 만든 뒤 목 위(HEAD_PIV)를 중심으로 HEAD_S 배 키운다(뼈대·자세는 그대로).
  var HEAD_S = 1.55, HEAD_PIV = 1.468, HEAD_UP = (0.110 * 2 + 0.012) * (HEAD_S - 1);   // HEAD_UP = 정수리가 높아진 만큼(이름표 높이)
  function scaleHead(mb, from, to) {
    var p = mb.pos, i;
    for (i = from * 3; i < to * 3; i += 3) { p[i] *= HEAD_S; p[i + 1] = HEAD_PIV + (p[i + 1] - HEAD_PIV) * HEAD_S; p[i + 2] *= HEAD_S; }
  }

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
  var R = { SKIN: 0, LIP: 1, EYE: 2, GLINT: 3, BROW: 5, HAIR: 6, SHOE: 7, SOLE: 8, COAT: 11, COATIN: 12, PANTS: 14, CUFF: 16, TIE: 17, POCKET: 18, PCUFF: 19 };
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

  // ------------------------------------------------------------------ 머리 형상 (클레이: 매끈하고 둥근 머리, 현실적인 성인 비율)
  var HH = 0.110, WW = 0.078, DD = 0.096;       // 머리 반높이/반폭/반깊이
  function headWD(y) {
    var t = clamp(y / HH, -1, 1), p = t < 0 ? 2.3 : 2.0, s = Math.pow(Math.max(0, 1 - Math.pow(Math.abs(t), p)), 1 / p);
    var m = 1 + 0.025 * t - 0.085 * Math.pow(Math.max(0, -t - 0.15), 1.2);   // 볼이 통통한 둥근 얼굴
    m *= 1 + (GN ? 0.035 : -0.02) * sm((-y - 0.035) / 0.075);   // 턱선: 남성은 조금 각지고 여성은 갸름하게
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
  // 머리 표면 위 점 + 표면 방향(y축 회전)
  function onHead(x, y, off) {
    var z = headFrontZ(x, y), gx = x / (WW * WW), gy = y / (HH * HH), gz = z / (DD * DD), l = Math.sqrt(gx * gx + gy * gy + gz * gz) || 1;
    return { p: [x + gx / l * off, y + gy / l * off, z + gz / l * off], ry: -Math.atan2(gx, -gz) };
  }
  var HEADW = [[B.head, 1]];
  function hc(p) { return [p[0], p[1] + HC, p[2]]; }

  var EYE_X = 0.0345, EYE_Y = -0.008, BROW_Y = 0.026, NOSE_Y = -0.031, SMILE_Y = -0.054, CHEEK_X = 0.052, CHEEK_Y = -0.034;   // 눈은 낮고 넓게(호감형), 입·코는 최소

  function buildHead(mb, q) {
    var near = q === 0, nv = near ? 22 : 8, nu = near ? 30 : 12, ys = [], k;
    for (k = 0; k <= nv; k++) ys.push(HH * Math.cos(PI * k / nv) * 0.9999);
    surf(mb, {
      nu: nu, nv: nv, closed: true, inside: [0, HC, 0],
      pt: function (i, j) { var p = headPt(ys[j], dense(i / nu, 0.2), 0); return [p[0], p[1] + HC, p[2]]; },
      w: HEADW, reg: R.SKIN,
      ao: function (i, j, p) { var y = p[1] - HC; return y < -0.08 ? 0.94 + 0.06 * sm((y + 0.11) / 0.03) : 1; }
    });
  }

  function buildFace(mb, q) {
    var near = q === 0, e, k;
    // 눈: 납작한 짙은 타원 점
    for (e = -1; e <= 1; e += 2) {
      var oh = onHead(e * EYE_X, EYE_Y, -0.0012);
      blob(mb, hc(oh.p), [0.0066, 0.0082, 0.0046], [0, oh.ry, 0], { nu: near ? 8 : 6, nv: near ? 4 : 3, w: HEADW, reg: R.EYE, ao: 1 });
      if (near) { var og = onHead(e * EYE_X + 0.0022, EYE_Y + 0.0030, 0.0030); blob(mb, hc(og.p), [0.0019, 0.0019, 0.0012], [0, og.ry, 0], { nu: 5, nv: 2, w: HEADW, reg: R.GLINT, ao: 1 }); }   // 눈 반짝임
    }
    // 눈썹: 알약 모양. 여성은 가늘고 부드러운 아치, 남성은 굵고 조금 곧게
    var bT = GN ? 0.0040 : 0.0027, bArch = GN ? 0.0022 : 0.0040;
    for (e = -1; e <= 1; e += 2) {
      if (!near) { var ob = onHead(0.036, BROW_Y + 0.001, 0.0), br = hc(ob.p); blob(mb, [e * br[0], br[1], br[2]], [0.014, bT * 1.2, 0.004], [0, -e * ob.ry, 0], { nu: 6, nv: 3, w: HEADW, reg: R.BROW, ao: 1 }); continue; }
      var pts = [], rad = [];
      for (k = 0; k < 4; k++) {
        var tq = k / 3, bx = 0.024 + 0.024 * tq, by = BROW_Y + bArch * Math.sin(tq * PI) - 0.003 * tq;
        var o2 = onHead(bx, by, 0.0004); pts.push([e * o2.p[0], o2.p[1] + HC, o2.p[2]]); rad.push(bT * (k === 0 ? 0.92 : 1 - 0.12 * tq));
      }
      tube(mb, pts, rad, { caps: 'both', nu: 6, flat: 0.6, w: HEADW, reg: R.BROW, ao: 1 });
    }
    // 코: 작고 둥근 혹
    var nz = headFrontZ(0, NOSE_Y);
    blob(mb, [0, NOSE_Y + HC, nz - 0.0012], [0.0068, 0.0060, 0.0080], [0.25, 0, 0], { nu: near ? 8 : 6, nv: near ? 5 : 4, w: HEADW, reg: R.SKIN, tn: function () { return 0.3; }, ao: 1 });
    if (!near) return;
    // 입: 가는 미소 선
    var mp = [], mr = [];
    for (k = 0; k < 6; k++) {
      var u = k / 5 * 2 - 1, mx = 0.0135 * u, my = SMILE_Y + 0.0045 * u * u, o3 = onHead(mx, my, -0.0003);
      mp.push([o3.p[0], o3.p[1] + HC, o3.p[2]]); mr.push(0.0012 * (1 - 0.3 * Math.abs(u)));
    }
    tube(mb, mp, mr, { caps: 'both', nu: 4, w: HEADW, reg: R.LIP, ao: 1 });
    // 볼터치(피부색에서 분홍으로 번지는 얇은 원판)
    for (e = -1; e <= 1; e += 2) {
      var NR = 3, NS = 8, RAD = 0.021;
      surf(mb, {
        nu: NS, nv: NR, closed: true, inside: [e * CHEEK_X, CHEEK_Y + HC, 0],
        pt: function (ii, jj) {
          var r = jj / NR, ph = TAU * ii / NS, x = e * CHEEK_X + Math.cos(ph) * RAD * r * 0.9, y = CHEEK_Y + Math.sin(ph) * RAD * r;
          var d = headWD(y), xx = clamp(x, -d[0] * 0.96, d[0] * 0.96), o4 = onHead(xx, y, 0.0006);
          return [o4.p[0], o4.p[1] + HC, o4.p[2]];
        },
        w: HEADW, reg: R.SKIN, ao: 1, tn: function (ii, jj) { var r = jj / NR; return 1 - r * r; }
      });
    }
    // 귀: 단순한 둥근 귀
    for (e = -1; e <= 1; e += 2) blob(mb, [e * (WW + 0.001), -0.008 + HC, 0.006], [0.0075, 0.0195, 0.0155], [0.0, 0, e * 0.22], { nu: 8, nv: 4, w: HEADW, reg: R.SKIN, tn: function () { return 0.55; }, ao: 0.97 });
  }

  // 목 (가늘고 자연스럽게)
  function neckW(y) {
    var t1 = sm((y - 1.40) / 0.05), t2 = sm((y - 1.455) / 0.05);
    return [[B.chest, 1 - t1], [B.neck, t1 * (1 - t2)], [B.head, t1 * t2]];
  }
  function buildNeck(mb, q) {
    var ys = q === 0 ? [1.37, 1.41, 1.45, 1.49, 1.52] : [1.37, 1.44, 1.52], rings = [];
    var nk = GN ? 1.07 : 0.92;   // 남성 목이 조금 굵고 여성은 가늘다
    ys.forEach(function (y) { rings.push({ c: [0, y, 0.008], ru: 0.047 * nk, rv: 0.050 * nk, w: neckW(y) }); });
    loft(mb, rings, { nu: q === 0 ? 12 : 6, dense: false, reg: R.SKIN, ao: function (i, j, p) { return 0.80 + 0.2 * sm((p[1] - 1.40) / 0.08); } });
  }

  // ------------------------------------------------------------------ 머리카락 (부드러운 덩어리)
  function fold(a) { return a > PI ? TAU - a : a; }
  function rimFn(tab) { var pf = profile(tab); return function (f) { return pf(f)[0]; }; }
  // 머리 표면을 감싸는 껍질. rim(f) = 방위각별 끝 y, thick(y,a,s,f) = 두께, w = 정점 가중치 함수(선택)
  function hairPatch(mb, o) {
    var nu = o.nu, nv = o.nv, ye = rimFn(o.rim), pw = o.pw || 1;
    surf(mb, {
      nu: nu, nv: nv, closed: true, inside: [0, HC + 0.01, 0.006],
      pt: function (i, j) {
        var a = dense(i / nu, 0.18), s = j / nv, f = fold(a), yEnd = ye(f), y = HH + (yEnd - HH) * Math.pow(s, pw), off = o.thick(y, a, s, f), p = o.shape ? o.shape(y, a, off, s, f) : headPt(Math.min(y, HH * 0.9999), a, off);
        return [p[0], p[1] + HC, p[2]];
      },
      w: o.w || HEADW, reg: R.HAIR,
      ao: function (i, j, p) { var y = p[1] - HC, s = j / nv; return 0.88 + 0.14 * sm((y + 0.05) / 0.14) - 0.05 * sm((s - 0.8) / 0.2); },
      // 윤기 띠(정수리 아래를 두르는 밝은 고리, tn > 0)와 가르마 선(o.part = x 위치, tn < 0). colorAttr 가 머리색을 밝게/어둡게 한다.
      tn: function (i, j, p) {
        var y = p[1] - HC, d = (y - 0.058) / 0.020, ring = 0.85 * Math.exp(-d * d) * (0.75 + 0.25 * Math.cos(Math.atan2(p[0], -p[2]) * 5));
        if (o.part === undefined) return ring;
        var dp = (p[0] - o.part) / 0.010, pl = 0.55 * Math.exp(-dp * dp) * sm((y - 0.066) / 0.02) * sm((0.045 - p[2]) / 0.05);
        return ring * (1 - pl) - pl;
      }
    });
  }
  // 끝 가장자리를 둥글게 말아주는 두께 감쇠
  function roundEnd(s, s0) { if (s <= s0) return 1; var u = (s - s0) / (1 - s0); return Math.sqrt(Math.max(0, 1 - u * u)) * 0.92 + 0.08 * (1 - u); }
  function spiral(mb, cx, cy, cz, R0, turns, rot, tr, near) {   // 앞으로 말린 곱슬 한 줄기
    var pts = [], rad = [], n = near ? 14 : 9, k, cr = Math.cos(rot), sr = Math.sin(rot);
    for (k = 0; k < n; k++) {
      var t = k / (n - 1), ang = t * TAU * turns, r = R0 * (1 - 0.78 * t), lx = Math.cos(ang) * r, lz = Math.sin(ang) * r, ly = R0 * 0.18 * t;
      pts.push([cx + lx, cy + ly * cr - lz * sr, cz + ly * sr + lz * cr]);
      rad.push(tr * (1 - 0.55 * t));
    }
    tube(mb, pts, rad, { caps: 'end', nu: near ? 6 : 5, w: HEADW, reg: R.HAIR, ao: 0.97 });
  }
  function hairBlob(mb, c, r, rot, near, reg) {
    blob(mb, [c[0], c[1] + HC, c[2]], r, rot, { nu: near ? 10 : 6, nv: near ? 6 : 3, w: HEADW, reg: reg === undefined ? R.HAIR : reg, ao: 1 });
  }
  // 성별별 머리 모양 4종. 모두 "머리 표면을 감싸는 얇은 껍질(hairPatch)" + 작은 덩어리로 만든 차분하고 자연스러운 모양.
  // rim[f] = 방위각(앞 f=0 ~ 뒤 f=PI)별 끝 높이. 앞머리 선은 rim[0], 귀 옆은 f≈1.57.
  function lowerShape(yKeep, widen) {   // 머리 아래로 곧게 떨어지는 머리카락: 아래쪽은 yKeep 높이의 표면을 따라 수직으로 내린다
    return function (y, a, off, s, f) {
      var yy = Math.max(y, yKeep), p = headPt(Math.min(yy, HH * 0.9999), a, off), lo = sm((yKeep - y) / 0.10);
      p[0] *= 1 + widen * lo; p[2] += (y < yKeep ? 0.006 * lo : 0); p[1] = y + (p[1] - yy) * (1 - lo);   // 위쪽은 두께(수직 성분)를 그대로 두고 아래로 갈수록 수직으로 떨어뜨린다
      return p;
    };
  }
  function chestBlend(i, j, p) { var y = p[1] - HC, t = sm((-0.065 - y) / 0.10); return [[B.head, 1 - t], [B.chest, t]]; }
  function buildHair(mb, g, style, q) {
    var near = q === 0, nu = near ? 28 : 10, nv = near ? 8 : 4;
    if (g === 0) {
      if (style === 0) {          // 단발: 턱선 길이, 귀를 덮고 끝이 안으로 살짝 말린 보브 + 이마를 반쯤 덮는 앞머리
        hairPatch(mb, {
          nu: nu, nv: near ? 10 : 5, pw: 1, shape: lowerShape(-0.035, 0.0),
          rim: [[0, 0.060], [0.45, 0.058], [0.8, 0.036], [1.1, -0.010], [1.5, -0.062], [1.9, -0.088], [2.4, -0.094], [2.8, -0.092], [PI, -0.092]],
          thick: function (y, a, s, f) { return (0.010 + 0.008 * sm((y - 0.035) / 0.07) + 0.014 * sm((0.0 - y) / 0.08) * sm((f - 0.8) / 0.5)) * roundEnd(s, 0.6); }
        });
        hairBlob(mb, [0.0, 0.098, -0.036], [0.054, 0.021, 0.044], [-0.5, 0.0, 0.0], near);
      } else if (style === 1) {   // 어깨 길이 생머리: 얼굴 옆으로 곧게 떨어져 어깨에 닿는다
        hairPatch(mb, {
          nu: near ? 30 : 12, nv: near ? 12 : 6, pw: 1, shape: lowerShape(-0.03, 0.04), part: 0.012,
          rim: [[0, 0.066], [0.5, 0.064], [0.85, 0.044], [1.15, -0.020], [1.4, -0.120], [1.7, -0.152], [2.3, -0.158], [2.8, -0.158], [PI, -0.158]],
          thick: function (y, a, s, f) { return (0.010 + 0.007 * sm((y - 0.035) / 0.07) + 0.014 * sm((0.0 - y) / 0.10) * sm((f - 0.9) / 0.5)) * roundEnd(s, 0.75); },
          w: chestBlend
        });
        hairBlob(mb, [0.0, 0.099, -0.035], [0.052, 0.020, 0.043], [-0.5, 0.0, 0.0], near);
      } else if (style === 2) {   // 포니테일: 깔끔하게 뒤로 묶고 목 뒤로 꼬리가 늘어진다
        hairPatch(mb, {
          nu: nu, nv: nv, pw: 0.95,
          rim: [[0, 0.070], [0.5, 0.067], [0.85, 0.048], [1.15, 0.026], [1.6, 0.020], [2.1, 0.004], [2.7, -0.020], [PI, -0.030]],
          thick: function (y, a, s, f) { return (0.009 + 0.007 * sm((y - 0.035) / 0.07)) * roundEnd(s, 0.5); }
        });
        hairBlob(mb, [0.008, 0.044, 0.104], [0.021, 0.017, 0.015], [0.2, 0, 0], near, R.TIE);
        var tp = [[0.008, 0.040, 0.108], [0.016, 0.004, 0.128], [0.036, -0.056, 0.134], [0.056, -0.110, 0.126], [0.068, -0.146, 0.118]];
        tube(mb, tp.map(function (p) { return [p[0], p[1] + HC, p[2]]; }), [0.019, 0.025, 0.023, 0.017, 0.008], { caps: 'end', nu: near ? 8 : 6, w: HEADW, reg: R.HAIR, ao: 0.97 });
      } else {                    // 낮은 쪽머리: 가르마를 타서 매끈하게 넘기고 뒤통수 아래에 작게 묶는다
        hairPatch(mb, {
          nu: nu, nv: nv, pw: 0.95, part: -0.022,
          rim: [[0, 0.068], [0.5, 0.065], [0.85, 0.044], [1.15, 0.022], [1.6, 0.016], [2.1, -0.004], [2.7, -0.030], [PI, -0.042]],
          thick: function (y, a, s, f) { return (0.009 + 0.006 * sm((y - 0.035) / 0.07)) * roundEnd(s, 0.5); }
        });
        hairBlob(mb, [0.0, -0.034, 0.102], [0.040, 0.037, 0.035], [0.1, 0, 0], near);
        hairBlob(mb, [0.0, -0.006, 0.098], [0.026, 0.008, 0.026], [0.3, 0, 0], near, R.TIE);
      }
      return;
    }
    if (style === 0) {            // 짧게 친 머리: 귀 위와 뒷목을 깔끔하게 정리한 스포츠 컷
      hairPatch(mb, {
        nu: nu, nv: nv, pw: 0.95,
        rim: [[0, 0.080], [0.45, 0.078], [0.8, 0.060], [1.1, 0.036], [1.5, 0.026], [2.0, 0.010], [2.6, -0.040], [PI, -0.058]],
        thick: function (y, a, s, f) { return (0.0065 + 0.004 * sm((y - 0.04) / 0.07)) * roundEnd(s, 0.5); }
      });
    } else if (style === 1) {     // 가르마: 옆으로 단정하게 넘긴 짧은 머리
      hairPatch(mb, {
        nu: nu, nv: nv, pw: 0.95, part: 0.030,
        rim: [[0, 0.072], [0.45, 0.070], [0.8, 0.052], [1.1, 0.030], [1.5, 0.024], [2.0, 0.008], [2.6, -0.040], [PI, -0.060]],
        thick: function (y, a, s, f) { return (0.010 + 0.009 * sm((y - 0.03) / 0.07)) * roundEnd(s, 0.5); }
      });
      hairBlob(mb, [-0.016, 0.097, -0.036], [0.056, 0.019, 0.040], [-0.45, 0.0, 0.16], near);
    } else if (style === 2) {     // 웨이브: 귀 윗부분과 목덜미를 덮는 자연스러운 중간 길이 물결 머리
      hairPatch(mb, {
        nu: near ? 30 : 12, nv: near ? 10 : 5, pw: 1,
        rim: [[0, 0.066], [0.45, 0.064], [0.8, 0.044], [1.1, 0.018], [1.5, 0.002], [2.0, -0.018], [2.6, -0.064], [PI, -0.078]],
        thick: function (y, a, s, f) { return (0.013 + 0.009 * sm((y - 0.02) / 0.08) + 0.010 * sm((0.0 - y) / 0.08) * sm((f - 1.1) / 0.5)) * roundEnd(s, 0.6); },
        shape: function (y, a, off, s, f) {
          var p = headPt(Math.min(y, HH * 0.9999), a, off);
          if (near) { var wv = 0.0035 * Math.sin(y * 90 + a * 3 + 0.7) * sm((0.05 - y) / 0.08); p[0] *= 1 + wv * 5; p[2] += wv; }
          return p;
        }
      });
      hairBlob(mb, [0.0, 0.100, -0.032], [0.056, 0.024, 0.046], [-0.4, 0.0, 0.0], near);
    } else {                      // 넓은 이마: 이마 선이 뒤로 물러나고 옆과 뒤는 짧게 남은 모양(나이 든 남성)
      hairPatch(mb, {
        nu: nu, nv: nv, pw: 0.95,
        rim: [[0, 0.076], [0.35, 0.088], [0.65, 0.092], [0.95, 0.050], [1.2, 0.030], [1.6, 0.022], [2.0, 0.008], [2.6, -0.040], [PI, -0.058]],
        thick: function (y, a, s, f) { return (0.0055 + 0.0035 * sm((y - 0.04) / 0.07)) * roundEnd(s, 0.5); }
      });
    }
  }

  // ------------------------------------------------------------------ 몸통(단색 웃옷 + 가는 트림)
  // 여성: 무릎 길이 종 모양 원피스(허리가 들어가고 아랫단으로 퍼진다). 남성: 엉덩이를 덮는 단정한 웃옷.
  // 표: [y, 반폭, 반깊이, 중심 z]. 어깨는 둥글게, 뼈 위치는 그대로(스케일만 다름).
  var TORSO_UP = [
    [1.444, 0.056, 0.060, 0.012], [1.432, 0.074, 0.071, 0.011], [1.416, 0.114, 0.086, 0.008], [1.395, 0.150, 0.098, 0.004], [1.372, 0.164, 0.104, 0.002]
  ];
  var TORSO_UP_K = [[1, 1], [1, 1], [0.97, 1.02], [0.95, 1.045], [0.95, 1.045]];   // [여성, 남성] 폭 배율
  var TORSO_LOW = [
    [[1.300, 0.153, 0.112, -0.002], [1.200, 0.143, 0.109, -0.005], [1.100, 0.134, 0.102, -0.004], [1.000, 0.148, 0.108, 0.0],
      [0.900, 0.172, 0.117, 0.002], [0.780, 0.196, 0.125, 0.003], [0.650, 0.214, 0.131, 0.003], [0.520, 0.226, 0.135, 0.003]],
    [[1.300, 0.166, 0.110, -0.002], [1.200, 0.156, 0.108, -0.005], [1.100, 0.151, 0.104, -0.004], [1.000, 0.156, 0.108, 0.0],
      [0.920, 0.165, 0.114, 0.002], [0.850, 0.171, 0.118, 0.003], [0.760, 0.176, 0.120, 0.003]]
  ];
  var HEM = [0.52, 0.76];   // 아랫단 높이(여성 무릎 바로 위, 남성 엉덩이 아래)
  function torsoFor(g) {
    return profile(TORSO_UP.map(function (r, k) { return [r[0], r[1] * TORSO_UP_K[k][g], r[2], r[3]]; }).concat(TORSO_LOW[g]));
  }
  var TORSOS = [torsoFor(0), torsoFor(1)], TORSO = TORSOS[0];
  var TORSO_N = 2.3;
  // 가중치: 가슴/허리/골반 + 아랫자락. 앞자락은 허벅지를 따라가고(ckL/ckR), 뒷자락은 skirt 뼈(앉으면 접힌다)에 붙는다.
  // 원피스(여성)는 뒷자락이 허벅지를 거의 따라가지 않게 해서 앉았을 때 좌석판 아래로 빠지지 않는다.
  function torsoW(p, y) {
    var cw = sm((y - 1.10) / 0.16), sw = sm((y - 0.98) / 0.13) * (1 - cw), hw = 1 - sm((y - 0.98) / 0.13);
    var tw = sm((0.93 - y) / 0.12) * (GN ? 1 - 0.45 * sm(p[2] / 0.12) : 1 - 0.94 * sm((p[2] + 0.03) / 0.09));
    var sR = sm((p[0] + 0.07) / 0.14);
    var nk = sm((y - 1.43) / 0.03) * 0.25;
    var sk = sm((0.93 - y) / 0.15), rest = hw * (1 - tw);
    return [[B.chest, cw * (1 - nk)], [B.neck, cw * nk], [B.spine, sw], [B.hips, rest * (1 - sk)], [B.skirt, rest * sk], [B.ckR, hw * tw * sR], [B.ckL, hw * tw * (1 - sR)]];
  }
  var COAT_YS = [
    [1.446, 1.430, 1.410, 1.380, 1.320, 1.240, 1.150, 1.080, 1.010, 0.930, 0.840, 0.740, 0.640, 0.555],
    [1.446, 1.430, 1.410, 1.380, 1.320, 1.240, 1.150, 1.060, 0.970, 0.880, 0.795]
  ];
  var COAT_YS_MID = [[1.446, 1.400, 1.280, 1.110, 0.940, 0.740, 0.555], [1.446, 1.400, 1.280, 1.120, 0.960, 0.795]];
  function buildCoat(mb, q) {
    var ys = (q === 0 ? COAT_YS : COAT_YS_MID)[GN], nu = q === 0 ? (GN ? 18 : 24) : 10, rings = [], hem = HEM[GN];   // 여성 원피스는 열 24(앉은 자락 옆 모서리를 둥글게)
    ys.forEach(function (y) { var d = TORSO(y); rings.push({ c: [0, y, d[2]], ru: d[0], rv: d[1], n: TORSO_N }); });
    loft(mb, rings, {
      nu: nu, inside: [0, 1.1, 0], w: function (i, j, p) { return torsoW(p, p[1]); }, reg: R.COAT,
      ao: function (i, j, p) { return 1.0 - 0.10 * sm((1.0 - p[1]) / 0.45) - (GN ? 0 : 0.05 * sm((1.16 - p[1]) / 0.06) * sm((p[1] - 1.04) / 0.06)); }
    });
    // 아랫단 트림(가는 금색 띠)
    var hy = q === 0 ? [hem, hem + 0.007, hem + 0.020, hem + 0.033, hem + 0.040] : [hem, hem + 0.020, hem + 0.040], ho = q === 0 ? [0.001, 0.007, 0.009, 0.007, 0.001] : [0.002, 0.009, 0.002], hr = [];
    hy.forEach(function (y, k) { var d = TORSO(y); hr.push({ c: [0, y, d[2]], ru: d[0] + ho[k], rv: d[1] + ho[k], n: TORSO_N }); });
    loft(mb, hr, { nu: nu, inside: [0, hem + 0.02, 0], w: function (i, j, p) { return torsoW(p, p[1]); }, reg: R.COATIN, ao: 1 });
    // 목 깃(가늘고 둥근 크림색 띠)
    var cy = 1.449, cnu = q === 0 ? 18 : 10, cnv = q === 0 ? 5 : 3, crx = 0.060, crz = 0.060, cr = 0.0125;
    surf(mb, {
      nu: cnu, nv: cnv, closed: true, inside: [0, cy, 0.01],
      pt: function (i, j) {
        var a = dense(i / cnu, 0.15), ph = -0.55 * PI + 1.9 * PI * j / cnv, co = Math.cos(ph), si = Math.sin(ph);
        return [(crx + cr * co) * S(Math.sin(a), 2.0), cy + cr * si * 0.9, 0.010 - (crz + cr * co) * S(Math.cos(a), 2.0)];
      },
      w: function (i, j, p) { return torsoW(p, Math.min(1.446, p[1])); }, reg: R.CUFF, ao: 1
    });
    // 남성 웃옷: 앞 중심의 작은 단추 3개(트림 색)
    if (GN && q === 0) [1.325, 1.225, 1.125].forEach(function (y) {
      var d = TORSO(y), c = [0, y, d[2] - d[1] - 0.001];
      blob(mb, c, [0.0095, 0.0095, 0.0045], [0, 0, 0], { nu: 6, nv: 3, w: torsoW(c, y), reg: R.CUFF, ao: 1 });
    });
  }

  // 소매 + 가는 소맷부리 트림 (둥근 어깨에서 손목으로 조금 가늘어지는 팔)
  var SLV = [[1.398, 0.002, 0.002], [1.394, 0.022, 0.026], [1.382, 0.039, 0.044], [1.362, 0.049, 0.053], [1.33, 0.053, 0.055], [1.25, 0.051, 0.053], [1.17, 0.048, 0.050], [1.11, 0.046, 0.049],
    [1.05, 0.045, 0.048], [0.96, 0.044, 0.047], [0.90, 0.043, 0.046], [0.870, 0.042, 0.045]];
  function armW(side, y) {
    var ua = side > 0 ? B.uaR : B.uaL, fa = side > 0 ? B.faR : B.faL;
    var wt = sm((1.17 - y) / 0.13), wc = 0.55 * sm((y - 1.37) / 0.10);
    return [[ua, (1 - wt) * (1 - wc)], [B.chest, wc * (1 - wt)], [fa, wt]];
  }
  function buildSleeves(mb, q) {
    var side, sel = q === 0 ? [SLV[0], SLV[1], SLV[2], SLV[3], SLV[5], SLV[7], SLV[9], SLV[11]] : [SLV[0], SLV[2], SLV[5], SLV[8], SLV[11]];
    for (side = -1; side <= 1; side += 2) {
      (function (side) {
        var sk = GN ? 1.045 : 0.95;   // 팔 굵기: 남성 조금 굵게, 여성 조금 가늘게
        var rings = sel.map(function (s) { return { c: [side * SX, s[0], 0.0], ru: s[1] * sk, rv: s[2] * sk, y: s[0] }; });
        loft(mb, rings, {
          nu: q === 0 ? 8 : 6, dense: false, inside: [side * SX, 1.15, 0], w: function (i, j, p) { return armW(side, p[1]); },
          reg: R.COAT, ao: function (i, j, p) { return 1.02 - 0.06 * sm((1.2 - p[1]) / 0.3); }
        });
        // 소맷부리(가는 크림색 띠)
        var cyv = q === 0 ? [0.858, 0.863, 0.876, 0.889, 0.894] : [0.858, 0.876, 0.894], cro = q === 0 ? [0.033, 0.046, 0.0495, 0.046, 0.033] : [0.033, 0.0495, 0.033], cr = cyv.map(function (y, k) { return { c: [side * SX, y, 0], ru: cro[k] * 0.98 * sk, rv: cro[k] * sk }; });
        loft(mb, cr, { nu: q === 0 ? 8 : 6, dense: false, inside: [side * SX, 0.876, 0], w: function (i, j, p) { return armW(side, p[1]); }, reg: R.CUFF, ao: 1 });
      })(side);
    }
  }

  // 다리: 남성은 일자 바지 + 가는 밑단, 여성은 원피스 아래로 보이는 가는 다리(스타킹). 골반은 남성만(여성은 원피스 안).
  var PANT_ROWS = [
    [0.935, 0.060, 0.090, 0.003, 0.92, 0.92], [0.88, 0.068, 0.095, 0.003, 0.92, 0.92], [0.80, 0.077, 0.096, 0, 0.90, 0.93], [0.70, 0.082, 0.090, -0.002, 0.86, 1.0], [0.60, 0.078, 0.084, -0.003, 0.82, 1.02],
    [0.50, 0.074, 0.080, -0.004, 0.80, 1.025], [0.43, 0.072, 0.077, 0.0, 0.80, 1.025], [0.35, 0.071, 0.076, 0.004, 0.80, 1.025], [0.26, 0.070, 0.075, 0.004, 0.76, 1.025], [0.17, 0.070, 0.075, 0.002, 0.70, 1.025], [0.12, 0.070, 0.075, 0.0, 0.68, 1.025]
  ];   // 마지막 두 열: 여성/남성 굵기 배율
  var PANTS = [0, 1].map(function (g) { return profile(PANT_ROWS.map(function (r) { return [r[0], r[1] * r[4 + g], r[2] * (g ? 1 : r[4]), r[3]]; })); });
  var PANT = PANTS[0];
  function legW(side, y) {
    var ul = side > 0 ? B.ulR : B.ulL, ll = side > 0 ? B.llR : B.llL, ft = side > 0 ? B.ftR : B.ftL;
    var th = sm((0.86 - y) / 0.12), kn = sm((0.55 - y) / 0.10), an = sm((0.13 - y) / 0.05) * 0.45;
    var wh = 1 - th, wu = th * (1 - kn), wl = kn * (1 - an), wf = kn * an;
    return [[B.hips, wh], [ul, wu], [ll, wl], [ft, wf]];
  }
  function buildPants(mb, q) {
    PANT = PANTS[GN];
    var ys = q === 0 ? [0.935, 0.85, 0.72, 0.60, 0.50, 0.40, 0.28, 0.13] : [0.935, 0.70, 0.48, 0.30, 0.13], side, nl = q === 0 ? 10 : 6;
    for (side = -1; side <= 1; side += 2) {
      (function (side) {
        var rings = ys.map(function (y) { var d = PANT(y); return { c: [side * HX, y, d[2]], ru: d[0], rv: d[1], y: y }; });
        loft(mb, rings, { nu: nl, dense: false, inside: [side * HX, 0.5, 0], w: function (i, j, p) { return legW(side, p[1]); }, reg: R.PANTS, ao: function (i, j, p) { return 0.93 + 0.07 * sm((p[1] - 0.2) / 0.5); } });
        if (!GN) return;
        // 밑단(가는 접단)
        var cy2 = q === 0 ? [0.108, 0.114, 0.132, 0.150, 0.156] : [0.108, 0.132, 0.156], co = q === 0 ? [0.002, 0.008, 0.010, 0.008, 0.002] : [0.003, 0.010, 0.003];
        loft(mb, cy2.map(function (y, k) { var d = PANT(y); return { c: [side * HX, y, d[2]], ru: d[0] + co[k], rv: d[1] + co[k] }; }),
          { nu: nl, dense: false, inside: [side * HX, 0.13, 0], w: function (i, j, p) { return legW(side, p[1]); }, reg: R.PCUFF, ao: 1 });
      })(side);
    }
    if (!GN) return;
    var pr = [[1.00, 0.138, 0.098], [0.94, 0.150, 0.104], [0.86, 0.156, 0.106], [0.80, 0.11, 0.09]].map(function (r) { return { c: [0, r[0], 0], ru: r[1] * 0.98, rv: r[2], }; });
    loft(mb, pr, { nu: q === 0 ? 10 : 6, dense: false, w: [[B.hips, 1]], reg: R.PANTS, ao: 0.85 });
  }

  // 신발: 통통한 스니커즈(길이 방향 = z). 밑창은 별도의 납작한 둥근 덩어리.
  var SHOE = [[0.080, 0.0, 0.0], [0.076, 0.034, 0.034], [0.056, 0.050, 0.054], [0.018, 0.055, 0.062], [-0.032, 0.056, 0.060], [-0.090, 0.057, 0.056],
    [-0.150, 0.056, 0.050], [-0.200, 0.050, 0.040], [-0.228, 0.034, 0.026], [-0.244, 0.0, 0.0]];
  function buildShoes(mb, q) {
    var side, sel = q === 0 ? SHOE : [SHOE[0], SHOE[2], SHOE[4], SHOE[6], SHOE[8], SHOE[9]];
    for (side = -1; side <= 1; side += 2) {
      var wf = [[B['ft' + (side > 0 ? 'R' : 'L')], 1]];
      var rings = sel.map(function (s, k) {
        var pole = s[1] === 0, cy = pole ? 0.050 : 0.030 + s[2] * 0.95;
        return { c: [side * HX, pole ? (k === 0 ? 0.050 : 0.044) : cy, s[0]], ru: Math.max(s[1], 0.001), rv: Math.max(s[2], 0.001), u: [1, 0, 0], v: [0, 1, 0], n: 2.2 };
      });
      loft(mb, rings, { nu: q === 0 ? 10 : 8, dense: false, inside: [side * HX, 0.05, -0.06], w: wf, reg: R.SHOE, ao: function (i, j, p) { return 0.88 + 0.14 * sm((p[1] - 0.03) / 0.08); } });
      blob(mb, [side * HX, 0.025, -0.082], [0.063, 0.033, 0.178], [0, 0, 0], { nu: q === 0 ? 10 : 6, nv: q === 0 ? 5 : 3, w: wf, reg: R.SOLE, ao: 0.95 });
    }
  }

  // 손: 둥근 벙어리장갑 모양(엄지 혹 포함). side=+1 오른손.
  var HAND_S = 1.14;
  var PALM = [[0.872, 0.023, 0.026, 0.0], [0.848, 0.026, 0.030, 0.0], [0.820, 0.031, 0.037, -0.002], [0.785, 0.034, 0.042, -0.002], [0.750, 0.033, 0.042, 0.0], [0.722, 0.028, 0.036, 0.0], [0.700, 0.018, 0.025, 0.0], [0.690, 0.007, 0.012, 0.0]];
  function handW(side, y) {
    var fa = side > 0 ? B.faR : B.faL, ha = side > 0 ? B.haR : B.haL, t = sm((0.866 - y) / 0.03);
    return [[fa, 1 - t], [ha, t]];
  }
  function buildHand(mb, side, q) {
    var ha = side > 0 ? B.haR : B.haL, near = q === 0, v0 = mb.vc;
    var pal = near ? PALM : [PALM[0], PALM[3], PALM[5], PALM[7]];
    var rings = pal.map(function (r) { return { c: [side * SX, r[0], r[3]], ru: r[1], rv: r[2], y: r[0] }; });
    loft(mb, rings, { nu: near ? 8 : 5, dense: false, inside: [side * SX, 0.8, 0], w: function (i, j, p) { return handW(side, p[1]); }, reg: R.SKIN, ao: 0.98, tn: function () { return 0.1; } });
    // 엄지(둥근 혹, 앞쪽-안쪽)
    // 두 마디로 가늘어지게(뿌리는 손바닥에 파묻고 끝은 앞-아래로 살짝): 붙인 혹이 아니라 손의 일부로 읽히게 한다
    blob(mb, [side * SX - side * 0.012, 0.806, -0.034], [0.017, 0.031, 0.018], [0.0, 0, 0], { nu: near ? 8 : 5, nv: near ? 5 : 3, w: [[ha, 1]], reg: R.SKIN, ao: 0.98 });
    if (near) blob(mb, [side * SX - side * 0.013, 0.770, -0.043], [0.0125, 0.0215, 0.0135], [0.0, 0, 0], { nu: 8, nv: 4, w: [[ha, 1]], reg: R.SKIN, ao: 0.98 });
    // 큰 머리에 맞춰 손도 조금 크게(손목 중심으로 HAND_S 배)
    var p = mb.pos, i;
    for (i = v0 * 3; i < mb.vc * 3; i += 3) { p[i] = side * SX + (p[i] - side * SX) * HAND_S; p[i + 1] = 0.872 + (p[i + 1] - 0.872) * HAND_S; p[i + 2] *= HAND_S; }
  }
  // 근거리/중거리 조립 -----------------------------------------------------
  function assemble(q, g, style) {
    var s = new MB(), c = new MB(), prevTorso = TORSO;
    GN = g; TORSO = TORSOS[g];
    try {
      buildHead(s, q); buildFace(s, q);
      buildHair(s, g, style, q);
      scaleHead(s, 0, s.vc);
      buildNeck(s, q);
      buildHand(s, -1, q); buildHand(s, 1, q); buildShoes(s, q);
      buildCoat(c, q); buildSleeves(c, q); buildPants(c, q);
    } finally { GN = 0; TORSO = prevTorso; PANT = PANTS[0]; }
    return { smooth: s, cloth: c };
  }
  // ------------------------------------------------------------------ 원거리 임포스터(스킨 없음, 포즈별 3종)
  function buildFar(variant, g) {   // 0 서기, 1 앉기, 2 앉아 기도. g: 성별(실루엣을 가까운 모습과 맞춘다: 여성 종 모양 원피스, 남성 웃옷 + 바지)
    g = g ? 1 : 0;
    GN = g;
    var TS = TORSOS[g];
    var m = new MB(), sit = variant > 0, dy = sit ? -0.351 : 0, dz = sit ? SEAT_BACK : 0, side;
    function Wn() { return [[0, 1]]; }
    var yy = sit ? [1.455, 1.30, 1.10, 0.90] : (g ? [1.455, 1.30, 1.10, 0.90, 0.77] : [1.455, 1.30, 1.10, 0.86, 0.53]), rings = [];
    yy.forEach(function (y) { var d = TS(y); rings.push({ c: [0, y + dy, d[2] + dz - (variant === 2 ? (y - 0.9) * 0.18 : 0)], ru: d[0], rv: d[1], n: 2.3 }); });
    loft(m, rings, { nu: 7, dense: false, w: Wn, reg: R.COAT, ao: 1, inside: [0, 1.1 + dy, dz] });
    for (side = -1; side <= 1; side += 2) {
      if (sit && !g) {   // 원피스: 허벅지는 옷 색(넓게), 종아리는 다리 색(가늘게)
        tube(m, [[side * HX, 0.57, dz + 0.02], [side * HX * 1.25, 0.535, dz - 0.16], [side * HX * 1.3, 0.50, dz - 0.345]], [0.118, 0.112, 0.100], { nu: 5, w: Wn, reg: R.COAT, ao: 0.97 });
        tube(m, [[side * HX, 0.47, dz - 0.385], [side * HX, 0.07, dz - 0.40]], [0.056, 0.047], { nu: 5, w: Wn, reg: R.PANTS, ao: 0.95, caps: 'end' });
      } else {
        var pts = sit ? [[side * HX, 0.58, dz], [side * HX, 0.53, dz - 0.15], [side * HX, 0.50, dz - 0.36], [side * HX, 0.28, dz - 0.40], [side * HX, 0.07, dz - 0.40]]
          : (g ? [[side * HX, 0.90, 0], [side * HX, 0.60, 0], [side * HX, 0.35, 0], [side * HX, 0.07, 0]] : [[side * HX, 0.58, 0], [side * HX, 0.30, 0], [side * HX, 0.07, 0]]);
        tube(m, pts, sit ? [0.092, 0.08, 0.07, 0.07, 0.062] : (g ? [0.098, 0.078, 0.072, 0.068] : [0.060, 0.056, 0.048]), { nu: 5, w: Wn, reg: R.PANTS, ao: 0.95, caps: 'end' });
      }
      var ap = variant === 2 ? [[side * 0.175, 1.40 + dy, dz], [side * 0.16, 1.25 + dy, dz - 0.10], [side * 0.03, 1.28 + dy, dz - 0.19]] : [[side * 0.175, 1.40 + dy, dz], [side * 0.19, 1.10 + dy, dz - 0.02], [side * 0.20, 0.86 + dy, dz - 0.05]];
      if (sit && variant === 1) ap = [[side * 0.175, 1.40 + dy, dz], [side * 0.195, 1.12 + dy, dz - 0.03], [side * 0.10, 0.92 + dy, dz - 0.19]];
      tube(m, ap, [0.062, 0.052, 0.045], { nu: 5, w: Wn, reg: R.COAT, ao: 1, caps: 'end' });
    }
    // 큰 머리(가까운 모습과 같은 배율) + 머리카락 덮개
    var hs = HEAD_S, hy = HEAD_PIV + (HC - HEAD_PIV) * hs + dy, hz = dz + (variant === 2 ? -0.06 : 0), hyy = variant === 2 ? hy - 0.03 : hy, hr = variant === 2 ? 0.5 : 0;
    blob(m, [0, hyy, hz], [WW * hs, HH * hs, DD * hs], [hr, 0, 0], { nu: 8, nv: 5, w: Wn, reg: R.SKIN, ao: 1 });
    blob(m, [0, hyy + 0.008, hz + 0.016], [(WW + 0.010) * hs, (HH + 0.006) * hs, (DD + 0.010) * hs], [hr - 0.4, 0, 0], { nu: 8, nv: 4, th1: PI * 0.55, w: Wn, reg: R.HAIR, ao: 0.95 });
    GN = 0;
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
    t[R.EYE] = lin('#2a2830'); t[R.GLINT] = [0.95, 0.95, 0.95];
    t[R.BROW] = mix(hair, [0.01, 0.01, 0.01], 0.12);
    t[R.HAIR] = hair;
    // 트림: 깃·소맷부리는 크림색(밝은 옷에는 옷보다 조금 짙은 모래색), 아랫단은 절제한 금색. 신발은 옷과 어울리는 짙은 중성색.
    var lum = 0.2126 * oc[0] + 0.7152 * oc[1] + 0.0722 * oc[2], cream = lin(P.trim ? P.trim[0] : '#F0E6D0'), gold = lin(P.trim ? P.trim[1] : '#C6A562');
    t[R.TIE] = mix(oc, cream, 0.35);
    t[R.SHOE] = mix(lin('#4E433F'), oc, 0.18); t[R.SOLE] = lin('#E4DACB');
    t[R.COAT] = oc; t[R.COATIN] = gold; t[R.POCKET] = mul(oc, 0.93);
    t[R.CUFF] = lum > 0.5 ? mix(mul(oc, 0.80), gold, 0.25) : cream;
    t[R.PANTS] = pants; t[R.PCUFF] = mul(pants, 0.90);
    t.hairHi = mix(hair, [1, 0.94, 0.84], 0.20 + 0.16 * (1 - Math.min(1, (hair[0] + hair[1] + hair[2]) * 1.2))); t.hairLo = mul(hair, 0.62);
    t.blush = [Math.min(1, skin[0] * 1.05 + 0.05), skin[1] * 0.66, skin[2] * 0.70];
    colCache[key] = t;
    return t;
  }
  function colorAttr(mb, tab) {
    var n = mb.vc, arr = new Float32Array(n * 3), i, rg, c, ao, tn, bl = tab.blush;
    for (i = 0; i < n; i++) {
      rg = mb.reg[i]; c = tab[rg]; ao = mb.ao[i]; tn = mb.tn[i];
      var r = c[0], g = c[1], b = c[2];
      if (tn !== 0 && rg === R.HAIR) { var hk = tn > 0 ? Math.min(1, tn) : Math.min(1, -tn), hc2 = tn > 0 ? tab.hairHi : tab.hairLo; r += (hc2[0] - r) * hk; g += (hc2[1] - g) * hk; b += (hc2[2] - b) * hk; }
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
  function getPack(level, kind, g, style) {
    var key = kind === 'smooth' ? 's' + g + style : 'c' + g, P0 = packs[level];
    if (!P0[key]) {
      var set = level === 'near' ? 0 : 1;
      if (kind === 'smooth') { var a = assemble(set, g, style); P0[key] = pack(a.smooth, true); if (!P0['c' + g]) P0['c' + g] = pack(a.cloth, true); }
      else { var b = assemble(set, g, 0); P0[key] = pack(b.cloth, true); }
    }
    return P0[key];
  }
  var farPacks = [];
  function getFar(variant, g) { var k = variant + (g ? 3 : 0); return farPacks[k] || (farPacks[k] = pack(buildFar(variant, g), false)); }

  // 재질 --------------------------------------------------------------------
  // 림 라이트: 시선과 스치는 가장자리에 따뜻한 빛을 조금 더해(Fresnel) 어두운 성당 안에서도 윤곽이 배경과 분리되게 한다.
  // 셰이더에 한 줄만 끼워 넣는다(텍스처·조명 추가 없음). 세 재질이 같은 조각을 쓰고 세기만 다르다.
  var RIM = { color: [1.0, 0.93, 0.82], pow: 2.6, smooth: 0.20, cloth: 0.26, far: 0.22 };
  function rimLight(mat, k) {
    mat.onBeforeCompile = function (sh) {
      sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>',
        '#include <emissivemap_fragment>\n\tfloat avRim = pow(1.0 - saturate(dot(normalize(vViewPosition), normal)), ' + RIM.pow.toFixed(2) + ');\n\ttotalEmissiveRadiance += diffuseColor.rgb * vec3(' + RIM.color.map(function (v) { return (v * k * 2.2).toFixed(3); }).join(', ') + ') * avRim + vec3(' + RIM.color.map(function (v) { return (v * k * 0.25).toFixed(3); }).join(', ') + ') * avRim;');
    };
    mat.customProgramCacheKey = function () { return 'avrim' + k; };
  }
  var mats = null;
  function getMats() {
    if (mats) return mats;
    mats = {
      smooth: new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.66, metalness: 0, emissive: 0x24100a, emissiveIntensity: 0.4, envMapIntensity: 0.85, side: T.DoubleSide }),
      cloth: new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0, envMapIntensity: 0.75, side: T.DoubleSide }),
      far: new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0, envMapIntensity: 0.7 })
    };
    rimLight(mats.smooth, RIM.smooth); rimLight(mats.cloth, RIM.cloth); rimLight(mats.far, RIM.far);
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
  // 세례명: 통합 목록(baptismal_names.js 의 ChurchNames.list) 인덱스. 같은 이름은 텍스처(256x64) 한 장을 함께 쓴다.
  function NAMES() { return root.ChurchNames; }
  function tagMaterial(nameIdx) {
    var ck = 'n' + nameIdx;
    if (tagCache[ck]) return tagCache[ck];
    var text = NAMES().list[nameIdx] || '';
    var c = G.makeCanvas(256, 64), g = c.getContext('2d');
    // 긴 이름은 알약 안에 들어가도록 글자 크기를 줄이고(최소 16px), 그래도 넘치면 두 줄로 나눈다(label_fit.js 의 tagLayout).
    // 알약 높이(40)는 그대로다. 폭은 가장 넓은 줄에 맞추고 최대 236.
    var FAM = '"Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",sans-serif', LF = root.ChurchLabelFit;
    function measure(str, fs) { g.font = '600 ' + fs + 'px ' + FAM; return g.measureText(str).width; }
    var lay = LF.tagLayout(text, measure), ys = LF.tagLineYs(lay, 33), li;
    g.font = '600 ' + lay.fs + 'px ' + FAM;
    var w = Math.min(236, lay.w + 34), x = (256 - w) / 2;
    g.fillStyle = 'rgba(250,246,238,0.80)';
    g.beginPath();
    if (g.roundRect) g.roundRect(x, 12, w, 40, 20); else g.rect(x, 12, w, 40);
    g.fill();
    g.lineWidth = 1.5; g.strokeStyle = 'rgba(90,70,55,0.25)'; g.stroke();
    g.fillStyle = '#3d312a'; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (li = 0; li < lay.lines.length; li++) g.fillText(lay.lines[li], 128, ys[li]);
    var t = new T.CanvasTexture(c);
    t.encoding = T.sRGBEncoding;
    var m = new T.SpriteMaterial({ map: t, transparent: true, depthWrite: false, fog: false });
    tagCache[ck] = m;
    return m;
  }
  // 이름표 화면 크기 보정용 카메라 정보(main.js 가 프레임마다 setView 로 알려 준다). 없으면 보정 없이 기본 크기.
  var VIEW = { on: false, c: { x: 0, y: 0, z: 0 }, f: { x: 0, y: 0, z: -1 }, h: 640, fov: 52 };
  function setView(cam, viewH) {
    var e = cam.matrixWorld.elements;
    VIEW.c.x = e[12]; VIEW.c.y = e[13]; VIEW.c.z = e[14];
    VIEW.f.x = -e[8]; VIEW.f.y = -e[9]; VIEW.f.z = -e[10];
    VIEW.h = viewH; VIEW.fov = cam.fov; VIEW.on = true;
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

  // ------------------------------------------------------------------ 묵주(손에 든 것, SPEC §32, T-86)
  // 원점 = 손에 쥔 곳. 구슬 고리가 -y 로 늘어지고(XY 평면), 그 아래에 구슬 3알과 십자가가 달린다. 새 에셋 없이 지오메트리로 만든다.
  // 메시는 최대 2개: 알(모든 묵주가 지오메트리 1개 공유, 재질은 묵주 모습별 공유)과 끈+십자가(모습별 지오메트리 1개, 색은 정점색).
  // 폰에서 읽히도록 알·십자가를 옛 값보다 25~30% 키웠다(알 지름 13mm·큰 알 17.6mm·십자가 4.8cm — 손 크기에서 믿을 만한 범위).
  var ROSARY = { BEADS: 20, DROP: 0.14, HALF_W: 0.036, R: 0.0066, R_BIG: 0.0088, TAIL: 3, TAIL_GAP: 0.0152, CROSS_H: 0.048, CROSS_W: 0.029, CROSS_T: 0.009, CORD: 0.0026, PALM: 0.062, RAIL_DZ: 0.11, RAIL_DY: 0.03, FADE: 8, LEN: 0, TRIS: 0 };
  ROSARY.LEN = ROSARY.DROP + ROSARY.R_BIG * 2 + ROSARY.TAIL * ROSARY.TAIL_GAP + 0.004 + ROSARY.CROSS_H;
  var rosaryGeo = null, rosaryTrim = null;
  function rosaryLoop(n) {   // 물방울 모양 고리 위에 같은 간격으로 놓은 n 개의 점 [x, y] (out.curve = 촘촘한 곡선)
    var M = 240, pts = [], len = [0], i, a, k;
    for (i = 0; i <= M; i++) { a = TAU * i / M; k = (1 - Math.cos(a)) / 2; pts.push([ROSARY.HALF_W * Math.sin(a) * (0.5 + 0.5 * k), -ROSARY.DROP * k]); }
    for (i = 1; i <= M; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    var out = [], j = 1;
    for (i = 0; i < n; i++) {
      var d = len[M] * (i + 0.5) / n;
      while (j < M && len[j] < d) j++;
      var f = (d - len[j - 1]) / ((len[j] - len[j - 1]) || 1);
      out.push([lerp(pts[j - 1][0], pts[j][0], f), lerp(pts[j - 1][1], pts[j][1], f)]);
    }
    out.curve = pts;
    return out;
  }
  function pushGeo(arr, g, x, y, z) {   // 지오메트리를 arr({pos, nor})에 이어 붙인다. 삼각형 수를 돌려준다.
    if (g.index) g = g.toNonIndexed();
    var p = g.attributes.position.array, nn = g.attributes.normal.array;
    for (var q = 0; q < p.length; q += 3) { arr.pos.push(p[q] + x, p[q + 1] + y, p[q + 2] + z); arr.nor.push(nn[q], nn[q + 1], nn[q + 2]); }
    return p.length / 9;
  }
  function pushPrism(arr, ax, ay, bx, by, h) {   // 두 점(XY) 사이의 가는 네모 기둥(끈·사슬), 삼각형 8개
    var dx = bx - ax, dy = by - ay, l = Math.hypot(dx, dy) || 1, nx = -dy / l * h, ny = dx / l * h, s, k;
    var P = [[ax + nx, ay + ny, h], [ax - nx, ay - ny, h], [ax - nx, ay - ny, -h], [ax + nx, ay + ny, -h]], Q = [[bx + nx, by + ny, h], [bx - nx, by - ny, h], [bx - nx, by - ny, -h], [bx + nx, by + ny, -h]];
    for (s = 0; s < 4; s++) {
      var a0 = P[s], a1 = P[(s + 1) % 4], b0 = Q[s], b1 = Q[(s + 1) % 4];
      var ux = a1[0] - a0[0], uy = a1[1] - a0[1], uz = a1[2] - a0[2], vx = b0[0] - a0[0], vy = b0[1] - a0[1], vz = b0[2] - a0[2];
      var cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx, cl = Math.hypot(cx, cy, cz) || 1;
      var tri = [a0, a1, b1, a0, b1, b0];
      for (k = 0; k < 6; k++) { arr.pos.push(tri[k][0], tri[k][1], tri[k][2]); arr.nor.push(cx / cl, cy / cl, cz / cl); }
    }
    return 8;
  }
  function getRosaryGeo() {   // 알: 고리 알(다섯째마다 큰 알) + 가운데 큰 알 + 꼬리 알 3
    if (rosaryGeo) return rosaryGeo;
    var A = { pos: [], nor: [] }, tris = 0, i;
    var small = new T.OctahedronGeometry(ROSARY.R, 1), big = new T.OctahedronGeometry(ROSARY.R_BIG, 1);
    var loop = rosaryLoop(ROSARY.BEADS);
    for (i = 0; i < loop.length; i++) tris += pushGeo(A, (i % 5) === 2 ? big : small, loop[i][0], loop[i][1], 0);   // 고리 맨 아래 양옆(9·10번)은 작은 알
    var y = -ROSARY.DROP - ROSARY.R_BIG;
    tris += pushGeo(A, big, 0, y, 0);
    y -= ROSARY.R_BIG;
    for (i = 0; i < ROSARY.TAIL; i++) { y -= ROSARY.TAIL_GAP; tris += pushGeo(A, small, 0, y + ROSARY.TAIL_GAP / 2, 0); }
    var g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(A.pos, 3));
    g.setAttribute('normal', new T.Float32BufferAttribute(A.nor, 3));
    g.computeBoundingSphere();
    ROSARY.BEAD_TRIS = tris;
    rosaryGeo = g;
    ROSARY.TRIS = tris + getRosaryTrim().tris;
    return g;
  }
  function getRosaryTrim() {   // 끈(고리 + 세로줄) + 십자가: 위치·법선은 모든 모습이 공유, 색(정점색)만 모습마다
    if (rosaryTrim) return rosaryTrim;
    var A = { pos: [], nor: [] }, i, cordN = 0;
    var c = rosaryLoop(ROSARY.BEADS).curve, S = 28, step = (c.length - 1) / S;
    for (i = 0; i < S; i++) { var p0 = c[Math.round(i * step)], p1 = c[Math.round((i + 1) * step)]; cordN += pushPrism(A, p0[0], p0[1], p1[0], p1[1], ROSARY.CORD / 2); }
    var y = -ROSARY.DROP - ROSARY.R_BIG * 2 - ROSARY.TAIL * ROSARY.TAIL_GAP - 0.004;   // 십자가 윗끝
    cordN += pushPrism(A, 0, -ROSARY.DROP, 0, y, ROSARY.CORD / 2);
    var crossN = pushGeo(A, new T.BoxGeometry(ROSARY.CROSS_T, ROSARY.CROSS_H, 0.006), 0, y - ROSARY.CROSS_H / 2, 0);
    crossN += pushGeo(A, new T.BoxGeometry(ROSARY.CROSS_W, ROSARY.CROSS_T, 0.006), 0, y - ROSARY.CROSS_H * 0.32, 0);
    rosaryTrim = { pos: new T.Float32BufferAttribute(A.pos, 3), nor: new T.Float32BufferAttribute(A.nor, 3), cordVerts: cordN * 3, n: A.pos.length / 3, tris: cordN + crossN };
    return rosaryTrim;
  }
  // 묵주 모습(look): 성당 표(rosary_looks.js; Flutter 가 {on, look} 으로 보냄)의 한 항목. 값은 검사해 쓰고, 없으면 옛 모습(갈색 알 + 금 십자가).
  var ROSARY_DEFAULT = { id: '', bead: '#6b4226', rough: 0.6, metal: 0, emissive: '', emissiveI: 0, opacity: 1, facet: 0, cord: '#4a2c18', chain: 0, cross: '#c9a04a', crossMetal: 0.9, crossRough: 0.4 };
  function hexOr(s, d) { return typeof s === 'string' && /^#[0-9a-fA-F]{6}$/.test(s) ? s : d; }
  function numOr(v, lo, hi, d) { v = +v; return isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d; }
  function normRosaryLook(o) {
    var D = ROSARY_DEFAULT; o = o && typeof o === 'object' ? o : D;
    return { id: typeof o.id === 'string' ? o.id.slice(0, 24) : '', bead: hexOr(o.bead, D.bead), rough: numOr(o.rough, 0.02, 1, D.rough), metal: numOr(o.metal, 0, 1, 0),
      emissive: hexOr(o.emissive, ''), emissiveI: numOr(o.emissiveI, 0, 1.5, 0), opacity: numOr(o.opacity, 0.5, 1, 1), facet: o.facet ? 1 : 0,
      cord: hexOr(o.cord, D.cord), chain: o.chain ? 1 : 0, cross: hexOr(o.cross, D.cross), crossMetal: numOr(o.crossMetal, 0, 1, 0), crossRough: numOr(o.crossRough, 0.05, 1, 0.4) };
  }
  var rosaryParts = {}, rosaryPartsN = 0;
  function getRosaryParts(look) {   // 모습별 공유 재질 2개 + 끈·십자가 지오메트리 1개(모든 아바타가 나눠 쓴다)
    var L = normRosaryLook(look), key = JSON.stringify(L), P = rosaryParts[key];
    if (P) return P;
    if (rosaryPartsN >= 40) { rosaryParts = {}; rosaryPartsN = 0; }   // 16종이면 닿지 않는 안전장치
    getRosaryGeo();
    var bead = new T.MeshStandardMaterial({ color: new T.Color(L.bead), roughness: L.rough, metalness: L.metal, envMapIntensity: L.metal > 0.5 ? 1.6 : 1.1, flatShading: !!L.facet });
    if (L.emissive) { bead.emissive = new T.Color(L.emissive); bead.emissiveIntensity = L.emissiveI; }
    if (L.opacity < 1) { bead.transparent = true; bead.opacity = L.opacity; }
    var trim = new T.MeshStandardMaterial({ vertexColors: true, roughness: L.crossRough, metalness: L.crossMetal * (L.chain ? 1 : 0.5), envMapIntensity: L.crossMetal > 0.5 ? 1.6 : 1.0 });
    var tr = getRosaryTrim(), col = new Float32Array(tr.n * 3), cc = lin(L.cord), xc = lin(L.cross), k;
    for (k = 0; k < tr.n; k++) { var s = k < tr.cordVerts ? cc : xc; col[k * 3] = s[0]; col[k * 3 + 1] = s[1]; col[k * 3 + 2] = s[2]; }
    var tg = new T.BufferGeometry();
    tg.setAttribute('position', tr.pos); tg.setAttribute('normal', tr.nor); tg.setAttribute('color', new T.BufferAttribute(col, 3));
    tg.computeBoundingSphere();
    P = rosaryParts[key] = { look: L, beadMat: bead, trimMat: trim, trimGeo: tg };
    rosaryPartsN++;
    return P;
  }

  // ------------------------------------------------------------------ 아바타
  // 3 = 초 켜기 동작(손 뻗기 → 성호경 → 두 손 모음), 4 = 기도 시작 성호경, 5 = 기도 끝 성호경: 서버 이모트 번호 밖(setPray/playLightGesture 로만).
  // 성호경(1·3·4·5)은 모두 같은 끝맺음: 오른어깨 다음에 두 손을 가슴 앞에 모아(손가락 위) 잠깐 고개 숙여 머문 뒤 놓는다. 시간표(초)는 SIGN_TL, 계산은 signPhase 한 곳.
  var EMOTE_DUR = [2.4, 5.6, 1.7, 6.0, 3.6, 2.6];
  var SIGN_TL = {
    1: { c0: 0.4, c1: 3.0, j0: 3.0, j1: 3.5, r0: 5.1, inn: 0.4 },     // 성호(메뉴): 긋기 0.4~3.0 → 손 모으기 → 1.6초 머묾 → 놓기(5.1~5.6)
    3: { c0: 1.26, c1: 3.55, j0: 3.55, j1: 4.05, r0: 5.5, inn: 0.75 }, // 초 켜기: 손 뻗기 0~1.26 → 긋기 → 손 모으기 → 머묾(~1.5초) → 놓기(5.5~6.0)
    4: { c0: 0.25, c1: 2.0, j0: 2.0, j1: 2.4, r0: 3.1, inn: 0.3 },     // 기도 시작: 긋고 모은 손으로 기도 자세에 이어진다(놓으면 기도 자세)
    5: { c0: 0.25, c1: 1.85, j0: 1.85, j1: 2.25, r0: 99, inn: 0.3 }    // 기도 끝: 긋고 손을 모은 채 끝(그다음 기도 자세를 푼다)
  };
  // t초 시점의 성호경 단계: u 긋기 진행(0~4: 이마·가슴·왼어깨·오른어깨), cw 긋는 팔 가중치, jw 두 손 모음 가중치(= 고개 숙임 가중치)
  function signPhase(e, t) {
    var T = SIGN_TL[e];
    if (!T) return null;
    var rel = t > T.r0 ? sm(clamp((t - T.r0) / (EMOTE_DUR[e] - T.r0), 0, 1)) : 0, jn = sm(clamp((t - T.j0) / (T.j1 - T.j0), 0, 1));
    return { u: clamp((t - T.c0) / (T.c1 - T.c0), 0, 0.999) * 4, cw: sm(clamp(t / T.inn, 0, 1)) * (1 - rel), jw: jn * (1 - rel), tl: T };
  }
  // 성호 경로(오른손, 가슴 로컬): 이마 → 가슴 → 왼어깨 → 오른어깨. [손목 x,y,z, 손가락 F(x,y,z), 손바닥 N(x,y,z)]
  var CROSS = [
    [0.02, 0.43, -0.215, 0, 0.88, 0.48, 0, -0.48, 0.88],   // 이마(큰 머리 앞면 밖)
    [0.03, 0.0, -0.17, -0.25, 0.9, -0.1, 0, 0.1, 1],
    [-0.115, 0.14, -0.16, -0.95, 0.3, 0.0, 0, 0.05, 1],
    [0.125, 0.15, -0.16, 0.95, 0.3, 0.0, 0, 0.05, 1]
  ];

  function Avatar(cfg, opts) {
    opts = opts || {};
    var M = getMats();
    this.root = new T.Group();
    this.root.userData.avatar = true;   // 창 감상 모드에서 숨길 대상(GlassView)
    this.bones = makeBones();
    this.skeleton = new T.Skeleton(this.bones, boneInverses());
    this.body = new T.Group(); this.body.add(this.bones[0]); this.root.add(this.body);
    this.meshes = { near: {}, mid: {} };
    this.imp = null; this.impKey = '';
    if (!shadowGeo) shadowGeo = new T.PlaneGeometry(1, 1).rotateX(-PI / 2);
    this.shadow = new T.Mesh(shadowGeo, getShadowMat()); this.shadow.scale.set(0.9, 1, 0.9); this.shadow.position.y = 0.03; this.shadow.renderOrder = 2;
    this.root.add(this.shadow);
    this.tag = null; this.showTag = opts.showTag !== false; this.tagSelf = !!opts.self; this.tagY = 1.9 + HEAD_UP; this.tagPx = 0; this.tagPpm = 0;
    this.walkTarget = 0; this.walkAmt = 0; this.phase = Math.random() * 6;
    this.sitTarget = 0; this.sitAmt = 0; this.prayTarget = 0; this.prayAmt = 0;
    this.kneelTarget = 0; this.kneelLin = 0; this.kneelAmt = 0; this.kneelFwd = 0; this.kneelY = 0; this.kneelRail = 0;
    this.emote = -1; this.emoteT = 0; this.nod = false; this.nodPh = Math.random() * 6;
    this.rosary = null; this.rosaryTarget = 0; this.rosaryAmt = 0;
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
  // 옛 머리 모양(짧은 머리·단발·올림머리·곱슬) → 성별별 새 머리 모양(Flutter AvatarConfig._legacyStyle 과 같다)
  var LEGACY_STYLE = [[0, 0, 3, 1], [1, 0, 0, 2]];
  // 입력(cfg)을 허용 범위의 {g, skin, style, hair, outfit, name, nv}으로 맞춘다. name 은 통합 세례명 목록 인덱스(nv = 2).
  // nv 가 2 가 아니면 옛 형식으로 보고 옮긴다(Flutter AvatarConfig.fromJson 과 같다):
  //   g 있음 = 옛 성별별 목록 인덱스(oldF/oldM), g 없음 = 옛 40개 목록 인덱스(legacy; 성별도 이름에서 유추).
  // 범위를 벗어난 이름은 기본 이름(def = 마리아).
  function normalizeCfg(cfg) {
    cfg = cfg || {};
    function iv(v) { v = v | 0; return v < 0 ? 0 : v; }
    var N = NAMES(), g, name = iv(cfg.name), style = iv(cfg.style) % 4, hasG = cfg.g === 0 || cfg.g === 1, tab;
    if (cfg.nv === 2) { g = cfg.g === 1 ? 1 : 0; if (name >= N.list.length) name = N.def; }
    else if (hasG) { g = cfg.g; tab = g === 1 ? N.oldM : N.oldF; name = name < tab.length ? tab[name] : N.def; }
    else {
      var old = name % N.legacy.length;
      g = old >= 20 ? 1 : 0;
      name = N.legacy[old];
      style = LEGACY_STYLE[g][style];
    }
    return { g: g, skin: iv(cfg.skin) % 4, style: style, hair: iv(cfg.hair) % 10, outfit: iv(cfg.outfit) % 12, name: name, nv: 2 };
  }
  Avatar.prototype.setConfig = function (cfg) {
    var c = normalizeCfg(cfg);
    this.cfg = c;
    this.key = c.g + '_' + c.skin + '_' + c.style + '_' + c.hair + '_' + c.outfit;
    this._applyGeom();
    if (this.showTag) {
      if (!this.tag) { this.tag = new T.Sprite(tagMaterial(c.name)); this.tag.scale.set(0.78, 0.195, 1); this.tag.position.y = 1.9 + HEAD_UP; this.tag.renderOrder = 8; this.root.add(this.tag); this.tag.visible = this.lod <= 0; }
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
      var ps = getPack(level, 'smooth', c.g, c.style), pc = getPack(level, 'cloth', c.g, 0);
      this._mesh(level, 'smooth').geometry = geomWithColor(ps, tab, 's' + c.g + c.style + '_' + c.skin + '_' + c.hair + '_' + c.outfit);
      this._mesh(level, 'cloth').geometry = geomWithColor(pc, tab, 'c' + c.g + '_' + c.skin + '_' + c.hair + '_' + c.outfit);
    } else {
      this._applyFar(this._variant());
    }
  };
  Avatar.prototype._variant = function () { return this.sitAmt > 0.5 ? (this.prayAmt > 0.5 ? 2 : 1) : 0; };
  Avatar.prototype._applyFar = function (v) {
    var c = this.cfg, key = v + '_' + c.g + '_' + c.skin + '_' + c.hair + '_' + c.outfit;
    if (!this.imp) { this.imp = new T.Mesh(new T.BufferGeometry(), getMats().far); this.imp.receiveShadow = true; this.imp.castShadow = false; this.root.add(this.imp); }
    if (this.impKey === key) return;
    this.impKey = key;
    this.imp.geometry = geomWithColor(getFar(v, c.g), colors(c), 'f' + key);
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
  Avatar.prototype.setWalk = function (v) { this.walkTarget = v; if (v > 0.05 && SIGN_TL[this.emote]) this.cancelGesture(); };   // 걷기 입력은 성호경을 끊는다
  Avatar.prototype.setSeated = function (b) { this.sitTarget = b ? 1 : 0; if (!b && this.emote === 5) this.cancelGesture(); };
  // 기도 시작/끝에는 성호경(이마→가슴→왼어깨→오른어깨→두 손 모음)을 먼저 긋는다. 켜질 때만(0→1) 시작, 같은 값 반복 호출은 무시 — 다른 사람의 기도 상태(net_view)도 이 호출이라 화면마다 똑같이 보인다.
  // 끝: 앉아(서서) 기도 자세인 채로 끄면 성호경(2.6초)을 긋는 동안 손을 모은 채 두었다가 푼다. 앉아 있지 않으면(일어남·걸음) 바로 푼다.
  // standing: 서서 손을 모은다(앉지 않아도 기도 팔)
  Avatar.prototype.setPray = function (b, standing) {
    if (b) {
      var starting = !this.prayWant;
      this.prayWant = true; this.prayTarget = 1; this.prayStand = standing ? 1 : 0;
      if (this.emote === 5) { this.emote = -1; this.abortT = 0; }
      else if (starting && this.lod !== 2 && this.emote < 0) { this.emote = 4; this.emoteT = 0; this.abortT = 0; }
    } else {
      if (!this.prayWant) return;
      this.prayWant = false;
      if (this.emote === 4) { this.emote = -1; this.abortT = 0; }
      if (this.prayAmt > 0.5 && (this.sitTarget || this.prayStand) && this.lod !== 2 && this.emote < 0) { this.emote = 5; this.emoteT = 0; this.abortT = 0; }
      else { this.prayTarget = 0; this.prayStand = 0; }
    }
  };
  // 무릎 꿇기(앉아 있을 때만 보인다). spot = ChurchLogic.kneelSpot(seatId): {fwd 좌석 중심에서 무릎까지 앞으로(m), y 무릎 받침 높이, rail 앞에 손 얹을 등받이}.
  // 몸 전체가 뿌리(좌석 중심)에서 앞으로 fwd 만큼 나가 무릎틀 위에 무릎을 꿇는다. 전환은 KNEEL_DUR 초(부드러운 보간).
  Avatar.prototype.setKneel = function (b, spot) {
    this.kneelTarget = b ? 1 : 0;
    if (b) { spot = spot || KNEEL_DEFAULT; this.kneelFwd = spot.fwd; this.kneelY = spot.y; this.kneelRail = spot.rail ? 1 : 0; }
  };
  // 지금 몸(골반)이 좌석 중심에서 앞으로 나가 있는 거리(m). 카메라·이름표가 따라간다.
  // 가까운 카메라용 흐리기(a: 1 불투명 … 0 투명). 공유 재질은 그대로 두고 이 아바타만 복제 재질(처음 한 번 만든다)로 바꿔 opacity 만 바꾼다.
  // 이름표도 함께(이름표 재질은 이름별로 공유되므로 복제본; 이름이 바뀌면 다시 복제). 같은 값이면 아무것도 안 한다(할당 0).
  function fadeClone(m) {
    var c = m.clone();
    c.onBeforeCompile = m.onBeforeCompile; c.customProgramCacheKey = m.customProgramCacheKey;
    c.transparent = true; c.depthWrite = true;
    return c;
  }
  var FADE_LV = ['near', 'mid'], FADE_K = ['smooth', 'cloth'];
  Avatar.prototype.setFade = function (a) {
    a = a >= 0.995 ? 1 : (a < 0 ? 0 : a);
    if (a === this.fadeA) return;
    this.fadeA = a;
    var M = getMats(), on = a < 1;
    if (on && !this._fm) this._fm = { smooth: fadeClone(M.smooth), cloth: fadeClone(M.cloth) };
    var fm = this._fm, i, j;
    if (fm) { fm.smooth.opacity = a; fm.cloth.opacity = a; }
    for (i = 0; i < 2; i++) for (j = 0; j < 2; j++) {
      var m = this.meshes[FADE_LV[i]][FADE_K[j]];
      if (m) m.material = on ? fm[FADE_K[j]] : M[FADE_K[j]];
    }
    if (this.shadow) this.shadow.visible = this.lod < 2 && a > 0.3;
    if (this.rosary) this.rosary.userData.fadeHide = a < 0.5;
    var tg = this.tag;
    if (tg) {
      var base = this._tf && tg.material === this._tf ? this._tfBase : tg.material;
      if (on) {
        if (!this._tf || this._tfBase !== base) { this._tf = base.clone(); this._tfBase = base; }
        this._tf.opacity = a; tg.material = this._tf;
      } else tg.material = base;
    }
  };
  // X-ray 실루엣(내 아바타, 걷는 동안): 벽·기둥·의자 뒤에 가려진 몸을 금색 점무늬(50% 디더)로 보여 준다 — 내 위치를 잃지 않게.
  // 같은 뼈대·형상을 쓰는 SkinnedMesh 를 깊이 '더 먼 곳(GreaterDepth)'에서만 그린다. 불투명 목록에서 장면(renderOrder 0) 다음,
  // 내 몸(renderOrder 51) 바로 앞(50)에 그려야 내 몸끼리 가린 곳(팔 뒤 몸통)이 금색이 되지 않는다. 섞기 없이 디더라 정렬 문제도 없다.
  var xrayM = null;
  function xrayMat() {
    if (xrayM) return xrayM;
    xrayM = new T.MeshBasicMaterial({ color: 0xe6c36a, depthWrite: false, depthFunc: T.GreaterDepth, fog: false, toneMapped: false });
    xrayM.onBeforeCompile = function (sh) { sh.fragmentShader = sh.fragmentShader.replace('void main() {', 'void main() {\n\tif (mod(floor(gl_FragCoord.x) + floor(gl_FragCoord.y), 2.0) < 0.5) discard;'); };
    xrayM.customProgramCacheKey = function () { return 'avxray'; };
    return xrayM;
  }
  Avatar.prototype.setXray = function (on) {
    var src = this.meshes.near, i, k;
    if (on && !this._xr) {
      this._xr = {};
      for (i = 0; i < 2; i++) {
        k = FADE_K[i];
        var x = new T.SkinnedMesh(new T.BufferGeometry(), xrayMat());
        x.bind(this.skeleton, IDENT); x.renderOrder = 50; x.frustumCulled = false; x.castShadow = false; x.receiveShadow = false;
        this.body.add(x); this._xr[k] = x;
      }
    }
    if (!this._xr) return;
    for (i = 0; i < 2; i++) {
      k = FADE_K[i];
      var xm = this._xr[k], sm = src[k];
      if (sm) { if (xm.geometry !== sm.geometry) xm.geometry = sm.geometry; sm.renderOrder = on ? 51 : 0; }
      xm.visible = !!(on && sm && sm.visible && this.lod === 0);
    }
  };
  Avatar.prototype.kneelOffset = function () { return this.kneelAmt * this.sitAmt * this.kneelFwd; };
  // 묵주를 든다/내려놓는다(SPEC §32). 처음 들 때 메시를 만든다(지오메트리·재질 공유). 손 위치는 update 가 매 프레임 맞춘다.
  // look(선택, T-86): 든 묵주의 모습(rosary_looks.js 항목). 주면 들고 있는 중에도 바로 바뀐다(기도 중 묵주 바꾸기). 안 주면 지금 모습 유지(처음엔 옛 모습).
  // 메시 2개: this.rosary(알, 루트) + 그 자식 끈·십자가. 지오메트리·재질은 모습별로 모든 아바타가 공유한다.
  Avatar.prototype.setRosary = function (b, look) {
    this.rosaryTarget = b ? 1 : 0;
    if (look && look !== this.rosaryLook) this.rosaryLook = look;
    if (b && !this.rosary) {
      var P = getRosaryParts(this.rosaryLook), m = new T.Mesh(getRosaryGeo(), P.beadMat), tm = new T.Mesh(P.trimGeo, P.trimMat);
      m.castShadow = false; m.receiveShadow = false; m.frustumCulled = false; m.visible = false; m.userData.rosary = true;
      tm.castShadow = false; tm.receiveShadow = false; tm.frustumCulled = false; tm.userData.rosaryTrim = true;
      m.add(tm); this.body.add(m); this.rosary = m; this.rosaryParts = P;
    } else if (this.rosary && look) {
      var Q = getRosaryParts(look);
      if (Q !== this.rosaryParts) { this.rosaryParts = Q; this.rosary.material = Q.beadMat; var t2 = this.rosary.children[0]; t2.geometry = Q.trimGeo; t2.material = Q.trimMat; }
    }
  };
  // 불경 방지(reverence.js): 인사(손 흔들기)는 입구 가까이에서 걸을 때만 — 그 밖에서는 고개 숙임. 모르는 번호는 재생하지 않는다.
  Avatar.prototype.playEmote = function (e) {
    var RV = root.ChurchReverence;
    e = RV && RV.filterEmote ? RV.filterEmote(e, this) : ((e | 0) >= 0 && (e | 0) <= 2 ? e | 0 : -1);
    if (e < 0) return;
    this.emote = e; this.emoteT = 0;
  };
  // 초 켜기 동작(약 6초): 초 쪽으로 오른손을 뻗어 불을 옮기고 → 성호경(이마→가슴→왼어깨→오른어깨) → 두 손을 가슴 앞에 모아 고개 숙임(약 1.5초) → 놓음. 걸으면 main.js 가 끊는다(cancelGesture).
  Avatar.prototype.playLightGesture = function () { this.emote = 3; this.emoteT = 0; this.abortT = 0; };
  // 부드럽게 끊는다(0.25초에 팔을 원래 자세로). 기도 끝 성호경이었다면 기도 자세도 푼다.
  Avatar.prototype.cancelGesture = function () { if (SIGN_TL[this.emote] && !(this.abortT > 0)) this.abortT = 0.25; };
  Avatar.prototype.setPose = function (x, y, z, yaw) { this.root.position.set(x, y, z); this.root.rotation.y = yaw; };
  Avatar.prototype.snapPose = function () { if (this.emote === 4 || this.emote === 5) { this.emote = -1; this.abortT = 0; if (!this.prayWant) { this.prayTarget = 0; this.prayStand = 0; } }  this.sitAmt = this.sitTarget; this.prayAmt = this.prayTarget; this.walkAmt = this.walkTarget; this.kneelLin = this.kneelTarget; this.kneelAmt = this.kneelTarget; this.rosaryAmt = this.rosaryTarget; if (this.gait) this.gait.ok = false; };   // 발도 새로 놓는다
  var KNEEL_DUR = 0.7, KNEEL_THIGH = 0.12, KNEEL_KNEE_R = 0.075, KNEEL_DEFAULT = { fwd: 1.22, y: 0.145, rail: true };
  // 무릎 꿇은 자세의 다리 각도와 관절 위치(순수 계산, 시험용으로도 공개). y = 무릎 받침 윗면 높이.
  // 반환: t1 허벅지, t2 종아리(허벅지 기준), hipY 고관절 높이, kneeY 무릎 관절 높이, hipBack 무릎에서 고관절까지 뒤로(m), shinBack 무릎에서 발목까지 뒤로(m)
  function kneelPose(y) {
    var a = -Math.acos(clamp((y + KNEEL_KNEE_R - ANKLE) / LEN_S, 0, 1));   // 종아리 절대 각(무릎에서 뒤·아래로, 발목은 바닥)
    var kneeY = ANKLE + LEN_S * Math.cos(a);
    return { t1: KNEEL_THIGH, t2: a - KNEEL_THIGH, hipY: kneeY + LEN_T * Math.cos(KNEEL_THIGH), kneeY: kneeY, hipBack: LEN_T * Math.sin(KNEEL_THIGH), shinBack: -LEN_S * Math.sin(a) };
  }

  var SKIRT_SIT = 0.17, KNEEL_HEM = 0.10, LAP_FLAT = 0.78;   // 원피스: 앉을 때 뒷자락 접힘 비율(아랫단이 좌석 윗면 위에 남는다), 무릎 꿇을 때 앞자락을 뒤로 당기는 각(rad)
  var LAP_T = [[0.095, -0.205, -0.19], [0.0, -1, 0]];   // 무릎 위 손목 목표(가슴 로컬)
  var KNEEL_FOOT = -1.45, KNEEL_HAND_Y = 0.115, KNEEL_HAND_Z = -0.30;   // 무릎 꿇을 때: 발목 각(발등 펴기), 등받이 윗단에 얹는 손목 목표(가슴 로컬)

  // ------------------------------------------------------------------ 걸음(보행): 입력이 아니라 실제 이동량으로 발을 디딘다 (docs/church/WALK_GAIT.md)
  // - 발마다 '디딤(stance)'과 '흔들기(swing)'가 있다. 디딘 발은 세계 좌표에 고정(뒤꿈치 → 발바닥 → 앞꿈치 순으로 구르는 받침점도 고정)이라 미끄러지지 않는다.
  // - 걸음 위상은 움직인 거리 / 한 주기 보폭으로 나아간다. 벽에 막혀 안 움직이면 다리도 멈추고, 멈추거나 제자리에서 돌면 발을 고쳐 딛는다.
  // - 보폭·디딤 비율은 속도의 함수(느리면 짧은 보폭 + 느린 걸음, 사람 보행 자료). 약 2.5 m/s 를 넘으면 사람은 걸어서 못 가므로 가벼운 잰걸음(체공 있음)으로 넘어간다.
  // - 다리 각도는 발목 목표점으로 2관절 IK, 골반 높이는 두 다리가 닿는 높이(그래서 걸을 때 몸이 자연스럽게 오르내린다; 카메라는 루트를 따르므로 흔들리지 않는다).
  var GAIT = {
    REACH: (LEN_T + LEN_S) * 0.9995,
    HEEL: [-0.075, 0.06], BALL: [-0.078, -0.21],   // 발목 기준 받침점 [y, z]: 뒤꿈치, 앞꿈치(발볼) — 밑창(avatar 신발) 윤곽 위의 점
    TOE_Z: -0.25,                                 // 발끝(발목 기준 z)
    TOE: 0.10,                                    // 발끝 바깥 벌림(rad; 옛 자세 0.12)
    WIDTH0: 2 * HX, WIDTH: 0.13,                  // 서 있을 때 / 걸을 때 두 발 중심 간격(m)
    JOG0: 99, JOG1: 100,                          // 잰걸음 끔(사용자 지시 2026-11-22 「성당에서 뛰는 거 아냐」, 최고 속도 2 m/s 빠른 걸음)
    SETTLE: 1.25,                                 // 멈춰 서거나 제자리에서 돌 때 발을 고쳐 딛는 주기(주기/초)
    TELE: 1.5,                                    // 한 번에 이보다 멀리 옮겨지면(순간 이동) 발을 새로 놓는다(m)
    VMAX: 9                                       // 이보다 빠른 이동도 순간 이동으로 본다(m/s)
  };
  // 한 걸음 길이(m): 걷기는 사람 보행 자료(1.2 m/s 에서 0.68 m, 속도^0.55, 다리 길이로 0.80 m 까지), 잰걸음은 0.45·v^0.68
  function stepLen(v, j) { var vv = Math.max(v, 0.02); return Math.max(0.11, lerp(Math.min(0.80, 0.68 * Math.pow(vv / 1.2, 0.55)), 0.45 * Math.pow(vv, 0.68), j)); }
  function dutyOf(v, j) { return lerp(clamp(0.64 - 0.05 * v, 0.53, 0.63), 0.36, j); }   // 한 주기에서 발이 땅에 있는 비율
  function minJerk(s) { return s * s * s * (10 + s * (-15 + 6 * s)); }
  function wrapPI(a) { a = (a + PI) % TAU; if (a < 0) a += TAU; return a - PI; }
  function frac(x) { return x - Math.floor(x); }
  function stancePitch(us, hs, to) { if (us < 0.14) return hs * (1 - sm(us / 0.14)); if (us > 0.5) return -to * Math.pow(sm((us - 0.5) / 0.5), 1.4); return 0; }
  // 디딘 자리(F: 발목 바로 밑 바닥 점 x,y,z + 발 방향 yaw)와 발 기울기 p(+ 발끝 듦: 뒤꿈치가 받침, - 뒤꿈치 듦: 앞꿈치가 받침) → 발목 세계 좌표
  function ankleAt(F, p, out) {
    var pv = p >= 0 ? GAIT.HEEL : GAIT.BALL, cy = Math.cos(p), sy = Math.sin(p);
    var ly = -pv[0], lz = -pv[1], fy = pv[0] + ly * cy - lz * sy, fz = pv[1] + ly * sy + lz * cy;
    out.x = F.x + fz * Math.sin(F.yaw); out.z = F.z + fz * Math.cos(F.yaw); out.y = F.y + ANKLE + fy;
    return out;
  }
  // 기울기 p 일 때 발목 높이 기준 밑창의 가장 낮은 점(발끝·뒤꿈치)
  function soleLow(p) { var c = Math.cos(p), s = Math.sin(p); return Math.min(-0.085 * c - GAIT.TOE_Z * s, -0.085 * c - 0.09 * s, -0.085 * c); }

  function Gait() {
    this.ok = false; this.px = 0; this.pz = 0; this.pyaw = 0; this.vx = 0; this.vz = 0; this.v = 0; this.rate = 0; this.ph = 0.05; this.settle = false; this.spin = 0;
    this.f = [0, 1].map(function () { return { st: 1, x: 0, y: 0, z: 0, yaw: 0, tx: 0, ty: 0, tz: 0, tyaw: 0, sx: 0, sy: 0, sz: 0, sp: 0, syaw: 0, b: 0.6, ax: 0, ay: 0, az: 0, p: 0, ayaw: 0, u: 0 }; });
    this.hx = 0; this.hy = HIPS_Y; this.yaw = 0; this.roll = 0; this.wi = 0; this.j = 0; this.uR = 0; this.sw = 0; this.ev = null;
    this.leg = [{ t1: 0, t2: 0, psi: 0, gam: 0, q: new T.Quaternion() }, { t1: 0, t2: 0, psi: 0, gam: 0, q: new T.Quaternion() }];
  }
  var _A = { x: 0, y: 0, z: 0 }, _B = { x: 0, y: 0, z: 0 }, _T = { x: 0, y: 0, z: 0, yaw: 0 }, _gq = new T.Quaternion(), _gq2 = new T.Quaternion(), _gv = new T.Vector3(), _ge = new T.Euler();
  // 발을 쉬는 자리(루트 옆)에 놓는다
  Gait.prototype.restOf = function (k, rx, ry, rz, yaw, width, out) {
    var side = k ? 1 : -1, lx = side * width / 2;
    out.x = rx + lx * Math.cos(yaw); out.z = rz - lx * Math.sin(yaw); out.y = ry; out.yaw = yaw - side * GAIT.TOE;
    return out;
  };
  Gait.prototype.reset = function (rx, ry, rz, yaw) {
    for (var k = 0; k < 2; k++) {
      var F = this.f[k];
      this.restOf(k, rx, ry, rz, yaw, GAIT.WIDTH0, F); F.st = 1; F.p = 0;
      ankleAt(F, 0, _A); F.ax = _A.x; F.ay = _A.y; F.az = _A.z; F.ayaw = F.yaw; F.u = frac(0.05 + (k ? 0 : 0.5));
    }
    this.px = rx; this.pz = rz; this.pyaw = yaw; this.vx = this.vz = this.v = 0; this.rate = 0; this.ph = 0.05; this.settle = false; this.ok = true;
  };
  // 한 프레임: 루트(rx,ry,rz,yaw)가 지난 프레임에서 옮겨 간 만큼 걷는다. active=false(앉기·무릎 꿇기)면 발을 쉬는 자리에 붙인다.
  // t: 시각(s), ws: 서 있을 때 체중 이동(-1..1)
  Gait.prototype.step = function (dt, rx, ry, rz, yaw, active, ws) {
    var dx = rx - this.px, dz = rz - this.pz, d = Math.sqrt(dx * dx + dz * dz), dyaw = wrapPI(yaw - this.pyaw), k, F;
    if (!this.ok || !active || d > GAIT.TELE || d > GAIT.VMAX * Math.max(dt, 1 / 60) || !(dt > 0)) { this.reset(rx, ry, rz, yaw); d = 0; dyaw = 0; dx = dz = 0; }
    this.px = rx; this.pz = rz; this.pyaw = yaw;
    var idt = 1 / Math.max(dt, 1e-3), kv = Math.min(1, dt * 14);
    this.vx += (dx * idt - this.vx) * kv; this.vz += (dz * idt - this.vz) * kv;
    var v = this.v = Math.sqrt(this.vx * this.vx + this.vz * this.vz);
    var j = this.j = sm((v - GAIT.JOG0) / (GAIT.JOG1 - GAIT.JOG0)), wi = this.wi = clamp01(v / 1.6);
    var L = stepLen(v, j), S = 2 * L, beta = dutyOf(v, j), width = lerp(GAIT.WIDTH0, GAIT.WIDTH, sm(v / 0.8));
    // 발을 고쳐 디딜지: 거의 멈췄는데 발이 쉬는 자리에서 벗어나 있거나, 제자리에서 돌고 있다
    this.spin += (Math.abs(dyaw) * idt - this.spin) * Math.min(1, dt * 10);
    var off = false;
    for (k = 0; k < 2; k++) {
      F = this.f[k];
      if (!F.st) { off = true; continue; }
      this.restOf(k, rx, ry, rz, yaw, width, _B);
      if ((F.x - _B.x) * (F.x - _B.x) + (F.z - _B.z) * (F.z - _B.z) > 0.0036 || Math.abs(wrapPI(F.yaw - _B.yaw)) > 0.3) off = true;
    }
    var still = v < 0.12;
    if (still && (off || this.spin > 0.6)) this.settle = true;
    var dph = active ? d / S : 0;
    if (this.settle) dph = Math.max(dph, dt * GAIT.SETTLE);
    if (dph > 0.45) { this.reset(rx, ry, rz, yaw); dph = 0; }
    this.rate += (dph * idt - this.rate) * Math.min(1, dt * 8);
    this.ph = frac(this.ph + dph);
    var ia = sm(v / 1.1), hs = 0.24 * ia * (1 - 0.6 * j), to = 0.70 * ia + 0.15 * j;
    var lift = 0.022 + 0.035 * sm(v / 1.5) + 0.09 * j;
    var dirx, dirz;
    if (v > 0.05) { dirx = this.vx / v; dirz = this.vz / v; } else { dirx = -Math.sin(yaw); dirz = -Math.cos(yaw); }
    var ev = null, bothDown = true;
    for (k = 0; k < 2; k++) {
      F = this.f[k];
      var u = frac(this.ph + (k ? 0 : 0.5)), side = k ? 1 : -1;
      if (!F.st && u < F.u) {   // 착지(위상이 한 바퀴 돌았다): 지난 프레임에 정한 자리에 디딘다
        F.st = 1; F.x = F.tx; F.y = F.ty; F.z = F.tz; F.yaw = F.tyaw;
        ev = { side: side, v: v };
      } else {
        // 착지 예정 자리: 남은 흔들기 시간 뒤 루트 + 진행 방향으로 디딤 길이의 절반
        var rem = Math.min(0.5, (1 - u) / Math.max(this.rate, 0.3));
        this.restOf(k, rx + this.vx * rem, ry, rz + this.vz * rem, yaw, width, _B);
        var reach = 0.5 * beta * S * 0.92 * clamp01(v / 0.3);
        F.tx = _B.x + dirx * reach; F.tz = _B.z + dirz * reach; F.ty = ry; F.tyaw = _B.yaw;
        if (F.st && u >= beta && u > F.u && dph > 0) {          // 들어 올린다
          F.st = 0; F.sx = F.ax; F.sy = F.ay; F.sz = F.az; F.sp = F.p; F.syaw = F.ayaw; F.b = beta;
        }
      }
      F.u = u;
      if (F.st) {
        var us = clamp01(u / beta);
        if (u >= beta) us = 1;
        F.p = stancePitch(us, hs, to);
        ankleAt(F, F.p, _A); F.ax = _A.x; F.ay = _A.y; F.az = _A.z; F.ayaw = F.yaw;
      } else {
        bothDown = false;
        var s = clamp01((u - F.b) / (1 - F.b)), e = minJerk(s);
        _T.x = F.tx; _T.y = F.ty; _T.z = F.tz; _T.yaw = F.tyaw;
        ankleAt(_T, hs, _A);
        F.p = lerp(F.sp, hs, sm(s / 0.75));
        F.ax = lerp(F.sx, _A.x, e); F.az = lerp(F.sz, _A.z, e);
        F.ay = lerp(F.sy, _A.y, e) + lift * Math.sin(PI * Math.pow(s, 0.8));
        F.ayaw = F.syaw + wrapPI(F.tyaw - F.syaw) * e;
        var floorY = Math.min(F.sy, _A.y) - ANKLE;   // 흔드는 발끝·뒤꿈치가 바닥을 파고들지 않게
        var low = F.ay + soleLow(F.p);
        if (low < floorY + 0.004) F.ay += floorY + 0.004 - low;
      }
    }
    if (this.settle && bothDown && !off && still) this.settle = false;
    this.ev = ev;
    // ---- 골반: 디딘 발 쪽으로 옆 이동, 다리를 따라 비틀림(어깨는 반대로), 흔드는 쪽이 조금 내려간다 ----
    var uR = this.uR = this.f[1].u, gw = sm(wi * 3);
    this.sw = Math.cos(TAU * uR);
    var mid = TAU * (uR - beta / 2);
    this.hx = (0.016 * Math.cos(mid) * (1 - j * 0.5)) * gw + 0.012 * ws;
    this.yaw = (0.035 + 0.045 * wi) * this.sw * gw;
    this.roll = 0.035 * Math.cos(mid) * gw * (1 - j * 0.5) - 0.03 * ws;
    // 골반 높이: 기준 높이와 두 발목이 닿는 높이 중 낮은 쪽(잰걸음은 디딘 동안 무릎을 굽혀 더 낮춘다)
    var bump = 0;
    for (k = 0; k < 2; k++) if (this.f[k].st) bump = Math.max(bump, Math.sin(PI * clamp01(this.f[k].u / beta)));
    var y0 = HIPS_Y - 0.001 - (0.006 * sm(v / 1.2) + 0.02 * sm((v - 1.2) / 1.0) + 0.03 * j) - (0.05 * j + 0.012 * ia * (1 - j)) * bump;
    var cyw = Math.cos(yaw), syw = Math.sin(yaw), cps = Math.cos(this.yaw), sps = Math.sin(this.yaw), cr = Math.cos(this.roll), sr = Math.sin(this.roll);
    var hy = y0;
    for (k = 0; k < 2; k++) {
      F = this.f[k]; side = k ? 1 : -1;
      var ax = F.ax - rx, az = F.az - rz, lx = ax * cyw - az * syw, lz = ax * syw + az * cyw;
      var jxr = side * HX * cr + 0.05 * sr, jy = side * HX * sr - (HIPS_Y - HIP_JOINT) * cr;
      var jx = this.hx + jxr * cps, jz = -jxr * sps;
      var hd2 = (lx - jx) * (lx - jx) + (lz - jz) * (lz - jz);
      // 디딘 직후(디딤의 0~30%)에는 무릎을 조금 굽혀 받는다(하중 반응). 흔드는 발은 착지 직전에만 골반 높이를 잡는다(그 전에는 무릎을 더 굽힌다).
      var uu = clamp01(F.u / beta), load = F.st && uu < 0.3 ? 0.012 * ia * (1 - j) * Math.sin(PI * uu / 0.3) : 0;
      if (!F.st) load = -0.2 * (1 - sm((clamp01((F.u - F.b) / (1 - F.b)) - 0.75) / 0.25));
      var hm = (F.ay - ry) + Math.sqrt(Math.max(0, GAIT.REACH * GAIT.REACH - hd2)) - jy - load;
      if (hm < hy) hy = hm;
    }
    this.hy = Math.max(hy, 0.55);
    // ---- 다리 IK(골반 기준) ----
    _ge.set(0, this.yaw, this.roll, 'YXZ'); _gq.setFromEuler(_ge).invert();
    for (k = 0; k < 2; k++) {
      F = this.f[k]; side = k ? 1 : -1;
      var bx = F.ax - rx, bz = F.az - rz;
      _gv.set(bx * cyw - bz * syw - this.hx, F.ay - ry - this.hy, bx * syw + bz * cyw).applyQuaternion(_gq);
      _gv.x -= side * HX; _gv.y -= HIP_JOINT - HIPS_Y;
      var fy = wrapPI(F.ayaw - yaw), rel = wrapPI(fy - this.yaw) + side * GAIT.TOE;
      var psi = clamp(0.8 * rel, -0.5, 0.5), cp = Math.cos(psi), sp = Math.sin(psi);
      var X = _gv.x * cp - _gv.z * sp, Y = _gv.y, Z = _gv.x * sp + _gv.z * cp;
      var dist = Math.sqrt(X * X + Y * Y + Z * Z), dc = clamp(dist, 0.2, LEN_T + LEN_S - 1e-4);
      if (dc !== dist && dist > 1e-6) { X *= dc / dist; Y *= dc / dist; Z *= dc / dist; }
      var ck = clamp((dc * dc - LEN_T * LEN_T - LEN_S * LEN_S) / (2 * LEN_T * LEN_S), -1, 1), kn = Math.acos(ck);
      var P = LEN_T + LEN_S * ck, gam = Math.asin(clamp(X / P, -1, 1)), Q = P * Math.cos(gam), R = -LEN_S * Math.sin(kn), det = Q * Q + R * R;
      var lg = this.leg[k];
      lg.t1 = Math.atan2((R * Y - Q * Z) / det, (-Q * Y - R * Z) / det); lg.t2 = -kn; lg.psi = psi; lg.gam = gam;
      // 발: 원하는 방향(골반 기준) = 골반⁻¹ · 발 yaw · 발 기울기, 발 뼈 로컬 = (허벅지·종아리)⁻¹ · 그것
      _ge.set(F.p, fy, 0, 'YXZ'); lg.q.setFromEuler(_ge).premultiply(_gq);
      _ge.set(lg.t1, psi, gam, 'YXZ'); _gq2.setFromEuler(_ge);
      _ge.set(lg.t2, 0, 0, 'YXZ'); _gq2.multiply(_q3.setFromEuler(_ge)).invert();
      lg.q.premultiply(_gq2);
    }
    return this;
  };
  Avatar.prototype.takeStep = function () { var g = this.gait, e = g && g.ev; if (g) g.ev = null; return e || null; };   // 이번 프레임에 디딘 발({side, v}) — main.js 가 발소리를 낸다

  Avatar.prototype.update = function (dt, t) {
    var k = Math.min(1, dt * 10);
    this.walkAmt += (this.walkTarget - this.walkAmt) * k;
    this.sitAmt += (this.sitTarget - this.sitAmt) * Math.min(1, dt * 7);
    this.prayAmt += (this.prayTarget - this.prayAmt) * Math.min(1, dt * 5);
    this.rosaryAmt += (this.rosaryTarget - this.rosaryAmt) * Math.min(1, dt * ROSARY.FADE);
    var kl = this.kneelLin, kt = this.kneelTarget;
    if (kl !== kt) { kl += (kt > kl ? 1 : -1) * dt / KNEEL_DUR; this.kneelLin = kl = clamp01(kt > this.kneelLin ? Math.min(kl, kt) : Math.max(kl, kt)); this.kneelAmt = sm(kl); }
    var sa = this.sitAmt, pa = this.prayAmt * Math.max(sa, this.prayStand || 0), ka = this.kneelAmt * sa;
    var emoting = this.emote >= 0, eU = 0, eEnv = 0, sp = null, jw = 0;
    if (emoting) {
      this.emoteT += dt; eU = this.emoteT / EMOTE_DUR[this.emote];
      var ab = 1;
      if (this.abortT > 0) { this.abortT -= dt; if (this.abortT <= 0) eU = 1; else ab = this.abortT / 0.25; }
      if (eU >= 1) {
        if (this.emote === 5 && !this.prayWant) { this.prayTarget = 0; this.prayStand = 0; }
        this.emote = -1; this.abortT = 0; emoting = false; eU = 0;
      } else if (SIGN_TL[this.emote]) { sp = signPhase(this.emote, this.emoteT); eEnv = sp.cw * ab; jw = sp.jw * ab; }
      else eEnv = Math.min(sm(eU / 0.12), sm((1 - eU) / 0.12));
    }
    var bow = emoting && this.emote === 2 ? Math.sin(eU * PI) : 0;   // jw = 성호경 끝 두 손 모음(고개를 살짝 숙인다)
    if (this.lod === 2) {
      var fv = this._variant();
      if (fv !== this._fv) { this._fv = fv; this._applyFar(fv); }
      // 원거리 임포스터: 무릎 꿇으면 앉은 모양을 앞으로 옮기고 조금 올린다
      if (this.imp) this.imp.position.set(0, ka > 0.001 ? (kneelPose(this.kneelY).hipY - 0.529) * ka : 0, -ka * (this.kneelFwd + SEAT_BACK));
      this.shadow.visible = false;
      if (this.gait) this.gait.ok = false;   // 다시 가까워지면 발을 새로 놓는다
      return;
    }
    var bs = this.bones;
    var br = Math.sin(t * 1.6 + this.off);          // 숨쉬기

    // ---- 걸음(실제 이동량으로; 앉기·무릎 꿇기 중에는 발을 쉬는 자리에 둔다) ----
    var g = this.gait || (this.gait = new Gait()), rp = this.root.position;
    var ws0 = Math.sin(t * 0.7 + this.off) * (1 - sa);
    g.step(dt, rp.x, rp.y, rp.z, this.root.rotation.y, this.sitTarget === 0 && this.sitAmt < 0.02 && this.kneelAmt < 0.01, ws0 * (1 - g.wi));
    var w = g.wi * (1 - sa), jg = g.j * (1 - sa), sR = g.sw * sm(w * 4), ph = TAU * g.uR;   // sR: 오른다리가 앞일 때 +1(서 있으면 0 — 팔은 가만히)
    this.phase = ph;
    var ws = ws0 * (1 - w);   // 체중 이동
    var cw = sm(clamp01(sa * 4));   // 앉기·무릎 꿇기 쪽으로 넘어간 정도(1 이면 옛 계산 그대로)
    var lR = g.leg[1], lL = g.leg[0];

    // ---- 다리 각도(서기: IK 보행/대기, 앉기: 90도 굽힘) ----
    var t1R = lerp(lR.t1, 1.45, sa), t1L = lerp(lL.t1, 1.45, sa);
    var t2R = lerp(lR.t2, -1.65, sa), t2L = lerp(lL.t2, -1.65, sa);
    var KP = null;
    if (ka > 0.001) {   // 무릎 꿇기: 허벅지는 거의 수직, 종아리는 뒤로 눕고 발목은 바닥
      KP = kneelPose(this.kneelY);
      t1R = lerp(t1R, KP.t1, ka); t1L = lerp(t1L, KP.t1, ka); t2R = lerp(t2R, KP.t2, ka); t2L = lerp(t2L, KP.t2, ka);
    }
    // 발: 서 있으면 IK 가 정한 방향, 앉기·무릎 꿇기로 가면 옛 계산(바닥과 평행, 무릎 꿇으면 발등 펴기)
    var fR = -(t1R + t2R), fL = -(t1L + t2L);
    if (KP) { fR = lerp(fR, KNEEL_FOOT, ka); fL = lerp(fL, KNEEL_FOOT, ka); }   // 발등을 펴서 발끝이 뒤로
    // 골반 높이: 서 있으면 두 발이 닿는 높이(IK), 앉기 쪽은 발이 바닥 아래로 가지 않도록(더 낮은 쪽 다리에 맞춤)
    var hjR = ANKLE + LEN_T * Math.cos(t1R) + LEN_S * Math.cos(t1R + t2R), hjL = ANKLE + LEN_T * Math.cos(t1L) + LEN_S * Math.cos(t1L + t2L);
    var hipJ = Math.max(hjR, hjL);
    var bob = Math.sin(t * 2.1 + this.off) * 0.0015;
    var hips = bs[B.hips];
    var hipZ = SEAT_BACK * sa;
    if (KP) hipZ = lerp(hipZ, -(this.kneelFwd - KP.hipBack), ka);   // 무릎이 무릎틀 중심 위에 오도록 몸을 앞으로
    hips.position.set(g.hx * (1 - cw), lerp(g.hy, hipJ + (HIPS_Y - HIP_JOINT), cw) + bob, hipZ);
    setE(bs[B.ulR], t1R, lR.psi * (1 - cw), lerp(lR.gam, 0.05, sa));
    setE(bs[B.ulL], t1L, lL.psi * (1 - cw), lerp(lL.gam, -0.05, sa));
    setE(bs[B.llR], t2R, 0, 0); setE(bs[B.llL], t2L, 0, 0);
    setE(bs[B.ftR], fR, -0.12 * (1 - sa * 0.5), 0); setE(bs[B.ftL], fL, 0.12 * (1 - sa * 0.5), 0);
    if (cw < 1) { bs[B.ftR].quaternion.slerp(lR.q, 1 - cw); bs[B.ftL].quaternion.slerp(lL.q, 1 - cw); }   // cw = 0(서 있음)이면 IK 발 방향 그대로

    // ---- 몸통 ----
    var turn = g.yaw * (1 - cw);
    var lean = -(0.06 * sm(w * 2) + 0.06 * jg);
    var hipsRy = turn, spineRy = -0.8 * turn, chestRy = -0.8 * turn;
    var spX = lerp(lean - 0.02, -0.02, sa) + (-0.10) * pa + (-0.40) * bow - 0.05 * jw;
    var chX = lerp(-0.012 + br * 0.006, -0.03, sa) + (-0.07) * pa + (-0.25) * bow;
    setE(hips, 0, hipsRy, g.roll * (1 - cw));
    var sk = sa * (1 - ka);
    // 아랫자락: 뒷자락(skirt)은 앉으면 좌석판 위로 접히고(원피스는 더 많이), 앞자락(ckL/ckR)은 허벅지를 따라간다.
    // 무릎 꿇으면 앞자락을 조금 뒤로 당겨 앞줄 등받이에 닿지 않게 한다.
    var dress = this.cfg && this.cfg.g === 0 ? 1 : 0;
    setE(bs[B.skirt], -0.30 * sk, 0, 0); bs[B.skirt].scale.set(1, lerp(1, dress ? SKIRT_SIT : 0.30, sk), 1);
    var ck = 0.6 + 0.4 * sa, ckK = dress ? KNEEL_HEM * ka : 0;
    setE(bs[B.ckR], t1R * ck + ckK, 0, 0.04 * sa); setE(bs[B.ckL], t1L * ck + ckK, 0, -0.04 * sa);
    if (dress) { var cz = lerp(1, LAP_FLAT, sk), cx = lerp(1, 0.74, sk); bs[B.ckR].scale.set(cx, 1, cz); bs[B.ckL].scale.set(cx, 1, cz); }   // 앉으면 앞자락이 허벅지 위에 내려앉는다(쟁반처럼 뜨지 않게)
    setE(bs[B.spine], spX, spineRy, -0.012 * ws * 0);
    setE(bs[B.chest], chX, chestRy, 0.012 * ws);
    bs[B.chest].scale.y = 1 + br * 0.005;
    // 머리·목
    var nodv = 0;
    if (this.nod && pa > 0.5) { var ph2 = Math.sin(t * 0.55 + this.nodPh); nodv = ph2 > 0.93 ? (ph2 - 0.93) * 4 : 0; }
    var gaze = Math.sin(t * 0.37 + this.off) * Math.sin(t * 0.11 + this.off * 2) * (1 - pa);
    setE(bs[B.neck], 0.02 - 0.20 * pa - 0.12 * bow - 0.14 * jw - nodv * 0.4, (gaze * 0.12) * (1 - w) - (hipsRy + spineRy + chestRy) * 0.0, Math.sin(ph) * 0.02 * w);
    setE(bs[B.head], -0.02 - 0.28 * pa - 0.10 * bow - 0.16 * jw - nodv * 0.6 + 0.02 * Math.sin(t * 0.9 + this.off), (gaze * 0.2) * (1 - w) + (-(hipsRy + spineRy + chestRy)) * 0.5, 0);

    // ---- 팔 ----
    var armA = 0.10 + 0.22 * w + 0.10 * jg, elb = 0.20 + 0.22 * w + 0.85 * jg + 0.04 * br, side, qs = this.qs;   // 팔 흔들기: 보통 걸음(1.2 m/s)에서 위팔 약 30°, 잰걸음은 팔꿈치를 굽힌다
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
      if (pa > 0.001 || jw > 0.001) {
        // 무릎 꿇고 앞에 등받이가 있으면 모은 손을 그 윗단(손잡이) 위에 얹는다
        var kr = ka * this.kneelRail;
        arm2(side, side * 0.021, lerp(0.065, KNEEL_HAND_Y, kr), lerp(-0.185, KNEEL_HAND_Z, kr), side * 0.55, -1, 0.35, qs.pU[idx], qs.pF[idx]);
        handQ(side, 0, 0.72, -0.69, -side, 0, 0, _q1);
        qs.pH[idx].copy(_q2.copy(qs.pU[idx]).multiply(qs.pF[idx]).invert()).multiply(_q1);
        if (pa > 0.001) { qU.slerp(qs.pU[idx], pa); qF.slerp(qs.pF[idx], pa); qH.slerp(qs.pH[idx], pa); }
      }
      if (emoting && side > 0 && eEnv > 0.001 && this.emote !== 2) {
        var tx, ty, tz, fx, fy, fz, nx, ny, nz, px = 0.6, py = -1, pz = 0.3;
        if (this.emote === 3 && this.emoteT < sp.tl.c0) {
          // 초 쪽으로 손을 앞·아래로 뻗어 심지에 불을 옮긴다(끝에서 살짝 흔들림)
          var rp = sm(clamp(this.emoteT / 0.59, 0, 1));
          tx = 0.12; ty = 0.04 + 0.05 * Math.sin(this.emoteT * 6) * rp; tz = -0.43 * rp - 0.17 * (1 - rp);
          fx = 0; fy = -0.2; fz = -1; nx = 0; ny = -1; nz = -0.2; px = 0.6; py = -0.6; pz = 0.3;
        } else if (sp) {
          // 성호경: 이마 → 가슴 → 왼어깨 → 오른어깨
          var ic = Math.floor(sp.u), fc = sm(sp.u - ic);
          var Ac = CROSS[Math.min(3, ic)], Bc = CROSS[Math.min(3, ic + 1)];
          tx = lerp(Ac[0], Bc[0], fc); ty = lerp(Ac[1], Bc[1], fc); tz = lerp(Ac[2], Bc[2], fc);
          fx = lerp(Ac[3], Bc[3], fc); fy = lerp(Ac[4], Bc[4], fc); fz = lerp(Ac[5], Bc[5], fc);
          nx = lerp(Ac[6], Bc[6], fc); ny = lerp(Ac[7], Bc[7], fc); nz = lerp(Ac[8], Bc[8], fc);
          if (this.emote === 3 && this.emoteT < sp.tl.c0 + 0.35) { var bl = sm((this.emoteT - sp.tl.c0) / 0.35); tx = lerp(0.12, tx, bl); ty = lerp(0.04 + 0.05 * Math.sin(this.emoteT * 6), ty, bl); tz = lerp(-0.43, tz, bl); }
        } else if (this.emote === 0) {
          var wv = Math.sin(this.emoteT * 11) * 0.38;
          tx = 0.25; ty = 0.30; tz = -0.12; fx = Math.sin(wv); fy = Math.cos(wv); fz = -0.22; nx = 0; ny = 0; nz = -1; px = 0.9; py = -0.8; pz = 0.3;
        }
        arm2(1, tx, ty, tz, px, py, pz, qs.eU, qs.eF2);
        handQ(1, fx, fy, fz, nx, ny, nz, _q1);
        var eF2 = qs.eF2;
        qs.eH.copy(_q2.copy(qs.eU).multiply(eF2).invert()).multiply(_q1);
        qU.slerp(qs.eU, eEnv); qF.slerp(eF2, eEnv); qH.slerp(qs.eH, eEnv);
      }
      // 성호경 끝: 두 손을 가슴 앞에 모은다(기도 자세와 같은 손 위치·방향 qs.p*, 양팔 같은 가중치라 서로 엇갈리지 않는다)
      if (jw > 0.001) { qU.slerp(qs.pU[idx], jw); qF.slerp(qs.pF[idx], jw); qH.slerp(qs.pH[idx], jw); }
      ua.quaternion.copy(qU); fa.quaternion.copy(qF); ha.quaternion.copy(qH);
    }
    // 이름표 높이
    if (this.tag) {
      var ty = 1.88 + HEAD_UP - 0.35 * sa - 0.15 * pa - 0.35 * bow - 0.015 * w + (KP ? (KP.hipY - 0.529) * ka : 0);
      this.tagY = ty;
      this.tag.position.y = ty;
      this.tag.position.z = hipZ - SEAT_BACK * sa;
      // 화면에서 읽기 좋은 크기로(가까우면 작게, 멀면 크게; 다른 사람은 멀면 흐려져 사라진다). 아바타 로드 후 첫 프레임부터 적용.
      var LF = root.ChurchLabelFit;
      if (LF && VIEW.on && this.lod === 0) {
        var pr = LF.PRESETS[this.tagSelf ? 'self' : 'peer'], rp = this.root.position;
        var dep = LF.depthOf(VIEW.c, VIEW.f, rp.x, rp.y + ty, rp.z);
        if (dep > 0.1) {
          var ff = LF.farFade(dep, pr), fh = LF.fit(dep, VIEW.h, VIEW.fov, pr).h * (0.75 + 0.25 * ff);
          this.tag.visible = ff > 0;
          this.tag.scale.set(fh * (0.78 / 0.195), fh, 1);
          this.tag.position.y = ty + LF.anchorLift(fh, pr);
          this.tagPpm = LF.pxPerMeter(dep, VIEW.h, VIEW.fov);                 // 1m 의 화면 px
          this.tagPx = fh * pr.pill * this.tagPpm;                            // 알약의 화면 높이(CSS px): 표식 이름표와 겹침을 피하는 데 쓴다
        }
      }
    }
    this.shadow.position.y = 0.03;
    this.shadow.position.z = hipZ - SEAT_BACK * sa;
    // ---- 묵주: 쥔 손(오른손; 손을 모으면 두 손바닥 사이)에서 아래로 늘어진다 ----
    var ro = this.rosary;
    if (ro) {
      var ra = this.rosaryAmt;
      if (ra < 0.02 || this.lod !== 0 || ro.userData.fadeHide) ro.visible = false;   // 가까운 아바타(LOD0)만 그린다
      else {
        var hR = bs[B.haR];
        hR.updateWorldMatrix(true, false);
        _v.set(0, -ROSARY.PALM, 0).applyMatrix4(hR.matrixWorld);
        if (pa > 0.001) {
          var hL = bs[B.haL];
          hL.updateWorldMatrix(true, false);
          _x.set(0, -ROSARY.PALM, 0).applyMatrix4(hL.matrixWorld);
          _v.lerp(_x, 0.5 * pa);
        }
        this.body.worldToLocal(_v);
        // 무릎 꿇고 앞 등받이 윗단에 손을 얹었으면, 묵주는 등받이 뒷면(내 쪽)과 몸 사이로 늘어진다(등받이를 뚫지 않게).
        var rr = pa * ka * this.kneelRail;
        ro.position.set(_v.x, _v.y - ROSARY.RAIL_DY * rr, _v.z + ROSARY.RAIL_DZ * rr);
        // 서 있을 때는 고리가 몸 옆면과 나란하게(다리에 파묻히지 않게), 앉아 손을 모으면 정면을 보게 돌린다. 걸을 때는 조금 흔들린다.
        ro.rotation.set(0.22 * w * Math.sin(ph), (1 - Math.max(sa, pa)) * PI / 2, 0.03 * Math.sin(t * 1.3 + this.off));
        ro.scale.setScalar(ra > 0.98 ? 1 : ra);
        ro.visible = true;
      }
    }
  };

  root.ChurchAvatar = {
    _dbg: { MB: MB, buildHead: buildHead, buildFace: buildFace, buildNeck: buildNeck, buildHair: buildHair, buildHand: buildHand, buildShoes: buildShoes, buildCoat: buildCoat, buildSleeves: buildSleeves, buildPants: buildPants, buildFar: buildFar },
    Avatar: Avatar, tagMaterial: tagMaterial, setView: setView, HEIGHT: HEIGHT, SEAT_BACK: SEAT_BACK,
    ROSARY: ROSARY, rosaryGeometry: getRosaryGeo, rosaryParts: getRosaryParts, normRosaryLook: normRosaryLook, HEAD: { S: HEAD_S, PIV: HEAD_PIV, UP: HEAD_UP }, HEM: HEM, RIM: RIM,
    SIGN: { TL: SIGN_TL, DUR: EMOTE_DUR, phase: signPhase }, kneelPose: kneelPose, KNEEL: { DUR: KNEEL_DUR, KNEE_R: KNEEL_KNEE_R, HAND_Y: KNEEL_HAND_Y, HAND_Z: KNEEL_HAND_Z, HIPS_Y: HIPS_Y, HIP_JOINT: HIP_JOINT, CHEST_Y: 1.20, TORSO_HALF: 0.12 },
    // 삼각형 수(검증용). near/mid['g<성별>s<모양>'] = 8가지 조합별, style<i> = 성별 중 최댓값
    stats: function () {
      var out = { near: {}, mid: {}, far: [] }, s, g;
      for (s = 0; s < 4; s++) {
        out.near['style' + s] = 0; out.mid['style' + s] = 0;
        for (g = 0; g < 2; g++) {
          var nt = getPack('near', 'smooth', g, s).tris + getPack('near', 'cloth', g, 0).tris, mt = getPack('mid', 'smooth', g, s).tris + getPack('mid', 'cloth', g, 0).tris;
          out.near['g' + g + 's' + s] = nt; out.mid['g' + g + 's' + s] = mt;
          out.near['style' + s] = Math.max(out.near['style' + s], nt); out.mid['style' + s] = Math.max(out.mid['style' + s], mt);
        }
      }
      out.far = [getFar(0, 0).tris, getFar(1, 0).tris, getFar(2, 0).tris, getFar(0, 1).tris, getFar(1, 1).tris, getFar(2, 1).tris];
      out.nearCloth = getPack('near', 'cloth', 0, 0).tris; out.nearSmooth0 = getPack('near', 'smooth', 0, 0).tris;
      return out;
    },
    normalizeCfg: normalizeCfg
  };
})(typeof window !== 'undefined' ? window : this);

