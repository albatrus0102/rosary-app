/* models.js — 묵주 부품 형상(코드 모델링): 알(타원 원목·진주·면 깎은 수정), 알 마개, 체인·고리·끈, 십자가 3종(원목+금속 장식,
   금 꽃봉오리형, 은 투각 세공), 예수님 형상(코르푸스), 메달 3종. 단위: 작은 알 지름 = 1. 알의 구멍 축 = 로컬 +Y,
   십자가·메달의 앞면 = 로컬 +Z, 십자가 고리(체인이 붙는 곳) = 로컬 +Y 끝.
   RosaryModels = { beadGeometry(def), capGeometry(), linkGeometry(type), knotGeometry(), cordGeometry(), buildCross(def, mats), buildMedal(def, mats), merge } */
(function (root) {
  'use strict';
  var T = root.THREE;

  // 여러 BufferGeometry 를 한 형상으로 합친다(위치·법선·uv). 그리기 호출을 줄인다.
  function merge(geos) {
    var pos = [], nor = [], uv = [];
    geos.forEach(function (g) {
      var n = g.index ? g.toNonIndexed() : g;
      if (!n.attributes.normal) n.computeVertexNormals();
      var p = n.attributes.position.array, q = n.attributes.normal.array, u = n.attributes.uv ? n.attributes.uv.array : null;
      for (var i = 0; i < p.length; i++) { pos.push(p[i]); nor.push(q[i]); }
      var cnt = p.length / 3;
      for (i = 0; i < cnt; i++) { uv.push(u ? u[i * 2] : 0, u ? u[i * 2 + 1] : 0); }
      if (n !== g) n.dispose();
      g.dispose();
    });
    var out = new T.BufferGeometry();
    out.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    out.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
    out.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    out.computeBoundingSphere();
    return out;
  }
  var _a = new T.Vector3(), _b = new T.Vector3(), _q = new T.Quaternion(), _up = new T.Vector3(0, 1, 0);
  // a→b 를 잇는 원뿔대(반지름 ra, rb)
  function limb(ax, ay, az, bx, by, bz, ra, rb, seg) {
    _a.set(ax, ay, az); _b.set(bx, by, bz);
    var len = _a.distanceTo(_b), g = new T.CylinderGeometry(rb, ra, len, seg || 14, 1, false);
    var dir = _b.clone().sub(_a).normalize();
    _q.setFromUnitVectors(_up, dir);
    g.applyQuaternion(_q); g.translate((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
    return g;
  }
  function ball(x, y, z, rx, ry, rz, seg) { var g = new T.SphereGeometry(1, seg || 18, Math.max(8, (seg || 18) * 0.7 | 0)); g.scale(rx, ry, rz); g.translate(x, y, z); return g; }

  // ---- 알 ----
  function beadGeometry(def) {
    var b = def.bead, g;
    if (b.shape === 'faceted') {
      // 손으로 깎은 듯한 파셋 알(정이십면체를 한 번 나눈 80면, 위아래를 조금 눌러 론델 느낌). 면마다 법선을 따로(평면 셰이딩).
      g = new T.IcosahedronGeometry(0.5, 1);
      g.rotateZ(0.31); g.rotateX(0.17);
      g.scale(1, b.aspect, 1);
      g = g.toNonIndexed(); g.computeVertexNormals();
      return g;
    }
    var seg = b.shape === 'sphere' ? 44 : 40;
    g = new T.SphereGeometry(0.5, seg, Math.round(seg * 0.75));
    g.scale(1, b.aspect, 1);
    // 손으로 깎은 듯한 미세한 불균일과 구멍 자리의 납작함
    var p = g.attributes.position, v = new T.Vector3(), irr = b.irregular || 0;
    for (var i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      var n = Math.sin(v.x * 5.1 + 1.3) * Math.sin(v.y * 4.3 + 0.4) * Math.sin(v.z * 6.7 + 2.2) + 0.5 * Math.sin(v.x * 11 + v.z * 7);
      var yy = Math.abs(v.y) / (0.5 * b.aspect);
      var flat = yy > 0.93 ? 1 - (yy - 0.93) * 0.9 : 1;
      var k = 1 + irr * n;
      v.x *= k; v.z *= k; v.y *= flat;
      p.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    return g;
  }
  // 알 마개(꽃잎 모양 금속 캡): 구멍 축 +Y 쪽. 알 표면 위에 얹는다.
  function capGeometry() {
    var pts = [], i;
    for (i = 0; i <= 8; i++) { var t = i / 8; pts.push(new T.Vector2(0.03 + 0.17 * Math.sin(t * Math.PI / 2), 0.045 * Math.cos(t * Math.PI / 2) + 0.01)); }
    var g = new T.LatheGeometry(pts.reverse(), 24);
    var p = g.attributes.position, v = new T.Vector3();
    for (i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); var a = Math.atan2(v.z, v.x), r = Math.hypot(v.x, v.z); var petal = 1 - 0.18 * Math.pow(Math.abs(Math.cos(a * 4)), 3) * (r / 0.2); p.setXYZ(i, v.x * petal, v.y, v.z * petal); }
    g.computeVertexNormals();
    return g;
  }
  // 고리 하나(토러스, 로컬 Y 가 긴 축). 인스턴스 크기로 둥근 고리·타원 고리를 만든다.
  function linkGeometry(type) { return new T.TorusGeometry(1, type === 'chain' ? 0.24 : 0.2, 10, 24); }
  function knotGeometry() {
    var g = new T.SphereGeometry(1, 20, 14), p = g.attributes.position, v = new T.Vector3();
    for (var i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); var k = 1 + 0.12 * Math.sin(Math.atan2(v.z, v.x) * 3 + v.y * 4); p.setXYZ(i, v.x * k, v.y * 0.8, v.z * k); }
    g.computeVertexNormals(); return g;
  }
  function cordGeometry() { var g = new T.CylinderGeometry(1, 1, 1, 10, 1, true); return g; }

  // ---- 예수님 형상(코르푸스): 높이 1 기준(머리 꼭대기 ≈ 0.5, 발끝 ≈ -0.56), 양손 y ≈ 0.40 ----
  function corpusGeometry() {
    var parts = [];
    var Z = 0.55; // 앞뒤 납작함
    // 머리(오른 어깨 쪽으로 기울어짐)·머리카락·수염, 가시관, 목
    parts.push(ball(0.03, 0.432, 0.02, 0.07, 0.083, 0.072, 22));
    parts.push(ball(0.022, 0.445, -0.012, 0.074, 0.08, 0.06, 16));        // 뒤로 흘러내린 머리카락
    parts.push(ball(0.04, 0.392, 0.04, 0.042, 0.04, 0.034, 12));          // 수염
    var crown = new T.TorusGeometry(0.072, 0.014, 6, 24); crown.rotateX(Math.PI / 2 - 0.25); crown.rotateZ(-0.35); crown.translate(0.03, 0.478, 0.018); parts.push(crown);
    parts.push(limb(0.02, 0.37, 0, 0.004, 0.335, 0, 0.034, 0.04, 12));
    // 몸통(가슴 → 허리), 갈비뼈 결
    var tp = [[0.0, 0.352], [0.095, 0.345], [0.124, 0.316], [0.12, 0.26], [0.1, 0.19], [0.084, 0.13], [0.088, 0.09], [0.0, 0.085]].map(function (p) { return new T.Vector2(p[0], p[1]); });
    var torso = new T.LatheGeometry(tp, 28); torso.scale(1, 1, Z); parts.push(torso);
    // 가슴·배의 볼륨(띠 대신 둥근 근육 덩이: 금속 반사가 몸의 결을 보여 준다)
    [-1, 1].forEach(function (sd) { parts.push(ball(sd * 0.05, 0.292, 0.05, 0.06, 0.042, 0.035, 14)); parts.push(ball(sd * 0.075, 0.205, 0.035, 0.03, 0.05, 0.028, 10)); });
    parts.push(ball(0, 0.17, 0.042, 0.055, 0.06, 0.03, 14));
    // 허리옷(주름이 있는 천)과 매듭
    var lp = [], i;
    for (i = 0; i <= 10; i++) { var t = i / 10; lp.push(new T.Vector2(0.093 + 0.03 * t + 0.01 * Math.sin(t * 9), 0.118 - t * 0.17)); }
    var cloth = new T.LatheGeometry(lp, 32), cp = cloth.attributes.position, v = new T.Vector3();
    for (i = 0; i < cp.count; i++) { v.fromBufferAttribute(cp, i); var a = Math.atan2(v.z, v.x), k = 1 + 0.1 * Math.sin(a * 9) * ((0.118 - v.y) / 0.17); cp.setXYZ(i, v.x * k, v.y - (v.x > 0 ? 0.035 * ((0.118 - v.y) / 0.17) : 0), v.z * k * Z); }
    cloth.computeVertexNormals(); parts.push(cloth);
    parts.push(ball(0.105, 0.06, 0.02, 0.032, 0.05, 0.026, 10));
    // 다리: 무릎이 한쪽으로 굽은 S자(전통 코르푸스의 자세), 무릎·종아리 볼륨, 오른발이 왼발 위로 겹친다
    var KX = -0.055, KZ = 0.05;
    parts.push(limb(-0.048, 0.0, 0, -0.03 + KX, -0.245, KZ, 0.058, 0.04));
    parts.push(limb(0.048, 0.0, 0, 0.026 + KX, -0.25, KZ + 0.012, 0.058, 0.04));
    parts.push(ball(-0.03 + KX, -0.245, KZ + 0.005, 0.044, 0.046, 0.044, 12)); parts.push(ball(0.026 + KX, -0.25, KZ + 0.017, 0.044, 0.046, 0.044, 12));
    parts.push(ball(-0.026 + KX * 0.6, -0.33, KZ * 0.6, 0.042, 0.07, 0.04, 12)); parts.push(ball(0.02 + KX * 0.6, -0.335, KZ * 0.6 + 0.012, 0.042, 0.07, 0.04, 12));
    parts.push(limb(-0.03 + KX, -0.245, KZ, -0.012, -0.5, 0.0, 0.04, 0.022));
    parts.push(limb(0.026 + KX, -0.25, KZ + 0.012, 0.008, -0.5, 0.018, 0.04, 0.022));
    parts.push(limb(-0.012, -0.5, 0.0, -0.006, -0.575, 0.03, 0.024, 0.016));
    parts.push(limb(0.008, -0.5, 0.018, 0.0, -0.57, 0.055, 0.024, 0.016));
    // 팔(어깨 → 팔꿈치 → 손), 손바닥·손가락
    [-1, 1].forEach(function (s) {
      parts.push(ball(s * 0.1, 0.322, 0, 0.046, 0.04, 0.04, 12));
      parts.push(limb(s * 0.1, 0.322, 0, s * 0.25, 0.37, 0.0, 0.04, 0.031));
      parts.push(ball(s * 0.25, 0.37, 0, 0.031, 0.031, 0.031, 10));
      parts.push(limb(s * 0.25, 0.37, 0.0, s * 0.39, 0.402, 0.0, 0.031, 0.022));
      parts.push(ball(s * 0.415, 0.408, 0.004, 0.036, 0.026, 0.013, 12));
      parts.push(limb(s * 0.44, 0.412, 0.004, s * 0.478, 0.424, 0.004, 0.008, 0.005, 6));
    });
    return merge(parts);
  }

  // ---- 십자가 윤곽 ----
  // 라틴 십자가(끝이 살짝 넓어진다): 높이 H, 가로 W, 막대 폭 bw, 가로대 높이 cy, 끝 넓힘 f
  function latinShape(H, W, bw, cy, f) {
    var h = bw / 2, e = h * (1 + f), top = H / 2, bot = -H / 2, L = -W / 2, R = W / 2, a = 0.42;
    var s = new T.Shape();
    s.moveTo(-e, bot); s.lineTo(e, bot); s.lineTo(h, bot + a); s.lineTo(h, cy - h);
    s.lineTo(R - a, cy - h); s.lineTo(R, cy - e); s.lineTo(R, cy + e); s.lineTo(R - a, cy + h);
    s.lineTo(h, cy + h); s.lineTo(h, top - a); s.lineTo(e, top); s.lineTo(-e, top); s.lineTo(-h, top - a);
    s.lineTo(-h, cy + h); s.lineTo(L + a, cy + h); s.lineTo(L, cy + e); s.lineTo(L, cy - e); s.lineTo(L + a, cy - h);
    s.lineTo(-h, cy - h); s.lineTo(-h, bot + a); s.lineTo(-e, bot);
    return s;
  }
  // 투각 세공 십자가(끝이 창촉+꽃잎): 바깥 윤곽 + 팔마다 길쭉한 구멍
  function filigreeShape(H, W, bw, cy) {
    var h = bw / 2, top = H / 2, bot = -H / 2, L = -W / 2, R = W / 2, tip = 0.55, lob = h * 1.7;
    var s = new T.Shape();
    // 팔 끝 하나를 그리는 함수(방향 벡터 d, 옆 벡터 n, 끝점 c)
    function end(cx, cyy, dx, dy) {
      var nx = -dy, ny = dx;
      s.lineTo(cx - dx * tip + nx * h, cyy - dy * tip + ny * h);
      s.quadraticCurveTo(cx - dx * tip + nx * lob * 1.25, cyy - dy * tip + ny * lob * 1.25, cx - dx * tip * 0.35 + nx * lob, cyy - dy * tip * 0.35 + ny * lob);
      s.quadraticCurveTo(cx - dx * tip * 0.1 + nx * h * 0.5, cyy - dy * tip * 0.1 + ny * h * 0.5, cx, cyy);
      s.quadraticCurveTo(cx - dx * tip * 0.1 - nx * h * 0.5, cyy - dy * tip * 0.1 - ny * h * 0.5, cx - dx * tip * 0.35 - nx * lob, cyy - dy * tip * 0.35 - ny * lob);
      s.quadraticCurveTo(cx - dx * tip - nx * lob * 1.25, cyy - dy * tip - ny * lob * 1.25, cx - dx * tip - nx * h, cyy - dy * tip - ny * h);
    }
    s.moveTo(-h, cy - h);
    s.lineTo(-h, bot + tip); end(0, bot, 0, -1); s.lineTo(h, cy - h);
    s.lineTo(R - tip, cy - h); end(R, cy, 1, 0); s.lineTo(h, cy + h);
    s.lineTo(h, top - tip); end(0, top, 0, 1); s.lineTo(-h, cy + h);
    s.lineTo(L + tip, cy + h); end(L, cy, -1, 0); s.lineTo(-h, cy - h);
    // 투각 구멍(팔마다 둥근 끝 슬롯)
    function slot(x0, y0, x1, y1, w) {
      var p = new T.Path(), dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy), ux = dx / l, uy = dy / l, nx = -uy * w, ny = ux * w;
      p.moveTo(x0 + nx, y0 + ny); p.lineTo(x1 + nx, y1 + ny);
      p.absarc(x1, y1, w, Math.atan2(ny, nx), Math.atan2(-ny, -nx), true);
      p.lineTo(x0 - nx, y0 - ny);
      p.absarc(x0, y0, w, Math.atan2(-ny, -nx), Math.atan2(ny, nx), true);
      s.holes.push(p);
    }
    var w = h * 0.42, m = h * 1.35;
    slot(0, cy - m, 0, bot + tip * 1.25, w);
    slot(0, cy + m, 0, top - tip * 1.25, w);
    slot(m, cy, R - tip * 1.25, cy, w);
    slot(-m, cy, L + tip * 1.25, cy, w);
    return s;
  }
  function extrude(shape, depth, bevel) {
    var g = new T.ExtrudeGeometry(shape, { depth: depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.9, bevelSegments: 3, curveSegments: 18 });
    g.translate(0, 0, -depth / 2);
    // 앞면 uv 를 0..1 로(나뭇결 텍스처가 고르게)
    g.computeBoundingBox();
    var bb = g.boundingBox, uv = g.attributes.uv, p = g.attributes.position;
    for (var i = 0; i < uv.count; i++) uv.setXY(i, (p.getX(i) - bb.min.x) / (bb.max.x - bb.min.x) * 0.55, (p.getY(i) - bb.min.y) / (bb.max.y - bb.min.y));
    return g;
  }
  function ringGeo(r, tube) { return new T.TorusGeometry(r, tube, 10, 28); }

  // 십자가 한 벌(Group). 로컬 원점 = 십자가 중심, +Y 위 끝에 고리.
  function buildCross(def, mats) {
    var c = def.cross, H = c.height, W = c.width, D = c.depth, g = new T.Group(), cy = H * 0.2;
    var bodyMat = mats.get(c.material), metal = mats.get(c.trim || c.material), corpusMat = mats.get(c.corpus);
    var front = D / 2;
    function add(geo, mat, cast) { var m = new T.Mesh(geo, mat); m.castShadow = cast !== false; m.receiveShadow = true; g.add(m); return m; }
    if (c.type === 'woodLatin') {
      var bw = 0.78;
      add(extrude(latinShape(H * 0.97, W, bw, cy, 0.22), D, 0.07), bodyMat);
      // 홈선(가장자리 안쪽 장식선): 얇은 금속 상감
      var inlay = latinShape(H * 0.97 - 0.5, W - 0.5, 0.16, cy, 0.0), ig = new T.ExtrudeGeometry(inlay, { depth: 0.02, bevelEnabled: false, curveSegments: 4 });
      ig.translate(0, 0, front + 0.035); add(ig, metal, false);
      // 팔 끝 금속 마개 4개(둥근 꽃봉오리)
      [[0, H * 0.485 - 0.05, 0], [0, -H * 0.485 + 0.05, Math.PI], [W / 2 - 0.05, cy, -Math.PI / 2], [-W / 2 + 0.05, cy, Math.PI / 2]].forEach(function (e) {
        var cap = merge([ball(0, 0.07, 0, bw * 0.62, 0.2, D * 0.72, 20), ball(0, 0.27, 0, 0.13, 0.13, 0.13, 12)]);
        cap.rotateZ(e[2]); cap.translate(e[0], e[1], 0); add(cap, metal);
      });
      // 명패(INRI)
      var plate = new T.BoxGeometry(0.62, 0.3, 0.06); plate.translate(0, cy + H * 0.15, front + 0.07); add(plate, metal);
      // 가운데 금속 판(빛살)
      var rays = [];
      for (var i = 0; i < 16; i++) { var a = i / 16 * Math.PI * 2 + Math.PI / 16, l = i % 2 ? 0.42 : 0.6; var r = new T.BoxGeometry(0.05, l, 0.025); r.translate(0, l / 2 + 0.12, 0); r.rotateZ(a); rays.push(r); }
      var rg = merge(rays); rg.translate(0, cy, front + 0.03); add(rg, metal, false);
    } else if (c.type === 'budded') {
      var pieces = [], bw2 = 0.46;
      pieces.push(extrude(latinShape(H * 0.8, W * 0.74, bw2, cy, 0), D, 0.05));
      // 팔 끝 세 잎(꽃봉오리)
      [[0, H * 0.4, 0, 1], [0, -H * 0.4, 0, -1], [W * 0.37, cy, 1, 0], [-W * 0.37, cy, -1, 0]].forEach(function (e) {
        var dx = e[2], dy = e[3], nx = -dy, ny = dx, rr = 0.3;
        [[0.28, 0], [0.08, 0.3], [0.08, -0.3]].forEach(function (o) {
          var s = new T.Shape(); s.absarc(0, 0, o[1] === 0 ? rr : rr * 0.82, 0, Math.PI * 2, false);
          var cg = extrude(s, D, 0.05); cg.translate(e[0] + dx * o[0] + nx * o[1], e[1] + dy * o[0] + ny * o[1], 0); pieces.push(cg);
          var dome = ball(e[0] + dx * o[0] + nx * o[1], e[1] + dy * o[0] + ny * o[1], front + 0.03, (o[1] === 0 ? rr : rr * 0.82) * 0.55, (o[1] === 0 ? rr : rr * 0.82) * 0.55, 0.08, 12); pieces.push(dome);
        });
      });
      // 가운데 빛살 원판 + 장미 매듭
      var sun = new T.Shape(); for (var k = 0; k <= 48; k++) { var aa = k / 48 * Math.PI * 2, rad = k % 2 ? 0.55 : 0.8; if (k === 0) sun.moveTo(Math.cos(aa) * rad, Math.sin(aa) * rad); else sun.lineTo(Math.cos(aa) * rad, Math.sin(aa) * rad); }
      var sg = extrude(sun, 0.06, 0.02); sg.translate(0, cy, -front - 0.02); pieces.push(sg);
      // 테두리 선 장식(가장자리 안쪽 금줄)
      var edge = latinShape(H * 0.8 - 0.22, W * 0.74 - 0.22, 0.1, cy, 0), eg = new T.ExtrudeGeometry(edge, { depth: 0.025, bevelEnabled: false });
      eg.translate(0, 0, front + 0.045); pieces.push(eg);
      add(merge(pieces), bodyMat);
      var plate2 = new T.BoxGeometry(0.5, 0.24, 0.05); plate2.translate(0, cy + H * 0.14, front + 0.07); add(plate2, metal);
    } else { // filigree: 투각 막대 + 창촉·꽃잎 끝 + 알갱이 + 가운데 고리
      var fp = [], fb = 0.56, tipL = 0.5, inset = 0.12;
      var topY = H * 0.485 - tipL, botY = -H * 0.485 + tipL, rx = W / 2 - tipL;
      function bar(x0, y0, x1, y1) { // 둥근 끝 직사각형 + 안쪽 슬롯 구멍
        var sh = new T.Shape(), w2 = (x1 - x0) / 2, h2 = (y1 - y0) / 2, cx = (x0 + x1) / 2, cy2 = (y0 + y1) / 2, r0 = Math.min(w2, h2) * 0.5;
        function rr(path, hw, hh, rad) { path.moveTo(cx - hw + rad, cy2 - hh); path.lineTo(cx + hw - rad, cy2 - hh); path.quadraticCurveTo(cx + hw, cy2 - hh, cx + hw, cy2 - hh + rad); path.lineTo(cx + hw, cy2 + hh - rad); path.quadraticCurveTo(cx + hw, cy2 + hh, cx + hw - rad, cy2 + hh); path.lineTo(cx - hw + rad, cy2 + hh); path.quadraticCurveTo(cx - hw, cy2 + hh, cx - hw, cy2 + hh - rad); path.lineTo(cx - hw, cy2 - hh + rad); path.quadraticCurveTo(cx - hw, cy2 - hh, cx - hw + rad, cy2 - hh); }
        rr(sh, w2, h2, r0);
        var hole = new T.Path(); rr(hole, w2 - inset, h2 - inset, Math.max(0.02, r0 - inset)); hole.curves.reverse && 0; sh.holes.push(hole);
        return extrude(sh, D, 0.035);
      }
      fp.push(bar(-fb / 2, cy + 0.42, fb / 2, topY));
      fp.push(bar(-fb / 2, botY, fb / 2, cy - 0.42));
      fp.push(bar(0.42, cy - fb / 2, rx, cy + fb / 2));
      fp.push(bar(-rx, cy - fb / 2, -0.42, cy + fb / 2));
      // 가운데 원판 + 고리
      var disc = new T.Shape(); disc.absarc(0, 0, 0.52, 0, Math.PI * 2, false);
      var dg = extrude(disc, D, 0.04); dg.translate(0, cy, 0); fp.push(dg);
      var ring = ringGeo(0.5, 0.055); ring.translate(0, cy, front + 0.02); fp.push(ring);
      // 팔 끝: 창촉(마름모) + 양옆 꽃잎 + 작은 구슬
      [[0, topY, 0, 1], [0, botY, 0, -1], [rx, cy, 1, 0], [-rx, cy, -1, 0]].forEach(function (e) {
        var dx = e[2], dy = e[3], nx = -dy, ny = dx, ex = e[0], ey = e[1];
        var dia = new T.Shape();
        dia.moveTo(ex - dx * 0.02, ey - dy * 0.02); dia.lineTo(ex + dx * 0.24 + nx * 0.2, ey + dy * 0.24 + ny * 0.2); dia.lineTo(ex + dx * 0.52, ey + dy * 0.52); dia.lineTo(ex + dx * 0.24 - nx * 0.2, ey + dy * 0.24 - ny * 0.2); dia.lineTo(ex - dx * 0.02, ey - dy * 0.02);
        fp.push(extrude(dia, D, 0.035));
        [-1, 1].forEach(function (sd) {
          var c = new T.Shape(); c.absarc(ex + dx * 0.02 + nx * sd * 0.3, ey + dy * 0.02 + ny * sd * 0.3, 0.12, 0, Math.PI * 2, false); fp.push(extrude(c, D * 0.9, 0.03));
        });
        fp.push(ball(ex + dx * 0.6, ey + dy * 0.6, 0, 0.07, 0.07, 0.07, 10));
      });
      // 슬롯 안 알갱이 줄
      [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(function (d) {
        var len = d[1] > 0 ? topY - cy : d[1] < 0 ? cy - botY : rx;
        for (var t = 0.62; t < len - 0.12; t += 0.2) fp.push(ball(d[0] * t, cy + d[1] * t, 0, 0.065, 0.065, 0.065, 10));
      });
      add(merge(fp), bodyMat);
      var plate3 = new T.BoxGeometry(0.46, 0.22, 0.04); plate3.translate(0, cy + H * 0.16, front + 0.06); add(plate3, metal);
    }
    // 예수님 형상: 양손이 가로대 높이에 오게
    var hc = Math.min(H * 0.56, (W - 0.5) / 0.95), cg2 = corpusGeometry();
    cg2.scale(hc, hc, hc * 1.1); cg2.translate(0, cy - 0.41 * hc, front + 0.06 + 0.075 * hc); // 몸 뒤가 십자가 앞면에 닿게
    add(cg2, corpusMat);
    // 위 끝 고리(체인이 붙는다)
    var bail = ringGeo(0.17, 0.05); bail.rotateY(Math.PI / 2); bail.translate(0, H / 2 + 0.12, 0); add(bail, metal);
    g.userData.top = H / 2 + 0.3;
    return g;
  }

  // 메달(가운데 연결 메달). 로컬 +Z 앞면, 높이 h, 원점 = 중심.
  function buildMedal(def, mats) {
    var m = def.medal, h = m.height, g = new T.Group(), mat = mats.get(m.material);
    var oval = m.type !== 'round', sx = oval ? 0.8 : 1;
    var prof = [[0, 0.07], [0.6, 0.055], [0.78, 0.07], [0.86, 0.12], [0.94, 0.11], [1, 0.06], [1, -0.06], [0.9, -0.08], [0, -0.07]].map(function (p) { return new T.Vector2(p[0], p[1]); });
    var disc = new T.LatheGeometry(prof.reverse(), 56); disc.rotateX(Math.PI / 2); disc.scale(sx, 1, 1);
    var parts = [disc];
    // 성모 모노그램(M 과 그 위 십자가)
    var M = new T.Shape(), w = 0.36, mh = 0.34, st = 0.08;
    M.moveTo(-w, -mh); M.lineTo(-w + st, -mh); M.lineTo(-w + st, mh * 0.45); M.lineTo(0, -mh * 0.3); M.lineTo(w - st, mh * 0.45); M.lineTo(w - st, -mh); M.lineTo(w, -mh); M.lineTo(w, mh); M.lineTo(w - st * 1.1, mh); M.lineTo(0, -mh * 0.05); M.lineTo(-w + st * 1.1, mh); M.lineTo(-w, mh); M.lineTo(-w, -mh);
    var mg = new T.ExtrudeGeometry(M, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.012, bevelSegments: 2 }); mg.translate(0, -0.12, 0.06); parts.push(mg);
    var bar = new T.BoxGeometry(0.62, 0.07, 0.06); bar.translate(0, 0.33, 0.085); parts.push(bar);
    var cr1 = new T.BoxGeometry(0.06, 0.34, 0.06); cr1.translate(0, 0.47, 0.085); parts.push(cr1);
    var cr2 = new T.BoxGeometry(0.22, 0.06, 0.06); cr2.translate(0, 0.52, 0.085); parts.push(cr2);
    if (m.type === 'filigreeOval') {
      // 테두리 알갱이 + 빛살
      for (var i = 0; i < 40; i++) { var a = i / 40 * Math.PI * 2; parts.push(ball(Math.cos(a) * 0.93 * sx, Math.sin(a) * 0.93, 0.12, 0.045, 0.045, 0.045, 8)); }
      for (i = 0; i < 24; i++) { var b = i / 24 * Math.PI * 2, r = new T.BoxGeometry(0.025, 0.12, 0.02); r.translate(0, 0.66, 0.065); r.rotateZ(b); r.scale(sx, 1, 1); parts.push(r); }
    } else if (m.type === 'round') {
      // 열두 별
      for (var j = 0; j < 12; j++) {
        var c = j / 12 * Math.PI * 2, s = new T.Shape();
        for (var k = 0; k <= 10; k++) { var aa = k / 10 * Math.PI * 2 + Math.PI / 2, rr = k % 2 ? 0.03 : 0.07; if (k === 0) s.moveTo(Math.cos(aa) * rr, Math.sin(aa) * rr); else s.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr); }
        var sgeo = new T.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: false }); sgeo.translate(Math.cos(c) * 0.7, Math.sin(c) * 0.7, 0.06); parts.push(sgeo);
      }
    } else {
      // 원목 묵주의 앤티크 메달: 테두리 꼰 줄(작은 고리 반복)
      for (var q = 0; q < 30; q++) { var e = q / 30 * Math.PI * 2, tr = new T.TorusGeometry(0.06, 0.02, 6, 10); tr.rotateZ(e + 0.6); tr.rotateX(0.9); tr.translate(Math.cos(e) * 0.91 * sx, Math.sin(e) * 0.91, 0.1); parts.push(tr); }
    }
    var body = new T.Mesh(merge(parts), mat); body.castShadow = true; body.receiveShadow = true;
    body.scale.setScalar(h / 2); g.add(body);
    g.userData.rx = sx * h / 2; g.userData.ry = h / 2;
    return g;
  }

  root.RosaryModels = { beadGeometry: beadGeometry, capGeometry: capGeometry, linkGeometry: linkGeometry, knotGeometry: knotGeometry,
    cordGeometry: cordGeometry, buildCross: buildCross, buildMedal: buildMedal, corpusGeometry: corpusGeometry, merge: merge };
})(typeof window !== 'undefined' ? window : this);
