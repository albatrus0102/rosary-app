// 성당 카메라 가림 잘라내기(cutaway, docs/church/CAMERA_MODES.md §잘라내기). 2026-11-23 3차(사용자 결정):
// 「그냥 뷰를 벽을 개의치 않고 보여주면 안 되나? 촬영하는 쪽에 벽이 있는지 없는지는 사실 의미 없잖아. 보여지는 쪽만 충실하면 될 거 같은데」
// → 카메라는 벽을 개의치 않는다(충돌·당기기·자동 1인칭 없음 — main.js 가 사용자 각도·거리 그대로 둔다). 대신 카메라 쪽의 가림물을 지운다:
//   ① 원뿔: 카메라 → 아바타 사이(가는 면·넓은 면, 앉으면 낮은 물체도) ② 카메라 둘레(nearR) ③ 인형집 단면(dollhouse): 카메라가 아바타 방 밖이면
//   아바타에게 가장 가까운 카메라 쪽 벽 면을 지나는 세로 평면보다 카메라 쪽의 벽·기둥 전부 ④ 위층: 카메라가 아바타 층 위 층 바닥 높이 가까이 오르면
//   그 층(바닥 판·아래층 천장 포함)을 카메라 쪽(아바타 앞 먼 평면까지)에서 전부.
// 성당 메시(벽·천장·기둥·창)의 삼각형을 한 번 모아 xz 격자에 넣고(clip: 선분이 처음 닿는 곳 — 가림 판정·단면 자리), 메시마다 꼭짓점 칸 값(seeThru)·
// 층 높이(seeLvl)를 단다. 셰이더(patchSee)는 균일값만 바꾸고 조각 단위로 지운다(합친 메시도 조각 단위 — draw call·재컴파일 0, 추가 그리기 패스 없음).
// 빼는 것: 가산 혼합(빛줄기), 점·선·스프라이트·인스턴스(촛불), 숨긴 메시, 아주 작은 면(<0.005㎡). 낮은 물체(maxY < yLow: 의자)는 clip 이 막지 않는다.
// 매 프레임 할당 없음(형식 배열 + 도장 배열). 가는 면(classifyThin: 홀로 선 기둥·피어·성상)은 clip 이 막지 않고 out.thin 으로 알린다.
(function (root) {
  'use strict';

  function build(obj, o) {
    o = o || {};
    var cell = o.cell || 1.5, minArea = o.minArea === undefined ? 0.005 : o.minArea;
    var yLow = o.yLow === undefined ? -1e9 : o.yLow, b = o.bounds || null, pad = 3, R = o.region;
    // 카메라 상자(bounds)보다 걷는 곳(region = layout.bounds)이 넓으면(명동·라테라노 익랑) 둘을 합친 곳의 면을 모은다
    if (b && R) b = { x0: Math.min(b.x0, R.x0), x1: Math.max(b.x1, R.x1), z0: Math.min(b.z0, R.z0), z1: Math.max(b.z1, R.z1), yMax: b.yMax };
    var bx0 = b ? b.x0 - pad : -1e9, bx1 = b ? b.x1 + pad : 1e9, bz0 = b ? b.z0 - pad : -1e9, bz1 = b ? b.z1 + pad : 1e9;
    var tris = [], triMesh = [], triI = [], triFlat = [], lowT = [], glowT = [], meshes = [], triBase = [];
    // 여러 층(o.levelBase(x,z,y) → 그 삼각형이 놓인 층의 바닥): 바닥 판·낮은 물체·가는 면 판정의 기준 높이와 꼭짓점 층 값(seeLvl)을 삼각형마다 그 층 바닥으로.
    // 없으면(한 층 성당) 예전처럼 하나(fy0 = 스폰 바닥).
    var LB = o.levelBase || null;
    // 바닥(위를 보는 거의 수평 면, 걷는 바닥 높이 + 0.35m 아래)은 원뿔·단면으로 지우지 않는다(위층 잘라내기만). floorTop = 가장 높은 바닥 구역(제단 단 등).
    var hasLow = o.yLow !== undefined, fy0 = hasLow ? o.yLow - 1.05 : 0, floorTop = o.floorTop === undefined ? fy0 : Math.max(fy0, o.floorTop);
    obj.updateMatrixWorld(true);
    obj.traverseVisible(function (m) {
      if (!m.isMesh || m.isInstancedMesh || m.isSkinnedMesh || (m.userData && m.userData.noCam)) return;
      var mat = Array.isArray(m.material) ? m.material[0] : m.material;
      if (!mat) return;   // 투명 유리 판은 막는다(창 너머가 가림 판정에 든다)
      var addv = mat.blending === 2;   // 가산 혼합(빛줄기·등 빛 원판): 가림 판정에는 넣지 않고 지우기만(위층을 지울 때 천장 등이 떠 있지 않게)
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
        var mnx = Math.min(v[0], v[3], v[6]), mxx = Math.max(v[0], v[3], v[6]), mnz = Math.min(v[2], v[5], v[8]), mxz = Math.max(v[2], v[5], v[8]);
        var lb = LB ? LB((mnx + mxx) * 0.5, (mnz + mxz) * 0.5, Math.min(v[1], v[4], v[7])) : fy0;
        if (!(lb > -1e8)) lb = fy0;
        if (addv) { if (mxY > lb + 0.3) glowT.push(mi, i, lb - fy0, 1); continue; }   // 바닥에 깔린 빛 웅덩이는 그대로(아바타 둘레 빛이 사라지지 않게)
        // 바닥 높이의 것(바닥 판·깔개·장식 띠)은 뺀다. 여러 층에서 맨 아래층보다 높은 층의 바닥 판은 아래층의 천장이자 층 사이 칸막이라 남긴다
        if (hasLow && mxY < lb + 0.12 && !(LB && lb > fy0 + 0.12)) continue;
        if (mxx < bx0 || mnx > bx1 || mxz < bz0 || mnz > bz1) continue;
        var ax = v[3] - v[0], ay = v[4] - v[1], az = v[5] - v[2], cx = v[6] - v[0], cy = v[7] - v[1], cz = v[8] - v[2];
        var nx = ay * cz - az * cy, ny = az * cx - ax * cz, nz = ax * cy - ay * cx, nl = Math.sqrt(nx * nx + ny * ny + nz * nz);
        if (nl * 0.5 < minArea) { glowT.push(mi, i, lb - fy0, 0); continue; }   // 아주 작은 면(벽 등·까치발·장식): 가림 판정엔 빼고 지우기만(벽을 지울 때 떠 있지 않게)
        // 바닥: 거의 수평이고 그 자리 바닥 높이(floorY, 제단 단·성단 포함) 근처. 의자 좌석판 같은 높은 수평면은 바닥이 아니다
        var flat = 0;
        if (Math.abs(ny) > 0.8 * nl && mxY < (LB ? lb + 0.35 : floorTop + 0.35)) {
          var fyAt = LB ? lb : (o.floorY ? (o.floorY((mnx + mxx) * 0.5, (mnz + mxz) * 0.5) || 0) : floorTop);
          flat = mxY < fyAt + 0.2 || mxY < lb + 0.25 ? 1 : 0;
        }
        // 낮은 물체(의자·무릎틀·난간): 가림 판정에 넣지 않는다(카메라는 그 위에서 본다). 기도 자세에서 가리면 지운다(seeThru 85).
        if (mxY < (LB ? lb + (yLow - fy0) : yLow)) {
          if (!flat) lowT.push(mi, i, lb - fy0);
          if (!(LB && flat && lb > fy0 + 0.12)) continue;   // 여러 층: 위층 바닥 판은 낮은 물체가 아니라 층 사이 칸막이(아래층 천장) — 면으로 남긴다
        }
        tris.push(v[0], v[1], v[2], ax, ay, az, cx, cy, cz); triMesh.push(mi); triI.push(i); triFlat.push(flat); triBase.push(lb - fy0);
      }
    });
    var nt = tris.length / 9, T9 = new Float32Array(tris), TB = new Float32Array(triBase);
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
    var thin = classifyThin(T9, nt, o.thinMax === undefined ? 4.4 : o.thinMax, fy0 + 0.35, fy0 + 2.8, LB ? TB : null);
    var nThin = 0; for (t = 0; t < nt; t++) nThin += thin[t];
    var out = { thin: 1, tri: -1, wideTri: -1 };   // 마지막 clip: 처음 닿은 '가는' 면의 비율(0..1, 없으면 1)·처음 닿은 삼각형(가는 면 포함)·막은 넓은 면 삼각형

    // 선분 A→B 가 처음 닿는 비율(0..1, 안 닿으면 1)에서 margin(m)만큼 앞. 머리 바로 앞(<0.15m)은 무시(아바타가 기댄 벽은 머리 뒤).
    // skip(t, th)(선택): true 면 그 삼각형은 없는 것으로 본다(이미 잘라낸 면 — 위층·단면). th = 선분 위 비율
    function clip(ax, ay, az, bx, by, bz, margin, skip) {
      var dx = bx - ax, dy = by - ay, dz = bz - az, len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      out.tri = -1; out.wideTri = -1;
      if (len < 1e-4 || !nt) { out.thin = 1; return 1; }
      var bestThin = 1, pass = o.thinPass !== false, bestAny = 1;
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
            if (th > tMin && th < best) {
              if (skip && skip(tr, th)) continue;
              if (th < bestAny) { bestAny = th; out.tri = tr; }
              if (pass && thin[tr]) { if (th < bestThin) bestThin = th; } else { best = th; out.wideTri = tr; }
            }
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
    // 벽 조각 사이 틈으로 빠져나가지 않게 끝을 좌우 ±w 로 벌린 선 2개를 더 쏜다(가림 판정은 가운데 선만)
    function clipWide(ax, ay, az, bx, by, bz, margin, w) {
      var t = clip(ax, ay, az, bx, by, bz, margin), dx = bx - ax, dz = bz - az, h = Math.sqrt(dx * dx + dz * dz), th0 = out.thin;
      if (h < 1e-3) return t;
      var ox = -dz / h * (w || 0.3), oz = dx / h * (w || 0.3);
      t = Math.min(t, clip(ax, ay, az, bx + ox, by, bz + oz, margin), clip(ax, ay, az, bx - ox, by, bz - oz, margin));
      out.thin = th0;
      return t;
    }
    // 여러 층(o.levelYs = 맨 아래층 말고 층 바닥 높이들, 절대 높이): 위층 잘라내기의 층 표
    var lvAbs = o.levelYs && o.levelYs.length ? o.levelYs.slice().sort(function (p1, p2) { return p1 - p2; }) : null;
    var api = { clip: clip, clipWide: clipWide, out: out, triangles: nt, thinTriangles: nThin, lowTriangles: lowT.length / 3, cells: NX * NZ, see: null, fy0: fy0, levelYs: lvAbs };
    api.isThin = function (t) { return thin[t] === 1; };
    api.isFlat = function (t) { return triFlat[t] === 1; };
    // 삼각형 t 가 놓인 층의 바닥 높이(절대, 한 층은 fy0)
    api.levelOf = function (t) { return fy0 + TB[t]; };
    // 삼각형 t 의 꼭짓점 하나(시험·가림 계산: 칸 위치)
    api.triPoint = function (t, o3) { var q = t * 9; o3.x = T9[q]; o3.y = T9[q + 1]; o3.z = T9[q + 2]; return o3; };
    // 메시마다 seeThru(Uint8, 정규화) 꼭짓점 값: 255 가는 면(기둥·성상), 170 넓은 면(벽·아치·천장·윗벽), 85 낮은 물체(의자), 42 바닥(위층 잘라내기만), 0 표시 없음.
    // seeLvl(Uint8, 정규화) = (그 층 바닥 − fy0) / 0.25m. 그 재질을 쓰는 다른 메시에도 0 값을 달아 둔다(빈 속성 슬롯이 엉뚱한 값으로 읽히지 않게).
    if (o.see !== false && nt) api.see = attachSee(obj, meshes, triMesh, triI, thin, nt, o.THREE || root.THREE, triFlat, lowT, TB, glowT);
    return api;
  }

  // 가는 면 판정: 몸 높이 띠(yB0..yB1)에 걸친 삼각형의 xz 그림자를 0.2m 칸에 찍고, 찍힌 칸을 8방향으로 이어 덩어리를 만든다.
  // 덩어리 xz 상자의 두 변이 모두 thinMax 이하이면 가는 덩어리(홀로 선 기둥·성상·제대 앞 난간 기둥). 벽은 띠 안에서 길게 이어져 넓다.
  // 삼각형은 그림자가 덮는 칸이 모두 가는 덩어리 위일 때 가늘다(띠 위로 이어지는 기둥 윗부분 포함, 기둥 사이를 덮는 아치·벽은 빈 칸에 걸쳐 넓다).
  // off(선택, 여러 층): 삼각형마다 몸 높이 띠를 그 층 바닥만큼 올린다
  function classifyThin(T9, nt, thinMax, yB0, yB1, off) {
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
    for (t = 0; t < nt; t++) { var r = yr(t), oo = off ? off[t] : 0; if (r[1] >= yB0 + oo && r[0] <= yB1 + oo) { band[t] = 1; raster(t, function (c2) { occ[c2] = 1; }); } }
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

  // ---- 잘라내기 셰이더(조각 단위, 균일값 공유) ----
  // 칸(vSee): 255 가는 면 → uSeeK.x, 212 가산 혼합 빛(빛줄기 판·등빛) → 3인칭이면 늘(uSeeQ.y — 카메라와 아바타 사이 빛 판이 아바타를 하얗게 덮지 않게),
  // 170 넓은 면(벽·윗벽·아치·천장) → uSeeK.y, 85 낮은 물체(의자) → uSeeK.z, 42 바닥(위층 잘라내기만), 0 표시 없음.
  //  ① 원뿔: 카메라(uSeeA) → 아바타(uSeeB), 반지름 카메라 쪽 0.3R → 아바타 쪽 R(uSeeK.w). 바닥 칸도 머리 위(uSeeQ.w = 발 + headClear)면 — 겹친 계단의 위 계단 디딤 등
  //  ② 카메라 둘레: 반지름 uSeeQ.x 안, 세기 uSeeQ.y(가는·넓은·낮은)
  //  ③ 인형집 단면: 아바타에서 카메라 쪽 수평 거리 sS 가 uSeeP.x 보다 큰 가는·넓은 면·낮은 물체(방 밖 가구가 반쯤 떠 있지 않게), 세기 uSeeP.y
  //  ④ 위층: 층 값(vSeeL × 63.75 = 그 층 바닥 − fy0, m) ≥ uSeeQ.z 이고 아바타 앞 먼 평면(−uSeeP.z)보다 카메라 쪽, 세기 uSeeP.w(모든 칸)
  // 세기 1 이면 구역 안 전부(구멍), 0..1 은 디더 녹아내림(짧은 페이드 — 투명 정렬·재질 전환 없음). 균일값은 모든 재질이 같은 객체를 나눠 쓴다
  // (매 프레임 숫자만 — 할당 0, 재컴파일 0, draw call 그대로). 재질은 복제하지 않고 onBeforeCompile 을 잇는다(프로그램 캐시 키에 '|see3').
  var SEE_V = 'attribute float seeThru;\nattribute float seeLvl;\nvarying float vSee;\nvarying float vSeeL;\nvarying vec3 vSeeW;\n';
  var SEE_F = 'uniform vec3 uSeeA;\nuniform vec3 uSeeB;\nuniform vec4 uSeeK;\nuniform vec4 uSeeP;\nuniform vec4 uSeeQ;\nvarying float vSee;\nvarying float vSeeL;\nvarying vec3 vSeeW;\n';
  var SEE_MAIN = 'void main() {\n\tif (vSee > 0.08 && uSeeK.x + uSeeK.y + uSeeK.z + uSeeP.y + uSeeP.w + uSeeQ.y > 0.004) {\n\t\tfloat sF = 0.0;\n' +
    '\t\tif (vSee > 0.25 || vSeeW.y > uSeeQ.w) {\n' +
    '\t\t\tfloat sSel = vSee > 0.92 ? uSeeK.x : (vSee > 0.75 ? uSeeQ.y : (vSee > 0.5 || vSee < 0.25 ? uSeeK.y : uSeeK.z));\n' +
    '\t\t\tvec3 sAB = uSeeB - uSeeA; float sH = dot(vSeeW - uSeeA, sAB) / max(dot(sAB, sAB), 1e-4), sHc = clamp(sH, 0.0, 1.0);\n' +
    '\t\t\tfloat sD = length(vSeeW - uSeeA - sAB * sHc), sR = uSeeK.w * (0.3 + 0.7 * sHc);\n' +
    '\t\t\tsF = (1.0 - smoothstep(sR * 0.72, sR, sD)) * smoothstep(-0.25, -0.02, sH) * (1.0 - smoothstep(0.94, 1.0, sH)) * sSel;\n' +
    '\t\t\tsF = max(sF, (1.0 - smoothstep(uSeeQ.x * 0.6, uSeeQ.x, length(vSeeW - uSeeA))) * uSeeQ.y);\n\t\t}\n' +
    '\t\tvec2 sNv = uSeeA.xz - uSeeB.xz; float sNl = length(sNv); sNv = sNl > 0.001 ? sNv / sNl : vec2(0.0, 1.0);\n' +
    '\t\tfloat sS = dot(vSeeW.xz - uSeeB.xz, sNv);\n' +
    '\t\tif (vSee > 0.25) sF = max(sF, smoothstep(uSeeP.x - 0.05, uSeeP.x + 0.3, sS) * uSeeP.y);\n' +
    '\t\tif (vSeeL * 63.75 > uSeeQ.z - 0.13) sF = max(sF, step(-uSeeP.z, sS) * uSeeP.w);\n' +
    '\t\tfloat sN = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));\n' +
    '\t\tif (sN < sF) discard;\n\t}\n';
  function patchSee(mat, U) {
    if (!mat || mat.userData.seePatched) return;
    mat.userData.seePatched = true;
    var prev = mat.onBeforeCompile, prevKey = '';
    try { prevKey = String(mat.customProgramCacheKey()); } catch (e) { prevKey = ''; }
    mat.onBeforeCompile = function (sh, r) {
      if (prev) prev.call(this, sh, r);
      if (sh.vertexShader.indexOf('#include <project_vertex>') < 0 || sh.fragmentShader.indexOf('void main() {') < 0) return;
      sh.uniforms.uSeeA = U.a; sh.uniforms.uSeeB = U.b; sh.uniforms.uSeeK = U.k; sh.uniforms.uSeeP = U.p; sh.uniforms.uSeeQ = U.q;
      sh.vertexShader = SEE_V + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n\tvSee = seeThru;\n\tvSeeL = seeLvl;\n\tvSeeW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = SEE_F + sh.fragmentShader.replace('void main() {', SEE_MAIN);
    };
    mat.customProgramCacheKey = function () { return prevKey + '|see3'; };
    mat.needsUpdate = true;
  }
  var CLS_THIN = 255, CLS_GLOW = 212, CLS_WIDE = 170, CLS_LOW = 85, CLS_FLOOR = 42, LVL_STEP = 0.25;
  function lvlByte(rel) { var v = Math.round((rel > 0 ? rel : 0) / LVL_STEP); return v > 255 ? 255 : v; }
  function attachSee(obj, meshes, triMesh, triI, thin, nt, THREE, triFlat, lowT, TB, glowT) {
    var BA = THREE && THREE.BufferAttribute;
    if (!BA) return null;
    var U = { a: { value: new Float32Array(3) }, b: { value: new Float32Array(3) }, k: { value: new Float32Array([0, 0, 0, 1.2]) },
      p: { value: new Float32Array([0, 0, 10, 0]) }, q: { value: new Float32Array([0.7, 0, 1e4, 1e4]) } };
    var arrs = new Array(meshes.length), lvls = new Array(meshes.length), mats = [], t, k;
    function mark(mi, i0, vv, lv) {
      var m = meshes[mi], g = m.geometry, ix = g.index ? g.index.array : null, n = g.attributes.position.count;
      var A = arrs[mi] || (arrs[mi] = new Uint8Array(n)), L = lvls[mi] || (lvls[mi] = new Uint8Array(n));
      for (k = 0; k < 3; k++) { var vi = ix ? ix[i0 + k] : i0 + k; if (A[vi] < vv) A[vi] = vv; if (L[vi] < lv) L[vi] = lv; }
    }
    for (t = 0; t < nt; t++) mark(triMesh[t], triI[t], thin[t] ? CLS_THIN : (triFlat && triFlat[t] ? CLS_FLOOR : CLS_WIDE), lvlByte(TB[t]));
    if (lowT) for (t = 0; t + 2 < lowT.length; t += 3) mark(lowT[t], lowT[t + 1], CLS_LOW, lvlByte(lowT[t + 2]));
    if (glowT) for (t = 0; t + 3 < glowT.length; t += 4) mark(glowT[t], glowT[t + 1], glowT[t + 3] ? CLS_GLOW : CLS_WIDE, lvlByte(glowT[t + 2]));
    for (var i = 0; i < meshes.length; i++) {
      if (!arrs[i]) continue;
      var mm = meshes[i], ml = Array.isArray(mm.material) ? mm.material : [mm.material];
      mm.geometry.setAttribute('seeThru', new BA(arrs[i], 1, true));
      mm.geometry.setAttribute('seeLvl', new BA(lvls[i], 1, true));
      ml.forEach(function (x) { if (mats.indexOf(x) < 0) mats.push(x); });
    }
    obj.traverse(function (m) {   // 고친 재질을 쓰는데 seeThru 가 없는 메시(숨긴 것 등)에 0 값
      if (!m.isMesh || !m.geometry || !m.geometry.attributes || !m.geometry.attributes.position || m.geometry.attributes.seeThru) return;
      var ml = Array.isArray(m.material) ? m.material : [m.material];
      for (var j = 0; j < ml.length; j++) if (mats.indexOf(ml[j]) >= 0) {
        var cN = m.geometry.attributes.position.count;
        m.geometry.setAttribute('seeThru', new BA(new Uint8Array(cN), 1, true)); m.geometry.setAttribute('seeLvl', new BA(new Uint8Array(cN), 1, true)); break;
      }
    });
    mats.forEach(function (x) { patchSee(x, U); });
    // 원뿔(카메라 a·아바타 b·세기 kt 가는 면 / kw 넓은 면 / kl 낮은 물체·반지름 r)을 한 번에(할당 0) — 예전 호출 그대로
    U.set = function (ax, ay, az, bx, by, bz, kt, kw, kl, r) {
      var a = U.a.value, b = U.b.value, kk = U.k.value;
      a[0] = ax; a[1] = ay; a[2] = az; b[0] = bx; b[1] = by; b[2] = bz;
      kk[0] = kt || 0; kk[1] = kw || 0; kk[2] = kl || 0; if (r > 0) kk[3] = r;
    };
    // 단면(pd·kp)·위층(fd·ku·thr)·카메라 둘레(nr·kn)
    U.setCut = function (pd, kp, fd, ku, nr, kn, thr, head) {
      var p = U.p.value, qq = U.q.value;
      p[0] = pd; p[1] = kp || 0; p[2] = fd; p[3] = ku || 0; qq[0] = nr; qq[1] = kn || 0; qq[2] = thr; qq[3] = head === undefined ? 1e4 : head;
    };
    // 반사 탐침 굽기 동안 모든 잘라내기를 끈다(probe_fx.js) — 되돌릴 값을 안에 둔다
    var saved = new Float32Array(6);
    U.mute = function () { var kk = U.k.value, p = U.p.value, qq = U.q.value; saved[0] = kk[0]; saved[1] = kk[1]; saved[2] = kk[2]; saved[3] = p[1]; saved[4] = p[3]; saved[5] = qq[1]; kk[0] = kk[1] = kk[2] = p[1] = p[3] = qq[1] = 0; };
    U.unmute = function () { var kk = U.k.value, p = U.p.value, qq = U.q.value; kk[0] = saved[0]; kk[1] = saved[1]; kk[2] = saved[2]; p[1] = saved[3]; p[3] = saved[4]; qq[1] = saved[5]; };
    U.materials = mats.length;
    return U;
  }

  // 카메라–머리 거리 → 아바타 불투명도(1.7m 이상 1, 0.7m 이하 MIN_ALPHA). 사용자가 아주 가깝게 당긴 앉은 시점 정도에서만 쓰인다.
  var MIN_ALPHA = 0.35;
  function avatarAlpha(d) { var u = (d - 0.7) / 1.0; u = u < 0 ? 0 : u > 1 ? 1 : u; return MIN_ALPHA + (1 - MIN_ALPHA) * u * u * (3 - 2 * u); }

  // 기도 자리 시점(성모 기도 자리·제대 앞·14처 판·봉헌초 도착, 서서): 카메라는 자리 방향(yaw) 뒤에서 side 만큼 비켜
  // 낮게(pitch)·가깝게(zoom) 서고, 보는 점은 아바타 앞 fwd·위 up 으로 옮긴다 → 아바타는 화면 아래 한편, 목표물은 가운데~위.
  var SPOT = { side: 0.32, pitch: 0.2, zoom: 0.8, fwd: 2.4, up: 0.6 };
  // 앉기·무릎 꿇기(신자석·기도 자리): 앞옆 45°(뒤에서 135°, side)에서 조금 내려다보며(pitch) 몸을 본다 → 앉았는지 무릎 꿇었는지 보인다.
  // 쪽(±)은 prayYaw 가 가림이 적은 쪽으로 고른다. 사이를 가리는 의자 등받이·벽·기둥은 잘라낸다(createCut 낮은 물체).
  var PRAY = { side: 2.36, pitch: 0.32, zoom: 0.85, fwd: 0, up: -0.2 };
  // 섞음 f(0..1)로 실제 pitch·거리·보는 점 오프셋을 out 에 쓴다(할당 0). base = 줌 1 의 기본 거리(서기 7.2 / 앉기 4.4). P = SPOT(기본) | PRAY.
  function spotBlend(pitch, D, base, f, out, P) {
    P = P || SPOT;
    out.pitch = pitch + (P.pitch - pitch) * f;
    out.D = D + (base * P.zoom - D) * f;
    out.fwd = P.fwd * f; out.up = P.up * f;
    return out;
  }
  function wrapA(a) { if (!(a > -1e9 && a < 1e9)) return 0; var T2 = 2 * Math.PI; a = (a + Math.PI) % T2; if (a < 0) a += T2; return a - Math.PI; }
  // 기도(앉기·무릎) 시점의 쪽: 앞옆 45° 두 쪽(seatYaw ± PRAY.side) 중 머리 → 카메라 사이 가림이 적은 쪽(넓은 면 > 가는 면). 앉을 때 한 번만 고른다(카메라는 그 뒤로 벽을 개의치 않는다).
  function prayYaw(guard, cb, mx, fy, mz, seatYaw, D, pitch) {
    var best = seatYaw + PRAY.side, bs = 1e9;
    for (var k = 0; k < 2; k++) {
      var yaw = seatYaw + (k ? -1 : 1) * PRAY.side, cp = Math.cos(pitch), sc = 0;
      if (guard && guard.clip) {
        var t = guard.clip(mx, fy, mz, mx + Math.sin(yaw) * cp * D, fy + Math.sin(pitch) * D, mz + Math.cos(yaw) * cp * D, 0);
        sc = (1 - t) * 2 + (guard.out.thin < 1 ? 0.3 : 0);
      }
      if (sc < bs - 0.05) { bs = sc; best = yaw; }
    }
    return wrapA(best);
  }

  // world.js·시험이 같은 방식으로 넘기는 build 선택(o.floorY·o.floorTop·o.region, 여러 층은 o.levelBase·o.levelYs·o.levelLow).
  function spaceOpts(logic, layout, zones) {
    var B = layout.bounds, ft = 0;
    (zones || []).forEach(function (z) { if (z.y > ft) ft = z.y; });
    var o2 = { floorTop: ft, floorY: logic.floorY, region: B };
    // 여러 층(scene_logic levels, docs/church/interiors/assisi.md §엔진): 삼각형의 층 바닥 = 그 아래(밑면 + 한 걸음)의 가장 높은 바닥
    if (logic.multi) {
      var lo = 1e9; (logic.levels || []).forEach(function (L) { if (L.y < lo) lo = L.y; }); if (!(lo < 1e8)) lo = 0;
      o2.levelLow = lo;
      o2.levelYs = (logic.levels || []).map(function (L) { return L.y; }).filter(function (y) { return y > lo + 0.12; });
      o2.levelBase = function (x, z, y) { return logic.floorY(x, z, y + (logic.C.STEP || 0.45)); };
    }
    return o2;
  }

  // ---- 잘라내기 상태(main.js updateCamera·시험이 같이 쓴다, docs/church/CAMERA_MODES.md §잘라내기) ----
  // 켜기는 바로(fadeIn 초에 녹아 사라짐), 끄기는 조건이 hold 초 이어진 뒤(fadeOut 초에 돌아옴) — 0.3초 안에 켰다 껐다 하지 않는다.
  var CUT = {
    coneMin: 1.0, coneMax: 2.0, coneK: 0.22,          // 원뿔 반지름(아바타 쪽) = 카메라 거리 × coneK, coneMin..coneMax m
    headClear: 1.2,                                   // 원뿔은 발보다 이만큼 위의 바닥(겹친 계단의 위 계단 디딤·위층 판)도 지운다
    nearR: 0.7,                                       // 카메라 둘레 지우는 반지름(m) — near 평면(0.3m) 바로 앞의 면 조각·반쪽 가구가 화면을 덮지 않게
    fadeIn: 0.08, fadeOut: 0.15, hold: 0.4, holdMove: 1.0, moveV: 2.0,   // 녹아 사라짐·돌아옴(초), 끄기 전 기다림(초 — 카메라가 초당 moveV m 넘게 움직이는 동안(돌리기)은 holdMove 까지)
    lead: 0.35,                                       // 미리 보기(초): 카메라가 이 시간 뒤 갈 자리(지금 속도)도 막히면 켜 둔다 — 돌리는 동안 벽을 드나들며 켰다 껐다 하지 않게
    planeBack: 0.3, planeMin: 0.5, tauPlaneIn: 0.05, tauPlaneOut: 0.15,   // 단면: 아바타에게 가장 가까운 카메라 쪽 벽 면에서 0.3m 카메라 쪽(최소 0.5m), 옮김 시간 상수
    upperAbove: 1.2, upperMargin: 1.3, upperKeep: 0.3, // 위층: 발보다 1.2m 넘게 높은 층 바닥 아래 1.3m(판 두께)까지 카메라가 오르면, 그 층 바닥 − 0.3m 위의 층을 지운다
    farMin: 3, farPad: 1.0, farRay: 40, tauFar: 0.15  // 위층을 지우는 앞쪽 끝: 아바타 앞 첫 벽 + 1m(최소 3m)
  };
  var NK = 6;   // 세기: 0 가는 면 원뿔 · 1 넓은 면 원뿔 · 2 낮은 물체 원뿔 · 3 단면 · 4 위층 · 5 카메라 둘레
  function createCut() {
    var s = { k: new Float32Array(NK), on: new Uint8Array(NK), offT: new Float32Array(NK), pd: 1, fd: 10, thr: 1e4, nx: 0, nz: 1, init: false, flips: 0, px: 0, py: 0, pz: 0, vx: 0, vy: 0, vz: 0 };
    var tg = new Uint8Array(NK), S = s;
    // 지금 잘라내기 상태로 삼각형 t 의 점(x,y,z)이 얼마나 지워지나(0..1, 셰이더와 같은 식 — 시험·가림 판정)
    s.amount = function (g, t, x, y, z) {
      var k = s.k, cls = g.isThin(t) ? 3 : (g.isFlat(t) ? (y > s.head ? 1 : 0) : 2), f = 0;
      var ax = s.ax, ay = s.ay, az = s.az, bx = s.bx, by = s.by, bz = s.bz;
      if (cls >= 1) {
        var abx = bx - ax, aby = by - ay, abz = bz - az, ab2 = Math.max(abx * abx + aby * aby + abz * abz, 1e-4);
        var h = ((x - ax) * abx + (y - ay) * aby + (z - az) * abz) / ab2, hc = h < 0 ? 0 : h > 1 ? 1 : h;
        var ex = x - ax - abx * hc, ey = y - ay - aby * hc, ez = z - az - abz * hc, d = Math.sqrt(ex * ex + ey * ey + ez * ez), r = s.R * (0.3 + 0.7 * hc);
        f = (1 - sstep(r * 0.72, r, d)) * sstep(-0.25, -0.02, h) * (1 - sstep(0.94, 1, h)) * (cls === 3 ? k[0] : k[1]);
        var dc = Math.sqrt((x - ax) * (x - ax) + (y - ay) * (y - ay) + (z - az) * (z - az));
        f = Math.max(f, (1 - sstep(CUT.nearR * 0.6, CUT.nearR, dc)) * k[5]);
      }
      var sS = (x - bx) * s.nx + (z - bz) * s.nz;
      if (cls >= 2) f = Math.max(f, sstep(s.pd - 0.05, s.pd + 0.3, sS) * k[3]);
      if (lvlByte(g.levelOf(t) - g.fy0) * LVL_STEP > s.thr - 0.13 && sS >= -s.fd) f = Math.max(f, k[4]);
      return f;
    };
    var seg = { ax: 0, ay: 0, az: 0, dx: 0, dy: 0, dz: 0, g: null, upOnly: false, probe: 1e9, seen: false };
    // clip 이 건너뛸 면: 지금(또는 막 켜는) 위층 잘라내기·카메라 둘레로 지워질 면
    function skipCut(t, th) {
      var g = seg.g, x = seg.ax + seg.dx * th, z = seg.az + seg.dz * th;
      // 위층 판정 중: 그 층 면은 '지울 것'으로 보고 건너뛰며 지났다고 적는다
      if (seg.probe < 1e8 && lvlByte(g.levelOf(t) - g.fy0) * LVL_STEP > seg.probe - 0.13) { seg.seen = true; return true; }
      if (S.on[4] && lvlByte(g.levelOf(t) - g.fy0) * LVL_STEP > S.thr - 0.13 && (x - S.bx) * S.nx + (z - S.bz) * S.nz >= -S.fd) return true;
      if (seg.upOnly) return false;
      var y = seg.ay + seg.dy * th, cx = x - S.ax, cy = y - S.ay, cz = z - S.az;
      return !g.isFlat(t) && cx * cx + cy * cy + cz * cz < CUT.nearR * CUT.nearR * 0.36;
    }
    function shoot(g, ax, ay, az, bx, by, bz, upOnly) {
      seg.g = g; seg.ax = ax; seg.ay = ay; seg.az = az; seg.dx = bx - ax; seg.dy = by - ay; seg.dz = bz - az; seg.upOnly = !!upOnly;
      return g.clip(ax, ay, az, bx, by, bz, 0, skipCut);
    }
    // I = {guard, cx,cy,cz(카메라), mx,my,mz(아바타 가슴 — 원뿔 끝), hy(머리 높이), foot, low(앉기·무릎: 낮은 물체도), fp(1인칭 섞음 0..1)}
    // O 에 {k:[6], pd, fd, thr, R, occW, occT, hitW, flips} 를 쓰고, guard.see 가 있으면 균일값을 바꾼다.
    s.step = function (I, dt, O) {
      O = O || {};
      var g = I.guard, third = !(I.fp >= 0.5), i;
      s.ax = I.cx; s.ay = I.cy; s.az = I.cz; s.bx = I.mx; s.by = I.my; s.bz = I.mz;
      var hx = I.cx - I.mx, hz = I.cz - I.mz, hl = Math.sqrt(hx * hx + hz * hz);
      if (hl > 1e-3) { s.nx = hx / hl; s.nz = hz / hl; }
      var cdx = I.cx - I.mx, cdy = I.cy - I.my, cdz = I.cz - I.mz, cdist = Math.sqrt(cdx * cdx + cdy * cdy + cdz * cdz);
      s.R = Math.max(CUT.coneMin, Math.min(CUT.coneMax, cdist * CUT.coneK)); s.head = I.foot + CUT.headClear;
      for (i = 0; i < NK; i++) tg[i] = 0;
      var pdT = s.pd, fdT = s.fd, occW = false, occT = false, hitW = -1;
      if (g && g.clip && third) {
        // 위층: 발보다 upperAbove 넘게 높은 첫 층 바닥 — 카메라가 그 바닥 아래 upperMargin 까지 오르고, 그 층 면이 정말 아바타를 가릴 때만
        // (계단 우물처럼 위층 바닥에 뚫린 구멍으로 보이면 지우지 않는다 — 우물 둘레 바닥이 그대로 남는다)
        var upY = NaN, L = g.levelYs;
        if (L) for (i = 0; i < L.length; i++) if (L[i] > I.foot + CUT.upperAbove) { upY = L[i]; break; }
        var cand = upY === upY && I.cy > upY - CUT.upperMargin, thrC = cand ? upY - CUT.upperKeep - g.fy0 : 1e9;
        // 원뿔·단면: 가슴·머리 → 카메라 선이 (지금 지운 것 말고) 면을 지나는가. 단면 자리 = 아바타에게 가장 가까운 넓은 면의 수평 거리
        // 미리 보기: lead 초 뒤 카메라 자리(지금 속도 — 사용자가 돌리는 중)도 본다(가슴 선 하나)
        var pvx = I.cx + s.vx * CUT.lead, pvy = I.cy + s.vy * CUT.lead, pvz = I.cz + s.vz * CUT.lead, lead = false, leadT = false, t3 = 1;
        var doLead = s.init && (Math.abs(s.vx) + Math.abs(s.vy) + Math.abs(s.vz)) * CUT.lead > 0.2;
        var t1, th1, t2, th2, rep2 = 0;
        for (; rep2 < 2; rep2++) {
          seg.probe = thrC; seg.seen = false;
          t1 = shoot(g, I.mx, I.my, I.mz, I.cx, I.cy, I.cz); th1 = g.out.thin;
          t2 = shoot(g, I.mx, I.hy, I.mz, I.cx, I.cy, I.cz); th2 = g.out.thin;
          if (doLead) { t3 = shoot(g, I.mx, I.my, I.mz, pvx, pvy, pvz); lead = t3 < 1; leadT = lead || g.out.thin < 1; }
          var seenU = seg.seen; seg.probe = 1e9;
          if (cand && seenU) { tg[4] = 1; s.thr = thrC; if (!s.on[4]) s.on[4] = 1; break; }   // 켜기는 바로(이번 판정부터 지운 것으로)
          if (rep2 === 0 && !s.on[4] && thrC < 1e8) thrC = 1e9; else break;   // 위층을 지우지 않는다: 그 층 면도 막는 것으로 다시 잰다
        }
        // 아바타 앞 먼 평면(위층을 지우는 앞쪽 끝): 가슴에서 카메라 반대쪽 수평으로 첫 넓은 면
        if (s.on[4]) {
          var tf = shoot(g, I.mx, I.my, I.mz, I.mx - s.nx * CUT.farRay, I.my, I.mz - s.nz * CUT.farRay, true);
          fdT = Math.max(CUT.farMin, tf * CUT.farRay + CUT.farPad);
        }
        occW = t1 < 1 || t2 < 1; occT = occW || th1 < 1 || th2 < 1;
        if (occW) {
          var tm = Math.min(t1, t2); hitW = tm * hl;
          pdT = Math.max(CUT.planeMin, Math.min(hl, hitW - CUT.planeBack));
        }
        // 미리 보기가 막히면 지금 켠다(돌리는 동안 벽 뒤로 들어가기 전에 이미 녹아 있게) — 단면 자리는 지금 막힘이 없으면 그쪽 면으로
        if (!occW && lead) { var tl = Math.min(1, t3), hlp = Math.sqrt((pvx - I.mx) * (pvx - I.mx) + (pvz - I.mz) * (pvz - I.mz)); pdT = Math.max(CUT.planeMin, Math.min(hlp, tl * hlp - CUT.planeBack)); }
        // 켠 채로 둘지: 두 배 더 먼 미리 보기(lead × 2)에서도 막히면 끄지 않는다(돌리는 동안 다음 벽이 곧 오면 껐다 바로 켜지 않게)
        var keep = false;
        if (doLead && (s.on[1] || s.on[0]) && !occT && !leadT) {
          var t4 = shoot(g, I.mx, I.my, I.mz, I.cx + s.vx * CUT.lead * 2, I.cy + s.vy * CUT.lead * 2, I.cz + s.vz * CUT.lead * 2);
          keep = t4 < 1 || g.out.thin < 1;
        }
        tg[0] = occT || leadT || (keep && s.on[0]) ? 1 : 0; tg[1] = occW || lead || (keep && s.on[1]) ? 1 : 0; tg[3] = occW || lead || (keep && s.on[3]) ? 1 : 0; tg[5] = 1;
        tg[2] = I.low ? 1 : 0;
      }
      // 카메라 속도(미리 보기) — 순간 이동(입장·복원)은 0
      if (s.init && dt > 1e-4) {
        var kvv = 1 - Math.exp(-dt / 0.1), qx = (I.cx - s.px) / dt, qy = (I.cy - s.py) / dt, qz = (I.cz - s.pz) / dt;
        if (qx * qx + qy * qy + qz * qz > 400) { qx = qy = qz = 0; }
        s.vx += (qx - s.vx) * kvv; s.vy += (qy - s.vy) * kvv; s.vz += (qz - s.vz) * kvv;
      } else { s.vx = s.vy = s.vz = 0; }
      s.px = I.cx; s.py = I.cy; s.pz = I.cz;
      // 켜기·끄기(끄기는 hold 초 이어진 뒤) → 세기 녹아들기
      var first = !s.init; s.init = true; var cv = Math.sqrt(s.vx * s.vx + s.vy * s.vy + s.vz * s.vz);
      var was3 = s.k[3] > 0.01, was4 = s.k[4] > 0.01;
      var holdNow = CUT.hold + (CUT.holdMove - CUT.hold) * Math.min(1, cv / CUT.moveV);
      for (i = 0; i < NK; i++) {
        if (tg[i]) { if (!s.on[i]) s.flips++; s.on[i] = 1; s.offT[i] = 0; }
        else if (s.on[i]) { s.offT[i] += dt; if (s.offT[i] >= holdNow || first) { s.on[i] = 0; s.flips++; } }
        var tk = s.on[i] ? 1 : 0;
        if (first) s.k[i] = tk;
        else if (s.k[i] < tk) s.k[i] = Math.min(tk, s.k[i] + dt / CUT.fadeIn);
        else if (s.k[i] > tk) s.k[i] = Math.max(tk, s.k[i] - dt / CUT.fadeOut);
      }
      // 단면 자리·먼 평면은 시간 상수로 옮긴다(켜는 순간은 바로)
      if (!was3 || first) s.pd = pdT;
      else s.pd += (pdT - s.pd) * (1 - Math.exp(-dt / (pdT < s.pd ? CUT.tauPlaneIn : CUT.tauPlaneOut)));
      if (!was4 || first) s.fd = fdT; else s.fd += (fdT - s.fd) * (1 - Math.exp(-dt / CUT.tauFar));
      if (g && g.see) {
        g.see.set(I.cx, I.cy, I.cz, I.mx, I.my, I.mz, s.k[0], s.k[1], s.k[2], s.R);
        if (g.see.setCut) g.see.setCut(s.pd, s.k[3], s.fd, s.k[4], CUT.nearR, s.k[5], s.thr, s.head);
      }
      O.k = s.k; O.pd = s.pd; O.fd = s.fd; O.thr = s.thr; O.R = s.R; O.occW = occW; O.occT = occT; O.hitW = hitW; O.flips = s.flips;
      return O;
    };
    s.reset = function () { s.init = false; for (var i = 0; i < NK; i++) { s.k[i] = 0; s.on[i] = 0; s.offT[i] = 0; } s.thr = 1e4; };
    // 카메라 → 점(아바타 가슴·머리) 사이에 지우지 못한(세기 < 0.5) 면이 있나 — 시험의 '아바타 가림'
    s.blocked = function (g, px, py, pz) {
      // 몸 반지름(0.3m) 앞에서 멈춘다 — 몸에 닿아 선 기둥·벽(몸 바로 뒤)은 가림이 아니다
      var bx0 = px - S.ax, by0 = py - S.ay, bz0 = pz - S.az, bl = Math.sqrt(bx0 * bx0 + by0 * by0 + bz0 * bz0), sh = bl > 0.6 ? (bl - 0.3) / bl : 0.5;
      px = S.ax + bx0 * sh; py = S.ay + by0 * sh; pz = S.az + bz0 * sh;
      var skip = function (t, th) {
        var x = S.ax + (px - S.ax) * th, y = S.ay + (py - S.ay) * th, z = S.az + (pz - S.az) * th;
        return S.amount(g, t, x, y, z) >= 0.5;
      };
      var t = g.clip(S.ax, S.ay, S.az, px, py, pz, 0, skip), th = g.out.thin;
      return t < 1 || th < 1;
    };
    return s;
  }
  function sstep(a, b, x) { var u = (x - a) / (b - a); u = u < 0 ? 0 : u > 1 ? 1 : u; return u * u * (3 - 2 * u); }

  var api = { build: build, classifyThin: classifyThin, patchSee: patchSee, avatarAlpha: avatarAlpha, MIN_ALPHA: MIN_ALPHA, SPOT: SPOT, PRAY: PRAY, spotBlend: spotBlend,
    prayYaw: prayYaw, spaceOpts: spaceOpts, CUT: CUT, createCut: createCut, LVL_STEP: LVL_STEP };
  root.ChurchCamGuard = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : this);
