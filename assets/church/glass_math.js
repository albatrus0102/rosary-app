/* glass_math.js — 스테인드글라스 감상(G-04/05/07/11)의 순수 계산. three.js·DOM 없이 Node 에서도 돈다(require / window.ChurchGlassMath).
   - 카탈로그 조회·실제 크기 추정, 카메라 구도(거리·확대 한계·이동 한계·핀치 고정점), 질감 단계 선택
   - 색: sRGB<->선형, 유리 어깨 곡선(1.0 이하는 항등), Khronos PBR Neutral, sRGB->Lab, CIEDE2000
   - 빛 상태(ref/sun/night) -> 투과량·색조·바닥 색빛 세기
   테스트: tools/church_web/glass.test.mjs */
(function (root) {
  'use strict';
  var PI = Math.PI, D2R = PI / 180;
  var ID_RE = /^[a-z0-9_]{1,40}$/;

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  // ---------------- 카탈로그 ----------------
  function indexCatalog(cat) {
    var by = {};
    var list = (cat && cat.windows) || [];
    for (var i = 0; i < list.length; i++) if (list[i] && ID_RE.test(list[i].id)) by[list[i].id] = list[i];
    return by;
  }
  function lookup(index, id) {
    if (typeof id !== 'string' || !ID_RE.test(id)) return null;
    return Object.prototype.hasOwnProperty.call(index, id) ? index[id] : null;
  }

  // 실제 크기를 모를 때 형태별 기본값(긴 변, m). 'est' 로 표시한다.
  function defaultLongSide(form, aspect) {
    var f = String(form || '').toLowerCase();
    if (f.indexOf('rose') === 0) return 8.0;
    if (f.indexOf('oculus') === 0) return 3.5;
    if (f.indexOf('lancet') === 0) {
      if (/연창|트레이서리/.test(f)) return 8.0;      // 여러 칸 + 트레이서리
      if (/반원/.test(f)) return 4.5;
      return 6.0;
    }
    if (/부분/.test(f)) return 2.4;
    if (f.indexOf('panel') === 0) return aspect > 1.2 ? 2.4 : 1.2;
    return 2.5;
  }
  // entry -> {w, h, status:'known'|'est'} (미터). 사진 비율(aspect_w_over_h)을 우선해 모양을 지킨다.
  function sizeOf(entry) {
    var a = +(entry && entry.aspect_w_over_h) || 1;
    var rs = (entry && entry.real_size_m) || {};
    var w = +rs.width || 0, h = +rs.height || 0;
    var st = rs.status === 'known' ? 'known' : 'est';
    // 판 모양은 언제나 사진 비율을 따른다(늘이지 않는다). 둘 다 알면 높이를 기준으로 한다(실제 비율과 2% 넘게 다르면 카탈로그 검증 오류).
    if (w > 0 && h > 0) return { w: h * a, h: h, status: st };
    if (w > 0) return { w: w, h: w / a, status: st };
    if (h > 0) return { w: h * a, h: h, status: st };
    var L = defaultLongSide(entry && entry.form, a);
    return a >= 1 ? { w: L, h: L / a, status: 'est' } : { w: L * a, h: L, status: 'est' };
  }

  // ---------------- 질감 단계 ----------------
  var TIERS = { t1: '1k', t2: '2k' };
  function normTier(t) { return t === 't1' ? 't1' : 't2'; }
  // caps: {maxTex, deviceMemory(GB, 없으면 모름), low(bool: 저화질 모드)}
  function selectTier(req, caps) {
    caps = caps || {};
    var t = normTier(req);
    if (t === 't2' && ((caps.maxTex && caps.maxTex < 2048) || (caps.deviceMemory && caps.deviceMemory < 2))) t = 't1';
    return t;
  }
  function tierFile(id, tier) { return 'glass_' + id + '_' + TIERS[normTier(tier)] + '.webp'; }
  function packFile(id, tier) { return 'gpack_' + id + '_' + TIERS[normTier(tier)] + '.js'; }
  function packKey(id, tier) { return id + '_' + TIERS[normTier(tier)]; }
  function tierPx(entry, tier) {
    var f = entry && entry.files && entry.files[TIERS[normTier(tier)]];
    return f && f.px ? f.px : null;
  }
  // GPU 메모리(MB): w*h*4*(밉맵 4/3)
  function texMb(w, h) { return w * h * 4 * 4 / 3 / (1024 * 1024); }

  // ---------------- 카메라 구도 ----------------
  // 세로 시야각 fovDeg, 화면 비율 aspect(w/h)에서 w×h 판이 화면의 fill(0.84) 안에 들어오는 거리
  function frameDistance(w, h, aspect, fovDeg, fill) {
    fill = fill || 0.84;
    var tv = Math.tan(fovDeg * D2R / 2), th = tv * aspect;
    return Math.max(h / (2 * tv * fill), w / (2 * th * fill));
  }
  // 확대 배율 z 의 세로 시야각(도): tan(f/2) = tan(f0/2)/z (정확한 배율)
  function zoomFov(fov0, z) { return 2 * Math.atan(Math.tan(fov0 * D2R / 2) / Math.max(1e-6, z)) / D2R; }
  // 확대 한계: 질감 1텍셀이 CSS 2px 을 넘지 않을 때까지, 1..cap(8)
  // texPx: 질감 [w,h], winCss: 1배에서 창이 화면에 차지하는 CSS px [w,h]
  function zoomMax(texPx, winCss, cap, cssPerTexel) {
    cap = cap || 8; cssPerTexel = cssPerTexel || 2;
    if (!texPx || !winCss || !(winCss[0] > 0) || !(winCss[1] > 0)) return 1;
    var k = Math.min(texPx[0] * cssPerTexel / winCss[0], texPx[1] * cssPerTexel / winCss[1]);
    return clamp(k, 1, cap);
  }
  // 1배 구도에서 창이 차지하는 CSS 크기
  function windowCss(w, h, dist, fovDeg, viewW, viewH) {
    var tv = Math.tan(fovDeg * D2R / 2), visH = 2 * dist * tv, visW = visH * viewW / viewH;
    return [w / visW * viewW, h / visH * viewH];
  }
  // 보이는 반폭/반높이(창 평면 위, m)
  function halfVisible(dist, fovDeg, aspect, zoom) {
    var hy = dist * Math.tan(fovDeg * D2R / 2) / zoom;
    return { hx: hy * aspect, hy: hy };
  }
  // 이동 한계: 화면 가장자리가 창 가장자리(+4%)까지만 가게 한다. 1배에서는 0.
  function clampPan(px, py, w, h, hv) {
    var lx = Math.max(0, w * 0.54 - hv.hx), ly = Math.max(0, h * 0.54 - hv.hy);
    return { x: clamp(px, -lx, lx) + 0, y: clamp(py, -ly, ly) + 0 };
  }
  // 핀치: 화면의 ndc(sx,sy) 아래 점이 확대 전후 같은 자리에 머물도록 이동량을 고친다
  function pinchPan(px, py, sx, sy, hv0, hv1) {
    var Px = px + sx * hv0.hx, Py = py + sy * hv0.hy;
    return { x: Px - sx * hv1.hx, y: Py - sy * hv1.hy };
  }
  function easeInOut(t) { t = clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  // ---------------- 색 ----------------
  function s2l(c) { return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  function l2s(c) { return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055; }
  // 유리 곡선(선형 RGB): 최댓값 ≤1 이면 항등(기준광 = 사진 값). 넘으면 색상각을 지키며 1로 줄이고 넘친 만큼 흰색 쪽으로(햇빛 하이라이트).
  function glassCurve(r, g, b) {
    var p = Math.max(r, g, b);
    if (p <= 1) return [r, g, b];
    var w = 1 - 1 / (1 + 0.6 * (p - 1));
    return [r / p + (1 - r / p) * w, g / p + (1 - g / p) * w, b / p + (1 - b / p) * w];
  }
  // Khronos PBR Neutral (선형 RGB, exposure 는 미리 곱한다)
  function neutral(r, g, b) {
    var start = 0.8 - 0.04, desat = 0.15;
    var x = Math.min(r, g, b), off = x < 0.08 ? x - 6.25 * x * x : 0.04;
    r -= off; g -= off; b -= off;
    var peak = Math.max(r, g, b);
    if (peak < start) return [r, g, b];
    var d = 1 - start, np = 1 - d * d / (peak + d - start);
    var k = np / peak; r *= k; g *= k; b *= k;
    var gg = 1 - 1 / (desat * (peak - np) + 1);
    return [r + (np - r) * gg, g + (np - g) * gg, b + (np - b) * gg];
  }
  // sRGB 0..255 -> CIE Lab (D65)
  function srgbToLab(R, G, B) {
    var r = s2l(R / 255), g = s2l(G / 255), b = s2l(B / 255);
    var X = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047;
    var Y = (0.2126729 * r + 0.7151522 * g + 0.0721750 * b);
    var Z = (0.0193339 * r + 0.1191920 * g + 0.9503041 * b) / 1.08883;
    function f(t) { return t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116; }
    var fx = f(X), fy = f(Y), fz = f(Z);
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
  }
  // CIEDE2000 (Sharma 2005)
  function deltaE2000(L1, a1, b1, L2, a2, b2) {
    var C1 = Math.sqrt(a1 * a1 + b1 * b1), C2 = Math.sqrt(a2 * a2 + b2 * b2), Cb = (C1 + C2) / 2;
    var Cb7 = Math.pow(Cb, 7), G = 0.5 * (1 - Math.sqrt(Cb7 / (Cb7 + 6103515625)));
    var a1p = (1 + G) * a1, a2p = (1 + G) * a2;
    var C1p = Math.sqrt(a1p * a1p + b1 * b1), C2p = Math.sqrt(a2p * a2p + b2 * b2);
    function hp(b, ap) { if (b === 0 && ap === 0) return 0; var h = Math.atan2(b, ap) / D2R; return h < 0 ? h + 360 : h; }
    var h1p = hp(b1, a1p), h2p = hp(b2, a2p);
    var dLp = L2 - L1, dCp = C2p - C1p, dhp;
    if (C1p * C2p === 0) dhp = 0;
    else { dhp = h2p - h1p; if (dhp > 180) dhp -= 360; else if (dhp < -180) dhp += 360; }
    var dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(dhp * D2R / 2);
    var Lbp = (L1 + L2) / 2, Cbp = (C1p + C2p) / 2, hbp;
    if (C1p * C2p === 0) hbp = h1p + h2p;
    else if (Math.abs(h1p - h2p) <= 180) hbp = (h1p + h2p) / 2;
    else hbp = (h1p + h2p < 360) ? (h1p + h2p + 360) / 2 : (h1p + h2p - 360) / 2;
    var Tt = 1 - 0.17 * Math.cos((hbp - 30) * D2R) + 0.24 * Math.cos(2 * hbp * D2R) + 0.32 * Math.cos((3 * hbp + 6) * D2R) - 0.20 * Math.cos((4 * hbp - 63) * D2R);
    var dTh = 30 * Math.exp(-Math.pow((hbp - 275) / 25, 2));
    var Cbp7 = Math.pow(Cbp, 7), RC = 2 * Math.sqrt(Cbp7 / (Cbp7 + 6103515625));
    var L50 = (Lbp - 50) * (Lbp - 50), SL = 1 + 0.015 * L50 / Math.sqrt(20 + L50), SC = 1 + 0.045 * Cbp, SH = 1 + 0.015 * Cbp * Tt;
    var RT = -Math.sin(2 * dTh * D2R) * RC;
    var tl = dLp / SL, tc = dCp / SC, th = dHp / SH;
    return Math.sqrt(tl * tl + tc * tc + th * th + RT * tc * th);
  }
  function hueDeg(a, b) { var h = Math.atan2(b, a) / D2R; return h < 0 ? h + 360 : h; }
  function hueDiff(h1, h2) { var d = h2 - h1; while (d > 180) d -= 360; while (d < -180) d += 360; return d; }
  function percentile(sorted, p) {
    if (!sorted.length) return NaN;
    var i = clamp((sorted.length - 1) * p, 0, sorted.length - 1), lo = Math.floor(i), hi = Math.ceil(i);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
  }

  // ---------------- 빛 상태 ----------------
  // world.js sampleEnv 와 같은 태양 경로(창은 동쪽 벽, 실내 방향 +z). 반환: {k: 투과 배율, tint:[r,g,b], patch: 바닥 색빛 0..1, sun:[x,y,z]}
  function sunAt(hour) {
    var h = ((hour % 24) + 24) % 24;
    var el = Math.sin(PI * (h - 6) / 13), up = el > 0;
    var phi = PI * clamp((h - 6) / 13, 0, 1), e2 = up ? 0.07 + el * 0.9 : -0.2;
    return { dir: [Math.sin(phi) * Math.cos(e2), Math.sin(e2), -Math.cos(phi) * Math.cos(e2)], elev: up ? e2 : -0.2, up: up };
  }
  function lightState(light, hour) {
    if (light === 'night') return { k: 0.04, tint: [1, 1, 1], patch: 0, glow: 0.004, refl: 0.005, stone: 0.10 };
    if (light !== 'sun') return { k: 1, tint: [1, 1, 1], patch: 0, glow: 0.10, refl: 0, stone: 1 };
    var s = sunAt(hour === undefined ? 10 : +hour);
    var day = s.up ? clamp(Math.sin(s.elev) * 3.2, 0, 1) : 0;
    var cosI = -s.dir[2];                                   // 빛이 실내(+z)로 들어오는 성분
    var direct = s.up ? clamp((cosI - 0.05) * 1.6, 0, 1) * clamp(Math.sin(s.elev) * 6, 0, 1) : 0;
    var k = 0.15 + 0.8 * day + 0.6 * direct;   // 정면 햇빛 최대 약 1.55배(그 이상은 거의 흰색으로 날아간다)
    var low = s.up ? clamp(1 - Math.sin(s.elev) / Math.sin(15 * D2R), 0, 1) : 0;   // 낮은 해(이 태양 경로의 최저 고도는 4°)는 호박색 쪽
    var amber = [1.0, 0.86, 0.66], cool = [0.95, 0.985, 1.05];
    var t = direct > 0.05 ? 1 : 0, tint = [];
    for (var i = 0; i < 3; i++) {
      var base = t ? 1 : cool[i];
      tint.push(base + (amber[i] - base) * low);
    }
    return { k: k, tint: tint, patch: direct * day, glow: 0.06 + 0.1 * direct, refl: 0.04, stone: 0.35 + 0.65 * day, sun: s.dir };
  }

  var M = {
    ID_RE: ID_RE, clamp: clamp, indexCatalog: indexCatalog, lookup: lookup, sizeOf: sizeOf, defaultLongSide: defaultLongSide,
    selectTier: selectTier, normTier: normTier, tierFile: tierFile, packFile: packFile, packKey: packKey, tierPx: tierPx, texMb: texMb,
    frameDistance: frameDistance, zoomFov: zoomFov, zoomMax: zoomMax, windowCss: windowCss, halfVisible: halfVisible, clampPan: clampPan, pinchPan: pinchPan, easeInOut: easeInOut,
    s2l: s2l, l2s: l2s, glassCurve: glassCurve, neutral: neutral, srgbToLab: srgbToLab, deltaE2000: deltaE2000, hueDeg: hueDeg, hueDiff: hueDiff, percentile: percentile,
    sunAt: sunAt, lightState: lightState
  };
  root.ChurchGlassMath = M;
  if (typeof module === 'object' && module.exports) module.exports = M;
})(typeof window !== 'undefined' ? window : this);
