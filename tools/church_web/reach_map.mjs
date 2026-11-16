// 걷기 도달 지도: 입구(스폰)에서 실제로 걸어서 닿는 칸 + 제단 출입 금지 구역(reverence.js)을 한 장에 본다.
// church_plan.mjs 의 걷기 지도는 충돌체만 보지만, 이 지도는 scene_logic(금지 구역 충돌체 포함)·stations(경로 격자)를 그대로 쓴다.
// 사용: node tools/church_web/reach_map.mjs lateran                 # 문자 지도(칸 0.5 m)
//       node tools/church_web/reach_map.mjs lateran --png out.png   # 위에서 본 평면 그림(PNG, 칸 0.25 m)
//       node tools/church_web/reach_map.mjs lateran --z -40,-5      # z 범위만
// 문자: '#' 막힘  '.' 걸어서 닿음  '^' 닿음(단 위)  '_' 닿음(내려앉은 곳)  ' ' 빈 곳이지만 못 닿음  'R' 금지 구역  'S' 스폰
// PNG 색: 검정 막힘, 흰 닿음, 옅은 파랑 닿음(단), 짙은 회색 못 닿는 빈 곳, 붉은 빗금 금지 구역, 노랑 스폰, 옅은 선 5 m 눈금.
import fs from 'node:fs';
import zlib from 'node:zlib';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { loadChurches } from './church_harness.mjs';
const require = createRequire(import.meta.url);
const Logic = require('../../assets/church/scene_logic.js');
const Stations = require('../../assets/church/stations.js');

function png(w, h, rgb) {
  const crcT = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
  const crc = (b) => { let c = -1; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
  const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3); }
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

/** 성당 하나를 빌드해 { c, L(scene_logic), S(stations) } */
export function reachInfo(id, cell = 0.5) {
  const { churches } = loadChurches();
  const c = churches.find((x) => x.id === id);
  if (!c) throw new Error('없는 성당: ' + id);
  const L = Logic.create(c.layout, { colliders: c.colliders, zones: c.zones }), S = Stations.create(L, { cells: [cell] });
  return { c, L, S };
}

/** 칸마다 문자 하나: 위 설명의 문자표. 결과 [{ z, row: [ch...] }] */
export function reachRows({ c, L, S }, cell, zr) {
  const B = c.layout.bounds, rv = L.reverence, sp = c.layout.spawn;
  const nx = Math.ceil((B.x1 - B.x0) / cell), out = [];
  for (let z = B.z0 + cell / 2; z < B.z1; z += cell) {
    if (zr && (z < zr[0] || z > zr[1])) continue;
    const row = [];
    for (let i = 0; i < nx; i++) {
      const x = B.x0 + (i + 0.5) * cell;
      let ch;
      if (Math.abs(x - sp.x) <= cell / 2 && Math.abs(z - sp.z) <= cell / 2) ch = 'S';
      else if (rv.inZone(x, z, 0)) ch = 'R';
      else if (!S.free(x, z)) ch = '#';
      else if (S.isReachable(x, z)) { const y = L.floorY(x, z); ch = y > 0.02 ? '^' : y < -0.02 ? '_' : '.'; }
      else ch = ' ';
      row.push(ch);
    }
    out.push({ z, row });
  }
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2), id = a[0], pi = a.indexOf('--png'), zi = a.indexOf('--z');
  const cell = pi >= 0 ? 0.25 : 0.5;
  const info = reachInfo(id, cell), B = info.c.layout.bounds, rv = info.L.reverence;
  const rows = reachRows(info, cell, zi >= 0 ? a[zi + 1].split(',').map(Number) : null);
  const zones = rv.rects.map((r) => `x ${r.x0.toFixed(2)}…${r.x1.toFixed(2)} z ${r.z0.toFixed(2)}…${r.z1.toFixed(2)}`).join(' | ');
  if (pi >= 0) {
    const px = 3, nx = rows[0].row.length, w = nx * px, h = rows.length * px, buf = Buffer.alloc(w * h * 3);
    const col = { '#': [24, 22, 20], '.': [240, 236, 226], '^': [170, 204, 238], '_': [204, 178, 238], ' ': [96, 96, 102], R: [214, 52, 40], S: [250, 200, 20] };
    rows.forEach(({ z, row }, j) => row.forEach((ch, i) => {
      const x = B.x0 + (i + 0.5) * cell;
      const grid = Math.abs(((x % 5) + 5) % 5) < cell || Math.abs(((z % 5) + 5) % 5) < cell;
      for (let yy = 0; yy < px; yy++) for (let xx = 0; xx < px; xx++) {
        let k = col[ch];
        if (ch === 'R') k = ((i * px + xx + j * px + yy) % 6) < 2 ? col.R : (info.S.free(x, z) ? [244, 196, 188] : [70, 24, 20]);
        if (grid && ch !== '#' && ch !== 'R') k = k.map((v) => v - 28);
        const o = ((j * px + yy) * w + i * px + xx) * 3; buf[o] = k[0]; buf[o + 1] = k[1]; buf[o + 2] = k[2];
      }
    }));
    fs.writeFileSync(a[pi + 1], png(w, h, buf));
    console.log(`PNG ${a[pi + 1]} ${w}x${h} (위 = 제대 −z, 왼쪽 = −x, 칸 ${cell} m). 금지 구역: ${zones}`);
  } else {
    console.log(`# ${id} 도달 지도(칸 ${cell} m; 위 = 제대 −z, 왼쪽 = −x). 금지 구역: ${zones}`);
    for (const { z, row } of rows) console.log(z.toFixed(2).padStart(7) + ' ' + row.join(''));
  }
}
