// 3인칭 카메라 가드(docs/church/CAMERA.md): 성당 메시(벽·천장·기둥·창)의 삼각형을 한 번 모아 xz 격자에 넣는다(clip: 선분이 처음 닿는 곳).
// 2026-11-15 2차: 카메라를 '벽 앞으로 당기는' 대신 '실내의 설 수 있는 자리(카메라 공간 복셀, buildSpace)에 서고 사이의 가림물을 잘라내는'
// 게임식 cutaway 로 바꿨다. 벽 속·기둥 속·바깥만 피하고, 사이의 벽·기둥·윗벽·아치(기도 자세에서는 의자도)는 셰이더(patchSee)가
// 카메라–아바타 원뿔 안 조각을 지운다(합친 메시도 조각 단위, 균일값만 바꾼다 — draw call·재컴파일 0). 바닥은 절대 지우지 않는다.
// 빼는 것: 가산 혼합(빛줄기), 점·선·스프라이트·인스턴스(촛불), 숨긴 메시, 아주 작은 면(<0.005㎡). 낮은 물체(maxY < yLow: 의자)는 막지 않고 지우기만 한다.
// 매 프레임 할당 없음(형식 배열 + 도장 배열). 가는 면(classifyThin: 홀로 선 기둥·피어·성상)은 clip 이 막지 않고 out.thin 으로 알린다.
(function (root) {
  'use strict';

  function build(obj, o) {
    o = o || {};
    var cell = o.cell || 1.5, minArea = o.minArea === undefined ? 0.005 : o.minArea;
    var yLow = o.yLow === undefined ? -1e9 : o.yLow, b = o.bounds || null, pad = 3, R = o.region;
    // 카메라 상자(bounds)보다 걷는 곳(region = layout.bounds)이 넓으면(명동·라테라노 익랑) 둘을 합친 곳의 면·공간을 모은다
    if (b && R) b = { x0: Math.min(b.x0, R.x0), x1: Math.max(b.x1, R.x1), z0: Math.min(b.z0, R.z0), z1: Math.max(b.z1, R.z1), yMax: b.yMax };
    var bx0 = b ? b.x0 - pad : -1e9, bx1 = b ? b.x1 + pad : 1e9, bz0 = b ? b.z0 - pad : -1e9, bz1 = b ? b.z1 + pad : 1e9;
    var tris = [], triMesh = [], triI = [], triFlat = [], lowT = [], meshes = [];
    // 바닥(위를 보는 거의 수평 면, 걷는 바닥 높이 + 0.35m 아래)은 절대 지우지 않는다. floorTop = 가장 높은 바닥 구역(제단 단 등).
    var hasLow = o.yLow !== undefined, fy0 = hasLow ? o.yLow - 1.05 : 0, floorTop = o.floorTop === undefined ? fy0 : Math.max(fy0, o.floorTop);
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
        var mxY = Math.max(v[1], v[4], v[7]);
        if (hasLow && mxY < fy0 + 0.12) continue;   // 바닥 높이의 것(바닥 판·깔개·장식 띠)
        var mnx = Math.min(v[0], v[3], v[6]), mxx = Math.max(v[0], v[3], v[6]), mnz = Math.min(v[2], v[5], v[8]), mxz = Math.max(v[2], v[5], v[8]);
        if (mxx < bx0 || mnx > bx1 || mxz < bz0 || mnz > bz1) continue;
        var ax = v[3] - v[0], ay = v[4] - v[1], az = v[5] - v[2], cx = v[6] - v[0], cy = v[7] - v[1], cz = v[8] - v[2];
        var nx = ay * cz - az * cy, ny = az * cx - ax * cz, nz = ax * cy - ay * cx, nl = Math.sqrt(nx * nx + ny * ny + nz * nz);
        if (nl * 0.5 < minArea) continue;
        // 바닥: 거의 수평이고 그 자리 바닥 높이(floorY, 제단 단·성단 포함) 근처. 의자 좌석판 같은 높은 수평면은 바닥이 아니다
        var flat = 0;
        if (Math.abs(ny) > 0.8 * nl && mxY < floorTop + 0.35) {
          var fyAt = o.floorY ? (o.floorY((mnx + mxx) * 0.5, (mnz + mxz) * 0.5) || 0) : floorTop;
          flat = mxY < fyAt + 0.2 || mxY < fy0 + 0.25 ? 1 : 0;
        }
        // 낮은 물체(의자·무릎틀·난간): 카메라를 막지 않는다(카메라는 그 위에 뜬다). 기도 자세에서 가리면 지운다(seeThru 85).
        if (mxY < yLow) { if (!flat) lowT.push(mi, i); continue; }
        tris.push(v[0], v[1], v[2], ax, ay, az, cx, cy, cz); triMesh.push(mi); triI.push(i); triFlat.push(flat);
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
    var thin = classifyThin(T9, nt, o.thinMax === undefined ? 4.4 : o.thinMax, fy0 + 0.35, fy0 + 2.8);
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
    var api = { clip: clip, clipWide: clipWide, out: out, triangles: nt, thinTriangles: nThin, lowTriangles: lowT.length / 2, cells: NX * NZ, see: null, space: null };
    api.isThin = function (t) { return thin[t] === 1; };
    // 카메라가 설 수 있는 실내 공간(복셀): 리그가 '벽 앞으로 당기기' 대신 '벽 너머 실내에 서고 사이를 지우기'를 고른다.
    if (o.space !== false && nt) api.space = buildSpace(T9, nt, o, fy0, b ? { x0: b.x0, x1: b.x1, z0: b.z0, z1: b.z1, yMax: b.yMax } : { x0: x0, x1: x1, z0: z0, z1: z1 }, clip, out);
    // 메시마다 seeThru(Uint8, 정규화) 꼭짓점 값: 255 가는 면(기둥·성상), 170 넓은 면(벽·아치·천장·윗벽), 85 낮은 물체(의자), 0 바닥.
    // 그 재질을 쓰는 다른 메시에도 0 값을 달아 둔다(빈 속성 슬롯이 1로 읽히지 않게).
    if (o.see !== false && nt) api.see = attachSee(obj, meshes, triMesh, triI, thin, nt, o.THREE || root.THREE, triFlat, lowT);
    return api;
  }

  // ---- 카메라 공간 복셀(2026-11-15, docs/church/CAMERA.md) ----
  // xz cs(0.4m) × y 0.5m 격자. 1) 벽·천장·기둥 면(T9)을 0.2m 간격 표본으로 찍어 '면' 칸, 2) 한 칸 넓혀(벽에서 ≥0.4m 여유) '막힌' 칸,
  // 3) 걸을 수 있는 자리(o.walk) 위 몸 높이 칸에서 6방향 홍수 채우기 → 닿은 칸만 카메라 자리(기둥·피어·두꺼운 벽 속, 막힌 방은 못 들어간다).
  // 4) 기둥(열)마다 '지붕 아래'(위로 면이 있다) 표시: 아바타가 실내면 카메라도 지붕 아래여야 한다(문으로 새어 나간 바깥 마당 금지).
  // 상자(o.bounds = cameraBounds) 밖은 없다. 높이는 바닥 + 14m 까지(그 위는 맨 윗층 값).
  function buildSpace(T9, nt, o, fy0, B, clip, out) {
    var cs = o.spaceCell || 0.4, chh = 0.5;
    var X0 = B.x0, Z0 = B.z0, NX = Math.max(1, Math.ceil((B.x1 - B.x0) / cs)), NZ = Math.max(1, Math.ceil((B.z1 - B.z0) / cs));
    var yB = fy0 + 0.25, yT = Math.min(B.yMax || fy0 + 14, fy0 + 14), NY = Math.max(1, Math.ceil((yT - yB) / chh)), NXZ = NX * NZ, N = NXZ * NY;
    if (N > 4e6) return null;   // 너무 큰 상자(시험용 등): 공간 없이(리그는 상자 경계만)
    var sol = new Uint8Array(N), t, q, c, gx, gz, gyy;
    // 면 칸 찍기: 삼각형마다 법선이 가장 큰 축(a)으로 투영해 나머지 두 축(u,v) 칸을 돌고, 칸 모서리 4곳의 평면 높이(a) 범위를 칠한다(보수적).
    var O3 = [X0, yB, Z0], C3 = [cs, chh, cs], N3 = [NX, NY, NZ], S3 = [1, NXZ, NX], P = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (t = 0; t < nt; t++) {
      q = t * 9;
      P[0] = T9[q]; P[1] = T9[q + 1]; P[2] = T9[q + 2];
      P[3] = P[0] + T9[q + 3]; P[4] = P[1] + T9[q + 4]; P[5] = P[2] + T9[q + 5];
      P[6] = P[0] + T9[q + 6]; P[7] = P[1] + T9[q + 7]; P[8] = P[2] + T9[q + 8];
      if (Math.min(P[1], P[4], P[7]) > yT + chh || Math.max(P[1], P[4], P[7]) < yB) continue;
      var e1x = T9[q + 3], e1y = T9[q + 4], e1z = T9[q + 5], e2x = T9[q + 6], e2y = T9[q + 7], e2z = T9[q + 8];
      var Nn = [e1y * e2z - e1z * e2y, e1z * e2x - e1x * e2z, e1x * e2y - e1y * e2x];
      var A = Math.abs(Nn[0]) >= Math.abs(Nn[1]) && Math.abs(Nn[0]) >= Math.abs(Nn[2]) ? 0 : (Math.abs(Nn[1]) >= Math.abs(Nn[2]) ? 1 : 2);
      var U = A === 0 ? 1 : 0, V = A === 2 ? 1 : 2, na = Nn[A];
      if (na > -1e-12 && na < 1e-12) continue;
      var dpl = Nn[0] * P[0] + Nn[1] * P[1] + Nn[2] * P[2];
      var u0 = P[U], v0 = P[V], u1 = P[3 + U], v1 = P[3 + V], u2 = P[6 + U], v2 = P[6 + V];
      var aMin = Math.min(P[A], P[3 + A], P[6 + A]), aMax = Math.max(P[A], P[3 + A], P[6 + A]);
      var cu = C3[U], cv = C3[V], ca = C3[A];
      var iu0 = Math.max(0, Math.floor((Math.min(u0, u1, u2) - O3[U]) / cu)), iu1 = Math.min(N3[U] - 1, Math.floor((Math.max(u0, u1, u2) - O3[U]) / cu));
      var iv0 = Math.max(0, Math.floor((Math.min(v0, v1, v2) - O3[V]) / cv)), iv1 = Math.min(N3[V] - 1, Math.floor((Math.max(v0, v1, v2) - O3[V]) / cv));
      if (iu0 > iu1 || iv0 > iv1) continue;
      var ar = (u1 - u0) * (v2 - v0) - (u2 - u0) * (v1 - v0), sg = ar < 0 ? -1 : 1;
      // 변 함수(바깥쪽 거리, 정규화) — 칸 반대각선만큼 여유
      var E = [[u0, v0, u1, v1], [u1, v1, u2, v2], [u2, v2, u0, v0]], EN = [], r = 0.5 * Math.sqrt(cu * cu + cv * cv);
      for (var ei = 0; ei < 3; ei++) { var ex = E[ei][2] - E[ei][0], ey = E[ei][3] - E[ei][1], el = Math.sqrt(ex * ex + ey * ey) || 1; EN.push(ex / el, ey / el, E[ei][0], E[ei][1]); }
      for (var iv = iv0; iv <= iv1; iv++) for (var iu = iu0; iu <= iu1; iu++) {
        var cu0 = O3[U] + iu * cu, cv0 = O3[V] + iv * cv, ccu = cu0 + cu * 0.5, ccv = cv0 + cv * 0.5, inside = true;
        for (ei = 0; ei < 12; ei += 4) { if (-sg * (EN[ei] * (ccv - EN[ei + 3]) - EN[ei + 1] * (ccu - EN[ei + 2])) > r) { inside = false; break; } }
        if (!inside) continue;
        // 칸 모서리에서의 평면 a 값 범위(삼각형 a 범위로 자름)
        var lo = 1e9, hi = -1e9;
        for (var cc2 = 0; cc2 < 4; cc2++) {
          var uu = cu0 + (cc2 & 1) * cu, vv2 = cv0 + (cc2 >> 1) * cv, aa = (dpl - Nn[U] * uu - Nn[V] * vv2) / na;
          if (aa < lo) lo = aa; if (aa > hi) hi = aa;
        }
        if (lo < aMin) lo = aMin; if (hi > aMax) hi = aMax;
        if (lo > hi) continue;
        var ia0 = Math.max(0, Math.floor((lo - O3[A]) / ca)), ia1 = Math.min(N3[A] - 1, Math.floor((hi - O3[A]) / ca));
        var base = iu * S3[U] + iv * S3[V];
        for (var ia = ia0; ia <= ia1; ia++) sol[base + ia * S3[A]] = 1;
      }
    }
    // 한 칸 넓히기(x → z → y 분리 최대값 필터)
    var blk = new Uint8Array(N), tmp = new Uint8Array(N), iy2;
    for (iy2 = 0; iy2 < NY; iy2++) for (gz = 0; gz < NZ; gz++) {
      var row = iy2 * NXZ + gz * NX;
      for (gx = 0; gx < NX; gx++) { c = row + gx; tmp[c] = sol[c] | (gx > 0 ? sol[c - 1] : 0) | (gx < NX - 1 ? sol[c + 1] : 0); }
    }
    for (iy2 = 0; iy2 < NY; iy2++) for (gz = 0; gz < NZ; gz++) {
      var row2 = iy2 * NXZ + gz * NX;
      for (gx = 0; gx < NX; gx++) { c = row2 + gx; blk[c] = tmp[c] | (gz > 0 ? tmp[c - NX] : 0) | (gz < NZ - 1 ? tmp[c + NX] : 0); }
    }
    for (c = 0; c < N; c++) tmp[c] = blk[c] | (c >= NXZ ? blk[c - NXZ] : 0) | (c + NXZ < N ? blk[c + NXZ] : 0);
    blk = tmp;
    // 지붕 아래(칸마다): 열마다 '지붕 높이' = 위로 쏜 선(격자 맨 위 → 하늘)이 무엇에든 닿으면 끝까지(NY), 아니면 가장 높은 면 칸(topS).
    // 그 값을 5×5 열(±0.8m)의 최솟값으로 깎는다: 처마·코니스·버팀벽 머리 밑 같은 좁은 바깥 띠는 지붕 아래가 아니다(벽 안쪽 칸은 벽 두께 덕에 안 깎인다).
    // 열이 아니라 칸이다: 측랑 지붕 위(바깥 하늘)는 지붕 아래가 아니다. 위로 쏘기는 2×2 열이 나눠 쓴다.
    var topS = new Int16Array(NXZ).fill(-1), BX = (NX + 1) >> 1, ray = new Int8Array(BX * ((NZ + 1) >> 1)).fill(-1);
    for (c = 0; c < N; c++) if (sol[c]) { var cl0 = c % NXZ, iy0 = (c / NXZ) | 0; if (iy0 > topS[cl0]) topS[cl0] = iy0; }
    var roofA = new Int16Array(NXZ), roofB = new Int16Array(NXZ), roofE = new Int16Array(NXZ), ER = 2;
    for (gz = 0; gz < NZ; gz++) for (gx = 0; gx < NX; gx++) {
      var bi = (gz >> 1) * BX + (gx >> 1);
      if (ray[bi] < 0) {
        var px = X0 + ((gx & ~1) + 1) * cs, pz = Z0 + ((gz & ~1) + 1) * cs;
        ray[bi] = clip(px, yT, pz, px, yT + 250, pz, 0) < 1 || out.thin < 1 ? 1 : 0;
      }
      roofA[gz * NX + gx] = ray[bi] ? NY : topS[gz * NX + gx];
    }
    ray = null;
    for (gz = 0; gz < NZ; gz++) for (gx = 0; gx < NX; gx++) {
      var mnR = 32767;
      for (var ex2 = Math.max(0, gx - ER); ex2 <= Math.min(NX - 1, gx + ER); ex2++) if (roofA[gz * NX + ex2] < mnR) mnR = roofA[gz * NX + ex2];
      roofB[gz * NX + gx] = mnR;
    }
    for (gz = 0; gz < NZ; gz++) for (gx = 0; gx < NX; gx++) {
      var mnR2 = 32767;
      for (var ez2 = Math.max(0, gz - ER); ez2 <= Math.min(NZ - 1, gz + ER); ez2++) if (roofB[ez2 * NX + gx] < mnR2) mnR2 = roofB[ez2 * NX + gx];
      roofE[gz * NX + gx] = mnR2;
    }
    var roof = roofE; roofB = topS = null;
    function covV(cx2, cz2, iy) { return iy < roof[cz2 * NX + cx2]; }
    function covRaw(cx2, cz2, iy) { return iy < roofA[cz2 * NX + cx2]; }   // 아바타 자신: 깎지 않은 값(벽 가까이 서도 실내)
    // 홍수 채우기: 걸을 수 있는 자리(0.8m 간격으로 묻는다) 위 몸 높이 칸에서.
    // o.walk(x,z): 1(true) = 걷는 자리, 0(false) = 아니다, 2 = 걷는 곳 밖이지만 카메라 상자 안(만든 이가 열어 둔 카메라 통로): 지붕 아래면 씨앗.
    var reach = new Uint8Array(N), qu = new Int32Array(N), qh = 0, qt = 0, SW = 2, pas = new Uint8Array(NXZ);
    for (gz = 0; gz < NZ; gz += SW) for (gx = 0; gx < NX; gx += SW) {
      var wx = X0 + (gx + SW * 0.5) * cs, wz = Z0 + (gz + SW * 0.5) * cs, wk = o.walk ? o.walk(wx, wz) : 1;
      if (wk === 2) for (var pz2 = 0; pz2 < SW && gz + pz2 < NZ; pz2++) for (var px2 = 0; px2 < SW && gx + px2 < NX; px2++) pas[(gz + pz2) * NX + gx + px2] = 1;
      if (!wk) continue;
      var fyc = o.floorY ? (o.floorY(wx, wz) || 0) : fy0;
      for (var sy = fyc + 0.9; sy <= fyc + 1.9; sy += chh) {
        gyy = Math.floor((sy - yB) / chh); if (gyy < 0 || gyy >= NY) continue;
        if (wk === 2 && !covV(Math.min(NX - 1, gx + 1), Math.min(NZ - 1, gz + 1), gyy)) continue;
        for (var dz2 = 0; dz2 < SW && gz + dz2 < NZ; dz2++) for (var dx2 = 0; dx2 < SW && gx + dx2 < NX; dx2++) {
          c = gyy * NXZ + (gz + dz2) * NX + gx + dx2;
          if (!blk[c] && !reach[c]) { reach[c] = 1; qu[qt++] = c; }
        }
      }
    }
    while (qh < qt) {
      c = qu[qh++]; gx = c % NX; gz = ((c % NXZ) / NX) | 0; gyy = (c / NXZ) | 0;
      if (gx > 0 && !blk[c - 1] && !reach[c - 1]) { reach[c - 1] = 1; qu[qt++] = c - 1; }
      if (gx < NX - 1 && !blk[c + 1] && !reach[c + 1]) { reach[c + 1] = 1; qu[qt++] = c + 1; }
      if (gz > 0 && !blk[c - NX] && !reach[c - NX]) { reach[c - NX] = 1; qu[qt++] = c - NX; }
      if (gz < NZ - 1 && !blk[c + NX] && !reach[c + NX]) { reach[c + NX] = 1; qu[qt++] = c + NX; }
      if (gyy > 0 && !blk[c - NXZ] && !reach[c - NXZ]) { reach[c - NXZ] = 1; qu[qt++] = c - NXZ; }
      if (gyy < NY - 1 && !blk[c + NXZ] && !reach[c + NXZ]) { reach[c + NXZ] = 1; qu[qt++] = c + NXZ; }
    }
    qu = tmp = blk = null;
    // 칸 값 표: 0 = 못 선다, 1 = 선다(지붕 밖), 3 = 선다(지붕 아래), +4 = 걷는 곳 밖의 카메라 통로(벽 하나 너머에서만)
    var val = reach, nCov = 0, nReach = 0;
    for (c = 0; c < N; c++) if (reach[c]) {
      nReach++; var cl1 = c % NXZ, k5 = (c / NXZ) | 0;
      if (covV(cl1 % NX, (cl1 / NX) | 0, k5)) { val[c] = 3; nCov++; }
      if (pas[cl1]) val[c] |= 4;
    }
    pas = null;
    var S = { cell: cs, NX: NX, NZ: NZ, NY: NY, voxels: N, reachable: nReach, covered: nCov };
    S.at = function (x, y, z) {
      var i2 = Math.floor((x - X0) / cs), k3 = Math.floor((z - Z0) / cs);
      if (i2 < 0 || k3 < 0 || i2 >= NX || k3 >= NZ) return 0;
      var iy = Math.floor((y - yB) / chh);
      if (iy < 0) return 0;
      if (iy >= NY) iy = NY - 1;
      return val[iy * NXZ + k3 * NX + i2];
    };
    // (x, y, z) 가 지붕 아래인가(y 를 안 주면 바닥 + 1.5m): 아바타가 실내인지
    S.covered = function (x, z, y) {
      var i2 = Math.floor((x - X0) / cs), k3 = Math.floor((z - Z0) / cs);
      if (i2 < 0 || k3 < 0 || i2 >= NX || k3 >= NZ) return false;
      var iy = Math.max(0, Math.min(NY - 1, Math.floor(((y === undefined ? fy0 + 1.5 : y) - yB) / chh)));
      return covRaw(i2, k3, iy);
    };
    // 면 칸(넓히기 전): 기도 시점 쪽 고르기에 쓴다
    S.solid = function (x, y, z) {
      var i2 = Math.floor((x - X0) / cs), k3 = Math.floor((z - Z0) / cs), iy = Math.floor((y - yB) / chh);
      if (i2 < 0 || k3 < 0 || i2 >= NX || k3 >= NZ || iy < 0 || iy >= NY) return 0;
      return sol[iy * NXZ + k3 * NX + i2];
    };
    return S;
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

  // 가림 잘라내기(cutaway) 셰이더: 카메라(a)→아바타(b) 원뿔(반지름: 카메라 쪽 0.3R → 아바타 쪽 R) 안의 seeThru 조각을 지운다.
  // 칸(vSee): 255 가는 면 → uSeeK.x, 170 넓은 면(벽·윗벽·아치·천장) → uSeeK.y, 85 낮은 물체(의자) → uSeeK.z, 0(바닥 등) → 지우지 않음. uSeeK.w = R.
  // 세기 1 이면 원뿔 안쪽은 전부 지우고(구멍) 가장자리만 디더로 부드럽게, 0..1 사이는 디더 녹아내림(짧은 페이드: 투명 정렬·재질 전환 없음).
  // 균일값은 모든 재질이 같은 객체를 나눠 쓴다(매 프레임 숫자만 바꾼다 — 할당 0, 재컴파일 0, draw call 그대로). 재질은 복제하지 않고 onBeforeCompile 을 잇는다
  // (기존 onBeforeCompile·프로그램 캐시 키는 그대로 두고 '|see2' 를 덧붙여 다른 재질과 프로그램이 섞이지 않게). 합친 메시도 조각 단위라 덩어리째 사라지지 않는다.
  var SEE_V = 'attribute float seeThru;\nvarying float vSee;\nvarying vec3 vSeeW;\n';
  var SEE_F = 'uniform vec3 uSeeA;\nuniform vec3 uSeeB;\nuniform vec4 uSeeK;\nvarying float vSee;\nvarying vec3 vSeeW;\n';
  var SEE_MAIN = 'void main() {\n\tfloat sSel = vSee > 0.83 ? uSeeK.x : (vSee > 0.5 ? uSeeK.y : (vSee > 0.17 ? uSeeK.z : 0.0));\n\tif (sSel > 0.004) {\n' +
    '\t\tvec3 sAB = uSeeB - uSeeA; float sH = dot(vSeeW - uSeeA, sAB) / max(dot(sAB, sAB), 1e-4), sHc = clamp(sH, 0.0, 1.0);\n' +
    '\t\tfloat sD = length(vSeeW - uSeeA - sAB * sHc), sR = uSeeK.w * (0.3 + 0.7 * sHc);\n' +
    '\t\tfloat sF = (1.0 - smoothstep(sR * 0.72, sR, sD)) * smoothstep(-0.25, -0.02, sH) * (1.0 - smoothstep(0.94, 1.0, sH));\n' +
    '\t\tfloat sN = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));\n' +
    '\t\tif (sN < sF * sSel) discard;\n\t}\n';
  function patchSee(mat, U) {
    if (!mat || mat.userData.seePatched) return;
    mat.userData.seePatched = true;
    var prev = mat.onBeforeCompile, prevKey = '';
    try { prevKey = String(mat.customProgramCacheKey()); } catch (e) { prevKey = ''; }
    mat.onBeforeCompile = function (sh, r) {
      if (prev) prev.call(this, sh, r);
      if (sh.vertexShader.indexOf('#include <project_vertex>') < 0 || sh.fragmentShader.indexOf('void main() {') < 0) return;
      sh.uniforms.uSeeA = U.a; sh.uniforms.uSeeB = U.b; sh.uniforms.uSeeK = U.k;
      sh.vertexShader = SEE_V + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n\tvSee = seeThru;\n\tvSeeW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = SEE_F + sh.fragmentShader.replace('void main() {', SEE_MAIN);
    };
    mat.customProgramCacheKey = function () { return prevKey + '|see2'; };
    mat.needsUpdate = true;
  }
  var CLS_THIN = 255, CLS_WIDE = 170, CLS_LOW = 85;
  function attachSee(obj, meshes, triMesh, triI, thin, nt, THREE, triFlat, lowT) {
    var BA = THREE && THREE.BufferAttribute;
    if (!BA) return null;
    var U = { a: { value: new Float32Array(3) }, b: { value: new Float32Array(3) }, k: { value: new Float32Array([0, 0, 0, 1.2]) } };
    var arrs = new Array(meshes.length), mats = [], t, k;
    function mark(mi, i0, vv) {
      var m = meshes[mi], g = m.geometry, ix = g.index ? g.index.array : null;
      var A = arrs[mi] || (arrs[mi] = new Uint8Array(g.attributes.position.count));
      for (k = 0; k < 3; k++) { var vi = ix ? ix[i0 + k] : i0 + k; if (A[vi] < vv) A[vi] = vv; }
    }
    for (t = 0; t < nt; t++) mark(triMesh[t], triI[t], thin[t] ? CLS_THIN : (triFlat && triFlat[t] ? 0 : CLS_WIDE));
    if (lowT) for (t = 0; t + 1 < lowT.length; t += 2) mark(lowT[t], lowT[t + 1], CLS_LOW);
    for (var i = 0; i < meshes.length; i++) {
      if (!arrs[i]) continue;
      var mm = meshes[i], ml = Array.isArray(mm.material) ? mm.material : [mm.material], anyV = false;
      for (k = 0; k < arrs[i].length && !anyV; k++) if (arrs[i][k]) anyV = true;
      if (!anyV) { arrs[i] = null; continue; }
      mm.geometry.setAttribute('seeThru', new BA(arrs[i], 1, true));
      ml.forEach(function (x) { if (mats.indexOf(x) < 0) mats.push(x); });
    }
    obj.traverse(function (m) {   // 고친 재질을 쓰는데 seeThru 가 없는 메시(숨긴 것·바닥만 있는 것)에 0 값
      if (!m.isMesh || !m.geometry || !m.geometry.attributes || !m.geometry.attributes.position || m.geometry.attributes.seeThru) return;
      var ml = Array.isArray(m.material) ? m.material : [m.material];
      for (var j = 0; j < ml.length; j++) if (mats.indexOf(ml[j]) >= 0) { m.geometry.setAttribute('seeThru', new BA(new Uint8Array(m.geometry.attributes.position.count), 1, true)); break; }
    });
    mats.forEach(function (x) { patchSee(x, U); });
    // 카메라 위치(a)·아바타(b)·세기(가는 면 kt, 넓은 면 kw, 낮은 물체 kl: 0..1)·원뿔 반지름 r(아바타 쪽, m)을 한 번에(할당 0)
    U.set = function (ax, ay, az, bx, by, bz, kt, kw, kl, r) {
      var a = U.a.value, b = U.b.value, kk = U.k.value;
      a[0] = ax; a[1] = ay; a[2] = az; b[0] = bx; b[1] = by; b[2] = bz;
      kk[0] = kt || 0; kk[1] = kw || 0; kk[2] = kl || 0; if (r > 0) kk[3] = r;
    };
    U.materials = mats.length;
    return U;
  }

  // 카메라–머리 거리 → 아바타 불투명도(1.7m 이상 1, 0.7m 이하 MIN_ALPHA). 리그가 최소 거리(RIG.minD)를 지키고 그래도 안 되면 1인칭(아바타 숨김)으로
  // 가므로 보통은 쓰이지 않는다(사용자가 가깝게 당긴 앉은 시점 정도).
  var MIN_ALPHA = 0.35;
  function avatarAlpha(d) { var u = (d - 0.7) / 1.0; u = u < 0 ? 0 : u > 1 ? 1 : u; return MIN_ALPHA + (1 - MIN_ALPHA) * u * u * (3 - 2 * u); }

  // 기도 자리 시점(성모 기도 자리·제대 앞·14처 판·봉헌초 도착, 서서): 카메라는 자리 방향(yaw) 뒤에서 side 만큼 비켜
  // 낮게(pitch)·가깝게(zoom) 서고, 보는 점은 아바타 앞 fwd·위 up 으로 옮긴다 → 아바타는 화면 아래 한편, 목표물은 가운데~위.
  var SPOT = { side: 0.32, pitch: 0.2, zoom: 0.8, fwd: 2.4, up: 0.6 };
  // 앉기·무릎 꿇기(신자석·기도 자리): 앞옆 45°(뒤에서 135°, side)에서 조금 내려다보며(pitch) 몸을 본다 → 앉았는지 무릎 꿇었는지 보인다.
  // 쪽(±)은 prayYaw 가 트인 쪽으로 고른다. 사이를 가리는 의자 등받이·벽·기둥은 잘라낸다(main.js uSeeK.z).
  var PRAY = { side: 2.36, pitch: 0.32, zoom: 0.85, fwd: 0, up: -0.2 };
  // 섞음 f(0..1)로 실제 pitch·거리·보는 점 오프셋을 out 에 쓴다(할당 0). base = 줌 1 의 기본 거리(서기 7.2 / 앉기 4.4). P = SPOT(기본) | PRAY.
  function spotBlend(pitch, D, base, f, out, P) {
    P = P || SPOT;
    out.pitch = pitch + (P.pitch - pitch) * f;
    out.D = D + (base * P.zoom - D) * f;
    out.fwd = P.fwd * f; out.up = P.up * f;
    return out;
  }

  // ---- 3인칭 카메라 리그(게임 엔진식, docs/church/CAMERA.md) ----
  // 원칙(2026-11-15 2차, 사용자 제보: '벽이 보이지 않게', '막힌 곳에서 갑자기 커짐', '좁은 곳에서 머리가 화면 가득', '핀치로 멀어지지 않음'):
  //  - 목표 거리 D = 사용자가 정한 거리(설정 × 핀치). 사용자 입력이 언제나 이긴다: 리그는 D 에 가장 가까운 '설 수 있는 자리'를 찾을 뿐이다.
  //  - 설 수 있는 자리 = 카메라 공간 복셀(buildSpace): 실내에서 벽·기둥 면에서 0.4m 이상 떨어진 곳. 사이의 벽·기둥은 카메라를 당기지 않고 잘라낸다(cutaway).
  //    벽 속·기둥 속·바깥(문으로 곧게 보이는 곳 말고)은 안 된다 → 그때만 D 앞뒤로 가장 가까운 자리(피어 뒤로 밀려나기도 한다, push).
  //  - D 근처에 자리가 없으면 먼저 카메라를 올린다(pitchUp: 높은 3/4 → 거의 내려다보기), 낮은 천장이면 내린다(pitchDown), 그다음 좌우로 돈다(yawOff).
  //    비용 = |D − 얻은 거리| + 각도 바꿈 가중. 다른 시점으로는 비용이 switchK 넘게 나을 때만, 그 상태가 swT 동안 이어질 때만 바꾼다(히스테리시스).
  //  - 어떤 시점으로도 fpD 를 못 얻을 때만 1인칭(아바타 숨김), 자리가 나면(fpD + fpOutK, fpOutT 동안) 부드럽게 돌아온다.
  //  - 막히면 tauIn 으로(지금 자리가 벽 속이면 곧장 가장 가까운 자리로), 풀리면 holdT 버틴 뒤 tauOut·초당 outMax 로 사용자 거리까지 돌아간다.
  //  - auto=false('자동 줌' 끔): 거리·각도를 전혀 바꾸지 않는다(사이는 잘라낸다).
  var RIG = {
    minD: 2.8, fpD: 1.9, push: 1.4, step: 0.2, margin: 0.3, bridge: 0.8,
    pitchUp: [0.8, 1.05, 1.3, 1.42], pitchDown: [0.28, 0.12], yawOff: [0.45, -0.45, 0.9, -0.9, 1.35, -1.35, 1.8, -1.8],
    wUp: 1.0, wDown: 1.6, wYaw: 2.0, wYaw0: 1.0, switchK: 0.8, swT: 0.6, homeT: 1.5, slack: 0.6,
    holdT: 0.5, tauIn: 0.4, vMax: 1.9, tauOut: 0.8, outMax: 1.6, hyst: 0.3, ahead: 0.6, yawAhead: 1.0,
    liftFwd: 1.6, liftDep: 0.42, hMax: 4.6, wCap: 0.4, tauPitch: 0.45, tauYaw: 0.5, tauRush: 0.12, fpInT: 0.3, fpOutT: 0.8, fpOutK: 0.6, tauFp: 0.22
  };
  // Q = {sp, cb, g, mx, fy, mz, needCov}. 방향(ux,uy,uz) 으로 d 만큼 간 점(점 하나)에 카메라가 설 수 있나
  function okPt(Q, ux, uy, uz, d) {
    var x = Q.mx + ux * d, y = Q.fy + uy * d, z = Q.mz + uz * d, cb = Q.cb, m = RIG.margin;
    if (cb && (x < cb.x0 + m || x > cb.x1 - m || z < cb.z0 + m || z > cb.z1 - m || y > cb.yMax - m)) return false;
    if (!Q.sp) return true;
    var v = Q.sp.at(x, y, z);
    if (!v) return false;
    // 실내(지붕 아래) 아바타 → 지붕 밖 카메라: 열린 문으로 곧게 보일 때만(벽 너머 바깥 마당에 서지 않게)
    if (Q.needCov && !(v & 2) && Q.g && (Q.g.clip(Q.mx, Q.fy, Q.mz, x, y, z, 0) < 1 || Q.g.out.thin < 1)) return false;
    // 카메라 통로(걷는 곳 밖): 아바타와 사이에 벽 하나(두께 1.2m 이하)만 있을 때(성당 안쪽에서 두 벽 너머 통로로 가지 않게)
    if ((v & 4) && Q.g) {
      var t1 = Q.g.clip(Q.mx, Q.fy, Q.mz, x, y, z, 0);
      if (t1 < 1) { var t2 = Q.g.clip(x, y, z, Q.mx, Q.fy, Q.mz, 0); if ((1 - t2 - t1) * d > 1.2) return false; }
    }
    return true;
  }
  // 얇은 것(기둥·닫집 기둥·방 사이 벽, 팔 방향 두께 < 2·bridge) 속은 앞뒤가 모두 설 수 있으면 된다: 한 면짜리 재질이라 속에서는 보이지 않고,
  // 카메라 쪽 원뿔이 넓어 가까운 면은 잘린다. 기둥 하나를 지날 때마다 거리가 들락날락하지 않는다.
  function okBr(Q, ux, uy, uz, d) {
    if (okPt(Q, ux, uy, uz, d)) return true;
    var br = RIG.bridge;
    return d > br + 0.6 && okPt(Q, ux, uy, uz, d - br) && okPt(Q, ux, uy, uz, d + br);
  }
  var okAt = okPt;   // 머무는 자리(목표)는 늘 면 밖. 지나가는 중(보간·되돌아가기)만 okBr
  // yaw·pitch 방향에서 D 에 가장 가까운 설 수 있는 거리(lo..hi). pref < 0: 짧은 쪽을 먼저 다 본다(지금 피어 앞에 있으면 앞에 머문다),
  // pref > 0: 긴 쪽 먼저, 0: 번갈아(같으면 짧은 쪽). 없으면 0.
  function reachOn(Q, yaw, p, D, lo, hi, pref, mn) {
    var cp = Math.cos(p), ux = Math.sin(yaw) * cp, uy = Math.sin(p), uz = Math.cos(yaw) * cp, st = RIG.step, k, d;
    if (okAt(Q, ux, uy, uz, D)) return D;
    var lo2 = Math.max(lo, Math.min(D, mn || 0));   // 먼저 [mn, hi] 안에서(최소 거리 아래는 마지막에)
    if (pref) {
      for (k = 1; k < 400; k++) { d = D + pref * k * st; if (d < lo2 || d > hi) break; if (okAt(Q, ux, uy, uz, d)) return d; }
      for (k = 1; k < 400; k++) { d = D - pref * k * st; if (d < lo2 || d > hi) break; if (okAt(Q, ux, uy, uz, d)) return d; }
    } else {
      for (k = 1; k < 400; k++) {
        var dA = D - k * st, dB = D + k * st, any = false;
        if (dA >= lo2) { any = true; if (okAt(Q, ux, uy, uz, dA)) return dA; }
        if (dB <= hi) { any = true; if (okAt(Q, ux, uy, uz, dB)) return dB; }
        if (!any) break;
      }
    }
    for (d = Math.min(lo2, D) - st; d >= lo; d -= st) if (okAt(Q, ux, uy, uz, d)) return d;
    return 0;
  }
  function wrapA(a) { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; }

  function createRig() {
    var s = { d: -1, hold: 0, lastD: -1, pe: 0, yo: 0, oi: 0, cand: -1, candT: 0, fp: 0, fpWant: false, fpT: 0, py: 0, px: 0, pz: 0, pOk: false, peOk: false };
    var Q = { sp: null, cb: null, g: null, mx: 0, fy: 0, mz: 0, needCov: false }, QP = { sp: null, cb: null, g: null, mx: 0, fy: 0, mz: 0, needCov: false };
    var NP = 1 + RIG.pitchUp.length + RIG.pitchDown.length, NYw = 1 + RIG.yawOff.length;
    // 시점 번호 oi = pi * NYw + yi. pi 0 = 사용자 pitch, 1.. = 올림, 그다음 = 내림. yi 0 = 사용자 yaw, 1.. = 좌우로 돈 것.
    function optPitch(pi, user) {
      if (pi === 0) return user;
      if (pi <= RIG.pitchUp.length) { var u = RIG.pitchUp[pi - 1]; return u > user + 0.05 ? u : -1; }
      var dn = RIG.pitchDown[pi - 1 - RIG.pitchUp.length]; return dn < user - 0.05 ? dn : -1;
    }
    // 올린 시점의 목표 거리: 카메라가 아바타 가슴 위 hMax 보다 높이 날지 않게(사용자 거리·최소 거리 사이)
    function effD(pi, p, D) {
      if (pi < 1 || pi > RIG.pitchUp.length) return D;
      return Math.min(D, Math.max(curMin, RIG.hMax / Math.sin(p)));
    }
    function optYaw(yi) { return yi === 0 ? 0 : RIG.yawOff[yi - 1]; }
    var ev = { A: 0, c: 0 }, curMin = RIG.minD;
    function evalOpt(oi, I, yaw0, D) {
      var pi = (oi / NYw) | 0, yi = oi % NYw, p = optPitch(pi, I.pitch);
      if (p < 0) { ev.A = 0; ev.c = 1e9; return ev; }
      var De = effD(pi, p, D), A = reachOn(Q, yaw0 + optYaw(yi), p, De, 0.4, De + RIG.push, 0, curMin), dp = p - I.pitch;
      ev.A = A;
      // 좌우로 돌기 비용: 지금 돈 만큼에서 얼마나 더 도나(크게 휘돌지 않게) + 사용자 방향에서 얼마나 벗어나나(조금)
      // 올린 시점은 높이 hMax 까지만(그만큼 가까워진 것은 조금만 친다: 위에서 보면 가까워도 몸 전체와 길이 보인다)
      ev.c = Math.abs(De - A) + RIG.wCap * (D - De) + (dp > 0 ? RIG.wUp * dp : -RIG.wDown * dp) + RIG.wYaw * Math.abs(wrapA(optYaw(yi) - s.yo)) + RIG.wYaw0 * Math.abs(optYaw(yi)) + (A < RIG.fpD ? 100 : 0);
      return ev;
    }
    // I: {mx,fy,mz, yaw,pitch, D(목표 거리), cb, guard, auto, minD}. O 에 {x,y,z, pitch, dist, lift, fwd, yaw, fp, opt} 를 쓴다(할당 0).
    s.solve = function (I, dt, O) {
      var D = I.D, auto = I.auto !== false, yaw0 = I.yaw, sp = auto && I.guard ? I.guard.space || null : null;
      // 걷는 곳이 카메라 상자 밖이면(익랑 끝) 상자 없이 공간 격자만
      var cb0 = I.cb, inCb = cb0 && I.mx >= cb0.x0 && I.mx <= cb0.x1 && I.mz >= cb0.z0 && I.mz <= cb0.z1;
      Q.sp = sp; Q.cb = auto && (inCb || !sp) ? cb0 : null;
      Q.g = I.guard || null; Q.mx = I.mx; Q.fy = I.fy; Q.mz = I.mz; Q.needCov = !!(sp && sp.covered(I.mx, I.mz, I.fy));
      var minD = Math.min(D, I.minD || RIG.minD), tp = I.pitch, ty = 0, fpWant = false, i;
      curMin = minD;
      if (auto) {
        // 지금 시점과 가장 좋은 시점(각도만 → 그래도 모자라면 좌우로 돌기)
        var cur = evalOpt(s.oi, I, yaw0, D), cC = cur.c, cA = cur.A, best = s.oi, bC = cC, bA = cA;
        // 각도(올리기·내리기)는 사용자 거리에 못 미치면 늘 따져 보고, 좌우로 돌기는 그래도 max(minD, 0.6D) 를 못 얻을 때만
        if (s.oi !== 0 || cA < D - RIG.hyst) {
          for (var pass = 0; pass < 2; pass++) {
            for (i = 0; i < NP * NYw; i++) {
              if (i === s.oi || (pass === 0) !== (i % NYw === 0)) continue;
              var e = evalOpt(i, I, yaw0, D);
              if (e.c < bC) { bC = e.c; best = i; bA = e.A; }
            }
            if (bA >= Math.max(minD, D * 0.6) && (s.oi % NYw) === 0) break;
          }
        }
        // 사용자 시점(0)이 다시 사용자 거리를 얻으면 비용 차이가 작아도 돌아간다(올린 채로 머물지 않게) — swT 동안 이어질 때
        var forced = cA < RIG.fpD, home = best === 0 && bA >= D - RIG.hyst;
        if (best !== s.oi && (forced || home || bC < cC - RIG.switchK)) {
          if (forced) { s.oi = best; s.cand = -1; s.candT = 0; }
          else {
            if (s.cand === best) s.candT += dt; else { s.cand = best; s.candT = dt; }
            if (s.candT >= (home ? RIG.homeT : RIG.swT) || s.d < 0) { s.oi = best; s.cand = -1; s.candT = 0; }
          }
        } else { s.cand = -1; s.candT = 0; }
        var oA = s.oi === best ? bA : cA;
        tp = optPitch((s.oi / NYw) | 0, I.pitch); if (tp < 0) { s.oi = 0; tp = I.pitch; }
        ty = optYaw(s.oi % NYw);
        // 1인칭: 어떤 시점으로도 fpD 를 못 얻는다(fpInT 이어지면). 돌아오기: fpD + fpOutK 를 fpOutT 동안 얻으면.
        var avail = Math.max(oA, bA);
        if (!s.fpWant) { if (avail < RIG.fpD) { s.fpT += dt; if (s.fpT >= RIG.fpInT || s.d < 0 || avail < 0.4) { s.fpWant = true; s.fpT = 0; } } else s.fpT = 0; }
        else if (avail >= RIG.fpD + RIG.fpOutK) { s.fpT += dt; if (s.fpT >= RIG.fpOutT) { s.fpWant = false; s.fpT = 0; } } else s.fpT = 0;
        fpWant = s.fpWant;
      } else { s.oi = 0; s.fpWant = false; s.fpT = 0; }
      // 각도는 부드럽게(올리기 tauPitch, 돌기 tauYaw — 처음이면 바로)
      if (!s.peOk || s.d < 0) { s.pe = tp; s.yo = ty; s.peOk = true; }
      // 지금 각도로는 최소 거리도 못 얻으면(막혀서 바꾸는 중) 빨리 돈다 — 그 사이 카메라가 머리에 붙지 않게
      var De = auto ? effD((s.oi / NYw) | 0, tp, D) : D;   // 지금 시점의 목표 거리(올렸으면 높이 hMax 까지)
      var cut = false, turning = Math.abs(tp - s.pe) > 0.02 || Math.abs(wrapA(ty - s.yo)) > 0.02;
      var rush = auto && sp && turning && reachOn(Q, yaw0 + s.yo, s.pe, De, 0.4, De + RIG.push, -1, minD) < minD;
      s.pe += (tp - s.pe) * (1 - Math.exp(-dt / (rush ? RIG.tauRush : RIG.tauPitch)));
      s.yo += wrapA(ty - s.yo) * (1 - Math.exp(-dt / (rush ? RIG.tauRush : RIG.tauYaw)));
      // 돌아가는 길(중간 각도)이 벽으로 막혀 머리에 붙게 되면 휘돌지 않고 바로 새 시점으로 끊는다(게임의 카메라 컷)
      if (rush && reachOn(Q, yaw0 + s.yo, s.pe, De, 0.4, De + RIG.push, -1, minD) < minD && reachOn(Q, yaw0 + ty, tp, De, 0.4, De + RIG.push, 0, minD) >= minD) { s.pe = tp; s.yo = ty; s.d = -2; cut = true; }
      var yaw = yaw0 + s.yo, pe = s.pe;
      // 지금 각도에서 D 에 가장 가까운 자리(+ 미리 보기: ahead 초 뒤의 피벗·방향에서 곧 막히면 미리 천천히 줄인다)
      var pref = s.d < 0 ? 0 : (s.d < De - 0.1 ? -1 : (s.d > De + 0.1 ? 1 : 0));   // 지금 있는 쪽(피어 앞/뒤)에 머문다
      var tg = auto ? reachOn(Q, yaw, pe, De, 0.4, De + RIG.push, pref, minD) : D;
      if (auto && tg < 0.4) tg = s.d > 0 ? s.d : Math.min(D, RIG.fpD);
      if (auto && sp && s.pOk && dt > 1e-4) {
        var wy = wrapA(yaw - s.py), k = RIG.ahead / dt, yP = yaw + Math.max(-RIG.yawAhead, Math.min(RIG.yawAhead, wy * k));
        QP.sp = sp; QP.cb = Q.cb; QP.g = Q.g; QP.fy = I.fy; QP.needCov = Q.needCov;
        QP.mx = I.mx + Math.max(-1, Math.min(1, (I.mx - s.px) * k)); QP.mz = I.mz + Math.max(-1, Math.min(1, (I.mz - s.pz) * k));
        var Ap = reachOn(QP, yP, pe, De, 0.4, De + RIG.push, pref, minD);
        if (Ap >= Math.max(RIG.fpD, minD) && Ap < tg) tg = Ap;
      }
      s.py = yaw; s.px = I.mx; s.pz = I.mz; s.pOk = true;
      var cp = Math.cos(pe), ux = Math.sin(yaw) * cp, uy = Math.sin(pe), uz = Math.cos(yaw) * cp;
      var d0 = s.d, free = s.d < 0 || Math.abs(D - s.lastD) > 1e-3;
      var inv = !free && auto && sp && !okBr(Q, ux, uy, uz, s.d);
      if (free) {
        // 처음이거나 사용자가 거리를 바꿨다(핀치·설정·앉기): 그대로 따른다(사용자가 바꾼 것은 바로 보인다)
        if (s.d < 0 || tg < s.d || s.lastD < 0) s.d = tg; else s.d = Math.min(tg, s.d + (D - s.lastD));
        s.hold = RIG.holdT;
      } else if (inv) {
        // 지금 자리가 설 수 없는 곳(막혀 들어오는 중·각도 보간 중·피어 앞뒤로 옮기는 중): 버티지 않고 목표 쪽 가장 가까운 설 수 있는 곳으로.
        // 초당 vMax 로 가되, 벽 여유(slack)보다 깊이 들어가 있으면 그 경계까지는 곧장(면에 붙거나 속에 머물지 않게)
        var dir = tg > s.d ? 1 : -1, found = tg;
        for (var dd = s.d; dir > 0 ? dd <= tg : dd >= tg; dd += dir * RIG.step) if (okAt(Q, ux, uy, uz, dd)) { found = dd; break; }
        var gap = Math.abs(found - s.d), mv = Math.min(gap, Math.max(RIG.vMax * dt, gap - RIG.slack));
        s.d += dir * mv; s.hold = 0;
      } else if (tg < s.d) {
        s.d += (tg - s.d) * (1 - Math.exp(-dt / RIG.tauIn));
        s.hold = RIG.holdT;
      } else if (tg > s.d + RIG.hyst) {
        if (s.hold > 0) s.hold -= dt; else s.d += Math.min((tg - s.d) * (1 - Math.exp(-dt / RIG.tauOut)), RIG.outMax * dt);
      } else if (tg > s.d) s.d = tg;
      // 거리는 초당 vMax 넘게 바꾸지 않는다(자동 줌이 튀지 않게, 위의 '설 수 없는 곳' 경우 말고)
      if (!free && !inv) { var lim = RIG.vMax * dt; if (s.d > d0 + lim) s.d = d0 + lim; else if (s.d < d0 - lim) s.d = d0 - lim; }
      s.lastD = D;
      s.fp += ((fpWant ? 1 : 0) - s.fp) * (1 - Math.exp(-dt / RIG.tauFp));
      if (s.fp < 1e-3) s.fp = 0; else if (s.fp > 0.999) s.fp = 1;
      O.x = I.mx + ux * s.d; O.y = I.fy + uy * s.d; O.z = I.mz + uz * s.d;
      var lift = pe > I.pitch + 1e-3 ? Math.min(1, (pe - I.pitch) / 0.6) : 0;
      // 올렸으면 앞을 본다: 아바타가 화면 가운데에서 약 24° 아래(화면 아래쪽)에 오도록 보는 점을 앞으로(가는 길이 보이게)
      var hh = uy * s.d, hz = cp * s.d, dep = Math.max(0.6, Math.atan2(hh, hz) - RIG.liftDep), fg = hh / Math.tan(dep) - hz;
      O.pitch = pe; O.dist = s.d; O.lift = lift; O.fwd = lift * Math.max(RIG.liftFwd, Math.min(6, fg)); O.yaw = yaw; O.fp = s.fp; O.fpOn = s.fpWant; O.opt = s.oi; O.cut = cut;
      return O;
    };
    // 지금 피벗 기준으로 (x,y,z) 에 카메라가 설 수 있나(main.js 안전망: 부드럽게 따라가는 위치가 벽 속이면 목표로)
    s.ok = function (x, y, z) {
      if (!Q.sp) return true;
      var ex = x - Q.mx, ey = y - Q.fy, ez = z - Q.mz, d = Math.sqrt(ex * ex + ey * ey + ez * ez);
      if (d < 1e-3) return false;
      return okBr(Q, ex / d, ey / d, ez / d, d);
    };
    s.reset = function () { s.d = -1; s.hold = 0; s.lastD = -1; s.pOk = false; s.peOk = false; s.yo = 0; s.oi = 0; s.cand = -1; s.candT = 0; s.fp = 0; s.fpWant = false; s.fpT = 0; };
    return s;
  }

  // 기도(앉기·무릎) 시점의 쪽: 앞옆 45° 두 쪽(seatYaw ± PRAY.side) 중 D 에 가까이 설 수 있고 사이에 면이 적은 쪽.
  function prayYaw(guard, cb, mx, fy, mz, seatYaw, D, pitch) {
    var sp = guard && guard.space, best = seatYaw + PRAY.side, bs = 1e9;
    var Q = { sp: sp || null, cb: cb || null, g: guard || null, mx: mx, fy: fy, mz: mz, needCov: !!(sp && sp.covered(mx, mz, fy)) };
    for (var k = 0; k < 2; k++) {
      var yaw = seatYaw + (k ? -1 : 1) * PRAY.side, A = reachOn(Q, yaw, pitch, D, 0.4, D + RIG.push, 0, RIG.minD), n = 0;
      var cp = Math.cos(pitch), ux = Math.sin(yaw) * cp, uy = Math.sin(pitch), uz = Math.cos(yaw) * cp;
      if (sp) for (var d = 0.6; d < Math.max(A, 0.6); d += 0.25) n += sp.solid(mx + ux * d, fy + uy * d, mz + uz * d);
      var sc = Math.abs(D - A) + 0.3 * n + (A < RIG.fpD ? 50 : 0);
      if (sc < bs - 0.05) { bs = sc; best = yaw; }
    }
    return wrapA(best);
  }

  // world.js·시험이 같은 방식으로 넘기는 build 선택(o.walk·o.floorY·o.floorTop): logic = ChurchLogic.create(...), layout.bounds 밖(카메라 상자 안)은 2.
  function spaceOpts(logic, layout, zones) {
    var B = layout.bounds, p = { x: 0, z: 0 }, ft = 0;
    (zones || []).forEach(function (z) { if (z.y > ft) ft = z.y; });
    return {
      floorTop: ft, floorY: logic.floorY, region: B,
      walk: function (x, z) {
        if (x < B.x0 || x > B.x1 || z < B.z0 || z > B.z1) return 2;
        p.x = x; p.z = z; return logic.moveCircle(p, 0, 0) ? 0 : 1;
      }
    };
  }

  var api = { build: build, classifyThin: classifyThin, patchSee: patchSee, avatarAlpha: avatarAlpha, MIN_ALPHA: MIN_ALPHA, SPOT: SPOT, PRAY: PRAY, spotBlend: spotBlend, RIG: RIG, createRig: createRig, reachOn: reachOn, prayYaw: prayYaw, spaceOpts: spaceOpts };
  root.ChurchCamGuard = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : this);
