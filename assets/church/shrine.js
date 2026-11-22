/* shrine.js — 성당마다 한 곳 '성모 기도 자리': 성모상(받침·뒤판) + 작은 봉헌초 받침 + 무릎틀.
   자리 표는 shrine_places.js. 빌더(ch_*.js)는 고치지 않는다.
   - applyLayout(layout): 봉헌초 받침을 layout.candles.stands 의 **맨 끝**에 붙인다(기존 슬롯 번호는 그대로, 새 슬롯은 그 뒤 14개).
     layouts.js 뒤에 실리면 ChurchLayouts.register 를 감싸 모든 성당에 자동 적용된다(서버 layouts.json 도 같은 경로).
     → 기존 봉헌초 체계(scene_logic.candleSlots · stations.js candle 스테이션 · world.js 초 인스턴스)가 그대로 쓴다.
   - build(ctx, layout): 빌더가 끝난 뒤(world.js) 가구를 kit 배치에 더하고 충돌체를 넣는다. 실시간 조명 없음.
   kind 'pond'(당고개): 받침·무릎틀 대신 성모상 앞 지름 1.5m 둥근 연못에 초를 띄운다(원형 슬롯 18, scene_logic ring 배치).
   치수(성상 중심에서 바라보는 쪽으로 d): 뒤판 -0.27, 받침 0, 초 받침 0.6, 무릎틀 책상 1.0, 무릎 방석 1.3, 서는 자리 1.6. */
