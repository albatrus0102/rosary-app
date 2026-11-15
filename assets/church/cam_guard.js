// 3인칭 카메라 벽 가드: 성당 메시(벽·천장·기둥·창)의 삼각형을 한 번 모아 xz 격자에 넣고, 매 프레임
// 아바타 머리 → 카메라 선분을 그 삼각형들에 쏘아 처음 닿는 곳 바로 앞으로 카메라를 당긴다.
// 상자 경계(cameraBounds)만으로는 후진·경당처럼 굽은 벽 밖(상자 모서리)에 카메라가 나가 하늘·외벽이 보였다.
// 빼는 것: 가산 혼합(빛줄기), 점·선·스프라이트·인스턴스(촛불), 숨긴 메시, 아주 작은 면(<0.005㎡), 낮은 물체(maxY < yLow: 의자·바닥).
// 매 프레임 할당 없음(형식 배열 + 도장 배열).
// 가는 장애물(2026-11-15): 몸 높이 띠의 바닥 그림자가 작게 떨어진 덩어리(홀로 선 기둥·피어·성상·난간 기둥)는 '가늘다'(classifyThin).
// 가는 면은 카메라를 당기지 않고(아바타 등에 카메라가 붙어 화면이 몸으로 가득 찼다) 그 메시에 seeThru 꼭짓점 값을 달아
// 셰이더(patchSee)가 카메라–아바타 사이 원뿔 안의 조각을 디더로 지운다. 벽·천장처럼 넓은 면만 예전처럼 카메라를 당긴다.
(function (root) {
  'use strict';

  function build(obj, o) {
    o = o || {};
    var cell = o.cell || 1.5, minArea = o.minArea === undefined ? 0.005 : o.minArea;
    var yLow = o.yLow === undefined ? -1e9 : o.yLow, b = o.bounds || null, pad = 3;
    var bx0 = b ? b.x0 - pad : -1e9, bx1 = b ? b.x1 + pad : 1e9, bz0 = b ? b.z0 - pad : -1e9, bz1 = b ? b.z1 + pad : 1e9;
    var tris = [], triMesh = [], triI = [], meshes = [];
    obj.updateMatrixWorld(true);
    obj.traverseVisible(function (m) {
      if (!m.isMesh || m.isInstancedMesh || m.isSkinnedMesh || (m.userData && m.userData.noCam)) return;
      var mat = Array.isArray(m.material) ? m.material[0] : m.material;
      if (!mat || mat.blending === 2 /* Additive: 빛줄기·먼지 */) return;   // 투명 유리 판은 막는다(창 밖으로 못 나가게)
      var g = m.geometry, pa = g && g.attributes && g.attributes.position;
      if (!pa) return;
      var e = m.matrixWorld.elements, ix = g.index ? g.index.array : null, n = ix ? ix.length : pa.count, mi = meshes.length;
      meshes.push(m);
      var v = [0, 0, 0, 0, 0, 0, 0, 0, 0];
      for (var i = 0; i + 2 < n; i += 3) {
        for (var k = 0; k < 3; k++) {
          var j = ix ? ix[i + k] : i + k, x = pa.getX(j), y = pa.getY(j), z = pa.getZ(j);
          v[k * 3] = e[0] * x + e[4] * y + e[8] * z + e[12];
          v[k * 3 + 1] = e[1] * x + e[5] * y + e[9] * z + e[13];
          v[k * 3 + 2] = e[2] * x + e[6] * y + e[10] * z + e[14];
        }
        if (Math.max(v[1], v[4], v[7]) < yLow) continue;
        var mnx = Math.min(v[0], v[3], v[6]), mxx = Math.max(v[0], v[3], v[6]), mnz = Math.min(v[2], v[5], v[8]), mxz = Math.max(v[2], v[5], v[8]);
        if (mxx < bx0 || mnx > bx1 || mxz < bz0 || mnz > bz1) continue;
        var ax = v[3] - v[0], ay = v[4] - v[1], az = v[5] - v[2], cx = v[6] - v[0], cy = v[7] - v[1], cz = v[8] - v[2];
        var nx = ay * cz - az * cy, ny = az * cx - ax * cz, nz = ax * cy - ay * cx;
        if (Math.sqrt(nx * nx + ny * ny + nz * nz) * 0.5 < minArea) continue;
        tris.push(v[0], v[1], v[2], ax, ay, az, cx, cy, cz); triMesh.push(mi); triI.push(i);
      }
    });
    var nt = tris.length / 9, T9 = new Float32Array(tris);
    var x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity, t, q;
    for (t = 0; t < nt; t++) {
      q = t * 9;
      x0 = Math.min(x0, T9[q], T9[q] + T9[q + 3], T9[q] + T9[q + 6]); x1 = Math.max(x1, T9[q], T9[q] + T9[q + 3], T9[q] + T9[q + 6]);
      z0 = Math.min(z0, T9[q + 2], T9[q + 2] + T9[q + 5], T9[q + 2] + T9[q + 8]); z1 = Math.max(z1, T9[q + 2], T9[q + 2] + T9[q + 5], T9[q + 2] + T9[q + 8]);
    }
    if (!nt) { x0 = z0 = 0; x1 = z1 = 1; }
    x0 = Math.max(x0, bx0); x1 = Math.min(x1, bx1); z0 = Math.max(z0, bz0); z1 = Math.min(z1, bz1);
    var NX = Math.max(1, Math.ceil((x1 - x0) / cell)), NZ = Math.max(1, Math.ceil((z1 - z0) / cell));
    var cnt = new Int32Array(NX * NZ + 1);
    function span(t, f) {
      var q = t * 9, a = T9[q], c = T9[q + 2];
      var i0 = Math.floor((Math.min(a, a + T9[q + 3], a + T9[q + 6]) - x0) / cell), i1 = Math.floor((Math.max(a, a + T9[q + 3], a + T9[q + 6]) - x0) / cell);
      var k0 = Math.floor((Math.min(c, c + T9[q + 5], c + T9[q + 8]) - z0) / cell), k1 = Math.floor((Math.max(c, c + T9[q + 5], c + T9[q + 8]) - z0) / cell);
      i0 = Math.max(0, i0); k0 = Math.max(0, k0); i1 = Math.min(NX - 1, i1); k1 = Math.min(NZ - 1, k1);
      for (var k = k0; k <= k1; k++) for (var i = i0; i <= i1; i++) f(k * NX + i, t);
    }
    for (t = 0; t < nt; t++) span(t, function (c) { cnt[c + 1]++; });
    for (q = 0; q < NX * NZ; q++) cnt[q + 1] += cnt[q];
    var list = new Int32Array(cnt[NX * NZ]), fill = cnt.slice(0, NX * NZ);
    for (t = 0; t < nt; t++) span(t, function (c, tt) { list[fill[c]++] = tt; });
    var stamp = new Uint32Array(nt), gen = 0;
    var fy0 = o.yLow === undefined ? 0 : o.yLow - 1.05;
    var thin = classifyThin(T9, nt, o.thinMax === undefined ? 2.6 : o.thinMax, fy0 + 0.35, fy0 + 2.8);
    var nThin = 0; for (t = 0; t < nt; t++) nThin += thin[t];
    var out = { thin: 1 };   // 마지막 clip/clipWide 에서 처음 닿은 '가는' 면의 비율(0..1, 없으면 1)

    // 선분 A→B 가 처음 닿는 비율(0..1, 안 닿으면 1)에서 margin(m)만큼 앞. 머리 바로 앞(<0.15m)은 무시(아바타가 기댄 벽은 머리 뒤).
    function clip(ax, ay, az, bx, by, bz, margin) {
      var dx = bx - ax, dy = by - ay, dz = bz - az, len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (len < 1e-4 || !nt) { out.thin = 1; return 1; }
      var bestThin = 1, pass = o.thinPass !== false;
      gen = (gen + 1) >>> 0; if (gen === 0) { stamp.fill(0); gen = 1; }
      var best = 1, tMin = 0.15 / len;
      // xz 격자 DDA
      var fx = (ax - x0) / cell, fz = (az - z0) / cell, gx = (bx - x0) / cell, gz = (bz - z0) / cell;
      var ci = Math.floor(fx), ck = Math.floor(fz), ei = Math.floor(gx), ek = Math.floor(gz);
      var sx = gx > fx ? 1 : -1, sz = gz > fz ? 1 : -1, ddx = Math.abs(gx - fx), ddz = Math.abs(gz - fz);
      var tdx = ddx > 1e-9 ? 1 / ddx : Infinity, tdz = ddz > 1e-9 ? 1 / ddz : Infinity;
      var tmx = ddx > 1e-9 ? (sx > 0 ? (ci + 1 - fx) : (fx - ci)) * tdx : Infinity, tmz = ddz > 1e-9 ? (sz > 0 ? (ck + 1 - fz) : (fz - ck)) * tdz : Infinity;
      for (var step = 0; step < 4096; step++) {
        if (ci >= 0 && ci < NX && ck >= 0 && ck < NZ) {
          var c = ck * NX + ci;
          for (var p = cnt[c], pe = cnt[c + 1]; p < pe; p++) {
            var tr = list[p];
            if (stamp[tr] === gen) continue;
            stamp[tr] = gen;
            var q = tr * 9, e1x = T9[q + 3], e1y = T9[q + 4], e1z = T9[q + 5], e2x = T9[q + 6], e2y = T9[q + 7], e2z = T9[q + 8];
            var px = dy * e2z - dz * e2y, py = dz * e2x - dx * e2z, pz = dx * e2y - dy * e2x;
            var det = e1x * px + e1y * py + e1z * pz;
            if (det > -1e-9 && det < 1e-9) continue;
            var inv = 1 / det, sxx = ax - T9[q], syy = ay - T9[q + 1], szz = az - T9[q + 2];
            var u = (sxx * px + syy * py + szz * pz) * inv;
            if (u < 0 || u > 1) continue;
            var qx = syy * e1z - szz * e1y, qy = szz * e1x - sxx * e1z, qz = sxx * e1y - syy * e1x;
            var w = (dx * qx + dy * qy + dz * qz) * inv;
            if (w < 0 || u + w > 1) continue;
            var th = (e2x * qx + e2y * qy + e2z * qz) * inv;
            if (th > tMin && th < best) { if (pass && thin[tr]) { if (th < bestThin) bestThin = th; } else best = th; }
          }
        }
        if (ci === ei && ck === ek) break;
        var tn = tmx < tmz ? tmx : tmz;
        if (tn > 1 || tn > best) break;   // 선분 끝 또는 이미 찾은 충돌보다 먼 칸
        if (tmx < tmz) { tmx += tdx; ci += sx; } else { tmz += tdz; ck += sz; }
      }
      out.thin = bestThin < best ? bestThin : 1;
      if (best >= 1) return 1;
      return Math.max(0, best - (margin === undefined ? 0.3 : margin) / len);
    }
    // 벽 조각 사이 틈(기둥·벽 모서리가 덜 맞물린 곳)으로 빠져나가지 않게 카메라 끝을 좌우 ±w 로 벌린 선 2개를 더 쏜다
    function clipWide(ax, ay, az, bx, by, bz, margin, w) {
      var t = clip(ax, ay, az, bx, by, bz, margin), dx = bx - ax, dz = bz - az, h = Math.sqrt(dx * dx + dz * dz), th0 = out.thin;
      if (h < 1e-3) return t;
      var ox = -dz / h * (w || 0.3), oz = dx / h * (w || 0.3);
      t = Math.min(t, clip(ax, ay, az, bx + ox, by, bz + oz, margin), clip(ax, ay, az, bx - ox, by, bz - oz, margin));
      out.thin = th0;   // 가림 판정은 가운데 선(머리→카메라)만
      return t;
    }
    var api = { clip: clip, clipWide: clipWide, out: out, triangles: nt, thinTriangles: nThin, cells: NX * NZ, see: null };
    api.isThin = function (t) { return thin[t] === 1; };
    // 가는 면이 있는 메시에 seeThru(Uint8, 정규화) 꼭짓점 값을 단다. 그 재질을 쓰는 다른 메시에도 0 값을 달아 둔다(빈 속성 슬롯이 1로 읽히지 않게).
    if (o.see !== false && nThin) api.see = attachSee(obj, meshes, triMesh, triI, thin, nt, o.THREE || root.THREE);
    return api;
  }

  // 가는 면 판정: 몸 높이 띠(yB0..yB1)에 걸친 삼각형의 xz 그림자를 0.2m 칸에 찍고, 찍힌 칸을 8방향으로 이어 덩어리를 만든다.
  // 덩어리 xz 상자의 두 변이 모두 thinMax 이하이면 가는 덩어리(홀로 선 기둥·성상·제대 앞 난간 기둥). 벽은 띠 안에서 길게 이어져 넓다.
  // 삼각형은 그림자가 덮는 칸이 모두 가는 덩어리 위일 때 가늘다(띠 위로 이어지는 기둥 윗부분 포함, 기둥 사이를 덮는 아치·벽은 빈 칸에 걸쳐 넓다).
  function classifyThin(T9, nt, thinMax, yB0, yB1) {
    var thin = new Uint8Array(nt);
    if (!nt || !(thinMax > 0)) return thin;
    var CS = 0.2, tol2 = 0.1 * 0.1, X0 = 1e9, X1 = -1e9, Z0 = 1e9, Z1 = -1e9, t, q;
    function yr(t2) { var q2 = t2 * 9, y = T9[q2 + 1]; return [Math.min(y, y + T9[q2 + 4], y + T9[q2 + 7]), Math.max(y, y + T9[q2 + 4], y + T9[q2 + 7])]; }
    for (t = 0; t < nt; t++) {
      q = t * 9; var a = T9[q], c = T9[q + 2];
      X0 = Math.min(X0, a, a + T9[q + 3], a + T9[q + 6]); X1 = Math.max(X1, a, a + T9[q + 3], a + T9[q + 6]);
      Z0 = Math.min(Z0, c, c + T9[q + 5], c + T9[q + 8]); Z1 = Math.max(Z1, c, c + T9[q + 5], c + T9[q + 8]);
    }
    X0 -= 0.5; Z0 -= 0.5;
    var GX = Math.min(4000, Math.ceil((X1 - X0) / CS) + 3), GZ = Math.min(4000, Math.ceil((Z1 - Z0) / CS) + 3), NC = GX * GZ;
    var occ = new Uint8Array(NC);
    function segD2(px, pz, ax, az, bx, bz) {
      var ux = bx - ax, uz = bz - az, L = ux * ux + uz * uz, h = L > 1e-12 ? ((px - ax) * ux + (pz - az) * uz) / L : 0;
      h = h < 0 ? 0 : h > 1 ? 1 : h; var ex = ax + ux * h - px, ez = az + uz * h - pz; return ex * ex + ez * ez;
    }
    // 삼각형 t 의 xz 그림자가 덮는 칸마다 f(칸) — f 가 false 를 돌려주면 멈춘다
    function raster(t2, f) {
      var q2 = t2 * 9, p0x = T9[q2], p0z = T9[q2 + 2], p1x = p0x + T9[q2 + 3], p1z = p0z + T9[q2 + 5], p2x = p0x + T9[q2 + 6], p2z = p0z + T9[q2 + 8];
      var ar = (p1x - p0x) * (p2z - p0z) - (p2x - p0x) * (p1z - p0z);
      var i0 = Math.max(0, Math.floor((Math.min(p0x, p1x, p2x) - 0.1 - X0) / CS)), i1 = Math.min(GX - 1, Math.floor((Math.max(p0x, p1x, p2x) + 0.1 - X0) / CS));
      var k0 = Math.max(0, Math.floor((Math.min(p0z, p1z, p2z) - 0.1 - Z0) / CS)), k1 = Math.min(GZ - 1, Math.floor((Math.max(p0z, p1z, p2z) + 0.1 - Z0) / CS));
      for (var kz = k0; kz <= k1; kz++) for (var ix = i0; ix <= i1; ix++) {
        var cx = X0 + (ix + 0.5) * CS, cz = Z0 + (kz + 0.5) * CS, inside = false;
        if (ar > 1e-9 || ar < -1e-9) {
          var w0 = ((p1x - cx) * (p2z - cz) - (p2x - cx) * (p1z - cz)) / ar, w1 = ((p2x - cx) * (p0z - cz) - (p0x - cx) * (p2z - cz)) / ar;
          inside = w0 >= 0 && w1 >= 0 && w0 + w1 <= 1;
        }
        if (!inside && segD2(cx, cz, p0x, p0z, p1x, p1z) > tol2 && segD2(cx, cz, p1x, p1z, p2x, p2z) > tol2 && segD2(cx, cz, p2x, p2z, p0x, p0z) > tol2) continue;
        if (f(kz * GX + ix) === false) return;
      }
    }
    var band = new Uint8Array(nt);
    for (t = 0; t < nt; t++) { var r = yr(t); if (r[1] >= yB0 && r[0] <= yB1) { band[t] = 1; raster(t, function (c2) { occ[c2] = 1; }); } }
    // 칸 덩어리(8방향): 덩어리마다 상자 → 가는 덩어리 칸 표시(thinC)
    var lab = new Int32Array(NC).fill(-1), stack = new Int32Array(NC), thinC = new Uint8Array(NC), members = new Int32Array(NC);
    for (var s0 = 0; s0 < NC; s0++) {
      if (!occ[s0] || lab[s0] >= 0) continue;
      var sp = 0, nm = 0, mx0 = 1e9, mx1 = -1e9, mz0 = 1e9, mz1 = -1e9, big = false;
      stack[sp++] = s0; lab[s0] = s0;
      while (sp) {
        var cc = stack[--sp], ci = cc % GX, ck = (cc - ci) / GX;
        members[nm++] = cc;
        if (ci < mx0) mx0 = ci; if (ci > mx1) mx1 = ci; if (ck < mz0) mz0 = ck; if (ck > mz1) mz1 = ck;
        for (var dk = -1; dk <= 1; dk++) for (var di = -1; di <= 1; di++) {
          var ni = ci + di, nk = ck + dk;
          if (ni < 0 || nk < 0 || ni >= GX || nk >= GZ) continue;
          var nc = nk * GX + ni;
          if (occ[nc] && lab[nc] < 0) { lab[nc] = s0; stack[sp++] = nc; }
        }
      }
      big = (mx1 - mx0 + 1) * CS > thinMax || (mz1 - mz0 + 1) * CS > thinMax;
      if (!big) for (var m2 = 0; m2 < nm; m2++) thinC[members[m2]] = 1;
    }
    var yTop = yB1 + 2.6;   // 띠 위로는 카메라 높이(바닥+4m 남짓)까지만 기둥 윗부분으로 본다
    for (t = 0; t < nt; t++) {
      var r2 = yr(t);
      if (r2[0] > yTop || r2[1] < yB0) continue;
      var ok = true, any = false;
      raster(t, function (c3) { if (!thinC[c3]) { ok = false; return false; } any = true; });
      if (ok && any) thin[t] = 1;
    }
    return thin;
  }

  // 가림 디더 셰이더: 카메라(a)→아바타 가슴(b) 원뿔(반지름 r: 카메라 쪽 0.55r → 아바타 쪽 r) 안의 seeThru 조각을 k 만큼 지운다.
  // 균일값은 모든 재질이 같은 객체를 나눠 쓴다(매 프레임 a·b·k 숫자만 바꾼다 — 할당 0). 재질은 복제하지 않고 onBeforeCompile 을 잇는다
  // (기존 onBeforeCompile·프로그램 캐시 키는 그대로 두고 '|see' 를 덧붙여 다른 재질과 프로그램이 섞이지 않게).
  var SEE_V = 'attribute float seeThru;\nvarying float vSee;\nvarying vec3 vSeeW;\n';
  var SEE_F = 'uniform vec3 uSeeA;\nuniform vec3 uSeeB;\nuniform float uSeeK;\nuniform float uSeeR;\nvarying float vSee;\nvarying vec3 vSeeW;\n';
  var SEE_MAIN = 'void main() {\n\tif (vSee > 0.5 && uSeeK > 0.004) {\n\t\tvec3 sAB = uSeeB - uSeeA; float sH = dot(vSeeW - uSeeA, sAB) / max(dot(sAB, sAB), 1e-4);\n' +
    '\t\tfloat sD = length(vSeeW - uSeeA - sAB * clamp(sH, 0.0, 1.0)), sR = uSeeR * (0.55 + 0.45 * clamp(sH, 0.0, 1.0));\n' +
    '\t\tfloat sF = (1.0 - smoothstep(sR * 0.6, sR, sD)) * smoothstep(-0.3, -0.05, sH) * (1.0 - smoothstep(0.9, 1.0, sH));\n' +
    '\t\tfloat sN = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));\n' +
    '\t\tif (sN < sF * uSeeK * 0.86) discard;\n\t}\n';
  function patchSee(mat, U) {
    if (!mat || mat.userData.seePatched) return;
    mat.userData.seePatched = true;
    var prev = mat.onBeforeCompile, prevKey = '';
    try { prevKey = String(mat.customProgramCacheKey()); } catch (e) { prevKey = ''; }
    mat.onBeforeCompile = function (sh, r) {
      if (prev) prev.call(this, sh, r);
      if (sh.vertexShader.indexOf('#include <project_vertex>') < 0 || sh.fragmentShader.indexOf('void main() {') < 0) return;
      sh.uniforms.uSeeA = U.a; sh.uniforms.uSeeB = U.b; sh.uniforms.uSeeK = U.k; sh.uniforms.uSeeR = U.r;
      sh.vertexShader = SEE_V + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n\tvSee = seeThru;\n\tvSeeW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = SEE_F + sh.fragmentShader.replace('void main() {', SEE_MAIN);
    };
    mat.customProgramCacheKey = function () { return prevKey + '|see'; };
    mat.needsUpdate = true;
  }
  function attachSee(obj, meshes, triMesh, triI, thin, nt, THREE) {
    var BA = THREE && THREE.BufferAttribute;
    if (!BA) return null;
    var U = { a: { value: new Float32Array(3) }, b: { value: new Float32Array(3) }, k: { value: 0 }, r: { value: 1.0 } };
    var arrs = new Array(meshes.length), mats = [], t, k;
    for (t = 0; t < nt; t++) {
      if (!thin[t]) continue;
      var mi = triMesh[t], m = meshes[mi], g = m.geometry, ix = g.index ? g.index.array : null;
      var A = arrs[mi] || (arrs[mi] = new Uint8Array(g.attributes.position.count));
      for (k = 0; k < 3; k++) A[ix ? ix[triI[t] + k] : triI[t] + k] = 255;
    }
        for (var i = 0; i < meshes.length; i++) {
      if (!arrs[i]) continue;
      var mm = meshes[i], ml = Array.isArray(mm.material) ? mm.material : [mm.material];
      mm.geometry.setAttribute('seeThru', new BA(arrs[i], 1, true));
      ml.forEach(function (x) { if (mats.indexOf(x) < 0) mats.push(x); });
    }
    obj.traverse(function (m) {   // 고친 재질을 쓰는데 seeThru 가 없는 메시(숨긴 것·가는 면이 없는 것)에 0 값
      if (!m.isMesh || !m.geometry || !m.geometry.attributes || !m.geometry.attributes.position || m.geometry.attributes.seeThru) return;
      var ml = Array.isArray(m.material) ? m.material : [m.material];
      for (var j = 0; j < ml.length; j++) if (mats.indexOf(ml[j]) >= 0) { m.geometry.setAttribute('seeThru', new BA(new Uint8Array(m.geometry.attributes.position.count), 1, true)); break; }
    });
    mats.forEach(function (x) { patchSee(x, U); });
    // 카메라 위치(cx..)·아바타 가슴(bx..)·세기(0..1)를 한 번에(할당 0)
    U.set = function (ax, ay, az, bx, by, bz, kk) { var a = U.a.value, b = U.b.value; a[0] = ax; a[1] = ay; a[2] = az; b[0] = bx; b[1] = by; b[2] = bz; U.k.value = kk; };
    U.materials = mats.length;
    return U;
  }

  // 카메라–머리 거리 → 아바타 불투명도(1.3m 이상 1, 0.6m 이하 거의 0)
  function avatarAlpha(d) { var u = (d - 0.6) / 0.7; u = u < 0 ? 0 : u > 1 ? 1 : u; return 0.06 + 0.94 * u * u * (3 - 2 * u); }

  // 기도 자리 시점(성모 기도 자리·제대 앞·14처 판·봉헌초 도착, 앉기·무릎 꿇기): 카메라는 자리 방향(yaw) 뒤에서 side 만큼 비켜
  // 낮게(pitch)·가깝게(zoom) 서고, 보는 점은 아바타 앞 fwd·위 up 으로 옮긴다 → 아바타는 화면 아래 한편, 목표물은 가운데~위.
  var SPOT = { side: 0.32, pitch: 0.2, zoom: 0.8, fwd: 2.4, up: 0.6 };
  // 섞음 f(0..1)로 실제 pitch·거리·보는 점 오프셋을 out 에 쓴다(할당 0). base = 줌 1 의 기본 거리(서기 7.2 / 앉기 4.4).
  function spotBlend(pitch, D, base, f, out) {
    out.pitch = pitch + (SPOT.pitch - pitch) * f;
    out.D = D + (base * SPOT.zoom - D) * f;
    out.fwd = SPOT.fwd * f; out.up = SPOT.up * f;
    return out;
  }

  var api = { build: build, classifyThin: classifyThin, patchSee: patchSee, avatarAlpha: avatarAlpha, SPOT: SPOT, spotBlend: spotBlend };
  root.ChurchCamGuard = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : this);
