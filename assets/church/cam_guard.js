// 3인칭 카메라 벽 가드: 성당 메시(벽·천장·기둥·창)의 삼각형을 한 번 모아 xz 격자에 넣고, 매 프레임
// 아바타 머리 → 카메라 선분을 그 삼각형들에 쏘아 처음 닿는 곳 바로 앞으로 카메라를 당긴다.
// 상자 경계(cameraBounds)만으로는 후진·경당처럼 굽은 벽 밖(상자 모서리)에 카메라가 나가 하늘·외벽이 보였다.
// 빼는 것: 가산 혼합(빛줄기), 점·선·스프라이트·인스턴스(촛불), 숨긴 메시, 아주 작은 면(<0.005㎡), 낮은 물체(maxY < yLow: 의자·바닥).
// 매 프레임 할당 없음(형식 배열 + 도장 배열).
(function (root) {
  'use strict';

  function build(obj, o) {
    o = o || {};
    var cell = o.cell || 1.5, minArea = o.minArea === undefined ? 0.005 : o.minArea;
    var yLow = o.yLow === undefined ? -1e9 : o.yLow, b = o.bounds || null, pad = 3;
    var bx0 = b ? b.x0 - pad : -1e9, bx1 = b ? b.x1 + pad : 1e9, bz0 = b ? b.z0 - pad : -1e9, bz1 = b ? b.z1 + pad : 1e9;
    var tris = [];
    obj.updateMatrixWorld(true);
    obj.traverseVisible(function (m) {
      if (!m.isMesh || m.isInstancedMesh || m.isSkinnedMesh || (m.userData && m.userData.noCam)) return;
      var mat = Array.isArray(m.material) ? m.material[0] : m.material;
      if (!mat || mat.blending === 2 /* Additive: 빛줄기·먼지 */) return;   // 투명 유리 판은 막는다(창 밖으로 못 나가게)
      var g = m.geometry, pa = g && g.attributes && g.attributes.position;
      if (!pa) return;
      var e = m.matrixWorld.elements, ix = g.index ? g.index.array : null, n = ix ? ix.length : pa.count;
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
        tris.push(v[0], v[1], v[2], ax, ay, az, cx, cy, cz);
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

    // 선분 A→B 가 처음 닿는 비율(0..1, 안 닿으면 1)에서 margin(m)만큼 앞. 머리 바로 앞(<0.15m)은 무시(아바타가 기댄 벽은 머리 뒤).
    function clip(ax, ay, az, bx, by, bz, margin) {
      var dx = bx - ax, dy = by - ay, dz = bz - az, len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (len < 1e-4 || !nt) return 1;
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
            if (th > tMin && th < best) best = th;
          }
        }
        if (ci === ei && ck === ek) break;
        var tn = tmx < tmz ? tmx : tmz;
        if (tn > 1 || tn > best) break;   // 선분 끝 또는 이미 찾은 충돌보다 먼 칸
        if (tmx < tmz) { tmx += tdx; ci += sx; } else { tmz += tdz; ck += sz; }
      }
      if (best >= 1) return 1;
      return Math.max(0, best - (margin === undefined ? 0.3 : margin) / len);
    }
    return { clip: clip, triangles: nt, cells: NX * NZ };
  }

  var api = { build: build };
  root.ChurchCamGuard = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : this);