(function (root) {
  'use strict';
  var SLOTS = 14, COLS = 7, STAND_D = 0.6, HALF_W = 0.62, FRONT_D = 1.07;
  function places() { return root.ChurchShrinePlaces || (typeof require === 'function' ? require('./shrine_places.js') : {}); }
  function placeOf(id) { var p = places()[id]; return p && !p.pending ? p : null; }
  function face(p) { var a = (p.yaw || 0) * Math.PI / 180; return [Math.round(Math.sin(a)), Math.round(Math.cos(a))]; }
  // 연못(kind 'pond'): 성모상 앞 지름 1.5m 둥근 연못에 초를 띄운다(당고개 — 사용자 제보). 슬롯은 동심원 2겹(6 + 12).
  var POND = { D: 1.5, R: 0.75, RIM: 0.12, RIM_H: 0.22, WATER_Y: 0.15, SLOTS: 18, RINGS: [{ r: 0.3, n: 6, a0: 0 }, { r: 0.56, n: 12, a0: Math.PI / 12 }] };
  function standOf(p) {
    var f = face(p);
    if (p.kind === 'pond') {
      return { x: +(p.x + f[0] * POND.D).toFixed(3), z: +(p.z + f[1] * POND.D).toFixed(3), slots: POND.SLOTS, reach: 2.1, face: f, ring: POND.RINGS, float: true, y0: (p.y || 0) + POND.WATER_Y, shrine: true, pond: true, label: p.label_ko || '성모상 앞' };
    }
    return { x: +(p.x + f[0] * STAND_D).toFixed(3), z: +(p.z + f[1] * STAND_D).toFixed(3), slots: SLOTS, reach: 1.8, cols: COLS, face: f, pitch: 0.15, step: 0.14, ystep: 0.07, y0: (p.y || 0) + 0.74, shrine: true, label: p.label_ko || '성모상 앞' };
  }
  // 여러 층 성당(아시시): 자리표의 fy = 성모상이 선 층의 바닥 높이. 짓는 높이는 그 층, 충돌체는 그 층에서만 막는다(초 칸 높이는 world.js 가 층 바닥에 더한다)
  function baseY(p) { return p.y !== undefined ? p.y : (p.fy || 0); }
  function lvC(p, c) { if (p.fy !== undefined) { c.y0 = p.fy - 0.1; c.y1 = p.fy + 2.5; } return c; }
  // 아바타가 지나가지 못하는 자리(성상~무릎틀 책상). existing 은 성상 쪽을 빌더 충돌체가 이미 막는다.
  function footprint(p) {
    var pond = p.kind === 'pond', hw = pond ? POND.R + POND.RIM : HALF_W, fd = pond ? POND.D + POND.R + POND.RIM : FRONT_D;
    var f = face(p), d0 = p.kind === 'existing' ? 0.3 : -0.3, a = [p.x + f[0] * d0, p.z + f[1] * d0], b = [p.x + f[0] * fd, p.z + f[1] * fd];
    var lx = Math.abs(f[1]) * hw, lz = Math.abs(f[0]) * hw;
    return { x0: Math.min(a[0], b[0]) - lx, x1: Math.max(a[0], b[0]) + lx, z0: Math.min(a[1], b[1]) - lz, z1: Math.max(a[1], b[1]) + lz };
  }
  function applyLayout(layout) {
    if (!layout || layout.shrine) return layout;
    var p = placeOf(layout.id);
    if (!p) return layout;
    if (!layout.candles) layout.candles = { stands: [] };
    var st0 = standOf(p); if (p.fy !== undefined) st0.fy = p.fy;
    layout.candles.stands.push(st0);
    layout.shrine = { x: p.x, z: p.z, y: p.y || 0, yaw: p.yaw || 0, kind: p.kind, label: p.label_ko || '성모상 앞', stand: layout.candles.stands.length - 1 };
    if (p.fy !== undefined) layout.shrine.fy = p.fy;
    return layout;
  }
  // 그림 성모상(입체): 그림에서 만든 깊이(statue3d_<img>.js — tools/statues/make_statue3d.py: 실루엣 부풀림 + 밝기 요철)로
  // 격자 변위 메시를 세운다. 앞면만(뒤는 벽감이 가린다) — 실루엣 가장자리 깊이 0 이라 옆에서 보면 둥글게 말려 들어간다.
  // 격자 1칸 바깥까지 정점을 넣고(깊이 0) 실루엣은 alphaTest 로 그림 해상도에서 자른다 → 계단 없음. 옆면은 가장자리 색(그림 번짐)이 늘어난다.
  // 가까이는 격자 그대로(≤ 30k 삼각형), 9m 밖은 3칸 간격(≤ 5k) — THREE.LOD 라 그리기 호출은 늘 1.
  // 묶음은 이 성당에 들어올 때만 읽고, 월드 해제 때 기하·재질·질감이 함께 놓인다(world.dispose).
  // 브라우저가 아니면(시험) false → kit 도형 성상을 쓴다.
  var STATUE = { H: 1.42, BACK: -0.14, LOD_FAR: 9, LOD_STEP: 3 };
  // 깊이 격자(dw×dh, 미터, 0 = 실루엣 밖) → 앞면 메시 자료. step 칸 간격으로 표본, 실루엣 1칸 바깥까지 넣는다.
  // sd(선택): 윤곽까지 부호 거리(칸, 바깥 +). 바깥 고리 정점을 윤곽 위로 옮긴다 → 가장자리가 격자 계단 대신 실제 윤곽을 따른다.
  function statueMesh(d, dw, dh, W, H, step, sd) {
    var nx = Math.floor((dw - 1) / step) + 1, ny = Math.floor((dh - 1) / step) + 1, id = new Int32Array(nx * ny), pos = [], uv = [], idx = [], n = 0;
    function at(i, j) { return i < 0 || j < 0 || i >= dw || j >= dh ? 0 : d[j * dw + i]; }
    function sdf(i, j) { i = Math.max(0, Math.min(dw - 1, i)); j = Math.max(0, Math.min(dh - 1, j)); return sd[j * dw + i]; }
    for (var j = 0; j < ny; j++) for (var i = 0; i < nx; i++) {
      var pi = Math.min(i * step, dw - 1), pj = Math.min(j * step, dh - 1), on = false;
      for (var b = -step; b <= step && !on; b++) for (var a = -step; a <= step; a++) if (at(pi + a, pj + b) > 0) { on = true; break; }
      if (!on) { id[j * nx + i] = -1; continue; }
      var fi = pi, fj = pj;
      if (sd && at(pi, pj) <= 0) {
        var gx = sdf(pi + 1, pj) - sdf(pi - 1, pj), gy = sdf(pi, pj + 1) - sdf(pi, pj - 1), gl = Math.hypot(gx, gy), s = sdf(pi, pj);
        if (gl > 1e-4 && s > 0) { s = Math.min(s, step * 1.5); fi -= gx / gl * s; fj -= gy / gl * s; }
      }
      var u = fi / (dw - 1), v = 1 - fj / (dh - 1);
      pos.push((u - 0.5) * W, v * H, at(pi, pj)); uv.push(u, v); id[j * nx + i] = n++;
    }
    for (j = 0; j < ny - 1; j++) for (i = 0; i < nx - 1; i++) {
      var A = id[j * nx + i], B = id[j * nx + i + 1], C = id[(j + 1) * nx + i], D = id[(j + 1) * nx + i + 1];
      var k = (A >= 0) + (B >= 0) + (C >= 0) + (D >= 0);
      if (k === 4) {   // 깊이 차가 작은 대각선으로 나눈다(주름 능선이 톱니가 되지 않게)
        if (Math.abs(pos[A * 3 + 2] - pos[D * 3 + 2]) <= Math.abs(pos[B * 3 + 2] - pos[C * 3 + 2])) idx.push(A, C, D, A, D, B); else idx.push(A, C, B, B, C, D);
      } else if (k === 3) {
        if (A < 0) idx.push(B, C, D); else if (B < 0) idx.push(A, C, D); else if (C < 0) idx.push(A, D, B); else idx.push(A, C, B);
      }
    }
    return { pos: pos, uv: uv, idx: idx, verts: n, tris: idx.length / 3 };
  }
  function imageStatue(ctx, p, f, y0) {
    var T = ctx.THREE;
    if (!T || !T.BufferGeometry || !T.LOD || typeof document === 'undefined' || !document.head || !document.head.appendChild || typeof Image === 'undefined') return false;
    var mat = new T.MeshStandardMaterial({ color: 0xc4c0ba, roughness: 0.82, metalness: 0, alphaTest: 0.5, side: T.DoubleSide, emissive: 0xffffff, emissiveIntensity: 0.05 });
    var lod = new T.LOD(); lod.name = 'shrine_statue'; lod.visible = false; lod.userData.noCam = true; lod.userData.noAO = true;
    lod.position.set(p.x + f[0] * STATUE.BACK, y0, p.z + f[1] * STATUE.BACK); lod.rotation.y = Math.atan2(f[0], f[1]);   // 지역 +z(앞) = 성상이 바라보는 쪽
    var dead = false; mat.addEventListener('dispose', function () { dead = true; });
    ctx.add(lod); if (ctx.stats) ctx.stats.meshes++;
    function img(src, cb) { var im = new Image(); im.onload = function () { if (!dead) cb(im); }; im.src = src; }
    function apply() {
      var a = root.ChurchArt && root.ChurchArt.statues3d && root.ChurchArt.statues3d[p.img]; if (!a || dead) return;
      var left = 2;
      img(a.depth, function (im) {
        var cv = document.createElement('canvas'); cv.width = a.dw; cv.height = a.dh;
        var c2 = cv.getContext('2d'); c2.drawImage(im, 0, 0); var px = c2.getImageData(0, 0, a.dw, a.dh).data, d = new Float32Array(a.dw * a.dh), sd = new Float32Array(d.length);
        for (var i = 0; i < d.length; i++) { d[i] = (px[i * 4] * 256 + px[i * 4 + 1]) / 65535 * a.zmax; sd[i] = (px[i * 4 + 2] - 128) / 60; }
        [[1, 0], [STATUE.LOD_STEP, STATUE.LOD_FAR]].forEach(function (L) {
          var m = statueMesh(d, a.dw, a.dh, STATUE.H * a.w / a.h, STATUE.H, L[0], sd), g = new T.BufferGeometry();
          g.setAttribute('position', new T.Float32BufferAttribute(m.pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(m.uv, 2)); g.setIndex(m.idx);
          g.computeVertexNormals();
          var mesh = new T.Mesh(g, mat); mesh.name = 'shrine_statue_lod' + L[0]; mesh.userData.noCam = true; mesh.userData.noAO = true;
          lod.addLevel(mesh, L[1]);
        });
        if (--left === 0) lod.visible = true;
      });
      img(a.src, function (im) {
        var tx = new T.Texture(im); tx.encoding = T.sRGBEncoding; tx.anisotropy = 4; tx.needsUpdate = true;
        mat.map = tx; mat.emissiveMap = tx; mat.needsUpdate = true;
        if (--left === 0) lod.visible = true;
      });
    }
    if (root.ChurchArt && root.ChurchArt.statues3d && root.ChurchArt.statues3d[p.img]) apply();
    else { var sc = document.createElement('script'); sc.src = 'statue3d_' + p.img + '.js'; sc.async = true; sc.onload = apply; document.head.appendChild(sc); }
    return true;
  }
  // Meshy 3D 성모상(statue3d_<mesh>.js — tools/statues/make_statue_meshy_pack.mjs: 739k → 36k 삼각형 + 원거리 8k, meshopt 압축).
  // 한 성당에 한 자리뿐이라 그리기 호출 1(THREE.LOD 두 단계 중 하나만 그려진다). 재질 하나(흰 대리석), 월드 해제 때 기하·재질이 함께 놓인다.
  // 원본 앞 = +Z, 아래 y = -0.952(팔각 받침 포함 — 따로 받침 얹지 않는다). 묶음이 없거나 풀기에 실패하면 fail() 로 그림 변위(imageStatue) 성상을 세운다.
  var MESH = { S: 0.8, Y_MIN: -0.952, LOD_FAR: 7 };
  function meshable(ctx) { var T = ctx.THREE; return !!(T && T.BufferGeometry && T.LOD && typeof document !== 'undefined' && document.head && document.head.appendChild); }
  function meshStatue(ctx, p, f, x, z, y0, fail) {
    var T = ctx.THREE; if (!meshable(ctx)) return false;
    var s = p.mesh_s || MESH.S;
    var mat = new T.MeshStandardMaterial({ color: 0xb0aba2, roughness: 0.55, metalness: 0, envMapIntensity: 0.8 });
    var lod = new T.LOD(); lod.name = 'shrine_statue'; lod.visible = false; lod.userData.noCam = true; lod.userData.noAO = true;
    lod.position.set(x, y0 - MESH.Y_MIN * s, z); lod.rotation.y = Math.atan2(f[0], f[1]); lod.scale.setScalar(s);
    var dead = false; mat.addEventListener('dispose', function () { dead = true; });
    ctx.add(lod); if (ctx.stats) ctx.stats.meshes++;
    function bad() { if (dead) return; dead = true; if (lod.parent) lod.parent.remove(lod); mat.dispose(); lod.levels.forEach(function (l) { l.object.geometry.dispose(); }); fail(); }
    function apply() {
      var a = root.ChurchArt && root.ChurchArt.statues3d && root.ChurchArt.statues3d[p.mesh]; if (dead) return;
      if (!a || !a.load) return bad();
      var pr; try { pr = a.load(T); } catch (e) { return bad(); }
      pr.then(function (r) {
        if (dead) return;
        [[r.near, 0, 'near'], [r.far, MESH.LOD_FAR, 'far']].forEach(function (L) {
          var m = new T.Mesh(L[0], mat); m.name = 'shrine_statue_' + L[2]; m.userData.noCam = true; m.userData.noAO = true; lod.addLevel(m, L[1]);
        });
        lod.position.y = y0 - r.meta.min[1] * s; lod.visible = true;   // 받침 바닥이 y0 에 닿게
      }, bad);
    }
    if (root.ChurchArt && root.ChurchArt.statues3d && root.ChurchArt.statues3d[p.mesh]) apply();
    else { var sc = document.createElement('script'); sc.src = 'statue3d_' + p.mesh + '.js'; sc.async = true; sc.onload = apply; sc.onerror = bad; document.head.appendChild(sc); }
    return true;
  }
  function build(ctx, layout) {
    var sh = layout && layout.shrine, p = sh && placeOf(layout.id);
    if (!p) return null;
    var f = face(p), y = baseY(p), alongX = Math.abs(f[0]) > 0.5;
    function B(d, l, yy, sd, sl, h, color, mat) {
      ctx.box({ x: p.x + f[0] * d + f[1] * l, y: y + yy, z: p.z + f[1] * d - f[0] * l, w: alongX ? sd : sl, h: h, d: alongX ? sl : sd, color: color, mat: mat });
    }
    var STONE = 0xe9e3d6, IRON = 0x2e2a26, WOOD = 0x5a3a24;
    if (p.kind !== 'existing') {
      var BACK = p.kind === 'pond' ? 0x8a6a4a : 0x26365c;         // 뒤판(짙은 남색 / 당고개는 옹기빛 갈색)
      B(-0.27, 0, 0, 0.05, 1.1, 2.55, BACK);
      if (p.img) { B(-0.12, -0.525, 0, 0.3, 0.05, 2.55, BACK); B(-0.12, 0.525, 0, 0.3, 0.05, 2.55, BACK); }   // 얕은 벽감(옆 날개): 그림 성상이 정면 위주로 보이게
      B(-0.26, 0, 2.55, 0.09, 1.2, 0.07, 0xc9a24a, 'metal');     // 금빛 갓
      B(0, 0, 0, 0.5, 0.62, 0.85, STONE, 'gloss');               // 받침
      var plain = p.kind === 'plain' || p.kind === 'pond', m3 = p.mesh && meshable(ctx);   // 3D 성상은 제 받침이 있어 윗판을 얹지 않는다
      if (!m3) B(0, 0, 0.85, 0.56, 0.7, 0.06, STONE, 'gloss');
      var relief = function () { return p.img && imageStatue(ctx, p, f, y + (m3 ? 0.85 : 0.91)); };
      if (!(m3 && meshStatue(ctx, p, f, p.x, p.z, y + 0.85, relief)) && !relief()) ctx.statue({ x: p.x, z: p.z, y: y + 0.91, h: 1.35, ry: Math.atan2(f[0], f[1]) + Math.PI, kind: plain ? 'saint' : 'mary', robe: plain ? 0xe4ddd0 : undefined, mantle: plain ? 0xe4ddd0 : undefined, skin: plain ? 0xe4ddd0 : undefined, halo: !plain });
    }
    if (p.kind === 'existing' && p.img && p.altar_h) {   // 제대 위 성모상(성 베드로): 뒤 제단화 앞, 제대 윗면에 받침 + 입체 성모상
      var ad = p.altar_d || -0.9, sp = { x: p.x + f[0] * ad, z: p.z + f[1] * ad, img: p.img };
      var m3 = p.mesh && meshable(ctx), sy = y + p.altar_h + (m3 ? 0 : 0.08), relief = function () { return imageStatue(ctx, sp, f, y + p.altar_h + 0.08); };
      if (!m3) B(ad, 0, p.altar_h, 0.5, 0.62, 0.08, STONE, 'gloss');   // 3D 성상은 제 받침(팔각)을 제대 윗면에 바로 얹는다
      if (!(m3 && meshStatue(ctx, p, f, sp.x, sp.z, sy, relief)) && !relief()) ctx.statue({ x: sp.x, z: sp.z, y: y + p.altar_h + 0.08, h: 1.35, ry: Math.atan2(f[0], f[1]) + Math.PI, kind: 'mary', halo: true });
    }
    if (p.kind === 'pond') {
      // 둥근 연못: 낮은 돌 테두리(20조각, kit 묶음에 합쳐진다) + 어두운 바닥 + 물 표면(짙은 청록, 불투명 광택 — 실시간 반사·투명 없음)
      var cx = p.x + f[0] * POND.D, cz = p.z + f[1] * POND.D, N = 20, rm = POND.R + POND.RIM / 2, GR = 0xb9b2a6;
      for (var i = 0; i < N; i++) {
        var a = (i + 0.5) * 2 * Math.PI / N;
        ctx.box({ x: cx + Math.cos(a) * rm, y: y, z: cz + Math.sin(a) * rm, w: POND.RIM, h: POND.RIM_H, d: 2 * (POND.R + POND.RIM) * Math.tan(Math.PI / N) + 0.01, ry: -a, color: i % 2 ? GR : 0xaea79b, mat: 'gloss' });
      }
      ctx.cyl({ x: cx, y: y, z: cz, r: POND.R + 0.01, h: POND.WATER_Y - 0.012, seg: 24, color: 0x1c2a2c, flat: true });
      ctx.cyl({ x: cx, y: y + POND.WATER_Y - 0.012, z: cz, r: POND.R + 0.005, h: 0.012, seg: 24, color: 0x1f4a4c, mat: 'gloss', flat: true });
      if (ctx.aoDecalCircle) ctx.aoDecalCircle({ x: cx, z: cz, r: POND.R + POND.RIM + 0.05, y: y });
      ctx.addCollider(lvC(p, footprint(p)));   // 성상 받침 ~ 연못 바깥 테두리를 한 상자로 막는다
      return sh;
    }
    // 봉헌초 받침(2단, 슬롯 높이 0.74 / 0.81 에 맞춤). stand 'wood': 같은 높이의 나무 받침(앞 몸통 + 뒤 한 단)
    if (p.stand === 'wood') {
      var WC = 0xb07a48;
      B(STAND_D - 0.07, 0, 0, 0.42, 1.24, 0.74, WC, 'wood');
      B(STAND_D - 0.07, 0, 0.74, 0.44, 1.28, 0.012, 0x8a5a34, 'wood');
      B(STAND_D - 0.14, 0, 0.74, 0.16, 1.16, 0.07, WC, 'wood');
    } else {
      B(STAND_D - 0.07, 0, 0.70, 0.36, 1.12, 0.04, IRON, 'metal');
      B(STAND_D - 0.14, 0, 0.74, 0.16, 1.12, 0.07, IRON, 'metal');
      B(STAND_D - 0.07, -0.5, 0, 0.3, 0.05, 0.70, IRON, 'metal');
      B(STAND_D - 0.07, 0.5, 0, 0.3, 0.05, 0.70, IRON, 'metal');
    }
    // 무릎틀(책상 + 방석). kneeler: false 면 놓지 않는다
    if (p.kneeler !== false) {
      B(1.0, 0, 0, 0.08, 0.9, 0.78, WOOD, 'wood');
      B(1.02, 0, 0.78, 0.22, 0.96, 0.04, WOOD, 'wood');
      B(1.2, 0, 0, 0.5, 0.9, 0.04, WOOD, 'wood');
      B(1.3, 0, 0.04, 0.3, 0.86, 0.1, 0x7a2630);
    }
    var fp = footprint(p);
    if (ctx.aoDecal) ctx.aoDecal({ x0: fp.x0, x1: fp.x1, z0: fp.z0, z1: fp.z1, y: y, pad: 0.25 });
    ctx.addCollider(lvC(p, fp));
    return sh;
  }
  var S = { SLOTS: SLOTS, POND: POND, STATUE: STATUE, MESH: MESH, statueMesh: statueMesh, placeOf: placeOf, standOf: standOf, footprint: footprint, applyLayout: applyLayout, build: build, face: face };
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
